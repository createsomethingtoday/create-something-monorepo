import { mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MemoryLogger } from '../src/logger.js';
import { SymphonyService } from '../src/orchestrator.js';
import type { Issue, Logger, ServiceConfig, TrackerClient, WorkerRun, WorkerRunResult, WorkflowDefinition } from '../src/types.js';

function createIssue(overrides: Partial<Issue>): Issue {
  return {
    id: '1',
    identifier: 'ABC-1',
    title: 'Demo',
    description: null,
    priority: 2,
    state: 'Todo',
    branch_name: null,
    url: null,
    labels: [],
    blocked_by: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createConfig(root: string): ServiceConfig {
  return {
    workflow_path: '/tmp/WORKFLOW.md',
    tracker: {
      kind: 'linear',
      endpoint: 'https://api.linear.app/graphql',
      api_key: 'token',
      project_slug: 'repo',
      active_states: ['Todo', 'In Progress'],
      terminal_states: ['Done', 'Cancelled'],
      network_timeout_ms: 30_000,
      page_size: 50,
    },
    polling: { interval_ms: 50 },
    workspace: { root },
    hooks: {
      after_create: null,
      before_run: null,
      after_run: null,
      before_remove: null,
      timeout_ms: 60_000,
    },
    agent: {
      max_concurrent_agents: 2,
      max_turns: 20,
      max_retry_backoff_ms: 300_000,
      max_concurrent_agents_by_state: {},
    },
    codex: {
      command: 'codex app-server',
      approval_policy: 'never',
      thread_sandbox: 'danger-full-access',
      turn_sandbox_policy: { type: 'dangerFullAccess' },
      turn_timeout_ms: 1_000,
      read_timeout_ms: 1_000,
      stall_timeout_ms: 1_000,
    },
    server: { port: null },
  };
}

class FakeWorkflowManager {
  private readonly definition: WorkflowDefinition;
  private readonly config: ServiceConfig;

  constructor(definition: WorkflowDefinition, config: ServiceConfig) {
    this.definition = definition;
    this.config = config;
  }

  async initialize(): Promise<{ definition: WorkflowDefinition; config: ServiceConfig }> {
    return { definition: this.definition, config: this.config };
  }

  get_current(): { definition: WorkflowDefinition; config: ServiceConfig } {
    return { definition: this.definition, config: this.config };
  }

  async reload_if_changed(): Promise<boolean> {
    return false;
  }

  on_reload(): () => void {
    return () => {};
  }

  start_watching(): void {}
  stop_watching(): void {}
}

class FakeTracker implements TrackerClient {
  candidate_issues: Issue[] = [];
  terminal_issues: Issue[] = [];
  refreshed_issues: Issue[] = [];

  async fetch_candidate_issues(): Promise<Issue[]> {
    return [...this.candidate_issues];
  }

  async fetch_issues_by_states(): Promise<Issue[]> {
    return [...this.terminal_issues];
  }

  async fetch_issue_states_by_ids(): Promise<Issue[]> {
    return [...this.refreshed_issues];
  }
}

function deferredWorker(issue: Issue): { run: WorkerRun; resolve: (value: WorkerRunResult) => void } {
  let resolvePromise!: (value: WorkerRunResult) => void;
  const promise = new Promise<WorkerRunResult>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    run: {
      promise,
      async terminate(reason: string): Promise<void> {
        resolvePromise({
          status: 'cancelled',
          error: reason,
          turn_count: 0,
          issue,
        });
      },
    },
    resolve: resolvePromise,
  };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 250): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Timed out waiting for condition');
}

