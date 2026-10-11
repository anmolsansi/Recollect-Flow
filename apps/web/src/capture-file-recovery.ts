/**
 * BG-17 recovery policy for a future browser file submission (BG-18 supplies
 * the UI and upload protocol). Never store File, Blob or raw bytes in recovery.
 */
export interface FileRecoveryReference {
  name: string;
  byteLength: number;
  sha256: string;
  mimeType: string;
  stage: 'selected' | 'initialized' | 'uploaded' | 'finalized';
  // Stable per-upload-attempt identifier, rotated only on deliberate restart.
  reservationKey?: string;
  attachmentId?: string;
  expiresAt?: string;
}

type ReselectedFile = Pick<File, 'name' | 'size' | 'arrayBuffer'>;

export type FileRecoveryDecision =
  | 'reselect-file'
  | 'initialize-deliberately'
  | 'upload-existing'
  | 'finalize-existing'
  | 'capture-with-finalized-id'
  | 'expired-reservation'
  | 'invalid-record';

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const UUID_PATTERN =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function validateFileRecoveryReference(
  value: unknown,
): value is FileRecoveryReference {
  if (!value || typeof value !== 'object') return false;
  const ref = value as Record<string, unknown>;
  if (
    typeof ref.name !== 'string' ||
    !ref.name.trim() ||
    ref.name.length > 255 ||
    typeof ref.byteLength !== 'number' ||
    !Number.isSafeInteger(ref.byteLength) ||
    ref.byteLength < 1 ||
    ref.byteLength > 25_000_000 ||
    typeof ref.sha256 !== 'string' ||
    !HASH_PATTERN.test(ref.sha256) ||
    typeof ref.mimeType !== 'string' ||
    ref.mimeType.length > 255 ||
    !['selected', 'initialized', 'uploaded', 'finalized'].includes(
      String(ref.stage),
    )
  )
    return false;
  if (ref.reservationKey !== undefined &&
      (typeof ref.reservationKey !== 'string' ||
       !UUID_PATTERN.test(ref.reservationKey))) return false;
  if (
    ref.attachmentId !== undefined &&
    (typeof ref.attachmentId !== 'string' ||
      !UUID_PATTERN.test(ref.attachmentId))
  )
    return false;
  if (
    ref.expiresAt !== undefined &&
    (typeof ref.expiresAt !== 'string' ||
      !Number.isFinite(Date.parse(ref.expiresAt)))
  )
    return false;
  // Stage and server-issued data must agree, or the caller could skip upload.
  if (ref.stage !== 'selected' && (!ref.attachmentId || !ref.expiresAt))
    return false;
  if (ref.stage === 'selected' && (ref.attachmentId || ref.expiresAt))
    return false;
  return true;
}

export function nextFileRecoveryStep(
  reference: FileRecoveryReference,
  hasVerifiedReselection: boolean,
  now = Date.now(),
): FileRecoveryDecision {
  if (!validateFileRecoveryReference(reference)) return 'invalid-record';
  if (
    reference.stage !== 'selected' &&
    Date.parse(reference.expiresAt!) <= now
  ) {
    return 'expired-reservation';
  }
  if (reference.stage === 'finalized') return 'capture-with-finalized-id';
  if (reference.stage === 'uploaded') return 'finalize-existing';
  if (!hasVerifiedReselection) return 'reselect-file';
  return reference.stage === 'selected'
    ? 'initialize-deliberately'
    : 'upload-existing';
}

/** Re-hash the bytes, not the displayed filename. A changed file is never
 * silently submitted under the old logical operation key.
 */
export async function verifyFileReselection(
  reference: FileRecoveryReference,
  candidate: ReselectedFile,
): Promise<boolean> {
  if (
    !validateFileRecoveryReference(reference) ||
    candidate.size !== reference.byteLength ||
    candidate.name !== reference.name
  )
    return false;
  const bytes = await candidate.arrayBuffer();
  if (bytes.byteLength !== reference.byteLength) return false;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest), (part) =>
    part.toString(16).padStart(2, '0'),
  ).join('');
  return hash === reference.sha256;
}

/** The serialized recovery record is metadata-only. */
export function fileRecoveryNotice(
  reference: FileRecoveryReference,
  verifiedReselection: boolean,
): string {
  const decision = nextFileRecoveryStep(reference, verifiedReselection);
  switch (decision) {
    case 'reselect-file':
      return 'The file name was retained, not the bytes. Reselect the original file to verify its SHA-256 before retrying.';
    case 'expired-reservation':
      return 'The previous server upload reservation expired. A deliberate new upload will be needed after BG-18 adds the file flow.';
    case 'initialize-deliberately':
      return 'The original bytes match. File upload initialization requires an explicit owner action in BG-18.';
    case 'upload-existing':
      return 'The matching file is verified. Resume the original permitted upload, not a new attachment initialization.';
    case 'finalize-existing':
      return 'The server uploaded the bytes. Continue finalization using the original attachment ID.';
    case 'capture-with-finalized-id':
      return 'The server finalized this attachment. Retry the capture using its original attachment ID and idempotency key.';
    default:
      return 'This stored file record is invalid. Do not attempt automatic upload or claim success.';
  }
}
