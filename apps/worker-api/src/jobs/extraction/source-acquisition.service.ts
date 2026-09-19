import { sha256 } from '../../captures/hash';
import type { PrivacyLevel } from '../../policy/policy.service';
import { JobService, type JobRecord } from '../job.service';
import { sourceFetchOutcomeSchema, type ValidatedSourceFetchOutcome } from './source-acquisition.schema';
import { SourceFetcher } from './source-fetcher';
import { SOURCE_FETCH_LIMITS, type SourceFetchOutcome } from './source-fetcher.types';

interface AcquisitionContext {
  itemId: string;
  jobId: string;
  sourceUrl: string;
  sourceRevision: number;
  privacyLevel: PrivacyLevel;
  privacyLevelSnapshot: PrivacyLevel;
  rawText: string | null;
  inputHash: string | null;
  attempts: number;
}

export interface SourceAcquisitionServiceOptions {
  fetcher?: Pick<SourceFetcher, 'fetch'>;
  now?: () => Date;
}

const ACQUISITION_JOB_TYPE = 'acquire_url';
const PARSER_NAME = 'bounded-source-fetcher';
const PARSER_VERSION = 'bg-09-v1';

function expectedInputHash(sourceRevision: number): string {
  return `url-source-v1:${sourceRevision}`;
}

function strongestCoverage(
  outcome: ValidatedSourceFetchOutcome,
  rawText: string | null,
): ValidatedSourceFetchOutcome['coverage'] {
  if (outcome.coverage === 'acquired_text') return 'acquired_text';
  if (rawText?.trim()) return 'supplied_text';
  return outcome.coverage;
}

function policyBlockedOutcome(): ValidatedSourceFetchOutcome {
  return {
    status: 'policy_blocked',
    coverage: 'url_only',
    retryable: false,
    errorCode: 'SOURCE_FETCH_POLICY_BLOCKED',
    redirectCount: 0,
  };
}

export class SourceAcquisitionService {
  private readonly jobs: JobService;
  private readonly fetcher: Pick<SourceFetcher, 'fetch'>;
  private readonly now: () => Date;

  constructor(
    private readonly db: D1Database,
    options: SourceAcquisitionServiceOptions = {},
  ) {
    this.jobs = new JobService(db);
    this.fetcher = options.fetcher ?? new SourceFetcher();
    this.now = options.now ?? (() => new Date());
  }

  private async context(
    job: JobRecord,
    ownerId: string,
    at: Date,
  ): Promise<AcquisitionContext | null> {
    return this.db
      .prepare(
        `SELECT
           i.id AS item_id,
           i.source_url,
           i.source_revision,
           i.privacy_level,
           i.raw_text,
           j.id AS job_id,
           j.input_hash,
           j.attempts,
           j.privacy_level_snapshot
         FROM processing_jobs j
         JOIN items i ON i.id = j.item_id
         WHERE j.id = ?1
           AND j.item_id = ?2
           AND j.job_type = 'acquire_url'
           AND j.status = 'processing'
           AND j.lease_owner = ?3
           AND j.lease_expires_at > ?4
           AND i.deleted_at IS NULL
           AND NOT EXISTS (
             SELECT 1
             FROM purge_workflows p
             WHERE p.item_id = i.id
               AND p.state IN ('queued', 'processing', 'partial')
           )`,
      )
      .bind(job.id, job.itemId, ownerId, at.toISOString())
      .first<{
        item_id: string;
        source_url: string | null;
        source_revision: number;
        privacy_level: PrivacyLevel;
        raw_text: string | null;
        job_id: string;
        input_hash: string | null;
        attempts: number;
        privacy_level_snapshot: PrivacyLevel;
      }>()
      .then((row) =>
        row?.source_url
          ? {
              itemId: row.item_id,
              jobId: row.job_id,
              sourceUrl: row.source_url,
              sourceRevision: row.source_revision,
              privacyLevel: row.privacy_level,
              privacyLevelSnapshot: row.privacy_level_snapshot,
              rawText: row.raw_text,
              inputHash: row.input_hash,
              attempts: row.attempts,
            }
          : null,
      );
  }

  private async rejectStaleContext(
    job: JobRecord,
    ownerId: string,
    context: AcquisitionContext,
  ): Promise<boolean> {
    if (context.inputHash !== expectedInputHash(context.sourceRevision)) {
      return this.jobs.failProcessingJob(
        job.id,
        ownerId,
        'SOURCE_REVISION_STALE',
        false,
      );
    }
    if (context.privacyLevel !== context.privacyLevelSnapshot) {
      return this.jobs.failProcessingJob(
        job.id,
        ownerId,
        'SOURCE_POLICY_STALE',
        false,
      );
    }
    return false;
  }

