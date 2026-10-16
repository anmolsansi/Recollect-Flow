import { describe, expect, it } from 'vitest';

import { captureSchema } from '../src/captures/capture.schema';
import {
  ALLOWED_DATA_MATRIX,
  PolicyService,
} from '../src/policy/policy.service';

const levels = ['unknown', 'public', 'personal', 'sensitive'] as const;
const sources = ['url', 'text', 'note', 'image', 'file'] as const;
const modality = {
  url: 'text',
  text: 'text',
  note: 'text',
  image: 'image',
  file: 'pdf',
} as const;

describe('BG-29 privacy and input scenario matrix', () => {
  it('accepts each of the 20 well-formed synthetic source/privacy combinations', () => {
    for (const source of sources) {
      for (const level of levels) {
        const payload = {
          idempotency_key: `bg29-matrix-${source}-${level}`,
          source_type: source,
          source_app: 'BG29 synthetic',
          privacy_level: level,
          captured_at: '2026-10-01T00:00:00.000Z',
          client: { name: 'vitest', version: '1.0' },
          ...(source === 'url' ? { url: 'https://example.com/bg29' } : {}),
          ...(source === 'text' || source === 'note'
            ? { shared_text: `synthetic ${source} ${level}` }
            : {}),
          ...(source === 'image' || source === 'file'
            ? { attachment_id: '11111111-1111-4111-8111-111111111111' }
            : {}),
        };
        const parsed = captureSchema.safeParse(payload);
        expect(parsed.success, `${source} / ${level}`).toBe(true);
      }
    }
  });

  it('does not accept a fake image, empty text, or a URL without source material', () => {
    const base = {
      idempotency_key: 'bg29-matrix-bad-input',
      source_app: 'BG29 synthetic',
      privacy_level: 'sensitive',
      captured_at: '2026-10-01T00:00:00.000Z',
      client: { name: 'vitest', version: '1.0' },
    };
    for (const invalid of [
      { source_type: 'image' },
      { source_type: 'file' },
      { source_type: 'url' },
      { source_type: 'note', shared_text: '   ' },
      { source_type: 'text', shared_text: '' },
    ]) {
      expect(captureSchema.safeParse({ ...base, ...invalid }).success).toBe(
        false,
      );
    }
  });

  it('rejects hosted OpenRouter for Unknown and Sensitive across supported modalities', () => {
    const policy = new PolicyService();
    for (const source of sources) {
      for (const level of ['unknown', 'sensitive'] as const) {
        expect(ALLOWED_DATA_MATRIX[level].openrouter).not.toContain(
          modality[source],
        );
        const decision = policy.route({
          privacyLevel: level,
          modality: modality[source],
          requestedProvider: 'openrouter',
          availableProviders: ['openrouter', 'none'],
          hostedQuotaAvailable: true,
          hostedProcessingConsent: true,
          credentialSource: 'user_provided',
          zeroDataRetentionEnforced: true,
          dataCollectionDenied: true,
        });
        expect(decision.provider).toBe('none');
      }
    }
  });
});
