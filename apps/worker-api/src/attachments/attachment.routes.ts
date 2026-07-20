import { Hono } from 'hono';

import { sha256Bytes } from '../captures/hash';
import type { AppContext } from '../env';
import { requireAdminToken, requireCaptureToken } from '../shared/auth';
import { AppError } from '../shared/errors';
import { D1AttachmentRepository } from './attachment.repository';
import type { AttachmentRepository } from './attachment.repository';
import {
  AttachmentFinalizeInputSchema,
  AttachmentInitInputSchema,
} from './attachment.schema';
import {
  ALLOWED_CONTENT_TYPES,
  normalizeContentType,
  signatureMatches,
} from './attachment.validation';

export function attachmentRoutes(
  repositoryFactory: (env: Cloudflare.Env) => AttachmentRepository = (env) =>
    new D1AttachmentRepository(env.DB),
) {
  const router = new Hono<AppContext>();

  router.use('/uploads/*', requireCaptureToken);
  router.use('/attachments/*', requireCaptureToken);

  function positiveInteger(
    value: string | undefined,
    fallback: number,
  ): number {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  function safeFilename(value: string): string {
    return value.replace(/[\r\n"\\/]/g, '_').slice(0, 255);
  }

  router.post('/uploads/init', async (context) => {
    const body = await context.req.json().catch(() => {
      throw new AppError(400, 'INVALID_JSON', 'Invalid JSON body.');
    });
    const parsed = AttachmentInitInputSchema.safeParse(body);
    if (!parsed.success) {
      const fields = Object.fromEntries(
        parsed.error.issues.map((issue) => [
          issue.path.join('.') || 'body',
          issue.message,
        ]),
      );
      throw new AppError(422, 'VALIDATION_ERROR', 'Validation failed.', fields);
    }

    const contentType = normalizeContentType(parsed.data.mime_type);
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw new AppError(422, 'UNSUPPORTED_TYPE', 'File type is not allowed.');
    }
    const maximumBytes = positiveInteger(
      context.env.MAX_ATTACHMENT_BYTES,
      25_000_000,
    );
    if (parsed.data.size_bytes > maximumBytes) {
      throw new AppError(
        413,
        'FILE_TOO_LARGE',
        'File exceeds the configured limit.',
      );
    }

    const now = new Date();
    const ttlSeconds = positiveInteger(context.env.UPLOAD_TTL_SECONDS, 3600);
    const id = crypto.randomUUID();
    const created = await repositoryFactory(context.env).create({
      id,
      r2Key: `private/${now.getUTCFullYear()}/${id}`,
      fileName: safeFilename(parsed.data.filename),
      declaredContentType: contentType,
      sizeBytes: parsed.data.size_bytes,
      contentHash: parsed.data.content_hash?.toLowerCase(),
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
      createdAt: now.toISOString(),
    });

    return context.json(
      {
        data: {
          attachment_id: created.id,
          upload_url: `/api/v1/uploads/${created.id}/content`,
          expires_at: created.expiresAt,
          allowed_headers: ['Authorization', 'Content-Type', 'Content-Length'],
        },
        meta: { request_id: context.get('requestId') },
      },
      201,
    );
  });

  router.put('/uploads/:id/content', async (context) => {
    const repository = repositoryFactory(context.env);
    const attachment = await repository.findById(context.req.param('id'));
    if (!attachment)
      throw new AppError(404, 'NOT_FOUND', 'Attachment not found.');
    if (attachment.status !== 'pending') {
      throw new AppError(409, 'CONFLICT', 'Attachment is not pending.');
    }
    const now = new Date().toISOString();
    if (attachment.expiresAt <= now) {
      throw new AppError(409, 'UPLOAD_EXPIRED', 'Attachment upload expired.');
    }

    const requestType = normalizeContentType(
      context.req.header('Content-Type') ?? '',
    );
    if (requestType !== attachment.declaredContentType) {
      throw new AppError(
        422,
        'UNSUPPORTED_TYPE',
        'Content-Type does not match init.',
      );
    }
    const declaredLength = Number(context.req.header('Content-Length'));
    if (
      !Number.isSafeInteger(declaredLength) ||
      declaredLength !== attachment.sizeBytes
    ) {
      throw new AppError(
        422,
        'WRONG_SIZE',
        'Content-Length must match init exactly.',
      );
    }

    const bytes = await context.req.arrayBuffer();
    if (bytes.byteLength !== attachment.sizeBytes) {
      throw new AppError(
        422,
        'WRONG_SIZE',
        'Uploaded byte size does not match init.',
      );
    }
    if (!signatureMatches(bytes, attachment.declaredContentType)) {
      throw new AppError(
        422,
        'WRONG_SIGNATURE',
        'File signature does not match MIME type.',
      );
    }

    const hash = await sha256Bytes(bytes);
    if (attachment.contentHash && hash !== attachment.contentHash) {
      throw new AppError(
        422,
        'CHECKSUM_MISMATCH',
        'SHA-256 checksum does not match.',
      );
    }

    await context.env.ATTACHMENTS.put(attachment.r2Key, bytes, {
      httpMetadata: { contentType: attachment.declaredContentType },
      customMetadata: {
        attachmentId: attachment.id,
        sha256: hash,
        expiresAt: attachment.expiresAt,
      },
    });
    await repository.markUploaded(
      attachment.id,
      hash,
      attachment.declaredContentType,
      now,
    );

    return context.json({
      data: { status: 'uploaded', checksum: hash },
      meta: { request_id: context.get('requestId') },
    });
  });

  router.post('/uploads/:id/finalize', async (context) => {
    const body = await context.req.json().catch(() => {
      throw new AppError(400, 'INVALID_JSON', 'Invalid JSON body.');
    });
    const parsed = AttachmentFinalizeInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Invalid finalize payload.');
    }

    const repository = repositoryFactory(context.env);
    const attachment = await repository.findById(context.req.param('id'));
    if (!attachment)
      throw new AppError(404, 'NOT_FOUND', 'Attachment not found.');
    if (!['uploaded', 'finalized'].includes(attachment.status)) {
      throw new AppError(409, 'UPLOAD_INCOMPLETE', 'Upload is not complete.');
    }
    if (attachment.expiresAt <= new Date().toISOString()) {
      throw new AppError(409, 'UPLOAD_EXPIRED', 'Attachment upload expired.');
    }
    if (
      parsed.data.checksum &&
      parsed.data.checksum.toLowerCase() !== attachment.contentHash
    ) {
      throw new AppError(
        422,
        'CHECKSUM_MISMATCH',
        'Finalize checksum does not match.',
      );
    }

    const object = await context.env.ATTACHMENTS.head(attachment.r2Key);
    if (
      !object ||
      object.size !== attachment.sizeBytes ||
      object.httpMetadata?.contentType !== attachment.detectedContentType ||
      object.customMetadata?.sha256 !== attachment.contentHash
    ) {
      throw new AppError(
        409,
        'UPLOAD_INCOMPLETE',
        'Stored object metadata is invalid.',
      );
    }

    await repository.markFinalized(attachment.id, new Date().toISOString());
    return context.json({
      data: {
        status: 'finalized',
        attachment_id: attachment.id,
        checksum: attachment.contentHash,
      },
      meta: { request_id: context.get('requestId') },
    });
  });

  router.get('/attachments/:id/content', async (context) => {
    const attachment = await repositoryFactory(context.env).findById(
      context.req.param('id'),
    );
    if (!attachment || !['finalized', 'linked'].includes(attachment.status)) {
      throw new AppError(404, 'NOT_FOUND', 'Attachment is not available.');
    }
    if (
      attachment.status === 'finalized' &&
      attachment.expiresAt <= new Date().toISOString()
    ) {
      throw new AppError(409, 'UPLOAD_EXPIRED', 'Attachment upload expired.');
    }
    const object = await context.env.ATTACHMENTS.get(attachment.r2Key);
    if (!object)
      throw new AppError(404, 'NOT_FOUND', 'Attachment bytes not found.');

    return new Response(object.body, {
      headers: {
        'Content-Type':
          attachment.detectedContentType ?? 'application/octet-stream',
        'Content-Length': String(object.size),
        'Content-Disposition': `attachment; filename="${safeFilename(attachment.fileName)}"`,
        'Cache-Control': 'private, no-store',
        ETag: object.httpEtag,
      },
    });
  });

  router.delete('/attachments/:id', requireAdminToken, async (context) => {
    const repository = repositoryFactory(context.env);
    const attachment = await repository.findById(context.req.param('id'));
    if (!attachment)
      throw new AppError(404, 'NOT_FOUND', 'Attachment not found.');
    await context.env.ATTACHMENTS.delete(attachment.r2Key);
    await repository.markDeleted(attachment.id, new Date().toISOString());
    return context.body(null, 204);
  });

  router.get('/uploads/usage', requireAdminToken, async (context) => {
    const usage = await repositoryFactory(context.env).usage();
    return context.json({
      data: { by_status: usage },
      meta: { request_id: context.get('requestId') },
    });
  });

  return router;
}
