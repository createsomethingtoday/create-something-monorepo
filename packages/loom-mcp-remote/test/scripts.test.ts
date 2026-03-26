import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

import { runSqlite } from './support/d1.js';
import { createTestEnv, startWorkerServer } from './support/worker.js';

const TEST_DIR = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(TEST_DIR, '..', '..', '..');
const EXPORT_SCRIPT = resolve(ROOT, 'scripts/loom/export-local-snapshot.mjs');
const BACKUP_SCRIPT = resolve(ROOT, 'scripts/loom/backup-remote-snapshot.mjs');
const IMPORT_SCRIPT = resolve(ROOT, 'scripts/loom/import-remote-snapshot.mjs');
const VALIDATE_SCRIPT = resolve(ROOT, 'scripts/loom/validate-remote-cutover.mjs');
const execFileAsync = promisify(execFile);

const tempPaths: string[] = [];

function isLoopbackListenDenied(error: unknown): boolean {
  return error instanceof Error && /listen EPERM: operation not permitted 127\.0\.0\.1/.test(error.message);
}

afterEach(() => {
  for (const path of tempPaths.splice(0)) {
    rmSync(path, { recursive: true, force: true });
  }
});

function makeTempDir(prefix: string) {
  const path = mkdtempSync(join(tmpdir(), prefix));
  tempPaths.push(path);
  return path;
}

