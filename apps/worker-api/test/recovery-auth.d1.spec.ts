import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';

const RECOVERY_REQUESTS: ReadonlyArray<{
  method: 'GET' | 'POST';
  path: string;
  body?: string;
}> = [
  { method: 'GET', path: '/api/v1/export?format=json' },
  { method: 'POST', path: '/api/v1/backups' },
  {
    method: 'POST',
    path: '/api/v1/items/missing-item/purge-request',
    body: JSON.stringify({ edit_version: 0 }),
  },
  {
    method: 'POST',
    path: '/api/v1/restore?dry_run=true',
    body: JSON.stringify({}),
  },
  { method: 'POST', path: '/api/v1/integrity-checks' },
];

describe('OPE-228 recovery authorization', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  it('rejects anonymous callers before recovery work starts', async () => {
    const app = createApp();
    for (const request of RECOVERY_REQUESTS) {
      const response = await app.request(
        request.path,
        {
          method: request.method,
          body: request.body,
          headers: request.body ? { 'Content-Type': 'application/json' } : {},
        },
        env,
      );
      expect(response.status, `${request.method} ${request.path}`).toBe(403);
    }
  });

  it('does not let a capture-scoped token access recovery operations', async () => {
    const app = createApp();
    for (const request of RECOVERY_REQUESTS) {
      const response = await app.request(
        request.path,
        {
          method: request.method,
          body: request.body,
          headers: {
            Authorization: 'Bearer test-capture-token',
            ...(request.body ? { 'Content-Type': 'application/json' } : {}),
          },
        },
        env,
      );
      expect(response.status, `${request.method} ${request.path}`).toBe(403);
    }
  });
});
