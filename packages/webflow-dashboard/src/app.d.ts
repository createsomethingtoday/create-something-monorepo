/// <reference types="@sveltejs/adapter-cloudflare" />

declare global {
	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
				SESSIONS: KVNamespace;
				UPLOADS: R2Bucket;
				AIRTABLE_API_KEY: string;
				AIRTABLE_BASE_ID: string;
				CRON_SECRET?: string;
				TEMPLATE_OFFER_DIAGNOSTIC_TOKEN?: string;
				ADMIN_EMAILS?: string;
				CSRF_TRUSTED_ORIGINS?: string;
				SUBMISSION_STATUS_API_URL?: string;
				ENVIRONMENT?: string;
				DEBUG_LOGS?: string;
				DEBUG_AIRTABLE?: string;
			};
			context: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
		interface Locals {
			user?: {
				email: string;
			};
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
