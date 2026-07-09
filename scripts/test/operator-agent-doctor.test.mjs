import assert from 'node:assert/strict';
import test from 'node:test';

import { parseArgs, summarizeDoctor } from '../operator-agent-doctor.mjs';

function ok(report) {
  return { ok: true, exitCode: 0, report, stderrTail: [] };
}

function baseChecks(overrides = {}) {
  return {
    readiness: ok({ passed: true, outcome: 'ready' }),
    runtime: ok({
      gateway: { running: true, health: { ok: true } },
      tunnel: { running: true },
    }),
    schedule: ok({
      passed: true,
      outcome: 'launchd-ready',
      jobs: [
        { id: 'fast', loaded: true, validation: { ok: true } },
        { id: 'model', loaded: true, validation: { ok: true } },
      ],
    }),
    accessLocal: ok({ ok: true, nextActions: [] }),
    accessToken: ok({
      ok: false,
      credentials: { tokenProvided: false, source: 'infisical' },
      canListApplications: false,
      appExists: false,
      nextActions: ['provide CLOUDFLARE_ACCESS_API_TOKEN in the environment or Infisical root path before validating Access'],
    }),
    scheduleReceipts: ok({
      ok: true,
      latest: {
        ok: true,
        passed: true,
        modelBacked: false,
        patternScope: 'all',
        scorecard: {
          patternReviewPassed: true,
          patternReviewSource: 'deterministic',
          modelHealth: 'disabled',
          batchEvalWritesPerformed: 0,
        },
      },
      latestModelBacked: {
        ok: true,
        passed: true,
        modelBacked: true,
        scorecard: {
          modelHealth: 'degraded',
          batchEvalWritesPerformed: 0,
        },
      },
      recentModelBacked: [
        {
          ok: true,
          passed: true,
          modelBacked: true,
          scorecard: {
            modelHealth: 'degraded',
            modelProbePassed: false,
            batchEvalForcedNoModel: true,
            batchEvalWritesPerformed: 0,
          },
        },
        {
          ok: true,
          passed: true,
          modelBacked: true,
          scorecard: {
            modelHealth: 'ok',
            modelProbePassed: true,
            batchEvalForcedNoModel: false,
            batchEvalWritesPerformed: 0,
          },
        },
      ],
    }),
    latestModelProbe: ok({
      ok: true,
      targetMode: 'model-probe',
      passed: false,
      outcome: 'model-probe-blocked',
      contractGate: { ok: false, blockers: ['local model endpoint did not complete the strict JSON probe'] },
    }),
    latestModelBenchmark: ok({
      ok: true,
      targetMode: 'model-benchmark',
      passed: false,
      outcome: 'model-benchmark-blocked',
      bestModel: { model: 'gpt-oss:20b', passRate: 0.5, averageLatencyMs: 60095 },
    }),
    modelProbeReceipts: ok({
      ok: true,
      targetMode: 'model-probe',
      recent: [
        {
          ok: true,
          targetMode: 'model-probe',
          passed: false,
          outcome: 'model-probe-blocked',
          latencyMs: 12407,
        },
        {
          ok: true,
          targetMode: 'model-probe',
          passed: true,
          outcome: 'model-probed',
          latencyMs: 44321,
        },
      ],
    }),
    ...overrides,
  };
}

test('operator-agent doctor treats public token gap as non-blocking for local readiness', () => {
  const report = summarizeDoctor(baseChecks(), {});

  assert.equal(report.ok, true);
  assert.equal(report.localReady, true);
  assert.equal(report.publicReady, false);
  assert.equal(report.summary.modelHealth, 'degraded');
  assert.equal(report.summary.modelProbePassed, false);
  assert.equal(report.summary.modelProbePassRate, 0.5);
  assert.equal(report.summary.modelSchedulePassRate, 0.5);
  assert.equal(report.summary.modelAuthority, 'deterministic-primary');
  assert.equal(report.summary.modelBackedAllowed, false);
  assert.equal(report.summary.completionVerdict, 'blocked-external');
  assert.equal(report.evidence.completionAudit.localDeterministicReady, true);
  assert.equal(report.evidence.completionAudit.modelBackedReady, false);
  assert.equal(report.evidence.completionAudit.publicReady, false);
  assert.equal(report.evidence.completionAudit.items.find((item) => item.id === 'public-cloudflare-access').status, 'blocked');
  assert.deepEqual(report.summary.publicBlockers, ['CLOUDFLARE_ACCESS_API_TOKEN cannot list Access applications yet']);
  assert.deepEqual(report.evidence.completionAudit.items.find((item) => item.id === 'public-cloudflare-access').evidence.blockers, [
    'CLOUDFLARE_ACCESS_API_TOKEN cannot list Access applications yet',
  ]);
  assert.equal(report.evidence.completionAudit.items.find((item) => item.id === 'model-backed-authority').evidence.bestBenchmarkPassRate, 0.5);
  assert.match(report.evidence.modelAuthority.reason, /Latest model-probe failed/);
  assert.equal(report.evidence.recentModelHistory.probeWindow, 2);
  assert.equal(report.evidence.recentModelHistory.scheduleWindow, 2);
  assert.deepEqual(report.blockers, []);
  assert.deepEqual(report.publicBlockers, ['CLOUDFLARE_ACCESS_API_TOKEN cannot list Access applications yet']);
  assert.match(report.nextActions.join('\n'), /CLOUDFLARE_ACCESS_API_TOKEN/);
});

