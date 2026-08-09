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

  private releaseWindowStatement(
    reservation: ReservationAccountingRow,
    nowIso: string,
  ) {
    return this.db
      .prepare(
        `UPDATE ai_capacity_windows
         SET request_reserved = MAX(0, request_reserved - ?1),
             input_units_reserved = MAX(0, input_units_reserved - ?2),
             output_units_reserved = MAX(0, output_units_reserved - ?3),
             provider_units_reserved = MAX(0, provider_units_reserved - ?4),
             updated_at = ?5
         WHERE (provider || ':' || scope_key || ':' || window_kind || ':' || window_start)
               IN (SELECT value FROM json_each(?6))
           AND EXISTS (
             SELECT 1 FROM ai_capacity_reservations r
             WHERE r.id = ?7 AND r.state = 'active' AND r.capacity_applied = 1
           )`,
      )
      .bind(
        reservation.request_units,
        reservation.estimated_input_units,
        reservation.estimated_output_units,
        reservation.estimated_provider_units,
        nowIso,
        reservation.window_keys_json,
        reservation.id,
      );
  }

  private async finishReservationWithoutConsumption(
    reservation: ReservationAccountingRow,
    state: 'released' | 'expired',
    nowIso: string,
  ): Promise<boolean> {
    const batch = await this.db.batch([
      this.releaseWindowStatement(reservation, nowIso),
      this.db
        .prepare(
          `UPDATE ai_capacity_reservations
           SET state = ?1, released_at = ?2, updated_at = ?2
           WHERE id = ?3 AND state = 'active'`,
        )
        .bind(state, nowIso, reservation.id),
    ]);
    return batch[1]?.meta.changes === 1;
  }

  async releaseReservation(
    reservationId: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const reservation = await this.getReservation(reservationId);
    if (!reservation || reservation.state !== 'active') return false;
    return this.finishReservationWithoutConsumption(
      reservation,
      'released',
      now.toISOString(),
    );
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
      const stillExpired = await this.db
        .prepare(
          `SELECT id FROM ai_capacity_reservations
           WHERE id = ?1 AND state = 'active' AND expires_at <= ?2`,
        )
        .bind(reservation.id, nowIso)
        .first<{ id: string }>();
      if (!stillExpired) continue;
      if (
        await this.finishReservationWithoutConsumption(
          reservation,
          'expired',
          nowIso,
        )
      ) {
        expired += 1;
      }
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

    const batch = await this.db.batch([
      this.db
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
                 IN (SELECT value FROM json_each(?10))
             AND EXISTS (
               SELECT 1 FROM ai_capacity_reservations r
               WHERE r.id = ?11 AND r.state = 'active' AND r.capacity_applied = 1
             )`,
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
          reservationId,
        ),
      this.db
        .prepare(
          `UPDATE ai_capacity_reservations
           SET state = 'reconciled', actual_request_units = ?1,
               actual_input_units = ?2, actual_output_units = ?3,
               actual_provider_units = ?4, reconciled_at = ?5, updated_at = ?5
           WHERE id = ?6 AND state = 'active' AND capacity_applied = 1`,
        )
        .bind(
          requests,
          inputUnits,
          outputUnits,
          providerUnits,
          nowIso,
          reservationId,
        ),
    ]);

    return batch[1]?.meta.changes === 1;
  }
}
