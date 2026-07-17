import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { WorkspaceManager } from '../src/workspace.js';

const execFileAsync = promisify(execFile);

function createLogger() {
  const entries = [];
  return {
    entries,
    info(message, metadata) {
      entries.push({ level: 'info', message, metadata });
    },
    warn(message, metadata) {
      entries.push({ level: 'warn', message, metadata });
    },
    error(message, metadata) {
      entries.push({ level: 'error', message, metadata });
    },
  };
}

function createConfig(root, hookLogPath) {
  return {
    workspace: { root },
    hooks: {
      after_create: `printf 'bootstrapped\\n' >> '${hookLogPath}'; printf 'ready\\n' > bootstrap.txt`,
      before_run: null,
      after_run: null,
      before_remove: null,
      timeout_ms: 5000,
    },
  };
}

test('WorkspaceManager records bootstrap metadata and reuses a bootstrapped workspace', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'symphony-workspace-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const root = join(tempRoot, 'workspaces');
  const hookLogPath = join(tempRoot, 'hook.log');
  const logger = createLogger();
  const manager = new WorkspaceManager(createConfig(root, hookLogPath), logger);

  const first = await manager.ensure_workspace('CRE-123');
  const second = await manager.ensure_workspace('CRE-123');

  assert.equal(first.created_now, true);
  assert.equal(first.recovered_stale, false);
  assert.equal(second.created_now, false);
  assert.equal(second.recovered_stale, false);
  assert.equal(await readFile(join(first.path, 'bootstrap.txt'), 'utf8'), 'ready\n');
  assert.equal(await readFile(hookLogPath, 'utf8'), 'bootstrapped\n');

  const metadata = JSON.parse(await readFile(first.metadata_path, 'utf8'));
  assert.equal(metadata.schema_version, 1);
  assert.equal(metadata.issue_identifier, 'CRE-123');
  assert.equal(metadata.workspace_path, first.path);
});

test('WorkspaceManager recreates stale partial bootstrap directories', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'symphony-workspace-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const root = join(tempRoot, 'workspaces');
  const stalePath = join(root, 'CRE-456');
  await mkdir(join(stalePath, 'packages', 'empty'), { recursive: true });
  await writeFile(join(stalePath, 'stale.txt'), 'stale\n', 'utf8');

  const logger = createLogger();
  const manager = new WorkspaceManager(createConfig(root, join(tempRoot, 'hook.log')), logger);
  const workspace = await manager.ensure_workspace('CRE-456');

  assert.equal(workspace.created_now, true);
  assert.equal(workspace.recovered_stale, true);
  assert.equal(await readFile(join(workspace.path, 'bootstrap.txt'), 'utf8'), 'ready\n');

  const entries = await readdir(workspace.path);
  assert.deepEqual(entries.sort(), ['bootstrap.txt']);
  assert.ok(logger.entries.some((entry) => entry.message === 'stale workspace bootstrap detected; recreating'));

  const metadata = JSON.parse(await readFile(workspace.metadata_path, 'utf8'));
  assert.equal(metadata.recovered_stale, true);
});

test('WorkspaceManager removes workspace metadata with the workspace', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'symphony-workspace-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const root = join(tempRoot, 'workspaces');
  const logger = createLogger();
  const manager = new WorkspaceManager(createConfig(root, join(tempRoot, 'hook.log')), logger);
  const workspace = await manager.ensure_workspace('CRE-789');

  await manager.remove_workspace('CRE-789');

  await assert.rejects(() => readFile(workspace.path, 'utf8'), /ENOENT/);
  await assert.rejects(() => readFile(workspace.metadata_path, 'utf8'), /ENOENT/);
});

