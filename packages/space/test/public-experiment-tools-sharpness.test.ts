import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const motionSource = readFileSync(
  new URL('../src/routes/motion/+page.svelte', import.meta.url),
  'utf8'
);
const playgroundSource = readFileSync(
  new URL('../src/routes/playground/+page.svelte', import.meta.url),
  'utf8'
);
const registrySource = readFileSync(
  new URL('../../../config/performance-pages/registry.ts', import.meta.url),
  'utf8'
);

function pageChapters(source: string): string[] {
  return [...source.matchAll(/data-page-chapter="([^"]+)"/g)].map((match) => match[1]);
}

test('each public experiment has one orientation and one uninterrupted workspace', () => {
  for (const source of [motionSource, playgroundSource]) {
    assert.deepEqual(pageChapters(source), ['orientation', 'workspace']);
    assert.doesNotMatch(source, /ascii-art/);
  }
});

test('the motion lab exposes a direct start, recovery, and announced result path', () => {
  assert.match(motionSource, /<form[^>]*onsubmit=\{analyzeMotion\}/);
  assert.match(motionSource, /type="submit"/);
  assert.match(motionSource, /if \(needsSelector && !triggerSelector\.trim\(\)\)/);
  assert.match(motionSource, /role="alert"/);
  assert.match(motionSource, /aria-live="polite"/);
  assert.match(motionSource, /Decide whether one motion helps or distracts\./);
});

test('the comparison experiment cannot invent a result from missing operator evidence', () => {
  assert.match(playgroundSource, /disabled=\{!toolCallAnswer\.trim\(\) \|\| !toolCallAttention\}/);
  assert.match(playgroundSource, /disabled=\{!codeAnswer\.trim\(\) \|\| !codeModeAttention\}/);
  assert.match(playgroundSource, /Step \{experimentStep\} of 3/);
  assert.match(playgroundSource, /aria-live="polite"/);
  assert.match(playgroundSource, /Compare where your attention goes\./);
});

test('the work surfaces contain long code and controls at mobile width', () => {
  for (const source of [motionSource, playgroundSource]) {
    assert.match(source, /min-width:\s*0/);
    assert.match(source, /max-width:\s*100%/);
  }
});

test('the complete registry cohort is migrated together', () => {
  const cohort = registrySource.match(/group\(\s*'space-experiment-tools',[\s\S]*?\n\s*\),/)?.[0];
  assert.ok(cohort, 'space-experiment-tools registry cohort should exist');
  assert.match(cohort, /\['motion', 'playground'\],\s*'migrated'/);
});
