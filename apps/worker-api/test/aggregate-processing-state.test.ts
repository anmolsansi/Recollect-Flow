import { describe, expect, it } from 'vitest';

import {
  decideAggregateProcessing,
  type AggregateInput,
  type AggregateJob,
} from '../src/jobs/aggregate-processing-state';

const now = new Date('2026-10-09T16:00:00.000Z');
const current = 'source:2|policy:v3';
const prior = 'source:1|policy:v2';

function job(
  stage: AggregateJob['stage'],
  status: AggregateJob['status'],
  overrides: Partial<AggregateJob> = {},
): AggregateJob {
  return {
    id: stage + '-' + status,
    stage,
    generation: current,
    status,
    createdAt: '2026-10-09T12:00:00.000Z',
    availableAt: '2026-10-09T15:00:00.000Z',
    leaseExpiresAt: null,
    leaseOwner: null,
    lastErrorCode: status === 'failed' ? 'SOURCE_UNAVAILABLE' : null,
    ...overrides,
  };
}

function evaluate(overrides: Partial<AggregateInput> = {}) {
  return decideAggregateProcessing({
    generation: current,
    requiredStages: ['acquire_url'],
    jobs: [job('acquire_url', 'complete')],
    attachments: [],
    deleted: false,
    now,
    ...overrides,
  });
}

