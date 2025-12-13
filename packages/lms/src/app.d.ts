/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

declare global {
  namespace App {
    interface Platform {
      env: {
        DB: D1Database;
        KV: KVNamespace;
      };
      context: ExecutionContext;
      caches: CacheStorage;
    }
  }
}

export {};
