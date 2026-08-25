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
  assert.equal(group?.sources.length, 6);
});

test('reduces every product detail to opening, inspectable operating surface, and handoff', () => {
  const shared = readFile('packages/agency/src/lib/components/GovernanceProductPage.svelte');
  assert.equal(componentCount(shared, 'PerformancePageSection'), 1);
  assert.equal(componentCount(shared, 'PerformanceNarrativeStage'), 1);
  assert.equal(componentCount(shared, 'PerformanceConversionHandoff'), 1);

  for (const route of ['products/ground', 'products/loom']) {
    const source = readRoute(route);
    assert.equal(componentCount(source, 'PerformanceCampaignOpening'), 1);
    assert.equal(componentCount(source, 'PerformanceNarrativeStage'), 1);
    assert.equal(componentCount(source, 'PerformanceConversionHandoff'), 1);
    assert.doesNotMatch(source, /^\s*<section\b/gm, `${route} reintroduced loose chapters`);
  }
});

test('uses an indexed stage for product decisions without hiding complete no-JavaScript content', () => {
  const shared = readFile('packages/agency/src/lib/components/GovernanceProductPage.svelte');
  assert.match(shared, /scenes={productScenes}/);
  assert.match(shared, /Surface and path/);
  assert.match(shared, /Production contract/);
  assert.match(shared, /Connected loop/);

  for (const route of productRoutes) {
    assert.match(readRoute(route), /PerformanceNarrativeStage|GovernanceProductPage/);
  }
});

test('keeps experiment details as direct reading with one related-content handoff', () => {
  const source = readRoute('experiments/[slug]');
  assert.match(source, /<section class="experiment-reading"/);
  assert.match(source, /<section class="experiment-handoff"/);
  assert.match(source, /ArticleHeader/);
  assert.match(source, /ArticleContent/);
  assert.match(source, /RelatedArticles/);
  assert.doesNotMatch(source, /PerformanceNarrativeStage/);
});

test('preserves the route-owned evidence and destinations', () => {
  const inventory: Record<string, string[]> = {
    'products/ground': [
      '@createsomething/ground-mcp',
      'Check first',
      'Then claim',
      'Blocked otherwise',
      '155 scripts became 13',
      'ground_find_duplicate_functions',
      'https://createsomething.io/papers/kickstand-triad-audit'
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
    'experiments/[slug]': ['paper.title', 'ArticleContent', 'relatedPapers', '/experiments']
  };

  for (const [route, expected] of Object.entries(inventory)) {
    const source = readRoute(route);
    for (const item of expected) assert.ok(source.includes(item), `${route} lost ${item}`);
  }
});

test('grounds the Ground opening in its compare, stop, and receipt workflow', () => {
  const source = readRoute('products/ground');

  assert.match(source, /ground-verification-instrument\.webp/);
  assert.match(source, /ground-verification-instrument-mobile\.webp/);
  assert.match(
    source,
    /Two code artifacts feed a comparison ring while an unverified claim is stopped and a proof receipt exits/
  );
  assert.doesNotMatch(source, /pressure-boundary-natural/);
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
