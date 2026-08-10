import { describe, expect, it } from 'vitest';

import { sanitizePortableValue } from '../src/recovery/export-sanitize';

describe('OPE-228 portable export secret scrubbing', () => {
  it('removes credential-like keys recursively without changing normal content', () => {
    const result = sanitizePortableValue({
      title: 'keep me',
      api_key: 'remove',
      nested: {
        authorization: 'remove',
        note: 'keep nested',
        values: [{ access_token: 'remove', status: 'keep' }],
      },
    });

    expect(result).toEqual({
      title: 'keep me',
      nested: {
        note: 'keep nested',
        values: [{ status: 'keep' }],
      },
    });
  });
});
