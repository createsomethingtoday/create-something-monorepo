/// <reference types="@cloudflare/workers-types" />
// See https://svelte.dev/docs/kit/types#app
// for information about these interfaces

interface Env {
	DB: D1Database;
	SESSIONS: KVNamespace;
	CACHE: KVNamespace;
	CIRCLE_DATA: KVNamespace;
	STORAGE: R2Bucket;
	RESEND_API_KEY: string;
	ARENA_API_TOKEN?: string;
	ARENA_CLIENT_ID?: string;
	ARENA_CLIENT_SECRET?: string;
	ENVIRONMENT: string;
}

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: Env;
			context: {
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
