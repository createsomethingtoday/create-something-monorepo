import { Eval, type Score } from '../harness.js';
import {
  getByPath,
  httpProbe,
  parseJsonRecord,
  readEnv,
  readOptionalEnv,
} from './shared.js';
import { HUB_CASE_CONFIGS, readOneEnv } from './hub-cases.js';

type LegacyAccountIsolationInput = {
  mode: 'legacy_echo';
  name: string;
  routeUrl?: string;
  routeToken?: string;
  accountHeaderName: string;
  expectedAccountPath: string;
  accountA: string;
  accountB: string;
  body?: Record<string, unknown>;
};

type HubAccountIsolationInput = {
  mode: 'hub_connection_status';
  name: string;
  url: string;
  authToken?: string;
  sessionToken?: string;
  expectedAccountId: string;
  spoofHeaderName: string;
  spoofAccountId: string;
};

type AccountIsolationInput = LegacyAccountIsolationInput | HubAccountIsolationInput;

type AccountIsolationOutput = {
  skipped: boolean;
  reason?: string;
  mode: AccountIsolationInput['mode'];
  statusPrimary: number | null;
  statusSecondary: number | null;
  reachable: boolean;
  durationMs: number;
  accountSignalPresent: boolean;
  accountSignalCorrect: boolean;
  isolationEnforced: boolean;
  actualAccountId?: string;
  expectedAccountId?: string;
  spoofAccountId?: string;
  connectionStatusTool?: string;
  extractedAccountA?: string;
  extractedAccountB?: string;
  errorPrimary?: string;
  errorSecondary?: string;
};

type JsonRecord = Record<string, unknown>;
type McpToolSearchResult = {
  toolName?: string;
  servicesStatus: number | null;
  searchStatus: number | null;
  error?: string;
};

const DEFAULT_SPOOF_HEADER_NAME = 'X-MCP-Account-Id';
const DEFAULT_SPOOF_ACCOUNT_ID = 'acct_spoof_attempt';

function parseLaneFilter(value: string | undefined): string[] | null {
  if (!value) return null;
  const lanes = value
    .split(',')
    .map((lane) => lane.trim().toLowerCase())
    .filter(Boolean);
  return lanes.length > 0 ? lanes : null;
}

function parseMcpStructuredRecord(json: JsonRecord | null): JsonRecord | null {
  const result = json?.result;
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const structuredContent = (result as JsonRecord).structuredContent;
    if (structuredContent && typeof structuredContent === 'object' && !Array.isArray(structuredContent)) {
      return structuredContent as JsonRecord;
    }

    const content = (result as JsonRecord).content;
    if (Array.isArray(content)) {
      const firstText = content[0];
      if (firstText && typeof firstText === 'object' && !Array.isArray(firstText)) {
        const rawText = (firstText as JsonRecord).text;
        if (typeof rawText === 'string' && rawText.trim().length > 0) {
          try {
            const parsed = JSON.parse(rawText) as unknown;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              return parsed as JsonRecord;
            }
          } catch {
            // Ignore non-JSON tool text payloads.
          }
        }
      }
    }
  }

  return null;
}

function buildMcpHeaders(authToken: string, sessionToken?: string, extraHeaders?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'MCP-Protocol-Version': '2025-03-26',
    ...(sessionToken ? { 'X-MCP-Session-Token': sessionToken } : {}),
    ...(extraHeaders ?? {}),
  };
}

async function callHubTool(input: {
  url: string;
  authToken: string;
  sessionToken?: string;
  toolName: string;
  arguments: Record<string, unknown>;
  extraHeaders?: Record<string, string>;
}) {
  return httpProbe({
    url: input.url,
    method: 'POST',
    headers: buildMcpHeaders(input.authToken, input.sessionToken, input.extraHeaders),
    body: {
      jsonrpc: '2.0',
      id: `account-isolation-${input.toolName}`,
      method: 'tools/call',
      params: {
        name: input.toolName,
        arguments: input.arguments,
      },
    },
    timeoutMs: 15_000,
  });
}

function extractActiveServiceNames(structured: JsonRecord | null): string[] {
  const services = structured?.services;
  if (!Array.isArray(services)) return [];

  return services
    .map((service) => {
      if (!service || typeof service !== 'object' || Array.isArray(service)) return null;
      const record = service as JsonRecord;
      if (record.activeInDiscovery !== true) return null;

      const visibleProxyTools = record.visibleProxyTools;
      if (typeof visibleProxyTools !== 'number' || visibleProxyTools <= 0) return null;

      return typeof record.name === 'string' && record.name.trim().length > 0 ? record.name : null;
    })
    .filter((serviceName): serviceName is string => Boolean(serviceName));
}

