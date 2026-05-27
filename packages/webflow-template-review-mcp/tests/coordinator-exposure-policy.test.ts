import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(import.meta.dirname, '..');
const readinessScript = path.join(packageRoot, 'scripts/score-quality-band-readiness.ts');
const exposurePolicyScript = path.join(packageRoot, 'scripts/derive-coordinator-exposure-policy.ts');
const contractSmokeScript = path.join(packageRoot, 'scripts/run-coordinator-contract-smoke.ts');
const fixtureDir = path.join(packageRoot, 'fixtures/quality-band-readiness');

async function runScript(script: string, args: string[]) {
  return execFileAsync(process.execPath, ['--import', 'tsx', script, ...args], {
    cwd: packageRoot,
    maxBuffer: 1024 * 1024 * 4,
  });
}

async function runScriptExpectingExitCode(script: string, args: string[], expectedCode: number) {
  try {
    const result = await runScript(script, args);
    assert.fail(`Expected exit code ${expectedCode}, got success: ${result.stdout}`);
  } catch (error) {
    const actual = error as { code?: number; stdout?: string; stderr?: string };
    assert.equal(actual.code, expectedCode, actual.stderr);
    return actual;
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'template-review-coordinator-policy-test-'));
  try {
    return await callback(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

test('coordinator exposure policy allows creator guidance but blocks final decisions', async () => {
  await withTempDir(async (dir) => {
    const readinessOut = path.join(dir, 'readiness');
    const policyOut = path.join(dir, 'policy');
    await runScript(readinessScript, [
      '--subjective-panel-summary',
      path.join(fixtureDir, 'subjective-panel-eval-score-summary.blocked.sample.json'),
      '--rubric-reviewer-summary',
      path.join(fixtureDir, 'rubric-reviewer-score-summary.blocked.sample.json'),
      '--exceptional-lane-summary',
      path.join(fixtureDir, 'exceptional-candidate-score-summary.blocked.sample.json'),
      '--visual-proxy-canary-summary',
      path.join(fixtureDir, 'visual-proxy-canary-summary.blocked.sample.json'),
      '--out',
      readinessOut,
      '--run-id',
      'coordinator_policy_test_readiness',
    ]);

    const { stdout } = await runScript(exposurePolicyScript, [
      '--input',
      path.join(readinessOut, 'quality-band-readiness-summary.json'),
      '--out',
      policyOut,
    ]);
    const result = JSON.parse(stdout) as { ok: boolean; coordinator_mode: string; readiness_level: string };

    assert.equal(result.ok, true);
    assert.equal(result.readiness_level, 'creator_guidance_only');
    assert.equal(result.coordinator_mode, 'creator_guidance_only');

    const policy = await readJson<{
      coordinator_mode: string;
      allowed_outputs: string[];
      blocked_outputs: string[];
      dify_contract: { may_show_to_reviewer: string[]; must_not_emit: string[] };
      input_exclusions: string[];
    }>(path.join(policyOut, 'coordinator-exposure-policy.json'));
    assert.equal(policy.coordinator_mode, 'creator_guidance_only');
    assert.ok(policy.allowed_outputs.includes('creator_guidance_draft'));
    assert.ok(policy.dify_contract.may_show_to_reviewer.includes('creator_guidance_draft'));
    assert.ok(policy.blocked_outputs.includes('final_quality_band'));
    assert.ok(policy.blocked_outputs.includes('autonomous_approval'));
    assert.ok(policy.blocked_outputs.includes('autonomous_rejection'));
    assert.ok(policy.blocked_outputs.includes('featured_or_exceptional_decision'));
    assert.ok(policy.blocked_outputs.includes('quality_decision_from_popularity_sales_views_or_engagement'));
    assert.ok(policy.dify_contract.must_not_emit.includes('final_quality_band'));
    assert.deepEqual(policy.input_exclusions, ['popularity', 'sales', 'views', 'favorites', 'marketplace_engagement']);

    const markdown = await readFile(path.join(policyOut, 'coordinator-exposure-policy.md'), 'utf8');
    assert.match(markdown, /This is a Dify\/coordinator control artifact/);
  });
});

test('reviewer-assist candidate requires lead approval before reviewer-facing quality cues', async () => {
  await withTempDir(async (dir) => {
    const summaryPath = path.join(dir, 'reviewer-assist-candidate.json');
    const pendingOut = path.join(dir, 'pending');
    const approvedOut = path.join(dir, 'approved');
    await writeFile(
      summaryPath,
      `${JSON.stringify(
        {
          schema_version: 'quality_band_readiness.v0.2',
          run_id: 'reviewer_assist_candidate_test',
          readiness_level: 'reviewer_assist_candidate',
          promotion_gate: { status: 'candidate_for_human_review', reasons: [] },
          input_exclusions: ['popularity'],
        },
        null,
        2,
      )}\n`,
    );

    await runScript(exposurePolicyScript, ['--input', summaryPath, '--out', pendingOut]);
    const pending = await readJson<{
      coordinator_mode: string;
      allowed_outputs: string[];
      blocked_outputs: string[];
      dify_contract: { requires_lead_approval: string[]; may_show_to_reviewer: string[] };
      input_exclusions: string[];
    }>(path.join(pendingOut, 'coordinator-exposure-policy.json'));

    assert.equal(pending.coordinator_mode, 'reviewer_assist_pending_lead_approval');
    assert.ok(pending.allowed_outputs.includes('quality_band_shadow_output'));
    assert.ok(pending.blocked_outputs.includes('reviewer_facing_quality_cue'));
    assert.ok(pending.dify_contract.requires_lead_approval.includes('reviewer_facing_quality_cue'));
    assert.ok(!pending.dify_contract.may_show_to_reviewer.includes('reviewer_facing_quality_cue'));
    assert.deepEqual(pending.input_exclusions, ['popularity', 'sales', 'views', 'favorites', 'marketplace_engagement']);

    await runScript(exposurePolicyScript, [
      '--input',
      summaryPath,
      '--out',
      approvedOut,
      '--lead-approved-reviewer-assist',
    ]);
    const approved = await readJson<{
      coordinator_mode: string;
      allowed_outputs: string[];
      blocked_outputs: string[];
      required_human_gates: string[];
      dify_contract: { may_show_to_reviewer: string[]; must_not_emit: string[] };
    }>(path.join(approvedOut, 'coordinator-exposure-policy.json'));

    assert.equal(approved.coordinator_mode, 'reviewer_assist_enabled');
    assert.ok(approved.allowed_outputs.includes('reviewer_facing_quality_cue'));
    assert.ok(approved.dify_contract.may_show_to_reviewer.includes('reviewer_facing_quality_cue'));
    assert.ok(approved.required_human_gates.includes('reviewer_confirms_quality_cue'));
    assert.ok(approved.blocked_outputs.includes('final_quality_band'));
    assert.ok(approved.dify_contract.must_not_emit.includes('final_quality_band'));
  });
});

test('coordinator output gate blocks final decisions and excluded quality inputs', async () => {
  await withTempDir(async (dir) => {
    const readinessOut = path.join(dir, 'readiness');
    const policyOut = path.join(dir, 'policy');
    const gateOut = path.join(dir, 'gate');
    const requestPath = path.join(dir, 'blocked-output-request.json');
    await runScript(readinessScript, [
      '--subjective-panel-summary',
      path.join(fixtureDir, 'subjective-panel-eval-score-summary.blocked.sample.json'),
      '--rubric-reviewer-summary',
      path.join(fixtureDir, 'rubric-reviewer-score-summary.blocked.sample.json'),
      '--exceptional-lane-summary',
      path.join(fixtureDir, 'exceptional-candidate-score-summary.blocked.sample.json'),
      '--visual-proxy-canary-summary',
      path.join(fixtureDir, 'visual-proxy-canary-summary.blocked.sample.json'),
      '--out',
      readinessOut,
    ]);
    await runScript(exposurePolicyScript, [
      '--input',
      path.join(readinessOut, 'quality-band-readiness-summary.json'),
      '--out',
      policyOut,
    ]);
    await writeFile(
      requestPath,
      `${JSON.stringify(
        {
          schema_version: 'template_review_coordinator_output_request.v0.1',
          request_id: 'blocked_quality_decision_request',
          intended_audience: 'reviewer',
          requested_lanes: ['creator_guidance_draft'],
          requested_outputs: ['creator_guidance_draft', 'final_quality_band'],
          input_sources: ['published_site_validation', 'sales'],
        },
        null,
        2,
      )}\n`,
    );

    await runScriptExpectingExitCode(
      path.join(packageRoot, 'scripts/gate-coordinator-output.ts'),
      [
        '--policy',
        path.join(policyOut, 'coordinator-exposure-policy.json'),
        '--request',
        requestPath,
        '--out',
        gateOut,
      ],
      2,
    );

    const gate = await readJson<{
      status: string;
      allowed_requested_outputs: string[];
      blocked_outputs: Array<{ value: string; reason: string }>;
      blocked_input_sources: Array<{ value: string; reason: string }>;
    }>(path.join(gateOut, 'coordinator-output-gate.json'));

    assert.equal(gate.status, 'blocked');
    assert.ok(gate.allowed_requested_outputs.includes('creator_guidance_draft'));
    assert.deepEqual(gate.blocked_outputs, [
      { value: 'final_quality_band', reason: 'output_explicitly_blocked_by_exposure_policy' },
    ]);
    assert.deepEqual(gate.blocked_input_sources, [
      { value: 'sales', reason: 'input_source_excluded_from_quality_review' },
    ]);
  });
});

test('coordinator output gate requires reviewer confirmation for reviewer-facing quality cues', async () => {
  await withTempDir(async (dir) => {
    const summaryPath = path.join(dir, 'reviewer-assist-candidate.json');
    const policyOut = path.join(dir, 'policy');
    const blockedGateOut = path.join(dir, 'blocked-gate');
    const allowedGateOut = path.join(dir, 'allowed-gate');
    const blockedRequestPath = path.join(dir, 'blocked-reviewer-cue-request.json');
    const allowedRequestPath = path.join(dir, 'allowed-reviewer-cue-request.json');

    await writeFile(
      summaryPath,
      `${JSON.stringify(
        {
          schema_version: 'quality_band_readiness.v0.2',
          run_id: 'reviewer_assist_output_gate_test',
          readiness_level: 'reviewer_assist_candidate',
          promotion_gate: { status: 'candidate_for_human_review', reasons: [] },
          input_exclusions: ['popularity', 'sales', 'views', 'favorites', 'marketplace_engagement'],
        },
        null,
        2,
      )}\n`,
    );
    await runScript(exposurePolicyScript, [
      '--input',
      summaryPath,
      '--out',
      policyOut,
      '--lead-approved-reviewer-assist',
    ]);

    const baseRequest = {
      schema_version: 'template_review_coordinator_output_request.v0.1',
      request_id: 'reviewer_cue_request',
      intended_audience: 'reviewer',
      requested_outputs: ['reviewer_facing_quality_cue'],
      input_sources: ['published_site_validation'],
    };
    await writeFile(blockedRequestPath, `${JSON.stringify(baseRequest, null, 2)}\n`);
    await writeFile(
      allowedRequestPath,
      `${JSON.stringify(
        {
          ...baseRequest,
          request_id: 'reviewer_cue_request_confirmed',
          human_gate_confirmations: ['reviewer_confirms_quality_cue'],
        },
        null,
        2,
      )}\n`,
    );

    await runScriptExpectingExitCode(
      path.join(packageRoot, 'scripts/gate-coordinator-output.ts'),
      [
        '--policy',
        path.join(policyOut, 'coordinator-exposure-policy.json'),
        '--request',
        blockedRequestPath,
        '--out',
        blockedGateOut,
      ],
      2,
    );
    const blocked = await readJson<{
      status: string;
      missing_human_gates: Array<{ value: string; reason: string }>;
    }>(path.join(blockedGateOut, 'coordinator-output-gate.json'));
    assert.equal(blocked.status, 'blocked');
    assert.deepEqual(blocked.missing_human_gates, [
      {
        value: 'reviewer_facing_quality_cue:reviewer_confirms_quality_cue',
        reason: 'human_gate_confirmation_required',
      },
    ]);

    const { stdout } = await runScript(path.join(packageRoot, 'scripts/gate-coordinator-output.ts'), [
      '--policy',
      path.join(policyOut, 'coordinator-exposure-policy.json'),
      '--request',
      allowedRequestPath,
      '--out',
      allowedGateOut,
    ]);
    const result = JSON.parse(stdout) as { ok: boolean; status: string };
    assert.equal(result.ok, true);
    assert.equal(result.status, 'allowed');

    const allowed = await readJson<{
      status: string;
      allowed_requested_outputs: string[];
      blocked_outputs: unknown[];
      missing_human_gates: unknown[];
    }>(path.join(allowedGateOut, 'coordinator-output-gate.json'));
    assert.equal(allowed.status, 'allowed');
    assert.deepEqual(allowed.allowed_requested_outputs, ['reviewer_facing_quality_cue']);
    assert.deepEqual(allowed.blocked_outputs, []);
    assert.deepEqual(allowed.missing_human_gates, []);
  });
});

test('coordinator contract smoke validates reusable output request fixtures', async () => {
  await withTempDir(async (outDir) => {
    const { stdout } = await runScript(contractSmokeScript, ['--out', outDir]);
    const result = JSON.parse(stdout) as { ok: boolean; status: string; case_count: number };
    assert.equal(result.ok, true);
    assert.equal(result.status, 'pass');
    assert.equal(result.case_count, 3);

    const summary = await readJson<{
      status: string;
      case_results: Array<{ case_id: string; expected_status: string; actual_status: string; ok: boolean }>;
    }>(path.join(outDir, 'coordinator-contract-smoke-summary.json'));
    assert.equal(summary.status, 'pass');
    assert.deepEqual(
      summary.case_results.map((item) => ({
        case_id: item.case_id,
        expected_status: item.expected_status,
        actual_status: item.actual_status,
        ok: item.ok,
      })),
      [
        {
          case_id: 'creator_guidance_allowed',
          expected_status: 'allowed',
          actual_status: 'allowed',
          ok: true,
        },
        {
          case_id: 'final_quality_band_blocked',
          expected_status: 'blocked',
          actual_status: 'blocked',
          ok: true,
        },
        {
          case_id: 'sales_input_blocked',
          expected_status: 'blocked',
          actual_status: 'blocked',
          ok: true,
        },
      ],
    );
  });
});
