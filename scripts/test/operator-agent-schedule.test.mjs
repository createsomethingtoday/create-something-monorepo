import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  buildRunPlan,
  launchdDefinitions,
  parseArgs,
  plistForJob,
  scheduleReport,
  stableLaunchdPath,
  validateLaunchdPlist,
} from '../operator-agent-schedule.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const scriptPath = path.join(repoRoot, 'scripts/operator-agent-schedule.mjs');

function run(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  });
}

function makeWorkspace() {
  const workspace = mkdtempSync(path.join(tmpdir(), 'operator-agent-schedule-'));
  mkdirSync(path.join(workspace, 'docs/guides'), { recursive: true });
  writeFileSync(
    path.join(workspace, 'AGENTS.md'),
    '# Agent Principles\n\nPolicy is an artifact. Work maps through Database, Automation, and Judgment.\n'
  );
  writeFileSync(path.join(workspace, 'docs/README.md'), '# Docs\n\nUse policy artifacts and receipts as source truth.\n');
  writeFileSync(
    path.join(workspace, 'docs/MCP_FIRST_THESIS.md'),
    '# MCP First Thesis\n\nMCP creation is the control layer for CREATE SOMETHING.\n'
  );
  writeFileSync(
    path.join(workspace, 'docs/THREE_TIER_FRAMEWORK.md'),
    '# Three Tier Framework\n\nDatabase provides resources. Automation provides tools. Judgment provides prompts and policy.\n'
  );
  writeFileSync(
    path.join(workspace, 'docs/guides/OPERATOR_AGENT_SYSTEM.md'),
    '# Operator Agent System\n\nBatch eval measures local executors. Teacher Shadow mode compares local predictions against teacher traces.\n'
  );
  writeFileSync(
    path.join(workspace, 'docs/guides/OPERATOR_AGENT_PUBLIC_ACCESS.md'),
    '# Operator Agent Public Access\n\nCloudflare Access protects the public route. The no-write gateway exposes read-only modes.\n'
  );
  writeFileSync(
    path.join(workspace, 'docs/guides/OPERATOR_AGENT_EXTERNAL_PATTERN_MATRIX.md'),
    '# Operator Agent External Pattern Matrix\n\nOpenHands, SWE-agent, Aider, LangGraph, and Codified Context map into the concrete chain: model -> harness -> sandbox/runtime boundary -> repo context -> tool permissions -> evals/tests -> review gate -> memory/update artifact.\n'
  );
  writeFileSync(path.join(workspace, 'docs/guides/example.md'), '# Example\n\nExisting source fact for grounding.\n');
  return workspace;
}

test('operator-agent schedule parses a deterministic once run', () => {
  const options = parseArgs(['once', '--no-model', '--json', '--eval-limit', '1', '--timeout-ms', '12345']);
  const plan = buildRunPlan(options);

  assert.equal(options.command, 'once');
  assert.equal(options.noModel, true);
  assert.equal(options.json, true);
  assert.equal(options.patternTimeoutMs, 12345);
  assert.equal(options.modelProbeTimeoutMs, 12345);
  assert.equal(options.evalTimeoutMs, 12345);
  assert.equal(plan.length, 3);
  assert.equal(plan[0].id, 'capabilities');
  assert.equal(plan[1].id, 'pattern-review');
  assert.ok(plan[1].args.includes('--pattern-scope'));
  assert.ok(plan[1].args.includes('all'));
  assert.equal(plan[2].id, 'batch-eval');
  assert.ok(plan[2].args.includes('--no-revise'));
});

test('operator-agent schedule rejects an empty launchd job selection', () => {
  assert.throws(
    () => parseArgs(['launchd-status', '--jobs', ',']),
    /--jobs must include at least one of: fast, model/
  );
});

test('operator-agent schedule rejects invalid launchd intervals', () => {
  for (const option of ['--fast-interval-seconds', '--model-interval-seconds']) {
    for (const value of ['not-a-number', '0', '-1']) {
      assert.throws(
        () => parseArgs(['install-launchd', option, value]),
        new RegExp(`${option} must be a positive integer`)
      );
    }
  }
});