function seedLocalLoom(loomDir: string) {
  const workDbPath = join(loomDir, 'work.db');
  runSqlite(workDbPath, `
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      priority TEXT,
      issue_type TEXT,
      agent TEXT,
      labels TEXT,
      parent TEXT,
      evidence TEXT,
      actual_cost_usd REAL,
      repo TEXT,
      close_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE dependencies (
      task_id TEXT NOT NULL,
      depends_on TEXT NOT NULL,
      dep_type TEXT,
      created_at TEXT NOT NULL
    );
  `);
  runSqlite(
    workDbPath,
    `INSERT INTO tasks (id, title, description, status, priority, issue_type, agent, labels, parent, evidence, actual_cost_usd, repo, close_reason, created_at, updated_at)
     VALUES ('lm-local', 'Build remote cutover', 'Implement the remote Loom cutover', 'ready', 'high', 'feature', NULL, '["ui","svelte"]', NULL, NULL, NULL, 'create-something', NULL, '2026-03-13T00:00:00.000Z', '2026-03-13T00:00:00.000Z');`,
  );

  const memoryDbPath = join(loomDir, 'memory.db');
  runSqlite(memoryDbPath, `
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      working_dir TEXT,
      git_branch TEXT,
      last_checkpoint TEXT,
      context_json TEXT NOT NULL
    );
    CREATE TABLE checkpoints (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      summary TEXT NOT NULL,
      context_json TEXT,
      git_commit TEXT,
      created_at TEXT NOT NULL
    );
  `);
  runSqlite(
    memoryDbPath,
    `INSERT INTO sessions (id, agent_id, task_id, status, started_at, ended_at, working_dir, git_branch, last_checkpoint, context_json)
     VALUES ('ses-local', 'cursor', 'lm-local', 'interrupted', '2026-03-13T00:00:00.000Z', NULL, '/tmp/workdir', 'codex/loom-cutover', 'chk-local-1', '{"files_modified":[]}');`,
  );
  runSqlite(
    memoryDbPath,
    `INSERT INTO checkpoints (id, session_id, sequence, summary, context_json, git_commit, created_at)
     VALUES ('chk-local-1', 'ses-local', 1, 'Checkpoint', '{}', NULL, '2026-03-13T00:10:00.000Z');`,
  );

  const agentsDbPath = join(loomDir, 'agents.db');
  runSqlite(agentsDbPath, `
    CREATE TABLE agent_profiles (
      id TEXT PRIMARY KEY,
      profile_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE agent_history (
      agent_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      task_type TEXT,
      success INTEGER NOT NULL,
      duration_secs REAL NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);
  runSqlite(
    agentsDbPath,
    `INSERT INTO agent_profiles (id, profile_json, updated_at) VALUES (
      'cursor',
      '${JSON.stringify({
        id: 'cursor',
        name: 'Cursor',
        cli_path: 'cursor',
        capabilities: {
          planning: 0.75,
          coding: 0.88,
          debugging: 0.85,
          ui: 0.95,
          docs: 0.7,
          refactor: 0.8,
          testing: 0.75,
          mcp: true,
          checkpoints: false,
          git_aware: true,
          sub_agents: false,
          max_context: 128000,
        },
        cost: { input_per_1k: 0.003, output_per_1k: 0.015, output_ratio: 2.5 },
        quality: { successes: 2, failures: 0, avg_duration_secs: 90, by_type: { ui: 0.9 } },
        max_concurrent: 2,
        active: 0,
        available: true,
        last_used: null,
      }).replace(/'/g, "''")}',
      '2026-03-13T00:00:00.000Z'
    );`,
  );
  runSqlite(
    agentsDbPath,
    `INSERT INTO agent_history (agent_id, task_id, task_type, success, duration_secs, timestamp)
     VALUES ('cursor', 'lm-local', 'ui', 1, 95, '2026-03-13T00:20:00.000Z');`,
  );

  writeFileSync(
    join(loomDir, 'config.toml'),
    `
repo-id = "create-something"
repo-name = "CREATE SOMETHING"
issue-prefix = "lm"

[notion]
database-id = "db-script"
`,
  );
  writeFileSync(
    join(loomDir, 'dispatch.toml'),
    `
[agents.cursor]
path = "cursor"
max_concurrent = 2
cost_per_1k = 0.020

[agents.codex]
path = "codex"
max_concurrent = 3
cost_per_1k = 0.008

[routing]
default = "codex"
labels = { ui = "cursor" }
`,
  );
  writeFileSync(
    join(loomDir, 'models.toml'),
    `
[models.cursor]
family = "claude"
name = "Cursor"
cli = "cursor"
input_per_1k = 0.003
output_per_1k = 0.015
max_context = 128000
planning = 0.75
coding = 0.88
debugging = 0.85
ui = 0.95
docs = 0.70
refactor = 0.80
testing = 0.75
mcp = true
max_concurrent = 2
`,
  );
}

describe('loom cutover scripts', () => {
  it('backs up, exports, imports, and validates against the remote worker', async () => {
    const loomRoot = makeTempDir('loom-local-');
    const loomDir = join(loomRoot, '.loom');
    mkdirSync(loomDir, { recursive: true });
    seedLocalLoom(loomDir);

    const { env } = createTestEnv({ notionToken: 'notion-script' });
    let server;
    try {
      server = await startWorkerServer(env);
    } catch (error) {
      // Some restricted runners disallow binding a loopback port for the local worker shim.
      if (isLoopbackListenDenied(error)) {
        return;
      }
      throw error;
    }
    try {
      const snapshotPath = join(loomRoot, 'snapshot.json');
      const backupBeforePath = join(loomRoot, 'backup-before.json');
      const backupAfterPath = join(loomRoot, 'backup-after.json');

      await execFileAsync('node', [EXPORT_SCRIPT, '--loom-dir', loomDir, '--out', snapshotPath, '--source', ROOT], {
        cwd: ROOT,
      });

      await execFileAsync('node', [BACKUP_SCRIPT, '--out', backupBeforePath, '--url', `${server.baseUrl}/admin/export`, '--token', env.MIGRATION_ADMIN_TOKEN ?? ''], {
        cwd: ROOT,
      });

      await execFileAsync(
        'node',
        [IMPORT_SCRIPT, '--snapshot', snapshotPath, '--url', `${server.baseUrl}/admin/migrate`, '--token', env.MIGRATION_ADMIN_TOKEN ?? '', '--signing-secret', env.MIGRATION_SIGNING_SECRET ?? ''],
        {
          cwd: ROOT,
        },
      );

      await execFileAsync(
        'node',
        [VALIDATE_SCRIPT, '--snapshot', snapshotPath, '--health-url', `${server.baseUrl}/health`, '--mcp-url', `${server.baseUrl}/mcp`, '--token', env.LOOM_MCP_API_TOKEN ?? '', '--sample-sessions', '1'],
        {
          cwd: ROOT,
        },
      );

      await execFileAsync('node', [BACKUP_SCRIPT, '--out', backupAfterPath, '--url', `${server.baseUrl}/admin/export`, '--token', env.MIGRATION_ADMIN_TOKEN ?? ''], {
        cwd: ROOT,
      });

      const before = JSON.parse(readFileSync(backupBeforePath, 'utf8'));
      const after = JSON.parse(readFileSync(backupAfterPath, 'utf8'));
      const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));

      expect(before.counts.tasks).toBe(0);
      expect(after.counts.tasks).toBe(snapshot.counts.tasks);
      expect(after.payload.runtimeSettings.repoId).toBe('create-something');
      expect(after.payload.agentProfiles).toHaveLength(1);
    } finally {
      await server.close();
    }
  });
});
