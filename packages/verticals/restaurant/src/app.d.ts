declare global {
	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
				KV: KVNamespace;
				R2: R2Bucket;
			};
			context: {
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
