import { describe, expect, it } from 'vitest';

import { validateSourceDestination } from '../src/jobs/extraction/source-destination';

describe('BG-09 source destination admission', () => {
  it('accepts public HTTP(S) URLs and preserves the query while dropping fragments', () => {
    const result = validateSourceDestination(
      'https://Example.COM:443/article?token=value#section',
    );

    expect(result.allowed).toBe(true);
    if (!result.allowed) return;
    expect(result.url.href).toBe(
      'https://example.com/article?token=value',
    );
  });

  it('rejects unsupported schemes, embedded credentials, and non-default ports', () => {
    for (const url of [
      'ftp://example.com/file',
      'file:///tmp/private',
      'https://user@example.com/',
      'https://user:password@example.com/',
      'https://example.com:8443/',
      'http://example.com:443/',
    ]) {
      expect(validateSourceDestination(url)).toEqual({
        allowed: false,
        reason: 'SOURCE_DESTINATION_BLOCKED',
      });
    }
  });

  it('rejects local, private, link-local, metadata, documentation, and reserved IPv4 targets', () => {
    for (const url of [
      'http://localhost/',
      'http://service.local/',
      'http://service.internal/',
      'http://metadata.google.internal/',
      'http://127.0.0.1/',
      'http://10.0.0.1/',
      'http://100.64.0.1/',
      'http://169.254.169.254/latest/meta-data/',
      'http://172.16.0.1/',
      'http://192.168.1.1/',
      'http://192.0.2.1/',
      'http://198.51.100.2/',
      'http://203.0.113.3/',
      'http://224.0.0.1/',
      'http://255.255.255.255/',
    ]) {
      expect(validateSourceDestination(url).allowed, url).toBe(false);
    }
  });

  it('blocks unusual IPv4 spellings after WHATWG normalization', () => {
    for (const url of [
      'http://2130706433/',
      'http://017700000001/',
      'http://0x7f000001/',
      'http://127.1/',
    ]) {
      expect(validateSourceDestination(url).allowed, url).toBe(false);
    }
  });

  it('rejects unsafe IPv6 destinations while allowing a public IPv6 literal', () => {
    for (const url of [
      'http://[::]/',
      'http://[::1]/',
      'http://[fc00::1]/',
      'http://[fd12:3456::1]/',
      'http://[fe80::1]/',
      'http://[ff02::1]/',
      'http://[2001:db8::1]/',
      'http://[::ffff:127.0.0.1]/',
      'http://[::ffff:10.0.0.1]/',
    ]) {
      expect(validateSourceDestination(url).allowed, url).toBe(false);
    }

    const publicIpv6 = validateSourceDestination(
      'https://[2606:4700:4700::1111]/dns-query',
    );
    expect(publicIpv6.allowed).toBe(true);
  });

  it('rejects malformed and single-label destinations before network work', () => {
    for (const url of [
      'not a url',
      'https://intranet/',
      'https://example.invalid/',
      'https://hidden.onion/',
    ]) {
      expect(validateSourceDestination(url).allowed, url).toBe(false);
    }
  });
});
