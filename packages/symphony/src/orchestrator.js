import { createServer } from 'node:http';
import { ConsoleLogger } from './logger.js';
import { LinearTrackerClient } from './tracker/linear.js';
import { validate_dispatch_config } from './config.js';
import { WorkflowManager } from './workflow.js';
import { WorkspaceManager } from './workspace.js';
import { create_agent_worker_run } from './agent-worker.js';
function now_iso() {
    return new Date().toISOString();
}
function now_ms() {
    return Date.now();
}
function normalize_state(value) {
    return value.trim().toLowerCase();
}
function created_at_sort_value(issue) {
    if (!issue.created_at)
        return Number.POSITIVE_INFINITY;
    const parsed = Date.parse(issue.created_at);
    return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}
function priority_sort_value(issue) {
    return issue.priority ?? Number.POSITIVE_INFINITY;
}
function is_terminal_state(issue, config) {
    const normalized = normalize_state(issue.state);
    return config.tracker.terminal_states.some((state) => normalize_state(state) === normalized);
}
function is_active_state(issue, config) {
    const normalized = normalize_state(issue.state);
    return config.tracker.active_states.some((state) => normalize_state(state) === normalized);
}
function has_open_blocker(issue, config) {
    return issue.blocked_by.some((blocker) => blocker.state &&
        !config.tracker.terminal_states.some((state) => normalize_state(state) === normalize_state(blocker.state)));
}
function retry_delay_ms(config, attempt, continuation) {
    if (continuation)
        return 1000;
    return Math.min(10_000 * 2 ** Math.max(0, attempt - 1), config.agent.max_retry_backoff_ms);
}
const MAX_EVIDENCE_HANDOFF_ATTEMPTS = 3;
function evidence_only_handoff(issue, state, result) {
    return {
        schema_version: 'symphony-evidence-handoff.v1',
        issue: issue.identifier,
        status: 'worker_completed_evidence_only',
        eligible_for_done: false,
        workspace_path: state.workspace_path,
        turn_count: result.turn_count,
        worker_message: result.final_message ?? state.entry.last_codex_message ?? null,
        next_decision: 'Inspect the preserved workspace and attach independently verified completion evidence before moving Linear to a terminal state.',
    };
}
function default_tracker_factory(config, logger) {
    return new LinearTrackerClient(config, logger);
}
function to_running_entry(issue, attempt) {
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
export class SymphonyService {
    logger;
    workflow_manager;
    tracker_factory;
    worker_factory;
    current_definition;
    current_config;
    tracker;
    workspace_manager;
    running = new Map();
    claimed = new Set();
    awaiting_completion = new Map();
    retry_attempts = new Map();
    completed = new Set();
    pending_exits = new Set();
    codex_totals = {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        seconds_running_ended: 0,
    };
    codex_rate_limits = null;
    tick_timer = null;
    tick_running = false;
    pending_refresh = false;
    started = false;
    http_server = null;
    requested_port;
    constructor(options = {}) {
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
                ((issue, attempt, prompt_template, config, tracker, workspace_manager, logger, on_event) => create_agent_worker_run(issue, attempt, prompt_template, config, tracker, workspace_manager, logger, on_event));
        this.requested_port = options.port ?? null;
    }
    async start() {
        if (this.started)
            return;
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
    async run_once() {
        if (!this.current_config) {
            const loaded = await this.workflow_manager.initialize();
            this.apply_workflow(loaded.definition, loaded.config);
        }
        await this.startup_terminal_workspace_cleanup();
        this.started = true;
        try {
            await this.run_tick(false);
            await this.drain_until_idle();
        }
        finally {
            this.started = false;
            this.pending_refresh = false;
            if (this.tick_timer) {
                clearTimeout(this.tick_timer);
                this.tick_timer = null;
            }
        }
    }
    async stop() {
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
        this.awaiting_completion.clear();
        this.workflow_manager.stop_watching();
        if (this.http_server) {
            await new Promise((resolve, reject) => {
                this.http_server?.close((error) => {
                    if (error)
                        reject(error);
                    else
                        resolve();
                });
            });
            this.http_server = null;
        }
    }
    request_refresh() {
        const coalesced = this.tick_running || this.tick_timer !== null;
        this.pending_refresh = true;
        if (!this.tick_running) {
            this.schedule_tick(0);
        }
        return { queued: true, coalesced, requested_at: now_iso() };
    }
    get_snapshot() {
        const generated_at = now_iso();
        const running = [...this.running.values()].map(({ entry, workspace_path, workspace_metadata_path }) => ({
            issue_id: entry.issue.id,
            issue_identifier: entry.issue.identifier,
            state: entry.issue.state,
            workspace: {
                path: workspace_path ?? null,
                metadata_path: workspace_metadata_path ?? null,
            },
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
        const awaiting_completion = [...this.awaiting_completion.values()];
        return {
            generated_at,
            counts: {
                running: running.length,
                retrying: retrying.length,
                awaiting_completion: awaiting_completion.length,
            },
            running,
            retrying,
            awaiting_completion,
            codex_totals: {
                input_tokens: this.codex_totals.input_tokens,
                output_tokens: this.codex_totals.output_tokens,
                total_tokens: this.codex_totals.total_tokens,
                seconds_running: this.compute_seconds_running(),
            },
            rate_limits: this.codex_rate_limits,
        };
    }
    get_issue_snapshot(issue_identifier) {
        const running = [...this.running.values()].find((state) => state.entry.issue.identifier === issue_identifier);
        const retry = [...this.retry_attempts.values()].find((state) => state.entry.identifier === issue_identifier);
        const awaiting_completion = [...this.awaiting_completion.values()].find((state) => state.issue_identifier === issue_identifier);
        if (!running && !retry && !awaiting_completion)
            return null;
        const running_view = running
            ? this.get_snapshot().running.find((entry) => entry.issue_identifier === issue_identifier) ?? null
            : null;
        const retry_view = retry
            ? this.get_snapshot().retrying.find((entry) => entry.issue_identifier === issue_identifier) ?? null
            : null;
        return {
            issue_identifier,
            issue_id: running?.entry.issue.id ?? retry?.entry.issue_id ?? awaiting_completion?.issue_id ?? '',
            status: running ? 'running' : retry ? 'retrying' : awaiting_completion ? 'awaiting_completion' : 'released',
            workspace: {
                path: running?.workspace_path ?? awaiting_completion?.workspace_path ?? this.workspace_manager.get_workspace_paths(issue_identifier).workspace_path,
                metadata_path: running?.workspace_metadata_path ?? awaiting_completion?.workspace_metadata_path ?? this.workspace_manager.get_workspace_paths(issue_identifier).metadata_path,
            },
            attempts: {
                restart_count: running?.entry.restart_count ?? retry?.entry.attempt ?? 0,
                current_retry_attempt: retry?.entry.attempt ?? running?.entry.retry_attempt ?? null,
            },
            running: running_view,
            retry: retry_view,
            completion_handoff: awaiting_completion ?? null,
            recent_events: running?.entry.recent_events ?? [],
            last_error: running?.entry.last_error ?? retry?.entry.error ?? awaiting_completion?.last_error ?? null,
            tracked: {},
        };
    }
    apply_workflow(definition, config) {
        validate_dispatch_config(config);
        this.current_definition = definition;
        this.current_config = config;
        this.tracker = this.tracker_factory(config, this.logger);
        this.workspace_manager = new WorkspaceManager(config, this.logger);
    }
    async startup_terminal_workspace_cleanup() {
        try {
            const issues = await this.tracker.fetch_issues_by_states(this.current_config.tracker.terminal_states);
            for (const issue of issues) {
                await this.workspace_manager.remove_workspace(issue.identifier);
            }
        }
        catch (error) {
            this.logger.warn('startup cleanup failed', { error: error.message });
        }
    }
    async maybe_start_http_server() {
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
            <p>running=${snapshot.counts.running} retrying=${snapshot.counts.retrying} awaiting_completion=${snapshot.counts.awaiting_completion}</p>
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
                response.end(`${JSON.stringify({
                    ...this.request_refresh(),
                    operations: ['poll', 'reconcile'],
                })}\n`);
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
        await new Promise((resolve, reject) => {
            this.http_server?.once('error', reject);
            this.http_server?.listen(port, '127.0.0.1', () => resolve());
        });
    }
    schedule_tick(delay_ms) {
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
    async run_tick(schedule_next) {
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
            }
            catch (error) {
                this.logger.error('workflow reload failed', { error: error.message });
            }
            await this.reconcile_running_issues();
            try {
                validate_dispatch_config(this.current_config);
            }
            catch (error) {
                this.logger.error('dispatch validation failed', { error: error.message });
                return;
            }
            let issues;
            try {
                issues = await this.tracker.fetch_candidate_issues();
            }
            catch (error) {
                this.logger.error('candidate fetch failed', { error: error.message });
                return;
            }
            for (const issue of issues.sort((left, right) => {
                const priority_delta = priority_sort_value(left) - priority_sort_value(right);
                if (priority_delta !== 0)
                    return priority_delta;
                const created_delta = created_at_sort_value(left) - created_at_sort_value(right);
                if (created_delta !== 0)
                    return created_delta;
                return left.identifier.localeCompare(right.identifier);
            })) {
                if (this.available_slots() <= 0)
                    break;
                if (await this.restore_completion_handoff(issue)) {
                    continue;
                }
                if (this.should_dispatch(issue, false)) {
                    await this.dispatch_issue(issue, null);
                }
            }
        }
        finally {
            this.tick_running = false;
            if (schedule_next && this.started) {
                const delay = this.pending_refresh ? 0 : this.current_config.polling.interval_ms;
                this.pending_refresh = false;
                this.schedule_tick(delay);
            }
        }
    }
    should_dispatch(issue, ignore_claimed) {
        if (!issue.id || !issue.identifier || !issue.title || !issue.state) {
            return false;
        }
        if (!is_active_state(issue, this.current_config) || is_terminal_state(issue, this.current_config)) {
            return false;
        }
        if (this.running.has(issue.id)) {
            return false;
        }
        if (this.awaiting_completion.has(issue.id)) {
            return false;
        }
        if (!ignore_claimed && this.claimed.has(issue.id)) {
            return false;
        }
        if (has_open_blocker(issue, this.current_config)) {
            return false;
        }
        if (this.available_slots() <= 0) {
            return false;
        }
        return this.has_state_slot(issue.state);
    }
    async restore_completion_handoff(issue) {
        if (this.awaiting_completion.has(issue.id)) {
            return true;
        }
        if (typeof this.workspace_manager.read_completion_handoff !== 'function') {
            return false;
        }
        try {
            const handoff = await this.workspace_manager.read_completion_handoff(issue.identifier);
            if (!handoff) {
                return false;
            }
            if (handoff.issue_id !== issue.id) {
                this.awaiting_completion.set(issue.id, {
                    ...handoff,
                    issue_id: issue.id,
                    evidence_recorded: false,
                    last_error: `Completion handoff issue id ${handoff.issue_id ?? 'missing'} does not match ${issue.id}.`,
                });
                this.logger.error('completion handoff identity mismatch; dispatch suppressed', {
                    issue_id: issue.id,
                    issue_identifier: issue.identifier,
                    handoff_issue_id: handoff.issue_id ?? null,
                });
                return true;
            }
            this.awaiting_completion.set(issue.id, handoff);
            if (!handoff.evidence_recorded &&
                (handoff.comment_attempts ?? 0) < MAX_EVIDENCE_HANDOFF_ATTEMPTS &&
                handoff.handoff) {
                const evidence_result = await this.record_evidence_handoff(issue, handoff.handoff, handoff.comment_attempts ?? 0);
                let updated_handoff = {
                    ...handoff,
                    evidence_recorded: evidence_result.recorded,
                    comment_attempts: evidence_result.attempts,
                    last_error: evidence_result.error,
                };
                updated_handoff = await this.persist_completion_handoff(issue, updated_handoff);
                this.awaiting_completion.set(issue.id, updated_handoff);
            }
            this.logger.info('restored evidence-only completion handoff; dispatch suppressed', {
                issue_id: issue.id,
                issue_identifier: issue.identifier,
                workspace_path: handoff.workspace_path,
                evidence_recorded: this.awaiting_completion.get(issue.id)?.evidence_recorded,
            });
            return true;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const paths = this.workspace_manager.get_workspace_paths?.(issue.identifier);
            this.awaiting_completion.set(issue.id, {
                issue_id: issue.id,
                issue_identifier: issue.identifier,
                workspace_path: paths?.workspace_path ?? null,
                workspace_metadata_path: paths?.metadata_path ?? null,
                evidence_recorded: false,
                comment_attempts: 0,
                last_error: message,
            });
            this.logger.error('completion handoff could not be restored; dispatch suppressed', {
                issue_id: issue.id,
                issue_identifier: issue.identifier,
                error: message,
            });
            return true;
        }
    }
    has_state_slot(state) {
        const normalized = normalize_state(state);
        const override = this.current_config.agent.max_concurrent_agents_by_state[normalized];
        const active_for_state = [...this.running.values()].filter((entry) => normalize_state(entry.entry.issue.state) === normalized).length;
        return active_for_state < (override ?? this.current_config.agent.max_concurrent_agents);
    }
    available_slots() {
        return Math.max(this.current_config.agent.max_concurrent_agents - this.running.size, 0);
    }
    is_terminal_state_name(state) {
        const normalized = normalize_state(state);
        return this.current_config.tracker.terminal_states.some((entry) => normalize_state(entry) === normalized);
    }
    async dispatch_issue(issue, attempt) {
        let claimed_issue = issue;
        if (typeof this.tracker.claim_issue === 'function') {
            claimed_issue = await this.tracker.claim_issue(issue);
        }
        let workspace;
        try {
            workspace = await this.workspace_manager.ensure_workspace(claimed_issue.identifier);
        }
        catch (error) {
            if (typeof this.tracker.release_issue === 'function') {
                await this.tracker.release_issue(claimed_issue, 'workspace setup failed');
            }
            throw error;
        }
        const run = this.worker_factory(claimed_issue, attempt, this.current_definition.prompt_template, this.current_config, this.tracker, this.workspace_manager, this.logger, (event) => this.handle_codex_event(claimed_issue.id, event));
        this.running.set(claimed_issue.id, {
            entry: to_running_entry(claimed_issue, attempt),
            run,
            workspace_path: workspace.path,
            workspace_metadata_path: workspace.metadata_path,
            stop_behavior: { mode: 'default' },
        });
        this.claimed.add(claimed_issue.id);
        const pending_retry = this.retry_attempts.get(claimed_issue.id);
        if (pending_retry) {
            clearTimeout(pending_retry.timer);
            this.retry_attempts.delete(claimed_issue.id);
        }
        let exit_settlement;
        exit_settlement = run.promise
            .then((result) => this.on_worker_exit(claimed_issue.id, result))
            .catch((error) => this.on_worker_exit(claimed_issue.id, {
            status: 'failed',
            error: error.message,
            turn_count: this.running.get(claimed_issue.id)?.entry.turn_count ?? 0,
            issue: claimed_issue,
            final_message: null,
        }))
            .finally(() => {
            this.pending_exits.delete(exit_settlement);
        });
        this.pending_exits.add(exit_settlement);
        this.logger.info('dispatch completed', {
            issue_id: claimed_issue.id,
            issue_identifier: claimed_issue.identifier,
            attempt: attempt ?? 'null',
            workspace_path: workspace.path,
        });
    }
    handle_codex_event(issue_id, event) {
        const state = this.running.get(issue_id);
        if (!state)
            return;
        if (event.session_id)
            state.entry.session_id = event.session_id;
        if (event.codex_app_server_pid !== null)
            state.entry.codex_app_server_pid = event.codex_app_server_pid;
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
    async on_worker_exit(issue_id, result) {
        const state = this.running.get(issue_id);
        if (!state)
            return;
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
            if (this.current_config.completion.mode === 'evidence_only') {
                const handoff = evidence_only_handoff(state.entry.issue, state, result);
                let completion_state = {
                    issue_id,
                    issue_identifier: state.entry.issue.identifier,
                    workspace_path: state.workspace_path,
                    workspace_metadata_path: state.workspace_metadata_path,
                    evidence_recorded: false,
                    comment_attempts: 0,
                    last_error: null,
                    handoff,
                };
                completion_state = await this.persist_completion_handoff(state.entry.issue, completion_state);
                this.awaiting_completion.set(issue_id, completion_state);
                this.claimed.delete(issue_id);
                const evidence_result = await this.record_evidence_handoff(state.entry.issue, handoff);
                completion_state = {
                    ...completion_state,
                    evidence_recorded: evidence_result.recorded,
                    comment_attempts: evidence_result.attempts,
                    last_error: evidence_result.error,
                };
                completion_state = await this.persist_completion_handoff(state.entry.issue, completion_state);
                this.awaiting_completion.set(issue_id, completion_state);
                if (evidence_result.recorded) {
                    this.logger.info('worker completed with evidence-only handoff', {
                        issue_id,
                        issue_identifier: state.entry.issue.identifier,
                        workspace_path: state.workspace_path,
                        comment_attempts: evidence_result.attempts,
                    });
                }
                else {
                    this.logger.error('evidence-only handoff could not be recorded after retries', {
                        issue_id,
                        issue_identifier: state.entry.issue.identifier,
                        workspace_path: state.workspace_path,
                        comment_attempts: evidence_result.attempts,
                        error: evidence_result.error,
                    });
                }
                return;
            }
            if (typeof this.tracker.comment_issue === 'function') {
                try {
                    await this.tracker.comment_issue(
                        state.entry.issue.id,
                        'Warning: legacy worker-exit completion bypassed the canonical evidence gate. Migrate this workflow to evidence_only.',
                    );
                }
                catch (error) {
                    this.logger.warn('legacy completion gate-bypass warning could not be recorded', {
                        issue_id,
                        issue_identifier: state.entry.issue.identifier,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
            this.logger.warn('legacy worker-exit completion bypassed canonical evidence gate', {
                issue_id,
                issue_identifier: state.entry.issue.identifier,
                completion_mode: this.current_config.completion.mode,
            });
            if (typeof this.tracker.complete_issue === 'function') {
                try {
                    await this.tracker.complete_issue(state.entry.issue, {
                        turn_count: result.turn_count,
                        message: result.final_message ?? state.entry.last_codex_message ?? null,
                    });
                    await this.workspace_manager.remove_workspace(state.entry.issue.identifier);
                    this.claimed.delete(issue_id);
                    return;
                }
                catch (error) {
                    this.logger.error('tracker completion failed', {
                        issue_id,
                        issue_identifier: state.entry.issue.identifier,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
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
    evidence_handoff_retry_delay_ms(attempt) {
        return 1000 * 2 ** Math.max(0, attempt - 1);
    }
    async persist_completion_handoff(issue, completion_state) {
        if (typeof this.workspace_manager.write_completion_handoff !== 'function') {
            return completion_state;
        }
        try {
            return await this.workspace_manager.write_completion_handoff(issue.identifier, completion_state);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error('completion handoff persistence failed', {
                issue_id: issue.id,
                issue_identifier: issue.identifier,
                error: message,
            });
            return {
                ...completion_state,
                persistence_error: message,
            };
        }
    }
    async record_evidence_handoff(issue, handoff, completed_attempts = 0) {
        if (typeof this.tracker.comment_issue !== 'function') {
            return { recorded: true, attempts: completed_attempts, error: null };
        }
        const body = `Symphony evidence-only handoff:\n\n\`\`\`json\n${JSON.stringify(handoff, null, 2)}\n\`\`\``;
        let last_error = null;
        for (let attempt = completed_attempts + 1; attempt <= MAX_EVIDENCE_HANDOFF_ATTEMPTS; attempt += 1) {
            try {
                await this.tracker.comment_issue(issue.id, body);
                return { recorded: true, attempts: attempt, error: null };
            }
            catch (error) {
                last_error = error instanceof Error ? error.message : String(error);
                this.logger.warn('evidence-only handoff comment failed', {
                    issue_id: issue.id,
                    issue_identifier: issue.identifier,
                    attempt,
                    max_attempts: MAX_EVIDENCE_HANDOFF_ATTEMPTS,
                    error: last_error,
                });
                if (attempt < MAX_EVIDENCE_HANDOFF_ATTEMPTS) {
                    await new Promise((resolve) => setTimeout(resolve, this.evidence_handoff_retry_delay_ms(attempt)));
                }
            }
        }
        return {
            recorded: false,
            attempts: MAX_EVIDENCE_HANDOFF_ATTEMPTS,
            error: last_error,
        };
    }
    next_attempt(current) {
        return current === null ? 1 : current + 1;
    }
    schedule_retry(issue_id, attempt, meta, continuation = false) {
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
    async on_retry_timer(issue_id) {
        const retry = this.retry_attempts.get(issue_id);
        if (!retry)
            return;
        this.retry_attempts.delete(issue_id);
        let candidates;
        try {
            candidates = await this.tracker.fetch_candidate_issues();
        }
        catch (error) {
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
    async reconcile_running_issues() {
        await this.reconcile_awaiting_completion();
        await this.reconcile_stalled_runs();
        const running_ids = [...this.running.keys()];
        if (running_ids.length === 0) {
            return;
        }
        let refreshed;
        try {
            refreshed = await this.tracker.fetch_issue_states_by_ids(running_ids);
        }
        catch (error) {
            this.logger.warn('reconciliation refresh failed', { error: error.message });
            return;
        }
        for (const issue of refreshed) {
            const running = this.running.get(issue.id);
            if (!running)
                continue;
            if (is_terminal_state(issue, this.current_config)) {
                running.stop_behavior = { mode: 'release', cleanup_workspace: true };
                await running.run.terminate('terminal state');
            }
            else if (is_active_state(issue, this.current_config)) {
                running.entry.issue = issue;
            }
            else {
                running.stop_behavior = { mode: 'release', cleanup_workspace: false };
                await running.run.terminate('inactive state');
            }
        }
    }
    async reconcile_awaiting_completion() {
        const issue_ids = [...this.awaiting_completion.keys()];
        if (issue_ids.length === 0) {
            return;
        }
        let refreshed;
        try {
            refreshed = await this.tracker.fetch_issue_states_by_ids(issue_ids);
        }
        catch (error) {
            this.logger.warn('completion handoff reconciliation failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return;
        }
        for (const issue of refreshed) {
            if (!is_terminal_state(issue, this.current_config)) {
                continue;
            }
            const handoff = this.awaiting_completion.get(issue.id);
            if (!handoff) {
                continue;
            }
            try {
                await this.workspace_manager.remove_workspace(handoff.issue_identifier ?? issue.identifier);
                this.awaiting_completion.delete(issue.id);
                this.completed.delete(issue.id);
                this.logger.info('terminal completion handoff reconciled', {
                    issue_id: issue.id,
                    issue_identifier: handoff.issue_identifier ?? issue.identifier,
                });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.awaiting_completion.set(issue.id, {
                    ...handoff,
                    last_error: message,
                });
                this.logger.warn('terminal completion handoff cleanup failed', {
                    issue_id: issue.id,
                    issue_identifier: handoff.issue_identifier ?? issue.identifier,
                    error: message,
                });
            }
        }
    }
    async reconcile_stalled_runs() {
        const timeout = this.current_config.codex.stall_timeout_ms;
        if (timeout <= 0)
            return;
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
    async drain_until_idle() {
        while (this.running.size > 0 || this.retry_attempts.size > 0 || this.pending_exits.size > 0 || this.tick_running) {
            await new Promise((resolve) => setTimeout(resolve, 25));
        }
    }
    compute_seconds_running() {
        const active = [...this.running.values()].reduce((sum, state) => sum + Math.max(0, (now_ms() - Date.parse(state.entry.started_at)) / 1000), 0);
        return this.codex_totals.seconds_running_ended + active;
    }
}
//# sourceMappingURL=orchestrator.js.map
