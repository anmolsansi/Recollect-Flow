import type { CaptureInput } from './capture.schema';
import type {
  CaptureRepository,
  NewCapture,
  StoredCapture,
} from './capture.repository';
import { normalizeUrl } from './url-normalizer';
import { AppError } from '../shared/errors';

export interface SaveResult {
  capture: StoredCapture;
  replayed: boolean;
}

export class CaptureService {
  constructor(private readonly repository: CaptureRepository) {}

  async save(input: CaptureInput): Promise<SaveResult> {
    const existing = await this.repository.findByIdempotencyKey(
      input.idempotency_key,
    );
    if (existing) return { capture: existing, replayed: true };

    const now = new Date().toISOString();
    const candidate: NewCapture = {
      ...input,
      id: crypto.randomUUID(),
      canonicalUrl: input.url ? normalizeUrl(input.url) : null,
      createdAt: now,
    };

    let saved: StoredCapture;
    try {
      saved = await this.repository.create(candidate);
    } catch (error) {
      const raced = await this.repository.findByIdempotencyKey(
        input.idempotency_key,
      );
      if (raced) return { capture: raced, replayed: true };
      console.error(
        JSON.stringify({ event: 'capture.persistence_failed', error }),
      );
      throw new AppError(
        503,
        'STORAGE_UNAVAILABLE',
        'The capture could not be stored. Retry with the same idempotency key.',
      );
    }

    try {
      await this.repository.scheduleProcessing(saved, now);
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
