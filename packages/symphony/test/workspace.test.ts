import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MemoryLogger } from '../src/logger.js';
import { WorkspaceManager } from '../src/workspace.js';
import type { ServiceConfig } from '../src/types.js';

function createConfig(root: string): ServiceConfig {
  return {
    workflow_path: '/tmp/WORKFLOW.md',
    tracker: {
      kind: 'linear',
      endpoint: 'https://api.linear.app/graphql',
      api_key: 'token',
      project_slug: 'repo',
      active_states: ['Todo'],
      terminal_states: ['Done'],
      network_timeout_ms: 30_000,
      page_size: 50,
    },
    polling: { interval_ms: 30_000 },
    workspace: { root },
    hooks: {
      after_create: `echo created >> hook.log`,
      before_run: null,
      after_run: null,
      before_remove: null,
      timeout_ms: 5_000,
    },
    agent: {
      max_concurrent_agents: 1,
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
    server: {
      port: null,
    },
  };
}

describe('workspace manager', () => {
  it('creates deterministic workspaces and runs after_create only once', async () => {
    const root = await mkdtemp(join(tmpdir(), 'symphony-workspaces-'));
    const manager = new WorkspaceManager(createConfig(root), new MemoryLogger());

    const first = await manager.ensure_workspace('ABC-1');
    const second = await manager.ensure_workspace('ABC-1');

    expect(first.workspace_key).toBe('ABC-1');
    expect(second.created_now).toBe(false);
    const hookLog = await readFile(join(first.path, 'hook.log'), 'utf8');
    expect(hookLog.trim().split('\n')).toHaveLength(1);
  });

  it('treats before_run failure as fatal and after_run failure as ignored', async () => {
    const root = await mkdtemp(join(tmpdir(), 'symphony-hooks-'));
    const config = createConfig(root);
    config.hooks.after_create = null;
    config.hooks.before_run = 'exit 7';
    config.hooks.after_run = 'exit 9';
    const manager = new WorkspaceManager(config, new MemoryLogger());
    const workspace = await manager.ensure_workspace('ABC-2');

    await expect(manager.run_before_run(workspace)).rejects.toMatchObject({
      code: 'hook_failed',
    });
    await expect(manager.run_after_run(workspace)).resolves.toBeUndefined();
  });

  it('removes workspaces during cleanup', async () => {
    const root = await mkdtemp(join(tmpdir(), 'symphony-remove-'));
    const manager = new WorkspaceManager(createConfig(root), new MemoryLogger());
    const workspace = await manager.ensure_workspace('ABC/3');
    await stat(workspace.path);

    await manager.remove_workspace('ABC/3');
    await expect(stat(workspace.path)).rejects.toBeTruthy();
  });
});
