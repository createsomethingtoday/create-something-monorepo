#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_OUT_DIR = '.cache/operator-agent-schedule';
const DEFAULT_SYSTEM_SCRIPT = path.resolve(import.meta.dirname, 'operator-agent-system.mjs');
const DEFAULT_SCHEDULE_SCRIPT = path.resolve(import.meta.dirname, 'operator-agent-schedule.mjs');
const DEFAULT_REPO_ROOT = path.resolve(import.meta.dirname, '..');
const DEFAULT_LAUNCH_AGENT_DIR = path.join(process.env.HOME ?? '.', 'Library/LaunchAgents');
const COMMANDS = new Set(['once', 'install-launchd', 'uninstall-launchd', 'launchd-status']);

export function parseArgs(argv) {
  const options = {
    command: 'once',
    outDir: DEFAULT_OUT_DIR,
    systemScript: DEFAULT_SYSTEM_SCRIPT,
    scheduleScript: DEFAULT_SCHEDULE_SCRIPT,
    patternScope: 'all',
    patternTimeoutMs: 300_000,
    modelProbeTimeoutMs: 120_000,
    evalSurface: 'docs/guides',
    evalLimit: 2,
    evalTimeoutMs: 300_000,
    fastIntervalSeconds: 3600,
    modelIntervalSeconds: 21_600,
    launchAgentDir: DEFAULT_LAUNCH_AGENT_DIR,
    repoRoot: DEFAULT_REPO_ROOT,
    load: false,
    runAtLoad: false,
    jobs: ['fast', 'model'],
    noModel: false,
    patternNoModel: true,
    noRevise: true,
    json: false,
  };
  const args = [...argv];
  if (args[0] && COMMANDS.has(args[0])) options.command = args.shift();

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--') continue;
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--no-model') {
      options.noModel = true;
      continue;
    }
    if (arg === '--model-pattern-review') {
      options.patternNoModel = false;
      continue;
    }
    if (arg === '--no-model-pattern-review') {
      options.patternNoModel = true;
      continue;
    }
    if (arg === '--load') {
      options.load = true;
      continue;
    }
    if (arg === '--run-at-load') {
      options.runAtLoad = true;
      continue;
    }
    if (arg === '--revise') {
      options.noRevise = false;
      continue;
    }
    if (arg === '--no-revise') {
      options.noRevise = true;
      continue;
    }
    if (!arg?.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    const option = arg.slice(2);
    const equalsIndex = option.indexOf('=');
    const rawKey = equalsIndex === -1 ? option : option.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : option.slice(equalsIndex + 1);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = inlineValue ?? args.shift();
    if (!value) throw new Error(`Missing value for --${rawKey}`);

    if (key === 'outDir') options.outDir = value;
    else if (key === 'systemScript') options.systemScript = value;
    else if (key === 'scheduleScript') options.scheduleScript = value;
    else if (key === 'repoRoot') options.repoRoot = value;
    else if (key === 'launchAgentDir') options.launchAgentDir = value;
    else if (key === 'patternScope') options.patternScope = value;
    else if (key === 'timeoutMs') {
      options.patternTimeoutMs = Number(value);
      options.modelProbeTimeoutMs = Number(value);
      options.evalTimeoutMs = Number(value);
    }
    else if (key === 'patternTimeoutMs') options.patternTimeoutMs = Number(value);
    else if (key === 'modelProbeTimeoutMs') options.modelProbeTimeoutMs = Number(value);
    else if (key === 'evalSurface') options.evalSurface = value;
    else if (key === 'evalLimit') options.evalLimit = Number(value);
    else if (key === 'evalTimeoutMs') options.evalTimeoutMs = Number(value);
    else if (key === 'fastIntervalSeconds') options.fastIntervalSeconds = Number(value);
    else if (key === 'modelIntervalSeconds') options.modelIntervalSeconds = Number(value);
    else if (key === 'jobs') options.jobs = value.split(',').map((job) => job.trim()).filter(Boolean);
    else throw new Error(`Unsupported option: --${rawKey}`);
  }

  if (!COMMANDS.has(options.command)) throw new Error(`Unknown command: ${options.command}`);
  if (!['all', 'canonical'].includes(options.patternScope)) {
    throw new Error('Unknown --pattern-scope. Expected: all or canonical');
  }
  if (!Number.isInteger(options.evalLimit) || options.evalLimit < 1) {
    throw new Error('--eval-limit must be a positive integer');
  }
  if (options.jobs.length === 0) {
    throw new Error('--jobs must include at least one of: fast, model');
  }
  for (const [flag, interval] of [
    ['--fast-interval-seconds', options.fastIntervalSeconds],
    ['--model-interval-seconds', options.modelIntervalSeconds],
  ]) {
    if (!Number.isInteger(interval) || interval < 1) {
      throw new Error(`${flag} must be a positive integer`);
    }
  }
  for (const job of options.jobs) {
    if (!['fast', 'model'].includes(job)) throw new Error(`Unknown launchd job: ${job}`);
  }
  return options;
}

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function plistValue(value, indent = '  ') {
  if (typeof value === 'boolean') return `${indent}<${value ? 'true' : 'false'}/>`;
  if (Number.isInteger(value)) return `${indent}<integer>${value}</integer>`;
  if (Array.isArray(value)) {
    return [`${indent}<array>`, ...value.map((entry) => plistValue(entry, `${indent}  `)), `${indent}</array>`].join('\n');
  }
  return `${indent}<string>${xmlEscape(value)}</string>`;
}

