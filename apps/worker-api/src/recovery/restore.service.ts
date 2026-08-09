import { AppError } from '../shared/errors';
import { loadPurgeReceiptLedger } from './purge-receipt-ledger';
import { PurgeRepository } from './purge.repository';
import { buildRestorePlan } from './restore-plan';
import { RestoreReceiptRepository } from './restore-receipt.repository';
import { RestoreRepository } from './restore.repository';
import { RestoreRunRepository } from './restore-run.repository';
import {
  portableRestoreEnvelopeSchema,
  type PortableRestoreEnvelope,
} from './restore.schema';
import { validateRestorePlan } from './restore-validation';
import type { PurgeReceiptRecord } from './recovery.types';

export interface RestoreOptions {
  dryRun?: boolean;
  receiptOverlay?: PurgeReceiptRecord[];
}

function errorCode(error: unknown): string {
  if (error instanceof AppError) return error.code;
  if (error instanceof Error && /^[A-Z0-9_.-]{1,80}$/.test(error.message)) {
    return error.message;
  }
  return 'RESTORE_FAILED';
}

export class RestoreService {
  constructor(
    private readonly db: D1Database,
    private readonly bucket: R2Bucket,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private parse(input: unknown): PortableRestoreEnvelope {
    const parsed = portableRestoreEnvelopeSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(
        422,
        'RESTORE_INVALID_EXPORT',
        'The portable export failed schema validation.',
      );
    }
    return parsed.data;
  }

  private async verifyRestoredState(
    expectedItemCount: number,
    purgedItemIds: readonly string[],
  ): Promise<void> {
    const foreignKeys = await this.db.prepare('PRAGMA foreign_key_check').all();
    if ((foreignKeys.results ?? []).length) {
      throw new Error('RESTORE_FOREIGN_KEY_CHECK_FAILED');
    }

    const count = await this.db
      .prepare('SELECT COUNT(*) AS count FROM items')
      .first<{ count: number }>();
    if ((count?.count ?? -1) !== expectedItemCount) {
      throw new Error('RESTORE_ITEM_COUNT_MISMATCH');
    }

    const activeCount = await this.db
      .prepare('SELECT COUNT(*) AS count FROM items WHERE deleted_at IS NULL')
      .first<{ count: number }>();
    const searchCount = await this.db
      .prepare('SELECT COUNT(*) AS count FROM item_search_fts')
      .first<{ count: number }>();
    if ((activeCount?.count ?? -1) !== (searchCount?.count ?? -2)) {
      throw new Error('RESTORE_SEARCH_INDEX_MISMATCH');
    }

    for (const itemId of purgedItemIds) {
      const item = await this.db
        .prepare('SELECT id FROM items WHERE id = ?1')
        .bind(itemId)
        .first();
      if (item) throw new Error('RESTORE_PURGED_ITEM_RESURRECTED');
    }
  }

  async restore(input: unknown, options: RestoreOptions = {}) {
    const envelope = this.parse(input);
    const dryRun = options.dryRun ?? false;
    const runRepository = new RestoreRunRepository(this.db);
    const run = await runRepository.create(
      envelope.schemaVersion,
      dryRun,
      envelope.itemCount,
      this.now(),
    );

    try {
      const [currentReceipts, hostedReceipts] = await Promise.all([
        new PurgeRepository(this.db).listReceipts(),
        loadPurgeReceiptLedger(this.bucket),
      ]);
      const plan = buildRestorePlan(
        envelope,
        currentReceipts,
        [...hostedReceipts, ...(options.receiptOverlay ?? [])],
      );
      validateRestorePlan(plan);
      await runRepository.update(run.id, 'validating', {
        skippedPurgedCount: plan.skippedPurgedItemIds.length,
      });

      if (dryRun) {
        await runRepository.update(run.id, 'complete', {
          restoredCount: 0,
          skippedPurgedCount: plan.skippedPurgedItemIds.length,
          completedAt: this.now(),
        });
        return {
          run: await runRepository.find(run.id),
          plannedItemCount: plan.items.length,
          skippedPurgedItemIds: plan.skippedPurgedItemIds,
        };
      }

      const repository = new RestoreRepository(this.db);
      if (!(await repository.targetIsClean())) {
        throw new AppError(
          409,
          'RESTORE_TARGET_NOT_EMPTY',
          'Portable restore requires a clean canonical target database.',
        );
      }
      await runRepository.update(run.id, 'restoring', {
        skippedPurgedCount: plan.skippedPurgedItemIds.length,
      });

      const receiptRepository = new RestoreReceiptRepository(this.db);
      for (const receipt of plan.purgeReceipts) {
        await receiptRepository.upsert(receipt);
      }

      const validItemIds = new Set(
        plan.items.map((entry) => entry.item.id as string),
      );
      for (const item of plan.items) {
        await repository.restoreItemShell(item, validItemIds);
      }
      for (const item of plan.items) {
        await repository.restoreItemChildren(item, this.now());
      }
      for (const item of plan.items) {
        await repository.restoreDeferredReferences(item, validItemIds);
      }

      await runRepository.update(run.id, 'verifying', {
        restoredCount: plan.items.length,
        skippedPurgedCount: plan.skippedPurgedItemIds.length,
      });
      await this.verifyRestoredState(
        plan.items.length,
        plan.skippedPurgedItemIds,
      );
      await runRepository.update(run.id, 'complete', {
        restoredCount: plan.items.length,
        skippedPurgedCount: plan.skippedPurgedItemIds.length,
        completedAt: this.now(),
      });
      return {
        run: await runRepository.find(run.id),
        plannedItemCount: plan.items.length,
        skippedPurgedItemIds: plan.skippedPurgedItemIds,
      };
    } catch (error) {
      await runRepository.update(run.id, 'failed', {
        errorCode: errorCode(error),
        completedAt: this.now(),
      });
      throw error;
    }
  }
}
