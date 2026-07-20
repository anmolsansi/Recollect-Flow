export const POLICY_VERSION = '2026-07-20.1';

export type PrivacyLevel = 'unknown' | 'public' | 'personal' | 'sensitive';
export type AiProvider = 'workers_ai' | 'gemini' | 'ollama' | 'none';
export type Modality =
  'text' | 'image' | 'pdf' | 'file' | 'audio' | 'embedding';

const ALL_MODALITIES: readonly Modality[] = [
  'text',
  'image',
  'pdf',
  'file',
  'audio',
  'embedding',
];

export const ALLOWED_DATA_MATRIX: Readonly<
  Record<PrivacyLevel, Readonly<Record<AiProvider, readonly Modality[]>>>
> = {
  unknown: {
    workers_ai: [],
    gemini: [],
    ollama: [],
    none: ALL_MODALITIES,
  },
  public: {
    workers_ai: ALL_MODALITIES,
    gemini: ['image', 'pdf'],
    ollama: ALL_MODALITIES,
    none: ALL_MODALITIES,
  },
  personal: {
    workers_ai: [],
    gemini: [],
    ollama: ALL_MODALITIES,
    none: ALL_MODALITIES,
  },
  sensitive: {
    workers_ai: [],
    gemini: [],
    ollama: ALL_MODALITIES,
    none: ALL_MODALITIES,
  },
};

export interface RouteDecision {
  provider: AiProvider;
  reason: string;
  policyVersion: string;
}

export interface RouteInput {
  privacyLevel: PrivacyLevel;
  modality: Modality;
  requestedProvider?: AiProvider;
  availableProviders?: readonly AiProvider[];
  hostedQuotaAvailable?: boolean;
  localProcessingApproved?: boolean;
  containsRestrictedCategory?: boolean;
}

const HOSTED_PROVIDERS = new Set<AiProvider>(['workers_ai', 'gemini']);

export class PolicyService {
  route(input: RouteInput): RouteDecision {
    const available = new Set(
      input.availableProviders ?? ['workers_ai', 'gemini', 'ollama', 'none'],
    );
    const hostedQuotaAvailable = input.hostedQuotaAvailable ?? true;
    const localApproved = input.localProcessingApproved ?? false;

    let requested = input.requestedProvider;
    if (!requested) {
      requested =
        input.privacyLevel === 'public'
          ? 'workers_ai'
          : input.privacyLevel === 'personal'
            ? 'ollama'
            : 'none';
    }

    if (input.containsRestrictedCategory && HOSTED_PROVIDERS.has(requested)) {
      return this.none(
        'Restricted categories can never be sent to a hosted provider.',
      );
    }

    const allowedModalities =
      ALLOWED_DATA_MATRIX[input.privacyLevel][requested];
    if (!allowedModalities.includes(input.modality)) {
      return this.none(
        `${requested} is not approved for ${input.privacyLevel} ${input.modality} data.`,
      );
    }
    if (!available.has(requested)) {
      return this.none(`${requested} is unavailable; routing fails closed.`);
    }
    if (HOSTED_PROVIDERS.has(requested) && !hostedQuotaAvailable) {
      return this.none('Hosted AI quota is unavailable; routing fails closed.');
    }
    if (
      requested === 'ollama' &&
      input.privacyLevel === 'sensitive' &&
      !localApproved
    ) {
      return this.none(
        'Sensitive content requires an explicit local-processing approval.',
      );
    }

    return {
      provider: requested,
      reason: `${requested} is approved by the ${POLICY_VERSION} policy.`,
      policyVersion: POLICY_VERSION,
    };
  }

  getAiProviderForPrivacy(level: PrivacyLevel): RouteDecision {
    return this.route({ privacyLevel: level, modality: 'text' });
  }

  private none(reason: string): RouteDecision {
    return { provider: 'none', reason, policyVersion: POLICY_VERSION };
  }
}
