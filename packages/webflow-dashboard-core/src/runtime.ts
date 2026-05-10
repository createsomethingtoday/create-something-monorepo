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
  KNOCK_API_KEY?: string;
  KNOCK_LOGIN_WORKFLOW_KEY?: string;
  KNOCK_LOGIN_ENABLED?: string;
}

const PROCESS_ENV_KEYS = [
  'AIRTABLE_API_KEY',
  'AIRTABLE_BASE_ID',
  'RESEND_API_KEY',
  'CRON_SECRET',
  'ADMIN_EMAILS',
  'CSRF_TRUSTED_ORIGINS',
  'ENVIRONMENT',
  'DEBUG_LOGS',
  'DEBUG_AIRTABLE',
  'BASE_URL',
  'ASSETS_PREFIX',
  'NEXT_PUBLIC_BASE_PATH',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
  'TURNSTILE_SECRET_KEY',
  'TURNSTILE_EXPECTED_HOSTNAME',
  'KNOCK_API_KEY',
  'KNOCK_LOGIN_WORKFLOW_KEY',
  'KNOCK_LOGIN_ENABLED',
] as const satisfies readonly (keyof DashboardCloudflareEnv)[];

function getProcessEnvFallback(): DashboardCloudflareEnv | null {
  if (typeof process === 'undefined' || !process.env) {
    return null;
  }

  const env: DashboardCloudflareEnv = {};

  for (const key of PROCESS_ENV_KEYS) {
    const value = process.env[key];
    if (typeof value === 'string' && value.length > 0) {
      env[key] = value;
    }
  }

  return Object.keys(env).length > 0 ? env : null;
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
    return (context?.env as DashboardCloudflareEnv | undefined) || getProcessEnvFallback();
  } catch {
    return getProcessEnvFallback();
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
