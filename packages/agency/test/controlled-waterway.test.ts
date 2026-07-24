import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import {
	CONTROLLED_WATERWAY_STAGES,
	CONTROL_GATE,
	WATERWAY_STATES,
	WORKFLOW_TRIGGERS
} from '../src/lib/data/controlledWaterway.ts';

const servicesRoute = readFileSync(
	new URL('../src/routes/services/+page.svelte', import.meta.url),
	'utf8'
);
const componentUrl = new URL(
	'../src/lib/components/ControlledWaterwayStory.svelte',
	import.meta.url
);
const modelUrl = new URL('../src/lib/data/controlledWaterway.ts', import.meta.url);
const component = existsSync(componentUrl) ? readFileSync(componentUrl, 'utf8') : '';
const model = existsSync(modelUrl) ? readFileSync(modelUrl, 'utf8') : '';

test('How It Works moves from product path to proof, pipeline, and editable Map preview', () => {
	assert.ok(
		servicesRoute.includes("from '$lib/components/ControlledWaterwayStory.svelte'"),
		'the services route should own one controlled-waterway story component'
	);

	const productPathIndex = servicesRoute.indexOf('<ServicesProductPath');
	const readbackIndex = servicesRoute.indexOf('<AgencyPerformanceReadback');
	const waterwayIndex = servicesRoute.indexOf('<ControlledWaterwayStory');
	const mapPreviewIndex = servicesRoute.indexOf('<ServicesMapPreview');

	assert.notEqual(productPathIndex, -1);
	assert.notEqual(readbackIndex, -1);
	assert.notEqual(waterwayIndex, -1);
	assert.notEqual(mapPreviewIndex, -1);
	assert.ok(productPathIndex < readbackIndex, 'the product path should precede its proof readback');
	assert.ok(readbackIndex < waterwayIndex, 'proof should precede the deeper operating instrument');
	assert.ok(waterwayIndex < mapPreviewIndex, 'the operating instrument should precede the Map preview');
	assert.equal(servicesRoute.match(/<ControlledWaterwayStory/g)?.length, 1);
});

test('the waterway derives its outer journey from the canonical public product family', () => {
	assert.ok(model.includes('PUBLIC_PRODUCT_SEQUENCE'));
	assert.ok(model.includes('getPublicProduct'));
	assert.equal(model.includes("['map', 'build', 'control']"), false);
	assert.match(model, /owner[\s\S]*authority[\s\S]*validation[\s\S]*state[\s\S]*evidence[\s\S]*recovery/);
	assert.deepEqual(
		CONTROLLED_WATERWAY_STAGES.map((stage) => stage.id),
		['map', 'build', 'control']
	);
	for (const stage of CONTROLLED_WATERWAY_STAGES) {
		assert.deepEqual(Object.keys(stage.ledger), [
			'owner',
			'authority',
			'validation',
			'state',
			'evidence',
			'recovery'
		]);
	}
	assert.deepEqual(
		CONTROL_GATE.map((gate) => gate.label),
		['Signal', 'Decision', 'Proof']
	);
	assert.deepEqual(
		WATERWAY_STATES.map((state) => state.label),
		['Run', 'Wait', 'Stop']
	);
});

test('the visible operating story preserves its semantic and accessibility contract', () => {
	const renderedSource = `${component}\n${model}`;
	for (const term of ['Signal', 'Decision', 'Proof', 'Run', 'Wait', 'Stop']) {
		assert.ok(renderedSource.includes(term), `the operating story should expose ${term}`);
	}

	assert.ok(component.includes('aria-pressed'));
	assert.ok(component.includes('selectStageOnKeyboard'));
	assert.ok(component.includes("event.key !== 'Enter' && event.key !== ' '"));
	assert.ok(component.includes('prefers-reduced-motion: reduce'));
	assert.ok(component.includes('data-waterway-stage'));
	assert.ok(component.includes('<ol'));
	assert.ok(component.includes('<svg'));
});

test('the controlled waterway remains lightweight and progressively enhanced', () => {
	for (const prohibited of [
		'three',
		'@react-three/fiber',
		'gsap',
		'lenis',
		'.glb',
		'<audio',
		'loader'
	]) {
		assert.equal(component.toLowerCase().includes(prohibited), false, `${prohibited} is not allowed`);
	}

	for (const token of [
		'--color-performance-signal',
		'--color-performance-pressure',
		'--color-performance-ready',
		'--color-performance-review',
		'--color-performance-stop',
		'--duration-performance-micro',
		'--ease-performance-standard'
	]) {
		assert.ok(component.includes(token), `the waterway should use ${token}`);
	}
});

test('Control exposes the governed handoff from typed trigger to business outcome', async () => {
	const governedModel = await import('../src/lib/data/controlledWaterway.ts');
	const governedSource = `${component}\n${model}`;
	const triggers = governedModel.WORKFLOW_TRIGGERS;
	const workTrace = governedModel.AGENT_WORK_TRACE;
	const pauseStation = governedModel.PAUSE_STATION;
	const outcome = governedModel.BUSINESS_OUTCOME;

	assert.deepEqual(
		triggers.map((trigger: { label: string }) => trigger.label),
		['Human request', 'System event', 'Agent handoff']
	);
	assert.deepEqual(
		workTrace.map((step: { label: string }) => step.label),
		['Connect', 'Inspect', 'Verify', 'Receipt']
	);
	assert.equal(pauseStation.protectedState, 'Protected action held');
	assert.equal(pauseStation.safeState, 'Safe work continues');
	assert.equal(pauseStation.decisionOwner, 'Named human owner');
	assert.equal(outcome.label, 'Proof + business outcome');

	for (const contract of [
		'data-work-trigger',
		'data-work-cell',
		'data-receipt',
		'data-wait-station',
		'data-business-outcome',
		'The blocked action waits. The workflow does not have to.',
		'Protected action held',
		'Safe work continues',
		'Named human owner',
		'Proof + business outcome'
	]) {
		assert.ok(governedSource.includes(contract), `the Control network should expose ${contract}`);
	}

	const workIndex = component.indexOf('data-work-cell');
	const receiptIndex = component.indexOf('data-receipt');
	assert.ok(workIndex !== -1 && workIndex < receiptIndex, 'bounded work must precede its receipt');
});

