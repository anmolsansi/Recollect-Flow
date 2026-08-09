import { AppError } from '../shared/errors';
import type { PortableItemExport } from './export.types';
import type { PortableRestoreEnvelope } from './restore.schema';
import {
  PORTABLE_EXPORT_VERSION,
  type PurgeReceiptRecord,
} from './recovery.types';

export interface RestorePlan {
  items: PortableItemExport[];
  purgeReceipts: PurgeReceiptRecord[];
  skippedPurgedItemIds: string[];
}

export function mergePurgeReceipts(
  ...ledgers: readonly PurgeReceiptRecord[][]
): PurgeReceiptRecord[] {
  const latest = new Map<string, PurgeReceiptRecord>();
  for (const ledger of ledgers) {
    for (const receipt of ledger) {
      const current = latest.get(receipt.itemId);
      if (!current || receipt.purgedAt > current.purgedAt) {
        latest.set(receipt.itemId, receipt);
      }
    }
  }
  return [...latest.values()].sort((left, right) =>
    left.itemId < right.itemId ? -1 : left.itemId > right.itemId ? 1 : 0,
  );
}

export function buildRestorePlan(
  envelope: PortableRestoreEnvelope,
  currentReceipts: PurgeReceiptRecord[] = [],
  receiptOverlay: PurgeReceiptRecord[] = [],
): RestorePlan {
  if (envelope.schemaVersion !== PORTABLE_EXPORT_VERSION) {
    throw new AppError(
      422,
      'UNSUPPORTED_EXPORT_VERSION',
      `Restore supports portable export ${PORTABLE_EXPORT_VERSION}.`,
    );
  }

  const purgeReceipts = mergePurgeReceipts(
    envelope.purgeReceipts,
    currentReceipts,
    receiptOverlay,
  );
  const purged = new Set(purgeReceipts.map((receipt) => receipt.itemId));
  const items: PortableItemExport[] = [];
  const skippedPurgedItemIds: string[] = [];
  for (const item of envelope.items as PortableItemExport[]) {
    const itemId = item.item.id;
    if (typeof itemId === 'string' && purged.has(itemId)) {
      skippedPurgedItemIds.push(itemId);
    } else {
      items.push(item);
    }
  }
  return { items, purgeReceipts, skippedPurgedItemIds };
}
