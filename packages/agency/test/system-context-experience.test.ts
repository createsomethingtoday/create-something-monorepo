import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  TEMPLATE_REVIEW_SYSTEM_CONTEXT,
  getTemplateReviewSystemContext
} from '../src/lib/system-context/template-review.ts';

const controlRoute = readFileSync(new URL('../src/routes/control/+page.svelte', import.meta.url), 'utf8');
const mapRoute = readFileSync(new URL('../src/routes/map/+page.svelte', import.meta.url), 'utf8');
const fieldReportRoute = readFileSync(
  new URL('../src/routes/field-reports/template-review/+page.svelte', import.meta.url),
  'utf8'
);
const artifactComponent = readFileSync(
  new URL('../src/lib/components/SystemContextArtifact.svelte', import.meta.url),
  'utf8'
);
const publicFlow = readFileSync(
  new URL('../../canon/src/lib/atlas/AtlasFlow.svelte', import.meta.url),
  'utf8'
);
const designSource = JSON.parse(
  readFileSync(
    new URL('../../../docs/design/artifacts/template-review-operating-slice.v1.json', import.meta.url),
    'utf8'
  )
);

function visitorMarkup(source: string): string {
  return source.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
}

test('the implemented public source stays aligned with the approved design artifact', () => {
  assert.equal(TEMPLATE_REVIEW_SYSTEM_CONTEXT.id, designSource.id);
  assert.deepEqual(
    TEMPLATE_REVIEW_SYSTEM_CONTEXT.nodes.map((node) => node.id),
    designSource.nodes.map((node: { id: string }) => node.id)
  );
  assert.deepEqual(
    TEMPLATE_REVIEW_SYSTEM_CONTEXT.nodes.map((node) => node.semantics),
    designSource.nodes.map((node: { semantics: unknown }) => node.semantics)
  );
  assert.deepEqual(
    TEMPLATE_REVIEW_SYSTEM_CONTEXT.relationships.map((relationship) => relationship.id),
    designSource.relationships.map((relationship: { id: string }) => relationship.id)
  );
  assert.deepEqual(TEMPLATE_REVIEW_SYSTEM_CONTEXT.lenses, designSource.lenses);
});

test('all four lenses preserve explicit authority and deterministic public ordering', () => {
  for (const lens of ['dependencies', 'authority', 'change', 'proof'] as const) {
    const first = getTemplateReviewSystemContext(lens, '2026-07-23T00:00:00-05:00');
    const second = getTemplateReviewSystemContext(lens, '2026-07-23T00:00:00-05:00');
    assert.deepEqual(first, second);
    assert.deepEqual(first.visibleNodeIds, first.lenses[lens]);
    assert.ok(first.nodes.some((node) => node.semantics.authority === 'wait'));
  }
  const authority = getTemplateReviewSystemContext('authority', '2026-07-23T00:00:00-05:00');
  assert.ok(authority.nodes.some((node) => node.semantics.authority === 'stop'));
  assert.ok(authority.nodes.some((node) => node.semantics.authority === 'run'));
});

test('freshness becomes stale at the declared review boundary without changing coverage or authority', () => {
  const stale = getTemplateReviewSystemContext('authority', '2026-08-22T00:00:00-05:00');
  assert.equal(stale.source.freshness, 'stale');
  assert.ok(stale.nodes.every((node) => node.semantics.freshness === 'stale'));
  assert.ok(stale.nodes.some((node) => node.semantics.coverage === 'mapped' && node.semantics.authority === 'stop'));
});

test('Control, Map, and the field report adapt one public contract without adding a product or second map', () => {
  assert.match(controlRoute, /<SystemContextArtifact/);
  assert.match(controlRoute, /System context/);
  assert.match(mapRoute, /<SystemContextRail/);
  assert.equal(mapRoute.match(/<PublicAtlasCanvas/g)?.length, 1);
  assert.doesNotMatch(mapRoute, /<PublicAtlasStoryCanvas/);
  assert.match(fieldReportRoute, /<SystemContextArtifact[\s\S]*defaultLens="change"[\s\S]*readOnly=\{true\}/);
  assert.match(artifactComponent, /Dependencies/);
  assert.match(artifactComponent, /Authority/);
  assert.match(artifactComponent, /Change/);
  assert.match(artifactComponent, /Proof/);
  assert.match(artifactComponent, /No public context yet/);
  assert.match(artifactComponent, /Context unavailable/);
  assert.match(artifactComponent, /Keep work stopped/);
});

test('visitor-facing system-context markup excludes internal architecture vocabulary and diagnostic counts', () => {
  const publicMarkup = [controlRoute, mapRoute, fieldReportRoute, artifactComponent]
    .map(visitorMarkup)
    .join('\n');
  assert.doesNotMatch(publicMarkup, /\b(?:Topology|Atlas|Substrate|canvas-kernel)\b/);
  assert.doesNotMatch(publicMarkup, /\b(?:node|edge) count\b/i);
  assert.doesNotMatch(publicFlow, /canvas\.nodes\.length[\s\S]*canvas\.edges\.length/);
  assert.match(publicFlow, /contextLabel = 'Editable workflow'/);
});
