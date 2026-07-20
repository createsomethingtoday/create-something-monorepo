import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');

const reportRoutes = [
  'experiments/[slug]',
  'experiments/agentic-visualization',
  'experiments/awwwards-patterns',
  'experiments/hybrid-scheduling',
  'experiments/ic-mvp-pipeline',
  'experiments/kinetic-typography',
  'experiments/text-revelation'
];

const toolRoutes = [
  'experiments/agent-operations',
  'experiments/ai-native-filtering',
  'experiments/ascii-renderer',
  'experiments/canvas-interactivity',
  'experiments/data-patterns',
  'experiments/diagrams',
  'experiments/living-arena',
  'experiments/living-arena-gpu',
  'experiments/render-preview',
  'experiments/render-studio',
  'experiments/spritz',
  'visualizations/arena-scale'
];

const allRoutes = [...reportRoutes, ...toolRoutes];

const progressivelyEnhancedRoutes = [
  'experiments/ai-native-filtering',
  'experiments/ascii-renderer',
  'experiments/canvas-interactivity',
  'experiments/living-arena',
  'experiments/living-arena-gpu',
  'experiments/render-preview',
  'experiments/render-studio',
  'experiments/spritz',
  'visualizations/arena-scale'
];

test('splits the mixed experiment family into truthful migrated archetypes', () => {
  const reports = performancePageRegistry.find((group) => group.id === 'io-experiment-reports');
  assert.equal(reports?.status, 'migrated');
  assert.equal(reports?.contract?.archetype, 'editorial');
  assert.deepEqual(reports?.sources, reportRoutes.map(sourceForRoute));

  const tools = performancePageRegistry.find((group) => group.id === 'io-experiment-tools');
  assert.equal(tools?.status, 'migrated');
  assert.equal(tools?.contract?.archetype, 'tool');
  assert.deepEqual(tools?.sources, toolRoutes.map(sourceForRoute));

  assert.equal(
    performancePageRegistry.some((group) => group.id === 'io-experiments'),
    false
  );
});

test('gives every source one plain question, action, evidence test, limit, and continuation', async () => {
  const configPath = resolve(workspaceRoot, 'packages/io/src/lib/config/experimentSharpness.ts');
  assert.equal(existsSync(configPath), true, 'experiment sharpness config must exist');

  const { experimentGuides } = await import('../src/lib/config/experimentSharpness.ts');
  assert.deepEqual(Object.keys(experimentGuides).sort(), allRoutes.toSorted());

  for (const [route, guide] of Object.entries(experimentGuides)) {
    for (const field of ['question', 'action', 'evidence', 'limit', 'nextLabel', 'nextHref']) {
      assert.equal(typeof guide[field as keyof typeof guide], 'string', `${route} needs ${field}`);
      assert.ok(String(guide[field as keyof typeof guide]).trim().length > 0);
    }

    assert.doesNotMatch(
      `${guide.question} ${guide.action}`,
      /\b(agentic|MCP|Modal|Subtractive Triad|WORKWAY|Heidegger|hermeneutic|IC MVP)\b/i,
      `${route} assumes internal vocabulary before the task is clear`
    );
  }
});

test('renders the shared orientation on every source without replacing its evidence', () => {
  for (const route of allRoutes.filter((route) => route !== 'experiments/[slug]')) {
    const source = readRoute(route);
    contains(source, 'ExperimentOrientation', `${route} needs the shared orientation`);
  }

  const dynamic = readRoute('experiments/[slug]');
  contains(dynamic, 'sharpenExperiment', 'dynamic experiments need the Canon experiment path');
});

test('moves long reports behind a native full-record disclosure', () => {
  for (const route of reportRoutes.filter((route) => route !== 'experiments/[slug]')) {
    contains(readRoute(route), 'ExperimentRecord', `${route} needs a bounded full record`);
  }

  const dynamic = readRoute('experiments/[slug]');
  contains(dynamic, 'progressiveRecord', 'dynamic experiments need a native record disclosure');
});

test('removes false controls when JavaScript is unavailable', () => {
  for (const route of progressivelyEnhancedRoutes) {
    const source = readRoute(route);
    contains(source, 'ProgressiveExperiment', `${route} needs a truthful no-JavaScript state`);
    contains(source, 'fallback=', `${route} needs an explicit no-JavaScript fallback`);
  }

  const dynamic = readRoute('experiments/[slug]');
  contains(
    dynamic,
    'progressiveActions',
    'dynamic copy and page actions must enhance progressively'
  );
});