  private async persistOutcome(
    context: AcquisitionContext,
    ownerId: string,
    outcome: ValidatedSourceFetchOutcome,
    startedAt: Date,
    completedAt: Date,
  ): Promise<boolean> {
    const completedIso = completedAt.toISOString();
    const coverage = strongestCoverage(outcome, context.rawText);
    const acquiredText = outcome.acquiredText?.trim()
      ? outcome.acquiredText
      : null;
    const acquiredTextHash = acquiredText ? await sha256(acquiredText) : null;
    const evidenceId = crypto.randomUUID();
    const terminalJobStatus = outcome.retryable ? 'failed' : 'complete';
    const terminalAttempts = outcome.retryable
      ? context.attempts + 1
      : context.attempts;

    const statements: D1PreparedStatement[] = [
      this.db
        .prepare(
          `INSERT INTO url_acquisitions (
             id, item_id, job_id, source_revision, source_url_snapshot,
             privacy_level_snapshot, status, coverage, fetched_final_url,
             http_status, content_type, response_bytes, redirect_count,
             source_title, source_description, source_site_name,
             source_canonical_hint_url, acquired_text, acquired_text_hash,
             extracted_characters, error_code, retryable, parser_name,
             parser_version, started_at, completed_at, created_at
           )
           SELECT
             ?1, i.id, j.id, i.source_revision, i.source_url, i.privacy_level,
             ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
             ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?21
           FROM processing_jobs j
           JOIN items i ON i.id = j.item_id
           WHERE j.id = ?22
             AND j.item_id = ?23
             AND j.job_type = 'acquire_url'
             AND j.status = 'processing'
             AND j.lease_owner = ?24
             AND j.lease_expires_at > ?21
             AND j.input_hash = ?25
             AND j.privacy_level_snapshot = ?26
             AND i.deleted_at IS NULL
             AND i.source_url = ?27
             AND i.source_revision = ?28
             AND i.privacy_level = ?26
             AND NOT EXISTS (
               SELECT 1 FROM purge_workflows p
               WHERE p.item_id = i.id
                 AND p.state IN ('queued', 'processing', 'partial')
             )
           ON CONFLICT(job_id) DO NOTHING`,
        )
        .bind(
          evidenceId,
          outcome.status,
          coverage,
          outcome.fetchedFinalUrl ?? null,
          outcome.httpStatus ?? null,
          outcome.contentType ?? null,
          outcome.responseBytes ?? null,
          outcome.redirectCount,
          outcome.title ?? null,
          outcome.description ?? null,
          outcome.siteName ?? null,
          outcome.canonicalHintUrl ?? null,
          acquiredText,
          acquiredTextHash,
          outcome.extractedCharacters ?? null,
          outcome.errorCode ?? null,
          outcome.retryable ? 1 : 0,
          outcome.status === 'policy_blocked' ? 'policy-gate' : PARSER_NAME,
          outcome.status === 'policy_blocked' ? '1' : PARSER_VERSION,
          startedAt.toISOString(),
          completedIso,
          context.jobId,
          context.itemId,
          ownerId,
          expectedInputHash(context.sourceRevision),
          context.privacyLevel,
          context.sourceUrl,
          context.sourceRevision,
        ),
      this.db
        .prepare(
          `INSERT INTO processing_jobs (
             id, item_id, job_type, status, attempts, available_at,
             created_at, updated_at, input_hash, privacy_level_snapshot,
             provider_eligibility, policy_version, credential_source,
             hosted_processing_consent, zero_data_retention_required,
             data_collection_denied
           )
           SELECT
             ?1, source.item_id, 'enrich', 'pending', 0, ?2, ?2, ?2,
             ?3, source.privacy_level_snapshot, source.provider_eligibility,
             source.policy_version, source.credential_source,
             source.hosted_processing_consent,
             source.zero_data_retention_required,
             source.data_collection_denied
           FROM processing_jobs source
           JOIN items i ON i.id = source.item_id
           WHERE source.id = ?4
             AND source.item_id = ?5
             AND source.status = 'processing'
             AND source.lease_owner = ?6
             AND source.lease_expires_at > ?2
             AND i.deleted_at IS NULL
             AND i.source_revision = ?7
             AND i.privacy_level = ?8
             AND EXISTS (
               SELECT 1 FROM url_acquisitions ua
               WHERE ua.job_id = source.id
             )
             AND NOT EXISTS (
               SELECT 1 FROM processing_jobs pending_extract
               WHERE pending_extract.item_id = source.item_id
                 AND pending_extract.job_type = 'extract'
                 AND pending_extract.status IN ('pending', 'processing')
             )
             AND NOT EXISTS (
               SELECT 1 FROM processing_jobs active_enrich
               WHERE active_enrich.item_id = source.item_id
                 AND active_enrich.job_type = 'enrich'
                 AND active_enrich.status IN ('pending', 'processing')
             )
             AND (
               TRIM(COALESCE(i.raw_text, '')) <> ''
               OR EXISTS (
                 SELECT 1 FROM extraction_records er
                 WHERE er.item_id = i.id
                   AND er.completeness IN ('complete', 'partial')
                   AND (
                     TRIM(COALESCE(er.extracted_text, '')) <> ''
                     OR TRIM(COALESCE(er.image_description, '')) <> ''
                   )
               )
               OR EXISTS (
                 SELECT 1 FROM url_acquisitions ua
                 WHERE ua.job_id = source.id
                   AND TRIM(COALESCE(ua.acquired_text, '')) <> ''
               )
             )`,
        )
        .bind(
          crypto.randomUUID(),
          completedIso,
          `enrich-after-url:${context.sourceRevision}`,
          context.jobId,
          context.itemId,
          ownerId,
          context.sourceRevision,
          context.privacyLevel,
        ),
      this.db
        .prepare(
          `INSERT INTO audit_events (
             id, item_id, event_type, actor_type, details_json, created_at
           )
           SELECT ?1, ?2, 'url_acquisition_completed', 'worker', ?3, ?4
           WHERE EXISTS (
             SELECT 1 FROM url_acquisitions WHERE job_id = ?5
           )`,
        )
        .bind(
          crypto.randomUUID(),
          context.itemId,
          JSON.stringify({
            job_id: context.jobId,
            source_revision: context.sourceRevision,
            status: outcome.status,
            coverage,
            error_code: outcome.errorCode ?? null,
            retryable: outcome.retryable,
            job_status: terminalJobStatus,
          }),
          completedIso,
          context.jobId,
        ),
      this.db
        .prepare(
          `UPDATE processing_jobs
           SET status = ?1,
               attempts = ?2,
               lease_owner = NULL,
               lease_expires_at = NULL,
               completed_at = ?3,
               last_error_code = ?4,
               result_version = 'url-acquisition-v1',
               updated_at = ?3
           WHERE id = ?5
             AND item_id = ?6
             AND job_type = 'acquire_url'
             AND status = 'processing'
             AND lease_owner = ?7
             AND lease_expires_at > ?3
             AND EXISTS (
               SELECT 1 FROM url_acquisitions WHERE job_id = ?5
             )`,
        )
        .bind(
          terminalJobStatus,
          terminalAttempts,
          completedIso,
          outcome.errorCode ?? null,
          context.jobId,
          context.itemId,
          ownerId,
        ),
    ];

    const results = await this.db.batch(statements);
    return (results[3]?.meta.changes ?? 0) === 1;
  }

