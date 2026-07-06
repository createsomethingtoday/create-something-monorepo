import { Eval, type Score } from '../harness.js';
import {
  bearerHeaders,
  httpProbe,
  parseJsonRecord,
  readEnv,
  readOptionalEnv,
  readOptionalEnvOrInfisicalSecret,
} from './shared.js';

type ContractInput = {
  name: string;
  routeUrl: string;
  routeToken?: string;
  query: string;
  bodyOverrides?: Record<string, unknown>;
};

type ContractOutput = {
  skipped: boolean;
  reason?: string;
  probeStatus: number | null;
  probeOk: boolean;
  hasStructuredJson: boolean;
  successFlagPresent: boolean;
  successIsTrue: boolean;
  durationMs: number;
  error?: string;
  responseMessage?: string;
};

const DEFAULT_ROUTE_URL =
  'https://playbook.mcp.createsomething.ltd/clients/halfdozen/agents/inbox-triage/run';

const TELEMETRY_CONTRACT_CASES = [
  {
    input: {
      name: 'playbook-inbox-triage',
      routeUrl: readEnv('MCP_FLEET_CONTRACT_URL', DEFAULT_ROUTE_URL),
      routeToken: readOptionalEnvOrInfisicalSecret('HALFDOZEN_AGENT_ROUTE_TOKEN', {
        secretName: readOptionalEnv('MCP_FLEET_CONTRACT_INFISICAL_SECRET_NAME') ?? 'HALFDOZEN_AGENT_ROUTE_TOKEN',
        environment:
          readOptionalEnv('MCP_FLEET_CONTRACT_INFISICAL_ENV') ?? readOptionalEnv('INFISICAL_ENV') ?? 'prod',
        path: readOptionalEnv('MCP_FLEET_CONTRACT_INFISICAL_PATH') ?? readOptionalEnv('INFISICAL_PATH') ?? '/',
        projectId:
          readOptionalEnv('MCP_FLEET_CONTRACT_INFISICAL_PROJECT_ID') ?? readOptionalEnv('INFISICAL_PROJECT_ID'),
      }),
      query: readEnv(
        'MCP_FLEET_CONTRACT_QUERY',
        'Langfuse eval contract check: return a structured successful response.',
      ),
      bodyOverrides: parseJsonRecord(readOptionalEnv('MCP_FLEET_CONTRACT_BODY_JSON')),
    } satisfies ContractInput,
    metadata: {
      suite: 'mcp-fleet',
      eval: 'fleet_telemetry_contract',
    },
  },
];

function routeOkScore(output: ContractOutput): Score {
  if (output.skipped) {
    return { name: 'route_ok', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'route_ok',
    score: output.probeOk ? 1 : 0,
    metadata: { status: output.probeStatus, error: output.error },
  };
}

function configuredScore(output: ContractOutput): Score {
  return {
    name: 'configured_for_live_run',
    score: output.skipped ? 0 : 1,
    metadata: { skipped: output.skipped, reason: output.reason },
  };
}

function structuredJsonScore(output: ContractOutput): Score {
  if (output.skipped) {
    return { name: 'structured_json', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'structured_json',
    score: output.hasStructuredJson ? 1 : 0,
    metadata: { status: output.probeStatus },
  };
}

function successFlagScore(output: ContractOutput): Score {
  if (output.skipped) {
    return { name: 'success_flag', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'success_flag',
    score: output.successFlagPresent && output.successIsTrue ? 1 : 0,
    metadata: { successPresent: output.successFlagPresent, successIsTrue: output.successIsTrue },
  };
}

function latencyScore(output: ContractOutput): Score {
  if (output.skipped) {
    return { name: 'latency_budget', score: null, metadata: { reason: output.reason } };
  }

  const score = output.durationMs <= 8_000 ? 1 : output.durationMs <= 12_000 ? 0.5 : 0;
  return {
    name: 'latency_budget',
    score,
    metadata: { durationMs: output.durationMs, thresholdMs: 8_000 },
  };
}

void Eval<ContractInput, ContractOutput>('create-something-mcp-fleet', {
  experimentName: 'fleet_telemetry_contract',
  data: TELEMETRY_CONTRACT_CASES,
  task: async (input): Promise<ContractOutput> => {
    if (!input.routeToken) {
      return {
        skipped: true,
        reason:
          'Set HALFDOZEN_AGENT_ROUTE_TOKEN or ensure the Infisical CLI can resolve it for the current context.',
        probeStatus: null,
        probeOk: false,
        hasStructuredJson: false,
        successFlagPresent: false,
        successIsTrue: false,
        durationMs: 0,
      };
    }

    const probe = await httpProbe({
      url: input.routeUrl,
      method: 'POST',
      headers: bearerHeaders(input.routeToken),
      body: {
        query: input.query,
        ...(input.bodyOverrides ?? {}),
      },
      timeoutMs: 20_000,
    });

    const success = probe.json?.success;
    const responseError = typeof probe.json?.error === 'string' ? probe.json.error : undefined;
    const responseMessage = typeof probe.json?.message === 'string' ? probe.json.message : undefined;

    return {
      skipped: false,
      probeStatus: probe.status,
      probeOk: probe.ok,
      hasStructuredJson: probe.json !== null,
      successFlagPresent: typeof success === 'boolean',
      successIsTrue: success === true,
      durationMs: probe.durationMs,
      error: probe.error ?? responseError,
      responseMessage,
    };
  },
  scores: [
    ({ output }) => configuredScore(output),
    ({ output }) => routeOkScore(output),
    ({ output }) => structuredJsonScore(output),
    ({ output }) => successFlagScore(output),
    ({ output }) => latencyScore(output),
  ],
});
