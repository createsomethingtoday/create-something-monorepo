// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB: D1Database;
				SESSIONS: KVNamespace;
				CACHE: KVNamespace;
				STORAGE: R2Bucket;
				BROWSER: Fetcher; // Cloudflare Browser Rendering binding
				AI: Ai; // Cloudflare Workers AI binding
				SANDBOX: unknown; // Cloudflare Sandbox binding
				RESEND_API_KEY: string;
				ENVIRONMENT: string;
				TERMINAL_VERSION: string;
				DEFAULT_THEME: string;
				ENABLE_SANDBOX: string;
				SANDBOX_TIER: string;
				MAX_EXECUTION_TIME: string;
				MAX_MEMORY: string;
			};
			context: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