test('operator-agent schedule defaults pattern review to deterministic even when batch eval is model-backed', () => {
  const options = parseArgs(['once', '--json', '--eval-limit', '1']);
  const plan = buildRunPlan(options);

  assert.equal(options.noModel, false);
  assert.equal(options.patternNoModel, true);
  assert.equal(plan.length, 4);
  assert.equal(plan[0].id, 'capabilities');
  assert.ok(plan[1].args.includes('--no-model'));
  assert.equal(plan[2].id, 'model-probe');
  assert.ok(plan[2].args.includes('120000'));
  assert.equal(plan[3].args.includes('--no-model'), false);

  const experimentOptions = parseArgs(['once', '--model-pattern-review', '--json', '--eval-limit', '1']);
  const experimentPlan = buildRunPlan(experimentOptions);

  assert.equal(experimentOptions.patternNoModel, false);
  assert.equal(experimentPlan.length, 4);
  assert.equal(experimentPlan[1].args.includes('--no-model'), false);
  assert.equal(experimentPlan[2].id, 'model-probe');
  assert.equal(experimentPlan[3].args.includes('--no-model'), false);
});

test('operator-agent schedule carries a bounded CTX packet into batch eval and its receipt', () => {
  const options = parseArgs(['once', '--eval-limit', '1']);
  const contextPacket = {
    mode: 'ctx-history-packet',
    available: true,
    citations: [{ provider: 'codex', ctxEventId: 'event-a', ctxSessionId: 'session-a' }],
    highlights: ['Prior no-write schedule receipt passed.'],
    modelContext: 'CTX history is advisory. Cited history: codex:event-a.',
  };
  const plan = buildRunPlan(options, contextPacket);
  const batch = plan.find((step) => step.id === 'batch-eval');
  const taskIndex = batch.args.indexOf('--task');

  assert.ok(taskIndex >= 0);
  assert.equal(batch.args[taskIndex + 1], contextPacket.modelContext);

  const report = scheduleReport(options, [], contextPacket);
  assert.deepEqual(report.ctxHistory, {
    mode: 'ctx-history-packet',
    available: true,
    citations: contextPacket.citations,
    highlightCount: 1,
    failure: null,
  });
});

test('operator-agent schedule once writes a single regular-run receipt', () => {
  const workspace = makeWorkspace();
  const outDir = path.join(workspace, '.schedule');
  const result = run(
    'node',
    [scriptPath, 'once', '--no-model', '--out-dir', outDir, '--eval-surface', 'docs/guides', '--eval-limit', '1', '--json'],
    workspace
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.mode, 'schedule-once');
  assert.equal(output.outcome, 'schedule-complete');
  assert.equal(output.passed, true);
  assert.equal(output.modelBacked, false);
  assert.equal(output.runs.length, 3);
  assert.deepEqual(
    output.runs.map((runResult) => [runResult.id, runResult.ok]),
    [
      ['capabilities', true],
      ['pattern-review', true],
      ['batch-eval', true],
    ]
  );
  assert.equal(output.scorecard.capabilityGatePassed, true);
  assert.equal(output.scorecard.patternReviewPassed, true);
  assert.equal(output.scorecard.batchEvalWritesPerformed, 0);
  assert.ok(output.nextRecommendedRun);
  assert.ok(output.receiptPath);
  assert.ok(existsSync(output.receiptPath));

  const receipt = JSON.parse(readFileSync(output.receiptPath, 'utf8'));
  assert.equal(receipt.mode, 'schedule-once');
  assert.equal(receipt.scorecard.batchEvalWritesPerformed, 0);
});

