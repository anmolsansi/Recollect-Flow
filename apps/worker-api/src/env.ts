export interface Env {
  DB: D1Database;
  CAPTURE_TOKEN: string;
  ADMIN_TOKEN: string;
}

export interface AppContext {
  Bindings: Env;
  Variables: { requestId: string };
}
