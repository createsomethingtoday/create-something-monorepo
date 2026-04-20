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
			auth: {
				userId: string | null;
				sessionId: string | null;
				isAuthenticated: boolean;
			};
			user?: {
				id: string;
				email: string;
				tier: 'free' | 'pro' | 'agency';
				source: 'clerk';
				analytics_opt_out?: boolean;
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
				IDENTITY_WORKER_ADMIN_API_KEY?: string;
				// Optional gateway bearer injected into strict MCP access bundles.
				MCP_HUB_GATEWAY_BEARER?: string;
				// Partner auth portal
				PARTNER_PORTAL_ADMIN_KEY?: string;
				// Composio runtime (partner auth + toolkit status)
				COMPOSIO_API_KEY?: string;
				COMPOSIO_BASE_URL?: string;
				COMPOSIO_AUTH_CONFIG_MAP_JSON?: string;
				OSO_URL?: string;
				OSO_API_KEY?: string;
				OSO_FETCH_TIMEOUT_MS?: string;
				OSO_BOOTSTRAP_POLICY?: string;
				// WORKWAY Integration (AI-powered spec intake)
				// Get API key from: https://workway.co/settings/api-keys
				WORKWAY_API_KEY?: string;
				WORKWAY_ORG_ID?: string;
				// Optional: Override API URL (defaults to workway-api-gateway.half-dozen.workers.dev)
				// Set to api.workway.co once DNS route is configured
				WORKWAY_API_URL?: string;
				// Clerk identity
				CLERK_PUBLISHABLE_KEY?: string;
				CLERK_SECRET_KEY?: string;
				CLERK_JWT_KEY?: string;
				CLERK_AUTHORIZED_PARTIES?: string;
				CLERK_ISSUER_URL?: string;
				AGENCY_INTERNAL_API_KEY?: string;
				AGENCY_OPERATOR_EMAILS?: string;
			};
			context: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