test('operator-agent schedule degrades model health when a model probe needs contract repair', () => {
  const options = parseArgs(['once', '--eval-limit', '1']);
  const report = scheduleReport(options, [
    {
      id: 'capabilities',
      ok: true,
      report: { passed: true, capabilityGate: true, profileId: 'local-readonly', manifestSha256: 'manifest-sha' },
    },
    {
      id: 'pattern-review',
      ok: true,
      report: { passed: true, patternReviewSource: 'deterministic' },
    },
    {
      id: 'model-probe',
      ok: true,
      report: { passed: true, outcome: 'model-probe-repaired', latencyMs: 44321, reliability: 'repaired' },
    },
    {
      id: 'batch-eval',
      ok: true,
      report: {
        passed: true,
        scorecard: { candidatesProposed: 1, modelScoutOk: true, writesPerformed: 0 },
      },
    },
  ]);

  assert.equal(report.scorecard.capabilityGatePassed, true);
  assert.equal(report.scorecard.modelProbeReliability, 'repaired');
  assert.equal(report.scorecard.modelHealth, 'degraded');
  assert.match(report.scorecard.modelIssues.join('\n'), /retry\/repair/);
});

test('operator-agent schedule marks model health degraded when model-backed scout falls back', () => {
  const options = parseArgs(['once', '--eval-limit', '1']);
  const report = scheduleReport(options, [
    {
      id: 'pattern-review',
      ok: true,
      report: {
        passed: true,
        patternReviewSource: 'deterministic',
      },
    },
    {
      id: 'model-probe',
      ok: true,
      report: {
        passed: true,
        outcome: 'model-probed',
        latencyMs: 44321,
      },
    },
    {
      id: 'batch-eval',
      ok: true,
      report: {
        passed: true,
        scorecard: {
          candidatesProposed: 1,
          modelScoutOk: false,
          modelParseFailures: 1,
          writesPerformed: 0,
          initialWritesAllowed: 1,
          postRevisionWritesAllowed: 0,
        },
      },
    },
  ]);

  assert.equal(report.passed, true);
  assert.equal(report.modelBacked, true);
  assert.equal(report.patternModelBacked, false);
  assert.equal(report.scorecard.modelProbePassed, true);
  assert.equal(report.scorecard.modelProbeLatencyMs, 44321);
  assert.equal(report.scorecard.modelHealth, 'degraded');
  assert.match(report.scorecard.modelIssues.join('\n'), /model scout failed/);
});

test('operator-agent schedule degrades model health when model-probe fails and batch eval is forced deterministic', () => {
  const options = parseArgs(['once', '--eval-limit', '1']);
  const report = scheduleReport(options, [
    {
      id: 'pattern-review',
      ok: true,
      report: {
        passed: true,
        patternReviewSource: 'deterministic',
      },
    },
    {
      id: 'model-probe',
      ok: false,
      report: {
        passed: false,
        outcome: 'model-probe-blocked',
        blockers: ['local model endpoint did not complete the strict JSON probe'],
      },
    },
    {
      id: 'batch-eval',
      ok: true,
      forcedNoModel: true,
      report: {
        passed: true,
        scorecard: {
          candidatesProposed: 1,
          writesPerformed: 0,
          initialWritesAllowed: 1,
          postRevisionWritesAllowed: 0,
        },
      },
    },
  ]);

  assert.equal(report.passed, true);
  assert.equal(report.outcome, 'schedule-complete');
  assert.equal(report.scorecard.modelProbePassed, false);
  assert.equal(report.scorecard.batchEvalForcedNoModel, true);
  assert.equal(report.scorecard.modelHealth, 'degraded');
  assert.match(report.scorecard.modelIssues.join('\n'), /model-probe failed/);
  assert.match(report.scorecard.modelIssues.join('\n'), /forced deterministic/);
});

