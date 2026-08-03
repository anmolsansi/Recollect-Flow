import { sha256 } from '../captures/hash';
import type { Env } from '../env';
import { AiProviderRegistry } from '../jobs/ai/ai-provider.registry';
import { AppError } from '../shared/errors';
import {
  resolveDigestPeriod,
  type DigestPeriod,
  type DigestType,
} from './digest-period';
import {
  combineDigestText,
  parseDigestPayload,
  referencedItemIds,
  renderAiProjection,
  renderAiWording,
  renderDigest,
  type RenderedDigest,
} from './digest.renderer';
import { DigestRepository } from './digest.repository';
import { DigestSelector } from './digest.selector';
import type { DigestDelivery, DigestRun } from './digest.types';

interface DigestAiResult {
  result: {
    summary: string;
    topicGroups: Array<{ topic: string; items: string[] }>;
    topItems: string[];
    suggestedActions: string[];
    dormantIdeas?: string[];
  };
  provider: string;
  model: string;
  latencyMs: number;
  inputUnits: number;
  outputUnits: number;
}

export interface DigestAiClient {
  generateDigestSummary(
    prompt: string,
    privacyLevel: 'public',
  ): Promise<DigestAiResult>;
}

export interface DigestServiceOptions {
  now?: () => Date;
  aiClient?: DigestAiClient;
  aiEnabled?: boolean;
  webInboxBaseUrl?: string;
}

export interface GenerateDigestOptions {
  regenerate?: boolean;
  queueDelivery?: boolean;
  actorType?: 'scheduler' | 'admin' | 'system';
}

export interface GeneratedDigest {
  run: DigestRun;
  delivery: DigestDelivery | null;
  empty: boolean;
  replayed: boolean;
}

function safeFailureCode(error: unknown): string {
  if (error instanceof AppError) return error.code.slice(0, 80);
  if (error && typeof error === 'object' && 'errorCode' in error) {
    const value = String(error.errorCode).toUpperCase();
    if (/^[A-Z0-9_.-]{1,80}$/.test(value)) return value;
  }
  return 'DIGEST_AI_FAILED';
}

function requireWebInboxBaseUrl(value: string | undefined): string {
  if (!value?.trim()) {
    throw new AppError(
      500,
      'DIGEST_CONFIG_ERROR',
      'WEB_INBOX_BASE_URL is required for source-linked digests.',
    );
  }
  return value.trim();
}

export class DigestService {
  private readonly now: () => Date;
  private readonly aiClient: DigestAiClient | null;
  private readonly aiEnabled: boolean;
  private readonly webInboxBaseUrl: string;
  private readonly repository: DigestRepository;
  private readonly selector: DigestSelector;

  constructor(
    private readonly env: Env,
    options: DigestServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.aiEnabled = options.aiEnabled ?? env.DIGEST_AI_ENABLED === 'true';
    this.aiClient =
      options.aiClient ?? (this.aiEnabled ? new AiProviderRegistry(env) : null);
    this.webInboxBaseUrl = requireWebInboxBaseUrl(
      options.webInboxBaseUrl ?? env.WEB_INBOX_BASE_URL,
    );
    this.repository = new DigestRepository(env.DB);
    this.selector = new DigestSelector(env.DB);
  }

  async generateAt(
    digestType: DigestType,
    scheduledAt: Date,
    options: GenerateDigestOptions = {},
  ): Promise<GeneratedDigest> {
    return this.generatePeriod(
      resolveDigestPeriod(digestType, scheduledAt),
      options,
    );
  }

