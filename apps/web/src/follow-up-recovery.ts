import type { FollowUpDraft } from './capture-follow-up';
import { validateFollowUp, hasFollowUp } from './capture-follow-up';

const KEY = 'recollect:pending-follow-up-v1';
const TTL = 7 * 24 * 60 * 60 * 1000;
const MAX = 3;

export interface PendingFollowUp {
  captureId: string;
  duplicateOf: string | null;
  followUp: FollowUpDraft;
  createdAt: string;
}

function valid(value: unknown, now = Date.now()): value is PendingFollowUp {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<PendingFollowUp>;
  if (
    typeof record.captureId !== 'string' ||
    record.captureId.length < 1 ||
    record.captureId.length > 200 ||
    (record.duplicateOf !== null && typeof record.duplicateOf !== 'string') ||
    typeof record.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(record.createdAt)) ||
    Date.parse(record.createdAt) > now + 60_000 ||
    now - Date.parse(record.createdAt) >= TTL ||
    !record.followUp ||
    typeof record.followUp.project !== 'string' ||
    typeof record.followUp.reviewLocal !== 'string' ||
    !hasFollowUp(record.followUp)
  ) return false;
  const errors = validateFollowUp(record.followUp);
  return !errors.project && !errors.review_at;
}

/** Only opt-in, non-sensitive follow-up labels and instants, never originals or tokens. */
export function listPendingFollowUps(now = Date.now()): PendingFollowUp[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter((entry) => valid(entry, now)).slice(0, MAX).map((entry) => ({
      captureId: entry.captureId,
      duplicateOf: entry.duplicateOf,
      followUp: {
        project: entry.followUp.project,
        reviewLocal: entry.followUp.reviewLocal,
      },
      createdAt: entry.createdAt,
    }));
  } catch {
    return [];
  }
}

export function savePendingFollowUp(value: PendingFollowUp): void {
  if (!valid(value)) throw new Error('Invalid follow-up recovery record.');
  const others = listPendingFollowUps().filter((entry) => entry.captureId !== value.captureId);
  if (others.length >= MAX) throw new Error('Finish or discard another saved follow-up first.');
  localStorage.setItem(KEY, JSON.stringify([...others, value]));
}

export function deletePendingFollowUp(captureId: string): void {
  localStorage.setItem(KEY, JSON.stringify(
    listPendingFollowUps().filter((entry) => entry.captureId !== captureId),
  ));
}

export function clearPendingFollowUps(): void {
  localStorage.removeItem(KEY);
}
