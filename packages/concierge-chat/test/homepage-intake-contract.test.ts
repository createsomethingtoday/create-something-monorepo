import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { applicationProgress } from '../src/lib/site/abundance.ts';

const homeSource = readFileSync('src/routes/+page.svelte', 'utf8');
const layoutSource = readFileSync('src/routes/+layout.svelte', 'utf8');

test('candidate progress uses one shared sequence before and during an application', () => {
  assert.deepEqual(
    applicationProgress.map((step) => step.label),
    ['Start', 'Details', 'Recruiter review']
  );
  assert.match(homeSource, /\{#each applicationProgress as step, index\}/);
  assert.match(layoutSource, /\{#each applicationProgress as step, index\}/);
});

test('the homepage preserves one dominant intake action and a single browsing alternative', () => {
  assert.match(homeSource, /class="action-primary" href="\/apply"/);
  assert.match(homeSource, /class="action-secondary" href="\/jobs"/);
  assert.doesNotMatch(homeSource, /class="action-secondary" href="\/voice"/);
});
