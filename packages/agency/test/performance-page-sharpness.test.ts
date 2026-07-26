import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const commercialRoutes = [
  'about',
  'cloudflare',
  'contact',
  'control',
  'partners',
  'security',
  'services',
  'stack',
  'use-cases/business',
  'use-cases/enterprise'
];

test('keeps the Agency commercial cohort precise and advances only verified commercial pages', () => {
  const cohort = performancePageRegistry.find((group) => group.id === 'agency-commercial');
  assert.ok(cohort);
  assert.equal(cohort.status, 'migrated');
  assert.deepEqual(cohort.sources, commercialRoutes.map(sourceForRoute));

  const redirect = performancePageRegistry.find((group) => group.id === 'agency-dify-redirect');
  assert.equal(redirect?.status, 'technical-exclusion');
  assert.deepEqual(redirect?.sources, [sourceForRoute('dify')]);

  const tools = performancePageRegistry.find((group) => group.id === 'agency-public-tools');
  assert.ok(tools?.sources.includes(sourceForRoute('basketball-systems-lab')));
  assert.ok(tools?.sources.includes(sourceForRoute('book')));

  const editorial = performancePageRegistry.find(
    (group) => group.id === 'agency-commercial-detail'
  );
  assert.ok(editorial?.sources.includes(sourceForRoute('methodology')));
  assert.ok(editorial?.sources.includes(sourceForRoute('practice')));
});

test('consolidates section-heavy commercial routes into one focused proof stage', () => {
  for (const route of [
    'about',
    'cloudflare',
    'control',
    'stack',
    'use-cases/business',
    'use-cases/enterprise'
  ]) {
    const source = readRoute(route);
    assert.match(source, /PerformanceNarrativeStage/, `${route} needs one focused proof stage`);
    assert.ok(
      (
        source.match(
          /<Performance(PageSection|CampaignOpening|NarrativeStage|ConversionHandoff)/g
        ) ?? []
      ).length <= 4,
      `${route} exceeds the commercial four-chapter source budget`
    );
  }
});

test('preserves the primary destinations carried by the commercial cohort', () => {
  const destinations: Record<string, string[]> = {
    about: ['/book', '/services', 'https://createsomething.ltd', 'https://createsomething.io'],
    cloudflare: ['/partners'],
    contact: ['/book'],
    control: ['mapProduct.route', '/products/signal', '/products/decision', '/products/proof'],
    partners: ['/products', '/cloudflare', '/stack'],
    security: ['/bearer-token-policy', 'mailto:legal@createsomething.io'],
    // The opening CTA moved from an in-page '#map-warmup' jump to the canonical Map
    // destination in 10e3f02b5; Map and Control routes now travel in ServicesProductPath.
    services: [
      'agencyCoreMessaging.selfMapHref',
      'agencyCoreMessaging.servicesMappingSessionHref'
    ],
    stack: ['/products', '/cloudflare'],
    'use-cases/business': [
      'agencyCoreMessaging.selfMapHref',
      'agencyCoreMessaging.workflowMappingSessionHref'
    ],
    'use-cases/enterprise': [
      'agencyCoreMessaging.selfMapHref',
      'agencyCoreMessaging.workflowMappingSessionHref'
    ]
  };

  for (const [route, expected] of Object.entries(destinations)) {
    const source = readRoute(route);
    for (const destination of expected) {
      assert.ok(source.includes(destination), `${route} lost destination ${destination}`);
    }
  }

  // Services reaches the paid spine through the product path rather than inline links,
  // so the Map and Control routes must stay on that component.
  const productPath = readFileSync(
    resolve(workspaceRoot, 'packages/agency/src/lib/components/ServicesProductPath.svelte'),
    'utf8'
  );
  for (const destination of ['mapProduct.route', 'controlProduct.route']) {
    assert.ok(
      productPath.includes(destination),
      `the services product path lost destination ${destination}`
    );
  }
});

test('preserves the complete proof inventory inside each consolidated stage', () => {
  const proofInventory: Record<string, string[]> = {
    about: [
      'Control before speed',
      'Protocols before improvisation',
      'Care leaves a record',
      'Map the operating path',
      'Classify the judgment states',
      'Ship the control layer',
      'Brief the operator',
      'Start with the cleanup loop',
      'Subtract before automating',
      'Bring the workflow and owner',
      'WORKWAY'
    ],
    cloudflare: [
      'Cloudflare Runtime Stack',
      'Remote MCP Fleet',
      'Control routes',
      'Client Review Surfaces',
      'Cloudflare route',
      'Control check',
      'Durable record',
      'Tool or API call',
      'Handoff evidence',
      'OpenAI',
      'Substrate',
      'Stack'
    ],
    control: [
      'Watch the change',
      'Route the judgment',
      'Preserve the result',
      'Operate and review month to month',
      'Keep one governed operating year',
      // 2c79c1e03 replaced the internal Substrate/Topology foundation scene with the
      // client-safe system-context scene.
      'System context',
      'See the operating boundary before work runs.'
    ],
    stack: [
      // Workflow Map stays as the plain-English deliverable; the retired parallel lane
      // names are now the Map -> Build -> Control spine.
      'Workflow Map',
      '02 Build',
      '03 Control',
      'Stack boundary',
      'Tool/API contract',
      'Policy rules',
      'Runbook',
      'Operator brief',
      'OpenAI Codex',
      'Route, compare, recover',
      'PublicAtlasStoryCanvas'
    ],
    'use-cases/business': [
      'Map the manual bridge',
      'Connect only the first handoff',
      'Add decision states',
      'Operate with receipts',
      '2-4 week implementation',
      'Roadmap after proof',
      'Ongoing control layer',
      'HubSpot pipeline pilot',
      'System audit',
      'Second connection',
      'Your team is the integration layer',
      'AI is not near the real work',
      'Zapier-style glue hit the wall'
    ],
    'use-cases/enterprise': [
      'Prompt drift',
      'Policy gaps',
      'Orphaned connections',
      'Optimization loop',
      'Orchestration',
      'Decision rules',
      'Monitoring and receipts',
      'What your systems know',
      'What your workflows do',
      'What should happen',
      'Workflow Control Core',
      'Workflow Control Growth',
      'Regulated / Multi-team',
      'Connections already run',
      'Automation touches judgment',
      'Operators need clarity'
    ]
  };

  for (const [route, expected] of Object.entries(proofInventory)) {
    const source = readRoute(route);
    for (const proof of expected) {
      assert.ok(source.includes(proof), `${route} lost proof item ${proof}`);
    }
  }
});

function sourceForRoute(route: string) {
  return `packages/agency/src/routes/${route}/+page.svelte`;
}

function readRoute(route: string) {
  return readFileSync(resolve(workspaceRoot, sourceForRoute(route)), 'utf8');
}
