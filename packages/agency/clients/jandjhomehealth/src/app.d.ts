/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Locals {
			admin?: {
				email: string;
			};
		}

		interface Platform {
			env?: {
				DB?: import('@cloudflare/workers-types').D1Database;
				OPENAI_API_KEY?: string;
				ADMIN_EMAILS?: string;
				ADMIN_INITIAL_PASSWORD?: string;
				ADMIN_PASSWORD?: string;
				RESEND_API_KEY?: string;
				RESEND_FROM_EMAIL?: string;
				PUBLIC_BASE_URL?: string;
			};
			context?: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches?: CacheStorage & { default: Cache };
		}
	}
}

export {};
