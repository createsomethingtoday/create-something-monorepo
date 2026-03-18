interface CloudflareEnv {
  ASSETS?: Fetcher;
  DB?: D1Database;
  SESSIONS?: KVNamespace;
  UPLOADS?: R2Bucket;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  RESEND_API_KEY?: string;
  CRON_SECRET?: string;
  ADMIN_EMAILS?: string;
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
}
