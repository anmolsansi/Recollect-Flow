import type { D1Migration } from '@cloudflare/vitest-pool-workers';

declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS?: D1Migration[];
      MIGRATION_DB?: D1Database;
      OPE222_MIGRATION_DB?: D1Database;
    }
  }
}

export {};
