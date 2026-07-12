import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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
const marketplaceWorkflowRoute = readFileSync(
	new URL('../src/routes/proof/marketplace-workflow/+page.svelte', import.meta.url),
	'utf8'
);
const bookRoute = readFileSync(new URL('../src/routes/book/+page.svelte', import.meta.url), 'utf8');
const difyControlPlaneRoute = readFileSync(
	new URL('../src/routes/dify/mcp-control-plane/+page.svelte', import.meta.url),
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
const agencySubstrateCanvasWrapper = readFileSync(
	new URL('../src/lib/components/PublicSubstrateCanvas.svelte', import.meta.url),
	'utf8'
);
const agencyDelegationArtifact = readFileSync(
	new URL('../src/lib/components/HeroTrustArtifact.svelte', import.meta.url),
	'utf8'
);
const agencyPrivacyAnalytics = readFileSync(
	new URL('../src/lib/components/PrivacyAnalytics.svelte', import.meta.url),
	'utf8'
);
const agencySubstrateCanvasModule = readFileSync(
	new URL('../src/lib/atlas/public-substrate-canvas.ts', import.meta.url),
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
		'/proof/marketplace-workflow',
		'/products/signal',
		'/products/decision',
		'/products/proof'
	]);
	assert.ok(AGENCY_COMPACT_PRIVACY_PATHS.includes('/'));
	assert.equal(AGENCY_DIFY_ARTICLE_PATHS.length, 3);
	assert.equal(isAgencyAtlasProofPath('/atlas/'), true);
	assert.equal(isAgencyAtlasProofPath('/book'), false);
	assert.equal(isAgencyDifyArticlePath('/dify/content-engine'), false);
	assert.equal(usesCompactAgencyPrivacyPrompt('/'), true);
	assert.equal(usesCompactAgencyPrivacyPrompt('/services'), true);
	assert.equal(usesCompactAgencyPrivacyPrompt('/dify/mcp-control-plane/'), true);
	assert.equal(usesCompactAgencyPrivacyPrompt('/proof/marketplace-workflow'), true);
	assert.equal(usesCompactAgencyPrivacyPrompt('/book'), true);
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
	assert.match(
		servicesRoute,
		/<PerformanceContrastChapter[\s\S]*?artifactPlacement="full-width"[\s\S]*?<PublicAtlasCanvas \/>/
	);
	assert.equal(servicesRoute.includes('<PublicAtlasStoryCanvas'), false);
	assert.equal(servicesRoute.includes('storyId="services-marketplace-review-story"'), false);
	assert.equal(servicesRoute.includes('<PerformanceDecisionPanel'), false);
	assert.equal(servicesRoute.includes('<PerformanceCtaBand'), false);
	assert.equal(servicesRoute.includes('<PerformanceCardGrid'), false);
});

test('public Atlas gives the booking warmup a distinct label and deliberate copy rhythm', () => {
	assert.ok(agencyEditableCanvas.includes('<span>Mapping warmup</span>'));
	assert.ok(agencyEditableCanvas.includes('gap: clamp(1.5rem, 3vw, 2.5rem)'));
	assert.ok(agencyEditableCanvas.includes('max-width: 46rem'));
	assert.ok(agencyEditableCanvas.includes('font-family: var(--font-mono)'));
});

test('public Performance routes use the natural water image series', () => {
	for (const route of [homeRoute, servicesRoute, productsRoute, bookRoute, atlasRoute, difyControlPlaneRoute]) {
		assert.equal(route.includes('/images/performance-lab/controlled-flow.webp'), false);
		assert.equal(route.includes('/images/performance-lab/pressure-boundary.webp'), false);
		assert.equal(route.includes('/images/performance-lab/trace-control-plane.webp'), false);
	}

	assert.ok(homeRoute.includes('/images/performance-lab/pressure-boundary-natural.webp'));
	assert.ok(servicesRoute.includes('/images/performance-lab/trace-wake-natural.webp'));
	assert.ok(productsRoute.includes('/images/performance-lab/product-system-natural.webp'));
	assert.ok(productsRoute.includes('/images/performance-lab/product-system-natural-mobile.webp'));
	assert.equal(productsRoute.includes('/images/performance-lab/controlled-flow-natural.webp'), false);
	assert.equal(
		existsSync(new URL('../static/images/performance-lab/product-system-natural.webp', import.meta.url)),
		true
	);
	assert.equal(
		existsSync(
			new URL('../static/images/performance-lab/product-system-natural-mobile.webp', import.meta.url)
		),
		true
	);
});