test('distinguishes unavailable Agent Operations data from successful runs', () => {
  const server = read('packages/io/src/routes/experiments/agent-operations/+page.server.ts');
  const page = readRoute('experiments/agent-operations');

  contains(server, 'dataAvailability');
  lacks(page, /totalRuns > 0 \? .* : 100/s, 'zero runs must not become 100% success');
  assert.ok(/Data unavailable|No runs recorded/.test(page), 'the empty state must tell the truth');
});

test('repairs the observed Living Arena and Arena Scale runtime defects', () => {
  const living = readRoute('experiments/living-arena');
  const scale = readRoute('visualizations/arena-scale');

  lacks(living, /<rect[^>]*width="auto"/, 'Living Arena has an invalid SVG width');
  assert.ok(
    /-webkit-text-fill-color:\s*currentColor/.test(living),
    'the Living Arena title needs a visible fallback'
  );
  contains(living, 'prefers-reduced-motion', 'Living Arena must honor reduced motion');

  assert.ok(/\bSEO\b/.test(scale), 'Arena Scale needs route-specific metadata');
  assert.ok(
    /-webkit-text-fill-color:\s*(?:currentColor|#111)/.test(scale),
    'the Arena Scale title needs a visible fallback'
  );
  contains(scale, 'prefers-reduced-motion', 'Arena Scale must honor reduced motion');
  contains(scale, 'cancelAnimationFrame', 'Arena Scale must stop its animation loop');
});

test('preserves every registered source and representative evidence', () => {
  assert.equal(allRoutes.length, 19);
  assert.equal(new Set(allRoutes).size, 19);

  const inventory: Record<string, string[]> = {
    'experiments/[slug]': ['ResearchArtifactPage', 'validateCompletionToken'],
    'experiments/agent-operations': ['Total Runs (7d)', 'Recent Incidents'],
    'experiments/agentic-visualization': ['Comparative Trends', 'Integrated Comparison Dashboard'],
    'experiments/ai-native-filtering': ['Natural language product filtering', 'Bidirectional Sync'],
    'experiments/ascii-renderer': ['6D character matching', 'Contrast Enhancement'],
    'experiments/awwwards-patterns': ['Scale + Border Progression', 'Cascading Entrance'],
    'experiments/canvas-interactivity': ['Knowledge Graph Visualizer', 'Animation Timeline Editor'],
    'experiments/data-patterns': ['Performance Degradation', 'Error Distribution Health'],
    'experiments/diagrams': ['Flow Diagram', 'Property Theming'],
    'experiments/hybrid-scheduling': ['Modal', 'Cloudflare Workers'],
    'experiments/ic-mvp-pipeline': ['Bundle Scanner', 'The Validated Pipeline'],
    'experiments/kinetic-typography': ['Fluid Assembly', 'Evaluation'],
    'experiments/living-arena': ['safety comes first', 'Active Scenario Indicator'],
    'experiments/living-arena-gpu': ['8,000', 'panic spreading'],
    'experiments/render-preview': ['ControlNet Conditioning', 'Validation Result'],
    'experiments/render-studio': ['Floor Plan Editor', 'Render Preview'],
    'experiments/spritz': ['Optimal Recognition Point', 'Start at 200 WPM'],
    'experiments/text-revelation': ['Progressive Erasure', 'We remove what obscures'],
    'visualizations/arena-scale': ['No-Show Recovery', 'Financial Freedom Through Pattern Leverage']
  };

  for (const [route, expected] of Object.entries(inventory)) {
    const source = readRoute(route);
    for (const item of expected) {
      assert.ok(source.includes(item), `${route} lost ${item}`);
    }
  }
});

function sourceForRoute(route: string) {
  return `packages/io/src/routes/${route}/+page.svelte`;
}

function readRoute(route: string) {
  return read(sourceForRoute(route));
}

function read(path: string) {
  return readFileSync(resolve(workspaceRoot, path), 'utf8');
}

function contains(source: string, expected: string, message = `source needs ${expected}`) {
  assert.ok(source.includes(expected), message);
}

function lacks(source: string, pattern: RegExp, message: string) {
  assert.equal(pattern.test(source), false, message);
}
