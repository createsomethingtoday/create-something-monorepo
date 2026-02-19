/**
 * Gateway Control Worker
 *
 * Control-plane front door for tenant-isolated OpenAI-compatible runtime traffic.
 * It validates tenant runtime keys, enforces model/budget/rate policy, resolves
 * managed or BYOK credentials, and forwards traffic to the Portkey gateway layer.
 */

interface Env {
  DB: D1Database;
  TELEMETRY_DB?: D1Database;
  PORTKEY_GATEWAY_URL?: string;
  PORTKEY_GATEWAY?: Fetcher;
  DEFAULT_PROVIDER_SLUG?: string;
  MODEL_PRICING_JSON?: string;
  OPERATOR_API_TOKEN?: string;
  BYOK_ROOT_KEY?: string;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface RuntimeKeyRecord {
  id: string;
  tenant_id: string;
  tenant_slug: string;
  key_prefix: string;
  revoked_at: string | null;
  expires_at: string | null;
  tenant_status: string;
}

interface ModelPolicyRow {
  provider_slug: string;
  model_name: string;
  max_output_tokens: number | null;
}

interface CredentialRow {
  id: string;
  mode: 'managed' | 'byok';
  managed_secret_name: string | null;
  encrypted_api_key: string | null;
  key_version: number;
  status: 'active' | 'inactive';
}

interface BudgetRow {
  monthly_budget_usd: number | null;
  warn_threshold_percent: number;
  hard_limit_enabled: number;
}

interface RateLimitRow {
  requests_per_minute: number;
  burst_limit: number;
  window_seconds: number;
}

interface BudgetDecisionResult {
  decision: 'allow' | 'warn' | 'block';
  monthlyBudgetUsd: number | null;
  currentSpendUsd: number;
  usagePercent: number;
}

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface GatewayRequestEvent {
  correlationId: string;
  requestId: string;
  tenantId: string;
  tenantSlug: string;
  runtimeKeyPrefix: string;
  providerSlug: string;
  modelName: string | null;
  endpoint: string;
  success: boolean;
  statusCode: number;
  latencyMs: number;
  usage: TokenUsage;
  estimatedCostUsd: number;
  budgetDecision: 'allow' | 'warn' | 'block';
  rateLimited: boolean;
  failoverActivated: boolean;
  errorMessage: string | null;
  upstreamRequestId: string | null;
}

const RUNTIME_ENDPOINTS = new Set<string>([
  '/v1/responses',
  '/v1/chat/completions',
  '/v1/models',
]);

const ADMIN_TENANTS_RE = /^\/api\/tenants$/;
const ADMIN_TENANT_RE = /^\/api\/tenants\/([^/]+)$/;
const ADMIN_TENANT_RUNTIME_KEYS_RE = /^\/api\/tenants\/([^/]+)\/runtime-keys$/;
const ADMIN_TENANT_PROVIDER_CREDS_RE = /^\/api\/tenants\/([^/]+)\/provider-credentials$/;
const ADMIN_TENANT_POLICY_RE = /^\/api\/tenants\/([^/]+)\/policy$/;
const ADMIN_TENANT_USAGE_RE = /^\/api\/tenants\/([^/]+)\/usage$/;
const ADMIN_PERFORMANCE_RE = /^\/api\/admin\/performance$/;

function responseJson(status: number, payload: unknown, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomHex(size: number): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(input: string): Uint8Array {
  const raw = atob(input);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function parsePricingMap(env: Env): Record<string, { input: number; output: number }> {
  if (!env.MODEL_PRICING_JSON) return {};
  try {
    const parsed = JSON.parse(env.MODEL_PRICING_JSON) as Record<string, { input: number; output: number }>;
    return parsed;
  } catch {
    return {};
  }
}

function inferUsage(payload: unknown): TokenUsage {
  if (!payload || typeof payload !== 'object') {
    return { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  }
  const record = payload as Record<string, unknown>;
  const usage = record.usage as Record<string, unknown> | undefined;
  if (!usage) {
    return { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  }

  const promptTokens = Number(
    usage.prompt_tokens ?? usage.input_tokens ?? usage.promptTokens ?? usage.inputTokens ?? 0,
  );
  const completionTokens = Number(
    usage.completion_tokens ?? usage.output_tokens ?? usage.completionTokens ?? usage.outputTokens ?? 0,
  );
  const totalTokens = Number(usage.total_tokens ?? usage.totalTokens ?? promptTokens + completionTokens);

  return {
    prompt_tokens: Number.isFinite(promptTokens) ? promptTokens : 0,
    completion_tokens: Number.isFinite(completionTokens) ? completionTokens : 0,
    total_tokens: Number.isFinite(totalTokens) ? totalTokens : 0,
  };
}

function estimateCostUsd(
  modelName: string | null,
  usage: TokenUsage,
  pricing: Record<string, { input: number; output: number }>,
): number {
  if (!modelName || !pricing[modelName]) return 0;
  const modelPrice = pricing[modelName];
  const inputCost = (usage.prompt_tokens / 1000) * modelPrice.input;
  const outputCost = (usage.completion_tokens / 1000) * modelPrice.output;
  return Number((inputCost + outputCost).toFixed(8));
}

function parseBearerToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

function parseAdminToken(request: Request): string | null {
  const fromHeader = request.headers.get('x-cs-admin-token');
  if (fromHeader) return fromHeader;
  return parseBearerToken(request);
}

async function requireJsonBody(request: Request): Promise<Record<string, unknown>> {
  const bodyText = await request.text();
  if (!bodyText.trim()) return {};
  const parsed = JSON.parse(bodyText) as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Request body must be a JSON object');
  }
  return parsed;
}

function getEnvSecret(env: Env, secretName: string): string | null {
  const value = (env as unknown as Record<string, unknown>)[secretName];
  if (typeof value !== 'string' || !value) return null;
  return value;
}

async function getByokCryptoKey(env: Env): Promise<CryptoKey> {
  if (!env.BYOK_ROOT_KEY) {
    throw new Error('BYOK_ROOT_KEY is not configured');
  }

  let keyBytes: Uint8Array;
  const raw = env.BYOK_ROOT_KEY.trim();

  if (/^[a-fA-F0-9]{64}$/.test(raw)) {
    keyBytes = new Uint8Array(raw.match(/.{1,2}/g)!.map((h) => Number.parseInt(h, 16)));
  } else {
    keyBytes = decodeBase64(raw);
  }

  if (keyBytes.byteLength !== 32) {
    throw new Error('BYOK_ROOT_KEY must be 32 bytes (base64 or 64-char hex)');
  }

  return crypto.subtle.importKey('raw', keyBytes as unknown as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptByokSecret(apiKey: string, env: Env): Promise<string> {
  const key = await getByokCryptoKey(env);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    new TextEncoder().encode(apiKey) as unknown as BufferSource,
  );

  return `v1:${encodeBase64(iv)}:${encodeBase64(new Uint8Array(encrypted))}`;
}

async function decryptByokSecret(payload: string, env: Env): Promise<string> {
  const [version, ivB64, dataB64] = payload.split(':');
  if (version !== 'v1' || !ivB64 || !dataB64) {
    throw new Error('Invalid BYOK payload format');
  }

  const key = await getByokCryptoKey(env);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decodeBase64(ivB64) as unknown as BufferSource },
    key,
    decodeBase64(dataB64) as unknown as BufferSource,
  );

  return new TextDecoder().decode(decrypted);
}

async function authenticateRuntimeKey(
  request: Request,
  db: D1Database,
): Promise<{ rawToken: string; record: RuntimeKeyRecord } | null> {
  const token = parseBearerToken(request);
  if (!token) return null;

  const hash = await sha256Hex(token);
  const record = await db
    .prepare(
      `SELECT
         rk.id,
         rk.tenant_id,
         rk.key_prefix,
         rk.revoked_at,
         rk.expires_at,
         gt.slug AS tenant_slug,
         gt.status AS tenant_status
       FROM tenant_runtime_keys rk
       INNER JOIN gateway_tenants gt ON gt.id = rk.tenant_id
       WHERE rk.key_hash = ?
       LIMIT 1`,
    )
    .bind(hash)
    .first<RuntimeKeyRecord>();

  if (!record) return null;
  if (record.tenant_status !== 'active') return null;
  if (record.revoked_at) return null;
  if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) return null;

  const requestedTenant = request.headers.get('x-cs-tenant');
  if (
    requestedTenant
    && requestedTenant !== record.tenant_id
    && requestedTenant !== record.tenant_slug
  ) {
    return null;
  }

  await db
    .prepare('UPDATE tenant_runtime_keys SET last_used_at = datetime(\'now\') WHERE id = ?')
    .bind(record.id)
    .run();

  return { rawToken: token, record };
}

async function getModelPolicy(
  db: D1Database,
  tenantId: string,
  modelName: string,
): Promise<ModelPolicyRow | null> {
  return db
    .prepare(
      `SELECT provider_slug, model_name, max_output_tokens
       FROM tenant_model_policies
       WHERE tenant_id = ?
         AND model_name = ?
         AND is_enabled = 1
       LIMIT 1`,
    )
    .bind(tenantId, modelName)
    .first<ModelPolicyRow>();
}

async function isProviderKilled(
  db: D1Database,
  tenantId: string,
  providerSlug: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT is_enabled
       FROM tenant_provider_kill_switches
       WHERE tenant_id = ?
         AND provider_slug = ?
       LIMIT 1`,
    )
    .bind(tenantId, providerSlug)
    .first<{ is_enabled: number }>();

  return row?.is_enabled === 1;
}

async function resolveProviderApiKey(
  env: Env,
  db: D1Database,
  tenantId: string,
  providerSlug: string,
): Promise<string> {
  const row = await db
    .prepare(
      `SELECT id, mode, managed_secret_name, encrypted_api_key, key_version, status
       FROM provider_credentials
       WHERE tenant_id = ?
         AND provider_slug = ?
         AND status = 'active'
       LIMIT 1`,
    )
    .bind(tenantId, providerSlug)
    .first<CredentialRow>();

  if (!row) {
    throw new Error(`No active provider credential for tenant=${tenantId} provider=${providerSlug}`);
  }

  if (row.mode === 'managed') {
    if (!row.managed_secret_name) {
      throw new Error(`Managed credential is missing managed_secret_name for provider=${providerSlug}`);
    }
    const managedKey = getEnvSecret(env, row.managed_secret_name);
    if (!managedKey) {
      throw new Error(`Managed secret ${row.managed_secret_name} is not configured`);
    }
    return managedKey;
  }

  if (!row.encrypted_api_key) {
    throw new Error(`BYOK credential is missing encrypted_api_key for provider=${providerSlug}`);
  }

  return decryptByokSecret(row.encrypted_api_key, env);
}

async function evaluateBudget(
  db: D1Database,
  telemetryDb: D1Database | undefined,
  tenantId: string,
): Promise<BudgetDecisionResult> {
  const budget = await db
    .prepare(
      `SELECT monthly_budget_usd, warn_threshold_percent, hard_limit_enabled
       FROM tenant_budgets
       WHERE tenant_id = ?
       LIMIT 1`,
    )
    .bind(tenantId)
    .first<BudgetRow>();

  if (!budget || budget.monthly_budget_usd == null || !telemetryDb) {
    return {
      decision: 'allow',
      monthlyBudgetUsd: budget?.monthly_budget_usd ?? null,
      currentSpendUsd: 0,
      usagePercent: 0,
    };
  }

  const spendRow = await telemetryDb
    .prepare(
      `SELECT COALESCE(SUM(estimated_cost_usd), 0) AS spend
       FROM gateway_requests
       WHERE tenant_id = ?
         AND created_at >= datetime('now', 'start of month')`,
    )
    .bind(tenantId)
    .first<{ spend: number }>();

  const spend = Number(spendRow?.spend ?? 0);
  const budgetUsd = Number(budget.monthly_budget_usd);
  const percent = budgetUsd > 0 ? (spend / budgetUsd) * 100 : 0;

  if (budget.hard_limit_enabled === 1 && spend >= budgetUsd) {
    return {
      decision: 'block',
      monthlyBudgetUsd: budgetUsd,
      currentSpendUsd: spend,
      usagePercent: Number(percent.toFixed(2)),
    };
  }

  if (percent >= budget.warn_threshold_percent) {
    return {
      decision: 'warn',
      monthlyBudgetUsd: budgetUsd,
      currentSpendUsd: spend,
      usagePercent: Number(percent.toFixed(2)),
    };
  }

  return {
    decision: 'allow',
    monthlyBudgetUsd: budgetUsd,
    currentSpendUsd: spend,
    usagePercent: Number(percent.toFixed(2)),
  };
}

async function enforceRateLimit(
  db: D1Database,
  tenantId: string,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const row = await db
    .prepare(
      `SELECT requests_per_minute, burst_limit, window_seconds
       FROM tenant_rate_limits
       WHERE tenant_id = ?
       LIMIT 1`,
    )
    .bind(tenantId)
    .first<RateLimitRow>();

  const requestsPerMinute = row?.requests_per_minute ?? 120;
  const burstLimit = row?.burst_limit ?? Math.max(120, requestsPerMinute);
  const windowSeconds = row?.window_seconds ?? 60;

  const now = Date.now();
  const windowStartEpoch = Math.floor(now / (windowSeconds * 1000)) * windowSeconds;
  const windowStart = new Date(windowStartEpoch * 1000).toISOString();

  await db
    .prepare(
      `INSERT INTO gateway_rate_counters (tenant_id, window_start, request_count, updated_at)
       VALUES (?, ?, 1, datetime('now'))
       ON CONFLICT(tenant_id, window_start)
       DO UPDATE SET
         request_count = gateway_rate_counters.request_count + 1,
         updated_at = datetime('now')`,
    )
    .bind(tenantId, windowStart)
    .run();

  const countRow = await db
    .prepare(
      `SELECT request_count
       FROM gateway_rate_counters
       WHERE tenant_id = ?
         AND window_start = ?
       LIMIT 1`,
    )
    .bind(tenantId, windowStart)
    .first<{ request_count: number }>();

  const requestCount = countRow?.request_count ?? 1;
  const limit = Math.max(requestsPerMinute, burstLimit);

  return {
    allowed: requestCount <= limit,
    remaining: Math.max(0, limit - requestCount),
    limit,
  };
}

async function cleanupRateCounterGarbage(db: D1Database): Promise<void> {
  await db
    .prepare("DELETE FROM gateway_rate_counters WHERE window_start < datetime('now', '-2 hours')")
    .run();
}

async function getCachedIdempotencyResponse(
  db: D1Database,
  tenantId: string,
  endpoint: string,
  idempotencyKey: string,
  requestHash: string,
): Promise<Response | null> {
  const row = await db
    .prepare(
      `SELECT response_status, response_headers_json, response_body, request_hash
       FROM gateway_idempotency_keys
       WHERE tenant_id = ?
         AND endpoint = ?
         AND idempotency_key = ?
         AND expires_at > datetime('now')
       LIMIT 1`,
    )
    .bind(tenantId, endpoint, idempotencyKey)
    .first<{
      response_status: number | null;
      response_headers_json: string | null;
      response_body: string | null;
      request_hash: string;
    }>();

  if (!row) return null;
  if (row.request_hash !== requestHash) {
    return responseJson(409, {
      error: 'Idempotency key reuse with different payload is not allowed',
    });
  }
  if (row.response_status == null || row.response_body == null) return null;

  let headers: Record<string, string> = {};
  if (row.response_headers_json) {
    try {
      headers = JSON.parse(row.response_headers_json) as Record<string, string>;
    } catch {
      headers = {};
    }
  }

  headers['x-cs-idempotent-replay'] = 'true';

  return new Response(row.response_body, {
    status: row.response_status,
    headers,
  });
}

async function persistIdempotencyResponse(
  db: D1Database,
  params: {
    tenantId: string;
    endpoint: string;
    idempotencyKey: string;
    requestHash: string;
    responseStatus: number;
    responseHeaders: Record<string, string>;
    responseBody: string;
  },
): Promise<void> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO gateway_idempotency_keys (
         id,
         tenant_id,
         endpoint,
         idempotency_key,
         request_hash,
         response_status,
         response_headers_json,
         response_body,
         expires_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(tenant_id, endpoint, idempotency_key)
       DO UPDATE SET
         request_hash = excluded.request_hash,
         response_status = excluded.response_status,
         response_headers_json = excluded.response_headers_json,
         response_body = excluded.response_body,
         expires_at = excluded.expires_at`,
    )
    .bind(
      id,
      params.tenantId,
      params.endpoint,
      params.idempotencyKey,
      params.requestHash,
      params.responseStatus,
      JSON.stringify(params.responseHeaders),
      params.responseBody,
      expiresAt,
    )
    .run();
}

async function logGatewayRequest(db: D1Database | undefined, event: GatewayRequestEvent): Promise<void> {
  if (!db) return;
  await db
    .prepare(
      `INSERT INTO gateway_requests (
         correlation_id,
         request_id,
         tenant_id,
         tenant_slug,
         runtime_key_prefix,
         provider_slug,
         model_name,
         endpoint,
         success,
         status_code,
         latency_ms,
         prompt_tokens,
         completion_tokens,
         total_tokens,
         estimated_cost_usd,
         budget_decision,
         rate_limited,
         failover_activated,
         error_message,
         upstream_request_id,
         created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .bind(
      event.correlationId,
      event.requestId,
      event.tenantId,
      event.tenantSlug,
      event.runtimeKeyPrefix,
      event.providerSlug,
      event.modelName,
      event.endpoint,
      event.success ? 1 : 0,
      event.statusCode,
      event.latencyMs,
      event.usage.prompt_tokens,
      event.usage.completion_tokens,
      event.usage.total_tokens,
      event.estimatedCostUsd,
      event.budgetDecision,
      event.rateLimited ? 1 : 0,
      event.failoverActivated ? 1 : 0,
      event.errorMessage,
      event.upstreamRequestId,
    )
    .run();
}

async function emitAlert(
  db: D1Database | undefined,
  payload: {
    type: string;
    tenantId: string;
    tenantSlug: string;
    severity: 'info' | 'warning' | 'critical';
    correlationId?: string;
    details: Record<string, unknown>;
  },
): Promise<void> {
  if (!db) return;
  await db
    .prepare(
      `INSERT INTO gateway_alerts (
         alert_type,
         tenant_id,
         tenant_slug,
         severity,
         correlation_id,
         details_json,
         created_at
       ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .bind(
      payload.type,
      payload.tenantId,
      payload.tenantSlug,
      payload.severity,
      payload.correlationId ?? null,
      JSON.stringify(payload.details),
    )
    .run();
}

async function maybeEmitErrorRateAlert(
  db: D1Database | undefined,
  tenantId: string,
  tenantSlug: string,
  correlationId: string,
): Promise<void> {
  if (!db) return;

  const recent = await db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS errors
       FROM gateway_requests
       WHERE tenant_id = ?
         AND created_at > datetime('now', '-10 minutes')`,
    )
    .bind(tenantId)
    .first<{ total: number; errors: number | null }>();

  const total = Number(recent?.total ?? 0);
  const errors = Number(recent?.errors ?? 0);
  if (total < 20) return;

  const ratio = total > 0 ? errors / total : 0;
  if (ratio < 0.3) return;

  await emitAlert(db, {
    type: 'error_rate_spike',
    tenantId,
    tenantSlug,
    severity: 'critical',
    correlationId,
    details: {
      total,
      errors,
      errorRate: Number(ratio.toFixed(3)),
      window: '10m',
    },
  });
}

async function forwardToGateway(
  request: Request,
  env: Env,
  path: string,
  bodyText: string,
  providerSlug: string,
  providerApiKey: string,
  correlationId: string,
  runtimeRecord: RuntimeKeyRecord,
): Promise<Response> {
  const config = {
    strategy: { mode: 'single' },
    targets: [
      {
        provider: providerSlug,
        api_key: providerApiKey,
      },
    ],
  };

  const headers = new Headers();
  headers.set('content-type', 'application/json');
  headers.set('accept', request.headers.get('accept') ?? 'application/json');
  headers.set('x-portkey-config', JSON.stringify(config));
  headers.set('x-cs-correlation-id', correlationId);
  headers.set('x-cs-tenant-id', runtimeRecord.tenant_id);
  headers.set('x-cs-tenant-slug', runtimeRecord.tenant_slug);
  headers.set('x-cs-runtime-key-prefix', runtimeRecord.key_prefix);

  const idempotencyKey = request.headers.get('idempotency-key');
  if (idempotencyKey) {
    headers.set('idempotency-key', idempotencyKey);
  }

  if (env.PORTKEY_GATEWAY && typeof env.PORTKEY_GATEWAY.fetch === 'function') {
    const upstreamRequest = new Request(`https://portkey-gateway.internal${path}`, {
      method: 'POST',
      headers,
      body: bodyText,
    });
    return env.PORTKEY_GATEWAY.fetch(upstreamRequest);
  }

