// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				id: string;
				email: string;
				name: string;
				membership: boolean;
				createdAt: string;
				role?: string;
			};
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
				env: {
					DB?: import('@cloudflare/workers-types').D1Database;
					VIDEO_ASSETS?: import('@cloudflare/workers-types').R2Bucket;
					SESSIONS?: import('@cloudflare/workers-types').KVNamespace;
					VIDEO_STATS?: import('@cloudflare/workers-types').KVNamespace;
				AI?: any;
				ANTHROPIC_API_KEY?: string;
				STRIPE_SECRET_KEY?: string;
				STRIPE_WEBHOOK_SECRET?: string;
				RESEND_API_KEY?: string;
				TRANSCRIPT_API_KEY?: string;
				VIDEO_ADMIN_EMAILS?: string;
				VIDEO_SERIES_ADMIN_EMAILS?: string;
				CLOUDFLARE_ACCOUNT_ID?: string;
				CF_ACCOUNT_ID?: string;
				CLOUDFLARE_STREAM_ACCOUNT_ID?: string;
				CLOUDFLARE_STREAM_API_TOKEN?: string;
				STREAM_API_TOKEN?: string;
				CLOUDFLARE_STREAM_CUSTOMER_CODE?: string;
				STREAM_CUSTOMER_CODE?: string;
				CLOUDFLARE_STREAM_WEBHOOK_SECRET?: string;
				CLOUDFLARE_STREAM_ALLOWED_ORIGINS?: string;
				STREAM_ALLOWED_ORIGINS?: string;
				VIDEO_STREAM_TOKEN_TTL_SECONDS?: string;
				VIDEO_INGEST_API_TOKEN?: string;
			};
		}
	}
}

export {};
