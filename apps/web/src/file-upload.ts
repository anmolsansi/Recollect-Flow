import { AUTH_REQUIRED_EVENT, ApiError, fetchApi } from './api';
import {
  verifyFileReselection,
  type FileRecoveryReference,
} from './capture-file-recovery';
import type { CaptureOperation } from './capture-recovery';
import type { CaptureCategory, CapturePrivacy } from './capture-model';

export const BROWSER_FILE_LIMIT = 25_000_000; // BG-17's metadata schema uses this V1 limit.

export interface UploadPolicy {
  max_size_bytes: number;
  allowed_mime_types: string[];
}
export interface UploadStatus {
  attachment_id: string;
  status:
    'pending' | 'uploaded' | 'finalized' | 'linked' | 'orphaned' | 'deleted';
  expires_at: string;
  checksum: string | null;
  size_bytes: number;
  mime_type: string;
}
export interface FileCaptureResult {
  capture_id: string;
  replayed: boolean;
  duplicate_of: string | null;
  processing_status: string;
}
interface InitResult {
  attachment_id: string;
  upload_url: string;
  expires_at: string;
}
type SaveStage =
  | 'Preparing checksum'
  | 'Initializing upload'
  | 'Uploading file'
  | 'Finalizing upload'
  | 'Saving item';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIME_IMAGE = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export async function loadUploadPolicy(): Promise<UploadPolicy> {
  const policy = await fetchApi<UploadPolicy>('/uploads/config');
  if (
    !Number.isSafeInteger(policy.max_size_bytes) ||
    policy.max_size_bytes < 1 ||
    !Array.isArray(policy.allowed_mime_types)
  )
    throw new Error('Invalid upload policy from server.');
  return policy;
}

export function validateBrowserFile(
  file: File,
  policy: UploadPolicy,
): string | null {
  if (!file.name.trim() || file.name.length > 255)
    return 'Choose a file with a valid name (up to 255 characters).';
  if (file.size < 1) return 'Choose a nonempty file.';
  if (file.size > policy.max_size_bytes)
    return (
      'File is larger than the server limit of ' +
      policy.max_size_bytes.toLocaleString() +
      ' bytes.'
    );
  if (file.size > BROWSER_FILE_LIMIT)
    return 'This browser supports one file up to 25,000,000 bytes (25 MB) for safe recovery.';
  if (!policy.allowed_mime_types.includes(file.type.toLowerCase()))
    return 'This file type is not supported. Choose a supported file.';
  return null;
}

export async function hashOriginalFile(file: File): Promise<string> {
  if (file.size < 1 || file.size > BROWSER_FILE_LIMIT)
    throw new Error('File exceeds browser checksum limits.');
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength !== file.size)
    throw new Error('File changed while reading. Reselect it.');
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export function prepareFileOperation(
  file: File,
  checksum: string,
  reason: string,
  privacy: CapturePrivacy,
  category: '' | CaptureCategory,
  key = crypto.randomUUID(),
  capturedAt = new Date().toISOString(),
): CaptureOperation {
  const attachment: FileRecoveryReference = {
    name: file.name,
    byteLength: file.size,
    sha256: checksum,
    mimeType: file.type.toLowerCase(),
    stage: 'selected',
    reservationKey: crypto.randomUUID(),
  };
  return {
    version: 1,
    id: key,
    createdAt: capturedAt,
    stage: 'prepared',
    attachment,
    payload: {
      idempotency_key: key,
      source_type: MIME_IMAGE.has(attachment.mimeType) ? 'image' : 'file',
      source_app: 'recollect-web',
      captured_at: capturedAt,
      client: { name: 'recollect-web', version: '0.0.0' },
      privacy_level: privacy,
      ...(reason ? { user_reason: reason } : {}),
      ...(category ? { quick_category: category } : {}),
    },
  };
}

export function restartExpiredUpload(
  operation: CaptureOperation,
): CaptureOperation {
  if (!operation.attachment) throw new Error('Missing file metadata.');
  // Never change the original idempotency key, timestamp or reason.
  const {
    attachmentId: _oldId,
    expiresAt: _oldExpiry,
    ...reference
  } = operation.attachment;
  void _oldId;
  void _oldExpiry;
  const { attachment_id: _oldLinkedId, ...payload } = operation.payload;
  void _oldLinkedId;
  return {
    ...operation,
    payload,
    attachment: { ...reference, stage: 'selected', reservationKey: crypto.randomUUID() },
    stage: 'prepared',
  };
}

function checkedInit(result: InitResult): InitResult {
  if (
    !UUID.test(result.attachment_id) ||
    result.upload_url !==
      '/api/v1/uploads/' + result.attachment_id + '/content' ||
    !Number.isFinite(Date.parse(result.expires_at))
  ) {
    throw new Error(
      'Invalid upload reservation from server. No bytes transferred.',
    );
  }
  return result;
}