  async process(job: JobRecord, ownerId: string): Promise<boolean> {
    const startedAt = this.now();
    const context = await this.context(job, ownerId, startedAt);
    if (!context) return false;

    if (
      context.inputHash !== expectedInputHash(context.sourceRevision) ||
      context.privacyLevel !== context.privacyLevelSnapshot
    ) {
      await this.rejectStaleContext(job, ownerId, context);
      return false;
    }

    let rawOutcome: SourceFetchOutcome;
    if (context.privacyLevel !== 'public') {
      rawOutcome = policyBlockedOutcome();
    } else {
      rawOutcome = await this.fetcher.fetch(context.sourceUrl);
    }

    const parsed = sourceFetchOutcomeSchema.safeParse(rawOutcome);
    if (!parsed.success) {
      await this.jobs.failProcessingJob(
        job.id,
        ownerId,
        'SOURCE_PARSE_FAILED',
        false,
      );
      return false;
    }
    const outcome = parsed.data;

    if (
      outcome.retryable &&
      context.attempts + 1 < SOURCE_FETCH_LIMITS.maxAutomaticTransientAttempts
    ) {
      await this.jobs.failProcessingJob(
        job.id,
        ownerId,
        outcome.errorCode ?? 'SOURCE_NETWORK_ERROR',
        true,
        SOURCE_FETCH_LIMITS.maxAutomaticTransientAttempts,
        this.now(),
      );
      return false;
    }

    return this.persistOutcome(
      context,
      ownerId,
      outcome,
      startedAt,
      this.now(),
    );
  }
}
