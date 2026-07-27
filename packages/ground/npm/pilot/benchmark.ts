import { createHash } from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, parse, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import {
  type GroundAnalysis,
  type GroundCheck,
  runGroundAnalysis
} from './ground-native-client.ts';
import { startRssSampler } from './process-metrics.ts';
import { validateGroundBenchmarkReceipt } from './receipt.ts';

const execFileAsync = promisify(execFile);

interface BenchmarkSample {
  index: number;
  status: 'passed' | 'failed';
  totalMs: number;
  peakRssBytes: number | null;
  semanticFingerprint: string | null;
  error: string | null;
}

export interface NativeBenchmarkSample extends BenchmarkSample {
  connectMs: number | null;
  discoveryMs: number | null;
  analysisMs: number | null;
}

export interface BaselineBenchmarkSample extends BenchmarkSample {
  exitCode: number | null;
}

interface BenchmarkSummary {
  attempted: number;
  passed: number;
  failed: number;
  resultConsistent: boolean;
  fingerprints: string[];
  latencyMs: {
    min: number;
    median: number;
    p95: number;
    max: number;
  };
  peakRssBytes: number | null;
}

export interface GroundBenchmarkReceipt {
  documentType: 'create-something.ground-native-benchmark-receipt';
  schemaVersion: '1.0.0';
  generatedAt: string;
  source: {
    gitSha: string;
    gitDirty: boolean;
    platform: NodeJS.Platform;
    arch: string;
    nodeVersion: string;
  };
  configuration: {
    workspace: string;
    targetDirectory: string;
    checks: GroundCheck[];
    samples: number;
    warmupSamples: number;
    timeoutMs: number;
  };
  nativeMcp: {
    server: { name: string; version: string };
    tool: 'ground_analyze';
    protocolPassed: boolean;
    binary: {
      path: string;
      bytes: number;
      sha256: string;
      standalone: true;
    };
    samples: NativeBenchmarkSample[];
    summary: BenchmarkSummary;
  };
  typescriptBaseline: null | {
    mode: 'existing-ground-duplicates-script';
    artifact: {
      path: string;
      bytes: number;
      standalone: false;
      runtime: 'node+tsx+workspace-dependencies';
    };
    samples: BaselineBenchmarkSample[];
    summary: BenchmarkSummary;
  };
  comparison: {
    scope: 'directional-only';
    claims: string[];
    adoptionDecision: 'adopt-native-kernel-behind-mcp' | 'retain-typescript-path' | 'inconclusive';
    rationale: string;
  };
}

export interface GroundBenchmarkOptions {
  workspace: string;
  binaryPath: string;
  targetDirectory: string;
  checks: GroundCheck[];
  samples: number;
  warmupSamples: number;
  timeoutMs: number;
  includeTypescriptBaseline: boolean;
}

interface ProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  totalMs: number;
  peakRssBytes: number | null;
  timedOut: boolean;
  spawnError: string | null;
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

function percentile(sorted: number[], quantile: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1);
  return sorted[index];
}

function summarizeSamples(samples: BenchmarkSample[]): BenchmarkSummary {
  const passed = samples.filter((sample) => sample.status === 'passed');
  const failed = samples.length - passed.length;
  const fingerprints = [
    ...new Set(
      passed
        .map((sample) => sample.semanticFingerprint)
        .filter((value): value is string => typeof value === 'string')
    )
  ];
  const latencies = samples.map((sample) => sample.totalMs).sort((a, b) => a - b);
  const middle = Math.floor(latencies.length / 2);
  const median =
    latencies.length % 2 === 0
      ? (latencies[middle - 1] + latencies[middle]) / 2
      : latencies[middle];
  const rssValues = passed
    .map((sample) => sample.peakRssBytes)
    .filter((value): value is number => typeof value === 'number');

  return {
    attempted: samples.length,
    passed: passed.length,
    failed,
    resultConsistent: failed === 0 && fingerprints.length === 1,
    fingerprints,
    latencyMs: {
      min: round(latencies[0] ?? 0),
      median: round(median ?? 0),
      p95: round(percentile(latencies, 0.95)),
      max: round(latencies.at(-1) ?? 0)
    },
    peakRssBytes: rssValues.length > 0 ? Math.max(...rssValues) : null
  };
}