function extractConnectionStatusToolName(structured: JsonRecord | null): string | undefined {
  const tools = structured?.tools;
  if (!Array.isArray(tools)) return undefined;

  for (const tool of tools) {
    if (!tool || typeof tool !== 'object' || Array.isArray(tool)) continue;
    const proxyToolName = (tool as JsonRecord).proxyToolName;
    if (typeof proxyToolName === 'string' && proxyToolName.endsWith('__connection_status')) {
      return proxyToolName;
    }

    const name = (tool as JsonRecord).name;
    if (typeof name === 'string' && name.endsWith('__connection_status')) {
      return name;
    }
  }

  return undefined;
}

async function discoverConnectionStatusTool(input: HubAccountIsolationInput): Promise<McpToolSearchResult> {
  if (!input.authToken) {
    return {
      servicesStatus: null,
      searchStatus: null,
      error: 'Missing auth token',
    };
  }

  const servicesProbe = await callHubTool({
    url: input.url,
    authToken: input.authToken,
    sessionToken: input.sessionToken,
    toolName: 'hub_list_services',
    arguments: {},
  });

  if (!servicesProbe.ok) {
    return {
      servicesStatus: servicesProbe.status,
      searchStatus: null,
      error: servicesProbe.error,
    };
  }

  const services = extractActiveServiceNames(parseMcpStructuredRecord(servicesProbe.json));
  let lastSearchStatus: number | null = null;
  let lastSearchError: string | undefined;

  for (const serviceName of services) {
    const searchProbe = await callHubTool({
      url: input.url,
      authToken: input.authToken,
      sessionToken: input.sessionToken,
      toolName: 'hub_search_proxy_tools',
      arguments: {
        serverName: serviceName,
        query: 'connection_status',
        limit: 20,
      },
    });

    lastSearchStatus = searchProbe.status;
    if (!searchProbe.ok) {
      lastSearchError = searchProbe.error;
      continue;
    }

    const toolName = extractConnectionStatusToolName(parseMcpStructuredRecord(searchProbe.json));
    if (toolName) {
      return {
        toolName,
        servicesStatus: servicesProbe.status,
        searchStatus: searchProbe.status,
      };
    }
  }

  return {
    servicesStatus: servicesProbe.status,
    searchStatus: lastSearchStatus,
    error: lastSearchError ?? 'No visible connection_status tool found for active services.',
  };
}

function buildLegacyCase() {
  return {
    input: {
      mode: 'legacy_echo',
      name: 'header-based-account-isolation',
      routeUrl: readOptionalEnv('MCP_ACCOUNT_ISOLATION_URL'),
      routeToken: readOptionalEnv('MCP_ACCOUNT_ISOLATION_TOKEN'),
      accountHeaderName: readEnv('MCP_ACCOUNT_HEADER_NAME', 'x-mcp-account-id'),
      expectedAccountPath: readEnv('MCP_ACCOUNT_FIELD_PATH', 'accountId'),
      accountA: readEnv('MCP_ACCOUNT_A', 'tenant-a'),
      accountB: readEnv('MCP_ACCOUNT_B', 'tenant-b'),
      body: parseJsonRecord(readOptionalEnv('MCP_ACCOUNT_ISOLATION_BODY_JSON')),
    } satisfies LegacyAccountIsolationInput,
    metadata: {
      suite: 'mcp-fleet',
      eval: 'account_isolation',
    },
  };
}

function buildHubCases() {
  const laneFilter = parseLaneFilter(readOptionalEnv('MCP_ACCOUNT_ISOLATION_LANES'));
  const filteredConfigs =
    laneFilter && laneFilter.length > 0
      ? HUB_CASE_CONFIGS.filter((config) => config.expectedAccountId && laneFilter.includes(config.name))
      : HUB_CASE_CONFIGS.filter((config) => config.expectedAccountId);
  const selectedConfigs =
    filteredConfigs.length > 0 ? filteredConfigs : HUB_CASE_CONFIGS.filter((config) => config.expectedAccountId);

  return selectedConfigs.map((config) => {
    const authToken = readOneEnv(config.authTokenEnvVars);
    const sessionToken = config.sessionTokenEnvVar ? process.env[config.sessionTokenEnvVar]?.trim() : undefined;

    return {
      input: {
        mode: 'hub_connection_status',
        name: config.name,
        url: config.url,
        authToken,
        ...(sessionToken ? { sessionToken } : {}),
        expectedAccountId: config.expectedAccountId!,
        spoofHeaderName: readEnv('MCP_ACCOUNT_SPOOF_HEADER_NAME', DEFAULT_SPOOF_HEADER_NAME),
        spoofAccountId: readEnv('MCP_ACCOUNT_SPOOF_ACCOUNT_ID', DEFAULT_SPOOF_ACCOUNT_ID),
      } satisfies HubAccountIsolationInput,
      metadata: {
        suite: 'mcp-fleet',
        eval: 'account_isolation',
      },
    };
  });
}

