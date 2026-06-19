/// <reference types="@sveltejs/kit" />

declare global {
	interface D1PreparedStatement {
		bind(...values: unknown[]): D1PreparedStatement;
		first<T = unknown>(column?: string): Promise<T | null>;
		all<T = unknown>(): Promise<{ results: T[] }>;
		run(): Promise<{ success: boolean; meta?: Record<string, unknown> }>;
	}

	interface D1Database {
		prepare(query: string): D1PreparedStatement;
		batch?(statements: D1PreparedStatement[]): Promise<
			Array<{ success: boolean; meta?: Record<string, unknown> }>
		>;
	}

	interface R2HttpMetadata {
		contentType?: string;
		contentDisposition?: string;
	}

	interface R2PutOptions {
		httpMetadata?: R2HttpMetadata;
	}

	interface R2ObjectBody {
		body: ReadableStream | null;
		httpMetadata?: R2HttpMetadata;
		size?: number;
		arrayBuffer(): Promise<ArrayBuffer>;
	}

	interface R2Bucket {
		put(key: string, value: ArrayBuffer, options?: R2PutOptions): Promise<unknown>;
		get(key: string): Promise<R2ObjectBody | null>;
	}

	namespace App {
		interface Platform {
			env?: {
				DB?: D1Database;
				UPLOADS?: R2Bucket;
				AGENCY_BASE_URL?: string;
				ENVIRONMENT?: string;
				ALLOW_AGENCY_ACCESS_PREVIEW?: string;
				ABUNDANCE_REQUIRE_SIGNED_INTAKE?: string;
				ABUNDANCE_INTAKE_SIGNING_SECRET?: string;
				ABUNDANCE_INTAKE_BRIDGE_SECRET?: string;
				INDEED_MCP_BASE_URL?: string;
				INDEED_MCP_API_KEY?: string;
				ABUNDANCE_GEO_MAPBOX_ACCESS_TOKEN?: string;
				ABUNDANCE_INTAKE_EMAIL_FROM?: string;
				RESEND_API_KEY?: string;
				AGENCY_ABUNDANCE_API_BASE_URL?: string;
				AGENCY_STAFF_ONBOARDING_URL?: string;
				AGENCY_INTERNAL_API_KEY?: string;
				ABUNDANCE_STAFF_ONBOARDING_TOKEN?: string;
				DIFY_CREATE_SOMETHING_GUIDE_AGENT_API_KEY?: string;
				DIFY_YOUTUBE_TRANSCRIPT_NOTION_AGENT_API_KEY?: string;
				DIFY_BLONDISH_HUB_API_KEY?: string;
				DIFY_MORGAN_HUB_API_KEY?: string;
				DIFY_VIV_HUB_API_KEY?: string;
				DIFY_C3_HUB_API_KEY?: string;
				DIFY_AARON_HUB_API_KEY?: string;
				DIFY_ABUNDANCE_HUB_API_KEY?: string;
				DIFY_SHEA_HUB_API_KEY?: string;
				DIFY_PABLO_HUB_API_KEY?: string;
				DIFY_ERIC_HUB_API_KEY?: string;
				DIFY_NATALIA_HUB_API_KEY?: string;
				DIFY_MARIANA_HUB_API_KEY?: string;
				DIFY_VICKI_HUB_API_KEY?: string;
				DIFY_TEMPLATE_REVIEW_HUB_API_KEY?: string;
			};
			context?: unknown;
			caches?: unknown;
		}
	}
}

export {};
