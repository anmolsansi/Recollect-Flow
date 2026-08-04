import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { DigestRepository } from '../src/digests/digest.repository';
import { parseDigestPayload } from '../src/digests/digest.renderer';
import { DigestService } from '../src/digests/digest.service';
import { processDigestDeliveries } from '../src/digests/digest.worker';
import type { DigestPeriod } from '../src/digests/digest-period';

const dailyPeriod: DigestPeriod = {
  digestType: 'daily',
  timezone: 'Asia/Kolkata',
  start: '2026-08-01T18:30:00.000Z',
  end: '2026-08-02T18:30:00.000Z',
};

const weeklyPeriod: DigestPeriod = {
  digestType: 'weekly',
  timezone: 'Asia/Kolkata',
  start: '2026-07-26T18:30:00.000Z',
  end: '2026-08-02T18:30:00.000Z',
};

async function resetDatabase() {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM digest_audit_events'),
    env.DB.prepare('DELETE FROM digest_deliveries'),
    env.DB.prepare('DELETE FROM digest_runs'),
    env.DB.prepare('DELETE FROM item_feedback_events'),
    env.DB.prepare('DELETE FROM item_field_overrides'),
    env.DB.prepare('DELETE FROM provider_usage'),
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM processing_job_results'),
    env.DB.prepare('DELETE FROM processing_jobs'),
    env.DB.prepare('DELETE FROM sync_attempts'),
    env.DB.prepare('DELETE FROM extraction_records'),
    env.DB.prepare('DELETE FROM capture_events'),
    env.DB.prepare('DELETE FROM item_deduplication_keys'),
    env.DB.prepare('DELETE FROM attachments'),
    env.DB.prepare('DELETE FROM items'),
  ]);
}

interface ItemInput {
  id: string;
  title: string;
  privacy?: 'unknown' | 'public' | 'personal' | 'sensitive';
  capturedAt?: string;
  updatedAt?: string;
  topics?: string[];
  importance?: number | null;
  project?: string | null;
  suggestedAction?: string | null;
  lifecycle?: 'Inbox' | 'Reviewed' | 'Actioned' | 'Archived';
}

async function insertItem(input: ItemInput) {
  const capturedAt = input.capturedAt ?? '2026-08-02T10:00:00.000Z';
  const updatedAt = input.updatedAt ?? capturedAt;
  await env.DB.prepare(
    `INSERT INTO items (
       id, idempotency_key, source_type, source_app, title, raw_text,
       privacy_level, processing_status, topics_json, importance, project,
       suggested_action, lifecycle_status, captured_at, created_at, updated_at
     ) VALUES (
       ?1, ?2, 'text', 'test', ?3, ?4, ?5, 'complete', ?6, ?7, ?8,
       ?9, ?10, ?11, ?11, ?12
     )`,
  )
    .bind(
      input.id,
      `key-${input.id}`,
      input.title,
      `raw-${input.title}`,
      input.privacy ?? 'public',
      JSON.stringify(input.topics ?? []),
      input.importance ?? null,
      input.project ?? null,
      input.suggestedAction ?? null,
      input.lifecycle ?? 'Inbox',
      capturedAt,
      updatedAt,
    )
    .run();
}

async function insertFailedJob(
  itemId: string,
  updatedAt = '2026-08-02T11:00:00.000Z',
) {
  await env.DB.prepare(
    `INSERT INTO processing_jobs (
       id, item_id, job_type, status, attempts, available_at, last_error_code,
       created_at, updated_at
     ) VALUES (?1, ?2, 'enrich', 'failed', 2, ?3, 'PROVIDER_OUTAGE', ?3, ?3)`,
  )
    .bind(`job-${itemId}`, itemId, updatedAt)
    .run();
}

function service(options: ConstructorParameters<typeof DigestService>[1] = {}) {
  return new DigestService(env, {
    now: () => new Date('2026-08-03T02:00:00.000Z'),
    webInboxBaseUrl: 'https://inbox.example.test/',
    aiEnabled: false,
    ...options,
  });
}

