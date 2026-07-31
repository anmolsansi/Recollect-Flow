type ConfigurableAiVars =
  | 'AI_PROVIDER_DEFAULT'
  | 'AI_PROVIDERS_ENABLED'
  | 'AI_PROVIDER_IMPLEMENTATIONS';

export type Env = Omit<Cloudflare.Env, ConfigurableAiVars> & {
  NOTION_WORKSPACE_ID?: string;
  NOTION_API_KEY?: string;

  MOCK_AI_ENABLED?: string;
  AI_PROVIDERS_ENABLED?: string; // Comma-separated approved provider IDs.
  AI_PROVIDER_IMPLEMENTATIONS?: string; // JSON provider-to-implementation mapping.
  OPENROUTER_API_KEY?: string;
  AI_PROVIDER_DEFAULT?: string;
  AI_PROVIDER_CLOUDFLARE_ENABLED?: string; // Legacy
};

export interface AppContext {
  Bindings: Env;
  Variables: { requestId: string };
}
