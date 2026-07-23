import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const filmRoot = join(packageRoot, 'src/commercials/workflow-film');
const dayRoot = join(packageRoot, 'src/commercials/workflow-day-reel');
const schemaPath = join(filmRoot, 'schema.ts');
const primitivesPath = join(filmRoot, 'WorkflowFilm.tsx');
const readmePath = join(filmRoot, 'README.md');
const specPath = join(dayRoot, 'spec.ts');
const compositionPath = join(dayRoot, 'WorkflowDayReel.tsx');
const rootPath = join(packageRoot, 'src/Root.tsx');

const errors: string[] = [];

for (const [label, path] of [
  ['workflow-film schema', schemaPath],
  ['workflow-film shared renderer', primitivesPath],
  ['workflow-film authoring contract', readmePath],
  ['24-hour workflow spec', specPath],
  ['24-hour workflow composition', compositionPath]
] as const) {
  if (!existsSync(path)) errors.push(`Missing ${label}: ${path}`);
}

if (existsSync(schemaPath) && existsSync(specPath)) {
  const schemaModule = await import(pathToFileURL(schemaPath).href);
  const specModule = await import(pathToFileURL(specPath).href);
  const validate = schemaModule.validateWorkflowFilmSpec as
    | ((value: unknown) => string[])
    | undefined;
  const spec = specModule.WORKFLOW_DAY_REEL_SPEC as unknown;
  if (!validate) {
    errors.push('workflow-film schema does not export validateWorkflowFilmSpec');
  } else {
    errors.push(...validate(spec));

    type ContractProbe = {
      scenes: Array<{ start: number }>;
      events: Array<{
        actor: string;
        execution: string;
        minute: number;
        summary: string;
        receipt?: unknown;
        gate?: { onTimeout: { escalation: string } };
      }>;
    };
    const expectContractFailure = (
      label: string,
      mutate: (probe: ContractProbe) => void,
      expectedMessage: string
    ) => {
      const probe = structuredClone(spec) as ContractProbe;
      mutate(probe);
      const probeErrors = validate(probe);
      if (!probeErrors.some((error) => error.includes(expectedMessage))) {
        errors.push(`${label} probe did not fail with ${expectedMessage}`);
      }
    };

    expectContractFailure(
      'missing receipt',
      (probe) => delete probe.events[0].receipt,
      'must emit a receipt'
    );
    expectContractFailure(
      'actor/mode mismatch',
      (probe) => {
        probe.events[1].execution = 'observe';
      },
      'agent events require mcp'
    );
    expectContractFailure(
      'incomplete wait policy',
      (probe) => {
        const waiting = probe.events.find((event) => event.gate);
        if (waiting?.gate) waiting.gate.onTimeout.escalation = '';
      },
      'deadline and escalation'
    );
    expectContractFailure(
      'non-contiguous scenes',
      (probe) => {
        probe.scenes[1].start += 1;
      },
      'expected 120'
    );
    expectContractFailure(
      'incomplete time coverage',
      (probe) => {
        probe.events.at(-1)!.minute -= 1;
      },
      'span the declared day'
    );
    expectContractFailure(
      'unbounded copy',
      (probe) => {
        probe.events[0].summary = 'x'.repeat(111);
      },
      'summary exceeds 110 characters'
    );
  }

  const daySpec = spec as {
    compositionId?: string;
    workflow?: { spanMinutes?: number };
    events?: Array<{ actor?: string; state?: string }>;
    closingPromise?: string;
    callToAction?: string;
  };
  if (daySpec.compositionId !== 'CreateSomethingWorkflowDayReel') {
    errors.push('24-hour proof spec must use CreateSomethingWorkflowDayReel');
  }
  if (
    typeof daySpec.workflow?.spanMinutes !== 'number' ||
    daySpec.workflow.spanMinutes < 1425 ||
    daySpec.workflow.spanMinutes > 1440
  ) {
    errors.push('24-hour proof spec must span between 1,425 and 1,440 minutes');
  }
  for (const actor of ['system', 'agent', 'function', 'human']) {
    if (!daySpec.events?.some((event) => event.actor === actor)) {
      errors.push(`24-hour proof spec must include actor ${actor}`);
    }
  }
  for (const state of ['signal', 'running', 'waiting', 'continued', 'completed']) {
    if (!daySpec.events?.some((event) => event.state === state)) {
      errors.push(`24-hour proof spec must include state ${state}`);
    }
  }
  if (daySpec.events?.filter((event) => event.state === 'waiting').length !== 1) {
    errors.push('24-hour proof spec must contain one primary waiting event');
  }
  if (daySpec.closingPromise !== 'Agents run. Humans decide. Every step leaves proof.') {
    errors.push('24-hour proof closing promise has drifted');
  }
  if (daySpec.callToAction !== 'Control one workflow.') {
    errors.push('24-hour proof call to action has drifted');
  }
}

if (existsSync(compositionPath)) {
  const source = readFileSync(compositionPath, 'utf8');
  if (/Math\.random\(|Date\.now\(|new Date\(/.test(source)) {
    errors.push('Workflow day reel contains nondeterministic time or randomness');
  }
  for (const required of [
    'WorkflowFilm',
    'WORKFLOW_DAY_REEL_SPEC',
    'WORKFLOW_REEL_SPEC.music.asset'
  ]) {
    if (!source.includes(required)) {
      errors.push(`Workflow day reel does not consume ${required}`);
    }
  }
}

if (existsSync(rootPath)) {
  const source = readFileSync(rootPath, 'utf8');
  if (!source.includes('id="CreateSomethingWorkflowDayReel"')) {
    errors.push('Root.tsx does not register CreateSomethingWorkflowDayReel');
  }
  if (!source.includes('id="CreateSomethingWorkflowReel"')) {
    errors.push('Root.tsx no longer preserves CreateSomethingWorkflowReel');
  }
}

if (errors.length > 0) {
  console.error('workflow-film validation failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  'workflow-film validation passed: typed 24-hour run, governed wait, receipts, 900 frames'
);
