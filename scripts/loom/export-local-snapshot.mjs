#!/usr/bin/env node

import TOML from '@iarna/toml';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

function parseArgs(argv) {
  const args = {
    loomDir: '.loom',
    out: 'tmp/loom-migration-snapshot.json',
    source: process.cwd(),
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--loom-dir' && argv[i + 1]) {
      args.loomDir = argv[++i];
      continue;
    }
    if (arg === '--out' && argv[i + 1]) {
      args.out = argv[++i];
      continue;
    }
    if (arg === '--source' && argv[i + 1]) {
      args.source = argv[++i];
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`Usage:\n  node scripts/loom/export-local-snapshot.mjs [--loom-dir .loom] [--out tmp/loom-migration-snapshot.json] [--source <repo-path>]`);
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function runSqliteJson(dbPath, sql) {
  const output = execFileSync('sqlite3', ['-json', dbPath, sql], { encoding: 'utf8' });
  if (!output.trim()) return [];
  return JSON.parse(output);
}

function tableExists(dbPath, tableName) {
  const rows = runSqliteJson(dbPath, `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName.replace(/'/g, "''")}';`);
  return rows.length > 0;
}

function columnExists(dbPath, tableName, columnName) {
  const rows = runSqliteJson(dbPath, `PRAGMA table_info(${tableName.replace(/[^a-zA-Z0-9_]/g, '')});`);
  return rows.some((row) => row.name === columnName);
}

function fromTasksJsonl(tasksJsonlPath) {
  const content = readFileSync(tasksJsonlPath, 'utf8');
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  return lines.map((line) => {
    const row = JSON.parse(line);
    const labels = Array.isArray(row.labels) ? row.labels : [];
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      status: row.status ?? 'ready',
      priority: row.priority ?? 'normal',
      issue_type: row.issue_type ?? 'task',
      agent: row.agent ?? null,
      labels_json: JSON.stringify(labels),
      parent: row.parent ?? null,
      evidence: row.evidence ?? null,
      actual_cost_usd: row.actual_cost_usd ?? null,
      repo: row.repo ?? null,
      close_reason: row.close_reason ?? null,
      created_at: row.created_at ?? new Date().toISOString(),
      updated_at: row.updated_at ?? new Date().toISOString(),
    };
  });
}

function readTomlIfExists(path) {
  if (!existsSync(path)) return null;
  return TOML.parse(readFileSync(path, 'utf8'));
}

