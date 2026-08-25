#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const workerRoot = path.resolve(scriptRoot, '..');
const repositoryRoot = path.resolve(workerRoot, '../../../..');
const REQUIRED_RECEIPT_TABLE = 'map_production_monitor_receipts';
const SHA_PATTERN = /^[0-9a-f]{40}$/i;

export function parseArgs(argv) {
  const args = argv.filter((arg) => arg !== '--');
  if (args.length === 0) return { dryRun: false };
  if (args.length === 1 && args[0] === '--dry-run') return { dryRun: true };
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) return { help: true };
  throw new Error('Only --dry-run is supported for map-production-monitor deployment');
}

export function deploymentArgs(sourceSha, dryRun) {
  if (!SHA_PATTERN.test(sourceSha)) {
    throw new Error('Map monitor deployment requires a full 40-character Git SHA');
  }
  return [
    'deploy',
    '--config',
    'wrangler.toml',
    '--var',
    `MAP_MONITOR_SOURCE_SHA:${sourceSha.toLowerCase()}`,
    '--message',
    `map-production-monitor ${sourceSha.toLowerCase()}`,
    ...(dryRun ? ['--dry-run'] : [])
  ];
}

export function hasReceiptTable(payload) {
  return (
    Array.isArray(payload) &&
    payload.length === 1 &&
    payload[0]?.success === true &&
    payload[0]?.results?.some((row) => row?.name === REQUIRED_RECEIPT_TABLE) === true
  );
}

async function command(commandName, args, options = {}) {
  return execFileAsync(commandName, args, { encoding: 'utf8', ...options });
}

function usage() {
  console.log(`Usage: pnpm --filter @create-something/map-production-monitor deploy [--dry-run]

Deploy only from a clean local main that exactly equals origin/main. The command injects
the exact main SHA as MAP_MONITOR_SOURCE_SHA and refuses to deploy until the remote D1
receipt migration exists. Apply the reviewed D1 migration first with db:migrate.`);
}

async function assertHomeBase() {
  try {
    await command('pnpm', ['agent:home-base'], { cwd: repositoryRoot });
  } catch {
    throw new Error('Map monitor deployment requires clean main at the exact origin/main SHA');
  }
  const { stdout } = await command('git', ['rev-parse', '--verify', 'HEAD^{commit}'], {
    cwd: repositoryRoot
  });
  return stdout.trim();
}

async function assertReceiptTable() {
  const { stdout } = await command(
    process.execPath,
    [
      path.join(repositoryRoot, 'scripts/run-wrangler.mjs'),
      'd1',
      'execute',
      'create-something-db',
      '--remote',
      '--config',
      '../../wrangler.jsonc',
      '--command',
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '${REQUIRED_RECEIPT_TABLE}'`,
      '--json'
    ],
    { cwd: workerRoot }
  );
  if (!hasReceiptTable(JSON.parse(stdout))) {
    throw new Error(
      'Remote D1 Map receipt table is absent; apply the reviewed db:migrate step before deployment'
    );
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }
  const sourceSha = await assertHomeBase();
  await assertReceiptTable();
  const args = deploymentArgs(sourceSha, options.dryRun);
  const { stdout, stderr } = await command(
    process.execPath,
    [path.join(repositoryRoot, 'scripts/run-wrangler.mjs'), ...args],
    { cwd: workerRoot }
  );
  process.stdout.write(stdout);
  process.stderr.write(stderr);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
