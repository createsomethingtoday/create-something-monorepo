/// <reference types="@cloudflare/workers-types" />
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

// SavvyCal embed API
interface Window {
	SavvyCal?: (action: string, options?: { link?: string }) => void;
}

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
				// Email sender addresses
				EMAIL_FROM_SITES?: string;
				EMAIL_FROM_PRODUCTS?: string;
				EMAIL_FROM_BILLING?: string;
				// Stripe
				STRIPE_SECRET_KEY: string;
				STRIPE_WEBHOOK_SECRET: string;
				STRIPE_PUBLISHABLE_KEY?: string;
				// Templates Platform
				TEMPLATES_PLATFORM_API_URL?: string;
				TEMPLATES_PLATFORM_API_SECRET?: string;
				// Abundance Network
				WHATSAPP_VERIFY_TOKEN?: string;
				WHATSAPP_ACCESS_TOKEN?: string;
				WHATSAPP_PHONE_NUMBER_ID?: string;
				// SavvyCal
				SAVVYCAL_API_KEY?: string;
				// Identity Worker (LMS provisioning)
				IDENTITY_WORKER_URL?: string;
				IDENTITY_WORKER_SECRET?: string;
				// WORKWAY Integration (AI-powered spec intake)
				// Get API key from: https://workway.co/settings/api-keys
				WORKWAY_API_KEY?: string;
				WORKWAY_ORG_ID?: string;
				// Optional: Override API URL (defaults to workway-api-gateway.half-dozen.workers.dev)
				// Set to api.workway.co once DNS route is configured
				WORKWAY_API_URL?: string;
			};
			context: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
