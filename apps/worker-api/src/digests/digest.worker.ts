import type { Env } from '../env';
import { DigestRepository } from './digest.repository';
import { DigestService } from './digest.service';
import { TelegramClient, TelegramDeliveryError } from './telegram.client';

export interface DigestWorkerOptions {
  now?: () => Date;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  batchSize?: number;
  leaseMinutes?: number;
  maxAttempts?: number;
}

function retryAt(attempts: number, now: Date): Date {
  const delay = Math.min(2 ** Math.max(attempts, 1) * 60_000, 24 * 60 * 60_000);
  return new Date(now.getTime() + delay);
}

export async function processDigestDeliveries(
  env: Env,
  options: DigestWorkerOptions = {},
): Promise<void> {
  const now = options.now ?? (() => new Date());
  const repository = new DigestRepository(env.DB);
  const service = new DigestService(env, { now, aiEnabled: false });
  const client = new TelegramClient(
    env.TELEGRAM_BOT_TOKEN,
    env.TELEGRAM_CHAT_ID,
    {
      fetcher: options.fetcher,
      timeoutMs: options.timeoutMs,
      now,
    },
  );
  const ownerId = `telegram-digest:${crypto.randomUUID()}`;
  const deliveries = await repository.leaseTelegramDeliveries(
    ownerId,
    options.leaseMinutes ?? 2,
    options.batchSize ?? 10,
    now(),
  );

  for (const delivery of deliveries) {
    const run = await repository.getRun(delivery.digestRunId);
    if (!run) {
      await repository.markDeliveryTerminal(
        delivery.id,
        ownerId,
        'failed',
        'DIGEST_RUN_NOT_FOUND',
        now(),
      );
      continue;
    }

    try {
      const rendered = await service.deliveryText(run);
      if (rendered.empty) {
        await repository.markDeliveryTerminal(
          delivery.id,
          ownerId,
          'skipped',
          'EMPTY_AFTER_PRIVACY_RECHECK',
          now(),
        );
        await repository.writeAudit(
          run.id,
          'digest_delivery_skipped_after_recheck',
          'worker',
          { delivery_id: delivery.id },
          now(),
        );
        continue;
      }

      const startedAt = Date.now();
      const messageId = await client.sendMessage(rendered.message);
      const sentAt = now();
      const persisted = await repository.markDeliverySent(
        delivery.id,
        ownerId,
        messageId,
        sentAt,
      );
      if (!persisted) {
        await repository.markDeliveryTerminal(
          delivery.id,
          ownerId,
          'unknown',
          'TELEGRAM_SENT_PERSISTENCE_AMBIGUOUS',
          sentAt,
        );
        console.warn(
          JSON.stringify({
            event: 'digest_delivery_persistence_ambiguous',
            digest_run_id: run.id,
            delivery_id: delivery.id,
          }),
        );
        continue;
      }
      await repository.writeAudit(
        run.id,
        'digest_delivery_sent',
        'worker',
        {
          delivery_id: delivery.id,
          destination: 'telegram',
          attempts: delivery.attempts,
          telegram_message_id: messageId,
          duration_ms: Date.now() - startedAt,
        },
        sentAt,
      );
      console.log(
        JSON.stringify({
          event: 'digest_delivery_sent',
          digest_run_id: run.id,
          delivery_id: delivery.id,
          attempts: delivery.attempts,
          duration_ms: Date.now() - startedAt,
        }),
      );
    } catch (error) {
      const failureTime = now();
      const telegramError =
        error instanceof TelegramDeliveryError
          ? error
          : new TelegramDeliveryError(
              'DIGEST_DELIVERY_INTERNAL_ERROR',
              'retry',
            );
      const maxAttempts = options.maxAttempts ?? 6;

      if (telegramError.disposition === 'unknown') {
        await repository.markDeliveryTerminal(
          delivery.id,
          ownerId,
          'unknown',
          telegramError.code,
          failureTime,
        );
      } else if (
        telegramError.disposition === 'retry' &&
        delivery.attempts < maxAttempts
      ) {
        await repository.markDeliveryRetry(
          delivery.id,
          ownerId,
          telegramError.code,
          telegramError.retryAt ?? retryAt(delivery.attempts, failureTime),
          failureTime,
        );
      } else {
        await repository.markDeliveryTerminal(
          delivery.id,
          ownerId,
          'failed',
          telegramError.code,
          failureTime,
        );
      }

      await repository.writeAudit(
        run.id,
        telegramError.disposition === 'unknown'
          ? 'digest_delivery_unknown'
          : telegramError.disposition === 'retry' &&
              delivery.attempts < maxAttempts
            ? 'digest_delivery_retry_scheduled'
            : 'digest_delivery_failed',
        'worker',
        {
          delivery_id: delivery.id,
          attempts: delivery.attempts,
          error_code: telegramError.code,
          disposition: telegramError.disposition,
          retry_at: telegramError.retryAt?.toISOString() ?? null,
        },
        failureTime,
      );
      console.warn(
        JSON.stringify({
          event: 'digest_delivery_failed',
          digest_run_id: run.id,
          delivery_id: delivery.id,
          attempts: delivery.attempts,
          error_code: telegramError.code,
          disposition: telegramError.disposition,
        }),
      );
    }
  }
}

export async function processScheduledDigest(
  env: Env,
  digestType: 'daily' | 'weekly',
  scheduledAt: Date,
  options: DigestWorkerOptions = {},
): Promise<void> {
  const now = options.now ?? (() => new Date());
  const service = new DigestService(env, { now });
  await service.generateAt(digestType, scheduledAt, {
    queueDelivery: true,
    actorType: 'scheduler',
  });
  await processDigestDeliveries(env, options);
}
