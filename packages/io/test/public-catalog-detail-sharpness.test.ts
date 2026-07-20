import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');

test('migrates the complete catalog detail family as one bounded cohort', () => {
  const group = performancePageRegistry.find((entry) => entry.id === 'io-catalog-details');

  assert.equal(group?.status, 'migrated');
  assert.deepEqual(group?.sources, [
    'packages/io/src/routes/agents/[slug]/+page.svelte',
    'packages/io/src/routes/category/[slug]/+page.svelte',
    'packages/io/src/routes/mcp/[slug]/+page.svelte',
    'packages/io/src/routes/plugins/[slug]/+page.svelte'
  ]);
});

test('uses one shared opening and one shared trust-detail composition', () => {
  const trustDetail = read('packages/io/src/lib/components/catalog/CatalogTrustDetail.svelte');

  assert.match(trustDetail, /CatalogDetailOpening/);
  assert.equal(count(read(route('agents')), '<CatalogTrustDetail'), 1);
  assert.equal(count(read(route('mcp')), '<CatalogTrustDetail'), 1);

  for (const detail of ['category', 'plugins'] as const) {
    assert.match(read(route(detail)), /CatalogDetailOpening/);
    assert.equal(count(read(route(detail)), '<CatalogDetailOpening'), 1);
  }
});

test('keeps the complete trust record beneath three reader-facing chapters', () => {
  const detail = read('packages/io/src/lib/components/catalog/CatalogTrustDetail.svelte');

  assert.equal(count(detail, 'class="catalog-detail-chapter"'), 3);
  for (const field of [
    'card.description',
    'card.status',
    'card.accessModel',
    'card.authModel',
    'card.transport',
    'card.toolCount',
    'card.url',
    'card.riskSummary',
    'card.policyPack',
    'card.evalSuite',
    'card.evalStatus',
    'card.requiredChecks',
    'card.lastVerifiedDate',
    'card.evidenceRef',
    'card.evidenceSummary',
    'card.observability',
    'card.runtimeObservability',
    'card.externalListings',
    'card.samples',
    'card.limitations',
    'card.escalation',
    'card.installSnippets',
    'card.sourceRefs'
  ]) {
    assert.ok(detail.includes(field), `shared trust detail lost ${field}`);
  }

  assert.doesNotMatch(detail, /<h2>Risk Summary<\/h2>/);
  assert.doesNotMatch(detail, /<h2>Eval Gate<\/h2>/);
  assert.doesNotMatch(detail, /<h2>Observability<\/h2>/);
});

test('keeps plugin capability and examples inside three task chapters', () => {
  const plugin = read(route('plugins'));

  assert.equal(count(plugin, 'class="catalog-detail-chapter"'), 3);
  for (const field of [
    'plugin.description',
    'plugin.category',
    'plugin.tags',
    'plugin.features',
    'plugin.provides',
    'plugin.version',
    'plugin.lastUpdated',
    'plugin.examples',
    'relatedPlugins'
  ]) {
    assert.ok(plugin.includes(field), `plugin detail lost ${field}`);
  }
  for (const command of [
    '/plugin marketplace add createsomethingtoday/claude-plugins',
    '/plugin install ${plugin.slug}@create-something'
  ]) {
    assert.ok(plugin.includes(command), `plugin detail lost ${command}`);
  }
});

test('makes copy an enhancement while preserving selectable commands without JavaScript', () => {
  const copyField = read('packages/io/src/lib/components/catalog/CatalogCopyField.svelte');

  assert.match(copyField, /import \{[^}]*onMount[^}]*\} from 'svelte';/);
  assert.match(copyField, /let enhanced = \$state\(false\);/);
  assert.match(copyField, /onMount\(\(\) => \{\s*enhanced = true;\s*\}\);/);
  assert.match(copyField, /<pre><code>\{value\}<\/code><\/pre>/);
  assert.match(copyField, /\{#if enhanced\}[\s\S]*<button[\s\S]*aria-live="polite"/);
  assert.match(copyField, /copyState === 'copied'[\s\S]*Copied/);

  const trust = read('packages/io/src/lib/components/catalog/CatalogTrustDetail.svelte');
  const plugin = read(route('plugins'));
  assert.match(trust, /CatalogCopyField/);
  assert.match(plugin, /CatalogCopyField/);
});

test('rejects invented categories and bounds only the enhanced collection', () => {
  const loader = read('packages/io/src/routes/category/[slug]/+page.server.ts');
  const page = read(route('category'));

  assert.match(loader, /import \{ error \} from '@sveltejs\/kit';/);
  assert.match(loader, /papers\.length === 0/);
  assert.match(loader, /throw error\(404,/);

  assert.match(page, /import \{ onMount \} from 'svelte';/);
  assert.match(page, /let enhanced = \$state\(false\);/);
  assert.match(page, /enhanced \? papers\.slice\(/);
  assert.match(page, /\{#if enhanced\}[\s\S]*aria-disabled=\{showAll\}/);
  assert.match(page, /<PaperCard \{paper\}/);
  assert.match(
    read('packages/io/src/lib/config/paperCategories.ts'),
    /route: `\/papers\/\$\{meta\.slug\}`/
  );
  assert.doesNotMatch(page, /animation-delay:\s*calc\(var\(--delay/);
});

function route(name: 'agents' | 'category' | 'mcp' | 'plugins') {
  return `packages/io/src/routes/${name}/[slug]/+page.svelte`;
}

function read(path: string) {
  return readFileSync(resolve(workspaceRoot, path), 'utf8');
}

function count(value: string, token: string) {
  return value.split(token).length - 1;
}
