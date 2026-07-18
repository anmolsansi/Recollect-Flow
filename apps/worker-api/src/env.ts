export type Env = Cloudflare.Env;

export interface AppContext {
  Bindings: Env;
  Variables: { requestId: string };
}
