import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const repoRoot = resolve(import.meta.dirname, '../..');

const paperOpenings = {
  io: {
    source: 'packages/io/src/routes/+page.svelte',
    study: 'paperResearchTraceMedia'
  },
  space: {
    source: 'packages/space/src/routes/+page.svelte',
    study: 'paperPrototypeScoreMedia'
  },
  learn: {
    source: 'packages/lms/src/routes/+page.svelte',
    study: 'paperLearningSequenceMedia'
  }
} as const;

test('Paper remains assigned to the public properties that still own it', () => {
  for (const [property, opening] of Object.entries(paperOpenings)) {
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

test('LTD uses its owned Playbook field instead of the retired Paper opening', () => {
  const source = readFileSync(resolve(repoRoot, 'packages/ltd/src/routes/+page.svelte'), 'utf8');

  assert.match(source, /media=\{ltdOperatingFieldMedia\}/);
  assert.match(source, /mode="ink"/);
  assert.doesNotMatch(source, /mode="paper"|paperCanonSheetMedia/);
});

test('Agency uses its owned Playbook campaign media instead of Paper', () => {
  const source = readFileSync(resolve(repoRoot, 'packages/agency/src/routes/+page.svelte'), 'utf8');

  assert.match(source, /media=\{playbookHomeHeroMedia\}/);
  assert.match(source, /mediaMobilePlacement="background"/);
  assert.doesNotMatch(source, /PlaybookField/);
  assert.doesNotMatch(source, /mode="paper"|paper[A-Z][A-Za-z]+Media/);
});