test('operator-agent doctor allows bounded model-backed work only after strong recent evidence', () => {
  const report = summarizeDoctor(
    baseChecks({
      scheduleReceipts: ok({
        ok: true,
        latest: {
          ok: true,
          passed: true,
          modelBacked: true,
          scorecard: {
            modelHealth: 'ok',
            batchEvalWritesPerformed: 0,
          },
        },
        latestModelBacked: {
          ok: true,
          passed: true,
          modelBacked: true,
          scorecard: {
            modelHealth: 'ok',
            batchEvalWritesPerformed: 0,
          },
        },
        recentModelBacked: [
          {
            ok: true,
            passed: true,
            modelBacked: true,
            scorecard: { modelHealth: 'ok', batchEvalWritesPerformed: 0 },
          },
          {
            ok: true,
            passed: true,
            modelBacked: true,
            scorecard: { modelHealth: 'ok', batchEvalWritesPerformed: 0 },
          },
        ],
      }),
      latestModelProbe: ok({
        ok: true,
        targetMode: 'model-probe',
        passed: true,
        outcome: 'model-probed',
      }),
      modelProbeReceipts: ok({
        ok: true,
        targetMode: 'model-probe',
        recent: [
          { ok: true, targetMode: 'model-probe', passed: true, outcome: 'model-probed' },
          { ok: true, targetMode: 'model-probe', passed: true, outcome: 'model-probed' },
        ],
      }),
    }),
    {}
  );

  assert.equal(report.summary.modelAuthority, 'model-backed-bounded');
  assert.equal(report.summary.modelBackedAllowed, true);
  assert.equal(report.summary.modelProbePassRate, 1);
  assert.equal(report.summary.modelSchedulePassRate, 1);
  assert.equal(report.summary.completionVerdict, 'blocked-external');
  assert.equal(report.evidence.completionAudit.modelBackedReady, true);
  assert.match(report.evidence.modelAuthority.reason, /bounded reliability threshold/);
});

test('operator-agent doctor marks completion audit complete only when model and public evidence are proven', () => {
  const report = summarizeDoctor(
    baseChecks({
      accessToken: ok({
        ok: true,
        credentials: { tokenProvided: true, source: 'infisical' },
        canListApplications: true,
        appExists: true,
        nextActions: [],
      }),
      accessPublic: ok({ ok: true, nextActions: [] }),
      scheduleReceipts: ok({
        ok: true,
        latest: {
          ok: true,
          passed: true,
          modelBacked: true,
          patternScope: 'all',
          scorecard: {
            patternReviewPassed: true,
            patternReviewSource: 'deterministic',
            modelHealth: 'ok',
            batchEvalWritesPerformed: 0,
          },
        },
        latestModelBacked: {
          ok: true,
          passed: true,
          modelBacked: true,
          scorecard: {
            modelHealth: 'ok',
            batchEvalWritesPerformed: 0,
          },
        },
        recentModelBacked: [
          { ok: true, passed: true, modelBacked: true, scorecard: { modelHealth: 'ok', batchEvalWritesPerformed: 0 } },
          { ok: true, passed: true, modelBacked: true, scorecard: { modelHealth: 'ok', batchEvalWritesPerformed: 0 } },
        ],
      }),
      latestModelProbe: ok({
        ok: true,
        targetMode: 'model-probe',
        passed: true,
        outcome: 'model-probed',
      }),
      modelProbeReceipts: ok({
        ok: true,
        targetMode: 'model-probe',
        recent: [
          { ok: true, targetMode: 'model-probe', passed: true, outcome: 'model-probed' },
          { ok: true, targetMode: 'model-probe', passed: true, outcome: 'model-probed' },
        ],
      }),
    }),
    { public: true }
  );

  assert.equal(report.ok, true);
  assert.equal(report.publicReady, true);
  assert.equal(report.summary.modelAuthority, 'model-backed-bounded');
  assert.equal(report.summary.completionVerdict, 'complete');
  assert.equal(report.evidence.completionAudit.proven, report.evidence.completionAudit.total);
  assert.equal(report.evidence.completionAudit.items.find((item) => item.id === 'public-cloudflare-access').status, 'proven');
});

test('operator-agent doctor can make public readiness strict', () => {
  const report = summarizeDoctor(baseChecks(), { strictPublic: true, public: true });

  assert.equal(report.ok, false);
  assert.equal(report.localReady, true);
  assert.equal(report.publicReady, false);
  assert.match(report.blockers.join('\n'), /CLOUDFLARE_ACCESS_API_TOKEN/);
});

test('operator-agent doctor reports strict model health without hiding local readiness', () => {
  const report = summarizeDoctor(baseChecks(), { strictModel: true });

  assert.equal(report.ok, false);
  assert.equal(report.localReady, true);
  assert.equal(report.summary.modelHealth, 'degraded');
  assert.match(report.blockers.join('\n'), /strict model mode requires ok/);
  assert.match(report.blockers.join('\n'), /model-probe/);
});

test('operator-agent doctor parses public and strict flags', () => {
  assert.deepEqual(parseArgs(['--json', '--strict-public', '--strict-model', '--history-limit', '7']), {
    json: true,
    public: true,
    strictPublic: true,
    strictModel: true,
    historyLimit: 7,
  });
});
