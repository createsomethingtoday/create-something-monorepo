import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { resolvePropertyJourney } from './journeys.ts';

const args = process.argv.slice(2);
const rootIndex = args.indexOf('--matraix-root');
const jobsIndex = args.indexOf('--jobs-dir');
const candidatesIndex = args.indexOf('--candidates-file');
const dryRun = args.includes('--dry-run');

if (rootIndex === -1 || !args[rootIndex + 1] || jobsIndex === -1 || !args[jobsIndex + 1] || candidatesIndex === -1 || !args[candidatesIndex + 1]) {
  throw new Error('Usage: node --import tsx run-study.mjs --matraix-root /absolute/MatrAIx --jobs-dir /absolute/jobs --candidates-file /absolute/candidates.json [--dry-run]');
}

const matraixRoot = resolve(args[rootIndex + 1]);
const jobsDir = resolve(args[jobsIndex + 1]);
const candidatesFile = resolve(args[candidatesIndex + 1]);
if (!existsSync(resolve(matraixRoot, 'pyproject.toml')) || !existsSync(resolve(matraixRoot, 'application/tasks'))) {
  throw new Error(`${matraixRoot} does not look like a MatrAIx checkout`);
}
if (!existsSync(candidatesFile)) throw new Error(`Missing candidates file: ${candidatesFile}`);

const candidateInput = JSON.parse(readFileSync(candidatesFile, 'utf8'));
const journey = resolvePropertyJourney(candidateInput?.journey_id);
if (!Array.isArray(candidateInput?.candidates) || candidateInput.candidates.length < 2) {
  throw new Error('A property study needs at least two explicit candidates');
}

function normalizeCandidate(candidate) {
  if (!candidate || typeof candidate.candidate_id !== 'string' || !candidate.candidate_id.trim()) {
    throw new Error('Each candidate needs a candidate_id');
  }
  if (!Array.isArray(candidate.routes) || candidate.routes.length !== journey.paths.length) {
    throw new Error(`${candidate.candidate_id} must define every ${journey.id} route`);
  }
  if (typeof candidate.content_fingerprint !== 'string' || !candidate.content_fingerprint.trim()) {
    throw new Error(`${candidate.candidate_id} needs a reviewed content_fingerprint`);
  }
  if (candidate.contract_preserved !== true) {
    throw new Error(`${candidate.candidate_id} must affirm contract_preserved`);
  }
  return {
    candidate_id: candidate.candidate_id,
    content_fingerprint: candidate.content_fingerprint,
    routes: candidate.routes.map((route, index) => {
      const url = new URL(route?.url);
      if (route?.path !== journey.paths[index] || url.protocol !== 'http:' || url.hostname !== 'agency-bridge' || url.port !== '8080' || url.pathname !== journey.paths[index]) {
        throw new Error(`${candidate.candidate_id} route ${index} must use task-owned ${journey.paths[index]}`);
      }
      return { path: route.path, url: url.toString() };
    })
  };
}

const candidates = candidateInput.candidates.map(normalizeCandidate);
if (new Set(candidates.map((candidate) => candidate.candidate_id)).size !== candidates.length) {
  throw new Error('Candidate ids must be unique');
}
const signatures = candidates.map((candidate) => candidate.routes.map((route) => route.url).join('|'));
if (new Set(signatures).size !== signatures.length) throw new Error('Candidates must use distinct route URLs');

const sourceRoot = resolve(import.meta.dirname);
const templateRoot = resolve(sourceRoot, 'task-template');
const environmentSource = resolve(sourceRoot, '..', 'matraix-buyer-readiness', 'environment');
const taskRoot = resolve(matraixRoot, 'application/tasks');
const environmentDestination = resolve(matraixRoot, 'environment/task-environments/application/local-property-journey-bridge');
const recipePath = resolve(matraixRoot, 'configs/jobs', `cre-1765-local-property-journey-${journey.id}.yaml`);

function copyTemplate(source, destination, tokens) {
  const stats = statSync(source);
  if (stats.isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const entry of readdirSync(source)) copyTemplate(resolve(source, entry), resolve(destination, entry), tokens);
    return;
  }
  let content = readFileSync(source, 'utf8');
  for (const [token, value] of Object.entries(tokens)) content = content.replaceAll(token, value);
  writeFileSync(destination, content);
}

const destinations = candidates.map((candidate) => resolve(taskRoot, `local-property-journey-${journey.id}-${candidate.candidate_id}`));
for (const destination of destinations) {
  if (!destination.startsWith(`${taskRoot}/`)) throw new Error(`Refusing to copy outside ${taskRoot}`);
  if (existsSync(destination)) throw new Error(`${destination} already exists; choose a fresh MatrAIx checkout`);
}
if (existsSync(recipePath)) throw new Error(`${recipePath} already exists; choose a fresh MatrAIx checkout`);

const personaIds = ['0001', '0002', '0003', '0004'];
const recipe = `job_name: cre-1765-local-property-journey-${journey.id}\njobs_dir: ${JSON.stringify(jobsDir)}\nn_attempts: 1\nn_concurrent_trials: 3\ntimeout_multiplier: 1.0\nquiet: false\n\nenvironment:\n  type: docker\n  delete: true\n\nagents:\n${personaIds.map((personaId) => `  - name: persona-codex\n    model_name: openai/gpt-5.4\n    kwargs:\n      persona_path: persona/datasets/matraix-persona-dev-sample/persona_${personaId}.yaml\n      reasoning_effort: low\n    env:\n      CODEX_FORCE_AUTH_JSON: "true"\n      HTTPS_PROXY: http://llm-bridge:8000\n      NO_PROXY: agency-bridge,llm-bridge,localhost,127.0.0.1`).join('\n')}\n\ntasks:\n${candidates.map((candidate) => `  - path: application/tasks/local-property-journey-${journey.id}-${candidate.candidate_id}`).join('\n')}\n\nartifacts:\n  - /app/output\n`;

console.log(`${dryRun ? 'Would install' : 'Installing'} ${candidates.length} ${journey.id} study tasks into ${taskRoot}`);
console.log(`${dryRun ? 'Would write' : 'Writing'} ${recipePath}`);
if (!dryRun) {
  if (!existsSync(environmentDestination)) {
    mkdirSync(dirname(environmentDestination), { recursive: true });
    cpSync(environmentSource, environmentDestination, { recursive: true, errorOnExist: true });
  }
  for (const [index, candidate] of candidates.entries()) {
    copyTemplate(templateRoot, destinations[index], {
      '__JOURNEY_ID__': journey.id,
      '__CANDIDATE_ID__': candidate.candidate_id,
      '__START_URL__': candidate.routes[0].url,
      '__ROUTE_PATHS_JSON__': JSON.stringify(journey.paths)
    });
  }
  mkdirSync(dirname(recipePath), { recursive: true });
  writeFileSync(recipePath, recipe);
}
console.log(`Run next: cd ${matraixRoot} && uv run harbor run -c ${recipePath}`);
