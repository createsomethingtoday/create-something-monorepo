export interface WorkerAuthEnv {
  WEBFLOW_SITE_ANALYZER_MCP_API_KEY?: string;
  MCP_API_KEY?: string;
}

export function getWorkerApiKey(env: WorkerAuthEnv): string | null {
  const value = env.WEBFLOW_SITE_ANALYZER_MCP_API_KEY?.trim()
    ?? env.MCP_API_KEY?.trim()
    ?? '';
  return value || null;
}

function parseBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

export function isWorkerRequestAuthorized(request: Request, env: WorkerAuthEnv): boolean {
  const configuredToken = getWorkerApiKey(env);
  if (!configuredToken) return false;

  const suppliedToken = parseBearerToken(request)
    ?? request.headers.get('x-api-key')?.trim()
    ?? new URL(request.url).searchParams.get('token')?.trim()
    ?? null;
  return suppliedToken === configuredToken;
}
