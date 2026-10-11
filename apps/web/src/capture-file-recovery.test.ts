import { describe, expect, it } from 'vitest';
import {
  fileRecoveryNotice,
  nextFileRecoveryStep,
  validateFileRecoveryReference,
  verifyFileReselection,
  type FileRecoveryReference,
} from './capture-file-recovery';

const reference: FileRecoveryReference = {
  name: 'owner.pdf',
  byteLength: 3,
  sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  mimeType: 'application/pdf',
  stage: 'selected',
};
const bytes = (value: string) => ({
  name: reference.name,
  size: 3,
  arrayBuffer: async () => new TextEncoder().encode(value).buffer,
});
const attachmentId = '01234567-89ab-4cde-8f01-234567890abc';

describe('BG-17 file recovery policy for the BG-18 file flow', () => {
  it('stores name, size and SHA but no original bytes', () => {
    expect(validateFileRecoveryReference(reference)).toBe(true);
    expect(JSON.stringify(reference)).not.toContain('abc');
    expect(reference).not.toHaveProperty('file');
    expect(reference).not.toHaveProperty('bytes');
    expect(nextFileRecoveryStep(reference, false)).toBe('reselect-file');
    expect(fileRecoveryNotice(reference, false)).toContain('not the bytes');
  });

  it('rehashes actual reselected bytes and rejects changed same-size files', async () => {
    expect(await verifyFileReselection(reference, bytes('abc'))).toBe(true);
    expect(await verifyFileReselection(reference, bytes('abd'))).toBe(false);
    expect(await verifyFileReselection(reference, { ...bytes('abc'), name: 'different.pdf' })).toBe(false);
    expect(await verifyFileReselection(reference, { ...bytes('abc'), size: 4 })).toBe(false);
    expect(nextFileRecoveryStep(reference, true)).toBe('upload-existing');
  });

  it('preserves issued server ID through upload, finalize and capture stages', () => {
    const base = { ...reference, attachmentId, expiresAt: '2026-11-30T00:00:00Z' };
    expect(nextFileRecoveryStep({ ...base, stage: 'initialized' }, true, Date.parse('2026-10-11'))).toBe('upload-existing');
    expect(nextFileRecoveryStep({ ...base, stage: 'uploaded' }, false, Date.parse('2026-10-11'))).toBe('finalize-existing');
    expect(nextFileRecoveryStep({ ...base, stage: 'finalized' }, false, Date.parse('2026-10-11'))).toBe('capture-with-finalized-id');
    expect(fileRecoveryNotice({ ...base, stage: 'finalized' }, false)).toContain('original attachment ID');
  });

  it('does not automatically initialize another upload after expiry', () => {
    const initialized: FileRecoveryReference = {
      ...reference, stage: 'initialized', attachmentId, expiresAt: '2026-10-10T00:00:00Z',
    };
    expect(nextFileRecoveryStep(initialized, true, Date.parse('2026-10-11'))).toBe('expired-reservation');
    expect(fileRecoveryNotice(initialized, true)).toContain('expired');
  });

  it('does not trust filename-only, fabricated stages or missing reservation IDs', () => {
    expect(validateFileRecoveryReference({ name: 'owner.pdf' })).toBe(false);
    expect(validateFileRecoveryReference({ ...reference, stage: 'finalized' })).toBe(false);
    expect(validateFileRecoveryReference({ ...reference, attachmentId })).toBe(false);
    expect(validateFileRecoveryReference({ ...reference, byteLength: -1 })).toBe(false);
    expect(validateFileRecoveryReference({ ...reference, sha256: 'invalid' })).toBe(false);
    expect(nextFileRecoveryStep({ ...reference, stage: 'finalized' }, true)).toBe('invalid-record');
  });
});
