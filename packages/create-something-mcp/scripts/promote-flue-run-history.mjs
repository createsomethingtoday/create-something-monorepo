import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_HISTORY_PATH =
  'packages/agents/flue-service-agent/.artifacts/flue-service-agent/run-history.jsonl';
const FLUE_PACKAGE_DIR = 'packages/agents/flue-service-agent';
const UPLOAD_SCRIPT = 'packages/create-something-mcp/scripts/upload-flue-run-history-to-d1.mjs';

function findWorkspaceRoot(start) {
  let current = start;

  while (true) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = dirname(current);
    if (parent === current) return start;
    current = parent;
  }
}

function hasFlag(args, name) {
  return args.includes(name);
}

function readArg(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function usage() {
  return `Usage: node scripts/promote-flue-run-history.mjs [options]

Options:
  --remote                    Generate a Cloudflare run-history record and upload to remote D1. Default unless --local or --dry-run is set.
  --local                     Generate a Cloudflare run-history record and upload to local Wrangler D1.
  --dry-run                   Generate into a temp JSONL and validate upload shape without calling Wrangler.
  --issue <CRE-123>           Stamp the generated run-history record with a Linear issue.
  --history-path <path>       JSONL path for non-dry-run promotion. Defaults to ${DEFAULT_HISTORY_PATH}
`;
}

function resolveWorkspacePath(workspaceRoot, value) {
  return isAbsolute(value) ? value : resolve(workspaceRoot, value);
}

function run(command, args, options) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with status ${result.status}`);
  }
}

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const workspaceRoot = findWorkspaceRoot(process.cwd());
const dryRun = hasFlag(args, '--dry-run');
const local = hasFlag(args, '--local');
const remote = hasFlag(args, '--remote') || (!dryRun && !local);

if (dryRun && (local || hasFlag(args, '--remote'))) {
  console.error(usage());
  throw new Error('Use --dry-run without --local or --remote');
}

if (!dryRun && local === remote) {
  console.error(usage());
  throw new Error('Pass exactly one target flag: --remote or --local');
}

const issue = readArg(args, '--issue') ?? process.env.LINEAR_ISSUE;
const env = { ...process.env };
if (issue) env.LINEAR_ISSUE = issue;

const requestedHistoryPath = readArg(args, '--history-path');
const historyPath = dryRun
  ? join(mkdtempSync(join(tmpdir(), 'flue-run-history-promotion-')), 'run-history.jsonl')
  : resolveWorkspacePath(workspaceRoot, requestedHistoryPath ?? DEFAULT_HISTORY_PATH);

const flueArgs = ['--dir', FLUE_PACKAGE_DIR, 'run', 'flue:history:cloudflare'];
if (dryRun || requestedHistoryPath) {
  flueArgs.push('--out', historyPath);
}

run('pnpm', flueArgs, { cwd: workspaceRoot, env });

const uploadArgs = [UPLOAD_SCRIPT, dryRun ? '--dry-run' : local ? '--local' : '--remote'];
if (dryRun || requestedHistoryPath) {
  uploadArgs.push('--history-path', historyPath);
}

run(process.execPath, uploadArgs, { cwd: workspaceRoot, env });

console.log(JSON.stringify({
  ok: true,
  dryRun,
  target: dryRun ? 'none' : local ? 'local' : 'remote',
  issue: issue ?? null,
  historyPath,
}, null, 2));
