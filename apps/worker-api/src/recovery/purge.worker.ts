import type { Env } from '../env';
import { CanonicalPurgeService } from './canonical-purge.service';
import { NotionPurgeError, NotionPurgeService } from './notion-purge.service';
import { PurgeAttachmentService } from './purge-attachment.service';
import { PurgeFreezeService } from './purge-freeze.service';
import { PurgeNotionProjectionService } from './purge-notion.service';
import { PurgeRepository } from './purge.repository';
import type { PurgeStepKind } from './recovery.types';

const STEP_ORDER: readonly PurgeStepKind[] = [
  'freeze_jobs',
  'delete_r2_attachments',
  'archive_notion_projection',
  'delete_d1_item_data',
  'finalize_receipt',
];

export interface PurgeWorkerOptions {
  now?: () => Date;
  fetcher?: typeof fetch;
  batchSize?: number;
}

function safeStepError(error: unknown): string {
  if (error instanceof NotionPurgeError) return error.code;
  if (error instanceof Error && /^[A-Z0-9_.-]{1,80}$/.test(error.message)) {
    return error.message;
  }
  return 'PURGE_STEP_FAILED';
}

export async function processPurgeWorkflows(
  env: Env,
  options: PurgeWorkerOptions = {},
): Promise<void> {
  const now = options.now ?? (() => new Date());
  const repository = new PurgeRepository(env.DB);
  const workflows = await repository.listRunnableWorkflows(
    options.batchSize ?? 10,
  );

  for (const workflow of workflows) {
    const ownerId = `purge:${workflow.id}:${crypto.randomUUID()}`;
    if (!(await repository.markWorkflowProcessing(workflow.id, now()))) continue;

    for (const stepKind of STEP_ORDER) {
      const currentSteps = await repository.listSteps(workflow.id);
      const existing = currentSteps.find((step) => step.kind === stepKind);
      if (!existing) {
        await repository.markWorkflowPartial(
          workflow.id,
          'PURGE_STEP_MISSING',
          now(),
        );
        break;
      }
      if (existing.state === 'complete' || existing.state === 'skipped') continue;

      const claimed = await repository.claimStep(
        workflow.id,
        stepKind,
        ownerId,
        now(),
      );
      if (!claimed) {
        // Another healthy worker still owns the step lease.
        break;
      }

      try {
        let skipped = false;
        if (stepKind === 'freeze_jobs') {
          await new PurgeFreezeService(env.DB).freezeItemWork(
            workflow.itemId,
            now(),
          );
        } else if (stepKind === 'delete_r2_attachments') {
          await new PurgeAttachmentService(
            env.DB,
            env.ATTACHMENTS,
          ).deleteLinkedAttachments(workflow.itemId, now());
        } else if (stepKind === 'archive_notion_projection') {
          const disposition = await new PurgeNotionProjectionService(
            env.DB,
            new NotionPurgeService(env.NOTION_ACCESS_TOKEN, options.fetcher),
          ).archiveProjection(workflow.itemId);
          skipped = disposition === 'not_linked';
        } else if (stepKind === 'delete_d1_item_data') {
          const canonical = new CanonicalPurgeService(env.DB);
          if (!(await repository.hasReceipt(workflow.itemId, workflow.id))) {
            await canonical.purgeDigestReferences(workflow.itemId);
            const deleted = await canonical.purgeItem(
              workflow.itemId,
              workflow.id,
              now(),
            );
            if (!deleted && !(await repository.hasReceipt(workflow.itemId))) {
              throw new Error('PURGE_CANONICAL_DELETE_FAILED');
            }
          }
        } else if (stepKind === 'finalize_receipt') {
          if (!(await repository.hasReceipt(workflow.itemId, workflow.id))) {
            throw new Error('PURGE_RECEIPT_MISSING');
          }
        }

        const completed = await repository.completeStep(
          workflow.id,
          stepKind,
          ownerId,
          now(),
          skipped,
        );
        if (!completed) {
          await repository.markWorkflowPartial(
            workflow.id,
            'PURGE_STEP_LEASE_LOST',
            now(),
          );
          break;
        }
      } catch (error) {
        const code = safeStepError(error);
        await repository.failStep(
          workflow.id,
          stepKind,
          ownerId,
          code,
          now(),
        );
        await repository.markWorkflowPartial(workflow.id, code, now());
        break;
      }
    }

    const finalSteps = await repository.listSteps(workflow.id);
    if (
      finalSteps.length === STEP_ORDER.length &&
      finalSteps.every(
        (step) => step.state === 'complete' || step.state === 'skipped',
      )
    ) {
      await repository.markWorkflowComplete(workflow.id, now());
    }
  }
}