  if (!env.PORTKEY_GATEWAY_URL) {
    throw new Error('PORTKEY_GATEWAY_URL (or PORTKEY_GATEWAY service binding) is not configured');
  }

  const upstreamUrl = `${normalizeBaseUrl(env.PORTKEY_GATEWAY_URL)}${path}`;
  return fetch(upstreamUrl, {
    method: 'POST',
    headers,
    body: bodyText,
  });
}

function extractModelName(payload: Record<string, unknown>): string | null {
  const direct = payload.model;
  if (typeof direct === 'string' && direct) return direct;

  const nested = payload.response as Record<string, unknown> | undefined;
  if (nested && typeof nested.model === 'string') return nested.model;

  return null;
}

function serializeHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

async function handleRuntimeModels(
  auth: RuntimeKeyRecord,
  db: D1Database,
): Promise<Response> {
  const rows = await db
    .prepare(
      `SELECT model_name, provider_slug
       FROM tenant_model_policies
       WHERE tenant_id = ?
         AND is_enabled = 1
       ORDER BY model_name ASC`,
    )
    .bind(auth.tenant_id)
    .all<{ model_name: string; provider_slug: string }>();

  return responseJson(200, {
    object: 'list',
    data: rows.results.map((row) => ({
      id: row.model_name,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: row.provider_slug,
    })),
  });
}