  async generatePeriod(
    period: DigestPeriod,
    options: GenerateDigestOptions = {},
  ): Promise<GeneratedDigest> {
    const regenerate = options.regenerate ?? false;
    const queueDelivery = options.queueDelivery ?? false;
    const actorType = options.actorType ?? 'system';

    if (!regenerate) {
      const existing = await this.repository.findRun(
        period.digestType,
        period.start,
        period.end,
        1,
      );
      if (existing) {
        const rendered = await this.renderCurrent(existing);
        const delivery = queueDelivery
          ? await this.repository.queueTelegramDelivery(
              existing.id,
              this.now(),
              rendered.empty ? 'EMPTY_PERIOD' : undefined,
            )
          : null;
        return {
          run: existing,
          delivery,
          empty: rendered.empty,
          replayed: true,
        };
      }
    }

    const generationVersion = regenerate
      ? await this.repository.nextGenerationVersion(
          period.digestType,
          period.start,
          period.end,
        )
      : 1;
    const payload = await this.selector.select(period);
    const canonicalPayloadJson = JSON.stringify(payload);
    const contentHash = await sha256(canonicalPayloadJson);
    const currentItems = await this.repository.loadCurrentItems(
      referencedItemIds(payload),
    );
    const deterministic = renderDigest(
      payload,
      currentItems,
      this.webInboxBaseUrl,
    );

    let aiText: string | null = null;
    let aiProvider: string | null = null;
    let aiModel: string | null = null;
    let aiLatencyMs: number | null = null;
    let aiInputUnits: number | null = null;
    let aiOutputUnits: number | null = null;
    let aiFailureCode: string | null = null;

    if (this.aiEnabled && !deterministic.empty) {
      try {
        if (!this.aiClient) throw new Error('Digest AI client unavailable');
        const result = await this.aiClient.generateDigestSummary(
          [
            'Synthesize these privacy-safe digest facts.',
            'Do not add facts, names, topics, links or actions that are not present.',
            'Keep wording concise and suitable for a plain-text Telegram message.',
            renderAiProjection(payload, currentItems),
          ].join('\n\n'),
          'public',
        );
        aiText = renderAiWording(result.result);
        aiProvider = result.provider;
        aiModel = result.model;
        aiLatencyMs = result.latencyMs;
        aiInputUnits = result.inputUnits;
        aiOutputUnits = result.outputUnits;
      } catch (error) {
        aiFailureCode = safeFailureCode(error);
      }
    }

    const createdAt = this.now();
    const candidateId = crypto.randomUUID();
    const run = await this.repository.insertRun({
      id: candidateId,
      digestType: period.digestType,
      periodStart: period.start,
      periodEnd: period.end,
      timezone: period.timezone,
      selectorVersion: payload.selectorVersion,
      generationVersion,
      sourceSnapshotAt: createdAt.toISOString(),
      canonicalPayloadJson,
      contentHash,
      deterministicText: deterministic.text,
      aiText,
      generationSource: aiText ? 'ai' : 'deterministic',
      aiProvider,
      aiModel,
      aiLatencyMs,
      aiInputUnits,
      aiOutputUnits,
      aiFailureCode,
      createdAt: createdAt.toISOString(),
    });
    const inserted = run.id === candidateId;
    if (inserted) {
      await this.repository.writeAudit(
        run.id,
        regenerate ? 'digest_regenerated' : 'digest_generated',
        actorType,
        {
          digest_type: period.digestType,
          period_start: period.start,
          period_end: period.end,
          generation_version: generationVersion,
          content_hash: contentHash,
          generation_source: run.generationSource,
          ai_failure_code: aiFailureCode,
          empty: deterministic.empty,
        },
        createdAt,
      );
    }

    const delivery = queueDelivery
      ? await this.repository.queueTelegramDelivery(
          run.id,
          this.now(),
          deterministic.empty ? 'EMPTY_PERIOD' : undefined,
        )
      : null;
    if (delivery && inserted) {
      await this.repository.writeAudit(
        run.id,
        deterministic.empty
          ? 'digest_delivery_skipped_empty'
          : 'digest_delivery_queued',
        actorType,
        { delivery_id: delivery.id, destination: 'telegram' },
        this.now(),
      );
    }

    return {
      run,
      delivery,
      empty: deterministic.empty,
      replayed: !inserted,
    };
  }

  async regenerate(
    digestRunId: string,
    queueDelivery: boolean,
    actorType: 'admin' | 'system' = 'admin',
  ): Promise<GeneratedDigest> {
    const original = await this.repository.getRun(digestRunId);
    if (!original) {
      throw new AppError(404, 'NOT_FOUND', 'Digest run not found.');
    }
    return this.generatePeriod(
      {
        digestType: original.digestType,
        timezone: 'Asia/Kolkata',
        start: original.periodStart,
        end: original.periodEnd,
      },
      { regenerate: true, queueDelivery, actorType },
    );
  }

  async renderCurrent(run: DigestRun): Promise<RenderedDigest> {
    const payload = parseDigestPayload(run.canonicalPayloadJson);
    const items = await this.repository.loadCurrentItems(
      referencedItemIds(payload),
    );
    return renderDigest(payload, items, this.webInboxBaseUrl);
  }

  async deliveryText(
    run: DigestRun,
  ): Promise<RenderedDigest & { message: string }> {
    const rendered = await this.renderCurrent(run);
    const unchanged = rendered.text === run.deterministicText;
    return {
      ...rendered,
      message: combineDigestText(unchanged ? run.aiText : null, rendered.text),
    };
  }

  async getDetails(id: string) {
    const run = await this.repository.getRun(id);
    if (!run) throw new AppError(404, 'NOT_FOUND', 'Digest run not found.');
    const [deliveries, audit] = await Promise.all([
      this.repository.listDeliveries(id),
      this.repository.listAudit(id),
    ]);
    return { run, deliveries, audit };
  }
}
