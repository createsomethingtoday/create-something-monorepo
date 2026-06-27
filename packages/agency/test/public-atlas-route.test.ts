import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const atlasRoute = readFileSync(new URL('../src/routes/atlas/+page.svelte', import.meta.url), 'utf8');
const servicesRoute = readFileSync(
	new URL('../src/routes/services/+page.svelte', import.meta.url),
	'utf8'
);
const methodologyRoute = readFileSync(
	new URL('../src/routes/methodology/+page.svelte', import.meta.url),
	'utf8'
);
const stackRoute = readFileSync(new URL('../src/routes/stack/+page.svelte', import.meta.url), 'utf8');
const productsRoute = readFileSync(
	new URL('../src/routes/products/+page.svelte', import.meta.url),
	'utf8'
);
const storyCanvasComponent = readFileSync(
	new URL('../src/lib/components/PublicAtlasStoryCanvas.svelte', import.meta.url),
	'utf8'
);
const flowComponent = readFileSync(
	new URL('../src/lib/components/PublicAtlasFlow.svelte', import.meta.url),
	'utf8'
);
const agencyReadme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const agencyPackage = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
	dependencies?: Record<string, string>;
};

test('atlas route presents the story canvas before the editable canvas', () => {
	const storyCanvasIndex = atlasRoute.indexOf('<PublicAtlasStoryCanvas');
	const editableCanvasIndex = atlasRoute.indexOf('<PublicAtlasCanvas');

	assert.notEqual(storyCanvasIndex, -1);
	assert.notEqual(editableCanvasIndex, -1);
	assert.ok(storyCanvasIndex < editableCanvasIndex);
	assert.ok(atlasRoute.includes('starterId="marketplace-review-queue"'));
	assert.ok(atlasRoute.includes('storyId="atlas-page-marketplace-review-story"'));
	assert.ok(atlasRoute.includes('bookingHref="/book"'));
});

test('atlas route labels the story and mapping surfaces distinctly', () => {
	assert.ok(atlasRoute.includes('eyebrow="Atlas story"'));
	assert.ok(atlasRoute.includes('same graph contract'));
	assert.ok(atlasRoute.includes('eyebrow="Public mapping surface"'));
	assert.ok(atlasRoute.includes('The canvas turns curiosity into booking context.'));
});

test('services route introduces the public Atlas canvas with the story artifact', () => {
	const storyCanvasIndex = servicesRoute.indexOf('<PublicAtlasStoryCanvas');
	const editableCanvasIndex = servicesRoute.indexOf('<PublicAtlasCanvas');

	assert.notEqual(storyCanvasIndex, -1);
	assert.notEqual(editableCanvasIndex, -1);
	assert.ok(storyCanvasIndex < editableCanvasIndex);
	assert.ok(servicesRoute.includes('starterId="marketplace-review-queue"'));
	assert.ok(servicesRoute.includes('storyId="services-marketplace-review-story"'));
	assert.ok(servicesRoute.includes('compact'));
});

test('methodology route uses a read-only story canvas to explain the method', () => {
	assert.ok(methodologyRoute.includes('<PublicAtlasStoryCanvas'));
	assert.ok(methodologyRoute.includes('starterId="revops-lead-handoff"'));
	assert.ok(methodologyRoute.includes('storyId="methodology-revops-lead-handoff-story"'));
	assert.ok(methodologyRoute.includes('eyebrow="Method canvas"'));
	assert.equal(methodologyRoute.includes('<PublicAtlasCanvas'), false);
});

test('stack route uses a read-only story canvas to explain the boundary', () => {
	assert.ok(stackRoute.includes('<PublicAtlasStoryCanvas'));
	assert.ok(stackRoute.includes('starterId="insurance-claims-intake"'));
	assert.ok(stackRoute.includes('storyId="stack-insurance-claims-intake-story"'));
	assert.ok(stackRoute.includes('eyebrow="Stack boundary canvas"'));
	assert.equal(stackRoute.includes('<PublicAtlasCanvas'), false);
});

test('products route uses a read-only story canvas to explain proof', () => {
	assert.ok(productsRoute.includes('<PublicAtlasStoryCanvas'));
	assert.ok(productsRoute.includes('starterId="construction-rfi-submittal-control"'));
	assert.ok(productsRoute.includes('storyId="products-construction-proof-story"'));
	assert.ok(productsRoute.includes('eyebrow="Proof canvas"'));
	assert.equal(productsRoute.includes('<PublicAtlasCanvas'), false);
});

test('story canvas uses stable overridable ids instead of fixed DOM ids', () => {
	assert.ok(storyCanvasComponent.includes('export let storyId'));
	assert.ok(storyCanvasComponent.includes('aria-labelledby={titleId}'));
	assert.ok(storyCanvasComponent.includes('id={titleId}'));
	assert.ok(storyCanvasComponent.includes('data-motion-cue={chapter.motionCue}'));
	assert.equal(storyCanvasComponent.includes('aria-labelledby="atlas-story-title"'), false);
	assert.equal(storyCanvasComponent.includes('id="atlas-story-title"'), false);
	assert.equal(storyCanvasComponent.includes('<small>{chapter.motionCue}</small>'), false);
});

test('story canvas reuses the shared Svelte Flow renderer in read-only mode', () => {
	assert.ok(storyCanvasComponent.includes("import PublicAtlasFlow"));
	assert.ok(storyCanvasComponent.includes('<PublicAtlasFlow'));
	assert.ok(storyCanvasComponent.includes('readOnly'));
	assert.ok(storyCanvasComponent.includes('Drag to pan the Atlas canvas'));
	assert.ok(storyCanvasComponent.includes('Edges stay attached'));
	assert.ok(storyCanvasComponent.includes('<span>Atlas graph</span>'));
	assert.equal(storyCanvasComponent.includes('{graph.renderer.primary}'), false);
	assert.equal(storyCanvasComponent.includes('marker-end={`url(#${arrowId})`}'), false);
	assert.equal(storyCanvasComponent.includes('class="atlas-story__map-inner"'), false);
});

test('public Atlas flow is native Svelte Flow instead of a React bridge', () => {
	assert.ok(flowComponent.includes("from '@xyflow/svelte'"));
	assert.ok(flowComponent.includes('<SvelteFlow'));
	assert.ok(flowComponent.includes('zoomOnPinch'));
	assert.ok(flowComponent.includes('panOnDrag'));
	assert.ok(flowComponent.includes('nodesDraggable={!readOnly}'));
	assert.ok(flowComponent.includes('nodesConnectable={!readOnly}'));
	assert.equal(Boolean(agencyPackage.dependencies?.['@xyflow/svelte']), true);
	assert.equal(Boolean(agencyPackage.dependencies?.['@xyflow/react']), false);
	assert.equal(Boolean(agencyPackage.dependencies?.react), false);
	assert.equal(Boolean(agencyPackage.dependencies?.['react-dom']), false);
});

test('agency README documents story canvas route usage contract', () => {
	assert.ok(agencyReadme.includes('Story-canvas usage contract'));
	assert.ok(agencyReadme.includes('Pass an explicit `storyId`'));
	assert.ok(agencyReadme.includes('Keep the story canvas before the editable canvas'));
	assert.ok(agencyReadme.includes('`/methodology`, `/stack`, and `/products` can use the same story surface'));
	assert.ok(agencyReadme.includes('`data-motion-cue` attributes'));
});
