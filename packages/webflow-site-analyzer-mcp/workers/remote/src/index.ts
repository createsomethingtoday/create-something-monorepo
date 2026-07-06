import { Container, getContainer } from '@cloudflare/containers';

const DEFAULT_PORT = 8788;
const ANALYZER_ENTRYPOINT = ['/bin/sh', '-lc', 'cd /app && node dist/http.js'];

interface Env {
  AnalyzerContainer: DurableObjectNamespace<AnalyzerContainer>;
  SANDBOX_SLEEP_AFTER?: string;
  UPSTREAM_PORT?: string;
  WEBFLOW_SITE_ANALYZER_MCP_API_KEY?: string;
  MCP_API_KEY?: string;
  STEEL_API_KEY?: string;
  BROWSERLESS_API_KEY?: string;
  BROWSERLESS_TOKEN?: string;
  BROWSERLESS_ENDPOINT?: string;
  WEBFLOW_ANALYZER_REGISTRY_PATH?: string;
  WEBFLOW_TEMPLATE_REVIEW_MAX_CONCURRENT_JOBS?: string;
  WEBFLOW_TEMPLATE_REVIEW_MAX_QUEUE_SIZE?: string;
  MCP_TELEMETRY_ENABLED?: string;
  MCP_TELEMETRY_PATH?: string;
  LANGFUSE_ENABLED?: string;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_HOST?: string;
  LANGFUSE_BASE_URL?: string;
  LANGFUSE_PROJECT_NAME?: string;
}

type AnalyzerContainerStub = DurableObjectStub<AnalyzerContainer>;

export class AnalyzerContainer extends Container {
  defaultPort = DEFAULT_PORT;
  sleepAfter = '24h';
  enableInternet = true;
  pingEndpoint = 'container/health';
}

function getUpstreamPort(env: Env): number {
  const parsed = Number.parseInt(env.UPSTREAM_PORT?.trim() ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

function setIfPresent(target: Record<string, string>, key: string, value: string | undefined): void {
  const normalized = value?.trim();
  if (normalized) target[key] = normalized;
}

function buildAnalyzerEnv(env: Env): Record<string, string> {
  const result: Record<string, string> = {};

  setIfPresent(result, 'PORT', String(getUpstreamPort(env)));
  setIfPresent(result, 'WEBFLOW_SITE_ANALYZER_MCP_API_KEY', env.WEBFLOW_SITE_ANALYZER_MCP_API_KEY);
  setIfPresent(result, 'MCP_API_KEY', env.MCP_API_KEY);
  setIfPresent(result, 'STEEL_API_KEY', env.STEEL_API_KEY);
  setIfPresent(result, 'BROWSERLESS_API_KEY', env.BROWSERLESS_API_KEY);
  setIfPresent(result, 'BROWSERLESS_TOKEN', env.BROWSERLESS_TOKEN ?? env.BROWSERLESS_API_KEY);
  setIfPresent(result, 'BROWSERLESS_ENDPOINT', env.BROWSERLESS_ENDPOINT);
  setIfPresent(result, 'WEBFLOW_ANALYZER_REGISTRY_PATH', env.WEBFLOW_ANALYZER_REGISTRY_PATH);
  setIfPresent(
    result,
    'WEBFLOW_TEMPLATE_REVIEW_MAX_CONCURRENT_JOBS',
    env.WEBFLOW_TEMPLATE_REVIEW_MAX_CONCURRENT_JOBS,
  );
  setIfPresent(result, 'WEBFLOW_TEMPLATE_REVIEW_MAX_QUEUE_SIZE', env.WEBFLOW_TEMPLATE_REVIEW_MAX_QUEUE_SIZE);
  setIfPresent(result, 'MCP_TELEMETRY_ENABLED', env.MCP_TELEMETRY_ENABLED);
  setIfPresent(result, 'MCP_TELEMETRY_PATH', env.MCP_TELEMETRY_PATH);
  setIfPresent(result, 'LANGFUSE_ENABLED', env.LANGFUSE_ENABLED);
  setIfPresent(result, 'LANGFUSE_PUBLIC_KEY', env.LANGFUSE_PUBLIC_KEY);
  setIfPresent(result, 'LANGFUSE_SECRET_KEY', env.LANGFUSE_SECRET_KEY);
  setIfPresent(result, 'LANGFUSE_HOST', env.LANGFUSE_HOST);
  setIfPresent(result, 'LANGFUSE_BASE_URL', env.LANGFUSE_BASE_URL);
  setIfPresent(result, 'LANGFUSE_PROJECT_NAME', env.LANGFUSE_PROJECT_NAME);

  return result;
}

function workerExpectsAuth(env: Env): boolean {
  return Boolean(env.WEBFLOW_SITE_ANALYZER_MCP_API_KEY?.trim() || env.MCP_API_KEY?.trim());
}

async function readAnalyzerHealth(container: AnalyzerContainerStub): Promise<Record<string, unknown> | null> {
  try {
    const response = await container.containerFetch('http://container/health');
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function ensureAnalyzerServer(container: AnalyzerContainerStub, env: Env): Promise<void> {
  await container.startAndWaitForPorts({
    startOptions: {
      envVars: buildAnalyzerEnv(env),
      entrypoint: ANALYZER_ENTRYPOINT,
      enableInternet: true,
    },
    ports: [getUpstreamPort(env)],
    cancellationOptions: {
      portReadyTimeoutMS: 60_000,
      waitInterval: 1_000,
    },
  });

  const currentHealth = await readAnalyzerHealth(container);
  const auth = currentHealth?.auth as { configured?: unknown } | undefined;
  if (workerExpectsAuth(env) && auth?.configured !== true) {
    throw new Error('Analyzer process started without propagated auth configuration.');
  }
}

async function proxyToContainer(request: Request, env: Env): Promise<Response> {
  const container = getContainer(env.AnalyzerContainer, 'primary');

  try {
    await ensureAnalyzerServer(container, env);
    const upstream = await container.fetch(request);
    const headers = new Headers(upstream.headers);
    headers.set('X-Webflow-Site-Analyzer-Host', 'cloudflare-container');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch (error) {
    return Response.json(
      {
        error: 'Analyzer container unavailable',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return proxyToContainer(request, env);
  },
};
