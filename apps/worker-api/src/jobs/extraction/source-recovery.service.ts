import { AppError } from '../../shared/errors';
import type { PrivacyLevel } from '../../policy/policy.service';
import { POLICY_VERSION } from '../../policy/policy.service';
import { validateSourceDestination } from './source-destination';
import { canManuallyRetrySource } from './source-recovery.policy';
import type { SourceAcquisitionStatus } from './source-fetcher.types';

const MAX_MANUAL_SOURCE_RETRIES = 3;
const MAX_BACKFILL_BATCH = 20;

type SourceItem = {
  id: string;
  source_url: string | null;
  source_type: string;
  source_revision: number;
  privacy_level: PrivacyLevel;
  deleted_at: string | null;
  purging: number;
  paused: number;
};

type ExistingJob = { id: string; status: string };
type ExistingOutcome = { status: SourceAcquisitionStatus };
type PreviousJob = {
  provider_eligibility: string | null;
  policy_version: string | null;
  credential_source: string | null;
  hosted_processing_consent: number | null;
  zero_data_retention_required: number | null;
  data_collection_denied: number | null;
};

export interface SourceRetryResult {
  item_id: string;
  job_id: string;
  status: 'pending' | 'processing';
  created: boolean;
}

const CANDIDATES = `
  FROM items i
  WHERE i.source_type = 'url' AND i.source_url IS NOT NULL
    AND i.deleted_at IS NULL AND i.privacy_level = 'public'
    AND COALESCE((SELECT enabled FROM operational_controls
      WHERE control_key='optional_processing_paused'),0)=0
    AND NOT EXISTS (
      SELECT 1 FROM purge_workflows p
      WHERE p.item_id = i.id AND p.state IN ('queued','processing','partial')
    )
    AND NOT EXISTS (
      SELECT 1 FROM processing_jobs j
      WHERE j.item_id = i.id AND j.job_type = 'acquire_url'
        AND j.status IN ('pending','processing')
    )
    AND (
      SELECT ua.status FROM url_acquisitions ua
      WHERE ua.item_id = i.id AND ua.source_revision = i.source_revision
        AND ua.privacy_level_snapshot = i.privacy_level
      ORDER BY ua.completed_at DESC, ua.id DESC LIMIT 1
    ) IS NULL
`;

export class SourceRecoveryService {
  constructor(private readonly db: D1Database) {}

  private async item(itemId: string): Promise<SourceItem> {
    const item = await this.db.prepare(
      `SELECT i.id, i.source_url, i.source_type, i.source_revision,
              i.privacy_level, i.deleted_at,
              EXISTS(SELECT 1 FROM purge_workflows p WHERE p.item_id=i.id
                AND p.state IN ('queued','processing','partial')) AS purging,
              COALESCE((SELECT enabled FROM operational_controls
                WHERE control_key='optional_processing_paused'),0) AS paused
       FROM items i WHERE i.id=?1`,
    ).bind(itemId).first<SourceItem>();
    if (!item) throw new AppError(404, 'NOT_FOUND', 'Item not found.');
    return item;
  }

  private assertEligible(item: SourceItem, revision: number): void {
    if (item.source_type !== 'url' || !item.source_url) {
      throw new AppError(409, 'SOURCE_NOT_ELIGIBLE', 'This item has no URL to acquire.');
    }
    if (item.source_revision !== revision) {
      throw new AppError(409, 'SOURCE_REVISION_STALE', 'The URL changed. Refresh the item.');
    }
    if (item.deleted_at || item.purging) {
      throw new AppError(409, 'SOURCE_NOT_ELIGIBLE', 'Deleted or purging items cannot be reprocessed.');
    }
    if (item.privacy_level !== 'public') {
      throw new AppError(409, 'SOURCE_POLICY_BLOCKED', 'Only Public items can fetch website content.');
    }
    if (item.paused) {
      throw new AppError(409, 'QUOTA_PAUSED', 'Optional processing is currently paused.');
    }
    if (!validateSourceDestination(item.source_url).allowed) {
      throw new AppError(409, 'SOURCE_DESTINATION_BLOCKED', 'This URL cannot be safely fetched.');
    }
  }

