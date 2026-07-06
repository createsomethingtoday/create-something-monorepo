import { Eval, type Score } from '../harness.js';
import { httpProbe, parseJsonRecord, readEnv, readOptionalEnv } from './shared.js';

type ErrorPathInput = {
  name: string;
  routeUrl: string;
  query: string;
  bodyOverrides?: Record<string, unknown>;
};

type ErrorPathOutput = {
  skipped: boolean;
  reason?: string;
  status: number | null;
  non2xx: boolean;
  unauthorizedOrForbidden: boolean;
  hasStructuredError: boolean;
  durationMs: number;
  error?: string;
};

const DEFAULT_ROUTE_URL =
  'https://playbook.mcp.createsomething.ltd/clients/halfdozen/agents/inbox-triage/run';

const ERROR_PATH_CASES = [
  {
    input: {
      name: 'playbook-route-without-auth',
      routeUrl: readEnv('MCP_FLEET_ERROR_URL', DEFAULT_ROUTE_URL),
      query: readEnv(
        'MCP_FLEET_ERROR_QUERY',
        'Langfuse eval error-path check: this request intentionally omits auth.',
      ),
      bodyOverrides: parseJsonRecord(readOptionalEnv('MCP_FLEET_ERROR_BODY_JSON')),
    } satisfies ErrorPathInput,
    metadata: {
      suite: 'mcp-fleet',
      eval: 'fleet_error_path_tracing',
    },
  },
];

function non2xxScore(output: ErrorPathOutput): Score {
  if (output.skipped) {
    return { name: 'non_2xx_observed', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'non_2xx_observed',
    score: output.non2xx ? 1 : 0,
    metadata: { status: output.status, error: output.error },
  };
}

function configuredScore(output: ErrorPathOutput): Score {
  return {
    name: 'configured_for_live_run',
    score: output.skipped ? 0 : 1,
    metadata: { skipped: output.skipped, reason: output.reason },
  };
}

function authStatusScore(output: ErrorPathOutput): Score {
  if (output.skipped) {
    return { name: 'auth_status_code', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'auth_status_code',
    score: output.unauthorizedOrForbidden ? 1 : 0,
    metadata: { status: output.status },
  };
}

function structuredErrorScore(output: ErrorPathOutput): Score {
  if (output.skipped) {
    return { name: 'structured_error_payload', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'structured_error_payload',
    score: output.hasStructuredError ? 1 : 0,
    metadata: { status: output.status },
  };
}

void Eval<ErrorPathInput, ErrorPathOutput>('create-something-mcp-fleet', {
  experimentName: 'fleet_error_path_tracing',
  data: ERROR_PATH_CASES,
  task: async (input): Promise<ErrorPathOutput> => {
    if (!input.routeUrl) {
      return {
        skipped: true,
        reason: 'Set MCP_FLEET_ERROR_URL to an MCP route that requires authentication.',
        status: null,
        non2xx: false,
        unauthorizedOrForbidden: false,
        hasStructuredError: false,
        durationMs: 0,
      };
    }

    // Intentionally omit Authorization header to force the auth error path.
    const probe = await httpProbe({
      url: input.routeUrl,
      method: 'POST',
      body: {
        query: input.query,
        ...(input.bodyOverrides ?? {}),
      },
      timeoutMs: 15_000,
    });

    const status = probe.status;
    const non2xx = status !== null && (status < 200 || status >= 300);
    const unauthorizedOrForbidden = status === 401 || status === 403;
    const hasStructuredError =
      probe.json !== null &&
      (typeof probe.json.error === 'string' ||
        (typeof probe.json.success === 'boolean' && probe.json.success === false));

    return {
      skipped: false,
      status,
      non2xx,
      unauthorizedOrForbidden,
      hasStructuredError,
      durationMs: probe.durationMs,
      error: probe.error,
    };
  },
  scores: [
    ({ output }) => configuredScore(output),
    ({ output }) => non2xxScore(output),
    ({ output }) => authStatusScore(output),
    ({ output }) => structuredErrorScore(output),
  ],
});
