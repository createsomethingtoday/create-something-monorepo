#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, '..');
const workspaceRoot = path.resolve(packageRoot, '..', '..');
const DEFAULT_RUNS_DIR = path.join(packageRoot, 'reports', 'remote-smoke-runs');

function parseArgs(argv) {
  const args = {
    dir: DEFAULT_RUNS_DIR,
    base: undefined,
    compare: undefined,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--') continue;

    if (arg === '--dir' && next) {
      args.dir = next;
      i += 1;
      continue;
    }
    if (arg === '--base' && next) {
      args.base = next;
      i += 1;
      continue;
    }
    if (arg === '--compare' && next) {
      args.compare = next;
      i += 1;
      continue;
    }
    if (arg === '--json') {
      args.json = true;
      continue;
    }
    if (arg === '--help') {
      printUsage();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function printUsage() {
  console.log(`Usage:
  node packages/webflow-site-analyzer-mcp/scripts/compare-remote-smoke-runs.mjs [options]

Options:
  --dir <path>           Directory containing remote smoke JSON artifacts.
                         Default: ${DEFAULT_RUNS_DIR}
  --base <path>          Explicit base artifact path.
  --compare <path>       Explicit compare/current artifact path.
  --json                 Emit JSON output.

If --base/--compare are not provided, the script compares the latest two JSON
artifacts in --dir using lexical filename order.
`);
}

function ensureAbsolutePath(targetPath) {
  return path.isAbsolute(targetPath) ? targetPath : path.resolve(workspaceRoot, targetPath);
}

function selectArtifactPaths(args) {
  if (args.base || args.compare) {
    if (!args.base || !args.compare) {
      throw new Error('Provide both --base and --compare when using explicit artifact paths.');
    }
    return {
      basePath: ensureAbsolutePath(args.base),
      comparePath: ensureAbsolutePath(args.compare),
    };
  }

  const dir = ensureAbsolutePath(args.dir);
  if (!fs.existsSync(dir)) {
    throw new Error(`Artifact directory not found: ${dir}`);
  }

  const files = fs.readdirSync(dir)
    .filter((entry) => entry.endsWith('.json'))
    .sort();

  if (files.length < 2) {
    throw new Error(`Need at least 2 JSON artifacts in ${dir} to compare. Found ${files.length}.`);
  }

  return {
    basePath: path.join(dir, files[files.length - 2]),
    comparePath: path.join(dir, files[files.length - 1]),
  };
}

function readArtifact(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function summarizeArtifact(filePath, artifact) {
  return {
    path: filePath,
    testedAt: artifact.testedAt ?? null,
    publishedUrl: artifact.publishedUrl ?? null,
    tokenSource: artifact.tokenSource ?? null,
    readinessElapsedMs: artifact.readiness?.elapsedMs ?? null,
    healthElapsedMs: artifact.readiness?.health?.elapsedMs ?? null,
    providerElapsedMs: artifact.readiness?.providerCheck?.elapsedMs ?? null,
    provider: artifact.readiness?.providerCheck?.provider ?? null,
    providerHealthy: artifact.readiness?.providerCheck?.isHealthy ?? null,
    boundedSyncDurationMs: artifact.boundedSync?.durationMs ?? null,
    overallScore: artifact.boundedSync?.overallScore ?? null,
    grade: artifact.boundedSync?.grade ?? null,
    crawledPages: artifact.boundedSync?.crawledPages ?? null,
    coveragePercent: artifact.boundedSync?.coveragePercent ?? null,
    syncGuardMatched: artifact.syncGuard?.matchedGuardMessage ?? null,
    asyncJobStatus: artifact.asyncJob?.status ?? null,
    asyncJobDurationMs: artifact.asyncJob?.durationMs ?? null,
    asyncResultDurationMs: artifact.asyncJob?.resultDurationMs ?? null,
  };
}

function numericDelta(baseValue, compareValue) {
  if (typeof baseValue !== 'number' || typeof compareValue !== 'number') {
    return null;
  }
  return compareValue - baseValue;
}

function formatDelta(delta) {
  if (delta == null) return 'n/a';
  return `${delta >= 0 ? '+' : ''}${delta}`;
}

function describeNumericChange(label, baseValue, compareValue, unit = 'ms') {
  const delta = numericDelta(baseValue, compareValue);
  if (delta == null) return null;
  return `${label}: ${baseValue}${unit} -> ${compareValue}${unit} (${formatDelta(delta)}${unit})`;
}

function compareArtifacts(base, current) {
  const deltas = {
    readinessElapsedMs: numericDelta(base.readinessElapsedMs, current.readinessElapsedMs),
    healthElapsedMs: numericDelta(base.healthElapsedMs, current.healthElapsedMs),
    providerElapsedMs: numericDelta(base.providerElapsedMs, current.providerElapsedMs),
    boundedSyncDurationMs: numericDelta(base.boundedSyncDurationMs, current.boundedSyncDurationMs),
    overallScore: numericDelta(base.overallScore, current.overallScore),
    crawledPages: numericDelta(base.crawledPages, current.crawledPages),
    coveragePercent: numericDelta(base.coveragePercent, current.coveragePercent),
    asyncJobDurationMs: numericDelta(base.asyncJobDurationMs, current.asyncJobDurationMs),
    asyncResultDurationMs: numericDelta(base.asyncResultDurationMs, current.asyncResultDurationMs),
  };

  const changes = [
    describeNumericChange('readiness', base.readinessElapsedMs, current.readinessElapsedMs),
    describeNumericChange('health', base.healthElapsedMs, current.healthElapsedMs),
    describeNumericChange('provider check', base.providerElapsedMs, current.providerElapsedMs),
    describeNumericChange('bounded sync', base.boundedSyncDurationMs, current.boundedSyncDurationMs),
    typeof deltas.overallScore === 'number'
      ? `overall score: ${base.overallScore} -> ${current.overallScore} (${formatDelta(deltas.overallScore)})`
      : null,
    typeof deltas.coveragePercent === 'number'
      ? `coverage percent: ${base.coveragePercent}% -> ${current.coveragePercent}% (${formatDelta(deltas.coveragePercent)}%)`
      : null,
    describeNumericChange('async duration', base.asyncJobDurationMs, current.asyncJobDurationMs),
    base.grade !== current.grade ? `grade: ${base.grade} -> ${current.grade}` : null,
    base.provider !== current.provider ? `provider: ${base.provider} -> ${current.provider}` : null,
    base.syncGuardMatched !== current.syncGuardMatched
      ? `sync guard changed: ${base.syncGuardMatched} -> ${current.syncGuardMatched}`
      : null,
    base.asyncJobStatus !== current.asyncJobStatus
      ? `async status: ${base.asyncJobStatus} -> ${current.asyncJobStatus}`
      : null,
  ].filter(Boolean);

  return {
    comparedAt: new Date().toISOString(),
    base,
    current,
    deltas,
    changes,
  };
}

function printHuman(result) {
  console.log(`[compare-remote-smoke-runs] ${result.base.testedAt} -> ${result.current.testedAt}`);
  console.log(`  base: ${result.base.path}`);
  console.log(`  current: ${result.current.path}`);
  if (result.changes.length === 0) {
    console.log('  changes: none');
    return;
  }
  for (const change of result.changes) {
    console.log(`  ${change}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { basePath, comparePath } = selectArtifactPaths(args);
  const base = summarizeArtifact(basePath, readArtifact(basePath));
  const current = summarizeArtifact(comparePath, readArtifact(comparePath));
  const result = compareArtifacts(base, current);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printHuman(result);
}

main().catch((error) => {
  console.error(
    `[compare-remote-smoke-runs] failed: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
