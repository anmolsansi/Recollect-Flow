import type {
  CapacityWindowKind,
  CapacityWindowPolicy,
} from './capacity.types';

export interface CapacityWindowBoundary {
  key: string;
  start: string;
  end: string;
}

function floorUtc(now: Date, kind: CapacityWindowKind): Date {
  const start = new Date(now.getTime());
  if (kind === 'day') {
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }
  if (kind === 'hour') {
    start.setUTCMinutes(0, 0, 0);
    return start;
  }
  if (kind === 'minute') {
    start.setUTCSeconds(0, 0);
    return start;
  }
  return start;
}

export function quotaWindowBoundary(
  policy: CapacityWindowPolicy,
  now: Date,
): CapacityWindowBoundary {
  const start =
    policy.windowKind === 'custom'
      ? new Date(
          Math.floor(now.getTime() / policy.durationMs) * policy.durationMs,
        )
      : floorUtc(now, policy.windowKind);
  const end = new Date(start.getTime() + policy.durationMs);
  const startIso = start.toISOString();
  return {
    key: `${policy.provider}:${policy.scopeKey}:${policy.windowKind}:${startIso}`,
    start: startIso,
    end: end.toISOString(),
  };
}
