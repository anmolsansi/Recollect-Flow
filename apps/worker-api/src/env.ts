export type Env = Cloudflare.Env & {
  NOTION_WORKSPACE_ID?: string;
  NOTION_API_KEY?: string;

  MOCK_AI_ENABLED?: string;
  OPENROUTER_API_KEY?: string;
  AI_PROVIDER_DEFAULT?: string;
  AI_PROVIDER_CLOUDFLARE_ENABLED?: string;
};

export interface AppContext {
  Bindings: Env;
  Variables: { requestId: string };
}