test('WorkspaceManager persists completion handoffs outside the worker git diff', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'symphony-workspace-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const root = join(tempRoot, 'workspaces');
  const logger = createLogger();
  const manager = new WorkspaceManager(createConfig(root, join(tempRoot, 'hook.log')), logger);
  const workspace = await manager.ensure_workspace('CRE-RESTART');
  const completionPath = manager.get_workspace_paths('CRE-RESTART').completion_path;
  await writeFile(completionPath, '{"schema_version":"wrong"}\n', 'utf8');
  await assert.rejects(() => manager.read_completion_handoff('CRE-RESTART'), /invalid_completion_handoff|does not match/);
  const handoff = await manager.write_completion_handoff('CRE-RESTART', {
    issue_id: 'issue-restart',
    issue_identifier: 'CRE-RESTART',
    workspace_path: workspace.path,
    workspace_metadata_path: workspace.metadata_path,
    evidence_recorded: true,
    comment_attempts: 1,
    last_error: null,
  });

  assert.equal(handoff.schema_version, 'symphony-evidence-handoff-marker.v1');
  assert.equal(handoff.issue_id, 'issue-restart');
  assert.equal(await manager.read_completion_handoff('CRE-RESTART').then((entry) => entry.issue_id), 'issue-restart');
  assert.equal(workspace.path.startsWith(join(root, '.metadata')), false);
  assert.equal(completionPath.startsWith(join(root, '.metadata')), true);

  await manager.remove_workspace('CRE-RESTART');

  assert.equal(await manager.read_completion_handoff('CRE-RESTART'), null);
});

test('WorkspaceManager unregisters clean linked git worktrees before removing them', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'symphony-workspace-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const repoRoot = join(tempRoot, 'repo');
  const root = join(tempRoot, 'workspaces');
  const hookLogPath = join(tempRoot, 'hook.log');
  await mkdir(repoRoot, { recursive: true });
  await execFileAsync('git', ['init'], { cwd: repoRoot });
  await execFileAsync('git', ['config', 'user.email', 'symphony@example.com'], { cwd: repoRoot });
  await execFileAsync('git', ['config', 'user.name', 'Symphony Test'], { cwd: repoRoot });
  await writeFile(join(repoRoot, 'README.md'), 'fixture\n', 'utf8');
  await execFileAsync('git', ['add', 'README.md'], { cwd: repoRoot });
  await execFileAsync('git', ['commit', '-m', 'fixture'], { cwd: repoRoot });

  const logger = createLogger();
  const manager = new WorkspaceManager(
    {
      ...createConfig(root, hookLogPath),
      hooks: {
        ...createConfig(root, hookLogPath).hooks,
        after_create: `git -C '${repoRoot}' worktree add -b codex/CRE-321-code-quality '${join(root, 'CRE-321')}' HEAD`,
        before_remove: null,
      },
    },
    logger,
  );

  const workspace = await manager.ensure_workspace('CRE-321');
  const workspaceRealPath = await realpath(workspace.path);
  const workspacePattern = new RegExp(`worktree ${workspaceRealPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  const beforeRemove = await execFileAsync('git', ['-C', repoRoot, 'worktree', 'list', '--porcelain']);
  assert.match(beforeRemove.stdout, workspacePattern);

  await manager.remove_workspace('CRE-321');

  const afterRemove = await execFileAsync('git', ['-C', repoRoot, 'worktree', 'list', '--porcelain']);
  assert.doesNotMatch(afterRemove.stdout, workspacePattern);
  await assert.rejects(() => readFile(workspace.path, 'utf8'), /ENOENT/);
  await assert.rejects(() => readFile(workspace.metadata_path, 'utf8'), /ENOENT/);
});

test('WorkspaceManager refuses to remove dirty git workspaces', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'symphony-workspace-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const root = join(tempRoot, 'workspaces');
  const logger = createLogger();
  const manager = new WorkspaceManager(createConfig(root, join(tempRoot, 'hook.log')), logger);
  const workspace = await manager.ensure_workspace('CRE-999');

  await execFileAsync('git', ['init'], { cwd: workspace.path });
  await writeFile(join(workspace.path, 'progress.txt'), 'agent progress\n', 'utf8');

  await assert.rejects(() => manager.remove_workspace('CRE-999'), /dirty_workspace|Refusing to remove dirty workspace/);
  assert.equal(await readFile(join(workspace.path, 'progress.txt'), 'utf8'), 'agent progress\n');
  assert.equal(await readFile(workspace.metadata_path, 'utf8').then(() => true), true);
});
