import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';
import { groupPrinciplesByMaster, type PrincipleIndexRecord } from '../src/lib/canon-index.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const indexRoutes = ['canon', 'masters', 'patterns', 'presentations', 'principles'];

test('migrates the complete LTD canon index family as one bounded system', () => {
  const group = performancePageRegistry.find((entry) => entry.id === 'ltd-canon-indexes');

  assert.equal(group?.status, 'migrated');
  assert.equal(group?.contract?.archetype, 'index');
  assert.deepEqual(group?.sources, indexRoutes.map(sourceForRoute));
});

test('gives every collection one shared orientation surface', () => {
  for (const route of indexRoutes) {
    const source = readRoute(route);
    assert.equal(componentCount(source, 'CanonIndexOpening'), 1, route);
  }

  const opening = readFileSync(
    resolve(workspaceRoot, 'packages/ltd/src/lib/components/canon/CanonIndexOpening.svelte'),
    'utf8'
  );
  assert.match(opening, /scrollIntoView\(\{ block: 'nearest', inline: 'center' \}\)/);
  assert.match(opening, /aria-current="page"/);
});

test('uses a contained direct-destination rail where the collection is the decision', () => {
  for (const route of ['canon', 'masters', 'patterns', 'presentations']) {
    const source = readRoute(route);
    assert.equal(componentCount(source, 'CanonCollectionRail'), 1, route);
  }

  const rail = readFileSync(
    resolve(workspaceRoot, 'packages/ltd/src/lib/components/canon/CanonCollectionRail.svelte'),
    'utf8'
  );
  assert.match(rail, /overflow-x:\s*auto/);
  assert.match(rail, /scroll-snap-type:\s*x mandatory/);
  assert.match(rail, /scroll-snap-align:\s*start/);
  assert.match(rail, /emptyMessage/);
});

test('concentrates supporting doctrine without hiding the server-rendered order', () => {
  for (const route of ['canon', 'patterns', 'principles']) {
    assert.equal(componentCount(readRoute(route), 'PerformanceNarrativeStage'), 1, route);
  }
});

test('preserves every collection destination and route-owned proof boundary', () => {
  const inventory: Record<string, string[]> = {
    canon: [
      '/canon/foundations/colors',
      '/canon/components',
      '/canon/patterns',
      '/canon/foundations/philosophy',
      'Does it already exist?',
      'Does it earn its place?',
      'Does it fit the whole?',
      'Spacing Scale',
      'Color Hierarchy'
    ],
    patterns: [
      '/patterns/constraint-as-liberation',
      '/patterns/breakdown-and-repair',
      '/patterns/iterative-reduction',
      '/patterns/functional-transparency',
      '/patterns/universal-utility',
      '/patterns/timeless-materials',
      '/patterns/negative-space',
      '/patterns/tool-complementarity',
      '/patterns/dwelling-in-tools',
      '/patterns/principled-defaults',
      '/patterns/subtractive-triad-audit',
      '/patterns/hermeneutic-spiral',
      '/patterns/code-mode',
      '/patterns/crystallization',
      'Terminal as Dwelling',
      'Anti-Patterns to Avoid',
      'Recognizing Patterns in Your Work',
      'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/terminal'
    ],
    presentations: [
      'heidegger-canon',
      'claude-code-partner',
      'beads-continuity',
      'cloudflare-edge',
      'canon-design',
      'deployment-dwelling',
      'workway',
      'hub',
      'abundance-system'
    ],
    principles: ['principlesByMaster', 'PrincipleCard', 'href: `/masters/${master.slug}`'],
    masters: ['data.masters', 'master.slug', 'master.discipline', 'master.tagline']
  };

  for (const [route, expected] of Object.entries(inventory)) {
    const source = readRoute(route);
    for (const item of expected) assert.ok(source.includes(item), `${route} lost ${item}`);
  }
});

test('keeps dynamic principle fixtures grouped in source order and preserves an empty recovery seam', () => {
  const fixture = [
    principle('rams-1', 'rams', 'Dieter Rams', 'dieter-rams', 'Useful'),
    principle('rams-2', 'rams', 'Dieter Rams', 'dieter-rams', 'Understandable'),
    principle('tufte-1', 'tufte', 'Edward R. Tufte', 'edward-tufte', 'Show the data')
  ];

  const groups = groupPrinciplesByMaster(fixture);
  assert.deepEqual(
    groups.map((group) => ({
      slug: group.slug,
      titles: group.principles.map((item) => item.title)
    })),
    [
      { slug: 'dieter-rams', titles: ['Useful', 'Understandable'] },
      { slug: 'edward-tufte', titles: ['Show the data'] }
    ]
  );
  assert.deepEqual(groupPrinciplesByMaster([]), []);
});

test('keeps every indexed markdown destination loadable', () => {
  const universalUtility = readFileSync(
    resolve(workspaceRoot, 'packages/ltd/src/lib/content/patterns/universal-utility.md'),
    'utf8'
  );

  assert.doesNotMatch(universalUtility, /^subtitle:\s*""/m);
  assert.match(universalUtility, /^subtitle:\s*>-/m);
});

function componentCount(source: string, component: string) {
  return (source.match(new RegExp(`<${component}\\b`, 'g')) ?? []).length;
}

function sourceForRoute(route: string) {
  return `packages/ltd/src/routes/${route}/+page.svelte`;
}

function readRoute(route: string) {
  return readFileSync(resolve(workspaceRoot, sourceForRoute(route)), 'utf8');
}

function principle(
  id: string,
  master_id: string,
  master_name: string,
  master_slug: string,
  title: string
): PrincipleIndexRecord {
  return { id, master_id, master_name, master_slug, title, created_at: 0 };
}
