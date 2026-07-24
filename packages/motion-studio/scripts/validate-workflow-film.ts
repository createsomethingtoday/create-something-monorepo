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
const scoreGeneratorPath = join(packageRoot, 'scripts/generate-workflow-score.ts');
const packageJsonPath = join(packageRoot, 'package.json');
const rootPath = join(packageRoot, 'src/Root.tsx');

const errors: string[] = [];

for (const [label, path] of [
  ['workflow-film schema', schemaPath],
  ['workflow-film shared renderer', primitivesPath],
  ['workflow-film authoring contract', readmePath],
  ['24-hour workflow spec', specPath],
  ['24-hour workflow composition', compositionPath],
  ['workflow score generator', scoreGeneratorPath]
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
      durationInFrames: number;
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
      'missing provenance',
      (probe) => {
        (probe as ContractProbe & { provenance?: unknown }).provenance = undefined;
      },
      'scenario and public-treatment provenance'
    );
    expectContractFailure(
      'invalid duration',
      (probe) => {
        probe.durationInFrames = 0;
      },
      'positive integer frame duration'
    );
    expectContractFailure(
      'off-grid duration',
      (probe) => {
        probe.durationInFrames = 1801;
      },
      'duration must end on the declared beat grid'
    );
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
      'expected 180'
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
    durationInFrames?: number;
    events?: Array<{ actor?: string; state?: string }>;
    scenes?: Array<{ title?: string; caption?: string }>;
    provenance?: { publicTreatment?: string; sourceArtifacts?: string[] };
    closingPromise?: string;
    callToAction?: string;
    music?: { asset?: string };
  };
  if (daySpec.compositionId !== 'CreateSomethingWorkflowDayReel') {
    errors.push('24-hour proof spec must use CreateSomethingWorkflowDayReel');
  }
  if (daySpec.durationInFrames !== 1800) {
    errors.push('24-hour proof spec must contain exactly 1,800 frames');
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
  if (!daySpec.provenance?.publicTreatment?.includes('Anonymized')) {
    errors.push('24-hour staffing proof must declare an anonymized public treatment');
  }
  for (const source of [
    'packages/agency/src/lib/delivery/abundance-context.ts',
    'evals/langfuse/dify/abundance-hub.eval.ts'
  ]) {
    if (!daySpec.provenance?.sourceArtifacts?.includes(source)) {
      errors.push(`24-hour staffing proof must cite ${source}`);
    }
  }
  const publicCopy = JSON.stringify({
    workflow: (spec as { workflow?: unknown }).workflow,
    scenes: daySpec.scenes,
    events: daySpec.events
  });
  if (/\bNPG\b|Abundance|The NP Group/i.test(publicCopy)) {
    errors.push('24-hour staffing proof must keep client identity out of public copy');
  }
  if (/Jotform|Mailchimp|WhatsApp/i.test(publicCopy)) {
    errors.push('24-hour staffing proof must not name disconnected vendors in public copy');
  }
  for (const system of ['database', 'Jobs MCP', 'funnel', 'email', 'onboarding']) {
    if (!publicCopy.toLowerCase().includes(system.toLowerCase())) {
      errors.push(`24-hour staffing proof must include ${system}`);
    }
  }
  if (!publicCopy.includes('send_job_to_funnel()')) {
    errors.push('24-hour staffing proof must preserve the confirmation-gated funnel function');
  }
  if (!publicCopy.includes('remains unsent')) {
    errors.push('24-hour staffing proof must keep disconnected outbound email unsent');
  }
  if (daySpec.closingPromise !== 'Agents run. Humans decide. Every step leaves proof.') {
    errors.push('24-hour proof closing promise has drifted');
  }
  if (daySpec.callToAction !== 'Control one workflow.') {
    errors.push('24-hour proof call to action has drifted');
  }
  if (daySpec.music?.asset) {
    const musicPath = join(packageRoot, 'public', daySpec.music.asset);
    if (!existsSync(musicPath)) errors.push(`Missing 60-second workflow score: ${musicPath}`);
  }
}

if (existsSync(primitivesPath)) {
  const source = readFileSync(primitivesPath, 'utf8');
  if (/EventCard[^>]*frame=\{frame\s*%/s.test(source)) {
    errors.push('Workflow event-card reveal must not modulo-wrap during a long dwell');
  }
  if (!source.includes('activeEventFrame')) {
    errors.push('Workflow event cards must use a monotonic event-relative reveal frame');
  }
  for (const required of [
    'RECEIPT_REVEAL_FRAME',
    'WorkTrace',
    'activeEventFrame >= RECEIPT_REVEAL_FRAME'
  ]) {
    if (!source.includes(required)) {
      errors.push(`Workflow event execution-to-receipt sequence does not contain ${required}`);
    }
  }
}

if (existsSync(scoreGeneratorPath)) {
  const source = readFileSync(scoreGeneratorPath, 'utf8');
  if (/Math\.random\(|Date\.now\(|new Date\(/.test(source)) {
    errors.push('Workflow score generator contains nondeterministic time or randomness');
  }
  if (/https?:\/\//.test(source)) {
    errors.push('Workflow score generator must not fetch assets over the network');
  }
  for (const forbidden of ['-stream_loop', 'atempo=', 'concat=n=']) {
    if (source.includes(forbidden)) {
      errors.push(`60-second workflow score must not use ${forbidden}`);
    }
  }
  for (const required of [
    'WORKFLOW_DAY_REEL_SPEC',
    "process.argv.includes('--day')",
    'daySections',
    'dayPianoNotes'
  ]) {
    if (!source.includes(required)) {
      errors.push(`60-second workflow score path does not contain ${required}`);
    }
  }
}

if (existsSync(packageJsonPath)) {
  const source = readFileSync(packageJsonPath, 'utf8');
  if (!source.includes('generate:workflow-day-score')) {
    errors.push('Motion Studio does not register generate:workflow-day-score');
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
    'WORKFLOW_DAY_REEL_SPEC.music.asset'
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
  'workflow-film validation passed: typed 24-hour run, governed wait, receipts, 1,800 frames'
);
