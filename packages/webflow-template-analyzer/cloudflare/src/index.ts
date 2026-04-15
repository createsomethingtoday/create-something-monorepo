import { Container, getContainer } from '@cloudflare/containers';

const DEFAULT_PORT = 7860;
const START_ENTRYPOINT = ['/bin/sh', '-lc', 'cd /app/backend && python3 server.py'];

interface Env {
  AnalyzerContainer: DurableObjectNamespace<AnalyzerContainer>;
  UPSTREAM_PORT?: string;
  SANDBOX_SLEEP_AFTER?: string;
  ANTHROPIC_API_KEY?: string;
}

type AnalyzerContainerStub = DurableObjectStub<AnalyzerContainer>;

export class AnalyzerContainer extends Container {
  defaultPort = DEFAULT_PORT;
  sleepAfter = '20m';
  enableInternet = true;
  pingEndpoint = 'container/health';
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
  };

  const anthropicApiKey = env.ANTHROPIC_API_KEY?.trim();
  if (anthropicApiKey) {
    vars.ANTHROPIC_API_KEY = anthropicApiKey;
  }

  return vars;
}

async function ensureAnalyzerServer(container: AnalyzerContainerStub, env: Env): Promise<void> {
  await container.startAndWaitForPorts({
    startOptions: {
      entrypoint: START_ENTRYPOINT,
      enableInternet: true,
      envVars: buildContainerEnv(env),
    },
    ports: [normalizePort(env.UPSTREAM_PORT)],
    cancellationOptions: {
      portReadyTimeoutMS: 120_000,
      waitInterval: 1_000,
    },
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

    const container = getContainer(env.AnalyzerContainer, 'primary');
    container.sleepAfter = normalizeSleepAfter(env.SANDBOX_SLEEP_AFTER);

    try {
      await ensureAnalyzerServer(container, env);
      return withCors(await container.fetch(request));
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