function plistFromObject(object) {
  const entries = Object.entries(object).flatMap(([key, value]) => [`    <key>${xmlEscape(key)}</key>`, plistValue(value, '    ')]);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '  <dict>',
    ...entries,
    '  </dict>',
    '</plist>',
    '',
  ].join('\n');
}

export function stableLaunchdPath(currentPath = process.env.PATH ?? '', nodePath = process.execPath) {
  const nodeDir = path.dirname(nodePath);
  const stableEntries = [
    nodeDir,
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ];
  const inheritedEntries = currentPath
    .split(':')
    .filter(Boolean)
    .filter((entry) => {
      if (entry.includes('/.codex/tmp/')) return false;
      if (entry.includes('/.cache/codex-runtimes/')) return false;
      if (entry.includes('/node_modules/.bin')) return false;
      if (entry.includes('/corepack/')) return false;
      return ['/opt/homebrew/bin', '/opt/homebrew/sbin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'].includes(entry);
    });
  return [...new Set([...stableEntries, ...inheritedEntries])].join(':');
}

export function launchdDefinitions(options) {
  const logDir = path.join(options.repoRoot, '.tmp');
  const common = {
    cwd: options.repoRoot,
    outDir: path.join(options.repoRoot, DEFAULT_OUT_DIR),
    node: process.execPath,
    script: path.resolve(options.scheduleScript),
    pathEnv: stableLaunchdPath(process.env.PATH, process.execPath),
  };
  return [
    {
      id: 'fast',
      label: 'agency.createsomething.operator-agent.fast',
      intervalSeconds: options.fastIntervalSeconds,
      logPath: path.join(logDir, 'operator-agent-schedule.fast.log'),
      errorPath: path.join(logDir, 'operator-agent-schedule.fast.err.log'),
      programArguments: [
        common.node,
        common.script,
        'once',
        '--no-model',
        '--eval-limit',
        '2',
        '--out-dir',
        common.outDir,
        '--json',
      ],
      ...common,
    },
    {
      id: 'model',
      label: 'agency.createsomething.operator-agent.model',
      intervalSeconds: options.modelIntervalSeconds,
      logPath: path.join(logDir, 'operator-agent-schedule.model.log'),
      errorPath: path.join(logDir, 'operator-agent-schedule.model.err.log'),
      programArguments: [
        common.node,
        common.script,
        'once',
        '--eval-limit',
        '1',
        '--out-dir',
        common.outDir,
        '--json',
      ],
      ...common,
    },
  ].filter((definition) => options.jobs.includes(definition.id));
}

export function plistForJob(job, options) {
  return plistFromObject({
    Label: job.label,
    ProgramArguments: job.programArguments,
    WorkingDirectory: job.cwd,
    StandardOutPath: job.logPath,
    StandardErrorPath: job.errorPath,
    StartInterval: job.intervalSeconds,
    RunAtLoad: options.runAtLoad,
    ProcessType: 'Background',
    LowPriorityIO: true,
    EnvironmentVariables: {
      PATH: job.pathEnv,
      NO_COLOR: '1',
    },
  }).replace(
    /    <key>EnvironmentVariables<\/key>\n    <string>\[object Object\]<\/string>/,
    [
      '    <key>EnvironmentVariables</key>',
      '    <dict>',
      '      <key>PATH</key>',
      `      <string>${xmlEscape(job.pathEnv)}</string>`,
      '      <key>NO_COLOR</key>',
      '      <string>1</string>',
      '    </dict>',
    ].join('\n')
  );
}

