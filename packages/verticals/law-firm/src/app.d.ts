// See https://kit.svelte.dev/docs/types#app
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
				KV: KVNamespace;
				R2: R2Bucket;
				WORKWAY_API_KEY?: string;
				WORKWAY_ORG_ID?: string;
			};
			context: ExecutionContext;
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
