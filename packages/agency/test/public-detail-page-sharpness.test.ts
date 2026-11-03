import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const productRoutes = [
  'products/decision',
  'products/ground',
  'products/loom',
  'products/proof',
  'products/signal'
];

test('registers the Agency public detail cohort as migrated editorial routes', () => {
  const group = performancePageRegistry.find(
    (candidate) => candidate.id === 'agency-public-detail'
  );
  assert.equal(group?.contract?.archetype, 'editorial');
  assert.equal(group?.status, 'migrated');
  for (const route of ['experiments/[slug]', 'arc/[slug]', 'products/decision', 'products/ground', 'products/loom', 'products/proof', 'products/signal', 'workflows/[slug]']) {
    assert.ok(group?.sources.includes(`packages/agency/src/routes/${route}/+page.svelte`), `registered editorial coverage must include ${route}`);
  }
});

test('reduces every product detail to opening, inspectable operating surface, and handoff', () => {
  const shared = readFile('packages/agency/src/lib/components/GovernanceProductPage.svelte');
  assert.equal(componentCount(shared, 'PerformancePageSection'), 1);
  assert.equal(componentCount(shared, 'PerformanceNarrativeStage'), 1);
  assert.equal(componentCount(shared, 'PerformanceConversionHandoff'), 1);

  for (const route of ['products/loom']) {
    const source = readRoute(route);
    assert.equal(componentCount(source, 'PerformanceCampaignOpening'), 1);
    assert.equal(componentCount(source, 'PerformanceNarrativeStage'), 1);
    assert.equal(componentCount(source, 'PerformanceConversionHandoff'), 1);
    assert.doesNotMatch(source, /^\s*<section\b/gm, `${route} reintroduced loose chapters`);
  }
});

test('Ground uses three native chapters with direct install and evidence anchors', () => {
  const source = readRoute('products/ground');
  assert.equal(componentCount(source, 'section'), 3);
  for (const id of ['thesis', 'evidence-body', 'continuation'])
    assert.match(source, new RegExp(`data-performance-chapter="${id}"`));
  for (const id of ['ground-operating-path', 'ground-guardrail', 'ground-proof']) {
    assert.ok(source.includes(`href="#${id}"`));
    assert.ok(source.includes(`id="${id}"`));
  }
  assert.match(source, /<details class="tool-disclosure">/);
  assert.match(source, /role="status"/);
});

test('uses an indexed stage for product decisions without hiding complete no-JavaScript content', () => {
  const shared = readFile('packages/agency/src/lib/components/GovernanceProductPage.svelte');
  assert.match(shared, /scenes={productScenes}/);
  assert.match(shared, /Surface and path/);
  assert.match(shared, /Production contract/);
  assert.match(shared, /Connected loop/);

  for (const route of productRoutes.filter((route) => route !== 'products/ground')) {
    assert.match(readRoute(route), /PerformanceNarrativeStage|GovernanceProductPage/);
  }
});

test('keeps retired experiment details as an explicit noindex research handoff', () => {
  const source = readRoute('experiments/[slug]');
  assert.match(source, /IO_EXPERIMENTS_URL/);
  assert.match(source, /noindex, nofollow/);
  assert.match(source, /Experiments live on \.io/);
  assert.doesNotMatch(source, /PerformanceNarrativeStage/);
});

test('preserves the route-owned evidence and destinations', () => {
  const inventory: Record<string, string[]> = {
    'products/ground': [
      '@createsomething/ground-mcp',
      'Check first',
      'Then claim',
      'Blocked otherwise',
      'Ground 0.4.3 measured performance',
      'ground_find_duplicate_functions',
      'Inspect the release and five-platform receipts'
    ],
    'products/loom': [
      'Linear as the source of truth',
      '@createsomething/loom-mcp',
      'Continuity matters',
      'Routing needs evidence',
      'Progress needs receipts',
      'loom_checkpoint',
      '/products/ground'
    ],
    'experiments/[slug]': ['IO_EXPERIMENTS_URL', 'noindex, nofollow', 'Browse the experiment archive.']
  };

  for (const [route, expected] of Object.entries(inventory)) {
    const source = readRoute(route);
    for (const item of expected) assert.ok(source.includes(item), `${route} lost ${item}`);
  }
});

function componentCount(source: string, component: string) {
  return (source.match(new RegExp(`<${component}\\b`, 'g')) ?? []).length;
}

function readRoute(route: string) {
  return readFile(`packages/agency/src/routes/${route}/+page.svelte`);
}

function readFile(path: string) {
  return readFileSync(resolve(workspaceRoot, path), 'utf8');
}
