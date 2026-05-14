import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseRunHistoryJsonl } from '@create-something/flue-service-agent/mcp-resource-core';
import {
  createFlueRunHistoryCountSql,
  createFlueRunHistoryUpsertSql,
} from '../dist/flue-run-history-ingestion.js';

const DEFAULT_HISTORY_PATH =
  'packages/agents/flue-service-agent/.artifacts/flue-service-agent/run-history.jsonl';
const DEFAULT_DATABASE = 'cs-telemetry';
const DEFAULT_WORKER_DIR = 'packages/create-something-mcp/worker';

function findWorkspaceRoot(start) {
  let current = start;

  while (true) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = dirname(current);
    if (parent === current) return start;
    current = parent;
  }
}

function readArg(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function hasFlag(args, name) {
  return args.includes(name);
}

function usage() {
  return `Usage: node scripts/upload-flue-run-history-to-d1.mjs --remote [options]

Options:
  --remote                    Upload to the remote D1 database.
  --local                     Upload to the local Wrangler D1 database.
  --dry-run                   Validate and print summary without calling Wrangler.
  --history-path <path>       JSONL path. Defaults to ${DEFAULT_HISTORY_PATH}
  --database <name>           D1 database name or binding. Defaults to ${DEFAULT_DATABASE}
  --worker-dir <path>         Worker config directory. Defaults to ${DEFAULT_WORKER_DIR}
`;
}

function resolveWorkspacePath(workspaceRoot, value) {
  return isAbsolute(value) ? value : resolve(workspaceRoot, value);
}

function readWorkerAccountId(workerDir) {
  const configPath = join(workerDir, 'wrangler.toml');
  if (!existsSync(configPath)) return undefined;
  const match = readFileSync(configPath, 'utf8').match(/^\s*account_id\s*=\s*"([^"]+)"/m);
  return match?.[1];
}

function runWrangler(workspaceRoot, workerDir, wranglerArgs) {
  const runner = join(workspaceRoot, 'scripts/run-wrangler.mjs');
  const env = { ...process.env };
  env.CLOUDFLARE_ACCOUNT_ID ??= readWorkerAccountId(workerDir);

  const result = spawnSync(process.execPath, [runner, '--cwd', workerDir, ...wranglerArgs], {
    cwd: workspaceRoot,
    env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Wrangler exited with status ${result.status}`);
  }
}

const args = process.argv.slice(2);
const workspaceRoot = findWorkspaceRoot(process.cwd());
const dryRun = hasFlag(args, '--dry-run');
const remote = hasFlag(args, '--remote');
const local = hasFlag(args, '--local');

if (!dryRun && remote === local) {
  console.error(usage());
  throw new Error('Pass exactly one target flag: --remote or --local');
}

const historyPath = resolveWorkspacePath(
  workspaceRoot,
  readArg(args, '--history-path') ?? DEFAULT_HISTORY_PATH,
);
const workerDir = resolveWorkspacePath(
  workspaceRoot,
  readArg(args, '--worker-dir') ?? DEFAULT_WORKER_DIR,
);
const database = readArg(args, '--database') ?? DEFAULT_DATABASE;

if (!existsSync(historyPath)) {
  throw new Error(`Flue run-history JSONL not found: ${historyPath}`);
}

const historyText = readFileSync(historyPath, 'utf8');
const records = parseRunHistoryJsonl(historyText, historyPath);
const sql = createFlueRunHistoryUpsertSql(records);

if (!sql) {
  console.log(JSON.stringify({
    ok: true,
    uploaded: false,
    reason: 'no_records',
    historyPath,
    database,
  }, null, 2));
  process.exit(0);
}

const runIds = records.map((record) => record.runId);
const newestCheckedAt = records
  .map((record) => record.checkedAt)
  .sort()
  .at(-1);

if (dryRun) {
  console.log(JSON.stringify({
    ok: true,
    dryRun: true,
    recordCount: records.length,
    runIds,
    newestCheckedAt,
    historyPath,
    database,
  }, null, 2));
  process.exit(0);
}

const tempDir = mkdtempSync(join(tmpdir(), 'flue-run-history-d1-'));
const upsertPath = join(tempDir, 'upsert.sql');
const countPath = join(tempDir, 'count.sql');
writeFileSync(upsertPath, sql, 'utf8');
writeFileSync(countPath, createFlueRunHistoryCountSql(records), 'utf8');

const targetFlag = remote ? '--remote' : '--local';
runWrangler(workspaceRoot, workerDir, [
  'd1',
  'execute',
  database,
  targetFlag,
  '--file',
  upsertPath,
]);
runWrangler(workspaceRoot, workerDir, [
  'd1',
  'execute',
  database,
  targetFlag,
  '--file',
  countPath,
]);

console.log(JSON.stringify({
  ok: true,
  uploaded: true,
  target: remote ? 'remote' : 'local',
  recordCount: records.length,
  runIds,
  newestCheckedAt,
  historyPath,
  database,
}, null, 2));