test('the visual grammar is a direct engineered pipeline, not a winding waterway', () => {
	for (const contract of [
		'Controlled work pipeline',
		'One straight path. Many inputs. Every handoff governed.',
		'Triggers enter one controlled line.',
		'Inputs = typed triggers',
		'Pipe = bounded work',
		'Valves = policy gates',
		'Hold = prepare + wait',
		'Output = proof + outcome',
		'class="waterway__pipeline"',
		'd="M44 368 H1181"'
	]) {
		assert.ok(component.includes(contract), `the direct pipeline should expose ${contract}`);
	}

	const pipelineSvg = component.match(/<svg class="waterway__pipeline"[\s\S]*?<\/svg>/)?.[0] ?? '';
	assert.notEqual(pipelineSvg, '', 'the engineered pipeline should remain an inspectable SVG');
	assert.equal(/<path[^>]*d="[^"]*[CSQ]/.test(pipelineSvg), false, 'pipeline geometry must not meander');
	assert.equal(component.includes('waterway__contours'), false);
	assert.equal(component.includes('waterway__tributaries'), false);
});

test('stage selection controls the visible current and valve state', () => {
	for (const stageId of ['map', 'build', 'control']) {
		assert.ok(
			component.includes(`data-flow-segment="${stageId}"`),
			`the pipeline should expose a current segment for ${stageId}`
		);
		assert.ok(
			component.includes(`data-valve-stage="${stageId}"`),
			`the pipeline should expose a policy valve for ${stageId}`
		);
	}

	assert.ok(component.includes('data-active-stage={activeStageId}'));
	assert.ok(component.includes('Water moving through'));
	assert.ok(component.includes('aria-live="polite"'));
	assert.match(component, /\[data-active-stage='build'\][\s\S]*\[data-flow-segment='build'\]/);
	assert.match(component, /@keyframes waterway-current/);
});

test('stage selection reveals one relevant operating chapter at a time', () => {
	assert.match(component, /\$:\s*activeStage\s*=/);
	assert.ok(component.includes('data-active-chapter={activeStageId}'));
	assert.ok(component.includes('id="waterway-active-chapter"'));
	assert.match(
		component,
		/\{#if activeStageId === 'control'\}[\s\S]*class="waterway__network"[\s\S]*\{\/if\}/
	);
	assert.equal(
		component.match(/class="waterway__ledger-card"/g)?.length,
		1,
		'the selected chapter should own one operating ledger instead of rendering all three'
	);
	assert.match(
		component,
		/@media \(max-width: 760px\)[\s\S]*\.waterway__controls\s*\{\s*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/
	);
	assert.match(
		component,
		/@media \(max-width: 760px\)[\s\S]*\.waterway__milestones > li:not\(\.waterway__milestone--active\)[\s\S]*display:\s*none/
	);
});

test('stage selection carries one current through the complete governed system', () => {
	for (const contract of [
		'data-system-flow',
		'data-flow-progress={activeStageId}',
		'data-flow-phase="map"',
		'data-flow-phase="build"',
		'data-flow-phase="control"',
		'data-decision-current',
		'data-outcome-current'
	]) {
		assert.ok(component.includes(contract), `the end-to-end instrument should expose ${contract}`);
	}

	assert.match(model, /flowStatus/);
	assert.match(
		component,
		/\.waterway__system\[data-flow-progress='map'\][\s\S]*--waterway-route-progress:\s*50%/
	);
	assert.match(
		component,
		/\.waterway__system\[data-flow-progress='build'\][\s\S]*--waterway-route-progress:\s*75%/
	);
	assert.match(
		component,
		/\.waterway__system\[data-flow-progress='control'\][\s\S]*--waterway-route-progress:\s*100%/
	);
	assert.match(component, /@keyframes waterway-network-current/);
	assert.match(component, /@keyframes waterway-outcome-current/);
});

test('the governed handoff reads as one connected pipeline with typed source glyphs', () => {
	assert.deepEqual(
		WORKFLOW_TRIGGERS.map((trigger) => trigger.id),
		['human', 'system', 'agent']
	);
	assert.ok(component.includes('data-source-icon={trigger.id}'));

	assert.ok(component.includes('data-pipeline-rail'));
	assert.ok(component.includes('data-mobile-current'));
	assert.match(component, /@keyframes waterway-network-current/);
	assert.match(component, /@media \(prefers-reduced-motion: reduce\)/);
	assert.ok(component.includes('animation-play-state: paused'));
});

test('the primary pipeline uses precision instrumentation rather than plumbing clip art', () => {
	assert.ok(component.includes('data-instrument-manifold'));
	assert.ok(component.includes('data-pipeline-terminal'));
	assert.equal(component.match(/class="waterway__instrument-valve"/g)?.length, 3);
	assert.equal(component.match(/class="waterway__valve-ring"/g)?.length, 3);
	assert.equal(component.match(/class="waterway__valve-core"/g)?.length, 3);
	assert.ok(component.includes('stroke="currentColor"'));
});
