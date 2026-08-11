import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const indexRoutes = ['delivery', 'experiments', 'field-reports', 'products'];
const sectionComponents = [
  'PerformanceCampaignOpening',
  'PerformanceConversionHandoff',
  'PerformanceEvidenceIndex',
  'PerformanceNarrativeStage',
  'PerformancePageSection',
  'PapersGrid',
  'section'
];

test('registers the Agency public indexes as migrated index routes', () => {
  for (const id of ['agency-delivery-index', 'agency-public-index']) {
    const group = performancePageRegistry.find((candidate) => candidate.id === id);
    assert.equal(group?.contract?.archetype, 'index');
    assert.equal(group?.status, 'migrated');
  }
});

test('keeps every Agency index within the two-to-three section budget', () => {
  for (const route of indexRoutes) {
    const count = topLevelSectionCount(readRoute(route));
    assert.ok(count >= 2 && count <= 3, `${route} has ${count} top-level communication sections`);
  }
});

test('uses interaction only where the choice set benefits from focused comparison', () => {
  const products = readRoute('products');
  assert.match(products, /PerformanceNarrativeStage/);
  assert.doesNotMatch(products, /PerformanceContrastChapter|PerformancePageSection/);
  assert.match(products, /Map the workflow/);
  assert.match(products, /Build the approved system/);
  assert.match(products, /Control live operation/);
  assert.match(products, /Inspect public proof/);
  assert.match(
    products,
    /@media \(max-width: 48rem\)[\s\S]*grid-auto-flow: column;[\s\S]*overflow-x: auto;/
  );

  for (const route of ['delivery', 'experiments', 'field-reports']) {
    assert.doesNotMatch(
      readRoute(route),
      /PerformanceNarrativeStage/,
      `${route} needs direct browsing`
    );
  }
});

test('turns Delivery and Field Reports into direct, client-safe evidence indexes', () => {
  const delivery = readRoute('delivery');
  assert.match(delivery, /PerformanceCampaignOpening/);
  assert.match(delivery, /PerformanceEvidenceIndex/);
  assert.match(delivery, /PerformanceConversionHandoff/);
  assert.doesNotMatch(delivery, /DeliveryOutcomeStrip|delivery-section|routeItems|outcomeItems/);

  const reports = readRoute('field-reports');
  assert.match(reports, /PerformanceCampaignOpening/);
  assert.match(reports, /PerformanceEvidenceIndex/);
  assert.match(reports, /PerformanceConversionHandoff/);
  assert.doesNotMatch(reports, /PerformanceThesisConditions|reportConditions/);
});

test('makes Experiments a two-section collection without a duplicate site shell', () => {
  const experiments = readRoute('experiments');
  assert.match(experiments, /PerformanceCampaignOpening/);
  assert.match(experiments, /PapersGrid/);
  assert.match(experiments, />Newest</);
  assert.match(experiments, />Oldest</);
  assert.match(experiments, />Featured</);
  assert.doesNotMatch(experiments, /<nav|<footer|fixed top-0/);
});

test('preserves every primary index destination and content boundary', () => {
  const inventory: Record<string, string[]> = {
    delivery: ['/delivery/abundance', 'Client-safe only', 'Start a private workflow draft'],
    experiments: ['data.papers', 'sortBy: SortOption', 'published_at'],
    'field-reports': [
      '/field-reports/template-review',
      '/field-reports/upstream-contributions',
      'Measured',
      'Blocked',
      'Unknown'
    ],
    products: [
      'agencyCoreMessaging.selfMapHref',
      'agencyCoreMessaging.workflowMappingSessionHref',
      '/products/${product.id}',
      'PUBLIC_PRODUCT_SEQUENCE',
      'featured.map(productCard)'
    ]
  };

  for (const [route, expected] of Object.entries(inventory)) {
    const source = readRoute(route);
    for (const item of expected) assert.ok(source.includes(item), `${route} lost ${item}`);
  }
});

function topLevelSectionCount(source: string) {
  const markup = source.split('</script>')[1]?.split('<style>')[0] ?? source;
  const pattern = new RegExp(`^(\\s*)<(?:${sectionComponents.join('|')})\\b`, 'gm');
  const openings = [...markup.matchAll(pattern)].map((match) => match[1].length);
  const topLevelIndent = Math.min(...openings);
  return openings.filter((indent) => indent === topLevelIndent).length;
}

function readRoute(route: string) {
  return readFileSync(
    resolve(workspaceRoot, `packages/agency/src/routes/${route}/+page.svelte`),
    'utf8'
  );
}