  async retry(itemId: string, revision: number, actorId: string, now = new Date()): Promise<SourceRetryResult> {
    const item = await this.item(itemId);
    this.assertEligible(item, revision);
    const active = async () => this.db.prepare(
      `SELECT id, status FROM processing_jobs
       WHERE item_id=?1 AND job_type='acquire_url' AND input_hash=?2
         AND status IN ('pending','processing')
       ORDER BY created_at DESC LIMIT 1`,
    ).bind(itemId,`url-source-v1:${revision}`).first<ExistingJob>();
    const inProgress = await active();
    if (inProgress) return {
      item_id: itemId, job_id: inProgress.id,
      status: inProgress.status as 'pending' | 'processing', created: false,
    };
    const evidence = await this.db.prepare(
      `SELECT status FROM url_acquisitions
       WHERE item_id=?1 AND source_revision=?2 AND privacy_level_snapshot=?3
       ORDER BY completed_at DESC,id DESC LIMIT 1`,
    ).bind(itemId, revision, item.privacy_level).first<ExistingOutcome>();
    if (!canManuallyRetrySource(evidence?.status ?? null)) {
      throw new AppError(409, 'SOURCE_NOT_RETRYABLE', 'This result needs changed input, not another automatic fetch.');
    }
    const counts = await this.db.prepare(
      `SELECT COUNT(*) AS n FROM processing_jobs WHERE item_id=?1
       AND job_type='acquire_url' AND input_hash=?2 AND manual_retry_count > 0`,
    ).bind(itemId, `url-source-v1:${revision}`).first<{n:number}>();
    if ((counts?.n ?? 0) >= MAX_MANUAL_SOURCE_RETRIES) {
      throw new AppError(409, 'SOURCE_RETRY_LIMIT', 'Manual source retry limit reached.');
    }
    const prior = await this.db.prepare(
      `SELECT provider_eligibility,policy_version,credential_source,
        hosted_processing_consent,zero_data_retention_required,data_collection_denied
       FROM processing_jobs WHERE item_id=?1 AND job_type='acquire_url'
       ORDER BY created_at DESC LIMIT 1`,
    ).bind(itemId).first<PreviousJob>();
    const jobId = crypto.randomUUID();
    const at = now.toISOString();
    const result = await this.db.prepare(
      `INSERT INTO processing_jobs(
         id,item_id,job_type,status,attempts,manual_retry_count,available_at,
         created_at,updated_at,input_hash,privacy_level_snapshot,
         provider_eligibility,policy_version,credential_source,
         hosted_processing_consent,zero_data_retention_required,data_collection_denied
       )
       SELECT ?1,i.id,'acquire_url','pending',0,1,?2,?2,?2,?3,i.privacy_level,
         ?4,?5,?6,?7,?8,?9
       FROM items i
       WHERE i.id=?10 AND i.source_type='url' AND i.source_url IS NOT NULL
         AND i.source_revision=?11 AND i.privacy_level='public'
         AND i.deleted_at IS NULL
         AND NOT EXISTS(SELECT 1 FROM purge_workflows p
           WHERE p.item_id=i.id AND p.state IN ('queued','processing','partial'))
         AND NOT EXISTS(SELECT 1 FROM processing_jobs j
           WHERE j.item_id=i.id AND j.job_type='acquire_url'
             AND j.input_hash=?3 AND j.status IN ('pending','processing'))
         AND COALESCE((SELECT enabled FROM operational_controls
           WHERE control_key='optional_processing_paused'),0)=0`,
    ).bind(jobId, at, `url-source-v1:${revision}`,
      prior?.provider_eligibility ?? 'none', prior?.policy_version ?? POLICY_VERSION,
      prior?.credential_source ?? 'none', prior?.hosted_processing_consent ?? 0,
      prior?.zero_data_retention_required ?? 0, prior?.data_collection_denied ?? 1,
      itemId, revision).run();
    if (result.meta.changes !== 1) {
      const concurrent = await active();
      if (concurrent) return {
        item_id: itemId, job_id: concurrent.id,
        status: concurrent.status as 'pending' | 'processing', created: false,
      };
      throw new AppError(409,'SOURCE_REVISION_STALE','The item or policy changed. Refresh and retry.');
    }
    await this.db.prepare(
      `INSERT INTO audit_events(id,item_id,event_type,actor_type,details_json,created_at)
       VALUES(?1,?2,'url_manual_retry_requested','admin',?3,?4)`,
    ).bind(crypto.randomUUID(),itemId,JSON.stringify({
      actor_id: actorId, job_id: jobId, source_revision: revision,
    }),at).run();
    return { item_id: itemId, job_id: jobId, status: 'pending', created: true };
  }