export function validateLaunchdPlist(plistText, job) {
  const issues = [];
  if (!plistText.includes(job.label)) issues.push(`plist is missing label ${job.label}`);
  if (!plistText.includes(job.script)) issues.push('plist is missing operator-agent schedule script');
  if (plistText.includes('operator-agent-system.mjs')) issues.push('plist must not call operator-agent-system.mjs directly');
  if (!Number.isInteger(job.intervalSeconds) || job.intervalSeconds < 1) {
    issues.push('plist StartInterval must be a positive integer');
  } else {
    const startInterval = new RegExp(`<key>StartInterval</key>\\s*<integer>${job.intervalSeconds}</integer>`);
    if (!startInterval.test(plistText)) issues.push('plist StartInterval must be a positive integer');
  }
  if (plistText.includes('.codex/tmp') || plistText.includes('.cache/codex-runtimes')) {
    issues.push('plist PATH includes transient Codex runtime paths');
  }
  return {
    ok: issues.length === 0,
    issues,
  };
}

export function buildRunPlan(options) {
  const evalModelArgs = options.noModel ? ['--no-model'] : [];
  const patternModelArgs = options.noModel || options.patternNoModel ? ['--no-model'] : [];
  const plan = [
    {
      id: 'pattern-review',
      mode: 'pattern-review',
      required: true,
      args: [
        options.systemScript,
        'pattern-review',
        '--pattern-scope',
        options.patternScope,
        '--timeout-ms',
        String(options.patternTimeoutMs),
        ...patternModelArgs,
        '--json',
      ],
    },
    ...(!options.noModel
      ? [
          {
            id: 'model-probe',
            mode: 'model-probe',
            required: false,
            args: [
              options.systemScript,
              'model-probe',
              '--timeout-ms',
              String(options.modelProbeTimeoutMs),
              '--json',
            ],
          },
        ]
      : []),
    {
      id: 'batch-eval',
      mode: 'batch-eval',
      required: true,
      args: [
        options.systemScript,
        'batch-eval',
        '--surface',
        options.evalSurface,
        '--limit',
        String(options.evalLimit),
        '--timeout-ms',
        String(options.evalTimeoutMs),
        ...evalModelArgs,
        ...(options.noRevise ? ['--no-revise'] : []),
        '--json',
      ],
    },
  ];
  return plan;
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

function summarizeChildReport(report) {
  if (!report || typeof report !== 'object') return null;
  if (report.mode === 'pattern-review') {
    return {
      mode: report.mode,
      passed: report.passed,
      outcome: report.outcome,
      receiptPath: report.receiptPath,
      patternReviewSource: report.patternReviewSource,
      fallbackUsed: report.fallbackUsed,
      modelOk: report.modelResult?.ok ?? false,
      modelSchemaOk: report.modelResult?.schemaGate?.ok ?? null,
      repairSchemaOk: report.repairResult?.schemaGate?.ok ?? null,
      filesInspected: Array.isArray(report.filesInspected) ? report.filesInspected.length : 0,
      blockers: report.patternReviewGate?.blockers ?? [],
    };
  }
  if (report.mode === 'batch-eval') {
    return {
      mode: report.mode,
      passed: report.passed,
      outcome: report.outcome,
      receiptPath: report.receiptPath,
      surface: report.surface,
      limit: report.limit,
      scorecard: report.scorecard ?? null,
    };
  }
  if (report.mode === 'model-probe') {
    return {
      mode: report.mode,
      passed: report.passed,
      outcome: report.outcome,
      receiptPath: report.receiptPath,
      model: report.model,
      timeoutMs: report.timeoutMs,
      latencyMs: report.latencyMs,
      contractOk: report.contractGate?.ok ?? false,
      blockers: report.contractGate?.blockers ?? [],
    };
  }
  return {
    mode: report.mode,
    passed: report.passed,
    outcome: report.outcome,
    receiptPath: report.receiptPath,
  };
}

function runStep(step) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(process.execPath, step.args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 40,
    timeout: 600_000,
    env: { ...process.env, NO_COLOR: '1' },
  });
  const finishedAt = new Date().toISOString();
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const report = extractJson(stdout);
  const summary = summarizeChildReport(report);
  return {
    id: step.id,
    mode: step.mode,
    required: step.required,
    command: [process.execPath, ...step.args].join(' '),
    startedAt,
    finishedAt,
    ok: result.status === 0 && Boolean(report?.passed ?? report?.outcome),
    exitCode: result.status,
    signal: result.signal,
    report: summary,
    stdoutTail: stdout.trim().split(/\r?\n/).slice(-12).join('\n'),
    stderrTail: stderr.trim().split(/\r?\n/).slice(-12).join('\n'),
  };
}

