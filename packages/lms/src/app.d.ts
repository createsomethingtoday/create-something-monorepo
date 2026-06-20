/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

/**
 * LMS Type Definitions
 *
 * Canon: Types are the skeleton of understanding.
 */

declare global {
	namespace App {
		interface Locals {
			user?: {
				id: string;
				email: string;
				name?: string;
				tier: 'free' | 'pro' | 'agency';
				source: 'workway' | 'templates' | 'io' | 'space' | 'lms';
				analytics_opt_out?: boolean;
			};
		}

		interface Platform {
			env: {
				DB: D1Database;
				KV: KVNamespace;
				ENVIRONMENT: string;
				IDENTITY_WORKER_URL: string;
				ANALYTICS_SERVICE_TOKEN?: string;
				RESEND_API_KEY: string;
			};
			context: ExecutionContext;
			caches: CacheStorage;
		}
	}
}

export {};
