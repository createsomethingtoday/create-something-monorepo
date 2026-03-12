import { createServer, type Server } from 'node:http';
import { ConsoleLogger } from './logger.js';
import { LinearTrackerClient } from './tracker/linear.js';
import { validate_dispatch_config } from './config.js';
import { WorkflowManager } from './workflow.js';
import { WorkspaceManager } from './workspace.js';
import { create_agent_worker_run } from './agent-worker.js';
import type {
  CodexEvent,
  Issue,
  IssueRuntimeSnapshot,
  Logger,
  RetryEntry,
  RunningEntry,
  RuntimeSnapshot,
  ServiceConfig,
  TrackerClient,
  JsonObject,
  WorkerRun,
  WorkerRunResult,
  WorkflowDefinition,
} from './types.js';

type RetryTimerEntry = {
  entry: RetryEntry;
  timer: NodeJS.Timeout;
};

type RunningWorkerState = {
  entry: RunningEntry;
  run: WorkerRun;
  workspace_path: string;
  stop_behavior: { mode: 'default' } | { mode: 'release'; cleanup_workspace: boolean } | { mode: 'retry'; reason: string };
};

type ServiceDependencies = {
  workflow_manager?: WorkflowManager;
  tracker_factory?: (config: ServiceConfig, logger: Logger) => TrackerClient;
  worker_factory?: (
    issue: Issue,
    attempt: number | null,
    prompt_template: string,
    config: ServiceConfig,
    tracker: TrackerClient,
    workspace_manager: WorkspaceManager,
    logger: Logger,
    on_event: (event: CodexEvent) => void
  ) => WorkerRun;
};

function now_iso(): string {
  return new Date().toISOString();
}

function now_ms(): number {
  return Date.now();
}

function normalize_state(value: string): string {
  return value.trim().toLowerCase();
}

