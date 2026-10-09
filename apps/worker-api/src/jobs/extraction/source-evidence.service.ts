import { sha256 } from '../../captures/hash';
import { normalizeUrl } from '../../captures/url-normalizer';
import { POLICY_VERSION } from '../../policy/policy.service';
import { AppError } from '../../shared/errors';
import { validateSourceDestination } from './source-destination';

type EditableSourceItem = {
  id: string;
  source_type: string;
  source_url: string | null;
  canonical_url: string | null;
  source_revision: number;
  edit_version: number;
  privacy_level: string;
  raw_text: string | null;
  deleted_at: string | null;
  purging: number;
};

export class SourceEvidenceService {
  constructor(private readonly db: D1Database) {}

  private async current(
    itemId: string,
    editVersion: number,
  ): Promise<EditableSourceItem> {
    const item = await this.db
      .prepare(
        `SELECT i.id,i.source_type,i.source_url,i.canonical_url,i.source_revision,
              i.edit_version,i.privacy_level,i.raw_text,i.deleted_at,
              EXISTS(SELECT 1 FROM purge_workflows p WHERE p.item_id=i.id
                AND p.state IN ('queued','processing','partial')) AS purging
       FROM items i WHERE i.id=?1`,
      )
      .bind(itemId)
      .first<EditableSourceItem>();
    if (!item) throw new AppError(404, 'NOT_FOUND', 'Item not found.');
    if (item.edit_version !== editVersion) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Item changed. Refresh before editing.',
      );
    }
    if (item.source_type !== 'url' || item.deleted_at || item.purging) {
      throw new AppError(
        409,
        'SOURCE_NOT_ELIGIBLE',
        'This URL item cannot be edited.',
      );
    }
    return item;
  }

  /** This is new owner evidence, never an edit to the immutable capture event. */
  async supplyText(
    itemId: string,
    editVersion: number,
    text: string,
    now = new Date(),
  ) {
    const item = await this.current(itemId, editVersion);
    const supplied = text.trim();
    if (!supplied || supplied.length > 250_000) {
      throw new AppError(
        422,
        'VALIDATION_ERROR',
        'Supply 1 to 250,000 characters of text.',
      );
    }
    if (item.raw_text !== null) {
      throw new AppError(
        409,
        'SOURCE_TEXT_EXISTS',
        'Owner text already exists. It must not be silently replaced.',
      );
    }
    const at = now.toISOString();
    const hash = await sha256(supplied);
    const existingJob = await this.db
      .prepare(
        `SELECT provider_eligibility, policy_version, credential_source,
         hosted_processing_consent,zero_data_retention_required,data_collection_denied
       FROM processing_jobs WHERE item_id=?1 AND job_type='acquire_url'
         AND privacy_level_snapshot=?2 ORDER BY created_at DESC LIMIT 1`,
      )
      .bind(itemId, item.privacy_level)
      .first<Record<string, string | number | null>>();
    const shouldEnrich =
      existingJob?.provider_eligibility !== undefined &&
      existingJob.provider_eligibility !== null &&
      existingJob.provider_eligibility !== 'none';
    const jobId = crypto.randomUUID();
    const results = await this.db.batch([
      this.db
        .prepare(
          `UPDATE items SET raw_text=?1, edit_version=edit_version+1,updated_at=?2
         WHERE id=?3 AND edit_version=?4 AND raw_text IS NULL AND deleted_at IS NULL
           AND source_revision=?5 AND NOT EXISTS(
             SELECT 1 FROM purge_workflows p WHERE p.item_id=items.id
               AND p.state IN ('queued','processing','partial'))`,
        )
        .bind(supplied, at, itemId, editVersion, item.source_revision),
      this.db
        .prepare(
          `INSERT INTO audit_events(id,item_id,event_type,actor_type,details_json,created_at)
         SELECT ?1,?2,'url_owner_text_supplied','admin',?3,?4 FROM items
         WHERE id=?2 AND edit_version=?5`,
        )
        .bind(
          crypto.randomUUID(),
          itemId,
          JSON.stringify({
            source: 'owner',
            sha256: hash,
            characters: supplied.length,
            source_revision: item.source_revision,
          }),
          at,
          editVersion + 1,
        ),
      this.db
        .prepare(
          `INSERT INTO processing_jobs(
          id,item_id,job_type,status,attempts,available_at,created_at,updated_at,
          input_hash,privacy_level_snapshot,provider_eligibility,policy_version,
          credential_source,hosted_processing_consent,zero_data_retention_required,
          data_collection_denied
        )
        SELECT ?1,i.id,'enrich','pending',0,?2,?2,?2,?3,i.privacy_level,
          ?4,?5,?6,?7,?8,?9
        FROM items i WHERE i.id=?10 AND i.edit_version=?11
          AND i.source_revision=?12 AND i.deleted_at IS NULL
          AND NOT EXISTS(SELECT 1 FROM processing_jobs j
            WHERE j.item_id=i.id AND j.job_type='enrich'
              AND j.status IN ('pending','processing'))
          AND NOT EXISTS(SELECT 1 FROM processing_jobs j
            WHERE j.item_id=i.id AND j.job_type='acquire_url'
              AND j.status IN ('pending','processing'))
          AND COALESCE((SELECT enabled FROM operational_controls
            WHERE control_key='optional_processing_paused'),0)=0
          AND ?13=1`,
        )
        .bind(
          jobId,
          at,
          `owner-source:${hash}`,
          existingJob?.provider_eligibility ?? 'none',
          existingJob?.policy_version ?? POLICY_VERSION,
          existingJob?.credential_source ?? 'none',
          existingJob?.hosted_processing_consent ?? 0,
          existingJob?.zero_data_retention_required ?? 0,
          existingJob?.data_collection_denied ?? 1,
          itemId,
          editVersion + 1,
          item.source_revision,
          shouldEnrich ? 1 : 0,
        ),
    ]);
    if (results[0]?.meta.changes !== 1) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Item changed. Refresh before editing.',
      );
    }
    return {
      item_id: itemId,
      edit_version: editVersion + 1,
      source_revision: item.source_revision,
      supplied_characters: supplied.length,
      source_sha256: hash,
    };
  }

  /** A new URL starts a new generation. BG-10 rejects any late prior result. */
  async replaceUrl(
    itemId: string,
    editVersion: number,
    sourceUrl: string,
    now = new Date(),
  ) {
    const item = await this.current(itemId, editVersion);
    if (
      sourceUrl.length > 2048 ||
      !validateSourceDestination(sourceUrl).allowed
    ) {
      throw new AppError(
        422,
        'SOURCE_DESTINATION_BLOCKED',
        'Supply a safe public HTTP(S) URL.',
      );
    }
    const canonical = normalizeUrl(sourceUrl);
    if (item.source_url === sourceUrl) {
      throw new AppError(409, 'SOURCE_UNCHANGED', 'The URL is unchanged.');
    }
    const keys = [`source:${sourceUrl}`, `canonical:${canonical}`];
    const collision = await this.db
      .prepare(
        `SELECT item_id FROM item_deduplication_keys
       WHERE deduplication_key IN (?1,?2) AND item_id <> ?3 LIMIT 1`,
      )
      .bind(keys[0], keys[1], itemId)
      .first();
    if (collision)
      throw new AppError(
        409,
        'SOURCE_DUPLICATE',
        'Another canonical item already uses this URL.',
      );

    const sourceJob = await this.db
      .prepare(
        `SELECT provider_eligibility,policy_version,credential_source,
          hosted_processing_consent,zero_data_retention_required,data_collection_denied
       FROM processing_jobs WHERE item_id=?1 AND job_type='acquire_url'
       ORDER BY created_at DESC LIMIT 1`,
      )
      .bind(itemId)
      .first<Record<string, string | number | null>>();
    const at = now.toISOString();
    const jobId = crypto.randomUUID();
    const nextRevision = item.source_revision + 1;
    const results = await this.db.batch([
      this.db
        .prepare(
          `UPDATE items SET source_url=?1,canonical_url=?2,
           edit_version=edit_version+1,updated_at=?3
         WHERE id=?4 AND edit_version=?5 AND source_revision=?6
           AND deleted_at IS NULL AND NOT EXISTS(
             SELECT 1 FROM purge_workflows p WHERE p.item_id=items.id
               AND p.state IN ('queued','processing','partial'))`,
        )
        .bind(
          sourceUrl,
          canonical,
          at,
          itemId,
          editVersion,
          item.source_revision,
        ),
      this.db
        .prepare(
          `DELETE FROM item_deduplication_keys
         WHERE item_id=?1 AND deduplication_key IN (?2,?3)`,
        )
        .bind(
          itemId,
          item.source_url ? `source:${item.source_url}` : '',
          item.canonical_url ? `canonical:${item.canonical_url}` : '',
        ),
      ...keys.map((key) =>
        this.db
          .prepare(
            `INSERT OR IGNORE INTO item_deduplication_keys(deduplication_key,item_id,created_at)
         SELECT ?1,?2,?3 FROM items WHERE id=?2 AND edit_version=?4
           AND source_revision=?5`,
          )
          .bind(key, itemId, at, editVersion + 1, nextRevision),
      ),
      this.db
        .prepare(
          `INSERT INTO processing_jobs(
          id,item_id,job_type,status,attempts,available_at,created_at,updated_at,
          input_hash,privacy_level_snapshot,provider_eligibility,policy_version,
          credential_source,hosted_processing_consent,zero_data_retention_required,
          data_collection_denied
        ) SELECT ?1,i.id,'acquire_url','pending',0,?2,?2,?2,?3,i.privacy_level,
          ?4,?5,?6,?7,?8,?9 FROM items i
        WHERE i.id=?10 AND i.edit_version=?11 AND i.source_revision=?12`,
        )
        .bind(
          jobId,
          at,
          `url-source-v1:${nextRevision}`,
          item.privacy_level === 'public'
            ? (sourceJob?.provider_eligibility ?? 'none')
            : 'none',
          sourceJob?.policy_version ?? POLICY_VERSION,
          sourceJob?.credential_source ?? 'none',
          sourceJob?.hosted_processing_consent ?? 0,
          sourceJob?.zero_data_retention_required ?? 0,
          sourceJob?.data_collection_denied ?? 1,
          itemId,
          editVersion + 1,
          nextRevision,
        ),
      this.db
        .prepare(
          `INSERT INTO audit_events(id,item_id,event_type,actor_type,details_json,created_at)
         SELECT ?1,?2,'url_source_replaced','admin',?3,?4 FROM items
         WHERE id=?2 AND edit_version=?5 AND source_revision=?6`,
        )
        .bind(
          crypto.randomUUID(),
          itemId,
          JSON.stringify({
            source_revision: nextRevision,
            reason: 'owner_source_edit',
          }),
          at,
          editVersion + 1,
          nextRevision,
        ),
    ]);
    if (results[0]?.meta.changes !== 1) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Item changed. Refresh before editing.',
      );
    }
    return {
      item_id: itemId,
      edit_version: editVersion + 1,
      source_revision: nextRevision,
      job_id: jobId,
      status: 'pending' as const,
    };
  }
}
