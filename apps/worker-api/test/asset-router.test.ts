import { describe, expect, it, vi } from 'vitest';
import {
  servePublicAsset,
  type StaticAssets,
} from '../src/assets/asset-router';

const origin = 'https://preview.example.test';

function assets(
  status = 200,
): StaticAssets & { fetch: ReturnType<typeof vi.fn> } {
  return {
    fetch: vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      return new Response(
        path === '/index.html' ? '<!doctype html>' : 'bundle',
        {
          status,
          headers: {
            'Content-Type':
              path === '/index.html' ? 'text/html' : 'text/javascript',
          },
        },
      );
    }),
  };
}

describe('BG-21 public asset routing', () => {
  it.each([
    '/',
    '/capture',
    '/capture/file',
    '/operations',
    '/digests',
    '/items/123',
    '/items/%3F',
  ])('serves only the public shell for %s', async (pathname) => {
    const binding = assets();
    const response = await servePublicAsset(
      new Request(origin + pathname),
      binding,
    );
    expect(response?.status).toBe(200);
    expect(response?.headers.get('Content-Type')).toContain('text/html');
    expect(response?.headers.get('Cache-Control')).toBe(
      'no-cache, must-revalidate',
    );
    expect(new URL(binding.fetch.mock.calls[0]![0].url).pathname).toBe(
      '/index.html',
    );
  });

  it.each([
    '/items/',
    '/items/a/b',
    '/capture/nope',
    '/unknown',
    '/api/v1/health',
  ])('never uses the shell for %s', async (pathname) => {
    const binding = assets();
    expect(
      await servePublicAsset(new Request(origin + pathname), binding),
    ).toBeNull();
    expect(binding.fetch).not.toHaveBeenCalled();
  });

  it('never serves the shell for a POST to the item page', async () => {
    const binding = assets();
    const response = await servePublicAsset(
      new Request(origin + '/items/123', { method: 'POST' }),
      binding,
    );
    expect(response?.status).toBe(405);
    expect(response?.headers.get('Allow')).toBe('GET, HEAD');
    expect(binding.fetch).not.toHaveBeenCalled();
  });

  it('sets immutable cache only for hashed bundles', async () => {
    const binding = assets();
    const hashed = await servePublicAsset(
      new Request(origin + '/assets/index-AbcDef12.js'),
      binding,
    );
    expect(hashed?.headers.get('Cache-Control')).toBe(
      'public, max-age=31536000, immutable',
    );
    const plain = await servePublicAsset(
      new Request(origin + '/assets/index.js'),
      binding,
    );
    expect(plain?.headers.get('Cache-Control')).toBe(
      'no-cache, must-revalidate',
    );
  });

  it('returns 404 text for missing JavaScript and never index.html', async () => {
    const binding = assets(404);
    const response = await servePublicAsset(
      new Request(origin + '/assets/missing-XyZ01234.js'),
      binding,
    );
    expect(response?.status).toBe(404);
    expect(response?.headers.get('Content-Type')).toContain('text/plain');
    expect(response?.headers.get('Cache-Control')).toBe('no-store');
    expect(await response?.text()).not.toContain('html');
  });

  it.each([
    ['/', 'no-cache, must-revalidate'],
    ['/assets/index-AbcDef12.js', 'public, max-age=31536000, immutable'],
  ])(
    'preserves an ETag 304 for %s without rewriting it to a 503',
    async (path, policy) => {
      const binding: StaticAssets = {
        fetch: async (request) => {
          expect(request.headers.get('If-None-Match')).toBe('"release-a"');
          return new Response(null, {
            status: 304,
            headers: { ETag: '"release-a"' },
          });
        },
      };
      const response = await servePublicAsset(
        new Request(origin + path, {
          headers: { 'If-None-Match': '"release-a"' },
        }),
        binding,
      );
      expect(response?.status).toBe(304);
      expect(response?.headers.get('ETag')).toBe('"release-a"');
      expect(response?.headers.get('Cache-Control')).toBe(policy);
      expect(await response?.text()).toBe('');
    },
  );

  it('returns 503 rather than fake HTML when the asset binding is absent', async () => {
    const response = await servePublicAsset(
      new Request(origin + '/'),
      undefined,
    );
    expect(response?.status).toBe(503);
  });
});