test('operator-agent schedule renders launchd jobs for fast and model heartbeats', () => {
  const workspace = makeWorkspace();
  const options = parseArgs([
    'install-launchd',
    '--repo-root',
    workspace,
    '--launch-agent-dir',
    path.join(workspace, 'LaunchAgents'),
    '--run-at-load',
  ]);
  const jobs = launchdDefinitions(options);

  assert.equal(jobs.length, 2);
  assert.deepEqual(
    jobs.map((job) => [job.id, job.label, job.intervalSeconds]),
    [
      ['fast', 'agency.createsomething.operator-agent.fast', 3600],
      ['model', 'agency.createsomething.operator-agent.model', 21600],
    ]
  );
  assert.ok(jobs[0].programArguments.includes('--no-model'));
  assert.ok(jobs[1].programArguments.includes('--eval-limit'));
  assert.ok(jobs[0].programArguments.some((entry) => entry.endsWith('operator-agent-schedule.mjs')));
  assert.ok(!jobs[0].programArguments.some((entry) => entry.endsWith('operator-agent-system.mjs')));
  assert.doesNotMatch(jobs[0].pathEnv, /\.codex\/tmp/);
  assert.match(jobs[0].pathEnv, /\/opt\/homebrew\/bin/);
  assert.match(jobs[0].pathEnv, /\/usr\/bin/);

  const plist = plistForJob(jobs[0], options);
  assert.match(plist, /<key>Label<\/key>/);
  assert.match(plist, /agency\.createsomething\.operator-agent\.fast/);
  assert.match(plist, /<key>StartInterval<\/key>\n    <integer>3600<\/integer>/);
  assert.match(plist, /<key>WorkingDirectory<\/key>/);
  assert.match(plist, /<key>EnvironmentVariables<\/key>/);
  assert.match(plist, /<key>HOME<\/key>/);
  assert.match(plist, /<key>NO_COLOR<\/key>/);
  const validation = validateLaunchdPlist(plist, jobs[0]);
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.issues, []);
});

test('operator-agent schedule validates StartInterval as a positive plist integer', () => {
  const workspace = makeWorkspace();
  const options = parseArgs(['install-launchd', '--repo-root', workspace, '--jobs', 'model']);
  const [job] = launchdDefinitions(options);
  const plist = plistForJob(job, options);
  const wrongType = plist.replace(
    `<integer>${job.intervalSeconds}</integer>`,
    `<string>${job.intervalSeconds}</string>`
  );

  const wrongTypeValidation = validateLaunchdPlist(wrongType, job);
  assert.equal(wrongTypeValidation.ok, false);
  assert.match(wrongTypeValidation.issues.join('\n'), /StartInterval must be a positive integer/);

  const nonPositiveJob = { ...job, intervalSeconds: 0 };
  const nonPositiveValidation = validateLaunchdPlist(plistForJob(nonPositiveJob, options), nonPositiveJob);
  assert.equal(nonPositiveValidation.ok, false);
  assert.match(nonPositiveValidation.issues.join('\n'), /StartInterval must be a positive integer/);
});

test('operator-agent schedule rejects stale launchd plists that call the system script directly', () => {
  const workspace = makeWorkspace();
  const options = parseArgs(['install-launchd', '--repo-root', workspace]);
  const [job] = launchdDefinitions(options);
  const stalePlist = plistForJob(
    {
      ...job,
      programArguments: job.programArguments.map((entry) =>
        entry.endsWith('operator-agent-schedule.mjs') ? entry.replace('operator-agent-schedule.mjs', 'operator-agent-system.mjs') : entry
      ),
    },
    options
  );

  const validation = validateLaunchdPlist(stalePlist, job);
  assert.equal(validation.ok, false);
  assert.match(validation.issues.join('\n'), /schedule script/);
});

test('operator-agent schedule launchd path is stable and does not inherit transient Codex paths', () => {
  const stable = stableLaunchdPath('/tmp/transient/.codex/tmp/bin:/opt/homebrew/bin:/usr/bin', '/Users/test/.nvm/versions/node/v22.21.1/bin/node');

  assert.doesNotMatch(stable, /\.codex\/tmp/);
  assert.match(stable, /\/Users\/test\/.nvm\/versions\/node\/v22\.21\.1\/bin/);
  assert.match(stable, /\/opt\/homebrew\/bin/);
  assert.match(stable, /\/usr\/bin/);
});
