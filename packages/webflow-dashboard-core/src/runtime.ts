export interface DashboardCloudflareEnv {
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

export async function getCloudflareEnv(
  runtime: { env?: DashboardCloudflareEnv } = {}
): Promise<DashboardCloudflareEnv | null> {
  if (runtime.env) {
    return runtime.env;
  }

  try {
    const moduleName = '@opennextjs/cloudflare';
    const { getCloudflareContext } = (await import(moduleName)) as {
      getCloudflareContext?: (options: { async: true }) => Promise<{ env?: DashboardCloudflareEnv }>;
    };

    if (!getCloudflareContext) {
      return null;
    }

    const context = await getCloudflareContext({ async: true });
    return (context?.env as DashboardCloudflareEnv | undefined) || null;
  } catch {
    return null;
  }
}

export async function getEnvValue(
  name: keyof DashboardCloudflareEnv | string,
  runtime: { env?: DashboardCloudflareEnv } = {}
): Promise<string | undefined> {
  const env = await getCloudflareEnv(runtime);
  if (env && typeof env[name as keyof DashboardCloudflareEnv] === 'string') {
    return env[name as keyof DashboardCloudflareEnv] as string;
  }

  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }

  return undefined;
}
