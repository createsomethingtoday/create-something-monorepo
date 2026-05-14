export type RecallMode = 'fast' | 'thinking';
export type ContextRecallOutputFormat = 'json' | 'compiled';

export type HydraConfig = {
  apiBaseUrl: string;
  apiKey: string;
  allowedSubTenantIds: string[];
  defaultSubTenantId: string;
  tenantId: string;
};

export type ContextRecallInput = {
  graphContext?: boolean;
  maxResults?: number;
  mode?: RecallMode;
  query: string;
  subTenantId?: string;
};

export type HydraRecallPayload = {
  tenant_id: string;
  sub_tenant_id: string;
  query: string;
  max_results: number;
  mode: RecallMode;
  alpha: number;
  recency_bias: number;
  graph_context: boolean;
};

export type HydraRecallChunk = {
  chunk_content?: string;
  relevancy_score?: number;
  source_id?: string;
  source_title?: string;
  source_url?: string;
  additional_metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type HydraRecallResponse = {
  chunks?: HydraRecallChunk[];
  [key: string]: unknown;
};

export type ContextRecallResult = {
  query: string;
  resultCount: number;
  server: 'hydradb-context-mcp';
  subTenantId: string;
  tenantId: string;
  chunks: Array<{
    excerpt: string;
    score?: number;
    sourceId?: string;
    sourceTitle?: string;
    sourceUrl?: string;
    metadata?: Record<string, unknown>;
  }>;
};

export type CompiledRecallSource = {
  index: number;
  label: string;
  score?: number;
  sourceId?: string;
  sourceTitle?: string;
  sourceUrl?: string;
};

export type CompiledRecallContext = {
  compiledContext: string;
  query: string;
  resultCount: number;
  server: 'hydradb-context-mcp';
  sources: CompiledRecallSource[];
  subTenantId: string;
  tenantId: string;
};
