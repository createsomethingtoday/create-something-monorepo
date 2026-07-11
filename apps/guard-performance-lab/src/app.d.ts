import type { GuardD1Database } from '$lib/server/d1-store.js';

declare global {
  namespace App {
    interface Platform {
      env?: Record<string, string | GuardD1Database | undefined> & {
        ENVIRONMENT?: string;
        GUARD_LAB_DB?: GuardD1Database;
      };
    }
  }
}

export {};
