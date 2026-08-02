import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const repoRoot = resolve(import.meta.dirname, '../..');

const openings = {
  ltd: {
    source: 'packages/ltd/src/routes/+page.svelte',
    study: 'paperCanonSheetMedia'
  },
  io: {
    source: 'packages/io/src/routes/+page.svelte',
    study: 'paperResearchTraceMedia'
  },
  space: {
    source: 'packages/space/src/routes/+page.svelte',
    study: 'paperPrototypeScoreMedia'
  },
  agency: {
    source: 'packages/agency/src/routes/+page.svelte',
    study: 'paperPressureHandoffMedia'
  },
  learn: {
    source: 'packages/lms/src/routes/+page.svelte',
    study: 'paperLearningSequenceMedia'
  }
} as const;

test('every public property opening adopts its assigned Paper material study', () => {
  for (const [property, opening] of Object.entries(openings)) {
    const source = readFileSync(resolve(repoRoot, opening.source), 'utf8');

    assert.match(source, new RegExp(`media\\s*=\\s*{${opening.study}}`), `${property} Paper media`);
    assert.match(source, /mode="paper"/, `${property} Paper opening mode`);
    assert.doesNotMatch(
      source,
      /controlledFlowMedia|pressureBoundaryMedia|traceControlPlaneMedia/,
      `${property} primary opening must not retain shared water media`
    );
  }
});
