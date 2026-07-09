#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SCRIPT_DIR = import.meta.dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const SYSTEM_SCRIPT = path.join(SCRIPT_DIR, 'operator-agent-system.mjs');
const RUNTIME_SCRIPT = path.join(SCRIPT_DIR, 'operator-agent-runtime.mjs');
const SCHEDULE_SCRIPT = path.join(SCRIPT_DIR, 'operator-agent-schedule.mjs');
const ACCESS_SCRIPT = path.join(SCRIPT_DIR, 'operator-agent-cloudflare-access.mjs');
const SCHEDULE_RECEIPT_DIR = path.join(REPO_ROOT, '.cache/operator-agent-schedule');
const SYSTEM_RECEIPT_DIR = path.join(REPO_ROOT, '.cache/operator-agent-system');

export function parseArgs(argv) {
  const options = {
    json: false,
    public: false,
    strictPublic: false,
    strictModel: false,
    historyLimit: 5,
  };
  const args = [...argv];
  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--') continue;
    if (arg === '--json') options.json = true;
    else if (arg === '--public') options.public = true;
    else if (arg === '--strict-public') {
      options.strictPublic = true;
      options.public = true;
    } else if (arg === '--strict-model') options.strictModel = true;
    else if (arg === '--history-limit') {
      const value = Number(args.shift());
      if (!Number.isInteger(value) || value < 1 || value > 20) {
        throw new Error('--history-limit must be an integer between 1 and 20');
      }
      options.historyLimit = value;
    }
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  return options;
}

function extractJson(text) {
  const start = text.indexOf('{');
  const fallbackEnd = text.lastIndexOf('}');
  if (start < 0 || fallbackEnd <= start) return null;
  try {
    return JSON.parse(text.slice(start, fallbackEnd + 1));
  } catch {
    return null;
  }
}

function runNodeScript(script, args, timeout = 120_000) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout,
    maxBuffer: 1024 * 1024 * 30,
    env: { ...process.env, NO_COLOR: '1' },
  });
  return {
    ok: result.status === 0,
    exitCode: result.status,
    signal: result.signal,
    report: extractJson(result.stdout || ''),
    stderrTail: (result.stderr || '').trim().split(/\r?\n/).filter(Boolean).slice(-6),
  };
}

function summarizeReceipt(receiptPath, receipt) {
  return {
    ok: true,
    mode: 'latest-schedule-receipt',
    receiptPath: path.relative(REPO_ROOT, receiptPath),
    generatedAt: receipt.generatedAt,
    passed: receipt.passed,
    outcome: receipt.outcome,
    modelBacked: receipt.modelBacked,
    patternModelBacked: receipt.patternModelBacked,
    patternScope: receipt.patternScope,
    scorecard: receipt.scorecard,
    nextDecision: receipt.nextDecision,
    nextRecommendedRun: receipt.nextRecommendedRun,
  };
}

export function readScheduleReceipts(receiptDir = SCHEDULE_RECEIPT_DIR, limit = 5) {
  if (!existsSync(receiptDir)) {
    return {
      ok: false,
      mode: 'schedule-receipts',
      error: 'schedule receipt directory is missing',
    };
  }
  const files = readdirSync(receiptDir)
    .filter((file) => file.endsWith('schedule-once-local.json'))
    .sort()
    .reverse();
  if (files.length === 0) {
    return {
      ok: false,
      mode: 'schedule-receipts',
      error: 'no schedule-once receipt exists',
    };
  }
  const receipts = files.map((file) => {
    const receiptPath = path.join(receiptDir, file);
    return summarizeReceipt(receiptPath, JSON.parse(readFileSync(receiptPath, 'utf8')));
  });
  const latest = receipts[0];
  const latestModelBacked = receipts.find((receipt) => receipt.modelBacked);
  return {
    ok: true,
    mode: 'schedule-receipts',
    latest,
    latestModelBacked: latestModelBacked ?? null,
    recent: receipts.slice(0, limit),
    recentModelBacked: receipts.filter((receipt) => receipt.modelBacked).slice(0, limit),
  };
}

