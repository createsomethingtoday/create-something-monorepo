import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import {
	CONTROLLED_WATERWAY_STAGES,
	CONTROL_GATE,
	WATERWAY_STATES
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

test('How It Works places one controlled waterway before the commercial readback', () => {
	assert.ok(
		servicesRoute.includes("from '$lib/components/ControlledWaterwayStory.svelte'"),
		'the services route should own one controlled-waterway story component'
	);

	const waterwayIndex = servicesRoute.indexOf('<ControlledWaterwayStory');
	const familyGridIndex = servicesRoute.indexOf('<PerformanceCardGrid');
	const editableMapIndex = servicesRoute.indexOf('<PublicAtlasCanvas');

	assert.notEqual(waterwayIndex, -1);
	assert.ok(waterwayIndex < familyGridIndex, 'the operating explanation should precede the offer cards');
	assert.ok(familyGridIndex < editableMapIndex, 'the commercial readback should precede the Map warmup');
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
