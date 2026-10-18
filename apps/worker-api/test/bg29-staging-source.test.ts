import { describe, expect, it, vi } from 'vitest';

import {
  BG29_STAGING_URLS,
  createBg29StagingSourceFetcher,
} from '../src/jobs/extraction/bg29-staging-source';

describe('BG-29.078 MC-02 isolated staging source adapter', () => {
  it('parses all 12 fixture documents through the real bounded SourceFetcher', async () => {
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => {
        throw new Error('UNEXPECTED_EXTERNAL_EGRESS');
      });

    try {
      const source = createBg29StagingSourceFetcher();
      const results = await Promise.all(
        BG29_STAGING_URLS.map((url) => source.fetch(url)),
      );

      expect(BG29_STAGING_URLS).toHaveLength(12);
      expect(new Set(BG29_STAGING_URLS).size).toBe(12);
      for (const [index, outcome] of results.entries()) {
        expect(outcome).toMatchObject({
          status: 'acquired_text',
          coverage: 'acquired_text',
          retryable: false,
          httpStatus: 200,
          redirectCount: 0,
        });
        expect(outcome.fetchedFinalUrl).toBe(BG29_STAGING_URLS[index]);
        expect(outcome.acquiredText).toContain(
          `BG29_STAGING_URL_SENTINEL_${String(index + 1).padStart(2, '0')}`,
        );
        expect(outcome.responseBytes).toBeGreaterThan(0);
        expect(outcome.extractedCharacters).toBeGreaterThan(0);
      }
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });

  it('denies unknown, edited, and non-fixture URLs with no fetch or retries', async () => {
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => {
        throw new Error('UNEXPECTED_EXTERNAL_EGRESS');
      });
    try {
      const source = createBg29StagingSourceFetcher();
      const disallowed = [
        'https://notion.so/',
        'https://api.openai.com/',
        'http://127.0.0.1/',
        'https://example.com/bg29-078/source-13',
        `${BG29_STAGING_URLS[0]}?unexpected=true`,
        'https://sub.example.com/bg29-078/source-01',
        'https://example.com/bg29-078/source-01/',
      ];
      for (const url of disallowed) {
        expect(await source.fetch(url)).toEqual({
          status: 'destination_blocked',
          coverage: 'url_only',
          retryable: false,
          errorCode: 'SOURCE_DESTINATION_BLOCKED',
          redirectCount: 0,
        });
      }
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });

  it('simulates one bounded HTTP 503 with retry-after then recovers', async () => {
    const target = BG29_STAGING_URLS[0]!;
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => {
        throw new Error('UNEXPECTED_EXTERNAL_EGRESS');
      });
    try {
      const source = createBg29StagingSourceFetcher({ failOnceFor: target });
      expect(await source.fetch(target)).toMatchObject({
        status: 'server_error',
        retryable: true,
        errorCode: 'SOURCE_SERVER_ERROR',
        httpStatus: 503,
        retryAfterSeconds: 1,
      });
      expect(await source.fetch(target)).toMatchObject({
        status: 'acquired_text',
        retryable: false,
        httpStatus: 200,
      });
      expect(network).not.toHaveBeenCalled();
      expect(() =>
        createBg29StagingSourceFetcher({
          failOnceFor: 'https://unapproved.example.com/',
        }),
      ).toThrow('not a permitted fixture');
    } finally {
      network.mockRestore();
    }
  });
});