describe('BG-12 aggregate status decision', () => {
  it('never invents a stored retry_wait value for a deferred job', () => {
    const decision = evaluate({
      jobs: [
        job('acquire_url', 'pending', {
          availableAt: '2026-10-09T18:00:00.000Z',
        }),
      ],
    });
    expect(decision).toMatchObject({
      status: 'pending',
      reason: 'retry_wait',
      nextEligibleAt: '2026-10-09T18:00:00.000Z',
    });
  });

  it('never reflects arbitrary worker error payloads into owner status', () => {
    expect(
      evaluate({
        jobs: [
          job('acquire_url', 'failed', {
            lastErrorCode: '<script>alert(1)</script>',
          }),
        ],
      }),
    ).toMatchObject({
      status: 'failed',
      reason: 'required_job_failed',
      errorCode: null,
    });
  });

  it('terminal current-stage failure outranks unrelated active work', () => {
    expect(
      evaluate({
        requiredStages: ['acquire_url', 'enrich'],
        jobs: [
          job('acquire_url', 'failed'),
          job('enrich', 'processing', {
            leaseOwner: 'worker',
            leaseExpiresAt: '2026-10-09T16:10:00.000Z',
          }),
        ],
      }),
    ).toMatchObject({
      status: 'failed',
      blockingStage: 'acquire_url',
      reason: 'required_job_failed',
      errorCode: 'SOURCE_UNAVAILABLE',
    });
  });

  it('ignores historical and superseded terminal failures', () => {
    expect(
      evaluate({
        jobs: [
          job('acquire_url', 'failed', {
            id: 'old-generation',
            generation: prior,
          }),
          job('acquire_url', 'failed', {
            id: 'old-retry',
            createdAt: '2026-10-08T12:00:00.000Z',
          }),
          job('acquire_url', 'complete', { id: 'new-attempt' }),
        ],
      }),
    ).toMatchObject({ status: 'complete', reason: 'all_required_finished' });
  });

  it('recognizes a valid active lease even when another stage is queued', () => {
    expect(
      evaluate({
        requiredStages: ['acquire_url', 'enrich'],
        jobs: [
          job('acquire_url', 'processing', {
            leaseOwner: 'worker',
            leaseExpiresAt: '2026-10-09T16:00:01.000Z',
          }),
          job('enrich', 'pending'),
        ],
      }),
    ).toMatchObject({ status: 'processing', reason: 'lease_active' });
  });

  it('expired processing lease is pending recovery, not active', () => {
    expect(
      evaluate({
        jobs: [
          job('acquire_url', 'processing', {
            leaseOwner: 'abandoned',
            leaseExpiresAt: '2026-10-09T15:59:59.000Z',
          }),
        ],
      }),
    ).toMatchObject({ status: 'pending', reason: 'lease_expired' });
  });

  it('missing expected required stage is pending, not falsely complete', () => {
    expect(
      evaluate({
        requiredStages: ['acquire_url', 'enrich'],
        jobs: [job('acquire_url', 'complete')],
      }),
    ).toMatchObject({
      status: 'pending',
      reason: 'required_stage_missing',
      blockingStage: 'enrich',
    });
  });

  it('intentional no-AI/no-source processing is complete', () => {
    expect(evaluate({ requiredStages: [], jobs: [] })).toMatchObject({
      status: 'complete',
      reason: 'all_required_finished',
    });
  });

  it('source acquisition complete can still have limited URL coverage', () => {
    expect(
      evaluate({
        jobs: [
          job('acquire_url', 'complete', {
            lastErrorCode: 'SOURCE_LOGIN_REQUIRED',
          }),
        ],
      }),
    ).toMatchObject({ status: 'complete' });
  });

  it('optional enrichment and Notion/digest failures do not block source', () => {
    expect(
      evaluate({
        jobs: [
          job('acquire_url', 'complete'),
          job('enrich', 'failed'),
          job('acquire_url', 'failed', { generation: prior, id: 'old' }),
        ],
      }),
    ).toMatchObject({ status: 'complete' });
  });

  it('one failed required attachment defeats successful other extraction', () => {
    expect(
      evaluate({
        requiredStages: ['extract'],
        jobs: [job('extract', 'complete')],
        attachments: [
          {
            id: 'att-good',
            generation: current,
            required: true,
            completeness: 'complete',
          },
          {
            id: 'att-bad',
            generation: current,
            required: true,
            completeness: 'unsupported',
          },
          {
            id: 'att-optional',
            generation: current,
            required: false,
            completeness: 'failed',
          },
        ],
      }),
    ).toMatchObject({
      status: 'failed',
      reason: 'required_attachment_failed',
      blockingAttachmentId: 'att-bad',
    });
  });

  it('allows partial usable extraction while preserving separate coverage', () => {
    expect(
      evaluate({
        requiredStages: ['extract'],
        jobs: [job('extract', 'complete')],
        attachments: [
          {
            id: 'att-partial',
            generation: current,
            required: true,
            completeness: 'partial',
          },
        ],
      }),
    ).toMatchObject({ status: 'complete' });
  });

  it('does not consume historical attachment errors after reprocessing', () => {
    expect(
      evaluate({
        attachments: [
          {
            id: 'old-file',
            generation: prior,
            required: true,
            completeness: 'failed',
          },
        ],
      }),
    ).toMatchObject({ status: 'complete' });
  });

  it('deleted item is excluded from reconciliation, not set complete', () => {
    expect(
      evaluate({ deleted: true, jobs: [job('acquire_url', 'failed')] }),
    ).toMatchObject({ status: null, reason: 'deleted_excluded' });
  });

  it('is deterministic for reordered same-generation job and file lists', () => {
    const first = job('acquire_url', 'complete', { id: 'a' });
    const second = job('acquire_url', 'failed', { id: 'z' });
    const firstDecision = evaluate({ jobs: [first, second] });
    const secondDecision = evaluate({ jobs: [second, first] });
    expect(firstDecision).toEqual(secondDecision);
    expect(firstDecision.status).toBe('failed');
  });

  it('rejects invalid evaluation clocks rather than showing misleading status', () => {
    expect(() => evaluate({ now: new Date('invalid') })).toThrow(TypeError);
    expect(() => evaluate({ generation: '' })).toThrow(TypeError);
  });

  it('does not mistake an explicit capacity pause for runnable work', () => {
    expect(
      evaluate({
        jobs: [
          job('acquire_url', 'pending', {
            deferredReason: 'capacity',
            availableAt: '2026-10-09T19:00:00.000Z',
          }),
        ],
      }),
    ).toMatchObject({
      status: 'pending',
      reason: 'capacity_paused',
      nextEligibleAt: '2026-10-09T19:00:00.000Z',
    });
  });

  it('does not fabricate a future retry time for an operational pause', () => {
    expect(
      evaluate({
        jobs: [
          job('acquire_url', 'pending', {
            deferredReason: 'operational',
          }),
        ],
      }),
    ).toMatchObject({
      status: 'pending',
      reason: 'operational_paused',
      nextEligibleAt: null,
    });
  });

  it('keeps a privacy pause distinct from completed content coverage', () => {
    expect(
      evaluate({
        jobs: [
          job('acquire_url', 'pending', {
            deferredReason: 'privacy',
          }),
        ],
      }),
    ).toMatchObject({
      status: 'pending',
      reason: 'policy_paused',
    });
  });

  it('shows eligible queued and delayed capacity work distinctly', () => {
    expect(
      evaluate({
        jobs: [job('acquire_url', 'pending')],
      }),
    ).toMatchObject({ status: 'pending', reason: 'queued' });
    expect(
      evaluate({
        jobs: [
          job('acquire_url', 'pending', {
            availableAt: '2026-10-10T00:00:00.000Z',
          }),
        ],
      }),
    ).toMatchObject({ status: 'pending', reason: 'retry_wait' });
  });
});
