import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';

const studyRoot = new URL('.', import.meta.url);

const candidates = [
  {
    candidate_id: 'baseline',
    content_fingerprint: 'agency-core-spine@baseline',
    contract_preserved: true,
    routes: [
      { path: '/', url: 'http://agency-bridge:8080/' },
      { path: '/services', url: 'http://agency-bridge:8080/services' },
      { path: '/map', url: 'http://agency-bridge:8080/map' }
    ]
  },
  {
    candidate_id: 'proof-first',
    content_fingerprint: 'agency-core-spine@proof-first',
    contract_preserved: true,
    routes: [
      { path: '/', url: 'http://agency-bridge:8080/?study=proof-first' },
      { path: '/services', url: 'http://agency-bridge:8080/services?study=proof-first' },
      { path: '/map', url: 'http://agency-bridge:8080/map?study=proof-first' }
    ]
  }
];

function writeTrajectory(jobDir, candidateId, personaId, overrides = {}) {
  const trialDir = resolve(jobDir, `${candidateId}-${personaId}`);
  const output = resolve(trialDir, 'artifacts/app/output/property_journey_trajectory.json');
  mkdirSync(resolve(output, '..'), { recursive: true });
  writeFileSync(
    output,
    JSON.stringify({
      schema_version: 'agency.property-journey-study.v1',
      journey_id: 'core-spine',
      candidate_id: candidateId,
      provenance: {
        task_version: '0.1.0',
        persona_id: `persona_${personaId}`,
        model: 'openai/test',
        start_url: candidates.find((candidate) => candidate.candidate_id === candidateId).routes[0].url
      },
      routes: [
        { path: '/', decision_clarity: 'clear', proof_support: 'sufficient', next_step_confidence: 'strong' },
        { path: '/services', decision_clarity: 'clear', proof_support: 'mixed', next_step_confidence: 'strong' },
        { path: '/map', decision_clarity: 'clear', proof_support: 'sufficient', next_step_confidence: 'strong' }
      ],
      flow: { navigation_continuity: 'clear', terminal_intent: 'map_intent' },
      safety: {
        booking_submitted: false,
        payment_attempted: false,
        calendar_opened: false,
        crm_mutated: false,
        analytics_emitted: false,
        external_hosts_contacted: []
      },
      ...overrides
    })
  );
  writeFileSync(
    resolve(trialDir, 'result.json'),
    JSON.stringify({ config: { agent: { kwargs: { persona_path: `persona_${personaId}.yaml` } } } })
  );
}

test('the core spine is derived from active marketing-route contracts', async () => {
  const { resolvePropertyJourney } = await import('./journeys.ts');
  const journey = resolvePropertyJourney('core-spine');

  assert.deepEqual(journey.paths, ['/', '/services', '/map']);
  assert.deepEqual(
    journey.routes.map((route) => route.primaryAction),
    ['Request a workflow map', 'Map the workflow', 'Open canvas']
  );
  assert.ok(journey.routes.every((route) => route.decision === 'index'));
});

test('the journey manifest exposes route-owned decision and handoff contracts', () => {
  const output = execFileSync(process.execPath, [
    '--import',
    'tsx',
    resolve(new URL('./print-journey.mjs', studyRoot).pathname),
    '--journey',
    'core-spine'
  ]);
  const manifest = JSON.parse(output.toString());

  assert.equal(manifest.journey_id, 'core-spine');
  assert.deepEqual(manifest.paths, ['/', '/services', '/map']);
  assert.deepEqual(manifest.routes.map((route) => route.primary_action), [
    'Request a workflow map',
    'Map the workflow',
    'Open canvas'
  ]);
  assert.ok(manifest.routes.every((route) => route.required_links.length > 0));
});

