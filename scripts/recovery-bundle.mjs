/**
 * BG-28 independent recovery-bundle audit. Run only on already downloaded,
 * operator-owned copies. This script does not access Cloudflare or mutate data.
 */
import { createHash } from 'node:crypto';
import { readFile, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FORMAT = 'recollectflow-portable-export';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function safeObjectPath(root, objectKey) {
  assert(
    typeof objectKey === 'string' &&
      objectKey.length > 0 &&
      !objectKey.startsWith('/') &&
      !objectKey.includes('\\') &&
      objectKey.split('/').every((part) => part && part !== '.' && part !== '..'),
    'UNSAFE_OBJECT_KEY',
  );
  const location = path.resolve(root, ...objectKey.split('/'));
  assert(path.relative(root, location) && !path.relative(root, location).startsWith('..'), 'UNSAFE_OBJECT_KEY');
  return location;
}

function newestPurgeReceipts(receipts) {
  assert(Array.isArray(receipts), 'PURGE_LEDGER_INVALID');
  const result = new Map();
  for (const receipt of receipts) {
    assert(
      receipt &&
        typeof receipt.itemId === 'string' &&
        receipt.itemId.length > 0 &&
        typeof receipt.purgeRequestId === 'string' &&
        typeof receipt.purgedAt === 'string' &&
        !Number.isNaN(Date.parse(receipt.purgedAt)) &&
        typeof receipt.receiptVersion === 'string',
      'PURGE_LEDGER_INVALID',
    );
    const prior = result.get(receipt.itemId);
    if (!prior || prior.purgedAt < receipt.purgedAt) result.set(receipt.itemId, receipt);
  }
  return result;
}

export async function verifyRecoveryBundle({ exportFile, objectsDir, receiptsFile }) {
  const envelope = JSON.parse(await readFile(exportFile, 'utf8'));
  assert(envelope.format === FORMAT, 'EXPORT_FORMAT_INVALID');
  assert(typeof envelope.schemaVersion === 'string', 'EXPORT_VERSION_MISSING');
  assert(Array.isArray(envelope.items), 'EXPORT_ITEMS_INVALID');
  assert(envelope.itemCount === envelope.items.length, 'EXPORT_COUNT_MISMATCH');
  assert(
    envelope.disclosures?.attachmentBytesIncluded === false &&
      envelope.disclosures?.credentialsIncluded === false,
    'EXPORT_DISCLOSURE_INVALID',
  );

  // The separate ledger must come from the independent saved receipt objects,
  // never from the same historical export being tested.
  const external = newestPurgeReceipts(JSON.parse(await readFile(receiptsFile, 'utf8')));
  const archived = newestPurgeReceipts(envelope.purgeReceipts);
  for (const id of archived.keys()) {
    assert(external.has(id), 'PURGE_LEDGER_INCOMPLETE');
  }

  const root = await realpath(objectsDir);
  const manifest = [];
  let skippedPurged = 0;
  const seenItemIds = new Set();
  for (const entry of envelope.items) {
    const itemId = entry?.item?.id;
    assert(typeof itemId === 'string' && itemId && !seenItemIds.has(itemId), 'EXPORT_ITEM_ID_INVALID');
    seenItemIds.add(itemId);
    if (external.has(itemId)) {
      skippedPurged += 1;
      continue;
    }
    assert(Array.isArray(entry.attachments), 'EXPORT_ATTACHMENTS_INVALID');
    for (const attachment of entry.attachments) {
      if (attachment.status === 'deleted') continue;
      const key = attachment.object_key;
      const expectedHash = attachment.content_hash;
      const size = attachment.size_bytes;
      assert(
        typeof attachment.id === 'string' &&
          /^[a-f0-9]{64}$/i.test(expectedHash) &&
          Number.isSafeInteger(size) &&
          size >= 0,
        'ATTACHMENT_INTEGRITY_METADATA_MISSING',
      );
      const location = safeObjectPath(root, key);
      // A copied object must be an ordinary file inside the selected root.
      const canonical = await realpath(location);
      const rel = path.relative(root, canonical);
      assert(rel && !rel.startsWith('..') && !path.isAbsolute(rel), 'UNSAFE_OBJECT_PATH');
      const info = await stat(canonical);
      assert(info.isFile(), 'OBJECT_NOT_FILE');
      assert(info.size === size, 'ATTACHMENT_SIZE_MISMATCH');
      const digest = createHash('sha256').update(await readFile(canonical)).digest('hex');
      assert(digest.toLowerCase() === expectedHash.toLowerCase(), 'ATTACHMENT_HASH_MISMATCH');
      manifest.push({
        itemId,
        attachmentId: attachment.id,
        objectKey: key,
        sizeBytes: size,
        sha256: digest,
      });
    }
  }
  manifest.sort((a, b) => a.objectKey.localeCompare(b.objectKey));
  return {
    format: 'recollectflow-recovery-manifest-v1',
    schemaVersion: envelope.schemaVersion,
    itemCount: envelope.itemCount,
    skippedPurgedItemCount: skippedPurged,
    independentPurgeReceiptCount: external.size,
    verifiedObjectCount: manifest.length,
    verifiedByteCount: manifest.reduce((sum, object) => sum + object.sizeBytes, 0),
    objects: manifest,
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const [exportFile, objectsDir, receiptsFile, manifestFile] = process.argv.slice(2);
  if (!exportFile || !objectsDir || !receiptsFile || !manifestFile) {
    console.error(
      'Usage: node scripts/recovery-bundle.mjs <export.json> <independent-objects-dir> <independent-purge-receipts.json> <manifest.json>',
    );
    process.exitCode = 2;
  } else {
    try {
      const manifest = await verifyRecoveryBundle({
        exportFile,
        objectsDir,
        receiptsFile,
      });
      await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n', {
        flag: 'wx',
        mode: 0o600,
      });
      console.log(
        JSON.stringify({
          checked: manifest.verifiedObjectCount,
          bytes: manifest.verifiedByteCount,
          skippedPurged: manifest.skippedPurgedItemCount,
          manifestFile,
        }),
      );
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'RECOVERY_BUNDLE_FAILED');
      process.exitCode = 1;
    }
  }
}
