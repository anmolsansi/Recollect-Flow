type ConfigurableAiVars =
  | 'AI_PROVIDER_DEFAULT'
  | 'AI_PROVIDERS_ENABLED'
  | 'AI_PROVIDER_IMPLEMENTATIONS'
  | 'OPENROUTER_FREE_ACCOUNT_TIER'
  | 'CLOUDFLARE_AI_FREE_DAILY_NEURONS'
  | 'DIGEST_AI_ENABLED'
  | 'WEB_INBOX_BASE_URL'
  | 'LOGIN_RATE_LIMITER'
  | 'ASSETS'
  | 'HOSTED_SCHEDULED_WORK_ENABLED'
  | 'HOSTED_EXTERNAL_DISPATCH_ENABLED'
  | 'HOSTED_HTTP_DISPATCH_ENABLED'
  | 'HOSTED_BACKUP_AUTOCREATE_ENABLED';

export type Env = Omit<Cloudflare.Env, ConfigurableAiVars> & {
  // Generated Wrangler binding remains optional for existing local test fixtures.
  // The auth handler fails closed if it is absent on a real host.
  LOGIN_RATE_LIMITER?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
  ASSETS?: Fetcher;
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
  OPENROUTER_FREE_ACCOUNT_TIER?: string;
  // Optional stricter cap. Values above the published free allocation are clamped.
  CLOUDFLARE_AI_FREE_DAILY_NEURONS?: string;

  DIGEST_AI_ENABLED?: string;
  WEB_INBOX_BASE_URL?: string;
  // BG-31: both require explicit 'true' for *any* hosted scheduled work.
  // An absent or malformed value must never start production background jobs.
  HOSTED_SCHEDULED_WORK_ENABLED?: string;
  HOSTED_EXTERNAL_DISPATCH_ENABLED?: string;
  // BG-31: direct/manual provider actions require this *additional* opt-in.
  HOSTED_HTTP_DISPATCH_ENABLED?: string;
  // BG-28: set explicitly to 'true' only after approving weekly JSON backups.
  HOSTED_BACKUP_AUTOCREATE_ENABLED?: string;
};

export interface AppContext {
  Bindings: Env;
  Variables: { requestId: string };
}