  /** Read-only eligibility for the owner UI. The write action rechecks all guards. */
  async eligibility(itemId: string, revision: number): Promise<{
    eligible: boolean;
    reason: string;
    active_job_id: string | null;
  }> {
    let item: SourceItem;
    try {
      item = await this.item(itemId);
      this.assertEligible(item, revision);
    } catch (error) {
      if (error instanceof AppError) {
        return {eligible:false,reason:error.code,active_job_id:null};
      }
      throw error;
    }
    const currentJob = await this.db.prepare(
      `SELECT id FROM processing_jobs WHERE item_id=?1
        AND job_type='acquire_url' AND input_hash=?2
        AND status IN ('pending','processing') ORDER BY created_at DESC LIMIT 1`,
    ).bind(itemId,`url-source-v1:${revision}`).first<{id:string}>();
    if (currentJob) {
      return {eligible:false,reason:'SOURCE_ALREADY_QUEUED',active_job_id:currentJob.id};
    }
    const evidence=await this.db.prepare(
      `SELECT status FROM url_acquisitions
       WHERE item_id=?1 AND source_revision=?2 AND privacy_level_snapshot='public'
       ORDER BY completed_at DESC,id DESC LIMIT 1`,
    ).bind(itemId,revision).first<ExistingOutcome>();
    if (!canManuallyRetrySource(evidence?.status??null)) {
      return {eligible:false,reason:'SOURCE_NOT_RETRYABLE',active_job_id:null};
    }
    const count=await this.db.prepare(
      `SELECT COUNT(*) AS n FROM processing_jobs WHERE item_id=?1
       AND job_type='acquire_url' AND input_hash=?2 AND manual_retry_count>0`,
    ).bind(itemId,`url-source-v1:${revision}`).first<{n:number}>();
    if ((count?.n??0)>=MAX_MANUAL_SOURCE_RETRIES) {
      return {eligible:false,reason:'SOURCE_RETRY_LIMIT',active_job_id:null};
    }
    return {eligible:true,reason:'RETRY_AVAILABLE',active_job_id:null};
  }

  /** Older bare URLs only. No network calls are made during preview. */
  async previewLegacy(limit = MAX_BACKFILL_BATCH): Promise<{count: number; items: Array<{item_id: string; source_revision: number}>}> {
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_BACKFILL_BATCH) {
      throw new AppError(422,'VALIDATION_ERROR','Preview limit must be 1 through 20.');
    }
    const count = await this.db.prepare(`SELECT COUNT(*) AS n ${CANDIDATES}`).first<{n:number}>();
    const rows = await this.db.prepare(
      `SELECT i.id AS item_id, i.source_revision ${CANDIDATES}
       ORDER BY i.created_at ASC,i.id ASC LIMIT ?1`,
    ).bind(limit).all<{item_id:string;source_revision:number}>();
    return { count: count?.n ?? 0, items: rows.results ?? [] };
  }

  /** Requires explicitly reviewed IDs. A deployment cannot invoke this implicitly. */
  async reprocessLegacy(items: Array<{item_id: string; source_revision: number}>, actorId: string) {
    if (!items.length || items.length > MAX_BACKFILL_BATCH ||
      new Set(items.map(x => x.item_id)).size !== items.length) {
      throw new AppError(422,'VALIDATION_ERROR','Supply 1–20 unique candidate IDs.');
    }
    const results: Array<{item_id:string;result:'queued'|'existing'|'skipped';reason?:string}> = [];
    for (const candidate of items) {
      const eligible = await this.db.prepare(
        `SELECT i.id ${CANDIDATES} AND i.id=?1 AND i.source_revision=?2`,
      ).bind(candidate.item_id,candidate.source_revision).first();
      if (!eligible) {
        results.push({item_id:candidate.item_id,result:'skipped',reason:'NOT_ELIGIBLE'});
        continue;
      }
      try {
        const queued = await this.retry(candidate.item_id,candidate.source_revision,actorId);
        results.push({item_id:candidate.item_id,result:queued.created?'queued':'existing'});
      } catch (error) {
        if (!(error instanceof AppError)) throw error;
        results.push({item_id:candidate.item_id,result:'skipped',reason:'RECHECK_FAILED'});
      }
    }
    return results;
  }
}