describe('OPE-226 digest integration', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(resetDatabase);

  it('generates every daily section while keeping restricted content private', async () => {
    await insertItem({
      id: 'daily-public',
      title: 'Public title',
      topics: ['Cloudflare', 'Search'],
      importance: 90,
      suggestedAction: 'Review this public saved item',
    });
    await insertItem({
      id: 'daily-personal',
      title: 'Personal secret title',
      privacy: 'personal',
      topics: ['Private topic'],
      importance: 80,
    });
    await insertItem({
      id: 'daily-sensitive',
      title: 'Sensitive secret title',
      privacy: 'sensitive',
      importance: 70,
    });
    await insertItem({
      id: 'daily-unknown',
      title: 'Unknown secret title',
      privacy: 'unknown',
      importance: 60,
    });
    await insertFailedJob('daily-personal');

    const generated = await service().generatePeriod(dailyPeriod);
    const payload = parseDigestPayload(generated.run.canonicalPayloadJson);

    expect(generated.empty).toBe(false);
    expect(payload.eligibleItemIds).toHaveLength(4);
    expect(payload.topicGroups.map((group) => group.topic)).toContain(
      'Cloudflare',
    );
    expect(payload.suggestedActionItemIds).toContain('daily-public');
    expect(generated.run.deterministicText).toContain('Items saved: 4');
    expect(generated.run.deterministicText).toContain('Topic groups:');
    expect(generated.run.deterministicText).toContain('Top items:');
    expect(generated.run.deterministicText).toContain('Failed processing:');
    expect(generated.run.deterministicText).toContain('Suggested actions:');
    expect(generated.run.deterministicText).toContain('Public title');
    expect(generated.run.deterministicText).toContain('Private item');
    expect(generated.run.deterministicText).toContain(
      'Private item due for review.',
    );
    expect(generated.run.deterministicText).not.toContain(
      'Personal secret title',
    );
    expect(generated.run.deterministicText).not.toContain(
      'Sensitive secret title',
    );
    expect(generated.run.deterministicText).not.toContain(
      'Unknown secret title',
    );
    expect(generated.run.deterministicText).not.toContain('Private topic');
    expect(generated.run.deterministicText).not.toContain('raw-');
  });

  it('regenerates deterministically and converges duplicate scheduled invocations', async () => {
    await insertItem({
      id: 'stable-item',
      title: 'Stable digest item',
      topics: ['Stable'],
      importance: 88,
    });

    const [first, replay] = await Promise.all([
      service().generatePeriod(dailyPeriod, { queueDelivery: true }),
      service().generatePeriod(dailyPeriod, { queueDelivery: true }),
    ]);
    expect(first.run.id).toBe(replay.run.id);

    const count = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM digest_runs
       WHERE digest_type = 'daily' AND period_start = ?1 AND period_end = ?2`,
    )
      .bind(dailyPeriod.start, dailyPeriod.end)
      .first<{ count: number }>();
    expect(count?.count).toBe(1);
    const deliveryCount = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM digest_deliveries',
    ).first<{ count: number }>();
    expect(deliveryCount?.count).toBe(1);

    const regenerated = await service().regenerate(first.run.id, false);
    expect(regenerated.run.generationVersion).toBe(2);
    expect(regenerated.run.contentHash).toBe(first.run.contentHash);
    expect(regenerated.run.deterministicText).toBe(first.run.deterministicText);
  });

  it('suppresses empty-period delivery', async () => {
    const generated = await service().generatePeriod(dailyPeriod, {
      queueDelivery: true,
    });
    expect(generated.empty).toBe(true);
    expect(generated.delivery).toMatchObject({
      state: 'skipped',
      lastErrorCode: 'EMPTY_PERIOD',
      attempts: 0,
    });
  });

  it('falls back to deterministic text when optional AI wording fails', async () => {
    await insertItem({ id: 'ai-fallback', title: 'AI fallback source' });
    const generated = await service({
      aiEnabled: true,
      aiClient: {
        generateDigestSummary: vi.fn().mockRejectedValue(
          Object.assign(new Error('provider down'), {
            errorCode: 'PROVIDER_OUTAGE',
          }),
        ),
      },
    }).generatePeriod(dailyPeriod);

    expect(generated.run.generationSource).toBe('deterministic');
    expect(generated.run.aiText).toBeNull();
    expect(generated.run.aiFailureCode).toBe('PROVIDER_OUTAGE');
  });

  it('falls back when AI wording contains links or otherwise invalid output', async () => {
    await insertItem({ id: 'ai-invalid', title: 'AI invalid source' });
    const generated = await service({
      aiEnabled: true,
      aiClient: {
        generateDigestSummary: vi.fn().mockResolvedValue({
          result: {
            summary: 'Open https://untrusted.example to continue',
            topicGroups: [],
            topItems: [],
            suggestedActions: [],
          },
          provider: 'mock',
          model: 'mock-digest',
          latencyMs: 1,
          inputUnits: 5,
          outputUnits: 5,
        }),
      },
    }).generatePeriod(dailyPeriod);

    expect(generated.run.generationSource).toBe('deterministic');
    expect(generated.run.aiText).toBeNull();
    expect(generated.run.aiFailureCode).toBe('AI_INVALID_OUTPUT');
  });

  it('sends only aggregate privacy-safe facts to optional AI wording', async () => {
    await insertItem({
      id: 'ai-public-fact',
      title: 'Title excluded from AI projection',
      topics: ['Public topic'],
    });
    await insertItem({
      id: 'ai-private-fact',
      title: 'Private secret excluded from AI projection',
      privacy: 'personal',
      topics: ['Private secret topic'],
    });
    const generateDigestSummary = vi.fn().mockResolvedValue({
      result: {
        summary: 'Safe aggregate wording',
        topicGroups: [],
        topItems: [],
        suggestedActions: ['Review saved items'],
      },
      provider: 'mock',
      model: 'mock-digest',
      latencyMs: 1,
      inputUnits: 5,
      outputUnits: 5,
    });

    await service({
      aiEnabled: true,
      aiClient: { generateDigestSummary },
    }).generatePeriod(dailyPeriod);

    const prompt = String(generateDigestSummary.mock.calls[0]?.[0]);
    expect(prompt).toContain('Eligible item count: 2');
    expect(prompt).toContain('Public topic');
    expect(prompt).not.toContain('Private secret');
    expect(prompt).not.toContain('/items/');
    expect(prompt).not.toContain('Title excluded from AI projection');
  });

  it('records successful optional AI wording and usage metadata', async () => {
    await insertItem({ id: 'ai-success', title: 'AI source' });
    const generated = await service({
      aiEnabled: true,
      aiClient: {
        generateDigestSummary: vi.fn().mockResolvedValue({
          result: {
            summary: 'Safe concise wording',
            topicGroups: [],
            topItems: [],
            suggestedActions: ['Review the linked item'],
          },
          provider: 'mock',
          model: 'mock-digest',
          latencyMs: 12,
          inputUnits: 25,
          outputUnits: 8,
        }),
      },
    }).generatePeriod(dailyPeriod);

    expect(generated.run.generationSource).toBe('ai');
    expect(generated.run.aiText).toContain('Safe concise wording');
    expect(generated.run).toMatchObject({
      aiProvider: 'mock',
      aiModel: 'mock-digest',
      aiLatencyMs: 12,
      aiInputUnits: 25,
      aiOutputUnits: 8,
      aiFailureCode: null,
    });
  });

  it('builds every weekly review section from explicit rules', async () => {
    await insertItem({
      id: 'weekly-theme-a',
      title: 'Theme A',
      capturedAt: '2026-07-30T10:00:00.000Z',
      topics: ['Agents'],
      importance: 75,
    });
    await insertItem({
      id: 'weekly-theme-b',
      title: 'Theme B',
      capturedAt: '2026-07-31T10:00:00.000Z',
      topics: ['Agents'],
      importance: 85,
    });
    await insertItem({
      id: 'dormant-project',
      title: 'Dormant source',
      capturedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      project: 'Recollect Archive',
    });
    const nearArchive = new Date(
      new Date(weeklyPeriod.end).getTime() - 85 * 86_400_000,
    ).toISOString();
    await insertItem({
      id: 'near-archive',
      title: 'Review before archive',
      capturedAt: nearArchive,
      updatedAt: nearArchive,
      importance: 72,
    });

    const generated = await service().generatePeriod(weeklyPeriod);
    const payload = parseDigestPayload(generated.run.canonicalPayloadJson);

    expect(payload.topicGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ topic: 'Agents', count: 2 }),
      ]),
    );
    expect(payload.highValueItemIds).toContain('weekly-theme-b');
    expect(payload.dormantProjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ project: 'Recollect Archive' }),
      ]),
    );
    expect(payload.nearingArchiveItemIds).toContain('near-archive');
    for (const heading of [
      'Repeated themes:',
      'Unreviewed high-value items:',
      'Dormant projects:',
      'Contradictions requiring review:',
      'Items nearing archive:',
      'Suggested actions:',
    ]) {
      expect(generated.run.deterministicText).toContain(heading);
    }
    expect(generated.run.deterministicText).toContain(
      'no explicit contradiction relation is stored',
    );
  });

  it('rechecks privacy and deletion immediately before Telegram delivery', async () => {
    await insertItem({
      id: 'privacy-change',
      title: 'Title that must disappear',
      privacy: 'public',
    });
    const generated = await service().generatePeriod(dailyPeriod, {
      queueDelivery: true,
    });
    await env.DB.prepare(
      `UPDATE items SET privacy_level = 'sensitive', updated_at = ?1
       WHERE id = 'privacy-change'`,
    )
      .bind('2026-08-03T00:00:00.000Z')
      .run();

    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 99 } }), {
        status: 200,
      }),
    );
    await processDigestDeliveries(env, { fetcher });

    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as { text: string };
    expect(body.text).toContain('Private item due for review.');
    expect(body.text).not.toContain('Title that must disappear');
    const delivery = await new DigestRepository(env.DB).getDelivery(
      generated.delivery!.id,
    );
    expect(delivery).toMatchObject({
      state: 'sent',
      telegramMessageId: '99',
    });
  });

  it('suppresses Telegram delivery when all referenced items are deleted after generation', async () => {
    await insertItem({
      id: 'deleted-before-send',
      title: 'Delete before send',
    });
    const generated = await service().generatePeriod(dailyPeriod, {
      queueDelivery: true,
    });
    await env.DB.prepare(
      `UPDATE items SET lifecycle_status = 'Deleted', deleted_at = ?1, updated_at = ?1
       WHERE id = 'deleted-before-send'`,
    )
      .bind('2026-08-03T00:00:00.000Z')
      .run();
    const fetcher = vi.fn();

    await processDigestDeliveries(env, { fetcher });

    expect(fetcher).not.toHaveBeenCalled();
    expect(
      await new DigestRepository(env.DB).getDelivery(generated.delivery!.id),
    ).toMatchObject({
      state: 'skipped',
      lastErrorCode: 'EMPTY_AFTER_PRIVACY_RECHECK',
    });
  });

  it('uses leases to prevent duplicate concurrent Telegram sends', async () => {
    await insertItem({ id: 'single-send', title: 'Send once' });
    await service().generatePeriod(dailyPeriod, { queueDelivery: true });
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 100 } }), {
        status: 200,
      }),
    );

    await Promise.all([
      processDigestDeliveries(env, { fetcher }),
      processDigestDeliveries(env, { fetcher }),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('recovers an expired Telegram delivery lease without duplicate finalization', async () => {
    await insertItem({ id: 'expired-lease', title: 'Expired lease item' });
    const generated = await service().generatePeriod(dailyPeriod, {
      queueDelivery: true,
    });
    const repository = new DigestRepository(env.DB);
    const firstLease = await repository.leaseTelegramDeliveries(
      'abandoned-owner',
      1,
      1,
      new Date('2026-08-03T03:00:00.000Z'),
    );
    expect(firstLease).toHaveLength(1);

    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 101 } }), {
        status: 200,
      }),
    );
    await processDigestDeliveries(env, {
      now: () => new Date('2026-08-03T03:02:00.000Z'),
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    expect(await repository.getDelivery(generated.delivery!.id)).toMatchObject({
      state: 'sent',
      attempts: 2,
      telegramMessageId: '101',
    });
  });

  it('retries definite 429 failures and never auto-retries ambiguous results', async () => {
    await insertItem({ id: 'retry-item', title: 'Retry item' });
    const rateLimited = await service().generatePeriod(dailyPeriod, {
      queueDelivery: true,
    });
    await processDigestDeliveries(env, {
      now: () => new Date('2026-08-03T03:00:00.000Z'),
      fetcher: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error_code: 429,
            parameters: { retry_after: 30 },
          }),
          { status: 429 },
        ),
      ),
    });
    expect(
      await new DigestRepository(env.DB).getDelivery(rateLimited.delivery!.id),
    ).toMatchObject({
      state: 'pending',
      attempts: 1,
      lastErrorCode: 'TELEGRAM_RATE_LIMITED',
      availableAt: '2026-08-03T03:00:30.000Z',
    });

    await resetDatabase();
    await insertItem({ id: 'unknown-item', title: 'Unknown delivery' });
    const ambiguous = await service().generatePeriod(dailyPeriod, {
      queueDelivery: true,
    });
    await processDigestDeliveries(env, {
      fetcher: vi
        .fn()
        .mockRejectedValue(new DOMException('aborted', 'AbortError')),
    });
    expect(
      await new DigestRepository(env.DB).getDelivery(ambiguous.delivery!.id),
    ).toMatchObject({
      state: 'unknown',
      attempts: 1,
      lastErrorCode: 'TELEGRAM_TIMEOUT_AMBIGUOUS',
    });
  });
});
