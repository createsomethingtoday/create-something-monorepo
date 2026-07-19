import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';
import { buildReadingChapters } from '../src/lib/reading-compass.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const detailSources = [
  'packages/ltd/src/routes/canon/[...path]/+page.svelte',
  'packages/ltd/src/routes/masters/[slug]/+page.svelte',
  'packages/ltd/src/routes/patterns/[slug]/+page.svelte'
];

test('migrates the complete LTD canonical detail family as one editorial system', () => {
  const group = performancePageRegistry.find((entry) => entry.id === 'ltd-canon-details');

  assert.equal(group?.status, 'migrated');
  assert.equal(group?.contract?.archetype, 'editorial');
  assert.deepEqual(group?.sources, detailSources);
});

test('keeps markdown entries direct while adding one contained reading compass', () => {
  const layout = read('packages/ltd/src/lib/layouts/MarkdownLayout.svelte');
  const compass = read('packages/ltd/src/lib/components/canon/CanonReadingCompass.svelte');

  assert.equal(componentCount(layout, 'CanonReadingCompass'), 1);
  assert.match(layout, /<article[^>]+data-canon-reading/s);
  assert.match(compass, /article\[data-canon-reading\] h2/);
  assert.match(compass, /aria-label="Article chapters"/);
  assert.match(compass, /overflow-x:\s*auto/);
  assert.match(compass, /scrollTo\(\{ left, behavior: 'auto' \}\)/);
  assert.match(compass, /scrollIntoView\(\{ behavior: 'instant' as ScrollBehavior \}\)/);
  assert.match(layout, /\.prose-ltd code[\s\S]+overflow-wrap:\s*anywhere/);
});

test('builds stable unique chapter anchors without changing source order', () => {
  assert.deepEqual(
    buildReadingChapters([
      { label: 'Definition', id: '' },
      { label: 'In Practice', id: 'practice' },
      { label: 'Definition', id: '' }
    ]),
    [
      { label: 'Definition', id: 'definition' },
      { label: 'In Practice', id: 'practice' },
      { label: 'Definition', id: 'definition-2' }
    ]
  );
});

test('keeps pattern examples below the one page-level heading', () => {
  const crystallization = read('packages/ltd/src/lib/content/patterns/crystallization.md');

  assert.doesNotMatch(crystallization, /^#\s+/m);
  for (const label of ['Legal domain example', 'Auto-discovers config', 'Explicit config']) {
    assert.ok(crystallization.includes(label), `lost ${label}`);
  }
});

test('concentrates each master profile into context, principles, and evidence', () => {
  const source = read('packages/ltd/src/routes/masters/[slug]/+page.svelte');

  assert.equal(componentCount(source, 'PerformanceNarrativeStage'), 1);
  assert.equal(componentCount(source, 'PerformanceActionFooter'), 1);
  for (const scene of ["id: 'context'", "id: 'principles'", "id: 'evidence'"]) {
    assert.ok(source.includes(scene), `missing ${scene}`);
  }
});

test('preserves every master source, artifact, destination, and recovery boundary', () => {
  const source = read('packages/ltd/src/routes/masters/[slug]/+page.svelte');
  const inventory = [
    'data.master?.biography',
    'data.master?.legacy',
    'data.principles',
    '<PrincipleCard',
    'data.quotes',
    '<QuoteBlock',
    'data.examples',
    'example.image_url',
    'data.resources',
    'resource.url',
    'Master Not Found',
    'href="/masters"',
    'href="/principles"'
  ];

  for (const item of inventory) assert.ok(source.includes(item), `master detail lost ${item}`);
});

function componentCount(source: string, component: string) {
  return (source.match(new RegExp(`<${component}\\b`, 'g')) ?? []).length;
}

function read(path: string) {
  return readFileSync(resolve(workspaceRoot, path), 'utf8');
}
