import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';

const studyRoot = new URL('.', import.meta.url);

function writeTrajectory(jobDir, candidateId, personaId, evaluation, externalHosts = [], personaInput) {
  const trialDir = resolve(jobDir, `${candidateId}-${personaId}`);
  const output = resolve(
    trialDir,
    'artifacts/app/output/buyer_readiness_trajectory.json'
  );
  mkdirSync(resolve(output, '..'), { recursive: true });
  writeFileSync(
    output,
    JSON.stringify({
      candidate_id: candidateId,
      provenance: { persona_id: personaId },
      terminal_decision: { outcome: 'book_intent', reason: `${candidateId} is actionable.` },
      evaluation: {
        first_impression: `${candidateId} describes a bounded audit.`,
        objections: [],
        ...evaluation
      },
      safety: {
        booking_submitted: false,
        payment_attempted: false,
        calendar_opened: false,
        crm_mutated: false,
        analytics_emitted: false,
        navigated_to_booking_route: false,
        external_hosts_contacted: externalHosts
      }
    })
  );
  if (personaInput) {
    writeFileSync(
      resolve(trialDir, 'result.json'),
      JSON.stringify({ config: { agent: { kwargs: { persona_path: personaInput } } } })
    );
  }
}

test('study template fixes each candidate URL and keeps the no-side-effect contract', () => {
  const instruction = readFileSync(new URL('./task-template/instruction.md', studyRoot), 'utf8');
  const verifier = readFileSync(new URL('./task-template/tests/test_state.py', studyRoot), 'utf8');
  const runner = readFileSync(new URL('./run-study.mjs', studyRoot), 'utf8');

  assert.match(instruction, /Python Playwright script/);
  assert.match(instruction, /Do not open a\s+booking link or any other route/);
  assert.match(instruction, /__CANDIDATE_ID__/);
  assert.match(verifier, /booking_submitted/);
  assert.match(verifier, /agency-bridge:8080/);
  assert.match(runner, /n_concurrent_trials: 3/);
  assert.match(runner, /const personaIds = \['0001', '0002', '0003', '0004'\]/);
  assert.match(runner, /CODEX_FORCE_AUTH_JSON: "true"/);
});

test('aggregator requires complete matched cohorts and writes a directional report', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'agency-buyer-study-'));
  try {
    const jobsDir = resolve(root, 'jobs');
    const jobDir = resolve(jobsDir, 'cre-1763-local-buyer-readiness-study');
    const outputDir = resolve(root, 'report');
    const ratings = {
      baseline: { clarity: 'clear', evidence_trust: 'mixed', boundary_clarity: 'clear', intent_strength: 'mixed' },
      'proof-first': { clarity: 'clear', evidence_trust: 'sufficient', boundary_clarity: 'clear', intent_strength: 'strong' },
      'outcome-first': { clarity: 'mixed', evidence_trust: 'sufficient', boundary_clarity: 'clear', intent_strength: 'strong' }
    };
    for (const candidateId of Object.keys(ratings)) {
      for (const personaId of ['0001', '0002', '0003', '0004']) {
        writeTrajectory(
          jobDir,
          candidateId,
          personaId,
          ratings[candidateId],
          candidateId === 'baseline' && personaId === '0001' ? ['agency-bridge:8080'] : [],
          `persona/datasets/matraix-persona-dev-sample/persona_${personaId}.yaml`
        );
      }
    }

    execFileSync(process.execPath, [
      resolve(new URL('./aggregate-study.mjs', studyRoot).pathname),
      '--jobs-dir',
      jobsDir,
      '--output-dir',
      outputDir
    ]);
    const report = JSON.parse(readFileSync(resolve(outputDir, 'buyer-readiness-study-report.json'), 'utf8'));

    assert.equal(report.cohort.total_trajectories, 12);
    assert.equal(report.cohort.personas_per_candidate, 4);
    assert.equal(report.winner, 'proof-first');
    assert.match(report.boundary, /not conversion, demand, or human research metrics/i);

    for (const candidateId of Object.keys(ratings)) {
      for (const personaId of ['0005', '0006', '0007', '0008', '0009', '0010', '0011', '0012']) {
        writeTrajectory(
          jobDir,
          candidateId,
          personaId,
          ratings[candidateId],
          [],
          `persona/datasets/matraix-persona-dev-sample/persona_${personaId}.yaml`
        );
      }
    }
    execFileSync(process.execPath, [
      resolve(new URL('./aggregate-study.mjs', studyRoot).pathname),
      '--jobs-dir',
      jobsDir,
      '--expected-per-candidate',
      '12',
      '--output-dir',
      outputDir
    ]);
    const extendedReport = JSON.parse(readFileSync(resolve(outputDir, 'buyer-readiness-study-report.json'), 'utf8'));

    assert.equal(extendedReport.cohort.total_trajectories, 36);
    assert.equal(extendedReport.cohort.personas_per_candidate, 12);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
