/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
				KV: KVNamespace;
				SITE_BUCKET: R2Bucket;
				BUILD_QUEUE: Queue;
				ADMIN_TOKEN?: string;
				STRIPE_SECRET_KEY: string;
				STRIPE_WEBHOOK_SECRET: string;
			};
		}

		interface Locals {
			user?: {
				id: string;
				email: string;
			};
		}
	}
}

export {};
