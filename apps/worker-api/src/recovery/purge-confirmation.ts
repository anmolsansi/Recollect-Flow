import { sha256 } from '../captures/hash';
import { PURGE_CONFIRMATION_TTL_MINUTES } from './recovery.types';

export function purgeConfirmationPhrase(
  itemId: string,
  workflowId: string,
): string {
  return `PURGE ${itemId} ${workflowId}`;
}

export async function purgeConfirmationDigest(phrase: string): Promise<string> {
  return sha256(`recollectflow:purge-confirmation:v1:${phrase}`);
}

export function purgeConfirmationExpiry(now: Date): string {
  return new Date(
    now.getTime() + PURGE_CONFIRMATION_TTL_MINUTES * 60_000,
  ).toISOString();
}

export function confirmationIsActive(expiresAt: string, now: Date): boolean {
  const expiry = new Date(expiresAt).getTime();
  return Number.isFinite(expiry) && expiry > now.getTime();
}
