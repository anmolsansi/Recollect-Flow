import { captureCategorySchema } from '@recollect/contracts';

export const CAPTURE_CATEGORIES = captureCategorySchema.options;
export type CaptureCategory = (typeof CAPTURE_CATEGORIES)[number];
export type CaptureMode = 'url' | 'text' | 'note';
export type CapturePrivacy = 'unknown' | 'public' | 'personal' | 'sensitive';

export interface CaptureDraft {
  mode: CaptureMode;
  url: string;
  sharedText: string;
  reason: string;
  category: '' | CaptureCategory;
  privacy: CapturePrivacy;
}

export interface CapturePayload {
  idempotency_key: string;
  source_type: CaptureMode;
  source_app: string;
  captured_at: string;
  client: { name: string; version: string };
  url?: string;
  shared_text?: string;
  user_reason?: string;
  quick_category?: CaptureCategory;
  privacy_level: CapturePrivacy;
}

export const emptyCaptureDraft = (): CaptureDraft => ({
  mode: 'url',
  url: '',
  sharedText: '',
  reason: '',
  category: '',
  privacy: 'unknown',
});

export function validateCapture(draft: CaptureDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (draft.mode === 'url') {
    if (!draft.url.trim()) errors.url = 'Enter a URL.';
    else if (draft.url.length > 2048)
      errors.url = 'URLs can be at most 2,048 characters.';
    else {
      try {
        const url = new URL(draft.url.trim());
        if (!['https:', 'http:'].includes(url.protocol))
          errors.url = 'Use an HTTP or HTTPS URL.';
      } catch {
        errors.url = 'Enter a valid HTTP or HTTPS URL.';
      }
    }
  } else if (!draft.sharedText.trim())
    errors.shared_text = 'Enter some text to save.';
  if (draft.mode !== 'url' && draft.sharedText.length > 100000)
    errors.shared_text = 'Text can be at most 100,000 characters.';
  if (draft.reason.length > 2000)
    errors.user_reason = 'Reason can be at most 2,000 characters.';
  if (draft.category && !CAPTURE_CATEGORIES.includes(draft.category))
    errors.quick_category = 'Select a valid category.';
  return errors;
}

export function buildCapturePayload(
  draft: CaptureDraft,
  key: string,
  capturedAt: string,
  version: string,
): CapturePayload {
  if (Object.keys(validateCapture(draft)).length)
    throw new Error('Invalid capture draft');
  if (key.length < 12 || key.length > 200)
    throw new Error('Invalid capture operation key');
  return {
    idempotency_key: key,
    source_type: draft.mode,
    source_app: 'recollect-web',
    captured_at: capturedAt,
    client: { name: 'recollect-web', version },
    ...(draft.mode === 'url'
      ? { url: draft.url.trim() }
      : { shared_text: draft.sharedText }),
    ...(draft.reason ? { user_reason: draft.reason } : {}),
    ...(draft.category ? { quick_category: draft.category } : {}),
    privacy_level: draft.privacy,
  };
}

/** Restore rejected or locally queued fields for a deliberate new edit.
 * A submitted operation's wire payload must never be mutated in place.
 */
export function captureDraftFromPayload(payload: CapturePayload): CaptureDraft {
  return {
    mode: payload.source_type,
    url: payload.source_type === 'url' ? (payload.url ?? '') : '',
    sharedText: payload.source_type === 'url' ? '' : (payload.shared_text ?? ''),
    reason: payload.user_reason ?? '',
    category: payload.quick_category ?? '',
    privacy: payload.privacy_level,
  };
}
