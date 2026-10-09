import { describe, expect, it } from 'vitest';

import { sourceStatusMessage, visibleSourceCoverage } from './source-recovery';

describe('BG-11 truthful source recovery projection', () => {
  it('marks later owner supplied text without rewriting old fetch coverage', () => {
    expect(
      visibleSourceCoverage(
        'url',
        'url_only',
        'User copied this excerpt',
        'url_only',
      ),
    ).toBe('supplied_text (owner-provided)');
    expect(
      visibleSourceCoverage(
        'url',
        'metadata_only',
        'User copied this excerpt',
        'metadata_only',
      ),
    ).toBe('supplied_text (owner-provided)');
  });

  it('never passes off owner text as acquired content and preserves stronger fetched evidence', () => {
    expect(
      visibleSourceCoverage(
        'url',
        'url_only',
        'User supplied text',
        'acquired_text',
      ),
    ).toBe('acquired_text');
    expect(
      visibleSourceCoverage('url', 'url_only', null, 'login_required'),
    ).toBe('login_required');
    expect(visibleSourceCoverage('url', null, null, null)).toBe('url_only');
    expect(
      visibleSourceCoverage('file', 'partial', 'something', 'acquired_text'),
    ).toBe('partial');
  });

  it('describes access restrictions without soliciting a password', () => {
    const message = sourceStatusMessage('login_required');
    expect(message).toContain('Do not share passwords');
    expect(message).not.toContain('https://');
  });
});
