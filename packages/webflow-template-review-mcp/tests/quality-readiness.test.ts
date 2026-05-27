import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(import.meta.dirname, '..');
const scorerScript = path.join(packageRoot, 'scripts/score-quality-band-readiness.ts');
const fixtureDir = path.join(packageRoot, 'fixtures/quality-band-readiness');

async function runScorer(args: string[]) {
  return execFileAsync(process.execPath, ['--import', 'tsx', scorerScript, ...args], {
    cwd: packageRoot,
    maxBuffer: 1024 * 1024 * 4,
  });
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'template-review-readiness-test-'));
  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

test('quality readiness scorer emits blocked ledger-ready artifacts for fixture summaries', async () => {
  await withTempDir(async (outDir) => {
    const { stdout } = await runScorer([
      '--subjective-panel-summary',
      path.join(fixtureDir, 'subjective-panel-eval-score-summary.blocked.sample.json'),
      '--rubric-reviewer-summary',
      path.join(fixtureDir, 'rubric-reviewer-score-summary.blocked.sample.json'),
      '--exceptional-lane-summary',
      path.join(fixtureDir, 'exceptional-candidate-score-summary.blocked.sample.json'),
      '--visual-proxy-canary-summary',
      path.join(fixtureDir, 'visual-proxy-canary-summary.blocked.sample.json'),
      '--out',
      outDir,
      '--run-id',
      'quality_readiness_test_blocked',
      '--artifact-base-url',
      'r2://template-review/test-readiness',
    ]);
    const result = JSON.parse(stdout) as { ok: boolean; readiness_level: string; run_id: string };

    assert.equal(result.ok, true);
    assert.equal(result.run_id, 'quality_readiness_test_blocked');
    assert.equal(result.readiness_level, 'creator_guidance_only');

    const summary = await readJson<{
      schema_version: string;
      readiness_level: string;
      input_exclusions: string[];
      promotion_gate: { status: string; reasons: string[] };
    }>(path.join(outDir, 'quality-band-readiness-summary.json'));
    assert.equal(summary.schema_version, 'quality_band_readiness.v0.2');
    assert.equal(summary.readiness_level, 'creator_guidance_only');
    assert.equal(summary.promotion_gate.status, 'blocked');
    assert.deepEqual(summary.input_exclusions, ['popularity', 'sales', 'views', 'favorites', 'marketplace_engagement']);
    assert.ok(summary.promotion_gate.reasons.some((reason) => reason.includes('max_false_approval_risk_rate')));

    const manifest = await readJson<{
      artifacts: Array<{ artifact_type: string; uri: string; redaction: Record<string, unknown> }>;
    }>(path.join(outDir, 'quality-band-readiness-artifact-manifest.json'));
    assert.deepEqual(
      manifest.artifacts.map((artifact) => artifact.artifact_type).sort(),
      [
        'quality_band_readiness_ledger_sql',
        'quality_band_readiness_ledger_summary',
        'quality_band_readiness_summary',
        'quality_band_readiness_summary_markdown',
      ],
    );
    assert.ok(manifest.artifacts.every((artifact) => artifact.uri.startsWith('r2://template-review/test-readiness/')));
    assert.ok(manifest.artifacts.every((artifact) => artifact.redaction.excludes_popularity_sales_views_engagement === true));

    const ledgerSql = await readFile(path.join(outDir, 'quality-band-readiness-ledger-import.sql'), 'utf8');
    assert.match(ledgerSql, /insert into quality_band_readiness_runs/);
    assert.match(ledgerSql, /insert into quality_band_readiness_artifacts/);
    assert.match(ledgerSql, /quality_readiness_test_blocked/);
    assert.match(ledgerSql, /"popularity","sales","views","favorites","marketplace_engagement"/);
  });
});

test('quality readiness scorer blocks promotion when required lane summaries are missing', async () => {
  await withTempDir(async (dir) => {
    const summaryPath = path.join(dir, 'passing-single-lane.json');
    await writeFile(
      summaryPath,
      `${JSON.stringify(
        {
          total_rows: 60,
          scored_output_count: 60,
          false_approval_risk_rate: 0,
          false_rejection_risk_rate: 0,
          missed_exceptional_candidate_rate: 0,
          false_exceptional_rate: 0,
          approved_good_overpromotion_rate: 0,
          provider_failure_rate: 0,
          escalation_rate: 0.2,
          safety_failure_count: 0,
          approved_control_medium_or_high_proxy_rate: 0,
          rejected_visual_any_proxy_signal_rate: 1,
          promotion_gate: { status: 'candidate_for_human_review', reasons: [] },
        },
        null,
        2,
      )}\n`,
    );

    const outDir = path.join(dir, 'out');
    await runScorer(['--subjective-panel-summary', summaryPath, '--out', outDir]);

    const output = await readJson<{
      readiness_level: string;
      promotion_gate: { status: string; reasons: string[] };
    }>(path.join(outDir, 'quality-band-readiness-summary.json'));
    assert.equal(output.readiness_level, 'shadow_only');
    assert.equal(output.promotion_gate.status, 'blocked');
    assert.deepEqual(
      output.promotion_gate.reasons.filter((reason) => reason.startsWith('missing_required_summary ')).sort(),
      [
        'missing_required_summary exceptional_lane',
        'missing_required_summary rubric_reviewer',
        'missing_required_summary visual_proxy_canary',
      ],
    );
  });
});
