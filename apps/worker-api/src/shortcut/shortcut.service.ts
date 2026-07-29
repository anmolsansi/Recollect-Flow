import type {
  AttachmentRepository,
  StoredAttachment,
} from '../attachments/attachment.repository';
import { positiveInteger, safeFilename } from '../attachments/attachment.utils';
import {
  ALLOWED_CONTENT_TYPES,
  normalizeContentType,
  signatureMatches,
} from '../attachments/attachment.validation';
import { sha256, sha256Bytes } from '../captures/hash';
import type {
  CaptureRepository,
  StoredCapture,
} from '../captures/capture.repository';
import type { CaptureInput } from '../captures/capture.schema';
import { CaptureService } from '../captures/capture.service';
import { AppError } from '../shared/errors';
import type { ShortcutMetadata } from './shortcut.schema';

const MAX_TEXT_BYTES = 100_000;

export interface ShortcutSaveResult {
  capture: StoredCapture;
  replayed: boolean;
  attachmentId?: string;
}

interface PreparedShortcutCapture {
  input: CaptureInput;
  fingerprint: string;
  file?: {
    bytes: ArrayBuffer;
    contentType: string;
    filename: string;
    hash: string;
  };
}

function requireHttpUrl(value: string): string {
  if (value.length > 2_048) {
    throw new AppError(422, 'VALIDATION_ERROR', 'The URL is too long.');
  }
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    return parsed.toString();
  } catch {
    throw new AppError(
      422,
      'VALIDATION_ERROR',
      'The shared value is not a valid HTTP or HTTPS URL.',
    );
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

async function readTextContent(content: FormDataEntryValue): Promise<string> {
  if (typeof content === 'string') return content;
  if (content.size > MAX_TEXT_BYTES) {
    throw new AppError(413, 'TEXT_TOO_LARGE', 'Shared text is too large.');
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(
      await content.arrayBuffer(),
    );
  } catch {
    throw new AppError(
      422,
      'INVALID_TEXT',
      'The queued text file is not valid UTF-8.',
    );
  }
}

function requireText(value: string): string {
  const bytes = new TextEncoder().encode(value);
  if (bytes.byteLength > MAX_TEXT_BYTES) {
    throw new AppError(413, 'TEXT_TOO_LARGE', 'Shared text is too large.');
  }
  if (value.trim().length === 0) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Shared text cannot be empty.');
  }
  return value;
}

async function fingerprint(value: Record<string, unknown>): Promise<string> {
  return sha256(JSON.stringify(value));
}

export async function prepareShortcutCapture(
  metadata: ShortcutMetadata,
  content: FormDataEntryValue,
  maximumAttachmentBytes = 25_000_000,
): Promise<PreparedShortcutCapture> {
  const capturedAt = new Date().toISOString();
  const common = {
    idempotency_key: metadata.idempotency_key,
    source_app: 'iOS Share Sheet',
    user_reason: metadata.user_reason?.trim() || undefined,
    privacy_level: metadata.privacy_level,
    captured_at: capturedAt,
    client: { name: 'ios-shortcut', version: metadata.client_version },
  } as const;

  let kind = metadata.kind_hint;
  if (kind === 'auto') {
    kind =
      typeof content === 'string'
        ? isHttpUrl(content.trim())
          ? 'url'
          : 'text'
        : 'attachment';
  }

  if (kind === 'url') {
    const url = requireHttpUrl((await readTextContent(content)).trim());
    const input: CaptureInput = {
      ...common,
      source_type: 'url',
      url,
    };
    return {
      input,
      fingerprint: await fingerprint({
        idempotency_key: metadata.idempotency_key,
        kind,
        url,
        user_reason: common.user_reason ?? null,
        privacy_level: common.privacy_level,
      }),
    };
  }

  if (kind === 'text') {
    const sharedText = requireText(await readTextContent(content));
    const input: CaptureInput = {
      ...common,
      source_type: 'text',
      shared_text: sharedText,
    };
    return {
      input,
      fingerprint: await fingerprint({
        idempotency_key: metadata.idempotency_key,
        kind,
        shared_text: sharedText,
        user_reason: common.user_reason ?? null,
        privacy_level: common.privacy_level,
      }),
    };
  }

  if (typeof content === 'string') {
    throw new AppError(
      422,
      'FILE_REQUIRED',
      'An attachment capture requires a file.',
    );
  }

  if (content.size > maximumAttachmentBytes) {
    throw new AppError(
      413,
      'FILE_TOO_LARGE',
      'File exceeds the configured limit.',
    );
  }
  const contentType = normalizeContentType(content.type);
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new AppError(422, 'UNSUPPORTED_TYPE', 'File type is not allowed.');
  }
  const bytes = await content.arrayBuffer();
  if (!signatureMatches(bytes, contentType)) {
    throw new AppError(
      422,
      'WRONG_SIGNATURE',
      'File signature does not match its MIME type.',
    );
  }
  const hash = await sha256Bytes(bytes);
  const sourceType = contentType.startsWith('image/') ? 'image' : 'file';
  const input: CaptureInput = {
    ...common,
    source_type: sourceType,
    attachment_id: crypto.randomUUID(),
  };
  return {
    input,
    fingerprint: await fingerprint({
      idempotency_key: metadata.idempotency_key,
      kind: 'attachment',
      content_type: contentType,
      size_bytes: bytes.byteLength,
      content_hash: hash,
      user_reason: common.user_reason ?? null,
      privacy_level: common.privacy_level,
    }),
    file: {
      bytes,
      contentType,
      filename: safeFilename(content.name),
      hash,
    },
  };
}

