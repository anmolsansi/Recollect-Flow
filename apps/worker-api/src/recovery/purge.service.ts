import { AppError } from '../shared/errors';
import {
  confirmationIsActive,
  purgeConfirmationDigest,
  purgeConfirmationExpiry,
  purgeConfirmationPhrase,
} from './purge-confirmation';
import { PurgeRepository } from './purge.repository';

interface PurgeCandidateRow {
  id: string;
  edit_version: number;
  deleted_at: string | null;
}

export interface PurgeConfirmationRequest {
  workflowId: string;
  itemId: string;
  confirmationPhrase: string;
  confirmationExpiresAt: string;
}

export class PurgeService {
  private readonly repository: PurgeRepository;

  constructor(private readonly db: D1Database) {
    this.repository = new PurgeRepository(db);
  }

  private async candidate(itemId: string): Promise<PurgeCandidateRow | null> {
    return this.db
      .prepare('SELECT id, edit_version, deleted_at FROM items WHERE id = ?1')
      .bind(itemId)
      .first<PurgeCandidateRow>();
  }

  async requestPurge(
    itemId: string,
    editVersion: number,
    now: Date = new Date(),
  ): Promise<PurgeConfirmationRequest> {
    const item = await this.candidate(itemId);
    if (!item) throw new AppError(404, 'NOT_FOUND', 'Item not found.');
    if (item.edit_version !== editVersion) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Item version conflict.');
    }
    if (!item.deleted_at) {
      throw new AppError(
        409,
        'PURGE_REQUIRES_SOFT_DELETE',
        'Permanent purge is available only after the item has been soft deleted.',
      );
    }

    const workflowId = crypto.randomUUID();
    const confirmationPhrase = purgeConfirmationPhrase(itemId, workflowId);
    const confirmationDigest =
      await purgeConfirmationDigest(confirmationPhrase);
    const confirmationExpiresAt = purgeConfirmationExpiry(now);
    await this.repository.createConfirmation(
      workflowId,
      itemId,
      editVersion,
      confirmationDigest,
      confirmationExpiresAt,
      now,
    );
    await this.db
      .prepare(
        `INSERT INTO audit_events (
           id, item_id, event_type, actor_type, details_json, created_at
         ) VALUES (?1, ?2, 'purge_confirmation_requested', 'admin', ?3, ?4)`,
      )
      .bind(
        crypto.randomUUID(),
        itemId,
        JSON.stringify({
          purge_workflow_id: workflowId,
          confirmation_expires_at: confirmationExpiresAt,
        }),
        now.toISOString(),
      )
      .run();
    return {
      workflowId,
      itemId,
      confirmationPhrase,
      confirmationExpiresAt,
    };
  }

  async confirmPurge(
    workflowId: string,
    phrase: string,
    now: Date = new Date(),
  ): Promise<void> {
    const pending = await this.repository.findPendingConfirmation(workflowId);
    if (!pending) {
      throw new AppError(404, 'NOT_FOUND', 'Purge workflow not found.');
    }
    if (pending.state !== 'confirmation_pending') {
      throw new AppError(
        409,
        'PURGE_CONFIRMATION_ALREADY_USED',
        'This purge confirmation is no longer pending.',
      );
    }
    if (!confirmationIsActive(pending.confirmationExpiresAt, now)) {
      await this.repository.cancelExpiredConfirmation(workflowId, now);
      throw new AppError(
        409,
        'PURGE_CONFIRMATION_EXPIRED',
        'The purge confirmation window has expired.',
      );
    }

    const suppliedDigest = await purgeConfirmationDigest(phrase);
    if (suppliedDigest !== pending.confirmationDigest) {
      throw new AppError(
        409,
        'PURGE_CONFIRMATION_MISMATCH',
        'The purge confirmation phrase does not match this workflow.',
      );
    }

    const item = await this.candidate(pending.itemId);
    if (!item) throw new AppError(404, 'NOT_FOUND', 'Item not found.');
    if (!item.deleted_at) {
      throw new AppError(
        409,
        'PURGE_REQUIRES_SOFT_DELETE',
        'The item was restored after purge confirmation was requested.',
      );
    }
    if (item.edit_version !== pending.requestedEditVersion) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'The item changed after purge confirmation was requested.',
      );
    }

    const confirmed = await this.repository.confirm(
      workflowId,
      suppliedDigest,
      now,
    );
    if (!confirmed) {
      throw new AppError(
        409,
        'PURGE_CONFIRMATION_ALREADY_USED',
        'The purge confirmation could not be accepted.',
      );
    }
    await this.db
      .prepare(
        `INSERT INTO audit_events (
           id, item_id, event_type, actor_type, details_json, created_at
         ) VALUES (?1, ?2, 'purge_confirmed', 'admin', ?3, ?4)`,
      )
      .bind(
        crypto.randomUUID(),
        pending.itemId,
        JSON.stringify({ purge_workflow_id: workflowId }),
        now.toISOString(),
      )
      .run();
  }
}
