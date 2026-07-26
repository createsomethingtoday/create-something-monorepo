import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const editorialRoutes = [
  'ethos',
  'experiments/the-circle-closes',
  'standards',
  'taste',
  'voice'
];

test('keeps the LTD editorial, chooser, and task archetypes precise', () => {
  const editorial = performancePageRegistry.find((group) => group.id === 'ltd-editorial');
  assert.equal(editorial?.status, 'migrated');
  assert.equal(editorial?.contract?.archetype, 'editorial');
  assert.deepEqual(editorial?.sources, editorialRoutes.map(sourceForRoute));

  const indexes = performancePageRegistry.find((group) => group.id === 'ltd-canon-indexes');
  assert.ok(indexes?.sources.includes(sourceForRoute('principles')));

  const tools = performancePageRegistry.find((group) => group.id === 'ltd-public-tools');
  assert.equal(tools?.contract?.archetype, 'tool');
  assert.deepEqual(tools?.sources, ['brand', 'taste/insights'].map(sourceForRoute));
});

test('turns each long editorial argument into one focused narrative surface', () => {
  for (const route of editorialRoutes) {
    const source = readRoute(route);
    assert.equal(componentCount(source, 'PerformanceNarrativeStage'), 1, route);
  }
});

test('preserves the governing arguments, source evidence, and destinations', () => {
  const inventory: Record<string, string[]> = {
    ethos: [
      'What This Means in Practice',
      'The Principle: Less, But Better',
      'The Subtractive Triad',
      'Standards Across the Ecosystem',
      'The Automation Layer',
      'The Hermeneutic Circle',
      'https://workway.co'
    ],
    'experiments/the-circle-closes': [
      'self-audit',
      'visibility',
      'feedback',
      'IsometricAssembly',
      'item.experiments',
      'The Circle',
      'https://createsomething.ltd/ethos'
    ],
    standards: [
      'Universal Standards',
      'Platform Conviction Standard',
      'Performance Lab UI',
      'Standards Across the Ecosystem',
      'CSS Architecture',
      'Evaluation Checklist',
      '/canon/concepts/conviction-without-dependence'
    ],
    taste: [
      'Taste reference state',
      'Taste system report',
      'Current system state',
      'Performance Lab benchmark',
      'Source Channels',
      'Visual References',
      'Resources',
      'What the corpus teaches.',
      '/taste/insights',
      '/api/taste/context'
    ],
    voice: [
      'What to Do This Week',
      'Clear Communication',
      'Platform Claims',
      'How to Recognize Good Writing',
      'Five Principles',
      'Sentence Patterns',
      'Required Elements for Experiments',
      'Patterns to Transform',
      'Voice Checklist',
      'Preferred Terminology',
      'When Specificity Is Constrained',
      'Educational Voice',
      'The Hermeneutic Test',
      'The Lineage',
      'How the Masters Wrote'
    ]
  };

  for (const [route, expected] of Object.entries(inventory)) {
    const source = readRoute(route);
    for (const item of expected) assert.ok(source.includes(item), `${route} lost ${item}`);
  }
});

test('contains the experiment artifacts inside the mobile document boundary', () => {
  const experiment = readRoute('experiments/the-circle-closes');
  assert.match(experiment, /class="experiment-scene-artifact"/);
  assert.match(
    experiment,
    /\.experiment-scene-artifact\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;/s
  );
});

function componentCount(source: string, component: string) {
  return (source.match(new RegExp(`<${component}\\b`, 'g')) ?? []).length;
}

function sourceForRoute(route: string) {
  return `packages/ltd/src/routes/${route}/+page.svelte`;
}

function readRoute(route: string) {
  return readFileSync(resolve(workspaceRoot, sourceForRoute(route)), 'utf8');
}
