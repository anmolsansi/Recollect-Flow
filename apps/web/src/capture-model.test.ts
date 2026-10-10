import { describe, expect, it } from 'vitest';
import { buildCapturePayload, emptyCaptureDraft, validateCapture } from './capture-model';

describe('BG-16 capture payload', () => {
  const key = 'operation-key-1234567890';
  const time = '2026-10-10T19:00:00.000Z';
  it('sends only active URL input, and defaults privacy to unknown', () => {
    const draft = { ...emptyCaptureDraft(), url: ' https://example.com/post ', sharedText: 'hidden' };
    expect(buildCapturePayload(draft, key, time, '1.0.0')).toMatchObject({
      source_type: 'url', url: 'https://example.com/post', privacy_level: 'unknown',
      source_app: 'recollect-web', client: { name: 'recollect-web', version: '1.0.0' },
    });
    expect(buildCapturePayload(draft, key, time, '1.0.0')).not.toHaveProperty('shared_text');
  });
  it.each(['note', 'text'] as const)('requires actual content in %s mode', mode => {
    expect(validateCapture({ ...emptyCaptureDraft(), mode, sharedText: '   ' }).shared_text).toBeTruthy();
    const payload = buildCapturePayload({ ...emptyCaptureDraft(), mode, sharedText: 'hello', url: 'https://hidden.example', reason: 'Keep ✓' }, key, time, '1.0.0');
    expect(payload.shared_text).toBe('hello');
    expect(payload.user_reason).toBe('Keep ✓');
    expect(payload).not.toHaveProperty('url');
  });
  it('rejects non-web and malformed URLs', () => {
    for (const url of ['file:///etc/passwd', 'not a url', 'javascript:alert(1)'])
      expect(validateCapture({ ...emptyCaptureDraft(), url }).url).toBeTruthy();
  });
  it('enforces schema length boundaries', () => {
    expect(validateCapture({ ...emptyCaptureDraft(), url: 'a'.repeat(2049) }).url).toBeTruthy();
    expect(validateCapture({ ...emptyCaptureDraft(), mode: 'text', sharedText: 'a'.repeat(100001) }).shared_text).toBeTruthy();
    expect(validateCapture({ ...emptyCaptureDraft(), url: 'https://example.com', reason: 'a'.repeat(2001) }).user_reason).toBeTruthy();
  });
});
