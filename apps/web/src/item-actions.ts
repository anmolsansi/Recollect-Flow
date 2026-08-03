import { ApiError } from './api';

export const FEEDBACK_TYPES = [
  'useful',
  'not_relevant',
  'already_used',
  'outdated',
] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

interface FeedbackEvent {
  feedback_type: string;
  created_at?: string;
}

export function feedbackLabel(type: FeedbackType): string {
  return type.replaceAll('_', ' ');
}

export function feedbackConfirmation(type: FeedbackType): string {
  return `Feedback recorded: ${feedbackLabel(type)}.`;
}

export function latestFeedbackType(
  events: readonly FeedbackEvent[],
): FeedbackType | null {
  const latest = events.find((event) =>
    FEEDBACK_TYPES.includes(event.feedback_type as FeedbackType),
  );
  return latest ? (latest.feedback_type as FeedbackType) : null;
}

export function isVersionConflict(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'VERSION_CONFLICT';
}

interface VersionedActionOptions<T> {
  loadLatestVersion: () => Promise<number>;
  execute: (editVersion: number) => Promise<T>;
  refresh: () => Promise<void>;
}

export type VersionedActionResult<T> =
  { ok: true; data: T } | { ok: false; conflict: boolean; error: unknown };

export async function runVersionedAction<T>(
  options: VersionedActionOptions<T>,
): Promise<VersionedActionResult<T>> {
  try {
    const editVersion = await options.loadLatestVersion();
    const data = await options.execute(editVersion);
    await options.refresh();
    return { ok: true, data };
  } catch (error) {
    const conflict = isVersionConflict(error);
    if (conflict) {
      try {
        await options.refresh();
      } catch {
        // Preserve the original version conflict for the caller.
      }
    }
    return { ok: false, conflict, error };
  }
}
