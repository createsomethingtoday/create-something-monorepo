import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { dirname, resolve } from 'node:path';

const candidateIds = ['baseline', 'proof-first', 'outcome-first'];
const personaIds = ['0001', '0002', '0003', '0004'];
const args = process.argv.slice(2);
const rootIndex = args.indexOf('--matraix-root');
const jobsIndex = args.indexOf('--jobs-dir');
const dryRun = args.includes('--dry-run');

if (rootIndex === -1 || !args[rootIndex + 1] || jobsIndex === -1 || !args[jobsIndex + 1]) {
  throw new Error(
    'Usage: node run-study.mjs --matraix-root /absolute/path/to/MatrAIx-Persona-8B --jobs-dir /absolute/path/to/jobs [--dry-run]'
  );
}

const sourceRoot = resolve(import.meta.dirname, '..');
const templateRoot = resolve(import.meta.dirname, 'task-template');
const environmentSource = resolve(sourceRoot, 'environment');
const matraixRoot = resolve(args[rootIndex + 1]);
const jobsDir = resolve(args[jobsIndex + 1]);
const taskRoot = resolve(matraixRoot, 'application/tasks');
const environmentDestination = resolve(
  matraixRoot,
  'environment/task-environments/application/local-buyer-readiness-bridge'
);
const recipePath = resolve(matraixRoot, 'configs/jobs/cre-1763-local-buyer-readiness-study.yaml');

if (!existsSync(resolve(matraixRoot, 'pyproject.toml')) || !existsSync(taskRoot)) {
  throw new Error(`${matraixRoot} does not look like a MatrAIx checkout`);
}

function copyTemplate(source, destination, candidateId) {
  const stats = statSync(source);
  if (stats.isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const entry of readdirSync(source)) {
      copyTemplate(resolve(source, entry), resolve(destination, entry), candidateId);
    }
    return;
  }
  const sourceText = readFileSync(source, 'utf8');
  writeFileSync(destination, sourceText.replaceAll('__CANDIDATE_ID__', candidateId));
}

const destinations = candidateIds.map((candidateId) =>
  resolve(taskRoot, `local-buyer-readiness-study-${candidateId}`)
);
for (const destination of destinations) {
  if (!destination.startsWith(`${taskRoot}/`)) throw new Error(`Refusing to copy outside ${taskRoot}`);
  if (existsSync(destination)) throw new Error(`${destination} already exists; choose a fresh MatrAIx checkout`);
}
if (existsSync(recipePath)) throw new Error(`${recipePath} already exists; choose a fresh MatrAIx checkout`);

const recipe = `job_name: cre-1763-local-buyer-readiness-study\njobs_dir: ${JSON.stringify(jobsDir)}\nn_attempts: 1\nn_concurrent_trials: 3\ntimeout_multiplier: 1.0\nquiet: false\n\nenvironment:\n  type: docker\n  delete: true\n\nagents:\n${personaIds
  .map(
    (personaId) => `  - name: persona-codex\n    model_name: openai/gpt-5.4\n    kwargs:\n      persona_path: persona/datasets/matraix-persona-dev-sample/persona_${personaId}.yaml\n      reasoning_effort: low\n    env:\n      CODEX_FORCE_AUTH_JSON: "true"\n      HTTPS_PROXY: http://llm-bridge:8000\n      NO_PROXY: agency-bridge,llm-bridge,localhost,127.0.0.1`
  )
  .join('\n')}\n\ntasks:\n${candidateIds
  .map((candidateId) => `  - path: application/tasks/local-buyer-readiness-study-${candidateId}`)
  .join('\n')}\n\nartifacts:\n  - /app/output\n`;

console.log(`${dryRun ? 'Would install' : 'Installing'} ${candidateIds.length} local study tasks into ${taskRoot}`);
console.log(`${dryRun ? 'Would write' : 'Writing'} ${recipePath}`);
if (!dryRun) {
  if (!existsSync(environmentDestination)) {
    mkdirSync(dirname(environmentDestination), { recursive: true });
    cpSync(environmentSource, environmentDestination, { recursive: true, errorOnExist: true });
  }
  for (const [index, candidateId] of candidateIds.entries()) {
    copyTemplate(templateRoot, destinations[index], candidateId);
  }
  mkdirSync(dirname(recipePath), { recursive: true });
  writeFileSync(recipePath, recipe);
}

console.log(`Run next: cd ${matraixRoot} && uv run harbor run -c ${recipePath}`);