const ACCOUNT_ISOLATION_CASES =
  readEnv('MCP_ACCOUNT_ISOLATION_MODE', '').toLowerCase() === 'legacy_echo' || Boolean(readOptionalEnv('MCP_ACCOUNT_ISOLATION_URL'))
    ? [buildLegacyCase()]
    : buildHubCases();

function reachabilityScore(output: AccountIsolationOutput): Score {
  if (output.skipped) {
    return { name: 'account_route_reachable', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'account_route_reachable',
    score: output.reachable ? 1 : 0,
    metadata: {
      mode: output.mode,
      statusPrimary: output.statusPrimary,
      statusSecondary: output.statusSecondary,
      errorPrimary: output.errorPrimary,
      errorSecondary: output.errorSecondary,
    },
  };
}

function configuredScore(output: AccountIsolationOutput): Score {
  return {
    name: 'configured_for_live_run',
    score: output.skipped ? 0 : 1,
    metadata: { skipped: output.skipped, reason: output.reason },
  };
}

function reflectionScoreA(output: AccountIsolationOutput): Score {
  if (output.skipped) {
    return { name: 'account_signal_present', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'account_signal_present',
    score: output.accountSignalPresent ? 1 : 0,
    metadata: {
      mode: output.mode,
      actualAccountId: output.actualAccountId,
      extractedAccountA: output.extractedAccountA,
      extractedAccountB: output.extractedAccountB,
      connectionStatusTool: output.connectionStatusTool,
    },
  };
}

function reflectionScoreB(output: AccountIsolationOutput): Score {
  if (output.skipped) {
    return { name: 'account_signal_correct', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'account_signal_correct',
    score: output.accountSignalCorrect ? 1 : 0,
    metadata: {
      mode: output.mode,
      actualAccountId: output.actualAccountId,
      expectedAccountId: output.expectedAccountId,
      extractedAccountA: output.extractedAccountA,
      extractedAccountB: output.extractedAccountB,
    },
  };
}

function separationScore(output: AccountIsolationOutput): Score {
  if (output.skipped) {
    return { name: 'account_isolation_enforced', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'account_isolation_enforced',
    score: output.isolationEnforced ? 1 : 0,
    metadata: {
      mode: output.mode,
      actualAccountId: output.actualAccountId,
      expectedAccountId: output.expectedAccountId,
      spoofAccountId: output.spoofAccountId,
      extractedA: output.extractedAccountA,
      extractedB: output.extractedAccountB,
    },
  };
}

async function runLegacyEchoMode(input: LegacyAccountIsolationInput): Promise<AccountIsolationOutput> {
  if (!input.routeUrl) {
    return {
      skipped: true,
      reason: 'Set MCP_ACCOUNT_ISOLATION_URL or leave it unset to use the default Hub account-routing mode.',
      mode: input.mode,
      statusPrimary: null,
      statusSecondary: null,
      reachable: false,
      durationMs: 0,
      accountSignalPresent: false,
      accountSignalCorrect: false,
      isolationEnforced: false,
    };
  }

  const sharedHeaders = input.routeToken ? { Authorization: `Bearer ${input.routeToken}` } : {};
  const method = input.body ? 'POST' : 'GET';
  const started = Date.now();

  const [probeA, probeB] = await Promise.all([
    httpProbe({
      url: input.routeUrl,
      method,
      headers: {
        ...sharedHeaders,
        [input.accountHeaderName]: input.accountA,
      },
      body: input.body,
    }),
    httpProbe({
      url: input.routeUrl,
      method,
      headers: {
        ...sharedHeaders,
        [input.accountHeaderName]: input.accountB,
      },
      body: input.body,
    }),
  ]);

  const extractedAccountA = getByPath(probeA.json, input.expectedAccountPath);
  const extractedAccountB = getByPath(probeB.json, input.expectedAccountPath);
  const extractedAString = typeof extractedAccountA === 'string' ? extractedAccountA : undefined;
  const extractedBString = typeof extractedAccountB === 'string' ? extractedAccountB : undefined;
  const reflectsAccountA = extractedAString === input.accountA;
  const reflectsAccountB = extractedBString === input.accountB;

  return {
    skipped: false,
    mode: input.mode,
    statusPrimary: probeA.status,
    statusSecondary: probeB.status,
    reachable: probeA.ok && probeB.ok,
    durationMs: Date.now() - started,
    accountSignalPresent: Boolean(extractedAString && extractedBString),
    accountSignalCorrect: reflectsAccountA && reflectsAccountB,
    isolationEnforced: reflectsAccountA && reflectsAccountB && extractedAString !== extractedBString,
    extractedAccountA: extractedAString,
    extractedAccountB: extractedBString,
    errorPrimary: probeA.error,
    errorSecondary: probeB.error,
  };
}

async function runHubConnectionStatusMode(input: HubAccountIsolationInput): Promise<AccountIsolationOutput> {
  if (!input.authToken) {
    return {
      skipped: true,
      reason: `Missing required env var (one of): ${
        HUB_CASE_CONFIGS.find((config) => config.name === input.name)?.authTokenEnvVars.join(', ') ?? 'unknown'
      }`,
      mode: input.mode,
      statusPrimary: null,
      statusSecondary: null,
      reachable: false,
      durationMs: 0,
      accountSignalPresent: false,
      accountSignalCorrect: false,
      isolationEnforced: false,
      expectedAccountId: input.expectedAccountId,
      spoofAccountId: input.spoofAccountId,
    };
  }

  const started = Date.now();
  const discovery = await discoverConnectionStatusTool(input);
  if (!discovery.toolName) {
    return {
      skipped: false,
      reason: discovery.error ?? 'No visible connection_status tool found.',
      mode: input.mode,
      statusPrimary: discovery.searchStatus ?? discovery.servicesStatus,
      statusSecondary: discovery.servicesStatus,
      reachable: false,
      durationMs: Date.now() - started,
      accountSignalPresent: false,
      accountSignalCorrect: false,
      isolationEnforced: false,
      expectedAccountId: input.expectedAccountId,
      spoofAccountId: input.spoofAccountId,
      errorPrimary: discovery.error,
    };
  }

  const executeProbe = await callHubTool({
    url: input.url,
    authToken: input.authToken,
    sessionToken: input.sessionToken,
    toolName: 'hub_execute_proxy_tool',
    arguments: {
      proxyToolName: discovery.toolName,
      args: {},
    },
    extraHeaders: {
      [input.spoofHeaderName]: input.spoofAccountId,
    },
  });

  const structured = parseMcpStructuredRecord(executeProbe.json);
  const actualAccountId = typeof structured?.entityId === 'string' ? structured.entityId : undefined;
  const accountSignalCorrect = actualAccountId === input.expectedAccountId;

  return {
    skipped: false,
    mode: input.mode,
    statusPrimary: executeProbe.status,
    statusSecondary: discovery.searchStatus ?? discovery.servicesStatus,
    reachable: executeProbe.ok,
    durationMs: Date.now() - started,
    accountSignalPresent: Boolean(actualAccountId),
    accountSignalCorrect,
    isolationEnforced: accountSignalCorrect && actualAccountId !== input.spoofAccountId,
    actualAccountId,
    expectedAccountId: input.expectedAccountId,
    spoofAccountId: input.spoofAccountId,
    connectionStatusTool: discovery.toolName,
    errorPrimary: executeProbe.error,
    errorSecondary: discovery.error,
  };
}

void Eval<AccountIsolationInput, AccountIsolationOutput>('create-something-mcp-fleet', {
  experimentName: 'account_isolation',
  data: ACCOUNT_ISOLATION_CASES,
  task: async (input): Promise<AccountIsolationOutput> => {
    if (input.mode === 'legacy_echo') {
      return runLegacyEchoMode(input);
    }

    return runHubConnectionStatusMode(input);
  },
  scores: [
    ({ output }) => configuredScore(output),
    ({ output }) => reachabilityScore(output),
    ({ output }) => reflectionScoreA(output),
    ({ output }) => reflectionScoreB(output),
    ({ output }) => separationScore(output),
  ],
});
