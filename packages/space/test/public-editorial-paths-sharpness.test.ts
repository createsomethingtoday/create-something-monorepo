import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';
import { exercises } from '../src/lib/praxis/exercises.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const praxisSource = read('packages/space/src/routes/praxis/+page.svelte');
const conceptPageSource = read('packages/space/src/routes/discover/[concept]/+page.svelte');
const conceptLoadSource = read('packages/space/src/routes/discover/[concept]/+page.ts');
const conceptJourneySource = read('packages/canon/src/lib/navigation/ConceptJourney.svelte');

test('keeps the Discover concept route editorial and Praxis learning', () => {
  const editorial = performancePageRegistry.find((group) => group.id === 'space-editorial');
  assert.equal(editorial?.status, 'migrated');
  assert.equal(editorial?.contract?.archetype, 'editorial');
  assert.deepEqual(editorial?.sources, [sourceForRoute('discover/[concept]')]);

  const praxis = performancePageRegistry.find((group) => group.id === 'space-praxis-learning');
  assert.equal(praxis?.status, 'migrated');
  assert.equal(praxis?.contract?.archetype, 'learning');
  assert.deepEqual(praxis?.sources, [sourceForRoute('praxis')]);
});

test('server-renders the concept evidence without nesting a second main landmark', () => {
  assert.doesNotMatch(conceptPageSource, /<main\b/);
  assert.match(conceptPageSource, /initialStory=\{data\.initialStory\}/);
  assert.match(conceptPageSource, /href="\/discover"/);
  assert.match(conceptPageSource, /Choose another concept/);
  assert.match(conceptPageSource, /href="\/"/);
  assert.match(conceptPageSource, /Back to Workbench/);
  assert.match(
    conceptPageSource,
    /\.discover-page\s*\{[^}]*background:\s*var\(--color-performance-bg-pure\)/s
  );

  assert.match(conceptLoadSource, /load:\s*PageLoad\s*=\s*async\s*\(\{\s*params,\s*fetch\s*\}\)/);
  assert.match(conceptLoadSource, /\/story\/\$\{encodeURIComponent\(concept\)\}/);
  assert.match(conceptLoadSource, /initialStory/);
  assert.match(conceptLoadSource, /catch/);

  assert.match(conceptJourneySource, /initialStory\?:\s*ConceptStory\s*\|\s*null/);
  assert.match(conceptJourneySource, /story\?\.concept\s*===\s*concept/);
  assert.doesNotMatch(conceptJourneySource, /onMount/);
});

test('orients Praxis around one exercise and makes progress and navigation explicit', () => {
  assert.match(praxisSource, /<span class="eyebrow">Integration Praxis<\/span>/);
  assert.match(praxisSource, /<h1>Practice one integration failure at a time\.<\/h1>/);
  assert.match(
    praxisSource,
    /Fix it, run it, and use the feedback before moving on\./
  );
  assert.match(
    praxisSource,
    /Exercise \$\{currentExerciseIndex \+ 1\} of \$\{exercises\.length\}/
  );
  assert.match(praxisSource, />Previous exercise<\/button>/);
  assert.match(praxisSource, />Next exercise<\/button>/);
  assert.match(praxisSource, /<strong>DRY — unify:<\/strong>/);
  assert.match(praxisSource, /<strong>Rams — remove:<\/strong>/);
  assert.match(praxisSource, /<strong>Heidegger — reconnect:<\/strong>/);
  assert.match(
    praxisSource,
    /@media \(max-width: 1024px\)\s*\{[\s\S]*?\.content\s*\{[^}]*min-height:\s*0;/
  );
  assert.match(praxisSource, /\.panel\s*\{[^}]*padding:\s*0;/s);
});

test('preserves every Praxis exercise, behavior, evidence state, and completion handoff', () => {
  assert.deepEqual(
    exercises.map((exercise) => exercise.id),
    ['error-structure', 'timeout', 'retry', 'webhook-security', 'build-integration']
  );

  for (const required of [
    "fetch('/api/praxis/run'",
    'runCode',
    'reset',
    "navigate('prev')",
    "navigate('next')",
    'confirmReflection',
    'exercise.patternReveal.discovery',
    'exercise.patternReveal.canonicalSolution',
    'exercise.patternReveal.whyItMatters',
    'exercise.patternReveal.ramsConnection',
    'exercise.patternReveal.reference',
    'https://github.com/WORKWAYCO/WORKWAY',
    'href="/"'
  ]) {
    assert.ok(praxisSource.includes(required), `Praxis lost ${required}`);
  }
});

function sourceForRoute(route: string) {
  return `packages/space/src/routes/${route}/+page.svelte`;
}

function read(path: string) {
  return readFileSync(resolve(workspaceRoot, path), 'utf8');
}
