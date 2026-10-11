import { describe, expect, it } from 'vitest';
import { handleFetch } from '../src/index';

const origin = 'https://preview.example.test';
const env = {
  ASSETS: {
    fetch: async () => new Response('<!doctype html>', {
      headers: { 'Content-Type': 'text/html' },
    }),
  },
  ADMIN_TOKEN: 'test-admin-token',
  CAPTURE_TOKEN: 'test-capture-token',
  LOCAL_WORKER_TOKEN: 'test-worker-token',
} as unknown as Cloudflare.Env;
const execution = {} as ExecutionContext;

describe('BG-21 API precedence', () => {
  it('preserves API health JSON with private caching', async () => {
    const response = await handleFetch(new Request(origin + '/api/v1/health'), env, execution);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toMatchObject({ data: { status: 'ok' } });
  });

  it.each(['GET', 'POST'])('preserves JSON 404 for %s unknown API', async (method) => {
    const response = await handleFetch(new Request(origin + '/api/v1/unknown', { method }), env, execution);
    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('never exposes a private item through public assets', async () => {
    const response = await handleFetch(new Request(origin + '/api/v1/items/123'), env, execution);
    expect(response.status).toBe(401);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('does not rewrite unknown paths or multi-segment item links', async () => {
    const response = await handleFetch(new Request(origin + '/items/one/two'), env, execution);
    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toContain('text/plain');
  });
});
