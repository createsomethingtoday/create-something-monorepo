import { homedir, tmpdir } from 'node:os';
import { isAbsolute, normalize, resolve, sep } from 'node:path';
import { SymphonyError } from './errors.js';
import type { JsonObject, ServiceConfig, WorkflowDefinition } from './types.js';

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function resolveEnvToken(value: string | null, env: NodeJS.ProcessEnv): string | null {
  if (!value) return value;
  if (!value.startsWith('$')) return value;
  const key = value.slice(1);
  const resolved = env[key] ?? '';
  return resolved === '' ? null : resolved;
}

function resolvePathValue(value: string | null, cwd: string, env: NodeJS.ProcessEnv, fallback: string): string {
  const selected = value ?? fallback;
  const envResolved = resolveEnvToken(selected, env) ?? selected;
  const homeExpanded = envResolved.startsWith('~/') ? `${homedir()}${envResolved.slice(1)}` : envResolved;
  if (!homeExpanded.includes('/') && !homeExpanded.includes('\\') && !isAbsolute(homeExpanded)) {
    return homeExpanded;
  }
  return resolve(cwd, homeExpanded);
}

function normalizeStates(states: string[]): string[] {
  return states.filter((state) => state.trim() !== '');
}

function normalizeStateConcurrency(value: unknown): Record<string, number> {
  const source = asObject(value);
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(source)) {
    const parsed = asInteger(raw);
    if (parsed && parsed > 0) {
      out[key.toLowerCase()] = parsed;
    }
  }
  return out;
}

function normalizeHookTimeout(value: unknown): number {
  const parsed = asInteger(value);
  if (!parsed || parsed <= 0) return 60_000;
  return parsed;
}

function normalizeServerPort(value: unknown): number | null {
  const parsed = asInteger(value);
  if (parsed === null) return null;
  if (parsed < 0) return null;
  return parsed;
}

export function resolve_service_config(
  workflow: WorkflowDefinition,
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env
): ServiceConfig {
  const tracker = asObject(workflow.config.tracker);
  const polling = asObject(workflow.config.polling);
  const workspace = asObject(workflow.config.workspace);
  const hooks = asObject(workflow.config.hooks);
  const agent = asObject(workflow.config.agent);
  const codex = asObject(workflow.config.codex);
  const server = asObject(workflow.config.server);

  const api_key = resolveEnvToken(asString(tracker.api_key), env) ?? resolveEnvToken('$LINEAR_API_KEY', env) ?? '';
  const project_slug = asString(tracker.project_slug) ?? '';
  const workspace_root = resolvePathValue(
    asString(workspace.root),
    cwd,
    env,
    resolve(tmpdir(), 'symphony_workspaces')
  );

  return {
    workflow_path: workflow.path,
    tracker: {
      kind: 'linear',
      endpoint: asString(tracker.endpoint) ?? 'https://api.linear.app/graphql',
      api_key,
      project_slug,
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
      approval_policy: asString(codex.approval_policy) ?? 'never',
      thread_sandbox: asString(codex.thread_sandbox) ?? 'danger-full-access',
      turn_sandbox_policy: (asObject(codex.turn_sandbox_policy) as JsonObject | undefined) ?? ({ type: 'dangerFullAccess' } as JsonObject),
      turn_timeout_ms: asInteger(codex.turn_timeout_ms) ?? 3_600_000,
      read_timeout_ms: asInteger(codex.read_timeout_ms) ?? 5_000,
      stall_timeout_ms: asInteger(codex.stall_timeout_ms) ?? 300_000,
    },
    server: {
      port: normalizeServerPort(server.port),
    },
  };
}

export function validate_dispatch_config(config: ServiceConfig): void {
  if (config.tracker.kind !== 'linear') {
    throw new SymphonyError('unsupported_tracker_kind', `Unsupported tracker kind: ${config.tracker.kind}`);
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

export function sanitize_workspace_key(identifier: string): string {
  return identifier.replace(/[^A-Za-z0-9._-]/g, '_');
}

export function ensure_path_within_root(root: string, candidate: string): string {
  const root_absolute = normalize(resolve(root));
  const candidate_absolute = normalize(resolve(candidate));
  const prefix = root_absolute.endsWith(sep) ? root_absolute : `${root_absolute}${sep}`;
  if (candidate_absolute !== root_absolute && !candidate_absolute.startsWith(prefix)) {
    throw new SymphonyError('invalid_workspace_path', `Path escapes workspace root: ${candidate_absolute}`);
  }
  return candidate_absolute;
}
