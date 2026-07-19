import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const routes = ['about', 'contact', 'docs', 'docs/ground', 'docs/loom', 'methodology'] as const;

test('migrates the complete IO orientation family as one bounded cohort', () => {
  const group = performancePageRegistry.find((entry) => entry.id === 'io-orientation');

  assert.equal(group?.status, 'migrated');
  assert.deepEqual(group?.sources, routes.map(source));
});

test('gives every orientation route one shared opening and a bounded whole-page role sequence', () => {
  for (const route of routes) {
    const page = read(source(route));
    assert.match(
      page,
      /import OrientationOpening from '\$lib\/components\/orientation\/OrientationOpening\.svelte';/
    );
    assert.equal(count(page, '<OrientationOpening'), 1, `${route} needs one shared opening`);
  }

  for (const route of ['about', 'docs/ground', 'docs/loom', 'methodology'] as const) {
    const page = read(source(route));
    assert.match(
      page,
      /import \{[^}]*PerformanceNarrativeStage[^}]*\} from '@create-something\/canon';/s
    );
    assert.equal(count(page, '<PerformanceNarrativeStage'), 1, `${route} needs one focused stage`);
    assert.equal(count(page, 'class="orientation-stage"'), 1, `${route} needs one stage chapter`);
    assert.equal(
      count(page, 'class="orientation-handoff"'),
      1,
      `${route} needs one earned handoff`
    );
  }

  for (const route of ['contact', 'docs'] as const) {
    const page = read(source(route));
    assert.doesNotMatch(page, /PerformanceNarrativeStage/);
    assert.equal(
      count(page, 'class="orientation-collection"'),
      1,
      `${route} needs one direct collection`
    );
  }
});

test('keeps the family directly reachable without turning navigation into another chapter', () => {
  const opening = read('packages/io/src/lib/components/orientation/OrientationOpening.svelte');

  for (const href of ['/about', '/methodology', '/docs', '/contact']) {
    assert.match(opening, new RegExp(`href: '${href}'`));
  }
  assert.match(opening, /aria-current=/);
  assert.match(opening, /scroll-snap-type:\s*x proximity/);
});

test('preserves route-owned evidence, capabilities, commands, and destinations', () => {
  const required: Record<(typeof routes)[number], string[]> = {
    about: [
      'Webflow',
      'WORKWAY',
      'Half Dozen',
      'Automation Infrastructure',
      'AI-Native Development',
      'System Architecture',
      'LinkedIn'
    ],
    contact: ['mailto:micah@createsomething.io', 'LinkedIn', 'GitHub'],
    docs: [
      '@createsomething/ground-mcp',
      '@createsomething/loom-mcp',
      'Duplicate detection',
      'Session checkpointing'
    ],
    'docs/ground': [
      'ground_compare',
      'ground_claim_dead_code',
      'ground_build_graph',
      'ground_analyze',
      'ground_find_drift',
      'cursor://anysphere.cursor-deeplink',
      '/papers/ground-evidence-based-claims'
    ],
    'docs/loom': [
      'loom_work',
      'loom_route',
      'loom_checkpoint',
      'loom_formulas',
      'cursor://anysphere.cursor-deeplink',
      'Linear is the source of truth',
      'historical'
    ],
    methodology: [
      'Prompts',
      'Errors',
      'Costs',
      'Interventions',
      'Real-Time Tracking',
      'Retroactive Documentation',
      'Edward R. Tufte',
      '26',
      '47',
      '12',
      '78%'
    ]
  };

  for (const route of routes) {
    const page = read(source(route));
    for (const token of required[route]) {
      assert.ok(page.includes(token), `${route} lost ${token}`);
    }
  }
});

test('does not preserve a broken methodology handoff as the next reader action', () => {
  const methodology = read(source('methodology'));

  assert.doesNotMatch(methodology, /href="\/experiments\/zoom-transcript-automation-experiment"/);
  assert.match(methodology, /href="\/experiments"/);
  assert.match(methodology, /Historical experiment/);
});

function source(route: string) {
  return `packages/io/src/routes/${route}/+page.svelte`;
}

function read(path: string) {
  return readFileSync(resolve(workspaceRoot, path), 'utf8');
}

function count(value: string, token: string) {
  return value.split(token).length - 1;
}