function canonicalize(value: unknown, workspace: string): unknown {
  if (typeof value === 'string') return value.replaceAll(workspace, '.');
  if (Array.isArray(value)) return value.map((item) => canonicalize(item, workspace));
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalize(item, workspace)])
    );
  }
  return value;
}

function fingerprint(value: unknown, workspace: string): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value, workspace)))
    .digest('hex');
}

function fingerprintNativeAnalysis(analysis: GroundAnalysis, workspace: string): string {
  return fingerprint(
    {
      checks_run: analysis.checks_run,
      findings: analysis.findings,
      framework: analysis.framework,
      summary: analysis.summary,
      message: analysis.message
    },
    workspace
  );
}

async function sha256File(path: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}

async function runNativeSample(
  options: GroundBenchmarkOptions,
  index: number
): Promise<{ sample: NativeBenchmarkSample; server: { name: string; version: string } | null }> {
  const startedAt = performance.now();
  const stateDirectory = await mkdtemp(join(tmpdir(), 'ground-native-benchmark-'));
  try {
    const result = await runGroundAnalysis({
      binaryPath: options.binaryPath,
      workspace: options.workspace,
      directory: options.targetDirectory,
      checks: options.checks,
      timeoutMs: options.timeoutMs,
      databasePath: join(stateDirectory, 'registry.db')
    });
    return {
      sample: {
        index,
        status: 'passed',
        connectMs: result.timings.connectMs,
        discoveryMs: result.timings.discoveryMs,
        analysisMs: result.timings.analysisMs,
        totalMs: result.timings.totalMs,
        peakRssBytes: result.timings.peakRssBytes,
        semanticFingerprint: fingerprintNativeAnalysis(result.analysis, options.workspace),
        error: null
      },
      server: result.server
    };
  } catch (error) {
    return {
      sample: {
        index,
        status: 'failed',
        connectMs: null,
        discoveryMs: null,
        analysisMs: null,
        totalMs: round(performance.now() - startedAt),
        peakRssBytes: null,
        semanticFingerprint: null,
        error: error instanceof Error ? error.message : String(error)
      },
      server: null
    };
  } finally {
    await rm(stateDirectory, { recursive: true, force: true });
  }
}

async function runProcess(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number
): Promise<ProcessResult> {
  const startedAt = performance.now();
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  let spawnError: string | null = null;
  child.stdout.on('data', (chunk) => (stdout += String(chunk)));
  child.stderr.on('data', (chunk) => (stderr += String(chunk)));
  const sampler = startRssSampler(child.pid ?? null);
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGKILL');
  }, timeoutMs);

  const exitCode = await new Promise<number | null>((resolveExit) => {
    child.once('error', (error) => {
      spawnError = error.message;
      resolveExit(null);
    });
    child.once('close', (code) => resolveExit(code));
  });
  clearTimeout(timer);
  const peakRssBytes = await sampler.stop();
  return {
    exitCode,
    stdout,
    stderr,
    totalMs: round(performance.now() - startedAt),
    peakRssBytes,
    timedOut,
    spawnError
  };
}