test('home route uses the shared canvas kernel as a transparent proof object', () => {
	assert.ok(homeRoute.includes('<PublicSubstrateCanvas'));
	assert.ok(homeRoute.includes("from '$lib/components/PublicSubstrateCanvas.svelte'"));
	assert.ok(homeRoute.includes('Map the work before AI runs it.'));
	assert.ok(homeRoute.includes('artifactPlacement="full-width"'));
	assert.equal(homeRoute.includes('<PublicAtlasStoryCanvas'), false);
	assert.equal(homeRoute.includes('<PublicAtlasCanvas'), false);
});

test('home route promotes the delegation object to a wide conversion proof surface', () => {
	assert.match(
		homeRoute,
		/<PerformanceConversionHandoff[\s\S]*?artifactPlacement="full-width"[\s\S]*?\{#snippet aside\(\)\}<HeroTrustArtifact \/>\{\/snippet\}/
	);
	assert.ok(agencyDelegationArtifact.includes('container-type: inline-size'));
	assert.ok(agencyDelegationArtifact.includes('grid-template-columns: repeat(4, minmax(0, 1fr))'));
	assert.ok(agencyDelegationArtifact.includes('Signal / Decision / Action / Proof'));
	assert.ok(agencyDelegationArtifact.indexOf("label: 'Signal'") < agencyDelegationArtifact.indexOf("label: 'Decision'"));
	assert.ok(agencyDelegationArtifact.indexOf("label: 'Decision'") < agencyDelegationArtifact.indexOf("label: 'Action'"));
	assert.ok(agencyDelegationArtifact.indexOf("label: 'Action'") < agencyDelegationArtifact.indexOf("label: 'Proof'"));
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
	assert.ok(productsRoute.includes('Atlas maps the workflow.'));
	assert.ok(productsRoute.includes("href: product.id === 'atlas' ? '/atlas' : `/products/${product.id}`"));
	assert.equal(productsRoute.includes('<PublicAtlasCanvas'), false);
});

test('public proof path distinguishes the workflow compiler prototype from live operation', () => {
	assert.ok(homeRoute.includes('href="/proof/marketplace-workflow"'));
	assert.ok(homeRoute.includes('Stop watching the workflow. Keep the judgment.'));
	assert.ok(productsRoute.includes('Foundation'));
	assert.ok(productsRoute.includes('Substrate'));
	assert.ok(productsRoute.includes('Map / Pilot / Operate'));
	assert.ok(marketplaceWorkflowRoute.includes('Active development'));
	assert.ok(marketplaceWorkflowRoute.includes('representative local fixtures'));
	assert.ok(marketplaceWorkflowRoute.includes('no production writes'));
	assert.ok(marketplaceWorkflowRoute.includes('deterministic: true'));
	assert.ok(marketplaceWorkflowRoute.includes("{ value: '15'"));
	assert.ok(marketplaceWorkflowRoute.includes("{ value: '5'"));
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
	assert.ok(canonStoryCanvasComponent.includes('focusedNodeIds={selectedStoryChapter.focusNodeIds}'));
	assert.ok(canonStoryCanvasComponent.includes('focusedEdgeIds={selectedStoryChapter.relationshipIds}'));
	assert.ok(canonStoryCanvasComponent.includes('dimUnfocused'));
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
	assert.ok(agencyEditableCanvas.includes('createPublicAtlasFocusGroups'));
	assert.ok(agencyEditableCanvas.includes('activeFocusId'));
	assert.ok(agencyEditableCanvas.includes('Focus owner'));
	assert.ok(agencyEditableCanvas.includes('Focus run'));
	assert.ok(agencyEditableCanvas.includes('Focus wait'));
	assert.ok(agencyEditableCanvas.includes('Focus stop'));
	assert.ok(agencyEditableCanvas.includes('Focus proof'));
	assert.ok(canonFlowComponent.includes("export let flowId = 'public-atlas-flow'"));
	assert.ok(canonFlowComponent.includes('export let focusedNodeIds'));
	assert.ok(canonFlowComponent.includes('export let focusedEdgeIds'));
	assert.ok(canonFlowComponent.includes('export let dimUnfocused'));
	assert.ok(canonFlowComponent.includes("from '@xyflow/svelte'"));
	assert.ok(canonFlowComponent.includes('<SvelteFlow'));
	assert.ok(canonFlowComponent.includes('id={flowId}'));
	assert.ok(canonFlowComponent.includes('{initialViewport}'));
	assert.ok(canonFlowComponent.includes('proOptions'));
	assert.ok(canonFlowComponent.includes('hideAttribution: true'));
	assert.ok(canonFlowComponent.includes('aria-label="Atlas workflow map"'));
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

test('agency public Substrate canvas mounts the shared canvas kernel', () => {
	assert.ok(agencySubstrateCanvasWrapper.includes("import('@create-something/canvas-kernel')"));
	assert.ok(agencySubstrateCanvasWrapper.includes('kernel.CanvasKernel'));
	assert.ok(agencySubstrateCanvasWrapper.includes('data-public-substrate-canvas'));
	assert.ok(agencySubstrateCanvasWrapper.includes('The canvas is the proof object.'));
	assert.ok(agencySubstrateCanvasWrapper.includes('Signal / Decision / Proof'));
	assert.ok(agencySubstrateCanvasWrapper.includes('shared kernel'));
	assert.ok(agencySubstrateCanvasWrapper.includes('Trace proof'));
	assert.ok(agencySubstrateCanvasModule.includes("from '@create-something/canvas-kernel'"));
	assert.ok(agencySubstrateCanvasModule.includes('PUBLIC_SUBSTRATE_CANVAS_PROJECTION'));
	assert.ok(agencySubstrateCanvasModule.includes('PUBLIC_SUBSTRATE_CANVAS_MOBILE_PROJECTION'));
	assert.ok(agencySubstrateCanvasModule.includes("'agency_canvas'"));
	assert.ok(agencySubstrateCanvasModule.includes("'receipt_graph'"));
	assert.ok(agencySubstrateCanvasModule.includes('Public proof surface'));
	assert.ok(agencySubstrateCanvasModule.includes('Stop condition'));
});

test('agency public Substrate canvas turns receipt selection into an accessible proof trace', () => {
	assert.ok(agencySubstrateCanvasWrapper.includes('Trace proof'));
	assert.ok(agencySubstrateCanvasWrapper.includes('aria-pressed={proofModeActive}'));
	assert.ok(agencySubstrateCanvasWrapper.includes('aria-controls="public-substrate-receipt"'));
	assert.ok(agencySubstrateCanvasWrapper.includes('on:keydown={handleProofKeydown}'));
	assert.ok(agencySubstrateCanvasWrapper.includes('PUBLIC_SUBSTRATE_CANVAS_PROOF_EMPHASIS'));
	assert.ok(agencySubstrateCanvasWrapper.includes('id="public-substrate-receipt"'));
	assert.ok(agencySubstrateCanvasWrapper.includes('href="/products/proof"'));
	assert.ok(agencySubstrateCanvasWrapper.includes('Representative public receipt'));
	assert.ok(agencySubstrateCanvasWrapper.includes('<dt>Source</dt>'));
	assert.ok(agencySubstrateCanvasWrapper.includes('<dt>Decision</dt>'));
	assert.ok(agencySubstrateCanvasWrapper.includes('<dt>Action</dt>'));
	assert.ok(agencySubstrateCanvasWrapper.includes('<dt>Result</dt>'));
	assert.ok(agencySubstrateCanvasWrapper.includes('<dt>Rollback</dt>'));
	assert.ok(agencySubstrateCanvasModule.includes('PUBLIC_SUBSTRATE_CANVAS_PROOF_NODE_IDS'));
	assert.ok(agencySubstrateCanvasModule.includes('PUBLIC_SUBSTRATE_CANVAS_PROOF_EDGE_IDS'));
});

test('agency public Substrate canvas keeps a readable mobile projection', () => {
	assert.ok(agencySubstrateCanvasWrapper.includes("window.matchMedia('(max-width: 680px)'"));
	assert.ok(agencySubstrateCanvasWrapper.includes('PUBLIC_SUBSTRATE_CANVAS_MOBILE_PROJECTION'));
	assert.ok(agencySubstrateCanvasWrapper.includes(': projection = isCompactCanvas'));
	assert.ok(agencySubstrateCanvasWrapper.includes('public-substrate-canvas__backend'));
	assert.ok(agencySubstrateCanvasWrapper.includes('@media (max-width: 680px)'));
	assert.ok(agencySubstrateCanvasWrapper.includes('clamp(21rem, 54vh, 28rem)'));
	assert.ok(agencySubstrateCanvasWrapper.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'));
	assert.ok(agencySubstrateCanvasModule.includes("x: 22"));
	assert.ok(agencySubstrateCanvasModule.includes("x: 210"));
	assert.ok(agencySubstrateCanvasModule.includes("y: 300"));
	assert.ok(agencySubstrateCanvasModule.includes('edges: PUBLIC_SUBSTRATE_CANVAS_PROJECTION.edges'));
});

test('agency editable Atlas flow is a Canon wrapper over local intake state', () => {
	assert.ok(agencyFlowComponent.includes("from '@create-something/canon/atlas'"));
	assert.ok(agencyFlowComponent.includes("from '@create-something/canon/atlas/headless'"));
	assert.ok(agencyFlowComponent.includes('<AtlasFlow'));
	assert.ok(canonAtlasIndex.includes("export { default as AtlasFlow } from './AtlasFlow.svelte';"));
	assert.equal(agencyFlowComponent.includes("import './PublicAtlasFlow.css'"), false);
});

test('agency README documents story canvas route usage contract', () => {
	assert.ok(agencyReadme.includes('Story-canvas usage contract'));
	assert.ok(agencyReadme.includes('Pass an explicit `storyId`'));
	assert.ok(agencyReadme.includes('Pass an explicit `flowId`'));
	assert.ok(agencyReadme.includes('Keep the story canvas before the editable canvas'));
	assert.ok(agencyReadme.includes('`@create-something/canon/atlas/headless` owns'));
	assert.ok(agencyReadme.includes('`@create-something/canon/atlas` owns the Svelte'));
	assert.ok(agencyReadme.includes('`AtlasFlow`'));
	assert.ok(agencyReadme.includes('`/`, `/atlas`, and'));
	assert.ok(agencyReadme.includes('`/methodology`, `/stack`, and `/products` can use the'));
	assert.ok(agencyReadme.includes('`data-motion-cue` attributes'));
});

test('agency README documents the current interactive Atlas renderer contract', () => {
	assert.ok(agencyReadme.includes('interactive Svelte Atlas flow'));
	assert.ok(agencyReadme.includes('`PublicSubstrateCanvas.svelte`'));
	assert.ok(agencyReadme.includes('`@create-something/canvas-kernel` renderer'));
	assert.ok(agencyReadme.includes('transparent operating canvas'));
	assert.ok(agencyReadme.includes('Ona/UNA communication foundation'));
	assert.ok(agencyReadme.includes('implementation details hidden until they are'));
	assert.ok(agencyReadme.includes('useful evidence'));
	assert.equal(agencyReadme.includes('React Flow is the primary renderer'), false);
});

test('layout keeps privacy prompt compact on Atlas proof-heavy routes', () => {
	assert.ok(layoutRoute.includes("from '$lib/atlas/surface-policy'"));
	assert.ok(layoutRoute.includes('isAgencyDifyArticlePath($page.url.pathname)'));
	assert.ok(layoutRoute.includes('usesCompactAgencyPrivacyPrompt($page.url.pathname)'));
	assert.equal(layoutRoute.includes('services|atlas|methodology|stack|products'), false);
});

test('compact mobile privacy prompt stays below navigation and away from campaign proof', () => {
	assert.ok(agencyPrivacyAnalytics.includes('.privacy-choice--compact'));
	assert.ok(agencyPrivacyAnalytics.includes('top: max(4.5rem, calc(4rem + env(safe-area-inset-top)))'));
	assert.ok(agencyPrivacyAnalytics.includes('bottom: auto'));
	assert.ok(agencyPrivacyAnalytics.includes('.privacy-choice:has(.privacy-panel)'));
	assert.ok(agencyPrivacyAnalytics.includes("content: 'Privacy'"));
	assert.match(
		agencyPrivacyAnalytics,
		/@media \(max-width: 640px\)[\s\S]*?\.privacy-pill--compact \{[\s\S]*?min-height: 2\.75rem;[\s\S]*?border-color: transparent;[\s\S]*?background: transparent;[\s\S]*?box-shadow: none;/
	);
	assert.match(
		agencyPrivacyAnalytics,
		/@media \(max-width: 640px\)[\s\S]*?\.privacy-pill--compact > span:first-child::before \{[\s\S]*?font-size: 0\.62rem;/
	);
});

test('short desktop campaigns keep the property switcher away from primary actions', () => {
	assert.ok(layoutRoute.includes('@media (max-height: 47.5rem) and (min-width: 48rem)'));
	assert.ok(layoutRoute.includes(':global(.layout-root .mode-indicator)'));
	assert.ok(layoutRoute.includes('top: calc(72px + var(--space-md, 1rem))'));
	assert.ok(layoutRoute.includes('bottom: auto'));
});
