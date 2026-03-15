import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const WORKTREE_UTILS_PATH = join(REPO_ROOT, 'scripts', 'symphony', 'worktree-utils.sh');

function quoteShell(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
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

async function runBash(script, options = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn('bash', ['-lc', script], {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.once('error', reject);
    child.once('close', (code) => {
      resolve({
        code,
        stdout,
        stderr,
      });
    });
  });
}

async function initializeGitFixture(root) {
  const commands = [
    'git init',
    'git config user.name "Codex"',
    'git config user.email "codex@example.com"',
    'git add .',
    'git commit -m "fixture"',
  ];

  for (const command of commands) {
    const result = await runBash(command, { cwd: root });
    assert.equal(result.code, 0, result.stderr || result.stdout);
  }
}

async function createRepoFixture(t) {
  const tempRoot = await mkdtemp(join(tmpdir(), 'symphony-worktree-utils-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const repoRoot = join(tempRoot, 'repo');
  await mkdir(join(repoRoot, '.symphony', 'workspaces', 'lane', 'task'), { recursive: true });
  await mkdir(join(repoRoot, '.loom'), { recursive: true });
  await mkdir(join(repoRoot, 'node_modules', 'demo'), { recursive: true });
  await mkdir(join(repoRoot, 'packages', 'demo', 'node_modules', 'nested'), { recursive: true });
  await mkdir(join(repoRoot, 'packages', 'demo', 'src'), { recursive: true });
  await mkdir(join(repoRoot, '.archive'), { recursive: true });

  await writeFile(join(repoRoot, 'tracked.txt'), 'tracked\n', 'utf8');
  await writeFile(join(repoRoot, '.symphony', 'workspaces', 'lane', 'task', 'recursive.txt'), 'recursive\n', 'utf8');
  await writeFile(join(repoRoot, '.loom', 'config.json'), '{}\n', 'utf8');
  await writeFile(join(repoRoot, 'node_modules', 'demo', 'index.js'), 'module.exports = 1;\n', 'utf8');
  await writeFile(join(repoRoot, 'packages', 'demo', 'node_modules', 'nested', 'index.js'), 'module.exports = 2;\n', 'utf8');
  await writeFile(join(repoRoot, 'packages', 'demo', 'src', 'index.js'), 'export const demo = true;\n', 'utf8');
  await writeFile(join(repoRoot, '.archive', 'note.txt'), 'archive\n', 'utf8');

  await initializeGitFixture(repoRoot);

  return {
    repoRoot,
    tempRoot,
  };
}

async function assertWorkspaceContents(workspacePath) {
  assert.equal(await pathExists(join(workspacePath, 'tracked.txt')), true);
  assert.equal(await pathExists(join(workspacePath, 'packages', 'demo', 'src', 'index.js')), true);
  assert.equal(await pathExists(join(workspacePath, '.symphony')), false);
  assert.equal(await pathExists(join(workspacePath, '.loom')), false);
  assert.equal(await pathExists(join(workspacePath, '.archive')), false);
  assert.equal(await pathExists(join(workspacePath, 'node_modules')), false);
  assert.equal(await pathExists(join(workspacePath, 'packages', 'demo', 'node_modules')), false);
}

test('symphony_snapshot_workspace excludes runtime state in the git fast path', async (t) => {
  const { repoRoot, tempRoot } = await createRepoFixture(t);
  const workspacePath = join(tempRoot, 'snapshot-workspace');

  const result = await runBash(
    [
      'command -v rsync >/dev/null || exit 80',
      `source ${quoteShell(WORKTREE_UTILS_PATH)}`,
      `symphony_snapshot_workspace ${quoteShell(repoRoot)} ${quoteShell(workspacePath)}`,
    ].join('; '),
  );

  if (result.code === 80) {
    t.skip('rsync is required to exercise the git fast path');
  }

  assert.equal(result.code, 0, result.stderr || result.stdout);
  await assertWorkspaceContents(workspacePath);
});

test('symphony_clone_workspace_from_archive prunes tracked runtime state', async (t) => {
  const { repoRoot, tempRoot } = await createRepoFixture(t);
  const workspacePath = join(tempRoot, 'clone-workspace');

  const result = await runBash(
    [
      `source ${quoteShell(WORKTREE_UTILS_PATH)}`,
      `symphony_clone_workspace_from_archive ${quoteShell(repoRoot)} ${quoteShell(workspacePath)} ${quoteShell('codex/clone-fixture')} HEAD`,
    ].join('; '),
  );

  assert.equal(result.code, 0, result.stderr || result.stdout);
  assert.equal(await pathExists(join(workspacePath, '.git')), true);
  await assertWorkspaceContents(workspacePath);
});

for (const checkoutStrategy of ['archive', 'checkout']) {
  test(`symphony_add_worktree prunes tracked runtime state for ${checkoutStrategy} checkouts`, async (t) => {
    const { repoRoot, tempRoot } = await createRepoFixture(t);
    const workspacePath = join(tempRoot, `worktree-${checkoutStrategy}`);

    const result = await runBash(
      [
        `export SYMPHONY_WORKTREE_CHECKOUT_STRATEGY=${quoteShell(checkoutStrategy)}`,
        `source ${quoteShell(WORKTREE_UTILS_PATH)}`,
        `symphony_add_worktree ${quoteShell(repoRoot)} ${quoteShell(workspacePath)} ${quoteShell(`codex/${checkoutStrategy}-fixture`)}`,
      ].join('; '),
    );

    assert.equal(result.code, 0, result.stderr || result.stdout);
    assert.equal(await pathExists(join(workspacePath, '.git')), true);
    await assertWorkspaceContents(workspacePath);
  });
}
