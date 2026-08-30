import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const routes = ['cumulative-state-antipattern', 'tool-betrayal'];

test('migrates exactly the two IO insight routes under the editorial contract', () => {
  const group = performancePageRegistry.find((entry) => entry.id === 'io-insights');

  assert.equal(group?.status, 'migrated');
  assert.equal(group?.contract?.archetype, 'editorial');
  assert.deepEqual(group?.sources, routes.map(sourceForRoute));
  assert.equal(
    group?.contract?.decision,
    'Recognize the operating failure and decide how to change the practice.'
  );
  assert.equal(
    group?.contract?.handoff.action,
    'Apply the intervention or read the deeper research'
  );
});

test('preserves each shareable visual and gives the standalone route a semantic title and explicit handoff', () => {
  const inventory: Record<string, string[]> = {
    'cumulative-state-antipattern': [
      'Name fields for their semantics, not their content.',
      'published >= 5',
      'published + delisted >= 5',
      "paperId: 'PAPER-2025-012'",
      "category: 'Database Design'"
    ],
    'tool-betrayal': [
      'Tools should enable, not entrap.',
      'delist low-quality work',
      'Lose submission access',
      'Keep earned access',
      "paperId: 'PAPER-2025-012'",
      "category: 'Design Philosophy'"
    ]
  };

  for (const [route, expected] of Object.entries(inventory)) {
    const source = readRoute(route);
    assert.match(source, /<h1 class="sr-only">\{insight\.principle\}<\/h1>/, route);
    assert.match(source, /sourceAction="Read the full case"/, route);
    assert.match(source, /animation=\{\{ enabled: true, trigger: 'click' \}\}/, route);
    assert.match(source, /variant="fullscreen"/, route);
    assert.match(source, /url: '\/papers\/cumulative-state-antipattern'/, route);
    for (const item of expected) assert.ok(source.includes(item), `${route} lost ${item}`);
  }
});

test('states the cumulative access consequence beside the field-semantics comparison', () => {
  const source = readRoute('cumulative-state-antipattern');

  assert.ok(source.includes('Delisting revokes access'));
  assert.ok(source.includes('Past achievement still counts'));
});

test('uses an explicit reveal control instead of turning the article into a composite button', () => {
  const component = readWorkspaceFile('packages/canon/src/lib/insights/KeyInsight.svelte');

  assert.doesNotMatch(component, /<article[\s\S]*?role=\{animation\.trigger/s);
  assert.doesNotMatch(component, /<article[\s\S]*?tabindex=\{animation\.trigger/s);
  assert.doesNotMatch(component, /<article[\s\S]*?onkeydown=/s);
  assert.match(component, /<button[\s\S]*?class:reveal-btn=\{showClickHint\}[\s\S]*?Reveal the principle[\s\S]*?<\/button>/s);
  assert.match(component, /class:toggle-btn=\{hasAnimated\}/);
  assert.match(component, /onclick=\{showClickHint \? startAnimation : toggleOriginal\}/);
  assert.match(component, /<div class="statement-region" aria-live="polite">/);
});

test('lets standalone routes label the full-case source without changing the cited destination', () => {
  const component = readWorkspaceFile('packages/canon/src/lib/insights/KeyInsight.svelte');
  const types = readWorkspaceFile('packages/canon/src/lib/insights/types.ts');

  assert.match(types, /sourceAction\?: string;/);
  assert.match(component, /sourceAction = ''/);
  assert.match(component, /\{sourceAction \? `\$\{sourceAction\}: \$\{insight\.source\.title\}` : insight\.source\.title\}/);
  assert.match(component, /href=\{insight\.source\.url\}/);
});

function sourceForRoute(route: string) {
  return `packages/io/src/routes/insights/${route}/+page.svelte`;
}

function readRoute(route: string) {
  return readWorkspaceFile(sourceForRoute(route));
}

function readWorkspaceFile(path: string) {
  return readFileSync(resolve(workspaceRoot, path), 'utf8');
}
