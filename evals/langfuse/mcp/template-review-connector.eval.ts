/**
 * Template Review Enterprise connector eval.
 *
 * Complements the Dify-agent evals (evals/langfuse/dify/*template-review*) by
 * exercising the DIRECT Clerk-authed MCP connector surface — the OAuth
 * resource-server contract that claude.ai relies on. These checks are
 * headless and need no secret:
 *   - /health reports OAuth configured
 *   - RFC 9728 protected-resource metadata advertises the Clerk auth server
 *   - the Clerk auth server advertises a DCR registration endpoint
 *   - unauthenticated /mcp returns a 401 OAuth challenge (not 503/200)
 *
 * An optional authenticated block runs only when TEMPLATE_REVIEW_CONNECTOR_BEARER
 * is provided (the worker's MCP_API_KEY legacy bearer), verifying the tool
 * surface and a live health tool call. Read-vs-write scope gating is covered by
 * the package unit tests (tests/oauth-access.test.ts, tests/tools.test.ts) since
 * it requires a scope-limited OAuth token that can't be minted headlessly.
 */
import { Eval, type Score } from '../harness.js';
import { readEnv, readOptionalEnv } from './shared.js';

const CONNECTOR_URL = readEnv(
  'TEMPLATE_REVIEW_CONNECTOR_URL',
  'https://webflow-template-review-mcp.createsomething.workers.dev',
);
const EXPECTED_AUTH_SERVER = readEnv(
  'TEMPLATE_REVIEW_EXPECTED_AUTH_SERVER',
  'https://clerk.createsomething.agency',
);
const EXPECTED_BASE_ID = 'appMoIgXMTTTNIc3p';

const READ_TOOLS = [
  'template_review_health',
  'template_review_get_review_context',
  'template_review_run_published_site_validation',
  'template_review_format_agent_review_feedback',
] as const;

type ConnectorInput = {
  connectorUrl: string;
  expectedAuthServer: string;
  bearer?: string;
};

type ConnectorOutput = {
  healthStatus: number | null;
  oauthConfigured: boolean;
  prmAdvertisesClerk: boolean;
  dcrRegistrationEndpoint: boolean;
  unauthChallenge401: boolean;
  wwwAuthenticatePointsToPrm: boolean;
  // authenticated (optional)
  authRan: boolean;
  toolsListOk: boolean;
  readToolsPresent: boolean;
  healthToolOk: boolean;
  baseIdMatch: boolean;
  durationMs: number;
  notes: string[];
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

async function getJson(url: string): Promise<{ status: number; json: JsonRecord | null; headers: Headers }> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  let json: JsonRecord | null = null;
  try {
    json = record(await res.json());
  } catch {
    json = null;
  }
  return { status: res.status, json, headers: res.headers };
}

async function callRpc(url: string, bearer: string, method: string, params: JsonRecord): Promise<JsonRecord> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: `${Date.now()}`, method, params }),
  });
  const text = await res.text();
  try {
    return record(JSON.parse(text));
  } catch {
    return {};
  }
}

function toolTextJson(payload: JsonRecord): JsonRecord {
  const result = record(payload.result);
  const content = result.content;
  if (!Array.isArray(content)) return {};
  for (const item of content) {
    const t = record(item).text;
    if (typeof t === 'string') {
      try {
        return record(JSON.parse(t));
      } catch {
        /* ignore */
      }
    }
  }
  return {};
}

const CONNECTOR_CASES = [
  {
    input: {
      connectorUrl: CONNECTOR_URL,
      expectedAuthServer: EXPECTED_AUTH_SERVER,
      bearer: readOptionalEnv('TEMPLATE_REVIEW_CONNECTOR_BEARER'),
    } satisfies ConnectorInput,
    metadata: { suite: 'template-review-connector', eval: 'template_review_connector_oauth_contract' },
  },
];

function boolScore(name: string, value: boolean, metadata?: JsonRecord): Score {
  return { name, score: value ? 1 : 0, metadata };
}

function skippableScore(name: string, ran: boolean, value: boolean, metadata?: JsonRecord): Score {
  if (!ran) return { name, score: null, metadata: { reason: 'TEMPLATE_REVIEW_CONNECTOR_BEARER not set' } };
  return boolScore(name, value, metadata);
}

