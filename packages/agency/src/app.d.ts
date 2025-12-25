/// <reference types="@cloudflare/workers-types" />
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				id: string;
				email: string;
				username: string;
				role: string;
				tier?: 'free' | 'pro' | 'agency';
			};
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB: D1Database;
				SESSIONS: KVNamespace;
				CACHE: KVNamespace;
				STORAGE: R2Bucket;
				RESEND_API_KEY: string;
				TURNSTILE_SECRET_KEY?: string;
				TURNSTILE_SITE_KEY?: string;
				ENVIRONMENT: string;
				TERMINAL_VERSION: string;
				DEFAULT_THEME: string;
				// Stripe
				STRIPE_SECRET_KEY: string;
				STRIPE_WEBHOOK_SECRET: string;
				STRIPE_PUBLISHABLE_KEY?: string;
				// Abundance Network
				WHATSAPP_VERIFY_TOKEN?: string;
				WHATSAPP_ACCESS_TOKEN?: string;
				WHATSAPP_PHONE_NUMBER_ID?: string;
			};
			context: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