function nextRecommendedRun() {
  return new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
}

function modelHealthForSchedule(options, patternRun, modelProbeRun, batchRun, batchScorecard) {
  if (options.noModel) return { modelHealth: 'disabled', modelIssues: [] };
  const issues = [];
  if (!options.patternNoModel && patternRun?.report?.patternReviewSource !== 'model') {
    issues.push(`pattern review source was ${patternRun?.report?.patternReviewSource ?? 'unknown'}`);
  }
  if (modelProbeRun?.report?.passed === false) {
    issues.push('model-probe failed before batch-eval');
  }
  if (batchRun?.forcedNoModel) {
    issues.push('batch-eval forced deterministic after failed model-probe');
  }
  if (batchScorecard.modelScoutOk === false) issues.push('model scout failed or fell back during batch-eval');
  if ((batchScorecard.modelParseFailures ?? 0) > 0) issues.push(`model parse failures: ${batchScorecard.modelParseFailures}`);
  if ((batchScorecard.modelRevisionFailures ?? 0) > 0) issues.push(`model revision failures: ${batchScorecard.modelRevisionFailures}`);
  return {
    modelHealth: issues.length === 0 ? 'ok' : 'degraded',
    modelIssues: issues,
  };
}

export function scheduleReport(options, runs) {
  const patternRun = runs.find((run) => run.id === 'pattern-review');
  const modelProbeRun = runs.find((run) => run.id === 'model-probe');
  const batchRun = runs.find((run) => run.id === 'batch-eval');
  const batchScorecard = batchRun?.report?.scorecard ?? {};
  const passed = runs.every((run) => run.ok || run.required === false || run.id === 'model-probe');
  const modelHealth = modelHealthForSchedule(options, patternRun, modelProbeRun, batchRun, batchScorecard);
  return {
    generatedAt: new Date().toISOString(),
    mode: 'schedule-once',
    loop: 'operator-agent-schedule',
    target: 'local',
    modelBacked: !options.noModel,
    patternModelBacked: !options.noModel && !options.patternNoModel,
    patternScope: options.patternScope,
    evalSurface: options.evalSurface,
    evalLimit: options.evalLimit,
    runs,
    scorecard: {
      patternReviewPassed: Boolean(patternRun?.report?.passed),
      patternReviewSource: patternRun?.report?.patternReviewSource ?? null,
      modelProbePassed: modelProbeRun ? Boolean(modelProbeRun.report?.passed) : null,
      modelProbeLatencyMs: modelProbeRun?.report?.latencyMs ?? null,
      modelProbeOutcome: modelProbeRun?.report?.outcome ?? null,
      batchEvalPassed: Boolean(batchRun?.report?.passed),
      batchEvalForcedNoModel: Boolean(batchRun?.forcedNoModel),
      batchEvalCandidates: batchScorecard.candidatesProposed ?? 0,
      batchEvalWritesPerformed: batchScorecard.writesPerformed ?? null,
      batchEvalInitialWritesAllowed: batchScorecard.initialWritesAllowed ?? null,
      batchEvalPostRevisionWritesAllowed: batchScorecard.postRevisionWritesAllowed ?? null,
      ...modelHealth,
    },
    passed,
    outcome: passed ? 'schedule-complete' : 'schedule-blocked',
    nextRecommendedRun: nextRecommendedRun(),
    nextDecision: passed
      ? 'compare repeated schedule receipts before widening local model authority'
      : 'inspect failed run receipt and keep local model authority read-only',
  };
}

function writeReceipt(options, report) {
  mkdirSync(options.outDir, { recursive: true });
  const stamp = `${new Date().toISOString().replaceAll(':', '-').replace('.', '-')}-${randomUUID().slice(0, 8)}`;
  const filePath = path.join(options.outDir, `${stamp}-schedule-once-local.json`);
  writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
  return filePath;
}

function runLaunchctl(args) {
  const result = spawnSync('launchctl', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 5,
  });
  return {
    command: ['launchctl', ...args].join(' '),
    ok: result.status === 0,
    exitCode: result.status,
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
  };
}

function uidTarget() {
  return `gui/${process.getuid()}`;
}

