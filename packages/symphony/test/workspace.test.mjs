import assert from 'node:assert/strict';
import { access, lstat, mkdir, mkdtemp, readFile, readlink, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { SymphonyError } from '../src/errors.js';
import { WorkspaceManager } from '../src/workspace.js';

const BOOTSTRAP_MARKER = '.symphony-bootstrap-ready.json';
const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const CODE_QUALITY_AFTER_CREATE = join(REPO_ROOT, 'scripts', 'symphony', 'code-quality-after-create.sh');
const POLICY_AFTER_CREATE = join(REPO_ROOT, 'scripts', 'symphony', 'policy-after-create.sh');

function quoteShell(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function createLogger() {
  const infos = [];
  const warnings = [];
  return {
    infos,
    warnings,
    info(message, details) {
      infos.push({ message, details });
    },
    warn(message, details) {
      warnings.push({ message, details });
    },
  };
}

function createTelemetry() {
  const events = [];
  return {
    events,
    async emit(event) {
      events.push(event);
    },
  };
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

test('WorkspaceManager recreates incomplete after_create workspaces and marks successful bootstrap', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'symphony-workspace-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const workspaceRoot = join(tempRoot, 'workspaces');
  const counterPath = join(tempRoot, 'after-create-count.txt');
  const workspacePath = join(workspaceRoot, 'lm_bootstrap_1');
  const manager = new WorkspaceManager(
    {
      workspace: {
        root: workspaceRoot,
      },
      hooks: {
        after_create: [
          `counter=${quoteShell(counterPath)}`,
          'current=0',
          'if [[ -f "$counter" ]]; then current=$(cat "$counter"); fi',
          'current=$((current + 1))',
          'printf \'%s\' "$current" > "$counter"',
          'printf \'ready\\n\' > workspace-ready.txt',
        ].join('; '),
        timeout_ms: 5_000,
      },
    },
    createLogger(),
  );

  await mkdir(workspacePath, { recursive: true });
  await writeFile(join(workspacePath, 'stale.txt'), 'stale\n', 'utf8');

  await manager.ensure_workspace('lm bootstrap/1');

  assert.equal((await readFile(counterPath, 'utf8')).trim(), '1');
  assert.equal(await pathExists(join(workspacePath, 'stale.txt')), false);
  assert.equal(await readFile(join(workspacePath, 'workspace-ready.txt'), 'utf8'), 'ready\n');

  const marker = JSON.parse(await readFile(join(workspacePath, BOOTSTRAP_MARKER), 'utf8'));
  assert.equal(marker.issue_identifier, 'lm bootstrap/1');
  assert.equal(marker.attempt, null);
  assert.match(marker.ready_at, /^\d{4}-\d{2}-\d{2}T/);

  await manager.ensure_workspace('lm bootstrap/1');

  assert.equal((await readFile(counterPath, 'utf8')).trim(), '1');
});

test('WorkspaceManager removes incomplete workspaces when recreated bootstrap fails', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'symphony-workspace-fail-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const workspaceRoot = join(tempRoot, 'workspaces');
  const workspacePath = join(workspaceRoot, 'lm_bootstrap_fail');
  const manager = new WorkspaceManager(
    {
      workspace: {
        root: workspaceRoot,
      },
      hooks: {
        after_create: "printf 'bootstrap failed\\n' >&2; exit 9",
        timeout_ms: 5_000,
      },
    },
    createLogger(),
  );

  await mkdir(workspacePath, { recursive: true });
  await writeFile(join(workspacePath, 'stale.txt'), 'stale\n', 'utf8');

  await assert.rejects(
    manager.ensure_workspace('lm bootstrap fail'),
    (error) => {
      assert.ok(error instanceof SymphonyError);
      assert.equal(error.code, 'hook_failed');
      return true;
    },
  );

  assert.equal(await pathExists(workspacePath), false);
});

test('WorkspaceManager caps captured hook output on failure', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'symphony-workspace-output-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const workspaceRoot = join(tempRoot, 'workspaces');
  const logger = createLogger();
  const telemetry = createTelemetry();
  const manager = new WorkspaceManager(
    {
      workspace: {
        root: workspaceRoot,
      },
      hooks: {
        after_create: "printf 'x%.0s' {1..6000}; printf 'y%.0s' {1..6000} >&2; exit 7",
        timeout_ms: 5_000,
      },
    },
    logger,
    telemetry,
  );

  await assert.rejects(
    manager.ensure_workspace('lm noisy fail'),
    (error) => {
      assert.ok(error instanceof SymphonyError);
      assert.equal(error.code, 'hook_failed');
      return true;
    },
  );

  const warning = logger.warnings.at(-1);
  assert.ok(warning);
  assert.equal(warning.message, 'hook failed');
  assert.equal(warning.details.stdout.length, 2001);
  assert.equal(warning.details.stderr.length, 2001);
  assert.match(warning.details.stdout, /^x+…$/);
  assert.match(warning.details.stderr, /^y+…$/);

  const failureEvent = telemetry.events.find((event) => event.phase === 'after_create' && event.status === 'failed');
  assert.ok(failureEvent);
  assert.equal(failureEvent.details.stdout, warning.details.stdout);
  assert.equal(failureEvent.details.stderr, warning.details.stderr);
});

