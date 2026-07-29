import { Hono } from 'hono';

import { D1AttachmentRepository } from '../attachments/attachment.repository';
import type { AttachmentRepository } from '../attachments/attachment.repository';
import { positiveInteger } from '../attachments/attachment.utils';
import { D1CaptureRepository } from '../captures/capture.repository';
import type { CaptureRepository } from '../captures/capture.repository';
import type { AppContext, Env } from '../env';
import { matchesCaptureToken } from '../shared/auth';
import { AppError } from '../shared/errors';
import { shortcutMetadataSchema } from './shortcut.schema';
import {
  prepareShortcutCapture,
  ShortcutCaptureService,
} from './shortcut.service';

const ALLOWED_FIELDS = new Set([
  'idempotency_key',
  'kind_hint',
  'content',
  'user_reason',
  'privacy_level',
  'client_version',
]);

function responseHeaders() {
  return {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
}

function errorEnvelope(error: unknown, requestId: string) {
  if (error instanceof AppError) {
    const auth = error.status === 401 || error.status === 403;
    const retryable = error.status >= 500;
    return {
      ok: false,
      saved: false,
      retryable,
      outcome: auth ? 'auth_required' : retryable ? 'retry' : 'needs_attention',
      shortcut_action: auth
        ? 'KEEP_STOP'
        : retryable
          ? 'KEEP_RETRY'
          : 'KEEP_FIX',
      code: error.code,
      message: error.message,
      request_id: requestId,
    };
  }
  console.error(
    JSON.stringify({
      event: 'shortcut.unhandled_error',
      request_id: requestId,
    }),
  );
  return {
    ok: false,
    saved: false,
    retryable: true,
    outcome: 'retry',
    shortcut_action: 'KEEP_RETRY',
    code: 'INTERNAL_ERROR',
    message: 'The capture could not be completed. Retry with the same key.',
    request_id: requestId,
  };
}

export function shortcutRoutes(
  captureRepositoryFactory: (env: Env) => CaptureRepository = (env) =>
    new D1CaptureRepository(env.DB),
  attachmentRepositoryFactory: (env: Env) => AttachmentRepository = (env) =>
    new D1AttachmentRepository(env.DB),
) {
  const router = new Hono<AppContext>();

  router.post('/shortcut/captures', async (context) => {
    const requestId = context.get('requestId');
    try {
      if (
        !(await matchesCaptureToken(
          context.req.header('Authorization'),
          context.env.CAPTURE_TOKEN,
        ))
      ) {
        throw new AppError(
          401,
          'UNAUTHORIZED',
          'Set a valid Recollect capture token in the Shortcut.',
        );
      }

      const contentType = context.req.header('Content-Type') ?? '';
      if (
        !contentType.startsWith('multipart/form-data') &&
        !contentType.startsWith('application/x-www-form-urlencoded')
      ) {
        throw new AppError(
          422,
          'INVALID_FORM',
          'Send the Shortcut request as a form.',
        );
      }
      const form = await context.req.formData().catch(() => {
        throw new AppError(400, 'INVALID_FORM', 'The form could not be read.');
      });
      let invalidField = false;
      form.forEach((_value, key) => {
        if (!ALLOWED_FIELDS.has(key) || form.getAll(key).length !== 1) {
          invalidField = true;
        }
      });
      if (invalidField) {
        throw new AppError(
          422,
          'INVALID_FORM',
          'The form contains an unknown or repeated field.',
        );
      }
      const content = form.get('content');
      if (content === null) {
        throw new AppError(
          422,
          'VALIDATION_ERROR',
          'The content field is required.',
        );
      }
      const parsed = shortcutMetadataSchema.safeParse({
        idempotency_key: form.get('idempotency_key') ?? undefined,
        kind_hint: form.get('kind_hint') ?? undefined,
        user_reason: form.get('user_reason') ?? undefined,
        privacy_level: form.get('privacy_level') ?? undefined,
        client_version: form.get('client_version') ?? undefined,
      });
      if (!parsed.success) {
        throw new AppError(
          422,
          'VALIDATION_ERROR',
          parsed.error.issues[0]?.message ?? 'Shortcut metadata is invalid.',
        );
      }

      const prepared = await prepareShortcutCapture(
        parsed.data,
        content,
        positiveInteger(context.env.MAX_ATTACHMENT_BYTES, 25_000_000),
      );
      const result = await new ShortcutCaptureService(
        captureRepositoryFactory(context.env),
        attachmentRepositoryFactory(context.env),
        context.env.ATTACHMENTS,
        context.env.MAX_ATTACHMENT_BYTES,
        context.env.UPLOAD_TTL_SECONDS,
      ).save(prepared);

      return context.json(
        {
          ok: true,
          saved: true,
          retryable: false,
          outcome: result.replayed ? 'replayed' : 'saved',
          shortcut_action: 'DELETE_QUEUE',
          message: result.replayed
            ? 'Already saved.'
            : 'Saved to RecollectFlow.',
          capture_id: result.capture.id,
          ...(result.attachmentId
            ? { attachment_id: result.attachmentId }
            : {}),
          duplicate_of: result.capture.duplicateOf,
          processing_status: result.capture.processingStatus,
          privacy_level: result.capture.privacyLevel,
          replayed: result.replayed,
          request_id: requestId,
        },
        200,
        responseHeaders(),
      );
    } catch (error) {
      return context.json(
        errorEnvelope(error, requestId),
        200,
        responseHeaders(),
      );
    }
  });

  return router;
}