function main() {
  const args = parseArgs(process.argv);
  const loomDir = resolve(args.loomDir);
  const outPath = resolve(args.out);
  const workDbPath = resolve(loomDir, 'work.db');
  const memoryDbPath = resolve(loomDir, 'memory.db');
  const agentsDbPath = resolve(loomDir, 'agents.db');
  const tasksJsonlPath = resolve(loomDir, 'tasks.jsonl');
  const configTomlPath = resolve(loomDir, 'config.toml');
  const dispatchTomlPath = resolve(loomDir, 'dispatch.toml');
  const modelsTomlPath = resolve(loomDir, 'models.toml');

  let tasks = [];
  let dependencies = [];

  if (existsSync(workDbPath)) {
    const hasPriority = columnExists(workDbPath, 'tasks', 'priority');
    const hasIssueType = columnExists(workDbPath, 'tasks', 'issue_type');
    const hasEvidence = columnExists(workDbPath, 'tasks', 'evidence');
    const hasActualCost = columnExists(workDbPath, 'tasks', 'actual_cost_usd');
    const hasRepo = columnExists(workDbPath, 'tasks', 'repo');
    const hasCloseReason = columnExists(workDbPath, 'tasks', 'close_reason');

    tasks = runSqliteJson(
      workDbPath,
      `SELECT
         id,
         title,
         description,
         status,
         ${hasPriority ? 'priority' : "'normal'"} AS priority,
         ${hasIssueType ? 'issue_type' : "'task'"} AS issue_type,
         agent,
         labels AS labels_json,
         parent,
         ${hasEvidence ? 'evidence' : 'NULL'} AS evidence,
         ${hasActualCost ? 'actual_cost_usd' : 'NULL'} AS actual_cost_usd,
         ${hasRepo ? 'repo' : 'NULL'} AS repo,
         ${hasCloseReason ? 'close_reason' : 'NULL'} AS close_reason,
         created_at,
         updated_at
       FROM tasks
       ORDER BY created_at ASC;`,
    );

    const hasDepType = columnExists(workDbPath, 'dependencies', 'dep_type');
    dependencies = runSqliteJson(
      workDbPath,
      `SELECT task_id, depends_on, ${hasDepType ? "COALESCE(dep_type, 'blocks')" : "'blocks'"} AS dep_type, created_at FROM dependencies ORDER BY created_at ASC;`,
    );
  } else if (existsSync(tasksJsonlPath)) {
    tasks = fromTasksJsonl(tasksJsonlPath);
  } else {
    throw new Error(`No Loom task store found. Checked:\n- ${workDbPath}\n- ${tasksJsonlPath}`);
  }

  let sessions = [];
  let checkpoints = [];
  if (existsSync(memoryDbPath)) {
    sessions = runSqliteJson(
      memoryDbPath,
      `SELECT id, agent_id, task_id, status, started_at, ended_at, working_dir, git_branch, last_checkpoint, context_json FROM sessions ORDER BY started_at ASC;`,
    );
    checkpoints = runSqliteJson(
      memoryDbPath,
      `SELECT id, session_id, sequence, summary, context_json, git_commit, created_at FROM checkpoints ORDER BY created_at ASC;`,
    );
  }

  let agentExecutions = [];
  let agentProfiles = [];
  if (existsSync(agentsDbPath) && tableExists(agentsDbPath, 'agent_history')) {
    agentExecutions = runSqliteJson(
      agentsDbPath,
      `SELECT agent_id, task_id, task_type, success, COALESCE(duration_secs, 0) AS duration_secs, timestamp AS created_at FROM agent_history ORDER BY timestamp ASC;`,
    ).map((row) => ({
      ...row,
      success: row.success === 1,
    }));
  }

  if (existsSync(agentsDbPath) && tableExists(agentsDbPath, 'agent_profiles')) {
    agentProfiles = runSqliteJson(
      agentsDbPath,
      `SELECT id, profile_json, updated_at FROM agent_profiles ORDER BY id ASC;`,
    );
  }

  const loomConfig = readTomlIfExists(configTomlPath);
  const dispatchConfig = readTomlIfExists(dispatchTomlPath);
  const modelsConfig = readTomlIfExists(modelsTomlPath);
  const runtimeSettings = {
    repoId: loomConfig?.['repo-id'] ?? null,
    repoName: loomConfig?.['repo-name'] ?? basename(resolve(args.source)),
    issuePrefix: loomConfig?.['issue-prefix'] ?? 'lm',
    notion: {
      databaseId: loomConfig?.notion?.['database-id'] ?? loomConfig?.notion?.database_id ?? null,
    },
    source: {
      repoPath: resolve(args.source),
      loomDir,
    },
  };

  const snapshot = {
    snapshot_version: 'loom-remote-v2',
    generated_at: new Date().toISOString(),
    source: resolve(args.source),
    payload: {
      tasks,
      dependencies,
      sessions,
      checkpoints,
      ...(agentExecutions.length > 0 ? { agentExecutions } : {}),
      ...(agentProfiles.length > 0 ? { agentProfiles } : {}),
      ...(dispatchConfig ? { dispatchConfig } : {}),
      ...(modelsConfig ? { modelsConfig } : {}),
      runtimeSettings,
    },
    counts: {
      tasks: tasks.length,
      dependencies: dependencies.length,
      sessions: sessions.length,
      checkpoints: checkpoints.length,
      agentExecutions: agentExecutions.length,
      agentProfiles: agentProfiles.length,
      runtimeSettings: Object.keys(runtimeSettings).length + (dispatchConfig ? 1 : 0) + (modelsConfig ? 1 : 0),
    },
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  console.log(`Wrote Loom snapshot: ${outPath}`);
  console.log(JSON.stringify(snapshot.counts, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