function created_at_sort_value(issue: Issue): number {
  if (!issue.created_at) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(issue.created_at);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function priority_sort_value(issue: Issue): number {
  return issue.priority ?? Number.POSITIVE_INFINITY;
}

function is_terminal_state(issue: Issue, config: ServiceConfig): boolean {
  const normalized = normalize_state(issue.state);
  return config.tracker.terminal_states.some((state) => normalize_state(state) === normalized);
}

function is_active_state(issue: Issue, config: ServiceConfig): boolean {
  const normalized = normalize_state(issue.state);
  return config.tracker.active_states.some((state) => normalize_state(state) === normalized);
}

function retry_delay_ms(config: ServiceConfig, attempt: number, continuation: boolean): number {
  if (continuation) return 1000;
  return Math.min(10_000 * 2 ** Math.max(0, attempt - 1), config.agent.max_retry_backoff_ms);
}

function default_tracker_factory(config: ServiceConfig, logger: Logger): TrackerClient {
  return new LinearTrackerClient(config, logger);
}

function to_running_entry(issue: Issue, attempt: number | null): RunningEntry {
  return {
    issue,
    identifier: issue.identifier,
    session_id: null,
    codex_app_server_pid: null,
    last_codex_event: null,
    last_codex_timestamp: null,
    last_codex_message: null,
    codex_input_tokens: 0,
    codex_output_tokens: 0,
    codex_total_tokens: 0,
    last_reported_input_tokens: 0,
    last_reported_output_tokens: 0,
    last_reported_total_tokens: 0,
    retry_attempt: attempt,
    started_at: now_iso(),
    turn_count: 0,
    restart_count: attempt ?? 0,
    last_error: null,
    recent_events: [],
  };
}

export interface SymphonyServiceOptions {
  workflow_path?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  logger?: Logger;
  port?: number | null;
  dependencies?: ServiceDependencies;
}

export class SymphonyService {
  private readonly logger: Logger;
  private readonly workflow_manager: WorkflowManager;
  private readonly tracker_factory: (config: ServiceConfig, logger: Logger) => TrackerClient;
  private readonly worker_factory: NonNullable<ServiceDependencies['worker_factory']>;
  private current_definition!: WorkflowDefinition;
  private current_config!: ServiceConfig;
  private tracker!: TrackerClient;
  private workspace_manager!: WorkspaceManager;
  private readonly running = new Map<string, RunningWorkerState>();
  private readonly claimed = new Set<string>();
  private readonly retry_attempts = new Map<string, RetryTimerEntry>();
  private readonly completed = new Set<string>();
  private readonly codex_totals = {
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    seconds_running_ended: 0,
  };
  private codex_rate_limits: JsonObject | null = null;
  private tick_timer: NodeJS.Timeout | null = null;
  private tick_running = false;
  private pending_refresh = false;
  private started = false;
  private http_server: Server | null = null;
  private readonly requested_port: number | null;

  constructor(options: SymphonyServiceOptions = {}) {
    this.logger = options.logger ?? new ConsoleLogger();
    this.workflow_manager =
      options.dependencies?.workflow_manager ??
      new WorkflowManager({
        workflow_path: options.workflow_path,
        cwd: options.cwd,
        env: options.env,
        logger: this.logger,
      });
    this.tracker_factory = options.dependencies?.tracker_factory ?? default_tracker_factory;
    this.worker_factory =
      options.dependencies?.worker_factory ??
      ((issue, attempt, prompt_template, config, tracker, workspace_manager, logger, on_event) =>
        create_agent_worker_run(issue, attempt, prompt_template, config, tracker, workspace_manager, logger, on_event));
    this.requested_port = options.port ?? null;
  }

  async start(): Promise<void> {
    if (this.started) return;
    const loaded = await this.workflow_manager.initialize();
    this.apply_workflow(loaded.definition, loaded.config);
    await this.startup_terminal_workspace_cleanup();
    this.workflow_manager.on_reload(({ definition, config }) => {
      this.apply_workflow(definition, config);
    });
    this.workflow_manager.start_watching();
    await this.maybe_start_http_server();
    this.started = true;
    this.schedule_tick(0);
  }

  async run_once(): Promise<void> {
    if (!this.current_config) {
      const loaded = await this.workflow_manager.initialize();
      this.apply_workflow(loaded.definition, loaded.config);
    }
    await this.startup_terminal_workspace_cleanup();
    await this.run_tick(false);
  }

  async stop(): Promise<void> {
    this.started = false;
    if (this.tick_timer) {
      clearTimeout(this.tick_timer);
      this.tick_timer = null;
    }
    for (const retry of this.retry_attempts.values()) {
      clearTimeout(retry.timer);
    }
    this.retry_attempts.clear();
    for (const state of this.running.values()) {
      state.stop_behavior = { mode: 'release', cleanup_workspace: false };
      await state.run.terminate('service stopping');
    }
    this.running.clear();
    this.claimed.clear();
    this.workflow_manager.stop_watching();
    if (this.http_server) {
      await new Promise<void>((resolve, reject) => {
        this.http_server?.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      this.http_server = null;
    }
  }

  request_refresh(): { queued: boolean; coalesced: boolean; requested_at: string } {
    const coalesced = this.tick_running || this.tick_timer !== null;
    this.pending_refresh = true;
    if (!this.tick_running) {
      this.schedule_tick(0);
    }
    return { queued: true, coalesced, requested_at: now_iso() };
  }

  get_snapshot(): RuntimeSnapshot {
    const generated_at = now_iso();
    const running = [...this.running.values()].map(({ entry }) => ({
      issue_id: entry.issue.id,
      issue_identifier: entry.issue.identifier,
      state: entry.issue.state,
      session_id: entry.session_id,
      turn_count: entry.turn_count,
      last_event: entry.last_codex_event,
      last_message: entry.last_codex_message,
      started_at: entry.started_at,
      last_event_at: entry.last_codex_timestamp,
      tokens: {
        input_tokens: entry.codex_input_tokens,
        output_tokens: entry.codex_output_tokens,
        total_tokens: entry.codex_total_tokens,
      },
    }));

    const retrying = [...this.retry_attempts.values()].map(({ entry }) => ({
      issue_id: entry.issue_id,
      issue_identifier: entry.identifier,
      attempt: entry.attempt,
      due_at: new Date(entry.due_at_ms).toISOString(),
      error: entry.error,
    }));

    return {
      generated_at,
      counts: {
        running: running.length,
        retrying: retrying.length,
      },
      running,
      retrying,
      codex_totals: {
        input_tokens: this.codex_totals.input_tokens,
        output_tokens: this.codex_totals.output_tokens,
        total_tokens: this.codex_totals.total_tokens,
        seconds_running: this.compute_seconds_running(),
      },
      rate_limits: this.codex_rate_limits,
    };
  }

  get_issue_snapshot(issue_identifier: string): IssueRuntimeSnapshot | null {
    const running = [...this.running.values()].find((state) => state.entry.issue.identifier === issue_identifier);
    const retry = [...this.retry_attempts.values()].find((state) => state.entry.identifier === issue_identifier);
    if (!running && !retry) return null;

    const running_view = running
      ? this.get_snapshot().running.find((entry) => entry.issue_identifier === issue_identifier) ?? null
      : null;
    const retry_view = retry
      ? this.get_snapshot().retrying.find((entry) => entry.issue_identifier === issue_identifier) ?? null
      : null;

    return {
      issue_identifier,
      issue_id: running?.entry.issue.id ?? retry?.entry.issue_id ?? '',
      status: running ? 'running' : retry ? 'retrying' : 'released',
      workspace: {
        path: running?.workspace_path ?? `${this.current_config.workspace.root}/${issue_identifier}`,
      },
      attempts: {
        restart_count: running?.entry.restart_count ?? retry?.entry.attempt ?? 0,
        current_retry_attempt: retry?.entry.attempt ?? running?.entry.retry_attempt ?? null,
      },
      running: running_view,
      retry: retry_view,
      recent_events: running?.entry.recent_events ?? [],
      last_error: running?.entry.last_error ?? retry?.entry.error ?? null,
      tracked: {},
    };
  }

  private apply_workflow(definition: WorkflowDefinition, config: ServiceConfig): void {
    validate_dispatch_config(config);
    this.current_definition = definition;
    this.current_config = config;
    this.tracker = this.tracker_factory(config, this.logger);
    this.workspace_manager = new WorkspaceManager(config, this.logger);
  }

  private async startup_terminal_workspace_cleanup(): Promise<void> {
    try {
      const issues = await this.tracker.fetch_issues_by_states(this.current_config.tracker.terminal_states);
      for (const issue of issues) {
        await this.workspace_manager.remove_workspace(issue.identifier);
      }
    } catch (error) {
      this.logger.warn('startup cleanup failed', { error: (error as Error).message });
    }
  }

  private async maybe_start_http_server(): Promise<void> {
    const port = this.requested_port ?? this.current_config.server.port;
    if (port === null) {
      return;
    }

    this.http_server = createServer(async (request, response) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      if (request.method === 'GET' && url.pathname === '/') {
        const snapshot = this.get_snapshot();
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(`
          <html><body>
            <h1>Symphony</h1>
            <p>running=${snapshot.counts.running} retrying=${snapshot.counts.retrying}</p>
            <pre>${JSON.stringify(snapshot, null, 2)}</pre>
          </body></html>
        `);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/v1/state') {
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(`${JSON.stringify(this.get_snapshot())}\n`);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/refresh') {
        response.writeHead(202, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(
          `${JSON.stringify({
            ...this.request_refresh(),
            operations: ['poll', 'reconcile'],
          })}\n`
        );
        return;
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/v1/')) {
        const issue_identifier = decodeURIComponent(url.pathname.slice('/api/v1/'.length));
        const issue = this.get_issue_snapshot(issue_identifier);
        if (!issue) {
          response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          response.end(`${JSON.stringify({ error: { code: 'issue_not_found', message: `Unknown issue: ${issue_identifier}` } })}\n`);
          return;
        }
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(`${JSON.stringify(issue)}\n`);
        return;
      }

      if (url.pathname.startsWith('/api/v1/')) {
        response.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(`${JSON.stringify({ error: { code: 'method_not_allowed', message: 'Method not allowed.' } })}\n`);
        return;
      }

      response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(`${JSON.stringify({ error: { code: 'not_found', message: 'Not found.' } })}\n`);
    });

    await new Promise<void>((resolve, reject) => {
      this.http_server?.once('error', reject);
      this.http_server?.listen(port, '127.0.0.1', () => resolve());
    });
  }

  private schedule_tick(delay_ms: number): void {
    if (!this.started && delay_ms !== 0) {
      return;
    }
    if (this.tick_timer) {
      clearTimeout(this.tick_timer);
      this.tick_timer = null;
    }
    this.tick_timer = setTimeout(() => {
      this.tick_timer = null;
      void this.run_tick(true);
    }, delay_ms);
  }

  private async run_tick(schedule_next: boolean): Promise<void> {
    if (this.tick_running) {
      this.pending_refresh = true;
      return;
    }

    this.tick_running = true;
    try {
      try {
        await this.workflow_manager.reload_if_changed();
        const current = this.workflow_manager.get_current();
        this.apply_workflow(current.definition, current.config);
      } catch (error) {
        this.logger.error('workflow reload failed', { error: (error as Error).message });
      }

      await this.reconcile_running_issues();

      try {
        validate_dispatch_config(this.current_config);
      } catch (error) {
        this.logger.error('dispatch validation failed', { error: (error as Error).message });
        return;
      }

      let issues: Issue[];
      try {
        issues = await this.tracker.fetch_candidate_issues();
      } catch (error) {
        this.logger.error('candidate fetch failed', { error: (error as Error).message });
        return;
      }

      for (const issue of issues.sort((left, right) => {
        const priority_delta = priority_sort_value(left) - priority_sort_value(right);
        if (priority_delta !== 0) return priority_delta;
        const created_delta = created_at_sort_value(left) - created_at_sort_value(right);
        if (created_delta !== 0) return created_delta;
        return left.identifier.localeCompare(right.identifier);
      })) {
        if (this.available_slots() <= 0) break;
        if (this.should_dispatch(issue, false)) {
          await this.dispatch_issue(issue, null);
        }
      }
    } finally {
      this.tick_running = false;
      if (schedule_next && this.started) {
        const delay = this.pending_refresh ? 0 : this.current_config.polling.interval_ms;
        this.pending_refresh = false;
        this.schedule_tick(delay);
      }
    }
  }

  private should_dispatch(issue: Issue, ignore_claimed: boolean): boolean {
    if (!issue.id || !issue.identifier || !issue.title || !issue.state) {
      return false;
    }
    if (!is_active_state(issue, this.current_config) || is_terminal_state(issue, this.current_config)) {
      return false;
    }
    if (this.running.has(issue.id)) {
      return false;
    }
    if (!ignore_claimed && this.claimed.has(issue.id)) {
      return false;
    }
    if (normalize_state(issue.state) === 'todo' && issue.blocked_by.some((blocker) => blocker.state && !this.is_terminal_state_name(blocker.state))) {
      return false;
    }
    if (this.available_slots() <= 0) {
      return false;
    }
    return this.has_state_slot(issue.state);
  }

  private has_state_slot(state: string): boolean {
    const normalized = normalize_state(state);
    const override = this.current_config.agent.max_concurrent_agents_by_state[normalized];
    const active_for_state = [...this.running.values()].filter((entry) => normalize_state(entry.entry.issue.state) === normalized).length;
    return active_for_state < (override ?? this.current_config.agent.max_concurrent_agents);
  }

  private available_slots(): number {
    return Math.max(this.current_config.agent.max_concurrent_agents - this.running.size, 0);
  }

  private is_terminal_state_name(state: string): boolean {
    const normalized = normalize_state(state);
    return this.current_config.tracker.terminal_states.some((entry) => normalize_state(entry) === normalized);
  }

  private async dispatch_issue(issue: Issue, attempt: number | null): Promise<void> {
    const workspace = await this.workspace_manager.ensure_workspace(issue.identifier);
    const run = this.worker_factory(
      issue,
      attempt,
      this.current_definition.prompt_template,
      this.current_config,
      this.tracker,
      this.workspace_manager,
      this.logger,
      (event) => this.handle_codex_event(issue.id, event)
    );

    this.running.set(issue.id, {
      entry: to_running_entry(issue, attempt),
      run,
      workspace_path: workspace.path,
      stop_behavior: { mode: 'default' },
    });
    this.claimed.add(issue.id);

    const pending_retry = this.retry_attempts.get(issue.id);
    if (pending_retry) {
      clearTimeout(pending_retry.timer);
      this.retry_attempts.delete(issue.id);
    }

    void run.promise
      .then((result) => this.on_worker_exit(issue.id, result))
      .catch((error) =>
        this.on_worker_exit(issue.id, {
          status: 'failed',
          error: (error as Error).message,
          turn_count: this.running.get(issue.id)?.entry.turn_count ?? 0,
          issue,
        })
      );

    this.logger.info('dispatch completed', {
      issue_id: issue.id,
      issue_identifier: issue.identifier,
      attempt: attempt ?? 'null',
      workspace_path: workspace.path,
    });
  }

  private handle_codex_event(issue_id: string, event: CodexEvent): void {
    const state = this.running.get(issue_id);
    if (!state) return;

    if (event.session_id) state.entry.session_id = event.session_id;
    if (event.codex_app_server_pid !== null) state.entry.codex_app_server_pid = event.codex_app_server_pid;
    state.entry.last_codex_event = event.event;
    state.entry.last_codex_timestamp = event.timestamp;
    state.entry.last_codex_message = event.message ?? state.entry.last_codex_message;

    if (event.event === 'turn_completed') {
      state.entry.turn_count += 1;
    }
    if (event.event === 'turn_failed' || event.event === 'turn_cancelled' || event.event === 'turn_input_required') {
      state.entry.last_error = event.message ?? event.event;
    }

    if (event.usage) {
      const input_delta = Math.max(0, event.usage.input_tokens - state.entry.last_reported_input_tokens);
      const output_delta = Math.max(0, event.usage.output_tokens - state.entry.last_reported_output_tokens);
      const total_delta = Math.max(0, event.usage.total_tokens - state.entry.last_reported_total_tokens);
      state.entry.last_reported_input_tokens = event.usage.input_tokens;
      state.entry.last_reported_output_tokens = event.usage.output_tokens;
      state.entry.last_reported_total_tokens = event.usage.total_tokens;
      state.entry.codex_input_tokens = event.usage.input_tokens;
      state.entry.codex_output_tokens = event.usage.output_tokens;
      state.entry.codex_total_tokens = event.usage.total_tokens;
      this.codex_totals.input_tokens += input_delta;
      this.codex_totals.output_tokens += output_delta;
      this.codex_totals.total_tokens += total_delta;
    }

    if (event.rate_limits) {
      this.codex_rate_limits = event.rate_limits;
    }

    state.entry.recent_events.push({
      at: event.timestamp,
      event: event.event,
      message: event.message ?? null,
    });
    if (state.entry.recent_events.length > 25) {
      state.entry.recent_events.shift();
    }
  }

  private async on_worker_exit(issue_id: string, result: WorkerRunResult): Promise<void> {
    const state = this.running.get(issue_id);
    if (!state) return;

    this.running.delete(issue_id);
    this.codex_totals.seconds_running_ended += Math.max(0, (now_ms() - Date.parse(state.entry.started_at)) / 1000);

    if (state.stop_behavior.mode === 'release') {
      if (state.stop_behavior.cleanup_workspace) {
        await this.workspace_manager.remove_workspace(state.entry.issue.identifier);
      }
      this.claimed.delete(issue_id);
      return;
    }

    if (state.stop_behavior.mode === 'retry') {
      this.schedule_retry(issue_id, this.next_attempt(state.entry.retry_attempt), {
        identifier: state.entry.issue.identifier,
        error: state.stop_behavior.reason,
      });
      return;
    }

    if (!this.started) {
      this.claimed.delete(issue_id);
      return;
    }

    if (result.status === 'completed') {
      this.completed.add(issue_id);
      this.schedule_retry(issue_id, 1, {
        identifier: state.entry.issue.identifier,
        error: null,
      }, true);
      return;
    }

    this.schedule_retry(issue_id, this.next_attempt(state.entry.retry_attempt), {
      identifier: state.entry.issue.identifier,
      error: result.error ?? 'worker exited unexpectedly',
    });
  }

  private next_attempt(current: number | null): number {
    return current === null ? 1 : current + 1;
  }

  private schedule_retry(
    issue_id: string,
    attempt: number,
    meta: { identifier: string | null; error: string | null },
    continuation = false
  ): void {
    const existing = this.retry_attempts.get(issue_id);
    if (existing) {
      clearTimeout(existing.timer);
      this.retry_attempts.delete(issue_id);
    }

    const delay = retry_delay_ms(this.current_config, attempt, continuation);
    const due_at_ms = now_ms() + delay;
    const timer = setTimeout(() => {
      void this.on_retry_timer(issue_id);
    }, delay);

    this.retry_attempts.set(issue_id, {
      entry: {
        issue_id,
        identifier: meta.identifier,
        attempt,
        due_at_ms,
        error: meta.error,
      },
      timer,
    });
    this.claimed.add(issue_id);

    this.logger.info('retry scheduled retrying', {
      issue_id,
      issue_identifier: meta.identifier ?? undefined,
      attempt,
      due_at: new Date(due_at_ms).toISOString(),
      reason: meta.error ?? (continuation ? 'continuation' : 'retry'),
    });
  }

  private async on_retry_timer(issue_id: string): Promise<void> {
    const retry = this.retry_attempts.get(issue_id);
    if (!retry) return;
    this.retry_attempts.delete(issue_id);

    let candidates: Issue[];
    try {
      candidates = await this.tracker.fetch_candidate_issues();
    } catch (error) {
      this.schedule_retry(issue_id, retry.entry.attempt + 1, {
        identifier: retry.entry.identifier,
        error: 'retry poll failed',
      });
      return;
    }

    const issue = candidates.find((entry) => entry.id === issue_id) ?? null;
    if (!issue) {
      this.claimed.delete(issue_id);
      return;
    }

    if (this.available_slots() === 0) {
      this.schedule_retry(issue_id, retry.entry.attempt + 1, {
        identifier: issue.identifier,
        error: 'no available orchestrator slots',
      });
      return;
    }

    if (!this.should_dispatch(issue, true)) {
      this.claimed.delete(issue_id);
      return;
    }

    await this.dispatch_issue(issue, retry.entry.attempt);
  }

  private async reconcile_running_issues(): Promise<void> {
    await this.reconcile_stalled_runs();

    const running_ids = [...this.running.keys()];
    if (running_ids.length === 0) {
      return;
    }

    let refreshed: Issue[];
    try {
      refreshed = await this.tracker.fetch_issue_states_by_ids(running_ids);
    } catch (error) {
      this.logger.warn('reconciliation refresh failed', { error: (error as Error).message });
      return;
    }

    for (const issue of refreshed) {
      const running = this.running.get(issue.id);
      if (!running) continue;

      if (is_terminal_state(issue, this.current_config)) {
        running.stop_behavior = { mode: 'release', cleanup_workspace: true };
        await running.run.terminate('terminal state');
      } else if (is_active_state(issue, this.current_config)) {
        running.entry.issue = issue;
      } else {
        running.stop_behavior = { mode: 'release', cleanup_workspace: false };
        await running.run.terminate('inactive state');
      }
    }
  }

  private async reconcile_stalled_runs(): Promise<void> {
    const timeout = this.current_config.codex.stall_timeout_ms;
    if (timeout <= 0) return;

    for (const [issue_id, running] of this.running) {
      const last_seen = running.entry.last_codex_timestamp ? Date.parse(running.entry.last_codex_timestamp) : Date.parse(running.entry.started_at);
      if (now_ms() - last_seen <= timeout) {
        continue;
      }
      running.stop_behavior = { mode: 'retry', reason: 'stalled session' };
      await running.run.terminate('stalled session');
      this.logger.warn('stall detected retrying', {
        issue_id,
        issue_identifier: running.entry.issue.identifier,
      });
    }
  }

  private compute_seconds_running(): number {
    const active = [...this.running.values()].reduce((sum, state) => sum + Math.max(0, (now_ms() - Date.parse(state.entry.started_at)) / 1000), 0);
    return this.codex_totals.seconds_running_ended + active;
  }
}
