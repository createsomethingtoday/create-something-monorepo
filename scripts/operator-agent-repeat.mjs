#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_OUT_DIR = '.cache/operator-agent-repeat';
const DEFAULT_SCHEDULE_SCRIPT = path.resolve(import.meta.dirname, 'operator-agent-schedule.mjs');
const DEFAULT_RUN_ID = new Date().toISOString().slice(0, 10);

export function parseArgs(argv) {
  const options = {
    count: 100,
    runId: DEFAULT_RUN_ID,
    outDir: DEFAULT_OUT_DIR,
    scheduleScript: DEFAULT_SCHEDULE_SCRIPT,
    evalLimit: 1,
    timeoutMs: 300_000,
    noModel: false,
    noRevise: true,
    stopOnFailure: true,
    allowWrites: false,
    dryRun: false,
    json: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    if (arg === '--count' && next) options.count = Number(argv[++index]);
    else if (arg === '--run-id' && next) options.runId = argv[++index];
    else if (arg === '--out-dir' && next) options.outDir = argv[++index];
    else if (arg === '--schedule-script' && next) options.scheduleScript = argv[++index];
    else if (arg === '--eval-limit' && next) options.evalLimit = Number(argv[++index]);
    else if (arg === '--timeout-ms' && next) options.timeoutMs = Number(argv[++index]);
    else if (arg === '--no-model') options.noModel = true;
    else if (arg === '--revise') options.noRevise = false;
    else if (arg === '--no-revise') options.noRevise = true;
    else if (arg === '--continue-on-failure') options.stopOnFailure = false;
    else if (arg === '--allow-writes') options.allowWrites = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 500) {
    throw new Error('--count must be an integer between 1 and 500');
  }
  if (!Number.isInteger(options.evalLimit) || options.evalLimit < 1 || options.evalLimit > 20) {
    throw new Error('--eval-limit must be an integer between 1 and 20');
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1_000) {
    throw new Error('--timeout-ms must be at least 1000');
  }
  if (!options.runId || !/^[a-zA-Z0-9._-]+$/.test(options.runId)) {
    throw new Error('--run-id must contain only letters, numbers, dot, underscore, or dash');
  }
  return options;
}

function usage() {
  console.log(`Usage:
  pnpm operator-agent:repeat -- --count 100 --json

Options:
  --count <n>             Number of schedule loops. Default: 100
  --run-id <id>           Stable run id for resumable receipt paths. Default: YYYY-MM-DD
  --out-dir <path>        Repeat receipt directory. Default: ${DEFAULT_OUT_DIR}
  --eval-limit <n>        Candidate limit passed to schedule once. Default: 1
  --timeout-ms <n>        Timeout passed to schedule once eval/model steps. Default: 300000
  --no-model              Force deterministic schedule loops
  --revise                Allow batch-eval revise attempts
  --no-revise             Disable revise attempts. Default
  --continue-on-failure   Continue after a blocked iteration
  --allow-writes          Do not fail when a child receipt records writes
  --dry-run               Print the plan without running loops
  --json                  Print machine-readable summary
`);
}

function receiptPaths(options) {
  return {
    dir: options.outDir,
    progressPath: path.join(options.outDir, `${options.runId}-progress.jsonl`),
    summaryPath: path.join(options.outDir, `${options.runId}-summary.json`),
  };
}

