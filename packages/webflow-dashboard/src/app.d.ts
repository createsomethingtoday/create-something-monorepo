/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Locals {
			user?: {
				id: string;
				email: string;
			};
		}
		interface Platform {
			env: {
				SESSIONS: KVNamespace;
				CACHE: KVNamespace;
				IMAGES: R2Bucket;
				AIRTABLE_API_KEY: string;
				AIRTABLE_BASE_ID: string;
				ENVIRONMENT: string;
			};
			context: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
