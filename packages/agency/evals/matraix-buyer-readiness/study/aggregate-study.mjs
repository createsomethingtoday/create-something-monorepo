import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const candidateIds = ['baseline', 'proof-first', 'outcome-first'];
const args = process.argv.slice(2);
const jobsIndex = args.indexOf('--jobs-dir');
const outputIndex = args.indexOf('--output-dir');
const jobDirs = args
  .flatMap((value, index) => (value === '--job-dir' && args[index + 1] ? [resolve(args[index + 1])] : []));

if ((jobDirs.length === 0 && (jobsIndex === -1 || !args[jobsIndex + 1])) || outputIndex === -1 || !args[outputIndex + 1]) {
  throw new Error('Usage: node aggregate-study.mjs (--jobs-dir /absolute/path/to/jobs | --job-dir /absolute/path/to/job [--job-dir ...]) --output-dir /absolute/path/to/output');
}

const outputDir = resolve(args[outputIndex + 1]);
const resolvedJobDirs = jobDirs.length > 0
  ? jobDirs
  : [resolve(args[jobsIndex + 1], 'cre-1763-local-buyer-readiness-study')];

for (const jobDir of resolvedJobDirs) {
  if (!existsSync(jobDir)) throw new Error(`Missing MatrAIx job directory: ${jobDir}`);
}

const score = {
  clarity: { clear: 2, mixed: 1, unclear: 0 },
  evidence_trust: { sufficient: 2, mixed: 1, insufficient: 0 },
  boundary_clarity: { clear: 2, mixed: 1, unclear: 0 },
  intent_strength: { strong: 2, mixed: 1, weak: 0 }
};

const trajectories = [];
for (const jobDir of resolvedJobDirs) {
  for (const trialName of readdirSync(jobDir)) {
    const file = resolve(jobDir, trialName, 'artifacts/app/output/buyer_readiness_trajectory.json');
    if (!existsSync(file)) continue;
    const trajectory = JSON.parse(readFileSync(file, 'utf8'));
    trajectories.push({ file, trialName, trajectory });
  }
}

if (trajectories.length !== 12) {
  throw new Error(`Expected exactly 12 completed trajectories, found ${trajectories.length}`);
}

const candidates = Object.fromEntries(
  candidateIds.map((candidateId) => [
    candidateId,
    { candidate_id: candidateId, n: 0, book_intent: 0, abandoned: 0, score_total: 0, score_count: 0, objections: [], reasons: [], first_impressions: [], personas: [] }
  ])
);

for (const { trajectory } of trajectories) {
  const candidate = candidates[trajectory.candidate_id];
  if (!candidate) throw new Error(`Unexpected candidate id: ${trajectory.candidate_id}`);
  const personaId = trajectory.provenance?.persona_id;
  if (typeof personaId !== 'string') throw new Error(`Missing persona id for ${trajectory.candidate_id}`);
  candidate.n += 1;
  candidate.personas.push(personaId);
  candidate[trajectory.terminal_decision?.outcome] += 1;
  candidate.reasons.push(trajectory.terminal_decision?.reason ?? '');
  candidate.first_impressions.push(trajectory.evaluation?.first_impression ?? '');
  candidate.objections.push(...(trajectory.evaluation?.objections ?? []));
  const safety = trajectory.safety ?? {};
  const bridgeOnly = Array.isArray(safety.external_hosts_contacted) && safety.external_hosts_contacted.every(
    (host) => typeof host === 'string' && host.startsWith('http://agency-bridge:8080/')
  );
  const hasSideEffect = ['booking_submitted', 'payment_attempted', 'calendar_opened', 'crm_mutated', 'analytics_emitted', 'navigated_to_booking_route']
    .some((field) => safety[field] !== false);
  if (hasSideEffect || !bridgeOnly) {
    throw new Error(`Safety contract failed for ${trajectory.candidate_id}`);
  }
  for (const [field, values] of Object.entries(score)) {
    const value = trajectory.evaluation?.[field];
    if (!(value in values)) throw new Error(`Invalid ${field} value for ${trajectory.candidate_id}: ${value}`);
    candidate.score_total += values[value];
    candidate.score_count += 1;
  }
}

for (const candidate of Object.values(candidates)) {
  if (candidate.n !== 4) throw new Error(`${candidate.candidate_id} needs four trajectories, found ${candidate.n}`);
  if (new Set(candidate.personas).size !== 4) throw new Error(`${candidate.candidate_id} must have four distinct personas`);
  candidate.directional_score = Number((candidate.score_total / candidate.score_count).toFixed(2));
  delete candidate.score_total;
  delete candidate.score_count;
}

const ranked = Object.values(candidates).sort(
  (left, right) => right.directional_score - left.directional_score || right.book_intent - left.book_intent
);
const report = {
  schema_version: 'agency.matraix-buyer-readiness-study-report.v1',
  boundary: 'Synthetic, local-only directional experiment. Scores are qualitative agent judgments, not conversion, demand, or human research metrics.',
  cohort: { candidates: candidateIds, personas_per_candidate: 4, total_trajectories: trajectories.length, job_directories: resolvedJobDirs },
  ranked,
  winner: ranked[0].candidate_id
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(resolve(outputDir, 'buyer-readiness-study-report.json'), `${JSON.stringify(report, null, 2)}\n`);
const lines = [
  '# AI Buyer Readiness local study',
  '',
  'Synthetic, local-only directional experiment. The rankings are qualitative agent judgments, not conversion, demand, or human-research metrics.',
  '',
  '| Candidate | Directional score (0-2) | Intent | Abandoned |',
  '| --- | ---: | ---: | ---: |',
  ...ranked.map((candidate) => `| ${candidate.candidate_id} | ${candidate.directional_score} | ${candidate.book_intent} | ${candidate.abandoned} |`),
  '',
  `Recommended candidate for human review: **${report.winner}**.`,
  '',
  '## Objections',
  '',
  ...ranked.flatMap((candidate) => [
    `### ${candidate.candidate_id}`,
    ...(candidate.objections.length ? candidate.objections.map((objection) => `- ${objection}`) : ['- None recorded.']),
    ''
  ])
];
writeFileSync(resolve(outputDir, 'buyer-readiness-study-report.md'), `${lines.join('\n')}\n`);
console.log(JSON.stringify(report, null, 2));
