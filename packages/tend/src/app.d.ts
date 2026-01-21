/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Locals {
			tenant: import('$lib/sdk/types').Tenant | null;
		}

		interface Platform {
			env: {
				DB: D1Database;
				VECTORIZE?: VectorizeIndex;
				AI?: Ai;
			};
			context: ExecutionContext;
		}
	}
}

export {};
