import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { usesRouteOwnedAgencyPerformanceEnding } from '../src/lib/atlas/surface-policy.ts';

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const mapRoute = read('../src/routes/map/+page.svelte');
const publicCanvas = read('../src/lib/components/PublicAtlasCanvas.svelte');
const publicFlow = read('../src/lib/components/PublicAtlasFlow.svelte');
const canonFlow = read('../../canon/src/lib/atlas/AtlasFlow.svelte');

test('Map owns a truthful conversion ending instead of the shared self-linking fallback', () => {
  assert.equal(usesRouteOwnedAgencyPerformanceEnding('/map'), true);
  assert.match(mapRoute, /<PerformanceConversionHandoff/);
  assert.match(mapRoute, /Carry the starter sheet forward/);
  assert.match(mapRoute, /href="\/map\/workspace"/);
  assert.match(mapRoute, /map\.publicStarterLabel/);
  assert.match(mapRoute, /map\.workspaceLabel/);
});

test('the editable Map fits its complete workflow on first render and starter reset', () => {
  assert.match(publicFlow, /fitView/);
  assert.match(publicFlow, /fitViewOptions/);
  assert.match(publicCanvas, /\{#key canvas\.id\}/);
  assert.match(canonFlow, /export let fitView/);
  assert.match(canonFlow, /\{fitView\}/);
  assert.match(canonFlow, /\{fitViewOptions\}/);
});

test('public Map inputs name their real purpose and local persistence boundary', () => {
  assert.match(publicCanvas, /Work email \(optional\)/);
  assert.match(publicCanvas, /Workflow context/);
  assert.match(publicCanvas, /Saved in this browser/);
  assert.match(publicCanvas, /does not save the map/i);
});
