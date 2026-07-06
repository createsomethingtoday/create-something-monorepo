export type LoomStatus = 'ready' | 'claimed' | 'blocked' | 'done' | 'cancelled';

export type LoomPriority = 'critical' | 'high' | 'normal' | 'low';

export type LoomIssueType = 'bug' | 'feature' | 'task' | 'epic' | 'chore';

export type LoomSessionStatus = 'active' | 'completed' | 'failed' | 'interrupted' | 'cancelled';

export interface Env {
  DB: D1Database;
  TELEMETRY_DB?: D1Database;
  MCP_ACCOUNT_ID?: string;
  LOOM_ACCOUNT_ID?: string;
  LOOM_MCP_API_TOKEN?: string;
  MIGRATION_ADMIN_TOKEN?: string;
  MIGRATION_SIGNING_SECRET?: string;
  LOOM_REPO_ID?: string;
  LOOM_NOTION_TOKEN?: string;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_PROJECT_NAME?: string;
  LANGFUSE_ENABLED?: string;
}

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: LoomStatus;
  priority: LoomPriority;
  issue_type: LoomIssueType;
  agent: string | null;
  labels_json: string;
  parent: string | null;
  evidence: string | null;
  actual_cost_usd: number | null;
  repo: string | null;
  close_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface DependencyRow {
  task_id: string;
  depends_on: string;
  dep_type: string;
  created_at: string;
}

export interface SessionRow {
  id: string;
  agent_id: string;
  task_id: string;
  status: LoomSessionStatus;
  started_at: string;
  ended_at: string | null;
  working_dir: string | null;
  git_branch: string | null;
  last_checkpoint: string | null;
  context_json: string;
}

export interface CheckpointRow {
  id: string;
  session_id: string;
  sequence: number;
  summary: string;
  context_json: string | null;
  git_commit: string | null;
  created_at: string;
}

export interface AgentExecutionRow {
  id: number;
  agent_id: string;
  task_id: string;
  task_type: string | null;
  success: number;
  duration_secs: number;
  created_at: string;
}

export interface AgentCapabilities {
  planning: number;
  coding: number;
  debugging: number;
  ui: number;
  docs: number;
  refactor: number;
  testing: number;
  mcp: boolean;
  checkpoints: boolean;
  git_aware: boolean;
  sub_agents: boolean;
  max_context: number;
}

export interface AgentCostModel {
  input_per_1k: number;
  output_per_1k: number;
  output_ratio: number;
}

export interface AgentQualityMetrics {
  successes: number;
  failures: number;
  avg_duration_secs: number;
  by_type: Record<string, number>;
}

export interface AgentProfile {
  id: string;
  name: string;
  cli_path: string;
  capabilities: AgentCapabilities;
  cost: AgentCostModel;
  quality: AgentQualityMetrics;
  max_concurrent: number;
  active: number;
  available: boolean;
  last_used: string | null;
}

export interface AgentProfileRow {
  id: string;
  profile_json: string;
  updated_at: string;
}

export interface RuntimeSettingRow {
  key: string;
  value_json: string;
  updated_at: string;
}

export interface DispatchAgentConfig {
  path?: string;
  max_concurrent?: number;
  cost_per_1k?: number;
  features?: {
    rewind?: boolean;
    mcp?: boolean;
    git_aware?: boolean;
    sub_agents?: boolean;
  };
  args?: string[];
}

export interface DispatchConfig {
  agents?: Record<string, DispatchAgentConfig>;
  routing?: {
    default?: string | null;
    labels?: Record<string, string>;
  };
}

export interface ModelConfig {
  family?: string;
  tier?: string;
  name?: string;
  cli?: string;
  input_per_1k?: number;
  output_per_1k?: number;
  output_ratio?: number;
  planning?: number;
  coding?: number;
  debugging?: number;
  ui?: number;
  docs?: number;
  refactor?: number;
  testing?: number;
  max_context?: number;
  mcp?: boolean;
  checkpoints?: boolean;
  git_aware?: boolean;
  sub_agents?: boolean;
  max_concurrent?: number;
}

export interface ModelsConfig {
  models?: Record<string, ModelConfig>;
}

export interface NotionRuntimeConfig {
  databaseId?: string | null;
  lastSyncAt?: string | null;
  lastSyncSummary?: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
    dryRun: boolean;
  } | null;
}

export interface RuntimeSettings {
  repoId?: string | null;
  repoName?: string | null;
  issuePrefix?: string | null;
  notion?: NotionRuntimeConfig;
  source?: {
    repoPath?: string;
    loomDir?: string;
  };
  [key: string]: unknown;
}

export interface MigrationPayload {
  tasks: TaskRow[];
  dependencies: DependencyRow[];
  sessions: SessionRow[];
  checkpoints: CheckpointRow[];
  agentExecutions?: Array<Omit<AgentExecutionRow, 'id'>>;
  agentProfiles?: AgentProfileRow[];
  dispatchConfig?: DispatchConfig;
  modelsConfig?: ModelsConfig;
  runtimeSettings?: RuntimeSettings;
}
