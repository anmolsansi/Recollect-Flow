import { describe, expect, it } from 'vitest';

import {
  hostedBackupExpiresAt,
  hostedBackupObjectKey,
} from '../src/recovery/backup-retention';

describe('OPE-228 hosted backup retention', () => {
  it('expires exactly thirty days after creation', () => {
    expect(hostedBackupExpiresAt(new Date('2026-08-10T00:00:00.000Z'))).toBe(
      '2026-09-09T00:00:00.000Z',
    );
  });

  it('uses a unique immutable backup namespace', () => {
    expect(hostedBackupObjectKey('backup-123')).toBe(
      'backups/v1/backup-123.json',
    );
  });
});
