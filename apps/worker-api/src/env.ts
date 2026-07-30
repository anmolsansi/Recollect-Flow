export type Env = Cloudflare.Env & {
  AI_PROVIDER_CLOUDFLARE_ENABLED?: string;
};

export interface AppContext {
  Bindings: Env;
  Variables: { requestId: string };
}
