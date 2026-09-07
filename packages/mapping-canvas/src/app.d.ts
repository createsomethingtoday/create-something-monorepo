import type { D1Database } from '@cloudflare/workers-types';
declare global { namespace App { interface Platform { env: { DRAW_DB?: D1Database; DRAW_SHARE_RATE_SECRET?: string } } } }
export {};