function summarizeSystemReceipt(receiptPath, receipt, mode) {
  return {
    ok: true,
    mode: 'latest-system-receipt',
    targetMode: mode,
    receiptPath: path.relative(REPO_ROOT, receiptPath),
    generatedAt: receipt.generatedAt,
    passed: receipt.passed,
    outcome: receipt.outcome,
    model: receipt.model,
    baseUrl: receipt.baseUrl,
    timeoutMs: receipt.timeoutMs,
    latencyMs: receipt.latencyMs,
    attemptsPerModel: receipt.attemptsPerModel,
    minPassRate: receipt.minPassRate,
    bestModel: receipt.bestModel,
    models: receipt.models?.map((model) => ({
      model: model.model,
      passedCount: model.passedCount,
      failedCount: model.failedCount,
      passRate: model.passRate,
      averageLatencyMs: model.averageLatencyMs,
      maxLatencyMs: model.maxLatencyMs,
    })),
    contractGate: receipt.contractGate,
    nextDecision: receipt.nextDecision,
  };
}

export function readSystemReceipts(mode, receiptDir = SYSTEM_RECEIPT_DIR, limit = 5) {
  if (!existsSync(receiptDir)) {
    return {
      ok: false,
      mode: 'system-receipts',
      targetMode: mode,
      error: 'system receipt directory is missing',
    };
  }
  const receipts = readdirSync(receiptDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .reverse();
  const matching = [];
  for (const file of receipts) {
    const receiptPath = path.join(receiptDir, file);
    let receipt;
    try {
      receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
    } catch {
      continue;
    }
    if (receipt?.mode !== mode) continue;
    matching.push(summarizeSystemReceipt(receiptPath, receipt, mode));
    if (matching.length >= limit) break;
  }
  if (matching.length > 0) {
    return {
      ok: true,
      mode: 'system-receipts',
      targetMode: mode,
      latest: matching[0],
      recent: matching,
    };
  }
  return {
    ok: false,
    mode: 'system-receipts',
    targetMode: mode,
    error: `no ${mode} receipt exists`,
  };
}

export function readLatestSystemReceipt(mode, receiptDir = SYSTEM_RECEIPT_DIR) {
  const receipts = readSystemReceipts(mode, receiptDir, 1);
  return receipts.ok ? receipts.latest : { ...receipts, mode: 'latest-system-receipt' };
}

function summarizeRecentModelHistory(scheduleReceipts, modelProbeReceipts) {
  const modelBacked = (Array.isArray(scheduleReceipts?.recentModelBacked) ? scheduleReceipts.recentModelBacked : [])
    .filter((receipt) => ['ok', 'degraded', 'disabled'].includes(receipt.scorecard?.modelHealth));
  const probes = Array.isArray(modelProbeReceipts?.recent) ? modelProbeReceipts.recent : [];
  const passedModelBacked = modelBacked.filter((receipt) => receipt.scorecard?.modelHealth === 'ok').length;
  const passedProbes = probes.filter((receipt) => receipt.passed).length;
  return {
    scheduleWindow: modelBacked.length,
    scheduleOkCount: passedModelBacked,
    scheduleDegradedCount: modelBacked.filter((receipt) => receipt.scorecard?.modelHealth === 'degraded').length,
    schedulePassRate: modelBacked.length > 0 ? passedModelBacked / modelBacked.length : null,
    probeWindow: probes.length,
    probePassCount: passedProbes,
    probeFailCount: probes.filter((receipt) => receipt.passed === false).length,
    probePassRate: probes.length > 0 ? passedProbes / probes.length : null,
    recentProbeOutcomes: probes.map((receipt) => ({
      generatedAt: receipt.generatedAt,
      passed: receipt.passed,
      outcome: receipt.outcome,
      latencyMs: receipt.latencyMs ?? null,
    })),
    recentScheduleOutcomes: modelBacked.map((receipt) => ({
      generatedAt: receipt.generatedAt,
      modelHealth: receipt.scorecard?.modelHealth ?? null,
      modelProbePassed: receipt.scorecard?.modelProbePassed ?? null,
      batchEvalForcedNoModel: receipt.scorecard?.batchEvalForcedNoModel ?? null,
    })),
  };
}

function recommendModelAuthority({ modelHealth, modelProbePassed, recentModelHistory, latestModelBenchmark }) {
  const probePassRate = recentModelHistory.probePassRate;
  const schedulePassRate = recentModelHistory.schedulePassRate;
  const benchmarkPassed = Boolean(latestModelBenchmark?.ok && latestModelBenchmark.passed);
  const benchmarkModel = latestModelBenchmark?.bestModel?.model;
  const benchmarkPassRate = latestModelBenchmark?.bestModel?.passRate;
  if (recentModelHistory.probeWindow === 0 && !benchmarkPassed) {
    return {
      level: 'probe-required',
      modelBackedAllowed: false,
      reason: 'No model-probe receipts exist yet.',
      nextAction: 'run pnpm operator-agent:model-benchmark -- --attempts 3 --timeout-ms 120000 --json',
    };
  }
  if (!modelProbePassed && !benchmarkPassed) {
    return {
      level: 'deterministic-primary',
      modelBackedAllowed: false,
      reason: 'Latest model-probe failed; use deterministic receipts until the probe passes again.',
      nextAction: 'run pnpm operator-agent:model-benchmark -- --attempts 3 --timeout-ms 120000 --json',
    };
  }
  if (!benchmarkPassed && probePassRate !== null && probePassRate < 0.8) {
    return {
      level: 'probe-first-bounded',
      modelBackedAllowed: false,
      reason: `Recent model-probe pass rate is ${Math.round(probePassRate * 100)}%, below the 80% threshold.`,
      nextAction: 'run pnpm operator-agent:model-benchmark -- --attempts 3 --timeout-ms 120000 --json',
    };
  }
  if (schedulePassRate !== null && schedulePassRate < 0.8) {
    return {
      level: 'probe-first-bounded',
      modelBackedAllowed: false,
      reason: benchmarkPassed
        ? `Benchmark passed for ${benchmarkModel} at ${Math.round(benchmarkPassRate * 100)}%, but recent model-backed schedule pass rate is ${Math.round(schedulePassRate * 100)}%.`
        : `Recent model-backed schedule pass rate is ${Math.round(schedulePassRate * 100)}%, below the 80% threshold.`,
      nextAction: 'run pnpm operator-agent:schedule:once -- --eval-limit 1 --json with the benchmarked model',
    };
  }
  if (modelHealth === 'ok') {
    return {
      level: 'model-backed-bounded',
      modelBackedAllowed: true,
      reason: 'Latest probe passed and recent model-backed receipts meet the bounded reliability threshold.',
      nextAction: 'allow bounded model-backed batch-eval while keeping patch/revise gated',
    };
  }
  return {
    level: 'probe-first-bounded',
    modelBackedAllowed: false,
    reason: benchmarkPassed
      ? `Benchmark passed for ${benchmarkModel}, but latest model health is ${modelHealth}; schedule evidence is still required.`
      : `Latest model health is ${modelHealth}; keep model use behind a fresh probe.`,
    nextAction: benchmarkPassed
      ? 'run pnpm operator-agent:schedule:once -- --eval-limit 1 --json with the benchmarked model'
      : 'continue deterministic heartbeat and require fresh benchmark before model-backed experiments',
  };
}

function auditItem({ id, tier, requirement, status, evidence, nextAction }) {
  return {
    id,
    tier,
    requirement,
    status,
    evidence,
    nextAction,
  };
}

function buildCompletionAudit({
  gatewayReady,
  tunnelRunning,
  scheduleReady,
  localAccessReady,
  latestReceiptReady,
  noWrites,
  tokenReady,
  publicReady,
  publicChecked,
  publicBlockers,
  latestReceipt,
  latestModelProbe,
  latestModelBenchmark,
  recentModelHistory,
  modelAuthority,
}) {
  const patternReviewReady = Boolean(
    latestReceipt?.passed &&
      latestReceipt?.patternScope === 'all' &&
      latestReceipt?.scorecard?.patternReviewPassed &&
      latestReceipt?.scorecard?.patternReviewSource === 'deterministic'
  );
  const localDeterministicReady = Boolean(
    gatewayReady && scheduleReady && localAccessReady && latestReceiptReady && noWrites && patternReviewReady
  );
  const modelReady = Boolean(modelAuthority.modelBackedAllowed);
  const publicStatus = publicReady ? 'proven' : tokenReady ? 'incomplete' : 'blocked';
  const items = [
    auditItem({
      id: 'local-runtime',
      tier: 'Automation',
      requirement: 'Local operator-agent gateway, tunnel status, and local access preflight are healthy.',
      status: gatewayReady && tunnelRunning && localAccessReady ? 'proven' : 'incomplete',
      evidence: {
        gatewayReady,
        tunnelRunning,
        localAccessReady,
      },
      nextAction: gatewayReady && localAccessReady ? null : 'run pnpm operator-agent:runtime:start',
    }),
    auditItem({
      id: 'regular-heartbeat',
      tier: 'Automation',
      requirement: 'Launchd heartbeat is installed and has a passing no-write schedule receipt.',
      status: scheduleReady && latestReceiptReady && noWrites ? 'proven' : 'incomplete',
      evidence: {
        scheduleReady,
        latestReceiptReady,
        writesPerformed: latestReceipt?.scorecard?.batchEvalWritesPerformed ?? null,
        latestReceiptPath: latestReceipt?.receiptPath ?? null,
      },
      nextAction: scheduleReady ? 'run pnpm operator-agent:schedule:once -- --json' : 'run pnpm operator-agent:schedule:install -- --load',
    }),
    auditItem({
      id: 'all-scope-pattern-review',
      tier: 'Judgment',
      requirement: 'Pattern review runs repo-wide in all scope and stays deterministic by default.',
      status: patternReviewReady ? 'proven' : 'incomplete',
      evidence: {
        patternScope: latestReceipt?.patternScope ?? null,
        patternReviewPassed: latestReceipt?.scorecard?.patternReviewPassed ?? null,
        patternReviewSource: latestReceipt?.scorecard?.patternReviewSource ?? null,
      },
      nextAction: 'run pnpm operator-agent:pattern-review -- --no-model --pattern-scope all --json',
    }),
    auditItem({
      id: 'model-backed-authority',
      tier: 'Judgment',
      requirement: 'Local model-backed work is allowed only after strict JSON probe and recent schedule reliability meet threshold.',
      status: modelReady ? 'proven' : 'incomplete',
      evidence: {
        modelAuthority: modelAuthority.level,
        modelBackedAllowed: modelAuthority.modelBackedAllowed,
        latestProbePassed: latestModelProbe?.passed ?? null,
        latestBenchmarkPassed: latestModelBenchmark?.passed ?? null,
        bestBenchmarkModel: latestModelBenchmark?.bestModel?.model ?? null,
        bestBenchmarkPassRate: latestModelBenchmark?.bestModel?.passRate ?? null,
        probePassRate: recentModelHistory.probePassRate,
        schedulePassRate: recentModelHistory.schedulePassRate,
      },
      nextAction: modelAuthority.nextAction,
    }),
    auditItem({
      id: 'public-cloudflare-access',
      tier: 'Automation',
      requirement: 'Public access is protected by Cloudflare Access and validated with a dedicated Access token.',
      status: publicStatus,
      evidence: {
        tokenReady,
        publicChecked,
        publicReady,
        blockers: publicBlockers,
      },
      nextAction: tokenReady
        ? 'run pnpm operator-agent:access:preflight:public -- --json'
        : 'store CLOUDFLARE_ACCESS_API_TOKEN with Access Apps and Policies permission in Infisical root path',
    }),
    auditItem({
      id: 'primary-run-posture',
      tier: 'mixed',
      requirement: 'The device can be treated as a primary regular-run lane without granting unsafe autonomous writes.',
      status: localDeterministicReady ? 'proven' : 'incomplete',
      evidence: {
        localDeterministicReady,
        modelBackedAllowed: modelAuthority.modelBackedAllowed,
        publicReady,
        noWrites,
      },
      nextAction: localDeterministicReady
        ? 'continue deterministic schedule and promote model-backed authority only after model reliability improves'
        : 'repair local runtime, schedule, or pattern-review blockers before widening authority',
    }),
  ];
  const proven = items.filter((item) => item.status === 'proven').length;
  const blocked = items.filter((item) => item.status === 'blocked');
  const incomplete = items.filter((item) => item.status === 'incomplete');
  return {
    verdict:
      blocked.length > 0
        ? 'blocked-external'
        : incomplete.length > 0
          ? 'incomplete'
          : modelReady && publicReady
            ? 'complete'
            : 'local-deterministic-ready',
    proven,
    total: items.length,
    localDeterministicReady,
    modelBackedReady: modelReady,
    publicReady,
    items,
    nextBestStep: blocked[0]?.nextAction ?? incomplete[0]?.nextAction ?? modelAuthority.nextAction,
  };
}

function runChecks(options) {
  const checks = {
    readiness: runNodeScript(SYSTEM_SCRIPT, ['readiness', '--json']),
    runtime: runNodeScript(RUNTIME_SCRIPT, ['status', '--json']),
    schedule: runNodeScript(SCHEDULE_SCRIPT, ['launchd-status', '--json']),
    accessLocal: runNodeScript(ACCESS_SCRIPT, ['preflight', '--json']),
    accessToken: runNodeScript(ACCESS_SCRIPT, ['token-check', '--json']),
    scheduleReceipts: { ok: true, exitCode: 0, report: readScheduleReceipts(SCHEDULE_RECEIPT_DIR, options.historyLimit) },
    latestModelProbe: { ok: true, exitCode: 0, report: readLatestSystemReceipt('model-probe') },
    latestModelBenchmark: { ok: true, exitCode: 0, report: readLatestSystemReceipt('model-benchmark') },
    modelProbeReceipts: { ok: true, exitCode: 0, report: readSystemReceipts('model-probe', SYSTEM_RECEIPT_DIR, options.historyLimit) },
  };
  if (options.public) {
    checks.accessPublic = runNodeScript(ACCESS_SCRIPT, ['preflight', '--public', '--json']);
  }
  return checks;
}

function checkPassed(check) {
  return Boolean(check?.ok && check.report);
}

export function summarizeDoctor(checks, options = {}) {
  const runtimeReport = checks.runtime?.report;
  const scheduleReport = checks.schedule?.report;
  const localAccessReport = checks.accessLocal?.report;
  const tokenReport = checks.accessToken?.report;
  const publicAccessReport = checks.accessPublic?.report;
  const scheduleReceipts = checks.scheduleReceipts?.report;
  const latestReceipt = scheduleReceipts?.latest;
  const latestModelReceipt = scheduleReceipts?.latestModelBacked;
  const latestModelProbe = checks.latestModelProbe?.report;
  const latestModelBenchmark = checks.latestModelBenchmark?.report;
  const modelProbeReceipts = checks.modelProbeReceipts?.report;
  const recentModelHistory = summarizeRecentModelHistory(scheduleReceipts, modelProbeReceipts);
  const modelReceipt = latestModelReceipt ?? latestReceipt;
  const scorecard = latestReceipt?.scorecard ?? {};
  const modelScorecard = modelReceipt?.scorecard ?? {};

  const gatewayReady = Boolean(runtimeReport?.gateway?.running && runtimeReport.gateway.health?.ok);
  const tunnelRunning = Boolean(runtimeReport?.tunnel?.running);
  const scheduleReady = Boolean(scheduleReport?.passed || scheduleReport?.outcome === 'launchd-ready');
  const localAccessReady = Boolean(localAccessReport?.ok);
  const latestReceiptReady = Boolean(scheduleReceipts?.ok && latestReceipt?.passed);
  const noWrites = Number(scorecard.batchEvalWritesPerformed ?? 0) === 0;
  const tokenReady = Boolean(tokenReport?.ok && tokenReport.canListApplications);
  const publicReady = Boolean(publicAccessReport?.ok && tokenReady);
  const modelHealth = modelScorecard.modelHealth ?? 'unknown';
  const modelAcceptable = ['ok', 'degraded', 'disabled'].includes(modelHealth);
  const modelProbePassed = Boolean(latestModelProbe?.ok && latestModelProbe.passed);
  const modelAuthority = recommendModelAuthority({ modelHealth, modelProbePassed, recentModelHistory, latestModelBenchmark });
  const publicBlockers = [];
  if (!tokenReady) publicBlockers.push('CLOUDFLARE_ACCESS_API_TOKEN cannot list Access applications yet');
  if (options.public && !publicAccessReport?.ok) publicBlockers.push('public Cloudflare Access preflight failed');

  const completionAudit = buildCompletionAudit({
    gatewayReady,
    tunnelRunning,
    scheduleReady,
    localAccessReady,
    latestReceiptReady,
    noWrites,
    tokenReady,
    publicReady,
    publicChecked: Boolean(options.public),
    publicBlockers,
    latestReceipt,
    latestModelProbe,
    latestModelBenchmark,
    recentModelHistory,
    modelAuthority,
  });

  const localBlockers = [];
  if (!checkPassed(checks.readiness) || checks.readiness.report?.passed === false) localBlockers.push('operator-agent readiness failed');
  if (!gatewayReady) localBlockers.push('local gateway is not running or health check failed');
  if (!scheduleReady) localBlockers.push('launchd schedule is not ready');
  if (!localAccessReady) localBlockers.push('local access preflight failed');
  if (!latestReceiptReady) localBlockers.push('no passing schedule receipt is available');
  if (!noWrites) localBlockers.push('regular schedule receipt recorded writes');

  const blockers = [...localBlockers];
  if (options.strictModel && modelHealth !== 'ok') blockers.push(`model health is ${modelHealth}; strict model mode requires ok`);
  if (options.strictModel && !modelProbePassed) blockers.push('latest model-probe receipt is missing or failed');

  if (options.strictPublic && publicBlockers.length > 0) blockers.push(...publicBlockers);

  const nextActions = [];
  if (!gatewayReady) nextActions.push('run pnpm operator-agent:runtime:start-gateway');
  if (!tunnelRunning) nextActions.push('run pnpm operator-agent:runtime:start-tunnel when public access is needed');
  if (!scheduleReady) nextActions.push('run pnpm operator-agent:schedule:install -- --load');
  if (!latestReceiptReady) nextActions.push('run pnpm operator-agent:schedule:once -- --json');
  if (!tokenReady) nextActions.push('store CLOUDFLARE_ACCESS_API_TOKEN with Access Apps and Policies permission in Infisical root path');
  if (tokenReady && !publicReady) nextActions.push('run pnpm operator-agent:access:preflight:public -- --json before routing DNS');
  if (options.strictModel && modelHealth !== 'ok') nextActions.push('keep model authority bounded until repeated receipts show modelHealth ok');
  if (latestModelProbe?.ok && latestModelProbe.passed === false) {
    nextActions.push('run pnpm operator-agent:model-benchmark -- --attempts 3 --timeout-ms 120000 --json');
  }
  if (modelAuthority.nextAction && !nextActions.includes(modelAuthority.nextAction)) {
    nextActions.push(modelAuthority.nextAction);
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: 'doctor',
    ok: blockers.length === 0,
    localReady: localBlockers.length === 0,
    publicReady,
    strictPublic: Boolean(options.strictPublic),
    strictModel: Boolean(options.strictModel),
    status: blockers.length === 0 ? 'ready' : 'needs-attention',
    summary: {
      gatewayReady,
      tunnelRunning,
      scheduleReady,
      localAccessReady,
      latestReceiptReady,
      noWrites,
      modelHealth,
      modelAcceptable,
      modelProbePassed,
      modelProbePassRate: recentModelHistory.probePassRate,
      modelSchedulePassRate: recentModelHistory.schedulePassRate,
      modelAuthority: modelAuthority.level,
      modelBackedAllowed: modelAuthority.modelBackedAllowed,
      tokenReady,
      publicChecked: Boolean(options.public),
      publicBlockers,
      completionVerdict: completionAudit.verdict,
    },
    blockers,
    publicBlockers,
    nextActions,
    evidence: {
      readiness: checks.readiness?.report
        ? { passed: checks.readiness.report.passed, outcome: checks.readiness.report.outcome }
        : { ok: false, exitCode: checks.readiness?.exitCode, stderrTail: checks.readiness?.stderrTail },
      runtime: runtimeReport
        ? {
            gateway: { running: runtimeReport.gateway?.running, healthOk: runtimeReport.gateway?.health?.ok },
            tunnel: { running: runtimeReport.tunnel?.running },
          }
        : { ok: false, exitCode: checks.runtime?.exitCode, stderrTail: checks.runtime?.stderrTail },
      schedule: scheduleReport
        ? {
            passed: scheduleReport.passed,
            outcome: scheduleReport.outcome,
            jobs: scheduleReport.jobs?.map((job) => ({ id: job.id, loaded: job.loaded, validationOk: job.validation?.ok })),
          }
        : { ok: false, exitCode: checks.schedule?.exitCode, stderrTail: checks.schedule?.stderrTail },
      accessLocal: localAccessReport
        ? { ok: localAccessReport.ok, nextActions: localAccessReport.nextActions }
        : { ok: false, exitCode: checks.accessLocal?.exitCode, stderrTail: checks.accessLocal?.stderrTail },
      accessToken: tokenReport
        ? {
            ok: tokenReport.ok,
            tokenProvided: tokenReport.credentials?.tokenProvided,
            tokenSource: tokenReport.credentials?.source,
            canListApplications: tokenReport.canListApplications,
            appExists: tokenReport.appExists,
            nextActions: tokenReport.nextActions,
          }
        : { ok: false, exitCode: checks.accessToken?.exitCode, stderrTail: checks.accessToken?.stderrTail },
      accessPublic: options.public
        ? publicAccessReport
          ? { ok: publicAccessReport.ok, nextActions: publicAccessReport.nextActions }
          : { ok: false, exitCode: checks.accessPublic?.exitCode, stderrTail: checks.accessPublic?.stderrTail }
        : undefined,
      latestReceipt,
      latestModelReceipt,
      latestModelProbe,
      latestModelBenchmark,
      modelAuthority,
      recentModelHistory,
      completionAudit,
    },
  };
}

function print(report, asJson) {
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log('# operator-agent doctor');
  console.log(`Local ready: ${report.localReady ? 'yes' : 'no'}`);
  console.log(`Public ready: ${report.publicReady ? 'yes' : 'no'}`);
  console.log(`Model health: ${report.summary.modelHealth}`);
  console.log(`Completion verdict: ${report.summary.completionVerdict}`);
  if (report.blockers.length > 0) {
    console.log('Blockers:');
    for (const blocker of report.blockers) console.log(`- ${blocker}`);
  }
  if (report.publicBlockers.length > 0) {
    console.log('Public blockers:');
    for (const blocker of report.publicBlockers) console.log(`- ${blocker}`);
  }
  if (report.nextActions.length > 0) {
    console.log('Next actions:');
    for (const action of report.nextActions) console.log(`- ${action}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const checks = runChecks(options);
  const report = summarizeDoctor(checks, options);
  print(report, options.json);
  process.exitCode = report.ok ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
