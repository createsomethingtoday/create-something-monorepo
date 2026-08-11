import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const editorialRoutes = [
  'bearer-token-policy',
  'field-reports/template-review',
  'field-reports/upstream-contributions',
  'methodology',
  'practice',
  'proof/marketplace-workflow'
];

test('keeps Agency editorial, delivery, and archived redirect archetypes precise', () => {
  const editorial = performancePageRegistry.find(
    (group) => group.id === 'agency-commercial-detail'
  );
  assert.equal(editorial?.status, 'migrated');
  assert.deepEqual(editorial?.sources, editorialRoutes.map(sourceForRoute));

  const deliveryIndex = performancePageRegistry.find(
    (group) => group.id === 'agency-delivery-index'
  );
  assert.equal(deliveryIndex?.contract?.archetype, 'index');
  assert.deepEqual(deliveryIndex?.sources, [sourceForRoute('delivery')]);

  const deliveryTool = performancePageRegistry.find((group) => group.id === 'agency-delivery-tool');
  assert.equal(deliveryTool?.contract?.archetype, 'tool');
  assert.deepEqual(deliveryTool?.sources, [sourceForRoute('delivery/abundance')]);

  const archived = performancePageRegistry.find(
    (group) => group.id === 'agency-dify-archive-redirects'
  );
  assert.equal(archived?.status, 'technical-exclusion');
  assert.deepEqual(
    archived?.sources,
    [
      'dify/agent-eval-gates',
      'dify/mcp-control-plane',
      'dify/ship-dify-app-with-mcp-tools',
      'dify/template-marketplace-proof'
    ].map(sourceForRoute)
  );
});

test('consolidates only section-heavy editorial arguments into a focused evidence stage', () => {
  for (const route of [
    'field-reports/template-review',
    'field-reports/upstream-contributions',
    'methodology',
    'practice',
    'proof/marketplace-workflow'
  ]) {
    const source = readRoute(route);
    assert.match(source, /PerformanceNarrativeStage/, `${route} needs one evidence stage`);
  }

  const policy = readRoute('bearer-token-policy');
  assert.doesNotMatch(policy, /PerformanceNarrativeStage/);
  assert.equal((policy.match(/<PerformancePageSection/g) ?? []).length, 3);
});

test('preserves editorial destinations and complete proof inventory', () => {
  const inventory: Record<string, string[]> = {
    'bearer-token-policy': [
      '/security',
      'Live entitlement at request time',
      'Regenerate on suspected compromise',
      'Access can end immediately'
    ],
    'field-reports/template-review': [
      'The collector worked. The quality judge stayed blocked.',
      'Automated judgment was not ready.',
      'Reviewer time savings are not measured.',
      'templateReviewFieldReport.sources',
      '/book'
    ],
    'field-reports/upstream-contributions': [
      'The work began with a narrow, reproducible boundary.',
      'Acceptance improved the implementation without erasing its origin.',
      'Contributor does not mean partner.',
      'upstreamContributionFieldReport.sources',
      '/field-reports'
    ],
    methodology: [
      'The Core Principle',
      'The Three Checks',
      'The Process Applied',
      'PublicAtlasStoryCanvas',
      'agencyCoreMessaging.selfMapHref',
      '/book'
    ],
    practice: [
      'Diagnose the system before changing the policy.',
      'Ten stages. Ten inspectable artifacts.',
      'Claims stay attached to state and limits.',
      'Governed Agent Delivery',
      '/map',
      '/book'
    ],
    'proof/marketplace-workflow': [
      'Spend less time rebuilding context.',
      'Describe. Map. Compile. Simulate. Pilot.',
      'The map produces artifacts for all three tiers.',
      'The same input produced the same governed bundle twice.',
      'agencyCoreMessaging.workflowMappingSessionHref'
    ]
  };

  for (const [route, expected] of Object.entries(inventory)) {
    const source = readRoute(route);
    for (const item of expected) {
      assert.ok(source.includes(item), `${route} lost ${item}`);
    }
  }
});

test('contains the no-JavaScript methodology map without hiding its fallback panel', () => {
  const methodology = readRoute('methodology');

  assert.match(methodology, /class="methodology-artifact methodology-map-artifact"/);
  assert.match(
    methodology,
    /\.methodology-map-artifact\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;/s
  );
});

function sourceForRoute(route: string) {
  return `packages/agency/src/routes/${route}/+page.svelte`;
}

function readRoute(route: string) {
  return readFileSync(resolve(workspaceRoot, sourceForRoute(route)), 'utf8');
}
