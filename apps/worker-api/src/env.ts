export type Env = Cloudflare.Env & {
  NOTION_WORKSPACE_ID?: string;
  NOTION_API_KEY?: string;

  MOCK_AI_ENABLED?: string; // Legacy test support
  AI_PROVIDERS_ENABLED?: string; // Comma separated list of approved policy providers e.g., "openrouter,gemini,cloudflare"
  AI_PROVIDER_IMPLEMENTATIONS?: string; // JSON mapping policy provider -> adapter class e.g., '{"openrouter": "cloudflare"}'
  OPENROUTER_API_KEY?: string;
  AI_PROVIDER_DEFAULT?: string;
  AI_PROVIDER_CLOUDFLARE_ENABLED?: string; // Legacy
};

export interface AppContext {
  Bindings: Env;
  Variables: { requestId: string };
}
