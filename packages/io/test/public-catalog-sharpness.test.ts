import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const routes = ['agents', 'categories', 'experiments', 'mcp', 'papers', 'plugins'] as const;

test('migrates the complete IO catalog family as one bounded cohort', () => {
  const group = performancePageRegistry.find((entry) => entry.id === 'io-catalogs');

  assert.equal(group?.status, 'migrated');
  assert.deepEqual(group?.sources, routes.map(source));
});

test('gives every catalog one shared orientation and one locally owned collection surface', () => {
  for (const route of routes) {
    const page = read(source(route));

    if (route === 'agents' || route === 'mcp') {
      assert.match(
        page,
        /import TrustCatalog from '\$lib\/components\/catalog\/TrustCatalog\.svelte';/
      );
      assert.equal(count(page, '<TrustCatalog'), 1, `${route} needs one trust catalog`);
    } else {
      assert.match(
        page,
        /import CatalogOpening from '\$lib\/components\/catalog\/CatalogOpening\.svelte';/
      );
      assert.equal(count(page, '<CatalogOpening'), 1, `${route} needs one shared opening`);
      assert.equal(count(page, 'class="io-catalog-collection'), 1, `${route} needs one collection`);
    }
  }

  const trustCatalog = read('packages/io/src/lib/components/catalog/TrustCatalog.svelte');
  assert.equal(count(trustCatalog, '<CatalogOpening'), 1);
  assert.equal(count(trustCatalog, 'class="io-catalog-collection'), 1);
});

test('keeps filters and installation guidance inside the collection rather than as competing chapters', () => {
  for (const route of ['agents', 'mcp'] as const) {
    assert.doesNotMatch(read(source(route)), /<section class="filters">/);
  }

  const plugins = read(source('plugins'));
  assert.doesNotMatch(plugins, /<section class="py-12 px-6 border-b border-border-default">/);
  assert.ok(plugins.indexOf('class="quick-start"') > plugins.indexOf('io-catalog-collection'));
});

test('bounds long enhanced collections while preserving the complete no-JavaScript catalog', () => {
  for (const route of ['experiments', 'papers'] as const) {
    const page = read(source(route));

    assert.match(page, /import \{ onMount \} from 'svelte';/);
    assert.match(page, /let enhanced = \$state\(false\);/);
    assert.match(page, /onMount\(\(\) => \(enhanced = true\)\);/);
    assert.match(page, /enhanced\s*\?[^:]+\.slice\(/s);
    assert.match(page, /\{#if enhanced && totalPages > 1\}/);
  }
});

test('keeps the whole catalog family directly reachable from every opening', () => {
  const opening = read('packages/io/src/lib/components/catalog/CatalogOpening.svelte');

  for (const route of routes) {
    assert.match(opening, new RegExp(`href: '/${route}'`));
  }
  assert.match(opening, /aria-current=/);
  assert.match(opening, /scroll-snap-type:\s*x proximity/);
});

test('preserves the complete route-owned artifact inventories and destinations', () => {
  for (const [route, tokens] of Object.entries({
    agents: ['TrustCatalog', 'cards', 'statuses'],
    categories: ['categories as category', '/category/{category.slug}', 'category.count'],
    experiments: ['filteredAndSortedPapers', 'PapersGrid', 'Clear filters'],
    mcp: ['TrustCatalog', 'cards', 'statuses'],
    papers: ['paginatedPapers', '/papers/{paper.slug}', 'Clear filters'],
    plugins: ['filteredPlugins', 'PluginCard', 'marketplaceCommand', 'installAllCommand']
  })) {
    const page = read(source(route));
    for (const token of tokens) assert.ok(page.includes(token), `${route} lost ${token}`);
  }

  const trustCatalog = read('packages/io/src/lib/components/catalog/TrustCatalog.svelte');
  for (const token of ['filteredCards', 'card.toolCount', '`/${kind}/${card.slug}`']) {
    assert.ok(trustCatalog.includes(token), `shared trust catalog lost ${token}`);
  }

  for (const [route, loader] of Object.entries({
    agents: 'PUBLIC_AGENT_TRUST_CARDS',
    categories: 'getCatalogPaperCategories',
    experiments: 'getCatalogExperimentPapers',
    mcp: 'PUBLIC_MCP_TRUST_CARDS',
    papers: 'getPublishedPaperMetas',
    plugins: 'PLUGINS'
  })) {
    assert.ok(read(serverSource(route)).includes(loader), `${route} lost ${loader}`);
  }
});

function source(route: string) {
  return `packages/io/src/routes/${route}/+page.svelte`;
}

function serverSource(route: string) {
  return `packages/io/src/routes/${route}/+page.server.ts`;
}

function read(path: string) {
  return readFileSync(resolve(workspaceRoot, path), 'utf8');
}

function count(value: string, token: string) {
  return value.split(token).length - 1;
}
