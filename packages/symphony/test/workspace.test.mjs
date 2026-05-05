import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { WorkspaceManager } from '../src/workspace.js';

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
