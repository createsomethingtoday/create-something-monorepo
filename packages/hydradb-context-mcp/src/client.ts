import type {
  ContextRecallInput,
  ContextRecallResult,
  HydraConfig,
  HydraRecallPayload,
  HydraRecallResponse
} from './types.js';
import { redactJson, redactSecrets } from './redaction.js';

type FetchResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
};

type FetchLike = (
  url: string,
  init: { body: string; headers: Record<string, string>; method: 'POST' }
) => Promise<FetchResponse>;

const DEFAULT_API_BASE = 'https://api.hydradb.com';

export function resolveHydraConfig(env: NodeJS.ProcessEnv = process.env): HydraConfig {
  const apiKey = requireEnv(env, 'HYDRA_DB_API_KEY');
  const tenantId = requireEnv(env, 'HYDRA_DB_TENANT_ID');
  const defaultSubTenantId = requireEnv(env, 'HYDRA_DB_SUB_TENANT_ID');
  const allowedSubTenantIds = (env.HYDRA_DB_ALLOWED_SUB_TENANT_IDS?.trim() || defaultSubTenantId)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    apiBaseUrl: (env.HYDRA_DB_API_BASE?.trim() || DEFAULT_API_BASE).replace(/\/$/, ''),
    apiKey,
    allowedSubTenantIds,
    defaultSubTenantId,
    tenantId
  };
}

export function resolveSubTenantId(config: HydraConfig, requested?: string): string {
  const subTenantId = requested?.trim() || config.defaultSubTenantId;
  if (
    config.allowedSubTenantIds.includes('*') ||
    config.allowedSubTenantIds.includes(subTenantId)
  ) {
    return subTenantId;
  }
  throw new Error(`Hydra DB sub-tenant is not allowed: ${subTenantId}`);
}

export function buildRecallPayload(
  config: HydraConfig,
  input: ContextRecallInput
): HydraRecallPayload {
  return {
    tenant_id: config.tenantId,
    sub_tenant_id: resolveSubTenantId(config, input.subTenantId),
    query: input.query,
    max_results: input.maxResults ?? 5,
    mode: input.mode ?? 'thinking',
    alpha: 0.8,
    recency_bias: 0,
    graph_context: input.graphContext ?? true
  };
}

export class HydraRecallClient {
  constructor(
    private readonly config: HydraConfig,
    private readonly fetchImpl: FetchLike = defaultFetch
  ) {}

  async recall(input: ContextRecallInput): Promise<ContextRecallResult> {
    const payload = buildRecallPayload(this.config, input);
    const response = await this.fetchImpl(`${this.config.apiBaseUrl}/recall/recall_preferences`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Hydra DB recall failed with ${response.status}: ${redactSecrets(text)}`);
    }

    const data = (await response.json()) as HydraRecallResponse;
    const chunks = data.chunks ?? [];
    return {
      query: input.query,
      resultCount: chunks.length,
      server: 'hydradb-context-mcp',
      subTenantId: payload.sub_tenant_id,
      tenantId: this.config.tenantId,
      chunks: chunks.map((chunk) => ({
        excerpt: redactSecrets((chunk.chunk_content ?? '').slice(0, 1200)),
        score: typeof chunk.relevancy_score === 'number' ? chunk.relevancy_score : undefined,
        sourceId: typeof chunk.source_id === 'string' ? chunk.source_id : undefined,
        sourceTitle:
          typeof chunk.source_title === 'string' && chunk.source_title.trim()
            ? redactSecrets(chunk.source_title.trim())
            : undefined,
        sourceUrl:
          typeof chunk.source_url === 'string' && chunk.source_url.trim()
            ? redactSecrets(chunk.source_url.trim())
            : undefined,
        metadata: redactJson(chunk.additional_metadata) as Record<string, unknown> | undefined
      }))
    };
  }
}

function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function defaultFetch(
  url: string,
  init: { body: string; headers: Record<string, string>; method: 'POST' }
): Promise<FetchResponse> {
  const fetchImpl = (globalThis as { fetch?: FetchLike }).fetch;
  if (!fetchImpl) throw new Error('global fetch is not available. Use Node 18 or newer.');
  return fetchImpl(url, init);
}
