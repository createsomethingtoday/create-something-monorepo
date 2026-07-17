import { homedir, tmpdir } from 'node:os';
import { isAbsolute, normalize, resolve, sep } from 'node:path';
import { SymphonyError } from './errors.js';
function asObject(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value;
    }
    return {};
}
function asMaybeObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}
function asString(value) {
    return typeof value === 'string' ? value : null;
}
function asInteger(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.trunc(value);
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (Number.isFinite(parsed))
            return Math.trunc(parsed);
    }
    return null;
}
function asStringArray(value, fallback) {
    if (!Array.isArray(value))
        return fallback;
    return value.filter((entry) => typeof entry === 'string');
}
function resolveEnvToken(value, env) {
    if (!value)
        return value;
    if (!value.startsWith('$'))
        return value;
    const key = value.slice(1);
    const resolved = env[key] ?? '';
    return resolved === '' ? null : resolved;
}
function resolvePathValue(value, cwd, env, fallback) {
    const selected = value ?? fallback;
    const envResolved = resolveEnvToken(selected, env) ?? selected;
    const homeExpanded = envResolved.startsWith('~/') ? `${homedir()}${envResolved.slice(1)}` : envResolved;
    if (!homeExpanded.includes('/') && !homeExpanded.includes('\\') && !isAbsolute(homeExpanded)) {
        return homeExpanded;
    }
    return resolve(cwd, homeExpanded);
}
function normalizeStates(states) {
    return states.filter((state) => state.trim() !== '');
}
function normalizeStateConcurrency(value) {
    const source = asObject(value);
    const out = {};
    for (const [key, raw] of Object.entries(source)) {
        const parsed = asInteger(raw);
        if (parsed && parsed > 0) {
            out[key.toLowerCase()] = parsed;
        }
    }
    return out;
}
function normalizeHookTimeout(value) {
    const parsed = asInteger(value);
    if (!parsed || parsed <= 0)
        return 60_000;
    return parsed;
}
function normalizeServerPort(value) {
    const parsed = asInteger(value);
    if (parsed === null)
        return null;
    if (parsed < 0)
        return null;
    return parsed;
}
export function resolve_service_config(workflow, cwd = process.cwd(), env = process.env) {
    const tracker = asObject(workflow.config.tracker);
    const polling = asObject(workflow.config.polling);
    const workspace = asObject(workflow.config.workspace);
    const hooks = asObject(workflow.config.hooks);
    const agent = asObject(workflow.config.agent);
    const codex = asObject(workflow.config.codex);
    const completion = asObject(workflow.config.completion);
    const server = asObject(workflow.config.server);
    const turn_sandbox_policy = asMaybeObject(codex.turn_sandbox_policy);
    const tracker_api_key = asString(tracker.api_key);
    const api_key = tracker_api_key !== null
        ? resolveEnvToken(tracker_api_key, env) ?? ''
        : resolveEnvToken('$LINEAR_API_KEY', env) ?? '';
    const project_slug = asString(tracker.project_slug) ?? '';
    const repo = asString(tracker.repo) ?? null;
    const label = asString(tracker.label) ?? null;
    const labels = normalizeStates(asStringArray(tracker.labels, asStringArray(tracker.required_labels, [])));
    const agent_id = asString(tracker.agent_id) ?? 'symphony';
    const workspace_root = resolvePathValue(asString(workspace.root), cwd, env, resolve(tmpdir(), 'symphony_workspaces'));
    return {
        workflow_path: workflow.path,
        tracker: {
            kind: asString(tracker.kind) ?? 'linear',
            endpoint: asString(tracker.endpoint) ?? 'https://api.linear.app/graphql',
            api_key,
            project_slug,
            repo,
            label,
            labels,
            agent_id,
            active_states: normalizeStates(asStringArray(tracker.active_states, ['Todo', 'In Progress'])),
            terminal_states: normalizeStates(asStringArray(tracker.terminal_states, ['Closed', 'Cancelled', 'Canceled', 'Duplicate', 'Done'])),
            network_timeout_ms: 30_000,
            page_size: 50,
        },
        polling: {
            interval_ms: asInteger(polling.interval_ms) ?? 30_000,
        },
        workspace: {
            root: workspace_root,
        },
        hooks: {
            after_create: asString(hooks.after_create),
            before_run: asString(hooks.before_run),
            after_run: asString(hooks.after_run),
            before_remove: asString(hooks.before_remove),
            timeout_ms: normalizeHookTimeout(hooks.timeout_ms),
        },
        agent: {
            max_concurrent_agents: asInteger(agent.max_concurrent_agents) ?? 10,
            max_turns: asInteger(agent.max_turns) ?? 20,
            max_retry_backoff_ms: asInteger(agent.max_retry_backoff_ms) ?? 300_000,
            max_concurrent_agents_by_state: normalizeStateConcurrency(agent.max_concurrent_agents_by_state),
        },
        codex: {
            command: asString(codex.command) ?? 'codex app-server',
            approval_policy: asString(codex.approval_policy) ?? 'on-request',
            thread_sandbox: asString(codex.thread_sandbox) ?? 'workspace-write',
            turn_sandbox_policy: turn_sandbox_policy ?? { type: 'workspaceWrite' },
            turn_timeout_ms: asInteger(codex.turn_timeout_ms) ?? 3_600_000,
            read_timeout_ms: asInteger(codex.read_timeout_ms) ?? 5_000,
            stall_timeout_ms: asInteger(codex.stall_timeout_ms) ?? 300_000,
        },
        completion: {
            mode: asString(completion.mode) ?? 'evidence_only',
        },
        server: {
            port: normalizeServerPort(server.port),
        },
    };
}
export function validate_dispatch_config(config) {
    if (!['evidence_only', 'worker_exit_legacy'].includes(config.completion.mode)) {
        throw new SymphonyError('unsupported_completion_mode', `Unsupported completion mode: ${config.completion.mode}`);
    }
    if (config.tracker.kind !== 'linear') {
        throw new SymphonyError('unsupported_tracker_kind', `Unsupported tracker kind: ${config.tracker.kind}`);
    }
    if (!config.tracker.endpoint) {
        throw new SymphonyError('missing_tracker_endpoint', 'Missing tracker endpoint.');
    }
    if (!config.tracker.api_key) {
        throw new SymphonyError('missing_tracker_api_key', 'Missing tracker API key after environment resolution.');
    }
    if (!config.tracker.project_slug) {
        throw new SymphonyError('missing_tracker_project_slug', 'Missing tracker project slug.');
    }
    if (!config.codex.command.trim()) {
        throw new SymphonyError('codex_not_found', 'Missing Codex command.');
    }
}
export function sanitize_workspace_key(identifier) {
    return identifier.replace(/[^A-Za-z0-9._-]/g, '_');
}
export function ensure_path_within_root(root, candidate) {
    const root_absolute = normalize(resolve(root));
    const candidate_absolute = normalize(resolve(candidate));
    const prefix = root_absolute.endsWith(sep) ? root_absolute : `${root_absolute}${sep}`;
    if (candidate_absolute !== root_absolute && !candidate_absolute.startsWith(prefix)) {
        throw new SymphonyError('invalid_workspace_path', `Path escapes workspace root: ${candidate_absolute}`);
    }
    return candidate_absolute;
}
//# sourceMappingURL=config.js.map