test('WorkspaceManager runs the real code-quality snapshot bootstrap hook for incomplete workspaces', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'symphony-workspace-script-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const workspaceRoot = join(tempRoot, 'workspaces');
  const workspacePath = join(workspaceRoot, 'lm_bootstrap_script');
  const manager = new WorkspaceManager(
    {
      workspace: {
        root: workspaceRoot,
      },
      hooks: {
        after_create: [
          'export SYMPHONY_WORKSPACE_BACKEND=snapshot',
          'export SYMPHONY_CODE_QUALITY_SCOPE=symphony',
          `bash ${quoteShell(CODE_QUALITY_AFTER_CREATE)}`,
        ].join('; '),
        timeout_ms: 120_000,
      },
    },
    createLogger(),
  );

  await mkdir(workspacePath, { recursive: true });
  await writeFile(join(workspacePath, 'stale.txt'), 'stale\n', 'utf8');

  await manager.ensure_workspace('lm bootstrap script');

  assert.equal(await pathExists(join(workspacePath, 'stale.txt')), false);
  assert.equal(await pathExists(join(workspacePath, 'AGENTS.md')), true);
  assert.equal(await pathExists(join(workspacePath, 'pnpm-workspace.yaml')), true);
  assert.equal(await pathExists(join(workspacePath, 'packages', 'symphony', 'package.json')), true);
  assert.equal(await pathExists(join(workspacePath, 'scripts', 'symphony', 'worktree-utils.sh')), true);
  assert.equal(await pathExists(join(workspacePath, 'automation', 'symphony', 'code-quality', 'WORKFLOW.md')), true);
  assert.equal(await pathExists(join(workspacePath, 'docs', 'README.md')), false);

  const marker = JSON.parse(await readFile(join(workspacePath, BOOTSTRAP_MARKER), 'utf8'));
  assert.equal(marker.issue_identifier, 'lm bootstrap script');

  if (await pathExists(join(REPO_ROOT, '.loom'))) {
    const stats = await lstat(join(workspacePath, '.loom'));
    assert.equal(stats.isSymbolicLink(), true);
    assert.equal(await readlink(join(workspacePath, '.loom')), join(REPO_ROOT, '.loom'));
  }

  if (await pathExists(join(REPO_ROOT, 'node_modules'))) {
    const stats = await lstat(join(workspacePath, 'node_modules'));
    assert.equal(stats.isSymbolicLink(), true);
    assert.equal(await readlink(join(workspacePath, 'node_modules')), join(REPO_ROOT, 'node_modules'));
  } else {
    assert.equal(await pathExists(join(workspacePath, 'node_modules')), true);
  }
});

