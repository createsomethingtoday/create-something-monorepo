import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
	AGENCY_ATLAS_PROOF_PATHS,
	AGENCY_COMPACT_PRIVACY_PATHS,
	AGENCY_DIFY_ARTICLE_PATHS,
	isAgencyAtlasProofPath,
	isAgencyDifyArticlePath,
	usesCompactAgencyPrivacyPrompt
} from '../src/lib/atlas/surface-policy.ts';

const atlasRoute = readFileSync(new URL('../src/routes/atlas/+page.svelte', import.meta.url), 'utf8');
const homeRoute = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
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
const databaseRoute = readFileSync(
	new URL('../src/routes/database/+page.svelte', import.meta.url),
	'utf8'
);
const signalProductRoute = readFileSync(
	new URL('../src/routes/products/signal/+page.svelte', import.meta.url),
	'utf8'
);
const decisionProductRoute = readFileSync(
	new URL('../src/routes/products/decision/+page.svelte', import.meta.url),
	'utf8'
);
const proofProductRoute = readFileSync(
	new URL('../src/routes/products/proof/+page.svelte', import.meta.url),
	'utf8'
);
const agencyStoryCanvasWrapper = readFileSync(
	new URL('../src/lib/components/PublicAtlasStoryCanvas.svelte', import.meta.url),
	'utf8'
);
const agencyEditableCanvas = readFileSync(
	new URL('../src/lib/components/PublicAtlasCanvas.svelte', import.meta.url),
	'utf8'
);
const agencyFlowComponent = readFileSync(
	new URL('../src/lib/components/PublicAtlasFlow.svelte', import.meta.url),
	'utf8'
);
const canonStoryCanvasComponent = readFileSync(
	new URL('../../canon/src/lib/atlas/AtlasStoryCanvas.svelte', import.meta.url),
	'utf8'
);
const canonFlowComponent = readFileSync(
	new URL('../../canon/src/lib/atlas/AtlasFlow.svelte', import.meta.url),
	'utf8'
);
const canonAtlasIndex = readFileSync(new URL('../../canon/src/lib/atlas/index.ts', import.meta.url), 'utf8');
const canonAtlasHeadless = readFileSync(new URL('../../canon/src/lib/atlas/headless.ts', import.meta.url), 'utf8');
const canonPackage = readFileSync(new URL('../../canon/package.json', import.meta.url), 'utf8');
const layoutRoute = readFileSync(new URL('../src/routes/+layout.svelte', import.meta.url), 'utf8');
const agencyReadme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

test('agency surface policy names Atlas proof and compact privacy paths', () => {
	assert.deepEqual(AGENCY_ATLAS_PROOF_PATHS, [
		'/services',
		'/atlas',
		'/methodology',
		'/stack',
		'/products',
		'/products/signal',
		'/products/decision',
		'/products/proof'
	]);
	assert.ok(AGENCY_COMPACT_PRIVACY_PATHS.includes('/'));
	assert.equal(AGENCY_DIFY_ARTICLE_PATHS.length, 4);
	assert.equal(isAgencyAtlasProofPath('/atlas/'), true);
	assert.equal(isAgencyAtlasProofPath('/book'), false);
	assert.equal(isAgencyDifyArticlePath('/dify/content-engine'), false);
	assert.equal(usesCompactAgencyPrivacyPrompt('/'), true);
	assert.equal(usesCompactAgencyPrivacyPrompt('/services'), true);
	assert.equal(usesCompactAgencyPrivacyPrompt('/dify/mcp-control-plane/'), true);
	assert.equal(usesCompactAgencyPrivacyPrompt('/contact'), false);
});

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

test('services route keeps one public Atlas map and removes the example canvas', () => {
	assert.ok(servicesRoute.includes('<PublicAtlasCanvas'));
	assert.equal(servicesRoute.includes('<PublicAtlasStoryCanvas'), false);
	assert.equal(servicesRoute.includes('storyId="services-marketplace-review-story"'), false);
	assert.equal(servicesRoute.includes('<ClearDecisionPanel'), false);
	assert.equal(servicesRoute.includes('<ClearCtaBand'), false);
	assert.equal(servicesRoute.includes('<ClearCardGrid'), false);
});

