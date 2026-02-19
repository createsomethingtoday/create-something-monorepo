export interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TenantConfig {
  tenant: {
    id: string;
    slug: string;
    name: string;
    status: string;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  };
  models: Array<{
    provider_slug: string;
    model_name: string;
    is_enabled: number;
    max_output_tokens: number | null;
  }>;
  budget: {
    monthly_budget_usd: number | null;
    warn_threshold_percent: number;
    hard_limit_enabled: number;
    alert_webhook_url: string | null;
  } | null;
  rate_limit: {
    requests_per_minute: number;
    burst_limit: number;
    window_seconds: number;
  } | null;
  policy: {
    read_only: number;
    allow_prompt_logging: number;
    approval_posture: string;
    policy_json: Record<string, unknown>;
  };
  credentials: Array<{
    provider_slug: string;
    mode: 'managed' | 'byok';
    managed_secret_name: string | null;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
  }>;
  kill_switches: Array<{
    provider_slug: string;
    is_enabled: number;
    reason: string | null;
    updated_at: string;
  }>;
}

export interface TenantUsage {
  tenant_id: string;
  summary: {
    requests: number;
    successful: number;
    failed: number;
    tokens: number;
    total_cost_usd: number;
    avg_latency_ms: number;
  };
  by_model: Array<{
    provider_slug: string;
    model_name: string;
    requests: number;
    tokens: number;
    cost_usd: number;
  }>;
}

export interface AdminPerformance {
  windowDays: number;
  mcpFleet: Array<{
    server_name: string;
    invocations: number;
    errors: number;
    avg_duration_ms: number;
    last_seen: string;
  }>;
  agents: Array<{
    account_id: string;
    invocations: number;
    errors: number;
    servers_touched: number;
    last_seen: string;
  }>;
  tenantScorecards: Array<{
    tenantId: string;
    tenantSlug: string;
    adoption: { requests: number; activeProviders: number; activeModels: number };
    costEfficiency: { totalCostUsd: number; totalTokens: number; costPer1kTokensUsd: number };
    reliability: { successRatePercent: number; errorRatePercent: number; avgLatencyMs: number; failoverEvents: number; rateLimitedEvents: number };
    policyRisk: { budgetWarnEvents: number; budgetBlockEvents: number };
  }>;
}

interface RequestOptions {
  baseUrl: string;
  adminToken: string;
}

async function request<T>(
  options: RequestOptions,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${options.baseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-cs-admin-token': options.adminToken,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

export async function listTenants(options: RequestOptions): Promise<{ tenants: TenantSummary[] }> {
  return request(options, '/api/tenants');
}

export async function getTenant(options: RequestOptions, tenantId: string): Promise<TenantConfig> {
  return request(options, `/api/tenants/${tenantId}`);
}

export async function getTenantUsage(
  options: RequestOptions,
  tenantId: string,
  from?: string,
  to?: string,
): Promise<TenantUsage> {
  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request(options, `/api/tenants/${tenantId}/usage${suffix}`);
}

export async function createTenant(
  options: RequestOptions,
  input: { name: string; slug?: string },
): Promise<{ id: string; slug: string; name: string }> {
  return request(options, '/api/tenants', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function createRuntimeKey(
  options: RequestOptions,
  tenantId: string,
  label: string,
): Promise<{ key: string; key_prefix: string; id: string }> {
  return request(options, `/api/tenants/${tenantId}/runtime-keys`, {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
}

export async function upsertCredential(
  options: RequestOptions,
  tenantId: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return request(options, `/api/tenants/${tenantId}/provider-credentials`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePolicy(
  options: RequestOptions,
  tenantId: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return request(options, `/api/tenants/${tenantId}/policy`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getAdminPerformance(
  options: RequestOptions,
  days: number = 30,
): Promise<AdminPerformance> {
  return request(options, `/api/admin/performance?days=${encodeURIComponent(String(days))}`);
}
