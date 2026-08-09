import { sha256 } from '../captures/hash';
import type { PurgeReceiptRecord } from './recovery.types';

const RECEIPT_PREFIX = 'purge-receipts/v1/';

function receiptObjectKey(itemId: string): string {
  return `${RECEIPT_PREFIX}${encodeURIComponent(itemId)}.json`;
}

function parseReceipt(value: unknown): PurgeReceiptRecord {
  if (!value || typeof value !== 'object') throw new Error('PURGE_LEDGER_INVALID');
  const source = value as Record<string, unknown>;
  if (
    typeof source.itemId !== 'string' ||
    typeof source.purgeRequestId !== 'string' ||
    typeof source.purgedAt !== 'string' ||
    typeof source.receiptVersion !== 'string' ||
    !(
      source.backupRetentionUntil === null ||
      typeof source.backupRetentionUntil === 'string'
    )
  ) {
    throw new Error('PURGE_LEDGER_INVALID');
  }
  return {
    itemId: source.itemId,
    purgeRequestId: source.purgeRequestId,
    purgedAt: source.purgedAt,
    receiptVersion: source.receiptVersion,
    backupRetentionUntil: source.backupRetentionUntil,
  };
}

export async function mirrorPurgeReceipt(
  bucket: R2Bucket,
  receipt: PurgeReceiptRecord,
): Promise<void> {
  const serialized = JSON.stringify(receipt);
  const digest = await sha256(serialized);
  await bucket.put(receiptObjectKey(receipt.itemId), serialized, {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      receiptVersion: receipt.receiptVersion,
      sha256: digest,
    },
  });
}

export async function loadPurgeReceiptLedger(
  bucket: R2Bucket,
): Promise<PurgeReceiptRecord[]> {
  const receipts: PurgeReceiptRecord[] = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix: RECEIPT_PREFIX, cursor });
    for (const object of page.objects) {
      const stored = await bucket.get(object.key);
      if (!stored) throw new Error('PURGE_LEDGER_OBJECT_MISSING');
      const serialized = await stored.text();
      const expectedDigest = stored.customMetadata?.sha256;
      if (expectedDigest && (await sha256(serialized)) !== expectedDigest) {
        throw new Error('PURGE_LEDGER_HASH_MISMATCH');
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(serialized);
      } catch {
        throw new Error('PURGE_LEDGER_INVALID');
      }
      receipts.push(parseReceipt(parsed));
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return receipts.sort((left, right) =>
    left.itemId < right.itemId ? -1 : left.itemId > right.itemId ? 1 : 0,
  );
}