function readProgress(progressPath) {
  if (!existsSync(progressPath)) return [];
  return readFileSync(progressPath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function appendProgress(progressPath, entry) {
  mkdirSync(path.dirname(progressPath), { recursive: true });
  const previous = existsSync(progressPath) ? readFileSync(progressPath, 'utf8') : '';
  writeFileSync(progressPath, `${previous}${JSON.stringify(entry)}\n`);
}

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('\n}');
  const fallbackEnd = text.lastIndexOf('}');
  if (start < 0 || fallbackEnd <= start) return null;
  const jsonText = end >= start ? text.slice(start, end + 2) : text.slice(start, fallbackEnd + 1);
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function scheduleArgs(options) {
  return [
    options.scheduleScript,
    'once',
    '--eval-limit',
    String(options.evalLimit),
    '--eval-timeout-ms',
    String(options.timeoutMs),
    '--model-probe-timeout-ms',
    String(Math.min(options.timeoutMs, 120_000)),
    ...(options.noModel ? ['--no-model'] : []),
    ...(options.noRevise ? ['--no-revise'] : ['--revise']),
    '--json',
  ];
}

function runIteration(options, index) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(process.execPath, scheduleArgs(options), {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 60,
    timeout: options.timeoutMs * 4,
    env: { ...process.env, NO_COLOR: '1' },
  });
  const finishedAt = new Date().toISOString();
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const report = extractJson(stdout);
  const writesPerformed = report?.scorecard?.batchEvalWritesPerformed ?? null;
  const writeSafe = options.allowWrites || writesPerformed === 0;
  return {
    index,
    startedAt,
    finishedAt,
    command: [process.execPath, ...scheduleArgs(options)].join(' '),
    ok: result.status === 0 && Boolean(report?.passed) && writeSafe,
    exitCode: result.status,
    signal: result.signal,
    receiptPath: report?.receiptPath ?? null,
    schedulePassed: Boolean(report?.passed),
    outcome: report?.outcome ?? null,
    modelBacked: report?.modelBacked ?? !options.noModel,
    modelHealth: report?.scorecard?.modelHealth ?? null,
    writesPerformed,
    candidates: report?.scorecard?.batchEvalCandidates ?? null,
    blockers: writeSafe ? [] : [`child receipt recorded writesPerformed=${writesPerformed}`],
    stdoutTail: stdout.trim().split(/\r?\n/).slice(-10).join('\n'),
    stderrTail: stderr.trim().split(/\r?\n/).slice(-10).join('\n'),
  };
}

function summarize(options, progress, paths) {
  const completed = progress.filter((entry) => entry.ok).length;
  const failed = progress.filter((entry) => !entry.ok).length;
  const writesPerformed = progress.reduce((sum, entry) => sum + (Number(entry.writesPerformed) || 0), 0);
  const summary = {
    generatedAt: new Date().toISOString(),
    mode: 'operator-agent-repeat',
    runId: options.runId,
    requestedCount: options.count,
    completed,
    failed,
    remaining: Math.max(options.count - progress.length, 0),
    passed: completed === options.count && failed === 0 && writesPerformed === 0,
    noWrites: writesPerformed === 0,
    writesPerformed,
    modelBacked: !options.noModel,
    evalLimit: options.evalLimit,
    stopOnFailure: options.stopOnFailure,
    progressPath: paths.progressPath,
    summaryPath: paths.summaryPath,
    latestReceiptPath: progress.at(-1)?.receiptPath ?? null,
    nextDecision:
      completed === options.count && failed === 0 && writesPerformed === 0
        ? 'review 100-loop receipt set before widening any authority'
        : 'continue repeat run or inspect failed iteration before widening authority',
  };
  mkdirSync(paths.dir, { recursive: true });
  writeFileSync(paths.summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

export function buildPlan(options) {
  const paths = receiptPaths(options);
  const progress = readProgress(paths.progressPath);
  return {
    generatedAt: new Date().toISOString(),
    mode: 'operator-agent-repeat-plan',
    runId: options.runId,
    requestedCount: options.count,
    alreadyRecorded: progress.length,
    remaining: Math.max(options.count - progress.length, 0),
    command: [process.execPath, ...scheduleArgs(options)].join(' '),
    progressPath: paths.progressPath,
    summaryPath: paths.summaryPath,
    noWriteGuard: !options.allowWrites,
  };
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    return;
  }

  const paths = receiptPaths(options);
  mkdirSync(paths.dir, { recursive: true });
  const progress = readProgress(paths.progressPath);

  if (options.dryRun) {
    const plan = buildPlan(options);
    if (options.json) console.log(JSON.stringify(plan, null, 2));
    else {
      console.log('# operator-agent-repeat dry run');
      console.log(`Run id: ${plan.runId}`);
      console.log(`Remaining: ${plan.remaining}/${plan.requestedCount}`);
      console.log(`Progress: ${plan.progressPath}`);
      console.log(`Command: ${plan.command}`);
    }
    return;
  }

  for (let index = progress.length + 1; index <= options.count; index += 1) {
    const entry = runIteration(options, index);
    progress.push(entry);
    appendProgress(paths.progressPath, entry);
    summarize(options, progress, paths);
    if (!entry.ok && options.stopOnFailure) break;
  }

  const summary = summarize(options, progress, paths);
  if (options.json) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log('# operator-agent-repeat');
    console.log(`Completed: ${summary.completed}/${summary.requestedCount}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Writes performed: ${summary.writesPerformed}`);
    console.log(`Progress: ${summary.progressPath}`);
    console.log(`Summary: ${summary.summaryPath}`);
  }
  if (!summary.passed) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
