import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { handleFetch } from '../src/index';

describe('first release with external integrations disabled', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  it('persists and exports a capture without provider credentials or network calls', async () => {
    const bindings = {
      ...env,
      NOTION_ACCESS_TOKEN: undefined,
      TELEGRAM_BOT_TOKEN: undefined,
      TELEGRAM_CHAT_ID: undefined,
      NOTION_DATABASE_ID: '',
      AI_PROVIDERS_ENABLED: '',
      AI_PROVIDER_IMPLEMENTATIONS: '{}',
      HOSTED_SCHEDULED_WORK_ENABLED: 'false',
      HOSTED_EXTERNAL_DISPATCH_ENABLED: 'false',
      HOSTED_HTTP_DISPATCH_ENABLED: 'false',
      HOSTED_BACKUP_AUTOCREATE_ENABLED: 'false',
    };
    const ctx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as unknown as ExecutionContext;
    const fetcher = vi.spyOn(globalThis, 'fetch');
    try {
      const saved = await handleFetch(
        new Request('https://first-release.example.test/api/v1/captures', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + env.CAPTURE_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idempotency_key: 'first-release-no-provider-credentials',
            source_type: 'note',
            source_app: 'first-release-test',
            shared_text: 'First release synthetic private capture.',
            privacy_level: 'personal',
            captured_at: '2026-10-31T12:00:00.000Z',
            client: { name: 'first-release-test', version: '1' },
          }),
        }),
        bindings,
        ctx,
      );
      expect(saved.status).toBe(201);
      const id = ((await saved.json()) as { data: { capture_id: string } }).data
        .capture_id;
      const exported = await handleFetch(
        new Request(
          'https://first-release.example.test/api/v1/export?format=json',
          {
            headers: { Authorization: 'Bearer ' + env.ADMIN_TOKEN },
          },
        ),
        bindings,
        ctx,
      );
      expect(exported.status).toBe(200);
      const body = (await exported.json()) as {
        items: {
          item: { id: string; raw_text: string; privacy_level: string };
        }[];
      };
      expect(
        body.items.find((entry) => entry.item.id === id)?.item,
      ).toMatchObject({
        raw_text: 'First release synthetic private capture.',
        privacy_level: 'personal',
      });
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      fetcher.mockRestore();
    }
  });
});