describe('orchestrator', () => {
  it('dispatches issues by priority then age with bounded concurrency', async () => {
    const root = await mkdtemp(join(tmpdir(), 'symphony-orch-'));
    const config = createConfig(root);
    const tracker = new FakeTracker();
    tracker.candidate_issues = [
      createIssue({ id: '1', identifier: 'ABC-1', priority: 3, created_at: '2026-01-03T00:00:00Z' }),
      createIssue({ id: '2', identifier: 'ABC-2', priority: 1, created_at: '2026-01-04T00:00:00Z' }),
      createIssue({ id: '3', identifier: 'ABC-3', priority: 1, created_at: '2026-01-02T00:00:00Z' }),
    ];

    const started: string[] = [];
    const service = new SymphonyService({
      logger: new MemoryLogger(),
      dependencies: {
        workflow_manager: new FakeWorkflowManager({ path: '/tmp/WORKFLOW.md', config: {}, prompt_template: 'Prompt' }, config),
        tracker_factory: () => tracker,
        worker_factory: (issue) => {
          started.push(issue.identifier);
          return deferredWorker(issue).run;
        },
      },
    });

    await service.run_once();
    expect(started).toEqual(['ABC-3', 'ABC-2']);
    expect(service.get_snapshot().counts.running).toBe(2);
  });

  it('does not dispatch Todo issues blocked by non-terminal blockers', async () => {
    const root = await mkdtemp(join(tmpdir(), 'symphony-blocked-'));
    const config = createConfig(root);
    const tracker = new FakeTracker();
    tracker.candidate_issues = [
      createIssue({
        id: '1',
        identifier: 'ABC-1',
        blocked_by: [{ id: '9', identifier: 'ABC-9', state: 'In Progress' }],
      }),
    ];

    let dispatches = 0;
    const service = new SymphonyService({
      logger: new MemoryLogger(),
      dependencies: {
        workflow_manager: new FakeWorkflowManager({ path: '/tmp/WORKFLOW.md', config: {}, prompt_template: 'Prompt' }, config),
        tracker_factory: () => tracker,
        worker_factory: () => {
          dispatches += 1;
          throw new Error('should not run');
        },
      },
    });

    await service.run_once();
    expect(dispatches).toBe(0);
  });

  it('schedules a continuation retry after a normal worker exit', async () => {
    const root = await mkdtemp(join(tmpdir(), 'symphony-retry-'));
    const config = createConfig(root);
    config.agent.max_concurrent_agents = 1;
    const tracker = new FakeTracker();
    tracker.candidate_issues = [createIssue({ id: '1', identifier: 'ABC-1' })];

    const service = new SymphonyService({
      logger: new MemoryLogger(),
      dependencies: {
        workflow_manager: new FakeWorkflowManager({ path: '/tmp/WORKFLOW.md', config: {}, prompt_template: 'Prompt' }, config),
        tracker_factory: () => tracker,
        worker_factory: (issue) => ({
          promise: Promise.resolve({
            status: 'completed',
            error: null,
            turn_count: 1,
            issue,
          }),
          async terminate() {},
        }),
      },
    });

    await service.start();
    await new Promise((resolve) => setTimeout(resolve, 25));
    const snapshot = service.get_snapshot();
    expect(snapshot.retrying).toHaveLength(1);
    expect(snapshot.retrying[0].attempt).toBe(1);
    await service.stop();
  });

  it('reconciles terminal issues by stopping the run and cleaning the workspace', async () => {
    const root = await mkdtemp(join(tmpdir(), 'symphony-reconcile-'));
    const config = createConfig(root);
    config.agent.max_concurrent_agents = 1;
    const tracker = new FakeTracker();
    const issue = createIssue({ id: '1', identifier: 'ABC-1', state: 'In Progress' });
    tracker.candidate_issues = [issue];
    tracker.refreshed_issues = [createIssue({ ...issue, state: 'Done' })];

    const workers = new Map<string, { run: WorkerRun; resolve: (value: WorkerRunResult) => void }>();
    const service = new SymphonyService({
      logger: new MemoryLogger(),
      dependencies: {
        workflow_manager: new FakeWorkflowManager({ path: '/tmp/WORKFLOW.md', config: {}, prompt_template: 'Prompt' }, config),
        tracker_factory: () => tracker,
        worker_factory: (next_issue) => {
          const worker = deferredWorker(next_issue);
          workers.set(next_issue.id, worker);
          return worker.run;
        },
      },
    });

    await service.start();
    await new Promise((resolve) => setTimeout(resolve, 25));
    const workspacePath = join(root, 'ABC-1');
    await stat(workspacePath);

    service.request_refresh();
    await new Promise((resolve) => setTimeout(resolve, 25));
    await flush();

    await waitFor(async () => {
      try {
        await stat(workspacePath);
        return false;
      } catch {
        return true;
      }
    });
    expect(service.get_snapshot().counts.running).toBe(0);
    await service.stop();
  });
});