function installLaunchd(options) {
  mkdirSync(options.launchAgentDir, { recursive: true });
  mkdirSync(path.join(options.repoRoot, '.tmp'), { recursive: true });
  const jobs = launchdDefinitions(options).map((job) => {
    const plistPath = path.join(options.launchAgentDir, `${job.label}.plist`);
    writeFileSync(plistPath, plistForJob(job, options));
    const launchctl = [];
    if (options.load) {
      launchctl.push(runLaunchctl(['bootout', uidTarget(), plistPath]));
      launchctl.push(runLaunchctl(['bootstrap', uidTarget(), plistPath]));
      launchctl.push(runLaunchctl(['enable', `${uidTarget()}/${job.label}`]));
    }
    return {
      id: job.id,
      label: job.label,
      plistPath,
      intervalSeconds: job.intervalSeconds,
      loaded: options.load,
      launchctl,
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    mode: 'launchd-install',
    launchAgentDir: options.launchAgentDir,
    jobs,
    passed: jobs.every((job) => !options.load || job.launchctl.some((result) => result.command.includes('bootstrap') && result.ok)),
    outcome: 'launchd-installed',
  };
}

function uninstallLaunchd(options) {
  const jobs = launchdDefinitions(options).map((job) => {
    const plistPath = path.join(options.launchAgentDir, `${job.label}.plist`);
    const launchctl = [];
    if (existsSync(plistPath)) launchctl.push(runLaunchctl(['bootout', uidTarget(), plistPath]));
    let removed = false;
    try {
      unlinkSync(plistPath);
      removed = true;
    } catch {}
    return {
      id: job.id,
      label: job.label,
      plistPath,
      removed,
      launchctl,
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    mode: 'launchd-uninstall',
    jobs,
    passed: true,
    outcome: 'launchd-uninstalled',
  };
}

function launchdStatus(options) {
  const jobs = launchdDefinitions(options).map((job) => {
    const plistPath = path.join(options.launchAgentDir, `${job.label}.plist`);
    const plistExists = existsSync(plistPath);
    const plistText = plistExists ? readFileSync(plistPath, 'utf8') : '';
    const validation = validateLaunchdPlist(plistText, job);
    const launchctl = runLaunchctl(['print', `${uidTarget()}/${job.label}`]);
    return {
      id: job.id,
      label: job.label,
      plistPath,
      plistExists,
      validation,
      loaded: launchctl.ok,
      launchctl,
      plistPreview: plistText.slice(0, 1000),
    };
  });
  const ready = jobs.every((job) => job.plistExists && job.validation.ok && job.loaded);
  return {
    generatedAt: new Date().toISOString(),
    mode: 'launchd-status',
    jobs,
    passed: ready,
    outcome: ready ? 'launchd-ready' : 'launchd-not-ready',
  };
}

function print(report, asJson) {
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log('# operator-agent-schedule');
  console.log(`Result: ${report.passed ? 'passed' : 'blocked'}`);
  if (report.mode === 'schedule-once') {
    console.log(`Pattern review: ${report.scorecard.patternReviewPassed ? 'passed' : 'blocked'} (${report.scorecard.patternReviewSource})`);
    console.log(`Batch eval writes performed: ${report.scorecard.batchEvalWritesPerformed}`);
    console.log(`Receipt: ${report.receiptPath}`);
  } else if (report.mode?.startsWith('launchd-')) {
    for (const job of report.jobs) console.log(`${job.label}: ${job.plistPath}`);
  }
}

function forceNoModelForBatchStep(step) {
  if (step.id !== 'batch-eval' || step.args.includes('--no-model')) return step;
  const args = [...step.args];
  const jsonIndex = args.lastIndexOf('--json');
  if (jsonIndex >= 0) args.splice(jsonIndex, 0, '--no-model');
  else args.push('--no-model');
  return {
    ...step,
    forcedNoModel: true,
    args,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let report;
  if (options.command === 'install-launchd') report = installLaunchd(options);
  else if (options.command === 'uninstall-launchd') report = uninstallLaunchd(options);
  else if (options.command === 'launchd-status') report = launchdStatus(options);
  else {
    const runs = [];
    let forceNoModel = false;
    for (const step of buildRunPlan(options)) {
      const effectiveStep = forceNoModel && step.id === 'batch-eval' ? forceNoModelForBatchStep(step) : step;
      const runResult = runStep(effectiveStep);
      if (effectiveStep.forcedNoModel) runResult.forcedNoModel = true;
      runs.push(runResult);
      if (step.id === 'model-probe' && !runResult.ok) forceNoModel = true;
    }
    report = scheduleReport(options, runs);
    report.receiptPath = writeReceipt(options, report);
  }
  print(report, options.json);
  if (!report.passed) process.exit(1);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
