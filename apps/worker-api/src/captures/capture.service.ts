import type { CaptureInput } from './capture.schema';
import type {
  CaptureRepository,
  NewCapture,
  StoredCapture,
} from './capture.repository';
import { normalizeUrl } from './url-normalizer';
import { sha256 } from './hash';
import { AppError } from '../shared/errors';
import { PolicyService } from '../policy/policy.service';

export interface SaveResult {
  capture: StoredCapture;
  replayed: boolean;
}

export class CaptureService {
  constructor(
    private readonly repository: CaptureRepository,
    private readonly policy = new PolicyService(),
  ) {}

  async save(input: CaptureInput): Promise<SaveResult> {
    const existing = await this.repository.findByIdempotencyKey(
      input.idempotency_key,
    );
    if (existing) return { capture: existing, replayed: true };

    const canonicalUrl = input.url ? normalizeUrl(input.url) : null;
    const contentHash = input.shared_text
      ? await sha256(input.shared_text)
      : null;

    const duplicate = await this.repository.findCanonicalDuplicate(
      input.url ?? null,
      canonicalUrl,
      contentHash,
    );

    const now = new Date().toISOString();
    const candidate: NewCapture = {
      ...input,
      id: crypto.randomUUID(),
      eventId: crypto.randomUUID(),
      canonicalUrl,
      contentHash,
      duplicateOf: duplicate ? duplicate.id : null,
      createdAt: now,
    };

    let saved: StoredCapture;
    try {
      saved = await this.repository.create(candidate);
    } catch (error) {
      if (error instanceof AppError) throw error;

      const raced = await this.repository.findByIdempotencyKey(
        input.idempotency_key,
      );
      if (raced) return { capture: raced, replayed: true };

      const racedDuplicate = await this.repository.findCanonicalDuplicate(
        input.url ?? null,
        canonicalUrl,
        contentHash,
      );
      if (!candidate.duplicateOf && racedDuplicate) {
        try {
          saved = await this.repository.create({
            ...candidate,
            duplicateOf: racedDuplicate.id,
          });
        } catch (duplicateError) {
          const duplicateReplay = await this.repository.findByIdempotencyKey(
            input.idempotency_key,
          );
          if (duplicateReplay) {
            return { capture: duplicateReplay, replayed: true };
          }
          console.error(
            JSON.stringify({
              event: 'capture.duplicate_persistence_failed',
              error: duplicateError,
            }),
          );
          throw new AppError(
            503,
            'STORAGE_UNAVAILABLE',
            'The capture event could not be stored. Retry with the same idempotency key.',
          );
        }
      } else {
        console.error(
          JSON.stringify({ event: 'capture.persistence_failed', error }),
        );
        throw new AppError(
          503,
          'STORAGE_UNAVAILABLE',
          'The capture could not be stored. Retry with the same idempotency key.',
        );
      }
    }

    try {
      const decision = this.policy.route({
        privacyLevel: saved.privacyLevel,
        modality:
          input.source_type === 'url' || input.source_type === 'note'
            ? 'text'
            : input.source_type,
      });
      await this.repository.scheduleProcessing(saved, now, decision);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'capture.scheduling_failed',
          capture_id: saved.id,
          error,
        }),
      );
    }
    return { capture: saved, replayed: false };
  }
}
