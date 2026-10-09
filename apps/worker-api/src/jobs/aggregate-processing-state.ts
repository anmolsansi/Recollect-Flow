/**
 * BG-12: deterministic read-side processing status contract.
 *
 * Callers MUST pass jobs and attachments already scoped to the same item.
 * Generation is an explicit caller-owned identity, not inferred from updated_at.
 * BG-13 owns binding this decision to transactional D1 writers/list filters.
 */
export type AggregateProcessingStatus =
  'pending' | 'processing' | 'complete' | 'failed';

export type ProcessingStage = 'acquire_url' | 'extract' | 'enrich';
export type AggregateReason =
  | 'deleted_excluded'
  | 'required_job_failed'
  | 'required_attachment_failed'
  | 'lease_active'
  | 'lease_expired'
  | 'retry_wait'
  | 'capacity_paused'
  | 'policy_paused'
  | 'operational_paused'
  | 'queued'
  | 'required_stage_missing'
  | 'all_required_finished';

export interface AggregateJob {
  id: string;
  stage: ProcessingStage;
  generation: string;
  status: AggregateProcessingStatus;
  createdAt: string;
  availableAt: string;
  leaseExpiresAt: string | null;
  leaseOwner: string | null;
  lastErrorCode: string | null;
  deferredReason?: 'capacity' | 'privacy' | 'operational' | null;
}

export interface AggregateAttachment {
  id: string;
  generation: string;
  required: boolean;
  completeness:
    | 'pending'
    | 'processing'
    | 'complete'
    | 'partial'
    | 'empty'
    | 'unsupported'
    | 'failed';
}

export interface AggregateInput {
  generation: string;
  /** Determined by the current capture/source/policy decision. No-AI => omit enrich. */
  requiredStages: readonly ProcessingStage[];
  jobs: readonly AggregateJob[];
  attachments: readonly AggregateAttachment[];
  deleted: boolean;
  now: Date;
}

export interface AggregateDecision {
  /** null means lifecycle deletion excludes reconciliation, not a new stored enum. */
  status: AggregateProcessingStatus | null;
  reason: AggregateReason;
  blockingStage: ProcessingStage | null;
  blockingAttachmentId: string | null;
  /** User-facing retry-wait metadata. Never a stored processing status. */
  nextEligibleAt: string | null;
  errorCode: string | null;
}

const stages: readonly ProcessingStage[] = ['acquire_url', 'extract', 'enrich'];

function validTimestamp(value: string): number {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    throw new TypeError('Aggregate job timestamps must be valid');
  }
  return time;
}

function result(
  status: AggregateDecision['status'],
  reason: AggregateReason,
  overrides: Partial<Omit<AggregateDecision, 'status' | 'reason'>> = {},
): AggregateDecision {
  return {
    status,
    reason,
    blockingStage: null,
    blockingAttachmentId: null,
    nextEligibleAt: null,
    errorCode: null,
    ...overrides,
  };
}

/**
 * Precedence: current required failure > valid processing lease > pending
 * (including expired leases and future retry) > every required output complete.
 * A newer same-stage attempt supersedes its historical terminal failure.
 * Optional stages, sync attempts, and digests never block item processing.
 */
export function decideAggregateProcessing(
  input: AggregateInput,
): AggregateDecision {
  const now = input.now.getTime();
  if (!Number.isFinite(now)) throw new TypeError('now must be valid');
  if (!input.generation.trim())
    throw new TypeError('generation must be specified');
  if (input.deleted) return result(null, 'deleted_excluded');

  const required = stages.filter((stage) =>
    input.requiredStages.includes(stage),
  );
  const latest = new Map<ProcessingStage, AggregateJob>();
  for (const job of input.jobs) {
    if (job.generation !== input.generation || !required.includes(job.stage)) {
      continue;
    }
    const existing = latest.get(job.stage);
    const candidateTime = validTimestamp(job.createdAt);
    if (
      !existing ||
      candidateTime > validTimestamp(existing.createdAt) ||
      (candidateTime === validTimestamp(existing.createdAt) &&
        job.id > existing.id)
    ) {
      latest.set(job.stage, job);
    }
  }

  for (const stage of required) {
    const job = latest.get(stage);
    if (job?.status === 'failed') {
      return result('failed', 'required_job_failed', {
        blockingStage: stage,
        errorCode: job.lastErrorCode,
      });
    }
  }
  const failedAttachment = input.attachments
    .filter(
      (attachment) =>
        attachment.generation === input.generation &&
        attachment.required &&
        ['failed', 'empty', 'unsupported'].includes(attachment.completeness),
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (failedAttachment) {
    return result('failed', 'required_attachment_failed', {
      blockingStage: 'extract',
      blockingAttachmentId: failedAttachment.id,
    });
  }

  // Valid active leases take precedence over pending, including another stage
  // waiting for capacity. An expired lease is queued/recoverable, not active.
  for (const stage of required) {
    const job = latest.get(stage);
    if (
      job?.status === 'processing' &&
      job.leaseOwner &&
      job.leaseExpiresAt &&
      validTimestamp(job.leaseExpiresAt) > now
    ) {
      return result('processing', 'lease_active', { blockingStage: stage });
    }
  }

  for (const stage of required) {
    const job = latest.get(stage);
    if (!job) {
      return result('pending', 'required_stage_missing', {
        blockingStage: stage,
      });
    }
    if (job.status === 'processing') {
      return result('pending', 'lease_expired', { blockingStage: stage });
    }
    if (job.status === 'pending') {
      const pause = {
        capacity: 'capacity_paused',
        privacy: 'policy_paused',
        operational: 'operational_paused',
      } as const;
      if (job.deferredReason) {
        return result('pending', pause[job.deferredReason], {
          blockingStage: stage,
          nextEligibleAt:
            validTimestamp(job.availableAt) > now ? job.availableAt : null,
        });
      }
      if (validTimestamp(job.availableAt) > now) {
        return result('pending', 'retry_wait', {
          blockingStage: stage,
          nextEligibleAt: job.availableAt,
        });
      }
      return result('pending', 'queued', { blockingStage: stage });
    }
  }

  const unfinishedAttachment = input.attachments
    .filter(
      (attachment) =>
        attachment.generation === input.generation &&
        attachment.required &&
        ['pending', 'processing'].includes(attachment.completeness),
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (unfinishedAttachment) {
    return result('pending', 'required_stage_missing', {
      blockingStage: 'extract',
      blockingAttachmentId: unfinishedAttachment.id,
    });
  }

  return result('complete', 'all_required_finished');
}