async function handleRuntimeRequest(
  request: Request,
  env: Env,
  path: string,
  runtimeAuth: { rawToken: string; record: RuntimeKeyRecord },
): Promise<Response> {
  const requestId = crypto.randomUUID();
  const correlationId = request.headers.get('x-cs-correlation-id') ?? crypto.randomUUID();
  const pricing = parsePricingMap(env);

  const bodyText = await request.text();
  let bodyJson: Record<string, unknown>;
  try {
    bodyJson = bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : {};
  } catch {
    return responseJson(400, { error: 'Invalid JSON payload' });
  }

  const modelName = extractModelName(bodyJson);
  if (!modelName) {
    return responseJson(400, { error: 'Missing model in request payload' });
  }

  const modelPolicy = await getModelPolicy(env.DB, runtimeAuth.record.tenant_id, modelName);
  if (!modelPolicy) {
    return responseJson(403, {
      error: `Model ${modelName} is not enabled for this tenant`,
    });
  }

  const killSwitchEnabled = await isProviderKilled(
    env.DB,
    runtimeAuth.record.tenant_id,
    modelPolicy.provider_slug,
  );
  if (killSwitchEnabled) {
    await emitAlert(env.TELEMETRY_DB, {
      type: 'provider_kill_switch_blocked',
      tenantId: runtimeAuth.record.tenant_id,
      tenantSlug: runtimeAuth.record.tenant_slug,
      severity: 'warning',
      correlationId,
      details: {
        provider: modelPolicy.provider_slug,
        model: modelName,
      },
    });
    return responseJson(503, {
      error: `Provider ${modelPolicy.provider_slug} is temporarily disabled for this tenant`,
    });
  }

  const budget = await evaluateBudget(env.DB, env.TELEMETRY_DB, runtimeAuth.record.tenant_id);
  if (budget.decision === 'block') {
    await logGatewayRequest(env.TELEMETRY_DB, {
      correlationId,
      requestId,
      tenantId: runtimeAuth.record.tenant_id,
      tenantSlug: runtimeAuth.record.tenant_slug,
      runtimeKeyPrefix: runtimeAuth.record.key_prefix,
      providerSlug: modelPolicy.provider_slug,
      modelName,
      endpoint: path,
      success: false,
      statusCode: 402,
      latencyMs: 0,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      estimatedCostUsd: 0,
      budgetDecision: 'block',
      rateLimited: false,
      failoverActivated: false,
      errorMessage: 'Budget hard limit reached',
      upstreamRequestId: null,
    });

    await emitAlert(env.TELEMETRY_DB, {
      type: 'budget_threshold_crossed',
      tenantId: runtimeAuth.record.tenant_id,
      tenantSlug: runtimeAuth.record.tenant_slug,
      severity: 'critical',
      correlationId,
      details: {
        budgetUsd: budget.monthlyBudgetUsd,
        spendUsd: budget.currentSpendUsd,
        usagePercent: budget.usagePercent,
      },
    });

    return responseJson(402, {
      error: 'Budget hard limit reached',
      budget,
    });
  }

  const rateLimit = await enforceRateLimit(env.DB, runtimeAuth.record.tenant_id);
  if (!rateLimit.allowed) {
    await logGatewayRequest(env.TELEMETRY_DB, {
      correlationId,
      requestId,
      tenantId: runtimeAuth.record.tenant_id,
      tenantSlug: runtimeAuth.record.tenant_slug,
      runtimeKeyPrefix: runtimeAuth.record.key_prefix,
      providerSlug: modelPolicy.provider_slug,
      modelName,
      endpoint: path,
      success: false,
      statusCode: 429,
      latencyMs: 0,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      estimatedCostUsd: 0,
      budgetDecision: budget.decision,
      rateLimited: true,
      failoverActivated: false,
      errorMessage: 'Rate limit exceeded',
      upstreamRequestId: null,
    });

    return responseJson(429, {
      error: 'Rate limit exceeded',
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
    });
  }

  const idempotencyKey = request.headers.get('idempotency-key');
  const requestHash = idempotencyKey ? await sha256Hex(bodyText) : null;
  if (idempotencyKey && requestHash) {
    const cached = await getCachedIdempotencyResponse(
      env.DB,
      runtimeAuth.record.tenant_id,
      path,
      idempotencyKey,
      requestHash,
    );
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set('x-cs-correlation-id', correlationId);
      headers.set('x-cs-request-id', requestId);
      return new Response(cached.body, { status: cached.status, headers });
    }
  }

  const providerApiKey = await resolveProviderApiKey(
    env,
    env.DB,
    runtimeAuth.record.tenant_id,
    modelPolicy.provider_slug,
  );

  const start = Date.now();
  let upstreamResponse: Response;
  let upstreamBody = '';
  let upstreamJson: unknown = null;

  try {
    upstreamResponse = await forwardToGateway(
      request,
      env,
      path,
      bodyText,
      modelPolicy.provider_slug,
      providerApiKey,
      correlationId,
      runtimeAuth.record,
    );
    upstreamBody = await upstreamResponse.text();

    if (upstreamBody) {
      try {
        upstreamJson = JSON.parse(upstreamBody);
      } catch {
        upstreamJson = null;
      }
    }
  } catch (error) {
    const latencyMs = Date.now() - start;

    await logGatewayRequest(env.TELEMETRY_DB, {
      correlationId,
      requestId,
      tenantId: runtimeAuth.record.tenant_id,
      tenantSlug: runtimeAuth.record.tenant_slug,
      runtimeKeyPrefix: runtimeAuth.record.key_prefix,
      providerSlug: modelPolicy.provider_slug,
      modelName,
      endpoint: path,
      success: false,
      statusCode: 502,
      latencyMs,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      estimatedCostUsd: 0,
      budgetDecision: budget.decision,
      rateLimited: false,
      failoverActivated: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      upstreamRequestId: null,
    });

    await maybeEmitErrorRateAlert(
      env.TELEMETRY_DB,
      runtimeAuth.record.tenant_id,
      runtimeAuth.record.tenant_slug,
      correlationId,
    );

    return responseJson(502, {
      error: 'Failed to reach gateway',
      requestId,
      correlationId,
    });
  }

  const latencyMs = Date.now() - start;
  const usage = inferUsage(upstreamJson);
  const estimatedCostUsd = estimateCostUsd(modelName, usage, pricing);
  const failoverActivated = Boolean(
    upstreamResponse.headers.get('x-portkey-fallback-target')
    || upstreamResponse.headers.get('x-portkey-failover'),
  );

  const success = upstreamResponse.status >= 200 && upstreamResponse.status < 300;
  const errorMessage = success
    ? null
    : (typeof upstreamJson === 'object' && upstreamJson && 'error' in (upstreamJson as Record<string, unknown>)
      ? JSON.stringify((upstreamJson as Record<string, unknown>).error)
      : upstreamBody.slice(0, 300));

  await logGatewayRequest(env.TELEMETRY_DB, {
    correlationId,
    requestId,
    tenantId: runtimeAuth.record.tenant_id,
    tenantSlug: runtimeAuth.record.tenant_slug,
    runtimeKeyPrefix: runtimeAuth.record.key_prefix,
    providerSlug: modelPolicy.provider_slug,
    modelName,
    endpoint: path,
    success,
    statusCode: upstreamResponse.status,
    latencyMs,
    usage,
    estimatedCostUsd,
    budgetDecision: budget.decision,
    rateLimited: false,
    failoverActivated,
    errorMessage,
    upstreamRequestId: upstreamResponse.headers.get('x-request-id') || upstreamResponse.headers.get('openai-request-id'),
  });

  if (budget.decision === 'warn') {
    await emitAlert(env.TELEMETRY_DB, {
      type: 'budget_threshold_crossed',
      tenantId: runtimeAuth.record.tenant_id,
      tenantSlug: runtimeAuth.record.tenant_slug,
      severity: 'warning',
      correlationId,
      details: {
        budgetUsd: budget.monthlyBudgetUsd,
        spendUsd: budget.currentSpendUsd,
        usagePercent: budget.usagePercent,
      },
    });
  }

  if (failoverActivated) {
    await emitAlert(env.TELEMETRY_DB, {
      type: 'provider_failover_activated',
      tenantId: runtimeAuth.record.tenant_id,
      tenantSlug: runtimeAuth.record.tenant_slug,
      severity: 'warning',
      correlationId,
      details: {
        provider: modelPolicy.provider_slug,
        model: modelName,
        endpoint: path,
      },
    });
  }

  await maybeEmitErrorRateAlert(
    env.TELEMETRY_DB,
    runtimeAuth.record.tenant_id,
    runtimeAuth.record.tenant_slug,
    correlationId,
  );

  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.set('x-cs-correlation-id', correlationId);
  responseHeaders.set('x-cs-request-id', requestId);
  responseHeaders.set('x-cs-budget-decision', budget.decision);

  if (idempotencyKey && requestHash && success) {
    await persistIdempotencyResponse(env.DB, {
      tenantId: runtimeAuth.record.tenant_id,
      endpoint: path,
      idempotencyKey,
      requestHash,
      responseStatus: upstreamResponse.status,
      responseHeaders: serializeHeaders(responseHeaders),
      responseBody: upstreamBody,
    });
  }

  return new Response(upstreamBody, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

async function requireAdmin(request: Request, env: Env): Promise<boolean> {
  if (!env.OPERATOR_API_TOKEN) return false;
  const token = parseAdminToken(request);
  return token === env.OPERATOR_API_TOKEN;
}

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function adminCreateTenant(request: Request, env: Env): Promise<Response> {
  const body = await requireJsonBody(request);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return responseJson(400, { error: 'name is required' });

  const slugInput = typeof body.slug === 'string' ? body.slug : name;
  const slug = toSlug(slugInput);
  const tenantId = crypto.randomUUID();

  await env.DB
    .prepare(
      `INSERT INTO gateway_tenants (id, slug, name, status, metadata_json)
       VALUES (?, ?, ?, 'active', ?)`,
    )
    .bind(tenantId, slug, name, JSON.stringify(body.metadata ?? {}))
    .run();

  await env.DB
    .prepare(
      `INSERT OR IGNORE INTO tenant_rate_limits (tenant_id, requests_per_minute, burst_limit, window_seconds)
       VALUES (?, 120, 180, 60)`,
    )
    .bind(tenantId)
    .run();

  await env.DB
    .prepare(
      `INSERT OR IGNORE INTO tenant_budgets (tenant_id, monthly_budget_usd, warn_threshold_percent, hard_limit_enabled)
       VALUES (?, NULL, 80, 1)`,
    )
    .bind(tenantId)
    .run();

  return responseJson(201, {
    id: tenantId,
    slug,
    name,
    status: 'active',
  });
}

async function adminCreateRuntimeKey(request: Request, env: Env, tenantId: string): Promise<Response> {
  const body = await requireJsonBody(request);
  const label = typeof body.label === 'string' ? body.label : 'runtime-key';
  const expiresAt = typeof body.expires_at === 'string' ? body.expires_at : null;

  const rawKey = `csrk_${randomHex(24)}`;
  const keyPrefix = rawKey.slice(0, 12);
  const keyHash = await sha256Hex(rawKey);
  const keyId = crypto.randomUUID();

  await env.DB
    .prepare(
      `INSERT INTO tenant_runtime_keys (
         id,
         tenant_id,
         key_prefix,
         key_hash,
         label,
         created_by,
         expires_at,
         revoked_at
       ) VALUES (?, ?, ?, ?, ?, 'operator', ?, NULL)`,
    )
    .bind(keyId, tenantId, keyPrefix, keyHash, label, expiresAt)
    .run();

  return responseJson(201, {
    id: keyId,
    tenant_id: tenantId,
    key_prefix: keyPrefix,
    key: rawKey,
    label,
    expires_at: expiresAt,
    warning: 'The raw key is shown once. Store it securely.',
  });
}

async function adminUpsertProviderCredential(
  request: Request,
  env: Env,
  tenantId: string,
): Promise<Response> {
  const body = await requireJsonBody(request);

  const providerSlug = typeof body.provider_slug === 'string'
    ? body.provider_slug.trim().toLowerCase()
    : (env.DEFAULT_PROVIDER_SLUG ?? 'openai');
  const mode = body.mode === 'byok' ? 'byok' : 'managed';
  const status = body.status === 'inactive' ? 'inactive' : 'active';

  let managedSecretName: string | null = null;
  let encryptedApiKey: string | null = null;

  if (mode === 'managed') {
    if (typeof body.managed_secret_name !== 'string' || !body.managed_secret_name.trim()) {
      return responseJson(400, { error: 'managed_secret_name is required for managed mode' });
    }
    managedSecretName = body.managed_secret_name.trim();
  } else {
    if (typeof body.api_key !== 'string' || !body.api_key.trim()) {
      return responseJson(400, { error: 'api_key is required for byok mode' });
    }
    encryptedApiKey = await encryptByokSecret(body.api_key.trim(), env);
  }

  const id = crypto.randomUUID();

  await env.DB
    .prepare(
      `INSERT INTO provider_credentials (
         id,
         tenant_id,
         provider_slug,
         mode,
         managed_secret_name,
         encrypted_api_key,
         key_version,
         status,
         created_by
       ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, 'operator')
       ON CONFLICT(tenant_id, provider_slug, status)
       DO UPDATE SET
         mode = excluded.mode,
         managed_secret_name = excluded.managed_secret_name,
         encrypted_api_key = excluded.encrypted_api_key,
         key_version = provider_credentials.key_version + 1,
         updated_at = datetime('now')`,
    )
    .bind(id, tenantId, providerSlug, mode, managedSecretName, encryptedApiKey, status)
    .run();

  return responseJson(200, {
    tenant_id: tenantId,
    provider_slug: providerSlug,
    mode,
    status,
    managed_secret_name: managedSecretName,
    has_byok: Boolean(encryptedApiKey),
  });
}

async function adminUpdatePolicy(request: Request, env: Env, tenantId: string): Promise<Response> {
  const body = await requireJsonBody(request);

  const readOnly = body.read_only === true ? 1 : 0;
  const allowPromptLogging = body.allow_prompt_logging === true ? 1 : 0;
  const approvalPosture = typeof body.approval_posture === 'string'
    ? body.approval_posture
    : 'operator';

  await env.DB
    .prepare(
      `INSERT INTO tenant_policies (
         tenant_id,
         read_only,
         allow_prompt_logging,
         approval_posture,
         policy_json
       ) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(tenant_id)
       DO UPDATE SET
         read_only = excluded.read_only,
         allow_prompt_logging = excluded.allow_prompt_logging,
         approval_posture = excluded.approval_posture,
         policy_json = excluded.policy_json,
         updated_at = datetime('now')`,
    )
    .bind(
      tenantId,
      readOnly,
      allowPromptLogging,
      approvalPosture,
      JSON.stringify(body.policy ?? {}),
    )
    .run();

  if (Array.isArray(body.model_allowlist)) {
    await env.DB
      .prepare('DELETE FROM tenant_model_policies WHERE tenant_id = ?')
      .bind(tenantId)
      .run();

    for (const entry of body.model_allowlist) {
      if (!entry || typeof entry !== 'object') continue;
      const model = (entry as Record<string, unknown>).model_name;
      const provider = (entry as Record<string, unknown>).provider_slug;
      const maxOutput = (entry as Record<string, unknown>).max_output_tokens;
      if (typeof model !== 'string' || typeof provider !== 'string') continue;

      await env.DB
        .prepare(
          `INSERT INTO tenant_model_policies (
             id,
             tenant_id,
             provider_slug,
             model_name,
             is_enabled,
             max_output_tokens
           ) VALUES (?, ?, ?, ?, 1, ?)
           ON CONFLICT(tenant_id, provider_slug, model_name)
           DO UPDATE SET
             is_enabled = 1,
             max_output_tokens = excluded.max_output_tokens,
             updated_at = datetime('now')`,
        )
        .bind(
          crypto.randomUUID(),
          tenantId,
          provider.toLowerCase(),
          model,
          typeof maxOutput === 'number' ? maxOutput : null,
        )
        .run();
    }
  }

  if (body.budget && typeof body.budget === 'object') {
    const budget = body.budget as Record<string, unknown>;
    await env.DB
      .prepare(
        `INSERT INTO tenant_budgets (
           tenant_id,
           monthly_budget_usd,
           warn_threshold_percent,
           hard_limit_enabled,
           alert_webhook_url
         ) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id)
         DO UPDATE SET
           monthly_budget_usd = excluded.monthly_budget_usd,
           warn_threshold_percent = excluded.warn_threshold_percent,
           hard_limit_enabled = excluded.hard_limit_enabled,
           alert_webhook_url = excluded.alert_webhook_url,
           updated_at = datetime('now')`,
      )
      .bind(
        tenantId,
        typeof budget.monthly_budget_usd === 'number' ? budget.monthly_budget_usd : null,
        typeof budget.warn_threshold_percent === 'number' ? budget.warn_threshold_percent : 80,
        budget.hard_limit_enabled === false ? 0 : 1,
        typeof budget.alert_webhook_url === 'string' ? budget.alert_webhook_url : null,
      )
      .run();
  }

  if (body.rate_limit && typeof body.rate_limit === 'object') {
    const rateLimit = body.rate_limit as Record<string, unknown>;
    await env.DB
      .prepare(
        `INSERT INTO tenant_rate_limits (
           tenant_id,
           requests_per_minute,
           burst_limit,
           window_seconds
         ) VALUES (?, ?, ?, ?)
         ON CONFLICT(tenant_id)
         DO UPDATE SET
           requests_per_minute = excluded.requests_per_minute,
           burst_limit = excluded.burst_limit,
           window_seconds = excluded.window_seconds,
           updated_at = datetime('now')`,
      )
      .bind(
        tenantId,
        typeof rateLimit.requests_per_minute === 'number' ? rateLimit.requests_per_minute : 120,
        typeof rateLimit.burst_limit === 'number' ? rateLimit.burst_limit : 180,
        typeof rateLimit.window_seconds === 'number' ? rateLimit.window_seconds : 60,
      )
      .run();
  }

  if (Array.isArray(body.kill_switches)) {
    for (const entry of body.kill_switches) {
      if (!entry || typeof entry !== 'object') continue;
      const provider = (entry as Record<string, unknown>).provider_slug;
      if (typeof provider !== 'string') continue;
      const enabled = (entry as Record<string, unknown>).enabled === true ? 1 : 0;
      const reason = typeof (entry as Record<string, unknown>).reason === 'string'
        ? (entry as Record<string, unknown>).reason
        : null;

      await env.DB
        .prepare(
          `INSERT INTO tenant_provider_kill_switches (
             id,
             tenant_id,
             provider_slug,
             is_enabled,
             reason,
             updated_by
           ) VALUES (?, ?, ?, ?, ?, 'operator')
           ON CONFLICT(tenant_id, provider_slug)
           DO UPDATE SET
             is_enabled = excluded.is_enabled,
             reason = excluded.reason,
             updated_by = excluded.updated_by,
             updated_at = datetime('now')`,
        )
        .bind(crypto.randomUUID(), tenantId, provider.toLowerCase(), enabled, reason)
        .run();
    }
  }

  return responseJson(200, {
    tenant_id: tenantId,
    updated_at: nowIso(),
  });
}

async function adminGetUsage(
  request: Request,
  env: Env,
  tenantId: string,
): Promise<Response> {
  if (!env.TELEMETRY_DB) {
    return responseJson(503, { error: 'TELEMETRY_DB binding not configured' });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const where: string[] = ['tenant_id = ?'];
  const params: unknown[] = [tenantId];

  if (from) {
    where.push('created_at >= ?');
    params.push(from);
  }
  if (to) {
    where.push('created_at <= ?');
    params.push(to);
  }

  const whereClause = where.join(' AND ');

  const summary = await env.TELEMETRY_DB
    .prepare(
      `SELECT
         COUNT(*) AS requests,
         SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS successful,
         SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failed,
         COALESCE(SUM(total_tokens), 0) AS tokens,
         COALESCE(SUM(estimated_cost_usd), 0) AS total_cost_usd,
         ROUND(COALESCE(AVG(latency_ms), 0), 2) AS avg_latency_ms
       FROM gateway_requests
       WHERE ${whereClause}`,
    )
    .bind(...params)
    .first<{
      requests: number;
      successful: number;
      failed: number;
      tokens: number;
      total_cost_usd: number;
      avg_latency_ms: number;
    }>();

  const byModel = await env.TELEMETRY_DB
    .prepare(
      `SELECT
         provider_slug,
         model_name,
         COUNT(*) AS requests,
         COALESCE(SUM(total_tokens), 0) AS tokens,
         ROUND(COALESCE(SUM(estimated_cost_usd), 0), 6) AS cost_usd
       FROM gateway_requests
       WHERE ${whereClause}
       GROUP BY provider_slug, model_name
       ORDER BY requests DESC
       LIMIT 100`,
    )
    .bind(...params)
    .all<{
      provider_slug: string;
      model_name: string;
      requests: number;
      tokens: number;
      cost_usd: number;
    }>();

  return responseJson(200, {
    tenant_id: tenantId,
    from,
    to,
    summary,
    by_model: byModel.results,
  });
}

async function adminListTenants(env: Env): Promise<Response> {
  const rows = await env.DB
    .prepare(
      `SELECT id, slug, name, status, created_at, updated_at
       FROM gateway_tenants
       ORDER BY created_at DESC`,
    )
    .all<{
      id: string;
      slug: string;
      name: string;
      status: string;
      created_at: string;
      updated_at: string;
    }>();

  return responseJson(200, {
    tenants: rows.results,
  });
}

async function adminGetTenantConfig(env: Env, tenantId: string): Promise<Response> {
  const tenant = await env.DB
    .prepare(
      `SELECT id, slug, name, status, metadata_json, created_at, updated_at
       FROM gateway_tenants
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(tenantId)
    .first<{
      id: string;
      slug: string;
      name: string;
      status: string;
      metadata_json: string | null;
      created_at: string;
      updated_at: string;
    }>();

  if (!tenant) {
    return responseJson(404, { error: 'Tenant not found' });
  }

  const models = await env.DB
    .prepare(
      `SELECT provider_slug, model_name, is_enabled, max_output_tokens
       FROM tenant_model_policies
       WHERE tenant_id = ?
       ORDER BY provider_slug, model_name`,
    )
    .bind(tenantId)
    .all<{
      provider_slug: string;
      model_name: string;
      is_enabled: number;
      max_output_tokens: number | null;
    }>();

  const budget = await env.DB
    .prepare(
      `SELECT monthly_budget_usd, warn_threshold_percent, hard_limit_enabled, alert_webhook_url
       FROM tenant_budgets
       WHERE tenant_id = ?
       LIMIT 1`,
    )
    .bind(tenantId)
    .first();

  const rateLimit = await env.DB
    .prepare(
      `SELECT requests_per_minute, burst_limit, window_seconds
       FROM tenant_rate_limits
       WHERE tenant_id = ?
       LIMIT 1`,
    )
    .bind(tenantId)
    .first();

  const policy = await env.DB
    .prepare(
      `SELECT read_only, allow_prompt_logging, approval_posture, policy_json
       FROM tenant_policies
       WHERE tenant_id = ?
       LIMIT 1`,
    )
    .bind(tenantId)
    .first();

  const credentials = await env.DB
    .prepare(
      `SELECT provider_slug, mode, managed_secret_name, status, created_at, updated_at
       FROM provider_credentials
       WHERE tenant_id = ?
       ORDER BY updated_at DESC`,
    )
    .bind(tenantId)
    .all();

  const killSwitches = await env.DB
    .prepare(
      `SELECT provider_slug, is_enabled, reason, updated_at
       FROM tenant_provider_kill_switches
       WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .all();

  return responseJson(200, {
    tenant: {
      ...tenant,
      metadata: tenant.metadata_json ? JSON.parse(tenant.metadata_json) : {},
    },
    models: models.results,
    budget,
    rate_limit: rateLimit,
    policy: policy
      ? {
          ...(policy as Record<string, unknown>),
          policy_json: (policy as Record<string, unknown>).policy_json
            ? JSON.parse((policy as Record<string, unknown>).policy_json as string)
            : {},
        }
      : {
          read_only: 0,
          allow_prompt_logging: 0,
          approval_posture: 'operator',
          policy_json: {},
        },
    credentials: credentials.results,
    kill_switches: killSwitches.results,
  });
}

async function adminGetPerformance(request: Request, env: Env): Promise<Response> {
  if (!env.TELEMETRY_DB) {
    return responseJson(503, { error: 'TELEMETRY_DB binding not configured' });
  }

  const url = new URL(request.url);
  const windowDays = Math.max(1, Math.min(Number(url.searchParams.get('days') || 30), 365));

  const mcpFleet = await env.TELEMETRY_DB
    .prepare(
      `SELECT
         server_name,
         COUNT(*) AS invocations,
         SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS errors,
         ROUND(COALESCE(AVG(duration_ms), 0), 2) AS avg_duration_ms,
         MAX(created_at) AS last_seen
       FROM mcp_tool_invocations
       WHERE created_at > datetime('now', '-' || ? || ' days')
       GROUP BY server_name
       ORDER BY invocations DESC`,
    )
    .bind(windowDays)
    .all<{
      server_name: string;
      invocations: number;
      errors: number;
      avg_duration_ms: number;
      last_seen: string;
    }>();

  const agents = await env.TELEMETRY_DB
    .prepare(
      `SELECT
         account_id,
         COUNT(*) AS invocations,
         SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS errors,
         COUNT(DISTINCT server_name) AS servers_touched,
         MAX(created_at) AS last_seen
       FROM mcp_tool_invocations
       WHERE created_at > datetime('now', '-' || ? || ' days')
       GROUP BY account_id
       ORDER BY invocations DESC
       LIMIT 200`,
    )
    .bind(windowDays)
    .all<{
      account_id: string;
      invocations: number;
      errors: number;
      servers_touched: number;
      last_seen: string;
    }>();

  const tenantScorecards = await env.TELEMETRY_DB
    .prepare(
      `SELECT
         gr.tenant_id,
         COALESCE(MAX(gr.tenant_slug), gr.tenant_id) AS tenant_slug,
         COUNT(*) AS requests,
         SUM(CASE WHEN gr.success = 1 THEN 1 ELSE 0 END) AS successful,
         SUM(CASE WHEN gr.success = 0 THEN 1 ELSE 0 END) AS failed,
         COUNT(DISTINCT gr.provider_slug) AS active_providers,
         COUNT(DISTINCT COALESCE(gr.model_name, 'unknown')) AS active_models,
         ROUND(COALESCE(SUM(gr.estimated_cost_usd), 0), 6) AS total_cost_usd,
         COALESCE(SUM(gr.total_tokens), 0) AS total_tokens,
         ROUND(COALESCE(AVG(gr.latency_ms), 0), 2) AS avg_latency_ms,
         SUM(CASE WHEN gr.rate_limited = 1 THEN 1 ELSE 0 END) AS rate_limited_events,
         SUM(CASE WHEN gr.failover_activated = 1 THEN 1 ELSE 0 END) AS failover_events,
         SUM(CASE WHEN gr.budget_decision = 'warn' THEN 1 ELSE 0 END) AS budget_warn_events,
         SUM(CASE WHEN gr.budget_decision = 'block' THEN 1 ELSE 0 END) AS budget_block_events
       FROM gateway_requests gr
       WHERE gr.created_at > datetime('now', '-' || ? || ' days')
       GROUP BY gr.tenant_id
       ORDER BY requests DESC`,
    )
    .bind(windowDays)
    .all<{
      tenant_id: string;
      tenant_slug: string;
      requests: number;
      successful: number;
      failed: number;
      active_providers: number;
      active_models: number;
      total_cost_usd: number;
      total_tokens: number;
      avg_latency_ms: number;
      rate_limited_events: number;
      failover_events: number;
      budget_warn_events: number;
      budget_block_events: number;
    }>();

  return responseJson(200, {
    windowDays,
    mcpFleet: mcpFleet.results,
    agents: agents.results,
    tenantScorecards: tenantScorecards.results.map((row) => {
      const successRate = row.requests > 0 ? (row.successful / row.requests) * 100 : 0;
      const errorRate = row.requests > 0 ? (row.failed / row.requests) * 100 : 0;
      const costPer1k = row.total_tokens > 0 ? row.total_cost_usd / (row.total_tokens / 1000) : 0;
      return {
        tenantId: row.tenant_id,
        tenantSlug: row.tenant_slug,
        adoption: {
          requests: row.requests,
          activeProviders: row.active_providers,
          activeModels: row.active_models,
        },
        costEfficiency: {
          totalCostUsd: row.total_cost_usd,
          totalTokens: row.total_tokens,
          costPer1kTokensUsd: Number(costPer1k.toFixed(6)),
        },
        reliability: {
          successRatePercent: Number(successRate.toFixed(2)),
          errorRatePercent: Number(errorRate.toFixed(2)),
          avgLatencyMs: row.avg_latency_ms,
          failoverEvents: row.failover_events,
          rateLimitedEvents: row.rate_limited_events,
        },
        policyRisk: {
          budgetWarnEvents: row.budget_warn_events,
          budgetBlockEvents: row.budget_block_events,
        },
      };
    }),
  });
}

async function handleAdmin(request: Request, env: Env, pathname: string): Promise<Response> {
  const isAuthorized = await requireAdmin(request, env);
  if (!isAuthorized) {
    return responseJson(401, {
      error: 'Unauthorized',
      hint: 'Provide x-cs-admin-token or Bearer token with OPERATOR_API_TOKEN',
    });
  }

  if (pathname === '/api/health') {
    return responseJson(200, {
      ok: true,
      timestamp: nowIso(),
    });
  }

  if (ADMIN_PERFORMANCE_RE.test(pathname) && request.method === 'GET') {
    return adminGetPerformance(request, env);
  }

  if (ADMIN_TENANTS_RE.test(pathname)) {
    if (request.method === 'GET') return adminListTenants(env);
    if (request.method === 'POST') return adminCreateTenant(request, env);
    return responseJson(405, { error: 'Method not allowed' });
  }

  const tenantMatch = pathname.match(ADMIN_TENANT_RE);
  if (tenantMatch && request.method === 'GET') {
    return adminGetTenantConfig(env, tenantMatch[1]);
  }

  const runtimeKeyMatch = pathname.match(ADMIN_TENANT_RUNTIME_KEYS_RE);
  if (runtimeKeyMatch && request.method === 'POST') {
    return adminCreateRuntimeKey(request, env, runtimeKeyMatch[1]);
  }

  const credentialMatch = pathname.match(ADMIN_TENANT_PROVIDER_CREDS_RE);
  if (credentialMatch && request.method === 'POST') {
    return adminUpsertProviderCredential(request, env, credentialMatch[1]);
  }

  const policyMatch = pathname.match(ADMIN_TENANT_POLICY_RE);
  if (policyMatch && request.method === 'PUT') {
    return adminUpdatePolicy(request, env, policyMatch[1]);
  }

  const usageMatch = pathname.match(ADMIN_TENANT_USAGE_RE);
  if (usageMatch && request.method === 'GET') {
    return adminGetUsage(request, env, usageMatch[1]);
  }

  return responseJson(404, { error: 'Admin route not found' });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === '/' || pathname === '/health') {
      return responseJson(200, {
        ok: true,
        service: 'gateway-control-worker',
        endpoints: {
          runtime: ['/v1/responses', '/v1/chat/completions', '/v1/models'],
          admin: ['/api/tenants', '/api/tenants/:tenantId/*', '/api/admin/performance'],
        },
        timestamp: nowIso(),
      });
    }

    if (pathname.startsWith('/api/')) {
      try {
        return await handleAdmin(request, env, pathname);
      } catch (error) {
        return responseJson(500, {
          error: 'Admin operation failed',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (!RUNTIME_ENDPOINTS.has(pathname)) {
      return responseJson(404, { error: 'Route not found' });
    }

    if (request.method === 'GET' && pathname === '/v1/models') {
      const auth = await authenticateRuntimeKey(request, env.DB);
      if (!auth) {
        return responseJson(401, { error: 'Unauthorized runtime key' });
      }
      return handleRuntimeModels(auth.record, env.DB);
    }

    if (request.method !== 'POST') {
      return responseJson(405, { error: 'Method not allowed' });
    }

    const auth = await authenticateRuntimeKey(request, env.DB);
    if (!auth) {
      return responseJson(401, { error: 'Unauthorized runtime key' });
    }

    try {
      const response = await handleRuntimeRequest(request, env, pathname, auth);
      await cleanupRateCounterGarbage(env.DB);
      return response;
    } catch (error) {
      return responseJson(500, {
        error: 'Runtime request failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
