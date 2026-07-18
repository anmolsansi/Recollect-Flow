import { describe, expect, it } from 'vitest';

import { normalizeUrl } from '../src/captures/url-normalizer';

describe('normalizeUrl', () => {
  it('removes tracking parameters, fragments, and a trailing slash', () => {
    expect(
      normalizeUrl(
        'https://EXAMPLE.com/article/?utm_source=mail&b=2&a=1#section',
      ),
    ).toBe('https://example.com/article?a=1&b=2');
  });

  it('removes common social tracking parameters conservatively', () => {
    expect(normalizeUrl('https://youtu.be/demo?si=secret&t=10')).toBe(
      'https://youtu.be/demo?t=10',
    );
    expect(normalizeUrl('https://instagram.com/p/demo/?igshid=secret')).toBe(
      'https://instagram.com/p/demo',
    );
  });
});
