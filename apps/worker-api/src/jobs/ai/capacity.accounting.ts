interface ReservationAccountingRow {
  id: string;
  request_units: number;
  estimated_input_units: number;
  estimated_output_units: number;
  estimated_provider_units: number;
  capacity_applied: number;
  state: 'active' | 'reconciled' | 'released' | 'expired';
  window_keys_json: string;
}

export interface ReconciledUsage {
  requests?: number;
  inputUnits?: number;
  outputUnits?: number;
  providerUnits?: number;
}

export class AiCapacityAccounting {
  constructor(private readonly db: D1Database) {}

  private async getReservation(
    reservationId: string,
  ): Promise<ReservationAccountingRow | null> {
    return this.db
      .prepare(
        `SELECT id, request_units, estimated_input_units, estimated_output_units,
                estimated_provider_units, capacity_applied, state, window_keys_json
         FROM ai_capacity_reservations
         WHERE id = ?1`,
      )
      .bind(reservationId)
      .first<ReservationAccountingRow>();
  }

  private async removeReservedCapacity(
    reservation: ReservationAccountingRow,
    nowIso: string,
  ): Promise<void> {
    if (reservation.capacity_applied !== 1) return;
    await this.db
      .prepare(
        `UPDATE ai_capacity_windows
         SET request_reserved = MAX(0, request_reserved - ?1),
             input_units_reserved = MAX(0, input_units_reserved - ?2),
             output_units_reserved = MAX(0, output_units_reserved - ?3),
             provider_units_reserved = MAX(0, provider_units_reserved - ?4),
             updated_at = ?5
         WHERE (provider || ':' || scope_key || ':' || window_kind || ':' || window_start)
               IN (SELECT value FROM json_each(?6))`,
      )
      .bind(
        reservation.request_units,
        reservation.estimated_input_units,
        reservation.estimated_output_units,
        reservation.estimated_provider_units,
        nowIso,
        reservation.window_keys_json,
      )
      .run();
  }

  async releaseReservation(
    reservationId: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const reservation = await this.getReservation(reservationId);
    if (!reservation || reservation.state !== 'active') return false;

    const nowIso = now.toISOString();
    await this.removeReservedCapacity(reservation, nowIso);

    const result = await this.db
      .prepare(
        `UPDATE ai_capacity_reservations
         SET state = 'released', released_at = ?1, updated_at = ?1
         WHERE id = ?2 AND state = 'active'`,
      )
      .bind(nowIso, reservationId)
      .run();
    return result.meta.changes === 1;
  }

  async expireReservations(
    now: Date = new Date(),
    limit = 100,
  ): Promise<number> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `SELECT id, request_units, estimated_input_units, estimated_output_units,
                estimated_provider_units, capacity_applied, state, window_keys_json
         FROM ai_capacity_reservations
         WHERE state = 'active' AND expires_at <= ?1
         ORDER BY expires_at ASC
         LIMIT ?2`,
      )
      .bind(nowIso, limit)
      .all<ReservationAccountingRow>();

    let expired = 0;
    for (const reservation of result.results ?? []) {
      await this.removeReservedCapacity(reservation, nowIso);
      const update = await this.db
        .prepare(
          `UPDATE ai_capacity_reservations
           SET state = 'expired', released_at = ?1, updated_at = ?1
           WHERE id = ?2 AND state = 'active'`,
        )
        .bind(nowIso, reservation.id)
        .run();
      expired += update.meta.changes;
    }
    return expired;
  }

  async reconcileReservation(
    reservationId: string,
    actual: ReconciledUsage,
    now: Date = new Date(),
  ): Promise<boolean> {
    const reservation = await this.getReservation(reservationId);

    if (
      !reservation ||
      reservation.state !== 'active' ||
      reservation.capacity_applied !== 1
    ) {
      return false;
    }

    const requests = Math.max(
      0,
      Math.min(
        reservation.request_units,
        Math.floor(actual.requests ?? reservation.request_units),
      ),
    );
    const inputUnits = Math.max(
      0,
      Math.floor(actual.inputUnits ?? reservation.estimated_input_units),
    );
    const outputUnits = Math.max(
      0,
      Math.floor(actual.outputUnits ?? reservation.estimated_output_units),
    );
    const providerUnits = Math.max(
      0,
      Math.floor(actual.providerUnits ?? reservation.estimated_provider_units),
    );
    const nowIso = now.toISOString();

    const updatedWindows = await this.db
      .prepare(
        `UPDATE ai_capacity_windows
         SET request_reserved = MAX(0, request_reserved - ?1),
             input_units_reserved = MAX(0, input_units_reserved - ?2),
             output_units_reserved = MAX(0, output_units_reserved - ?3),
             provider_units_reserved = MAX(0, provider_units_reserved - ?4),
             request_consumed = request_consumed + ?5,
             input_units_consumed = input_units_consumed + ?6,
             output_units_consumed = output_units_consumed + ?7,
             provider_units_consumed = provider_units_consumed + ?8,
             updated_at = ?9
         WHERE (provider || ':' || scope_key || ':' || window_kind || ':' || window_start)
               IN (SELECT value FROM json_each(?10))`,
      )
      .bind(
        reservation.request_units,
        reservation.estimated_input_units,
        reservation.estimated_output_units,
        reservation.estimated_provider_units,
        requests,
        inputUnits,
        outputUnits,
        providerUnits,
        nowIso,
        reservation.window_keys_json,
      )
      .run();

    if (updatedWindows.meta.changes === 0) return false;

    const updatedReservation = await this.db
      .prepare(
        `UPDATE ai_capacity_reservations
         SET state = 'reconciled', actual_input_units = ?1,
             actual_output_units = ?2, actual_provider_units = ?3,
             reconciled_at = ?4, updated_at = ?4
         WHERE id = ?5 AND state = 'active' AND capacity_applied = 1`,
      )
      .bind(inputUnits, outputUnits, providerUnits, nowIso, reservationId)
      .run();

    return updatedReservation.meta.changes === 1;
  }
}
