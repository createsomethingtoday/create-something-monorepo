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
  assert.match(mapRoute, /Bring the workflow. Decide the next step./);
  assert.match(mapRoute, /href="\/map\/workspace"/);
  assert.match(mapRoute, /src="https:\/\/draw\.createsomething\.agency\/\?embed=agency"/);
  assert.match(mapRoute, /title="Draw — CREATE SOMETHING workflow mapping canvas"/);
  assert.match(mapRoute, /allow="clipboard-write"/);
  assert.doesNotMatch(mapRoute, /<PublicAtlasCanvas/);
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

const mapHero = read('../src/lib/components/AgencyMapHero.svelte');
const pageTreatment = read('../static/styles/agency/page-treatment.css');

test('Map hero removes the orphan working brief and its reserved grid row', () => {
  assert.doesNotMatch(mapHero, /class="handoff"|map-brief-title|const brief|\.handoff|FileCheck2|Workflow,/);
  assert.doesNotMatch(pageTreatment, /\.map-page[^{}]*\.handoff/);
  assert.match(pageTreatment, /hero-bottom\{[^}]*grid-row:2/);
  assert.match(pageTreatment, /@media\(max-width:800px\)[^\n]*hero-bottom\{grid-row:3\}/);
  assert.match(mapHero, /\.hero-layout \{ display: block;/);
  assert.match(mapHero, /\.hero-copy \{[^}]*max-width: 52ch;/);
});

test('Map hero retains its actions, browser-local terms and approval strip', () => {
  assert.match(mapHero, /See the work before you automate it\./);
  assert.match(mapHero, /class="lede"/);
  assert.match(mapHero, /href="#canvas">Map in Draw/);
  assert.match(mapHero, /workflowMappingSessionHref}>Talk through the workflow/);
  assert.match(mapHero, /Your draft stays in this browser; export a copy or choose to publish a view-only link\./);
  assert.match(mapHero, /Draw \/ Working canvas/);
  assert.match(mapHero, /Human approval/);
  assert.match(mapHero, /href="#canvas">Start mapping/);
});
