import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { verifyRecoveryBundle } from './recovery-bundle.mjs';

const roots = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'bg28-bundle-'));
  roots.push(root);
  const objectsDir = path.join(root, 'independent-objects');
  const objectKey = 'uploads/synthetic/original.pdf';
  await mkdir(path.join(objectsDir, 'uploads', 'synthetic'), {
    recursive: true,
  });
  const bytes = Buffer.from('a synthetic original for a recovery audit');
  await writeFile(path.join(objectsDir, objectKey), bytes);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const exportFile = path.join(root, 'portable.json');
  const receiptsFile = path.join(root, 'independent-receipts.json');
  const envelope = {
    format: 'recollectflow-portable-export',
    schemaVersion: '2026-09-19.1',
    generatedAt: '2026-10-16T00:00:00.000Z',
    itemCount: 1,
    items: [
      {
        item: { id: 'synthetic-item' },
        attachments: [
          {
            id: 'synthetic-attachment',
        item_id: 'synthetic-item',
            object_key: objectKey,
            status: 'linked',
            size_bytes: bytes.byteLength,
            content_hash: sha256,
          },
        ],
      },
    ],
    purgeReceipts: [],
    disclosures: {
      attachmentBytesIncluded: false,
      credentialsIncluded: false,
      ownerControlledCopiesOutsideRemoteDeletion: true,
    },
  };
  await writeFile(exportFile, JSON.stringify(envelope));
  await writeFile(receiptsFile, '[]');
  return { root, objectsDir, objectKey, exportFile, receiptsFile, envelope };
}

test('independent originals match portable references and hashes', async () => {
  const input = await fixture();
  const audit = await verifyRecoveryBundle(input);
  assert.equal(audit.verifiedObjectCount, 1);
  assert.equal(audit.itemCount, 1);
  assert.equal(audit.skippedPurgedItemCount, 0);
  assert.match(audit.objects[0].sha256, /^[a-f0-9]{64}$/);
});

test('missing and modified original bytes fail instead of reporting success', async () => {
  const input = await fixture();
  await writeFile(path.join(input.objectsDir, input.objectKey), 'changed');
  await assert.rejects(verifyRecoveryBundle(input), /ATTACHMENT_SIZE_MISMATCH/);
  await rm(path.join(input.objectsDir, input.objectKey));
  await assert.rejects(verifyRecoveryBundle(input), /ENOENT/);
});

test('correct-length tampering is caught by the checksum', async () => {
  const input = await fixture();
  const original = await readFile(path.join(input.objectsDir, input.objectKey));
  await writeFile(
    path.join(input.objectsDir, input.objectKey),
    Buffer.alloc(original.length, 0),
  );
  await assert.rejects(verifyRecoveryBundle(input), /ATTACHMENT_HASH_MISMATCH/);
});

test('new independent purge receipt excludes old original bytes from required restore set', async () => {
  const input = await fixture();
  const receipt = {
    itemId: 'synthetic-item',
    purgeRequestId: 'synthetic-purge',
    purgedAt: '2026-10-16T01:00:00.000Z',
    receiptVersion: 'v1',
    backupRetentionUntil: null,
  };
  await writeFile(input.receiptsFile, JSON.stringify([receipt]));
  await rm(path.join(input.objectsDir, input.objectKey));
  const audit = await verifyRecoveryBundle(input);
  assert.equal(audit.skippedPurgedItemCount, 1);
  assert.equal(audit.verifiedObjectCount, 0);
});

test('independent receipt ledger may not omit older archived receipts', async () => {
  const input = await fixture();
  input.envelope.purgeReceipts.push({
    itemId: 'previously-purged',
    purgeRequestId: 'synthetic-purge',
    purgedAt: '2026-10-15T00:00:00.000Z',
    receiptVersion: 'v1',
    backupRetentionUntil: null,
  });
  await writeFile(input.exportFile, JSON.stringify(input.envelope));
  await assert.rejects(verifyRecoveryBundle(input), /PURGE_LEDGER_INCOMPLETE/);
});

test('path traversal references are rejected', async () => {
  const input = await fixture();
  input.envelope.items[0].attachments[0].object_key = '../escape.pdf';
  await writeFile(input.exportFile, JSON.stringify(input.envelope));
  await assert.rejects(verifyRecoveryBundle(input), /UNSAFE_OBJECT_KEY/);
});

test('owner boundary rejects attachments belonging to a different item', async () => {
  const input = await fixture();
  input.envelope.items[0].attachments[0].item_id = 'different-item';
  await writeFile(input.exportFile, JSON.stringify(input.envelope));
  await assert.rejects(
    verifyRecoveryBundle(input),
    /ATTACHMENT_INTEGRITY_METADATA_MISSING/,
  );
});

test('pending originals need no independent byte copy', async () => {
  const input = await fixture();
  input.envelope.items[0].attachments[0].status = 'pending';
  await writeFile(input.exportFile, JSON.stringify(input.envelope));
  await rm(path.join(input.objectsDir, input.objectKey));
  const audit = await verifyRecoveryBundle(input);
  assert.equal(audit.verifiedObjectCount, 0);
});

test('duplicate R2 object keys across portable attachments are rejected', async () => {
  const input = await fixture();
  input.envelope.items[0].attachments.push({
    ...input.envelope.items[0].attachments[0],
    id: 'different-attachment',
  });
  await writeFile(input.exportFile, JSON.stringify(input.envelope));
  await assert.rejects(
    verifyRecoveryBundle(input),
    /DUPLICATE_OBJECT_KEY/,
  );
});
