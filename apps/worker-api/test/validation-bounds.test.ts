import { describe, expect, it } from 'vitest';

import { itemUpdateSchema } from '@recollect/contracts';

describe('bounded collection validation', () => {
  it('rejects oversized invalid topics without creating one error per element', () => {
    const result = itemUpdateSchema.safeParse({
      edit_version: 1,
      topics: Array(2_000).fill(1),
    });
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Oversized topics accepted');
    expect(result.error.issues).toHaveLength(1);
    expect(result.error.issues[0]).toMatchObject({
      code: 'too_big',
      path: ['topics'],
    });
  });

  it('preserves valid topic arrays at the supported boundary', () => {
    const input = { edit_version: 1, topics: Array(20).fill('topic') };
    expect(itemUpdateSchema.parse(input)).toEqual(input);
  });
});
