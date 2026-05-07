import { Container, getContainer } from '@cloudflare/containers';

const DEFAULT_PORT = 7860;
const START_ENTRYPOINT = ['/bin/sh', '-lc', 'cd /app/backend && python3 server.py'];
const CONTAINER_INSTANCE_NAME = 'primary-steel-v1';

interface Env {
  AnalyzerContainer: DurableObjectNamespace<AnalyzerContainer>;
  UPSTREAM_PORT?: string;
  SANDBOX_SLEEP_AFTER?: string;
  ALLOW_VISIBLE_BROWSER?: string;
  BROWSER_PROVIDER?: string;
  ANTHROPIC_API_KEY?: string;
  STEEL_API_KEY?: string;
  STEEL_SESSION_TIMEOUT_MS?: string;
}

type AnalyzerContainerStub = DurableObjectStub<AnalyzerContainer>;

export class AnalyzerContainer extends Container<Env> {
  defaultPort = DEFAULT_PORT;
  sleepAfter = '20m';
  enableInternet = true;
  pingEndpoint = 'container/health';

  constructor(ctx: DurableObjectState<Env>, env: Env) {
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
    BROWSER_PROVIDER: env.BROWSER_PROVIDER?.trim() || 'playwright',
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

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  headers.set('Access-Control-Allow-Headers', '*');
  headers.set('X-Template-Analyzer-Host', 'cloudflare-containers');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function optionsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return optionsResponse();
    }

    const container = getContainer(env.AnalyzerContainer, CONTAINER_INSTANCE_NAME);

    try {
      await ensureAnalyzerServer(container, env);
      return withCors(await container.containerFetch(request, normalizePort(env.UPSTREAM_PORT)));
    } catch (error) {
      return Response.json(
        {
          error: 'Analyzer container unavailable',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 503 },
      );
    }
  },
};
