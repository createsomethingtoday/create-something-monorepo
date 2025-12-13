/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Locals {
			user?: {
				email: string;
			};
		}
		interface Platform {
			env: {
				DB: D1Database;
				MEDIA: R2Bucket;
				SESSIONS: KVNamespace;
				AUTH_SECRET: string;
				ADMIN_EMAIL: string;
				ADMIN_PASSWORD_HASH: string;
			};
			context: ExecutionContext;
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