async function runTypescriptBaselineSample(
  options: GroundBenchmarkOptions,
  index: number
): Promise<BaselineBenchmarkSample> {
  const stateDirectory = await mkdtemp(join(tmpdir(), 'ground-typescript-benchmark-'));
  const configDirectory = join(stateDirectory, '.ground');
  const scriptPath = resolve(options.workspace, 'scripts/ground-duplicates.ts');
  const tsxPath = resolve(options.workspace, 'node_modules/.bin/tsx');
  try {
    await mkdir(configDirectory, { recursive: true });
    await writeFile(
      join(configDirectory, 'consolidation-config.yml'),
      [
        'duplicates:',
        '  similarity_threshold: 85',
        '  min_lines: 1',
        '  canonical_sources: []',
        `  check_paths: [${JSON.stringify(options.targetDirectory)}]`,
        '  ignore_functions: []',
        "  ignore_files: ['*.test.ts', '*.spec.ts', '*.d.ts', 'index.ts']",
        ''
      ].join('\n'),
      'utf8'
    );
    const processResult = await runProcess(
      tsxPath,
      [scriptPath, '--json'],
      stateDirectory,
      options.timeoutMs
    );

    let parsed: unknown;
    let parseError: string | null = null;
    try {
      parsed = JSON.parse(processResult.stdout.trim());
    } catch (error) {
      parseError = error instanceof Error ? error.message : String(error);
    }
    const acceptedExit = processResult.exitCode === 0 || processResult.exitCode === 1;
    const status =
      acceptedExit && !processResult.timedOut && !processResult.spawnError && !parseError
        ? 'passed'
        : 'failed';
    const error =
      status === 'passed'
        ? null
        : [
            processResult.spawnError,
            processResult.timedOut ? `timed out after ${options.timeoutMs}ms` : null,
            parseError ? `invalid JSON: ${parseError}` : null,
            processResult.stderr.trim() || null
          ]
            .filter(Boolean)
            .join('; ');

    return {
      index,
      status,
      exitCode: processResult.exitCode,
      totalMs: processResult.totalMs,
      peakRssBytes: processResult.peakRssBytes,
      semanticFingerprint: status === 'passed' ? fingerprint(parsed, options.workspace) : null,
      error
    };
  } finally {
    await rm(stateDirectory, { recursive: true, force: true });
  }
}

async function gitMetadata(workspace: string): Promise<{ gitSha: string; gitDirty: boolean }> {
  const [{ stdout: sha }, { stdout: statusOutput }] = await Promise.all([
    execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: workspace }),
    execFileAsync('git', ['status', '--porcelain', '--untracked-files=normal'], {
      cwd: workspace
    })
  ]);
  return { gitSha: sha.trim(), gitDirty: statusOutput.trim().length > 0 };
}

