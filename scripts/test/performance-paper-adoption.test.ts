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
  learn: {
    source: 'packages/lms/src/routes/+page.svelte',
    study: 'paperLearningSequenceMedia'
  }
} as const;

test('Paper remains assigned to the public properties that still own it', () => {
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

test('Agency graduates from Paper to an owned Playbook field', () => {
  const source = readFileSync(resolve(repoRoot, 'packages/agency/src/routes/+page.svelte'), 'utf8');
  const field = readFileSync(
    resolve(repoRoot, 'packages/agency/src/lib/components/PlaybookField.svelte'),
    'utf8'
  );

  assert.match(source, /<PlaybookField variant="home"/);
  assert.match(source, /artifactOwnsMedia/);
  assert.doesNotMatch(source, /mode="paper"|paper[A-Z][A-Za-z]+Media/);
  assert.match(field, /O = owner/);
  assert.match(field, /X = opposition/);
  assert.match(field, /Ambiguity/);
  assert.match(field, /Untrusted automation/);
  assert.match(field, /AI out of reach/);
});
