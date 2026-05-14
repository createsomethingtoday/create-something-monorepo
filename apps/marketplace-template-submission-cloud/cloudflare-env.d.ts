interface CloudflareEnv {
  ASSETS?: Fetcher;
  GSAP_VALIDATION_WORKER?: Fetcher;
  UPLOADS_WORKER_URL?: string;
  UPLOADS_WORKER_SECRET?: string;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  CSRF_TRUSTED_ORIGINS?: string;
  ENVIRONMENT?: string;
  DEBUG_LOGS?: string;
  DEBUG_AIRTABLE?: string;
  BASE_URL?: string;
  ASSETS_PREFIX?: string;
  NEXT_PUBLIC_BASE_PATH?: string;
  NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_EXPECTED_HOSTNAME?: string;
  TEMPLATE_ANALYZER_API_BASE?: string;
}
