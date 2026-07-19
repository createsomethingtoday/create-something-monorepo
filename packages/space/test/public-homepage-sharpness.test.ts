import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const homeSource = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
const registrySource = readFileSync(
  new URL('../../../config/performance-pages/registry.ts', import.meta.url),
  'utf8'
);

function componentCount(name: string): number {
  return [...homeSource.matchAll(new RegExp(`<${name}(?:\\s|>)`, 'g'))].length;
}

test('the homepage uses one opening, one focused chooser, and one earned handoff', () => {
  assert.equal(componentCount('PerformanceCampaignOpening'), 1);
  assert.equal(componentCount('PerformanceNarrativeStage'), 1);
  assert.equal(componentCount('PerformanceConversionHandoff'), 1);
  for (const removedStack of [
    'PerformanceContrastChapter',
    'PerformanceThesisConditions',
    'PerformanceDecisionPanel',
    'PerformancePageSection',
    'PropertyFunnel'
  ]) {
    assert.equal(
      componentCount(removedStack),
      0,
      `${removedStack} should not remain in the landing stack`
    );
  }
});

test('the opening states the choice and gives a concrete default', () => {
  assert.match(homeSource, /Choose a live tool and test one idea\./);
  assert.match(homeSource, /Start with Code Playground/);
  assert.match(homeSource, /Compare all five/);
});

test('the focused chooser preserves every live surface and its direct destination', () => {
  for (const [title, href] of [
    ['Code Playground', '/playground'],
    ['Praxis', '/praxis'],
    ['Motion Lab', '/motion'],
    ['Data Studio', '/data/nba'],
    ['Discover', '/discover']
  ]) {
    assert.match(homeSource, new RegExp(`title: '${title}'[\\s\\S]*?href: '${href}'`));
  }
  for (const sceneId of ['run', 'inspect', 'carry-forward']) {
    assert.match(homeSource, new RegExp(`id: '${sceneId}'`));
  }
});

test('runtime proof and all three cross-property destinations survive consolidation', () => {
  for (const proof of [
    'edge-safe execution',
    'failure modes',
    'repeated or compared',
    'receiving property',
    'owner and next decision'
  ]) {
    assert.match(homeSource, new RegExp(proof, 'i'));
  }
  for (const destination of [
    'https://createsomething.io',
    'https://createsomething.agency/practice?source=space&intent=runtime-to-practice&stage=qualify&lane=workflow_infrastructure',
    'https://createsomething.ltd'
  ]) {
    assert.ok(homeSource.includes(destination), `${destination} should remain directly reachable`);
  }
});

test('the single-route homepage cohort migrates atomically', () => {
  const cohort = registrySource.match(/group\(\s*'space-home',[\s\S]*?\n\s*\),/)?.[0];
  assert.ok(cohort, 'space-home registry cohort should exist');
  assert.match(cohort, /\['\/'\],\s*'migrated'/);
});