export async function runGroundBenchmark(
  options: GroundBenchmarkOptions
): Promise<GroundBenchmarkReceipt> {
  if (!Number.isInteger(options.samples) || options.samples < 1) {
    throw new Error('samples must be a positive integer');
  }
  if (!Number.isInteger(options.warmupSamples) || options.warmupSamples < 0) {
    throw new Error('warmupSamples must be a non-negative integer');
  }

  for (let index = 1; index <= options.warmupSamples; index += 1) {
    const warmup = await runNativeSample(options, index);
    if (warmup.sample.status !== 'passed') {
      throw new Error(`Native warmup failed: ${warmup.sample.error}`);
    }
    if (options.includeTypescriptBaseline) {
      const baselineWarmup = await runTypescriptBaselineSample(options, index);
      if (baselineWarmup.status !== 'passed') {
        throw new Error(`TypeScript warmup failed: ${baselineWarmup.error}`);
      }
    }
  }

  const nativeSamples: NativeBenchmarkSample[] = [];
  let server: { name: string; version: string } | null = null;
  for (let index = 1; index <= options.samples; index += 1) {
    const result = await runNativeSample(options, index);
    nativeSamples.push(result.sample);
    server ??= result.server;
  }

  const baselineSamples: BaselineBenchmarkSample[] = [];
  if (options.includeTypescriptBaseline) {
    for (let index = 1; index <= options.samples; index += 1) {
      baselineSamples.push(await runTypescriptBaselineSample(options, index));
    }
  }

  const nativeSummary = summarizeSamples(nativeSamples);
  const baselineSummary = baselineSamples.length > 0 ? summarizeSamples(baselineSamples) : null;
  const binaryStats = await stat(options.binaryPath);
  const baselineScriptPath = resolve(options.workspace, 'scripts/ground-duplicates.ts');
  const source = await gitMetadata(options.workspace);
  const protocolPassed = nativeSummary.failed === 0 && nativeSummary.resultConsistent;
  const adoptionDecision = protocolPassed ? 'adopt-native-kernel-behind-mcp' : 'inconclusive';
  const claims = [
    `Native Ground MCP retained ${nativeSummary.passed}/${nativeSummary.attempted} passing samples with semantic consistency=${nativeSummary.resultConsistent}.`,
    `Native median total latency was ${nativeSummary.latencyMs.median} ms and observed peak RSS was ${nativeSummary.peakRssBytes ?? 'unavailable'} bytes on this target.`,
    baselineSummary
      ? `The existing TypeScript script retained ${baselineSummary.passed}/${baselineSummary.attempted} passing samples with median total latency ${baselineSummary.latencyMs.median} ms and observed peak RSS ${baselineSummary.peakRssBytes ?? 'unavailable'} bytes.`
      : 'The optional TypeScript operational baseline was not run.',
    'Cross-implementation metrics are directional only: both paths scan the same directory for duplicate-analysis intent, but their parsers and algorithms differ.'
  ];

  return {
    documentType: 'create-something.ground-native-benchmark-receipt',
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    source: {
      ...source,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    },
    configuration: {
      workspace: options.workspace,
      targetDirectory: relative(options.workspace, options.targetDirectory) || '.',
      checks: options.checks,
      samples: options.samples,
      warmupSamples: options.warmupSamples,
      timeoutMs: options.timeoutMs
    },
    nativeMcp: {
      server: server ?? { name: 'ground', version: 'unknown' },
      tool: 'ground_analyze',
      protocolPassed,
      binary: {
        path: relative(options.workspace, options.binaryPath),
        bytes: binaryStats.size,
        sha256: await sha256File(options.binaryPath),
        standalone: true
      },
      samples: nativeSamples,
      summary: nativeSummary
    },
    typescriptBaseline: baselineSummary
      ? {
          mode: 'existing-ground-duplicates-script',
          artifact: {
            path: relative(options.workspace, baselineScriptPath),
            bytes: (await stat(baselineScriptPath)).size,
            standalone: false,
            runtime: 'node+tsx+workspace-dependencies'
          },
          samples: baselineSamples,
          summary: baselineSummary
        }
      : null,
    comparison: {
      scope: 'directional-only',
      claims,
      adoptionDecision,
      rationale: protocolPassed
        ? 'Adopt the native Ground kernel behind the stable MCP adapter for bounded analysis workloads; retain TypeScript as the control plane and keep rollout decisions separate.'
        : 'Do not promote the native path until protocol failures or inconsistent results are resolved.'
    }
  };
}

function findWorkspaceRoot(start: string): string {
  let current = resolve(start);
  const root = parse(current).root;
  while (current !== root) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) return current;
    current = dirname(current);
  }
  throw new Error(`Unable to find workspace root from ${start}`);
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main(): Promise<void> {
  const workspace = findWorkspaceRoot(process.cwd());
  const outputPath = resolve(
    workspace,
    argValue('--output') ??
      'packages/ground/npm/pilot/evidence/ground-native-benchmark-receipt.v1.json'
  );
  const receipt = await runGroundBenchmark({
    workspace,
    binaryPath: resolve(
      workspace,
      argValue('--binary') ?? 'packages/ground/target/release/ground-mcp'
    ),
    targetDirectory: resolve(workspace, argValue('--target') ?? 'packages/mcp-core/src'),
    checks: ['duplicates'],
    samples: Number.parseInt(argValue('--samples') ?? '5', 10),
    warmupSamples: Number.parseInt(argValue('--warmups') ?? '1', 10),
    timeoutMs: Number.parseInt(argValue('--timeout-ms') ?? '60000', 10),
    includeTypescriptBaseline: !process.argv.includes('--native-only')
  });
  const validation = validateGroundBenchmarkReceipt(receipt);
  if (!validation.valid) {
    throw new Error(`Generated receipt failed validation:\n${validation.errors.join('\n')}`);
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  process.stdout.write(
    `${JSON.stringify({ outputPath, validation, comparison: receipt.comparison }, null, 2)}\n`
  );
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
