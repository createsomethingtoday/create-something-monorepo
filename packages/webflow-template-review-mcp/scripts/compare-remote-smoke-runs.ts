import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, '..');
const workspaceRoot = path.resolve(packageRoot, '..', '..');
const DEFAULT_RUNS_DIR = path.join(packageRoot, 'reports', 'remote-smoke-runs');

function parseArgs(argv: string[]) {
  const args: {
    dir: string;
    base?: string;
    compare?: string;
    json: boolean;
  } = {
    dir: DEFAULT_RUNS_DIR,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--dir' && next) {
      args.dir = next;
      index += 1;
      continue;
    }
    if (arg === '--base' && next) {
      args.base = next;
      index += 1;
      continue;
    }
    if (arg === '--compare' && next) {
      args.compare = next;
      index += 1;
      continue;
    }
    if (arg === '--json') {
      args.json = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function ensureAbsolutePath(targetPath: string): string {
  return path.isAbsolute(targetPath) ? targetPath : path.resolve(workspaceRoot, targetPath);
}

function selectArtifactPaths(args: ReturnType<typeof parseArgs>) {
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

function readArtifact(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

function summarizeArtifact(filePath: string, artifact: Record<string, unknown>) {
  const elapsedMs =
    artifact.elapsedMs && typeof artifact.elapsedMs === 'object'
      ? (artifact.elapsedMs as Record<string, unknown>)
      : {};
  const promptChecks =
    artifact.promptChecks && typeof artifact.promptChecks === 'object'
      ? (artifact.promptChecks as Record<string, unknown>)
      : {};
  const toolHealth =
    artifact.toolHealth && typeof artifact.toolHealth === 'object'
      ? (artifact.toolHealth as Record<string, unknown>)
      : {};
  const toolHealthData =
    toolHealth.data && typeof toolHealth.data === 'object'
      ? (toolHealth.data as Record<string, unknown>)
      : {};
  const analyzer =
    toolHealthData.analyzer && typeof toolHealthData.analyzer === 'object'
      ? (toolHealthData.analyzer as Record<string, unknown>)
      : {};

  return {
    path: filePath,
    testedAt: typeof artifact.testedAt === 'string' ? artifact.testedAt : null,
    workerUrl: typeof artifact.workerUrl === 'string' ? artifact.workerUrl : null,
    totalElapsedMs: typeof elapsedMs.total === 'number' ? elapsedMs.total : null,
    healthElapsedMs: typeof elapsedMs.health === 'number' ? elapsedMs.health : null,
    initializeElapsedMs: typeof elapsedMs.initialize === 'number' ? elapsedMs.initialize : null,
    toolHealthElapsedMs: typeof elapsedMs.toolHealth === 'number' ? elapsedMs.toolHealth : null,
    promptElapsedMs: typeof elapsedMs.promptFetch === 'number' ? elapsedMs.promptFetch : null,
    titleMatches: promptChecks.titleMatches === true,
    mentionsPublishedFirst: promptChecks.mentionsPublishedFirst === true,
    mentionsGatedPublishing: promptChecks.mentionsGatedPublishing === true,
    analyzerReachable: analyzer.reachable === true,
    analyzerBrowserAutomationSupported: analyzer.browserAutomationSupported === true,
  };
}

function numericDelta(baseValue: number | null, compareValue: number | null): number | null {
  if (typeof baseValue !== 'number' || typeof compareValue !== 'number') {
    return null;
  }
  return compareValue - baseValue;
}

function formatDelta(delta: number | null): string {
  if (delta == null) return 'n/a';
  return `${delta >= 0 ? '+' : ''}${delta}`;
}

function describeNumericChange(label: string, baseValue: number | null, compareValue: number | null): string | null {
  const delta = numericDelta(baseValue, compareValue);
  if (delta == null) return null;
  return `${label}: ${baseValue}ms -> ${compareValue}ms (${formatDelta(delta)}ms)`;
}

function compareArtifacts(
  base: ReturnType<typeof summarizeArtifact>,
  current: ReturnType<typeof summarizeArtifact>,
) {
  const deltas = {
    totalElapsedMs: numericDelta(base.totalElapsedMs, current.totalElapsedMs),
    healthElapsedMs: numericDelta(base.healthElapsedMs, current.healthElapsedMs),
    initializeElapsedMs: numericDelta(base.initializeElapsedMs, current.initializeElapsedMs),
    toolHealthElapsedMs: numericDelta(base.toolHealthElapsedMs, current.toolHealthElapsedMs),
    promptElapsedMs: numericDelta(base.promptElapsedMs, current.promptElapsedMs),
  };

  const changes = [
    describeNumericChange('total', base.totalElapsedMs, current.totalElapsedMs),
    describeNumericChange('health', base.healthElapsedMs, current.healthElapsedMs),
    describeNumericChange('initialize', base.initializeElapsedMs, current.initializeElapsedMs),
    describeNumericChange('tool health', base.toolHealthElapsedMs, current.toolHealthElapsedMs),
    describeNumericChange('prompt fetch', base.promptElapsedMs, current.promptElapsedMs),
    base.titleMatches !== current.titleMatches
      ? `prompt title match changed: ${base.titleMatches} -> ${current.titleMatches}`
      : null,
    base.mentionsPublishedFirst !== current.mentionsPublishedFirst
      ? `published-first wording changed: ${base.mentionsPublishedFirst} -> ${current.mentionsPublishedFirst}`
      : null,
    base.mentionsGatedPublishing !== current.mentionsGatedPublishing
      ? `gated publishing wording changed: ${base.mentionsGatedPublishing} -> ${current.mentionsGatedPublishing}`
      : null,
    base.analyzerReachable !== current.analyzerReachable
      ? `analyzer reachable changed: ${base.analyzerReachable} -> ${current.analyzerReachable}`
      : null,
    base.analyzerBrowserAutomationSupported !== current.analyzerBrowserAutomationSupported
      ? `analyzer browserAutomationSupported changed: ${base.analyzerBrowserAutomationSupported} -> ${current.analyzerBrowserAutomationSupported}`
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

function printHuman(result: ReturnType<typeof compareArtifacts>): void {
  console.log(`[compare-template-review-smoke] ${result.base.testedAt} -> ${result.current.testedAt}`);
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
    `[compare-template-review-smoke] failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
