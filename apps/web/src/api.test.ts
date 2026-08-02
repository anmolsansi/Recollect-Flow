import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchApi, fetchApiEnvelope, getAdminSession } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('web API client', () => {
  it('restores an authenticated admin session with credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { authenticated: true },
          meta: { request_id: 'request-1' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getAdminSession()).resolves.toEqual({ authenticated: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/session',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('preserves cursor metadata for list requests', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [{ id: 'item-1' }],
            meta: { request_id: 'request-2', next_cursor: 'next-page' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(fetchApiEnvelope('/items?limit=25')).resolves.toMatchObject({
      meta: { next_cursor: 'next-page' },
    });
  });

  it('prefixes the API path exactly once', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ data: { ok: true }, meta: { request_id: 'request-3' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchApi('/items/item-1/delete', {
      method: 'POST',
      body: JSON.stringify({ edit_version: 1 }),
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/items/item-1/delete');
  });

  it('exposes stable API error codes to the UI', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'VERSION_CONFLICT',
              message: 'Item version conflict',
            },
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(fetchApi('/items/item-1')).rejects.toMatchObject({
      status: 409,
      code: 'VERSION_CONFLICT',
    });
  });
});
