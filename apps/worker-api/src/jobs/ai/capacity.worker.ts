import type { Env } from '../../env';
import { AiCapacityService } from './capacity.service';

export async function cleanupExpiredCapacityReservations(
  env: Env,
  now: Date = new Date(),
): Promise<number> {
  return new AiCapacityService(env, env.DB).expire(now);
}