test('the aggregator ranks only complete, distinct, read-only matched candidates', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'agency-property-study-'));
  try {
    const jobDir = resolve(root, 'jobs', 'core-spine');
    const candidatesFile = resolve(root, 'candidates.json');
    const outputDir = resolve(root, 'report');
    writeFileSync(candidatesFile, JSON.stringify({ journey_id: 'core-spine', candidates }));

    for (const candidate of candidates) {
      for (const personaId of ['0001', '0002', '0003', '0004']) {
        writeTrajectory(jobDir, candidate.candidate_id, personaId);
      }
    }

    execFileSync(process.execPath, [
      '--import',
      'tsx',
      resolve(new URL('./aggregate-study.mjs', studyRoot).pathname),
      '--job-dir',
      jobDir,
      '--candidates-file',
      candidatesFile,
      '--output-dir',
      outputDir
    ]);

    const report = JSON.parse(readFileSync(resolve(outputDir, 'property-journey-study-report.json'), 'utf8'));
    assert.equal(report.cohort.total_trajectories, 8);
    assert.equal(report.ranked.length, 2);
    assert.equal(report.winner, 'baseline');
    assert.match(report.boundary, /not conversion, demand, or human research metrics/i);

    const duplicateCandidates = resolve(root, 'duplicate-candidates.json');
    writeFileSync(
      duplicateCandidates,
      JSON.stringify({ journey_id: 'core-spine', candidates: [candidates[0], { ...candidates[0], candidate_id: 'duplicate' }] })
    );
    assert.throws(
      () =>
        execFileSync(process.execPath, [
          '--import',
          'tsx',
          resolve(new URL('./aggregate-study.mjs', studyRoot).pathname),
          '--job-dir',
          jobDir,
          '--candidates-file',
          duplicateCandidates,
          '--output-dir',
          outputDir
        ], { stdio: 'pipe' }),
      (error) => {
        assert.match(error.stderr.toString(), /distinct route URLs/i);
        return true;
      }
    );

    writeTrajectory(jobDir, 'baseline', '9999', {
      safety: {
        booking_submitted: true,
        payment_attempted: false,
        calendar_opened: false,
        crm_mutated: false,
        analytics_emitted: false,
        external_hosts_contacted: []
      }
    });
    assert.throws(
      () =>
        execFileSync(process.execPath, [
          '--import',
          'tsx',
          resolve(new URL('./aggregate-study.mjs', studyRoot).pathname),
          '--job-dir',
          jobDir,
          '--candidates-file',
          candidatesFile,
          '--output-dir',
          outputDir,
          '--expected-per-candidate',
          '5'
        ], { stdio: 'pipe' }),
      (error) => {
        assert.match(error.stderr.toString(), /Safety contract failed/i);
        return true;
      }
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the generated task limits an agent to the declared read-only core-spine journey', () => {
  const instruction = readFileSync(new URL('./task-template/instruction.md', studyRoot), 'utf8');
  const verifier = readFileSync(new URL('./task-template/tests/test_state.py', studyRoot), 'utf8');
  const runner = readFileSync(new URL('./run-study.mjs', studyRoot), 'utf8');

  assert.match(instruction, /__START_URL__/);
  assert.match(instruction, /__ROUTE_PATHS_JSON__/);
  assert.match(instruction, /Do not submit a form, open a booking route/);
  assert.match(verifier, /property_journey_trajectory\.json/);
  assert.match(verifier, /booking_submitted/);
  assert.match(verifier, /ROUTE_PATHS/);
  assert.match(runner, /resolvePropertyJourney/);
  assert.match(runner, /n_concurrent_trials: 3/);
});

test('the runner materializes only reviewed task-owned candidate routes', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'agency-property-runner-'));
  try {
    const matraixRoot = resolve(root, 'matraix');
    const taskRoot = resolve(matraixRoot, 'application/tasks');
    const candidatesFile = resolve(root, 'candidates.json');
    mkdirSync(taskRoot, { recursive: true });
    writeFileSync(resolve(matraixRoot, 'pyproject.toml'), '[project]\nname = "fixture"\n');
    writeFileSync(candidatesFile, JSON.stringify({ journey_id: 'core-spine', candidates }));

    execFileSync(process.execPath, [
      '--import',
      'tsx',
      resolve(new URL('./run-study.mjs', studyRoot).pathname),
      '--matraix-root',
      matraixRoot,
      '--jobs-dir',
      resolve(root, 'jobs'),
      '--candidates-file',
      candidatesFile
    ]);

    const task = readFileSync(resolve(taskRoot, 'local-property-journey-core-spine-proof-first/instruction.md'), 'utf8');
    const verifier = readFileSync(resolve(taskRoot, 'local-property-journey-core-spine-proof-first/tests/test_state.py'), 'utf8');
    assert.match(task, /http:\/\/agency-bridge:8080\/\?study=proof-first/);
    assert.doesNotMatch(task, /__START_URL__|__ROUTE_PATHS_JSON__/);
    assert.match(verifier, /ROUTE_PATHS = \["\/","\/services","\/map"\]/);
    assert.doesNotMatch(verifier, /__CANDIDATE_ID__|__START_URL__/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
