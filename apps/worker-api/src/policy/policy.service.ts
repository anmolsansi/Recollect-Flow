export const POLICY_VERSION = '2026-07-21.1';

export type PrivacyLevel = 'unknown' | 'public' | 'personal' | 'sensitive';
export type AiProvider = 'openrouter' | 'gemini' | 'none';
export type CredentialSource = 'app_managed' | 'user_provided' | 'none';
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
    openrouter: [],
    gemini: [],
    none: ALL_MODALITIES,
  },
  public: {
    openrouter: ALL_MODALITIES,
    gemini: ALL_MODALITIES,
    none: ALL_MODALITIES,
  },
  personal: {
    openrouter: ALL_MODALITIES,
    gemini: ALL_MODALITIES,
    none: ALL_MODALITIES,
  },
  sensitive: {
    openrouter: [],
    gemini: [],
    none: ALL_MODALITIES,
  },
};

export interface RouteDecision {
  provider: AiProvider;
  fallbackProviders: readonly AiProvider[];
  credentialSource: CredentialSource;
  hostedProcessingConsent: boolean;
  zeroDataRetentionRequired: boolean;
  dataCollectionDenied: boolean;
  reason: string;
  policyVersion: string;
}

export interface RouteInput {
  privacyLevel: PrivacyLevel;
  modality: Modality;
  requestedProvider?: AiProvider;
  availableProviders?: readonly AiProvider[];
  hostedQuotaAvailable?: boolean;
  credentialSource?: CredentialSource;
  hostedProcessingConsent?: boolean;
  zeroDataRetentionEnforced?: boolean;
  dataCollectionDenied?: boolean;
  containsRestrictedCategory?: boolean;
}

const HOSTED_PROVIDERS = new Set<AiProvider>(['openrouter', 'gemini']);

export class PolicyService {
  route(input: RouteInput): RouteDecision {
    const available = new Set(
      input.availableProviders ?? ['openrouter', 'gemini', 'none'],
    );
    const hostedQuotaAvailable = input.hostedQuotaAvailable ?? true;
    const hostedProcessingConsent = input.hostedProcessingConsent ?? false;

    let requested = input.requestedProvider;
    if (!requested) {
      requested = input.privacyLevel === 'public' ? 'openrouter' : 'none';
    }
    if (
      input.privacyLevel === 'public' &&
      requested === 'openrouter' &&
      !available.has('openrouter') &&
      available.has('gemini')
    ) {
      requested = 'gemini';
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
    if (input.privacyLevel === 'personal' && !hostedProcessingConsent) {
      return this.none(
        'Personal content requires explicit hosted-processing consent.',
      );
    }

    const credentialSource =
      input.credentialSource ??
      (input.privacyLevel === 'public' ? 'app_managed' : 'none');
    if (input.privacyLevel === 'personal' && credentialSource === 'none') {
      return this.none(
        'Personal content requires a user-provided key or approved app-managed routing.',
      );
    }
    if (
      input.privacyLevel === 'personal' &&
      credentialSource === 'app_managed' &&
      requested !== 'openrouter'
    ) {
      return this.none(
        'App-managed Personal routing is limited to OpenRouter.',
      );
    }
    if (
      input.privacyLevel === 'personal' &&
      credentialSource === 'app_managed' &&
      (!input.zeroDataRetentionEnforced || !input.dataCollectionDenied)
    ) {
      return this.none(
        'App-managed Personal routing requires ZDR and denied data collection.',
      );
    }

    const fallbackProviders =
      input.privacyLevel === 'public' &&
      requested === 'openrouter' &&
      available.has('gemini')
        ? (['gemini'] as const)
        : [];

    return {
      provider: requested,
      fallbackProviders,
      credentialSource,
      hostedProcessingConsent,
      zeroDataRetentionRequired:
        input.privacyLevel === 'personal' && requested === 'openrouter',
      dataCollectionDenied:
        input.privacyLevel === 'personal' && requested === 'openrouter',
      reason: `${requested} is approved by the ${POLICY_VERSION} policy.`,
      policyVersion: POLICY_VERSION,
    };
  }

  getAiProviderForPrivacy(level: PrivacyLevel): RouteDecision {
    return this.route({ privacyLevel: level, modality: 'text' });
  }

  private none(reason: string): RouteDecision {
    return {
      provider: 'none',
      fallbackProviders: [],
      credentialSource: 'none',
      hostedProcessingConsent: false,
      zeroDataRetentionRequired: false,
      dataCollectionDenied: false,
      reason,
      policyVersion: POLICY_VERSION,
    };
  }
}
