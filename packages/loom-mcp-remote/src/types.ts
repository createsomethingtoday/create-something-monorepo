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
  BRAINTRUST_API_KEY?: string;
  BRAINTRUST_PROJECT_NAME?: string;
  BRAINTRUST_PROJECT_ID?: string;
  BRAINTRUST_ENABLED?: string;
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

export interface MigrationPayload {
  tasks: TaskRow[];
  dependencies: DependencyRow[];
  sessions: SessionRow[];
  checkpoints: CheckpointRow[];
  agentExecutions?: Array<Omit<AgentExecutionRow, 'id'>>;
}
