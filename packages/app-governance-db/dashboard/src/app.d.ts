/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

declare global {
  namespace App {
    interface Platform {
      env?: {
        DB: D1Database;
        APP_GOVERNANCE_DASHBOARD_KEY?: string;
        DASHBOARD_ACCESS_KEY?: string;
      };
    }
  }
}

export {};
