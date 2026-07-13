/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    interface Platform {
      env?: {
        ENVIRONMENT?: string;
        ALLOW_CS_AUTH_PREVIEW?: string;
        CS_AUTH_ALLOW_ANY_AUTHENTICATED?: string;
        CS_AUTH_ALLOWED_EMAIL_DOMAINS?: string;
        CS_AUTH_ALLOWED_EMAILS?: string;
        CS_AUTH_ALLOWED_ROLES?: string;
        CS_AUTH_ALLOWED_SUBJECTS?: string;
        CS_AUTH_ALLOWED_TENANT_IDS?: string;
        CS_AUTH_SIGN_IN_URL?: string;
        CS_IDENTITY_AUDIENCE?: string;
        CS_IDENTITY_ISSUER?: string;
        CS_IDENTITY_JWKS_URL?: string;
        IDENTITY_API_URL?: string;
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
