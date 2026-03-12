export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface BlockerRef {
  id: string | null;
  identifier: string | null;
  state: string | null;
}

export interface Issue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: number | null;
  state: string;
  branch_name: string | null;
  url: string | null;
  labels: string[];
  blocked_by: BlockerRef[];
  created_at: string | null;
  updated_at: string | null;
}

export interface WorkflowDefinition {
  path: string;
  config: Record<string, unknown>;
  prompt_template: string;
}

export interface ServiceConfig {
  workflow_path: string;
  tracker: {
    kind: 'linear';
    endpoint: string;
    api_key: string;
    project_slug: string;
    active_states: string[];
    terminal_states: string[];
    network_timeout_ms: number;
    page_size: number;
  };
  polling: {
    interval_ms: number;
  };
  workspace: {
    root: string;
  };
  hooks: {
    after_create: string | null;
    before_run: string | null;
    after_run: string | null;
    before_remove: string | null;
    timeout_ms: number;
  };
  agent: {
    max_concurrent_agents: number;
    max_turns: number;
    max_retry_backoff_ms: number;
    max_concurrent_agents_by_state: Record<string, number>;
  };
  codex: {
    command: string;
    approval_policy: string | null;
    thread_sandbox: string | null;
    turn_sandbox_policy: JsonObject | null;
    turn_timeout_ms: number;
    read_timeout_ms: number;
    stall_timeout_ms: number;
  };
  server: {
    port: number | null;
  };
}

export interface Workspace {
  path: string;
  workspace_key: string;
  created_now: boolean;
}

export interface RetryEntry {
  issue_id: string;
  identifier: string | null;
  attempt: number;
  due_at_ms: number;
  error: string | null;
}

export interface CodexUsageTotals {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface CodexEvent {
  event:
    | 'session_started'
    | 'startup_failed'
    | 'turn_completed'
    | 'turn_failed'
    | 'turn_cancelled'
    | 'turn_ended_with_error'
    | 'turn_input_required'
    | 'approval_auto_approved'
    | 'unsupported_tool_call'
    | 'notification'
    | 'other_message'
    | 'malformed';
  timestamp: string;
  codex_app_server_pid: number | null;
  session_id?: string | null;
  thread_id?: string | null;
  turn_id?: string | null;
  usage?: CodexUsageTotals;
  rate_limits?: JsonObject | null;
  message?: string | null;
  raw?: JsonObject | null;
}

export interface RunningEntry {
  issue: Issue;
  identifier: string;
  session_id: string | null;
  codex_app_server_pid: number | null;
  last_codex_event: string | null;
  last_codex_timestamp: string | null;
  last_codex_message: string | null;
  codex_input_tokens: number;
  codex_output_tokens: number;
  codex_total_tokens: number;
  last_reported_input_tokens: number;
  last_reported_output_tokens: number;
  last_reported_total_tokens: number;
  retry_attempt: number | null;
  started_at: string;
  turn_count: number;
  restart_count: number;
  last_error: string | null;
  recent_events: Array<{ at: string; event: string; message: string | null }>;
}

export interface RuntimeSnapshot {
  generated_at: string;
  counts: {
    running: number;
    retrying: number;
  };
  running: Array<{
    issue_id: string;
    issue_identifier: string;
    state: string;
    session_id: string | null;
    turn_count: number;
    last_event: string | null;
    last_message: string | null;
    started_at: string;
    last_event_at: string | null;
    tokens: CodexUsageTotals;
  }>;
  retrying: Array<{
    issue_id: string;
    issue_identifier: string | null;
    attempt: number;
    due_at: string;
    error: string | null;
  }>;
  codex_totals: CodexUsageTotals & {
    seconds_running: number;
  };
  rate_limits: JsonObject | null;
}

export interface IssueRuntimeSnapshot {
  issue_identifier: string;
  issue_id: string;
  status: 'running' | 'retrying' | 'released';
  workspace: {
    path: string;
  };
  attempts: {
    restart_count: number;
    current_retry_attempt: number | null;
  };
  running: RuntimeSnapshot['running'][number] | null;
  retry: RuntimeSnapshot['retrying'][number] | null;
  recent_events: Array<{ at: string; event: string; message: string | null }>;
  last_error: string | null;
  tracked: Record<string, JsonValue>;
}

export interface LoggerFields {
  [key: string]: string | number | boolean | null | undefined;
}

export interface Logger {
  debug(message: string, fields?: LoggerFields): void;
  info(message: string, fields?: LoggerFields): void;
  warn(message: string, fields?: LoggerFields): void;
  error(message: string, fields?: LoggerFields): void;
}

export interface TrackerClient {
  fetch_candidate_issues(): Promise<Issue[]>;
  fetch_issues_by_states(states: string[]): Promise<Issue[]>;
  fetch_issue_states_by_ids(issue_ids: string[]): Promise<Issue[]>;
}

export interface WorkerRunResult {
  status: 'completed' | 'failed' | 'cancelled';
  error: string | null;
  turn_count: number;
  issue: Issue;
}

export interface WorkerRun {
  promise: Promise<WorkerRunResult>;
  terminate(reason: string): Promise<void>;
}

export interface WorkerDependencies {
  config: ServiceConfig;
  tracker: TrackerClient;
  workspace_manager: {
    ensure_workspace(issue_identifier: string): Promise<Workspace>;
    remove_workspace(issue_identifier: string): Promise<void>;
  };
  logger: Logger;
  on_event: (issue: Issue, event: CodexEvent) => void;
}
