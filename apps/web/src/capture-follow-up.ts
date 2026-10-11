import type { ItemDetailData } from '@recollect/contracts';
import { ApiError, fetchApi } from './api';
import { parseLocalReviewAt } from './follow-up-date';

export interface FollowUpDraft {
  project: string;
  reviewLocal: string;
  reviewInstant?: string;
}

export const emptyFollowUp = (): FollowUpDraft => ({
  project: '',
  reviewLocal: '',
});

/** Freeze the owner's local selection at submit time so a later timezone change cannot shift it. */
export function freezeFollowUp(value: FollowUpDraft): FollowUpDraft {
  const instant = parseLocalReviewAt(value.reviewLocal);
  return {
    project: value.project,
    reviewLocal: value.reviewLocal,
    ...(instant ? { reviewInstant: instant } : {}),
  };
}

export function validateFollowUp(
  value: FollowUpDraft,
): Record<'project' | 'review_at', string> {
  const errors = { project: '', review_at: '' };
  if (value.project.trim().length > 200) {
    errors.project = 'Project can be at most 200 characters.';
  }
  try {
    if (value.reviewInstant !== undefined) {
      if (
        typeof value.reviewInstant !== 'string' ||
        !value.reviewLocal ||
        !Number.isFinite(Date.parse(value.reviewInstant)) ||
        new Date(value.reviewInstant).toISOString() !== value.reviewInstant
      )
        throw new Error(
          'Invalid stored review instant. Choose the date again.',
        );
    } else {
      parseLocalReviewAt(value.reviewLocal);
    }
  } catch (error) {
    errors.review_at =
      error instanceof Error ? error.message : 'Choose a valid review time.';
  }
  return errors;
}

export function hasFollowUp(value: FollowUpDraft): boolean {
  return Boolean(
    value.project.trim() || value.reviewLocal || value.reviewInstant,
  );
}

export type FollowUpOutcome =
  | { status: 'none' }
  | { status: 'applied' }
  | { status: 'duplicate' }
  | { status: 'conflict' };

/** Only item-edit fields are sent here; capture bodies remain strictly unchanged. */
export async function applyCaptureFollowUp(
  captureId: string,
  duplicateOf: string | null,
  value: FollowUpDraft,
  api: typeof fetchApi = fetchApi,
): Promise<FollowUpOutcome> {
  if (!hasFollowUp(value)) return { status: 'none' };
  const errors = validateFollowUp(value);
  if (errors.project || errors.review_at)
    throw new Error(errors.project || errors.review_at);

  // Even for duplicates, read the canonical target first. Never silently edit
  // metadata attached to an older independent capture.
  const detail = await api<ItemDetailData>(`/items/${captureId}`);
  if (duplicateOf || detail.item.duplicate_of) return { status: 'duplicate' };

  const requestedProject = value.project.trim() || null;
  const requestedReview =
    value.reviewInstant ?? parseLocalReviewAt(value.reviewLocal);
  const currentProject = detail.item.project;
  const currentReview = detail.item.review_at ?? null;
  if (
    (requestedProject &&
      currentProject &&
      currentProject !== requestedProject) ||
    (requestedReview && currentReview && currentReview !== requestedReview)
  ) {
    return { status: 'conflict' };
  }

  const patch: { edit_version: number; project?: string; review_at?: string } =
    {
      edit_version: detail.item.edit_version,
    };
  if (requestedProject && currentProject !== requestedProject)
    patch.project = requestedProject;
  if (requestedReview && currentReview !== requestedReview)
    patch.review_at = requestedReview;
  // A lost PATCH response is safely reconciled via GET on manual retry.
  if (Object.keys(patch).length === 1) return { status: 'applied' };

  try {
    await api<{ item_id: string; edit_version: number }>(
      `/items/${captureId}`,
      { method: 'PATCH', body: JSON.stringify(patch) },
    );
  } catch (error) {
    if (error instanceof ApiError && error.code === 'VERSION_CONFLICT')
      return { status: 'conflict' };
    throw error;
  }

  const confirmed = await api<ItemDetailData>(`/items/${captureId}`);
  if (
    (requestedProject && confirmed.item.project !== requestedProject) ||
    (requestedReview && confirmed.item.review_at !== requestedReview)
  )
    return { status: 'conflict' };
  return { status: 'applied' };
}
