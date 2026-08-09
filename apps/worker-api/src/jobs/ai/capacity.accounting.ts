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

  async releaseReservation(
    reservationId: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const reservation = await this.getReservation(reservationId);
    if (!reservation || reservation.state !== 'active') return false;

    const nowIso = now.toISOString();
    if (reservation.capacity_applied === 1) {
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
             request_consumed = request_consumed + ?1,
             input_units_consumed = input_units_consumed + ?5,
             output_units_consumed = output_units_consumed + ?6,
             provider_units_consumed = provider_units_consumed + ?7,
             updated_at = ?8
         WHERE (provider || ':' || scope_key || ':' || window_kind || ':' || window_start)
               IN (SELECT value FROM json_each(?9))`,
      )
      .bind(
        reservation.request_units,
        reservation.estimated_input_units,
        reservation.estimated_output_units,
        reservation.estimated_provider_units,
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
