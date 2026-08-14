import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { resolvePropertyJourney } from './journeys.ts';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output-dir');
const candidatesIndex = args.indexOf('--candidates-file');
const expectedIndex = args.indexOf('--expected-per-candidate');
const jobDirs = args.flatMap((value, index) => value === '--job-dir' && args[index + 1] ? [resolve(args[index + 1])] : []);
const expectedPerCandidate = expectedIndex === -1 ? 4 : Number(args[expectedIndex + 1]);

if (jobDirs.length === 0 || candidatesIndex === -1 || !args[candidatesIndex + 1] || outputIndex === -1 || !args[outputIndex + 1]) {
  throw new Error('Usage: node --import tsx aggregate-study.mjs --job-dir /absolute/job [--job-dir ...] --candidates-file /absolute/candidates.json --output-dir /absolute/report [--expected-per-candidate 4]');
}
if (!Number.isInteger(expectedPerCandidate) || expectedPerCandidate < 1) {
  throw new Error('--expected-per-candidate must be a positive integer');
}

const candidateFile = resolve(args[candidatesIndex + 1]);
if (!existsSync(candidateFile)) throw new Error(`Missing candidates file: ${candidateFile}`);
for (const jobDir of jobDirs) {
  if (!existsSync(jobDir)) throw new Error(`Missing job directory: ${jobDir}`);
}

const candidateInput = JSON.parse(readFileSync(candidateFile, 'utf8'));
const journey = resolvePropertyJourney(candidateInput?.journey_id);
const candidates = candidateInput?.candidates;
if (!Array.isArray(candidates) || candidates.length < 2) {
  throw new Error('A comparative study needs at least two explicit candidates');
}

function normalizeCandidate(candidate) {
  if (!candidate || typeof candidate.candidate_id !== 'string' || !candidate.candidate_id.trim()) {
    throw new Error('Each candidate needs a non-empty candidate_id');
  }
  if (!Array.isArray(candidate.routes) || candidate.routes.length !== journey.paths.length) {
    throw new Error(`${candidate.candidate_id} must define each route in ${journey.id}`);
  }
  if (typeof candidate.content_fingerprint !== 'string' || !candidate.content_fingerprint.trim()) {
    throw new Error(`${candidate.candidate_id} needs a reviewed content_fingerprint`);
  }
  if (candidate.contract_preserved !== true) {
    throw new Error(`${candidate.candidate_id} must affirm contract_preserved`);
  }
  const routes = candidate.routes.map((route, index) => {
    if (!route || typeof route.url !== 'string') throw new Error(`${candidate.candidate_id} route ${index} needs a URL`);
    const url = new URL(route.url);
    if (url.protocol !== 'http:' || url.hostname !== 'agency-bridge' || url.port !== '8080') {
      throw new Error(`${candidate.candidate_id} uses a non-task-owned route URL`);
    }
    if (url.pathname !== journey.paths[index] || route.path !== journey.paths[index]) {
      throw new Error(`${candidate.candidate_id} route ${index} must be ${journey.paths[index]}`);
    }
    return { path: route.path, url: url.toString() };
  });
  return { candidate_id: candidate.candidate_id, content_fingerprint: candidate.content_fingerprint, routes };
}

const normalizedCandidates = candidates.map(normalizeCandidate);
if (new Set(normalizedCandidates.map((candidate) => candidate.candidate_id)).size !== normalizedCandidates.length) {
  throw new Error('Candidate ids must be unique');
}
const routeSignatures = normalizedCandidates.map((candidate) => candidate.routes.map((route) => route.url).join('|'));
if (new Set(routeSignatures).size !== routeSignatures.length) {
  throw new Error('Comparative candidates must use distinct route URLs');
}
if (new Set(normalizedCandidates.map((candidate) => candidate.content_fingerprint)).size !== normalizedCandidates.length) {
  throw new Error('Comparative candidates must use distinct content fingerprints');
}
const candidateById = new Map(normalizedCandidates.map((candidate) => [candidate.candidate_id, candidate]));

const score = {
  decision_clarity: { clear: 2, mixed: 1, unclear: 0 },
  proof_support: { sufficient: 2, mixed: 1, insufficient: 0 },
  next_step_confidence: { strong: 2, mixed: 1, weak: 0 },
  navigation_continuity: { clear: 2, mixed: 1, unclear: 0 }
};

function isTaskOwnedBridgeHost(value) {
  return typeof value === 'string' && (
    value.startsWith('http://agency-bridge:8080/') || value.startsWith('agency-bridge://') || value === 'agency-bridge:8080'
  );
}

