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
      };
      context?: unknown;
      caches?: unknown;
    }
  }
}

export {};
