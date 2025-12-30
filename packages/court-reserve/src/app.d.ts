/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}
		interface Locals {
			facility?: import('$lib/types').Facility;
		}
		interface PageData {}
		interface PageState {}
		interface Platform {
			env: {
				DB: D1Database;
				FACILITY_CACHE: KVNamespace;
				SESSIONS: KVNamespace;
				ASSETS: R2Bucket;
				NOTIFICATION_QUEUE: Queue;
				COURT_STATE: DurableObjectNamespace;
				AI?: Ai;
				STRIPE_SECRET_KEY?: string;
				STRIPE_WEBHOOK_SECRET?: string;
				STRIPE_PRICE_BASIC?: string;
				STRIPE_PRICE_PRO?: string;
				STRIPE_PRICE_ENTERPRISE?: string;
				TWILIO_ACCOUNT_SID?: string;
				TWILIO_AUTH_TOKEN?: string;
				TWILIO_FROM_NUMBER?: string;
				SENDGRID_API_KEY?: string;
			};
			cf?: CfProperties;
			ctx?: ExecutionContext;
		}
	}
}

export {};