test('home route uses the same public Atlas canvas kernel as a proof object', () => {
	assert.ok(homeRoute.includes('<PublicAtlasCanvas'));
	assert.ok(homeRoute.includes('mode="proof"'));
	assert.ok(homeRoute.includes('flowId="home-atlas-proof-flow"'));
	assert.equal(homeRoute.includes('<PublicSubstrateCanvas'), false);
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

test('products route exposes the governance product contract surfaces', () => {
	assert.ok(productsRoute.includes("from '@create-something/canon/governance'"));
	assert.ok(productsRoute.includes('listGovernanceProducts'));
	assert.ok(productsRoute.includes('Signal, Decision, Map, and Proof'));
	assert.ok(productsRoute.includes("href: product.id === 'atlas' ? '/atlas' : `/products/${product.id}`"));
	assert.equal(productsRoute.includes('<PublicAtlasCanvas'), false);
});

test('database route reveals Atlas Topology and Substrate as inspectable specs', () => {
	assert.ok(databaseRoute.includes('eyebrow="Spec reveal"'));
	assert.ok(databaseRoute.includes('Substrate'));
	assert.ok(databaseRoute.includes('Topology'));
	assert.ok(databaseRoute.includes('Atlas'));
	assert.ok(databaseRoute.includes("role: 'Record truth'"));
	assert.ok(databaseRoute.includes("role: 'Relationship graph'"));
	assert.ok(databaseRoute.includes("role: 'Operator map'"));
	assert.ok(databaseRoute.includes('What went into it'));
	assert.ok(databaseRoute.includes('Database / Automation / Judgment'));
	assert.ok(databaseRoute.includes('Filter records'));
	assert.ok(databaseRoute.includes('Atlas binding'));
	assert.ok(databaseRoute.includes('Workflow action'));
	assert.ok(databaseRoute.includes('Proof receipt'));
});

test('Signal Decision and Proof product pages attach back to Atlas and each other', () => {
	for (const route of [signalProductRoute, decisionProductRoute, proofProductRoute]) {
		assert.ok(route.includes("from '@create-something/canon/governance'"));
		assert.ok(route.includes('<GovernanceProductPage'));
		assert.ok(route.includes("href: '/atlas'"));
		assert.ok(route.includes("href: '/products'"));
	}

	assert.ok(signalProductRoute.includes("getGovernanceProduct('signal')"));
	assert.ok(signalProductRoute.includes("href: '/products/decision'"));
	assert.ok(signalProductRoute.includes("href: '/products/proof'"));
	assert.ok(decisionProductRoute.includes("getGovernanceProduct('decision')"));
	assert.ok(decisionProductRoute.includes("href: '/products/signal'"));
	assert.ok(decisionProductRoute.includes("href: '/products/proof'"));
	assert.ok(proofProductRoute.includes("getGovernanceProduct('proof')"));
	assert.ok(proofProductRoute.includes("href: '/products/signal'"));
	assert.ok(proofProductRoute.includes("href: '/products/decision'"));
});

test('story canvas uses stable overridable ids instead of fixed DOM ids', () => {
	assert.ok(canonStoryCanvasComponent.includes('export let storyId'));
	assert.ok(canonStoryCanvasComponent.includes('aria-labelledby={titleId}'));
	assert.ok(canonStoryCanvasComponent.includes('id={titleId}'));
	assert.ok(canonStoryCanvasComponent.includes('<AtlasFlow'));
	assert.ok(canonStoryCanvasComponent.includes('flowId={`${storyDomId}-flow`}'));
	assert.ok(canonStoryCanvasComponent.includes('readOnly'));
	assert.ok(canonStoryCanvasComponent.includes('showControls={false}'));
	assert.ok(canonStoryCanvasComponent.includes('data-motion-cue={chapter.motionCue}'));
	assert.equal(canonStoryCanvasComponent.includes('<svg'), false);
	assert.equal(canonStoryCanvasComponent.includes('marker-end'), false);
	assert.equal(canonStoryCanvasComponent.includes('atlas-story__node'), false);
	assert.equal(canonStoryCanvasComponent.includes('aria-labelledby="atlas-story-title"'), false);
	assert.equal(canonStoryCanvasComponent.includes('id="atlas-story-title"'), false);
	assert.equal(canonStoryCanvasComponent.includes('id="atlas-story-arrow"'), false);
	assert.equal(canonStoryCanvasComponent.includes('marker-end: url("#atlas-story-arrow")'), false);
	assert.equal(canonStoryCanvasComponent.includes('<small>{chapter.motionCue}</small>'), false);
});

test('editable Atlas flow uses stable overridable ids instead of fixed DOM ids', () => {
	assert.ok(agencyEditableCanvas.includes("export let flowId = 'public-atlas-flow'"));
	assert.ok(agencyEditableCanvas.includes('{flowId}'));
	assert.ok(canonFlowComponent.includes("export let flowId = 'public-atlas-flow'"));
	assert.ok(canonFlowComponent.includes("from '@create-something/canvas-kernel'"));
	assert.ok(canonFlowComponent.includes("import('@create-something/canvas-kernel')"));
	assert.ok(canonFlowComponent.includes('data-flow-id={flowId}'));
	assert.ok(canonFlowComponent.includes('data-move-handler'));
	assert.ok(canonFlowComponent.includes('viewport: initialViewport'));
	assert.ok(canonFlowComponent.includes('fitRequest'));
	assert.ok(canonFlowComponent.includes('aria-label="Atlas workflow map"'));
	assert.equal(canonFlowComponent.includes("from '@xyflow/svelte'"), false);
	assert.equal(canonFlowComponent.includes('<SvelteFlow'), false);
	assert.equal(canonFlowComponent.includes('proOptions'), false);
	assert.equal(canonFlowComponent.includes('hideAttribution: true'), false);
	assert.equal(canonFlowComponent.includes('public-atlas-flow__surface'), false);
	assert.equal(canonFlowComponent.includes('<svg'), false);
	assert.equal(canonFlowComponent.includes('\n\t\t\tfitView\n'), false);
	assert.equal(canonFlowComponent.includes('fitViewOptions={{ padding: 0.18, minZoom: 0.2'), false);
	assert.equal(canonFlowComponent.includes('aria-label="Svelte Atlas workflow map"'), false);
	assert.equal(canonFlowComponent.includes('id="public-atlas-flow-arrow"'), false);
	assert.equal(canonFlowComponent.includes('marker-end="url(#public-atlas-flow-arrow)"'), false);
});

test('agency story canvas is a Canon wrapper over local starter maps', () => {
	assert.ok(agencyStoryCanvasWrapper.includes("from '@create-something/canon/atlas'"));
	assert.ok(agencyStoryCanvasWrapper.includes("from '@create-something/canon/atlas/headless'"));
	assert.ok(agencyStoryCanvasWrapper.includes("from '$lib/atlas/public'"));
	assert.ok(agencyStoryCanvasWrapper.includes('createPublicAtlasCanvasFromStarter(starterId)'));
	assert.ok(agencyStoryCanvasWrapper.includes('<AtlasStoryCanvas'));
	assert.ok(canonAtlasIndex.includes("export { default as AtlasStoryCanvas } from './AtlasStoryCanvas.svelte';"));
	assert.ok(canonAtlasIndex.includes("export * from './headless.js';"));
	assert.ok(canonAtlasHeadless.includes('export function createPublicAtlasGraphArtifact'));
	assert.ok(canonPackage.includes('"./atlas"'));
	assert.ok(canonPackage.includes('"./atlas/headless"'));
});

test('agency editable Atlas flow is a Canon wrapper over local intake state', () => {
	assert.ok(agencyFlowComponent.includes("from '@create-something/canon/atlas'"));
	assert.ok(agencyFlowComponent.includes("from '@create-something/canon/atlas/headless'"));
	assert.ok(agencyFlowComponent.includes('<AtlasFlow'));
	assert.ok(agencyFlowComponent.includes('{readOnly}'));
	assert.ok(agencyFlowComponent.includes('{showControls}'));
	assert.ok(canonAtlasIndex.includes("export { default as AtlasFlow } from './AtlasFlow.svelte';"));
	assert.equal(agencyFlowComponent.includes("import './PublicAtlasFlow.css'"), false);
});

test('agency README documents story canvas route usage contract', () => {
	assert.ok(agencyReadme.includes('Story-canvas usage contract'));
	assert.ok(agencyReadme.includes('Pass an explicit `storyId`'));
	assert.ok(agencyReadme.includes('Pass an explicit `flowId`'));
	assert.ok(agencyReadme.includes('Keep the story canvas before the editable canvas'));
	assert.ok(agencyReadme.includes('`@create-something/canon/atlas/headless` owns'));
	assert.ok(agencyReadme.includes('`@create-something/canon/atlas` owns the Svelte adapters'));
	assert.ok(agencyReadme.includes('`@create-something/canvas-kernel`'));
	assert.ok(agencyReadme.includes('`AtlasFlow`'));
	assert.ok(agencyReadme.includes('`/`, `/atlas`, and'));
	assert.ok(agencyReadme.includes('`/methodology`, `/stack`, and `/products` can use the'));
	assert.ok(agencyReadme.includes('`data-motion-cue` attributes'));
});

test('agency README documents the current interactive Atlas renderer contract', () => {
	assert.ok(agencyReadme.includes('Atlas canvas kernel is the primary renderer'));
	assert.equal(agencyReadme.includes('React Flow is the primary renderer'), false);
	assert.equal(agencyReadme.includes('interactive Svelte Atlas flow'), false);
});

test('layout keeps privacy prompt compact on Atlas proof-heavy routes', () => {
	assert.ok(layoutRoute.includes("from '$lib/atlas/surface-policy'"));
	assert.ok(layoutRoute.includes('isAgencyDifyArticlePath($page.url.pathname)'));
	assert.ok(layoutRoute.includes('usesCompactAgencyPrivacyPrompt($page.url.pathname)'));
	assert.equal(layoutRoute.includes('services|atlas|methodology|stack|products'), false);
});