async function uploadOriginalBytes(
  id: string,
  file: File,
  mime: string,
  signal?: AbortSignal,
): Promise<void> {
  // Never set Content-Length manually: browsers own it. Keep this URL same-origin.
  const response = await fetch('/api/v1/uploads/' + id + '/content', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': mime },
    body: file,
    signal,
  });
  if (response.ok) return;
  if (
    (response.status === 401 || response.status === 403) &&
    typeof globalThis.dispatchEvent === 'function'
  ) {
    globalThis.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
  }
  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string; code?: string };
  } | null;
  throw new ApiError(
    payload?.error?.message || 'File transfer failed.',
    response.status,
    payload?.error?.code,
  );
}

export async function runFileCapture(
  original: CaptureOperation,
  file: File | null,
  onChange: (operation: CaptureOperation, stage: SaveStage) => Promise<void>,
  signal?: AbortSignal,
): Promise<FileCaptureResult> {
  if (!original.attachment) throw new Error('Missing original file metadata.');
  let operation = original;
  let reference: FileRecoveryReference = original.attachment;
  const advance = async (
    next: FileRecoveryReference,
    stage: SaveStage,
    linked = false,
  ) => {
    reference = next;
    operation = {
      ...operation,
      stage: 'prepared',
      attachment: next,
      payload: linked
        ? { ...operation.payload, attachment_id: next.attachmentId }
        : operation.payload,
    };
    await onChange(operation, stage);
  };
  // A restored stage is never trusted as server authority. Recover unknown PUT/finalize outcomes.
  if (reference.attachmentId) {
    const state = await fetchApi<UploadStatus>(
      '/uploads/' + reference.attachmentId + '/status',
      { signal },
    );
    if (
      state.attachment_id !== reference.attachmentId ||
      state.size_bytes !== reference.byteLength ||
      state.mime_type !== reference.mimeType ||
      (state.checksum && state.checksum !== reference.sha256)
    ) {
      throw new Error(
        'Server upload metadata does not match this file. Cannot resume.',
      );
    }
    if (['orphaned', 'deleted'].includes(state.status))
      throw new Error(
        'The previous reservation is no longer available. Start a deliberate replacement upload.',
      );
    if (
      state.status !== 'linked' &&
      Date.parse(state.expires_at) <= Date.now()
    ) {
      throw new ApiError(
        'UPLOAD_EXPIRED: Previous reservation expired. Select Restart expired upload.',
        409,
        'UPLOAD_EXPIRED',
      );
    }
    const resumedStage =
      state.status === 'pending'
        ? 'initialized'
        : state.status === 'uploaded'
          ? 'uploaded'
          : 'finalized';
    await advance(
      { ...reference, stage: resumedStage, expiresAt: state.expires_at },
      resumedStage === 'finalized' ? 'Saving item' : 'Finalizing upload',
      resumedStage === 'finalized',
    );
  }
  if (reference.stage === 'selected' || reference.stage === 'initialized') {
    if (!file)
      throw new Error(
        'Reselect the original file to resume. Original bytes were not stored.',
      );
    const matching = await verifyFileReselection(reference, file);
    if (!matching)
      throw new Error(
        'This file does not match the original SHA-256. Choose the original file.',
      );
  }
  if (reference.stage === 'selected') {
    await onChange(operation, 'Initializing upload');
    const init = checkedInit(
      await fetchApi<InitResult>('/uploads/init', {
        method: 'POST',
        body: JSON.stringify({
          attachment_id: reference.reservationKey ?? operation.id,
          filename: reference.name,
          mime_type: reference.mimeType,
          size_bytes: reference.byteLength,
          content_hash: reference.sha256,
          source_type: MIME_IMAGE.has(reference.mimeType)
            ? 'image'
            : reference.mimeType.startsWith('audio/')
              ? 'audio'
              : 'file',
        }),
        signal,
      }),
    );
    if (init.attachment_id !== (reference.reservationKey ?? operation.id)) {
      throw new Error('Server did not confirm the original reservation identity.');
    }
    await advance(
      {
        ...reference,
        stage: 'initialized',
        attachmentId: init.attachment_id,
        expiresAt: init.expires_at,
      },
      'Uploading file',
    );
  }
  if (reference.stage === 'initialized') {
    await onChange(operation, 'Uploading file');
    await uploadOriginalBytes(
      reference.attachmentId!,
      file!,
      reference.mimeType,
      signal,
    );
    await advance({ ...reference, stage: 'uploaded' }, 'Finalizing upload');
  }
  if (reference.stage === 'uploaded') {
    await onChange(operation, 'Finalizing upload');
    const finalized = await fetchApi<{
      status: string;
      attachment_id: string;
      checksum: string;
    }>('/uploads/' + reference.attachmentId + '/finalize', {
      method: 'POST',
      body: JSON.stringify({ checksum: reference.sha256 }),
      signal,
    });
    if (
      finalized.status !== 'finalized' ||
      finalized.attachment_id !== reference.attachmentId ||
      finalized.checksum !== reference.sha256
    )
      throw new Error('Finalization did not confirm original file integrity.');
    await advance({ ...reference, stage: 'finalized' }, 'Saving item', true);
  }
  if (reference.stage !== 'finalized' || !operation.payload.attachment_id)
    throw new Error('Cannot save a capture before the file is finalized.');
  await onChange(operation, 'Saving item');
  return fetchApi<FileCaptureResult>('/captures', {
    method: 'POST',
    body: JSON.stringify(operation.payload),
    signal,
  });
}
