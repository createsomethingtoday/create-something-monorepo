/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    interface Platform {
      env?: {
        ENVIRONMENT?: string;
        ALLOW_CLERK_ACCESS_PREVIEW?: string;
        CLERK_ALLOW_ANY_AUTHENTICATED?: string;
        CLERK_ALLOWED_EMAIL_DOMAINS?: string;
        CLERK_ALLOWED_EMAILS?: string;
        CLERK_ALLOWED_ORGANIZATION_IDS?: string;
        CLERK_ALLOWED_ORGANIZATION_ROLES?: string;
        CLERK_ISSUER?: string;
        CLERK_JWKS_URL?: string;
        CLERK_SESSION_COOKIE_NAME?: string;
        CLERK_SIGN_IN_URL?: string;
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
