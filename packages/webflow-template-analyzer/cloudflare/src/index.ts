import { Container, getContainer } from '@cloudflare/containers';
import type { DurableObject } from 'cloudflare:workers';

const DEFAULT_PORT = 7860;
const START_ENTRYPOINT = ['/bin/sh', '-lc', 'cd /app/backend && python3 server.py'];
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/([a-z0-9-]+\.)*webflow\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)*webflow\.io$/i,
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i,
];

interface Env {
  AnalyzerContainer: DurableObjectNamespace<AnalyzerContainer>;
  UPSTREAM_PORT?: string;
  SANDBOX_SLEEP_AFTER?: string;
  ALLOW_VISIBLE_BROWSER?: string;
  ANTHROPIC_API_KEY?: string;
  STEEL_API_KEY?: string;
  STEEL_SESSION_TIMEOUT_MS?: string;
  ANALYZER_API_TOKEN?: string;
  ANALYZE_RATE_LIMIT?: string;
  ANALYZE_RATE_WINDOW_SECONDS?: string;
  ANALYZER_EXTRA_ALLOWED_ORIGINS?: string;
}

type AnalyzerContainerStub = DurableObjectStub<AnalyzerContainer>;

export class AnalyzerContainer extends Container {
  defaultPort = DEFAULT_PORT;
  sleepAfter = '20m';
  enableInternet = true;
  pingEndpoint = 'container/health';

  constructor(ctx: DurableObject['ctx'], env: Env) {
    super(ctx, env);
    this.sleepAfter = normalizeSleepAfter(env.SANDBOX_SLEEP_AFTER);
  }
}

function normalizePort(value: string | undefined): number {
  const parsed = Number.parseInt(value?.trim() ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

function normalizeSleepAfter(value: string | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : '20m';
}

function buildContainerEnv(env: Env): Record<string, string> {
  const vars: Record<string, string> = {
    PORT: String(normalizePort(env.UPSTREAM_PORT)),
    ALLOW_VISIBLE_BROWSER: env.ALLOW_VISIBLE_BROWSER?.trim() || 'false',
  };

  const anthropicApiKey = env.ANTHROPIC_API_KEY?.trim();
  if (anthropicApiKey) {
    vars.ANTHROPIC_API_KEY = anthropicApiKey;
  }

  const steelApiKey = env.STEEL_API_KEY?.trim();
  if (steelApiKey) {
    vars.STEEL_API_KEY = steelApiKey;
  }

  const steelSessionTimeoutMs = env.STEEL_SESSION_TIMEOUT_MS?.trim();
  if (steelSessionTimeoutMs) {
    vars.STEEL_SESSION_TIMEOUT_MS = steelSessionTimeoutMs;
  }

  const analyzerApiToken = env.ANALYZER_API_TOKEN?.trim();
  if (analyzerApiToken) {
    vars.ANALYZER_API_TOKEN = analyzerApiToken;
  }

  const analyzeRateLimit = env.ANALYZE_RATE_LIMIT?.trim();
  if (analyzeRateLimit) {
    vars.ANALYZE_RATE_LIMIT = analyzeRateLimit;
  }

  const analyzeRateWindowSeconds = env.ANALYZE_RATE_WINDOW_SECONDS?.trim();
  if (analyzeRateWindowSeconds) {
    vars.ANALYZE_RATE_WINDOW_SECONDS = analyzeRateWindowSeconds;
  }

  const extraAllowedOrigins = env.ANALYZER_EXTRA_ALLOWED_ORIGINS?.trim();
  if (extraAllowedOrigins) {
    vars.ANALYZER_EXTRA_ALLOWED_ORIGINS = extraAllowedOrigins;
  }

  return vars;
}

async function ensureAnalyzerServer(container: AnalyzerContainerStub, env: Env): Promise<void> {
  const upstreamPort = normalizePort(env.UPSTREAM_PORT);

  try {
    await container.start({
      entrypoint: START_ENTRYPOINT,
      enableInternet: true,
      envVars: buildContainerEnv(env),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('already running')) {
      throw error;
    }
  }

  await container.startAndWaitForPorts(upstreamPort, {
    portReadyTimeoutMS: 120_000,
    waitInterval: 1_000,
  });
}

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function normalizeOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function resolveAllowedOrigin(request: Request, env: Env): string | null {
  const origin = normalizeOrigin(request.headers.get('Origin'));
  if (!origin) return null;

  if (origin === new URL(request.url).origin) {
    return origin;
  }

  const extraOrigins = new Set(
    parseCsv(env.ANALYZER_EXTRA_ALLOWED_ORIGINS).map((entry) => normalizeOrigin(entry)).filter(Boolean) as string[],
  );
  if (extraOrigins.has(origin)) {
    return origin;
  }

  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin)) ? origin : null;
}

function getCorsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers();
  const allowedOrigin = resolveAllowedOrigin(request, env);
  const requestedHeaders = request.headers.get('Access-Control-Request-Headers');

  if (allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
  }

  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  headers.set(
    'Access-Control-Allow-Headers',
    requestedHeaders && requestedHeaders.trim() !== ''
      ? requestedHeaders
      : 'Content-Type, Authorization, X-Analyzer-Token',
  );
  headers.set('Access-Control-Max-Age', '86400');
  headers.set('Vary', 'Origin');
  headers.set('X-Template-Analyzer-Host', 'cloudflare-containers');

  return headers;
}

function withCors(response: Response, request: Request, env: Env): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of getCorsHeaders(request, env).entries()) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function optionsResponse(request: Request, env: Env): Response {
  if (request.headers.get('Origin') && !resolveAllowedOrigin(request, env)) {
    return new Response('Origin not allowed', { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request, env),
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return optionsResponse(request, env);
    }

    const container = getContainer(env.AnalyzerContainer, 'primary');

    try {
      await ensureAnalyzerServer(container, env);
      return withCors(await container.containerFetch(request, normalizePort(env.UPSTREAM_PORT)), request, env);
    } catch (error) {
      return withCors(
        Response.json(
          {
            error: 'Analyzer container unavailable',
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 503 },
        ),
        request,
        env,
      );
    }
  },
};
