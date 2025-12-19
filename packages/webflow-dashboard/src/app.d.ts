/// <reference types="@sveltejs/adapter-cloudflare" />

declare global {
	namespace App {
		interface Platform {
			env: {
				SESSIONS: KVNamespace;
				UPLOADS: R2Bucket;
				AIRTABLE_API_KEY: string;
				AIRTABLE_BASE_ID: string;
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
