import type { Env } from '../../env';
import { AppError } from '../../shared/errors';
import { AiCapacityAccounting } from './capacity.accounting';
import {
  estimateCapacityForPrompt,
  estimateProviderUnits,
} from './capacity.estimate';
import { getProviderCapacityPolicy } from './capacity.policy';
import { AiCapacityRepository } from './capacity.repository';
import type {
  CapacityAdmissionResult,
  CapacityOperation,
  CapacityProvider,
  CapacityWindowSnapshot,
} from './capacity.types';
import { quotaWindowBoundary } from './capacity.window';
import { AiCircuitBreakerRepository } from './circuit-breaker.repository';
import {
  isCircuitBreakerFailure,
  stableProviderErrorCode,
} from './provider-failure';

const RESERVATION_TTL_MS = 2 * 60_000;

export type CapacityAdmission = CapacityAdmissionResult & {
  probeOwnerId: string | null;
};

export interface ProviderCallUsage {
  requests?: number;
  inputUnits?: number;
  outputUnits?: number;
}

function dimensionFits(
  limit: number | null,
  consumed: number,
  reserved: number,
  incoming: number,
): boolean {
  return limit === null || consumed + reserved + incoming <= limit;
}

function blocksEstimate(
  window: CapacityWindowSnapshot,
  estimate: CapacityAdmissionResult['reservation']['estimate'],
): boolean {
  return !(
    dimensionFits(
      window.requestLimit,
      window.requestConsumed,
      window.requestReserved,
      estimate.requests,
    ) &&
    dimensionFits(
      window.inputUnitLimit,
      window.inputUnitsConsumed,
      window.inputUnitsReserved,
      estimate.inputUnits,
    ) &&
    dimensionFits(
      window.outputUnitLimit,
      window.outputUnitsConsumed,
      window.outputUnitsReserved,
      estimate.outputUnits,
    ) &&
    dimensionFits(
      window.providerUnitLimit,
      window.providerUnitsConsumed,
      window.providerUnitsReserved,
      estimate.providerUnits,
    )
  );
}

export class AiCapacityService {
  private readonly repository: AiCapacityRepository;
  private readonly accounting: AiCapacityAccounting;
  private readonly breakers: AiCircuitBreakerRepository;

  constructor(
    private readonly env: Env,
    db: D1Database,
  ) {
    this.repository = new AiCapacityRepository(db);
    this.accounting = new AiCapacityAccounting(db);
    this.breakers = new AiCircuitBreakerRepository(db);
  }

  async admit(
    provider: CapacityProvider,
    operation: CapacityOperation,
    model: string,
    prompt: string,
    requestReserve = 1,
    now: Date = new Date(),
  ): Promise<CapacityAdmission> {
    const policy = getProviderCapacityPolicy(
      this.env,
      provider,
      operation,
      model,
    );
    if (!policy) {
      throw new AppError(
        503,
        'ZERO_COST_GUARD_REJECTED',
        'The configured provider/model is not approved for zero-cost execution.',
      );
    }

    const breaker = await this.repository.ensureCircuitBreaker(
      provider,
      operation,
      now,
    );
    let probeOwnerId: string | null = null;
    if (breaker.state !== 'closed') {
      const nextProbe = breaker.nextProbeAt
        ? new Date(breaker.nextProbeAt)
        : null;
      if (!nextProbe || nextProbe.getTime() > now.getTime()) {
        throw new AppError(
          503,
          'PROVIDER_UNAVAILABLE',
          'The provider circuit breaker is open.',
          nextProbe ? { available_at: nextProbe.toISOString() } : undefined,
        );
      }
      probeOwnerId = crypto.randomUUID();
      const probe = await this.breakers.acquireHalfOpenProbe(
        provider,
        operation,
        probeOwnerId,
        now,
      );
      if (!probe) {
        throw new AppError(
          503,
          'PROVIDER_UNAVAILABLE',
          'A provider recovery probe is already in progress.',
        );
      }
    }

    const reserveCalls = Math.max(1, Math.floor(requestReserve));
    const estimate = estimateCapacityForPrompt(provider, model, prompt);
    estimate.requests = reserveCalls;
    if (reserveCalls > 1) {
      estimate.inputUnits *= reserveCalls;
      estimate.outputUnits *= reserveCalls;
      estimate.providerUnits = estimateProviderUnits(
        provider,
        model,
        estimate.inputUnits,
        estimate.outputUnits,
      );
    }
    const windowKeys = policy.windows.map(
      (window) => quotaWindowBoundary(window, now).key,
    );
    const reservation = {
      id: crypto.randomUUID(),
      provider,
      operation,
      model,
      scopeKey: `${provider}:${operation}`,
      estimate,
      windowKeys,
      expiresAt: new Date(now.getTime() + RESERVATION_TTL_MS).toISOString(),
    };

    await this.repository.createReservationIntent(reservation, now);
    const windows = await this.repository.tryApplyReservation(
      reservation,
      policy.windows,
      now,
    );
    if (!windows) {
      const snapshots = await this.repository.ensureWindows(policy.windows, now);
      const blocked = snapshots.filter((window) =>
        blocksEstimate(window, estimate),
      );
      const availableAt = new Date(
        Math.max(
          ...(blocked.length ? blocked : snapshots).map((window) =>
            new Date(window.windowEnd).getTime(),
          ),
        ),
      ).toISOString();
      throw new AppError(
        503,
        'QUOTA_PAUSED',
        'The approved free-tier quota is temporarily exhausted.',
        { available_at: availableAt },
      );
    }

    return { reservation, windows, probeOwnerId };
  }

  async completeSuccess(
    admission: CapacityAdmission,
    usage: ProviderCallUsage,
    now: Date = new Date(),
  ): Promise<void> {
    const { reservation, probeOwnerId } = admission;
    const inputUnits = usage.inputUnits ?? reservation.estimate.inputUnits;
    const outputUnits = usage.outputUnits ?? reservation.estimate.outputUnits;
    await this.accounting.reconcileReservation(
      reservation.id,
      {
        requests: usage.requests ?? 1,
        inputUnits,
        outputUnits,
        providerUnits: estimateProviderUnits(
          reservation.provider,
          reservation.model,
          inputUnits,
          outputUnits,
        ),
      },
      now,
    );
    await this.breakers.recordSuccess(
      reservation.provider,
      reservation.operation,
      probeOwnerId,
      now,
    );
  }

  async completeFailure(
    admission: CapacityAdmission,
    error: unknown,
    usage: ProviderCallUsage,
    now: Date = new Date(),
  ): Promise<void> {
    const { reservation } = admission;
    const inputUnits = usage.inputUnits ?? reservation.estimate.inputUnits;
    const outputUnits = usage.outputUnits ?? reservation.estimate.outputUnits;
    await this.accounting.reconcileReservation(
      reservation.id,
      {
        requests: usage.requests ?? 1,
        inputUnits,
        outputUnits,
        providerUnits: estimateProviderUnits(
          reservation.provider,
          reservation.model,
          inputUnits,
          outputUnits,
        ),
      },
      now,
    );
    if (isCircuitBreakerFailure(error)) {
      await this.breakers.recordFailure(
        reservation.provider,
        reservation.operation,
        stableProviderErrorCode(error),
        now,
      );
    }
  }

  async release(
    reservationId: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    return this.accounting.releaseReservation(reservationId, now);
  }

  async expire(now: Date = new Date()): Promise<number> {
    return this.accounting.expireReservations(now);
  }
}