function assertTrajectory(trajectory) {
  if (!trajectory || trajectory.schema_version !== 'agency.property-journey-study.v1') {
    throw new Error('Invalid property journey trajectory schema');
  }
  if (trajectory.journey_id !== journey.id) throw new Error(`Unexpected journey: ${trajectory.journey_id}`);
  const candidate = candidateById.get(trajectory.candidate_id);
  if (!candidate) throw new Error(`Unexpected candidate: ${trajectory.candidate_id}`);
  if (trajectory.provenance?.start_url !== candidate.routes[0].url) {
    throw new Error(`Start URL does not match ${trajectory.candidate_id}`);
  }
  if (!Array.isArray(trajectory.routes) || trajectory.routes.length !== journey.paths.length) {
    throw new Error(`${trajectory.candidate_id} needs every core-spine route`);
  }
  for (const [index, route] of trajectory.routes.entries()) {
    if (route?.path !== journey.paths[index]) throw new Error(`${trajectory.candidate_id} used an off-route path`);
    for (const field of ['decision_clarity', 'proof_support', 'next_step_confidence']) {
      if (!(route?.[field] in score[field])) throw new Error(`Invalid ${field} on ${route?.path}`);
    }
  }
  if (!(trajectory.flow?.navigation_continuity in score.navigation_continuity)) {
    throw new Error(`Invalid navigation_continuity for ${trajectory.candidate_id}`);
  }
  if (!['map_intent', 'abandoned'].includes(trajectory.flow?.terminal_intent)) {
    throw new Error(`Invalid terminal_intent for ${trajectory.candidate_id}`);
  }
  const safety = trajectory.safety ?? {};
  const hasSideEffect = ['booking_submitted', 'payment_attempted', 'calendar_opened', 'crm_mutated', 'analytics_emitted']
    .some((field) => safety[field] !== false);
  const bridgeOnly = Array.isArray(safety.external_hosts_contacted) && safety.external_hosts_contacted.every(isTaskOwnedBridgeHost);
  if (hasSideEffect || !bridgeOnly) throw new Error(`Safety contract failed for ${trajectory.candidate_id}`);
  return candidate;
}

const trajectories = [];
for (const jobDir of jobDirs) {
  for (const trialName of readdirSync(jobDir)) {
    const file = resolve(jobDir, trialName, 'artifacts/app/output/property_journey_trajectory.json');
    if (!existsSync(file)) continue;
    const trajectory = JSON.parse(readFileSync(file, 'utf8'));
    const resultFile = resolve(jobDir, trialName, 'result.json');
    const result = existsSync(resultFile) ? JSON.parse(readFileSync(resultFile, 'utf8')) : null;
    const persona = result?.config?.agent?.kwargs?.persona_path ?? trajectory.provenance?.persona_id;
    if (typeof persona !== 'string' || !persona.trim()) throw new Error(`Missing persona for ${trialName}`);
    assertTrajectory(trajectory);
    trajectories.push({ trajectory, persona });
  }
}

const expectedTotal = normalizedCandidates.length * expectedPerCandidate;
if (trajectories.length !== expectedTotal) {
  throw new Error(`Expected exactly ${expectedTotal} completed trajectories, found ${trajectories.length}`);
}

const summary = Object.fromEntries(normalizedCandidates.map((candidate) => [candidate.candidate_id, {
  candidate_id: candidate.candidate_id,
  n: 0,
  map_intent: 0,
  abandoned: 0,
  score_total: 0,
  score_count: 0,
  personas: []
}]));

for (const { trajectory, persona } of trajectories) {
  const candidate = summary[trajectory.candidate_id];
  candidate.n += 1;
  candidate.personas.push(persona);
  candidate[trajectory.flow.terminal_intent] += 1;
  for (const route of trajectory.routes) {
    for (const field of ['decision_clarity', 'proof_support', 'next_step_confidence']) {
      candidate.score_total += score[field][route[field]];
      candidate.score_count += 1;
    }
  }
  candidate.score_total += score.navigation_continuity[trajectory.flow.navigation_continuity];
  candidate.score_count += 1;
}

for (const candidate of Object.values(summary)) {
  if (candidate.n !== expectedPerCandidate) throw new Error(`${candidate.candidate_id} needs ${expectedPerCandidate} trajectories, found ${candidate.n}`);
  if (new Set(candidate.personas).size !== expectedPerCandidate) throw new Error(`${candidate.candidate_id} must use distinct personas`);
  candidate.directional_score = Number((candidate.score_total / candidate.score_count).toFixed(2));
  delete candidate.score_total;
  delete candidate.score_count;
}

const ranked = Object.values(summary).sort(
  (left, right) => right.directional_score - left.directional_score || right.map_intent - left.map_intent || left.candidate_id.localeCompare(right.candidate_id)
);
const report = {
  schema_version: 'agency.property-journey-study-report.v1',
  boundary: 'Synthetic, local-only directional experiment. Scores are qualitative agent judgments, not conversion, demand, or human research metrics.',
  journey: { id: journey.id, paths: journey.paths, terminal_intent: journey.terminalIntent },
  cohort: { candidates: normalizedCandidates.map((candidate) => ({ id: candidate.candidate_id, content_fingerprint: candidate.content_fingerprint })), personas_per_candidate: expectedPerCandidate, total_trajectories: trajectories.length, job_directories: jobDirs },
  ranked,
  winner: ranked[0].candidate_id
};

const outputDir = resolve(args[outputIndex + 1]);
mkdirSync(outputDir, { recursive: true });
writeFileSync(resolve(outputDir, 'property-journey-study-report.json'), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(resolve(outputDir, 'property-journey-study-report.md'), [
  '# Agency property journey study',
  '',
  report.boundary,
  '',
  `Journey: ${journey.paths.join(' → ')}`,
  '',
  '| Candidate | Directional score (0-2) | Map intent | Abandoned |',
  '| --- | ---: | ---: | ---: |',
  ...ranked.map((candidate) => `| ${candidate.candidate_id} | ${candidate.directional_score} | ${candidate.map_intent} | ${candidate.abandoned} |`),
  '',
  `Recommended candidate for human review: **${report.winner}**.`
].join('\n') + '\n');
console.log(JSON.stringify(report, null, 2));