export class ShortcutCaptureService {
  private readonly captureService: CaptureService;

  constructor(
    private readonly captures: CaptureRepository,
    private readonly attachments: AttachmentRepository,
    private readonly bucket: R2Bucket,
    private readonly maxAttachmentBytes: string | undefined,
    private readonly uploadTtlSeconds: string | undefined,
  ) {
    this.captureService = new CaptureService(captures);
  }

  private requireReplayMatch(
    existing: StoredCapture,
    requestFingerprint: string,
  ): ShortcutSaveResult {
    if (
      existing.requestFingerprint &&
      existing.requestFingerprint !== requestFingerprint
    ) {
      throw new AppError(
        409,
        'IDEMPOTENCY_CONFLICT',
        'The idempotency key was already used for different content.',
      );
    }
    return { capture: existing, replayed: true };
  }

  private async discard(attachment: StoredAttachment): Promise<void> {
    const at = new Date().toISOString();
    try {
      await this.bucket.delete(attachment.r2Key);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'shortcut.attachment_cleanup_failed',
          attachment_id: attachment.id,
          error,
        }),
      );
    }
    try {
      await this.attachments.markOrphaned(attachment.id, at);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'shortcut.attachment_mark_orphaned_failed',
          attachment_id: attachment.id,
          error,
        }),
      );
    }
  }

  async save(prepared: PreparedShortcutCapture): Promise<ShortcutSaveResult> {
    if (
      prepared.file &&
      prepared.file.bytes.byteLength >
        positiveInteger(this.maxAttachmentBytes, 25_000_000)
    ) {
      throw new AppError(
        413,
        'FILE_TOO_LARGE',
        'File exceeds the configured limit.',
      );
    }

    const existing = await this.captures.findByIdempotencyKey(
      prepared.input.idempotency_key,
    );
    if (existing)
      return this.requireReplayMatch(existing, prepared.fingerprint);

    if (!prepared.file) {
      return this.captureService.save(prepared.input, prepared.fingerprint);
    }

    const now = new Date();
    const attachmentId = prepared.input.attachment_id!;
    const attachment = await this.attachments.create({
      id: attachmentId,
      r2Key: `private/${now.getUTCFullYear()}/${attachmentId}`,
      fileName: prepared.file.filename,
      declaredContentType: prepared.file.contentType,
      sizeBytes: prepared.file.bytes.byteLength,
      contentHash: prepared.file.hash,
      expiresAt: new Date(
        now.getTime() + positiveInteger(this.uploadTtlSeconds, 3_600) * 1_000,
      ).toISOString(),
      createdAt: now.toISOString(),
    });

    try {
      await this.bucket.put(attachment.r2Key, prepared.file.bytes, {
        httpMetadata: { contentType: prepared.file.contentType },
        customMetadata: {
          attachmentId,
          sha256: prepared.file.hash,
          expiresAt: attachment.expiresAt,
        },
      });
      const stored = await this.bucket.head(attachment.r2Key);
      if (
        !stored ||
        stored.size !== prepared.file.bytes.byteLength ||
        stored.httpMetadata?.contentType !== prepared.file.contentType ||
        stored.customMetadata?.sha256 !== prepared.file.hash
      ) {
        throw new AppError(
          503,
          'STORAGE_UNAVAILABLE',
          'The attachment could not be verified. Retry with the same idempotency key.',
        );
      }
      const uploadedAt = new Date().toISOString();
      await this.attachments.markUploaded(
        attachmentId,
        prepared.file.hash,
        prepared.file.contentType,
        uploadedAt,
      );
      await this.attachments.markFinalized(attachmentId, uploadedAt);

      const result = await this.captureService.save(
        prepared.input,
        prepared.fingerprint,
      );
      if (result.replayed) await this.discard(attachment);
      return {
        ...result,
        attachmentId: result.replayed ? undefined : attachmentId,
      };
    } catch (error) {
      await this.discard(attachment);
      if (error instanceof AppError) throw error;
      console.error(
        JSON.stringify({
          event: 'shortcut.attachment_save_failed',
          attachment_id: attachment.id,
          error,
        }),
      );
      throw new AppError(
        503,
        'STORAGE_UNAVAILABLE',
        'The attachment could not be saved. Retry with the same idempotency key.',
      );
    }
  }
}
