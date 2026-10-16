type ConfigurableAiVars =
  | 'AI_PROVIDER_DEFAULT'
  | 'AI_PROVIDERS_ENABLED'
  | 'AI_PROVIDER_IMPLEMENTATIONS'
  | 'OPENROUTER_FREE_ACCOUNT_TIER'
  | 'CLOUDFLARE_AI_FREE_DAILY_NEURONS'
  | 'DIGEST_AI_ENABLED'
  | 'WEB_INBOX_BASE_URL';

export type Env = Omit<Cloudflare.Env, ConfigurableAiVars> & {
  // Generated Wrangler binding remains optional for existing local test fixtures.
  // The auth handler fails closed if it is absent on a real host.
  LOGIN_RATE_LIMITER?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
  CAPTURE_TOKEN_NEXT?: string;
  CAPTURE_TOKEN_ID?: string;
  CAPTURE_TOKEN_ROTATION?: string;
  ADMIN_TOKEN_NEXT?: string;
  ADMIN_TOKEN_ID?: string;
  ADMIN_TOKEN_ROTATION?: string;
  LOCAL_WORKER_TOKEN_NEXT?: string;
  LOCAL_WORKER_TOKEN_ID?: string;
  LOCAL_WORKER_TOKEN_ROTATION?: string;
  NOTION_WORKSPACE_ID?: string;
  NOTION_API_KEY?: string;

  MOCK_AI_ENABLED?: string;
  AI_PROVIDERS_ENABLED?: string; // Comma-separated approved provider IDs.
  AI_PROVIDER_IMPLEMENTATIONS?: string; // JSON provider-to-implementation mapping.
  OPENROUTER_API_KEY?: string;
  AI_PROVIDER_DEFAULT?: string;
  AI_PROVIDER_CLOUDFLARE_ENABLED?: string; // Legacy

  // OPE-227 capacity controls. `standard` is the fail-safe default.
  OPENROUTER_FREE_ACCOUNT_TIER?: 'standard' | 'qualified';
  // Optional stricter cap. Values above the published free allocation are clamped.
  CLOUDFLARE_AI_FREE_DAILY_NEURONS?: string;

  DIGEST_AI_ENABLED?: string;
  WEB_INBOX_BASE_URL?: string;
};

export interface AppContext {
  Bindings: Env;
  Variables: { requestId: string };
}