test('WorkspaceManager runs the real code-quality lightweight bootstrap hook when workspace mode is lightweight', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'symphony-code-quality-light-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const workspaceRoot = join(tempRoot, 'workspaces');
  const workspacePath = join(workspaceRoot, 'lm_code_quality_lightweight');
  const manager = new WorkspaceManager(
    {
      workspace: {
        root: workspaceRoot,
        mode: 'lightweight',
        dependency_mode: 'reuse',
      },
      hooks: {
        after_create: `bash ${quoteShell(CODE_QUALITY_AFTER_CREATE)}`,
        timeout_ms: 120_000,
      },
    },
    createLogger(),
  );

  await mkdir(workspacePath, { recursive: true });
  await writeFile(join(workspacePath, 'stale.txt'), 'stale\n', 'utf8');

  await manager.ensure_workspace('lm code quality lightweight');

  assert.equal(await pathExists(join(workspacePath, 'stale.txt')), false);
  assert.equal(await pathExists(join(workspacePath, 'automation', 'symphony', 'code-quality', 'WORKFLOW.md')), true);
  assert.equal(await pathExists(join(workspacePath, 'packages', 'symphony', 'package.json')), true);
  assert.equal(await pathExists(join(workspacePath, 'scripts', 'symphony', 'worktree-utils.sh')), true);
  assert.equal(await pathExists(join(workspacePath, 'docs', 'README.md')), false);
  assert.equal(await pathExists(join(workspacePath, '.git')), false);

  const marker = JSON.parse(await readFile(join(workspacePath, BOOTSTRAP_MARKER), 'utf8'));
  assert.equal(marker.issue_identifier, 'lm code quality lightweight');

  if (await pathExists(join(REPO_ROOT, 'node_modules'))) {
    const stats = await lstat(join(workspacePath, 'node_modules'));
    assert.equal(stats.isSymbolicLink(), true);
    assert.equal(await readlink(join(workspacePath, 'node_modules')), join(REPO_ROOT, 'node_modules'));
  }
});

test('WorkspaceManager runs the real policy lightweight bootstrap hook for incomplete workspaces', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'symphony-policy-script-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const workspaceRoot = join(tempRoot, 'workspaces');
  const workspacePath = join(workspaceRoot, 'lm_policy_bootstrap_script');
  const manager = new WorkspaceManager(
    {
      workspace: {
        root: workspaceRoot,
        mode: 'lightweight',
        dependency_mode: 'reuse',
      },
      hooks: {
        after_create: `bash ${quoteShell(POLICY_AFTER_CREATE)}`,
        timeout_ms: 120_000,
      },
    },
    createLogger(),
  );

  await mkdir(workspacePath, { recursive: true });
  await writeFile(join(workspacePath, 'stale.txt'), 'stale\n', 'utf8');

  await manager.ensure_workspace('lm policy bootstrap script');

  assert.equal(await pathExists(join(workspacePath, 'stale.txt')), false);
  assert.equal(await pathExists(join(workspacePath, 'docs', 'README.md')), true);
  assert.equal(await pathExists(join(workspacePath, 'scripts', 'symphony', 'policy-after-create.sh')), true);
  assert.equal(await pathExists(join(workspacePath, 'packages', 'policy-os-engine', 'package.json')), true);
  assert.equal(await pathExists(join(workspacePath, 'packages', 'symphony', 'package.json')), true);
  assert.equal(await pathExists(join(workspacePath, '.git')), false);

  const marker = JSON.parse(await readFile(join(workspacePath, BOOTSTRAP_MARKER), 'utf8'));
  assert.equal(marker.issue_identifier, 'lm policy bootstrap script');

  if (await pathExists(join(REPO_ROOT, '.loom'))) {
    const stats = await lstat(join(workspacePath, '.loom'));
    assert.equal(stats.isSymbolicLink(), true);
    assert.equal(await readlink(join(workspacePath, '.loom')), join(REPO_ROOT, '.loom'));
  }

  if (await pathExists(join(REPO_ROOT, 'node_modules'))) {
    const stats = await lstat(join(workspacePath, 'node_modules'));
    assert.equal(stats.isSymbolicLink(), true);
    assert.equal(await readlink(join(workspacePath, 'node_modules')), join(REPO_ROOT, 'node_modules'));
  }
});