void Eval<ConnectorInput, ConnectorOutput>('create-something-mcp-fleet', {
  experimentName: 'template_review_connector_oauth_contract',
  data: CONNECTOR_CASES,
  task: async (input): Promise<ConnectorOutput> => {
    const started = Date.now();
    const notes: string[] = [];
    const base = input.connectorUrl.replace(/\/$/, '');

    // 1. /health — OAuth configured
    let oauthConfigured = false;
    let healthStatus: number | null = null;
    try {
      const health = await getJson(`${base}/health`);
      healthStatus = health.status;
      oauthConfigured = record(record(record(health.json).auth).modes).oauth
        ? record(record(record(record(health.json).auth).modes).oauth).configured === true
        : false;
    } catch (e) {
      notes.push(`health error: ${String(e)}`);
    }

    // 2. protected-resource metadata advertises the Clerk auth server
    let prmAdvertisesClerk = false;
    try {
      const prm = await getJson(`${base}/.well-known/oauth-protected-resource`);
      const servers = record(prm.json).authorization_servers;
      prmAdvertisesClerk = Array.isArray(servers) && servers.includes(input.expectedAuthServer);
    } catch (e) {
      notes.push(`prm error: ${String(e)}`);
    }

    // 3. Clerk auth server advertises DCR registration endpoint
    let dcrRegistrationEndpoint = false;
    try {
      const asMeta = await getJson(`${input.expectedAuthServer}/.well-known/oauth-authorization-server`);
      dcrRegistrationEndpoint = typeof record(asMeta.json).registration_endpoint === 'string';
    } catch (e) {
      notes.push(`as-metadata error: ${String(e)}`);
    }

    // 4. unauthenticated /mcp → 401 with a resource_metadata challenge
    let unauthChallenge401 = false;
    let wwwAuthenticatePointsToPrm = false;
    try {
      const res = await fetch(`${base}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: '1', method: 'tools/list', params: {} }),
      });
      unauthChallenge401 = res.status === 401;
      wwwAuthenticatePointsToPrm = (res.headers.get('WWW-Authenticate') ?? '').includes(
        'oauth-protected-resource',
      );
    } catch (e) {
      notes.push(`unauth-probe error: ${String(e)}`);
    }

    // Optional authenticated block (legacy MCP_API_KEY bearer)
    let authRan = false;
    let toolsListOk = false;
    let readToolsPresent = false;
    let healthToolOk = false;
    let baseIdMatch = false;
    if (input.bearer) {
      authRan = true;
      try {
        const list = await callRpc(`${base}/mcp`, input.bearer, 'tools/list', {});
        const tools = record(list.result).tools;
        const names = Array.isArray(tools)
          ? tools.map((t) => String(record(t).name)).filter(Boolean)
          : [];
        toolsListOk = names.length > 0;
        readToolsPresent = READ_TOOLS.every((t) => names.includes(t));

        const health = await callRpc(`${base}/mcp`, input.bearer, 'tools/call', {
          name: 'template_review_health',
          arguments: {},
        });
        const healthData = record(toolTextJson(health).data);
        healthToolOk = toolTextJson(health).ok === true && healthData.ok === true;
        baseIdMatch = healthData.baseId === EXPECTED_BASE_ID;
      } catch (e) {
        notes.push(`auth-block error: ${String(e)}`);
      }
    } else {
      notes.push('authenticated block skipped (no bearer)');
    }

    return {
      healthStatus,
      oauthConfigured,
      prmAdvertisesClerk,
      dcrRegistrationEndpoint,
      unauthChallenge401,
      wwwAuthenticatePointsToPrm,
      authRan,
      toolsListOk,
      readToolsPresent,
      healthToolOk,
      baseIdMatch,
      durationMs: Date.now() - started,
      notes,
    };
  },
  scores: [
    ({ output }) => boolScore('oauth_configured', output.oauthConfigured, { healthStatus: output.healthStatus }),
    ({ output }) => boolScore('prm_advertises_clerk', output.prmAdvertisesClerk),
    ({ output }) => boolScore('dcr_registration_live', output.dcrRegistrationEndpoint),
    ({ output }) => boolScore('unauth_challenge_401', output.unauthChallenge401),
    ({ output }) => boolScore('www_authenticate_points_to_prm', output.wwwAuthenticatePointsToPrm),
    ({ output }) => skippableScore('tools_list_ok', output.authRan, output.toolsListOk),
    ({ output }) => skippableScore('read_tools_present', output.authRan, output.readToolsPresent),
    ({ output }) => skippableScore('health_tool_ok', output.authRan, output.healthToolOk),
    ({ output }) => skippableScore('base_id_match', output.authRan, output.baseIdMatch),
    ({ output }) => ({
      name: 'latency_budget',
      score: output.durationMs <= 15_000 ? 1 : output.durationMs <= 25_000 ? 0.5 : 0,
      metadata: { durationMs: output.durationMs, notes: output.notes },
    }),
  ],
});
