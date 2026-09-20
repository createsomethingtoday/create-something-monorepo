import type { D1Database } from '@cloudflare/workers-types';
declare global {
  namespace App {
    interface Platform {
      env: {
        DB: D1Database;
        ENVIRONMENT: string;
        PCN_ADMIN_EMAILS: string;
        CLOUDFLARE_ACCOUNT_ID: string;
        CLOUDFLARE_STREAM_API_TOKEN?: string;
        PCN_RATE_LIMIT?: { limit(input: { key: string }): Promise<{ success: boolean }> };
        [key: string]: unknown;
      };
    }
    interface Locals {
      identity: { subject: string; email: string; role: 'admin' | 'member' | 'blocked' } | null;
    }
  }
}
export {};
