import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchApi, fetchApiEnvelope, getAdminSession } from './api';

const jsonHeaders = { 'Content-Type': 'application/json' };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('web API client', () => {
  it('restores an authenticated session with credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: { authenticated: true },
        meta: { request_id: 'request-1' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getAdminSession()).resolves.toEqual({
      authenticated: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/session',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('preserves cursor metadata for list requests', async () => {
    const response = {
      data: [{ id: 'item-1' }],
      meta: {
        request_id: 'request-2',
        next_cursor: 'next-page',
      },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(response)));

    const result = await fetchApiEnvelope('/items?limit=25');
    expect(result.meta.next_cursor).toBe('next-page');
  });

  it('prefixes the API path exactly once', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: { ok: true },
        meta: { request_id: 'request-3' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchApi('/items/item-1/delete', {
      method: 'POST',
      body: JSON.stringify({ edit_version: 1 }),
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/v1/items/item-1/delete',
    );
  });

  it('exposes stable API error codes to the UI', async () => {
    const response = {
      error: {
        code: 'VERSION_CONFLICT',
        message: 'Item version conflict',
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(response, 409)),
    );

    await expect(fetchApi('/items/item-1')).rejects.toMatchObject({
      status: 409,
      code: 'VERSION_CONFLICT',
    });
  });
});
