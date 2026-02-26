/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}

		interface Locals {
			user?: {
				id: string;
				notionWorkspaceId: string;
			};
		}

		interface PageData {
			user?: {
				id: string;
				notionWorkspaceId: string;
			};
		}

		interface Platform {
			env?: {
				DB: D1Database;
				KV: KVNamespace;
				AI: Ai;
				NOTION_CLIENT_ID: string;
				NOTION_CLIENT_SECRET: string;
				ENCRYPTION_KEY: string;
				ENVIRONMENT: string;
				NOTION_API_VERSION: string;
			};
			context: ExecutionContext;
			caches: CacheStorage;
		}
	}
}

export {};
