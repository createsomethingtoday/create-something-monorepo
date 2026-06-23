import assert from 'node:assert/strict';
import test from 'node:test';

import {
	computePublicAtlasReadiness,
	createPublicAtlasCanvasFromStarter,
	PUBLIC_ATLAS_INDUSTRY_STARTERS,
	PUBLIC_ATLAS_LANES,
	type PublicAtlasNodeStatus
} from '../src/lib/atlas/public.ts';

const requiredStatuses = new Set<PublicAtlasNodeStatus>(['run', 'wait', 'stop']);

test('industry starter maps cover every public Atlas dimension', () => {
	assert.equal(PUBLIC_ATLAS_INDUSTRY_STARTERS.length, 5);

	for (const starter of PUBLIC_ATLAS_INDUSTRY_STARTERS) {
		const canvas = createPublicAtlasCanvasFromStarter(starter.id);
		const kinds = new Set(canvas.nodes.map((node) => node.kind));

		assert.equal(canvas.version, 1);
		assert.match(canvas.id, new RegExp(`^public_atlas_${starter.id}_`));
		assert.equal(canvas.nodes.length, PUBLIC_ATLAS_LANES.length);
		assert.equal(canvas.edges.length, 7);

		for (const lane of PUBLIC_ATLAS_LANES) {
			assert.ok(kinds.has(lane.kind), `${starter.id} is missing ${lane.kind}`);
		}
	}
});

test('industry starter maps preserve run wait stop policy boundaries', () => {
	for (const starter of PUBLIC_ATLAS_INDUSTRY_STARTERS) {
		const canvas = createPublicAtlasCanvasFromStarter(starter.id);
		const statuses = new Set(canvas.nodes.map((node) => node.status));
		const readiness = computePublicAtlasReadiness(canvas);

		for (const status of requiredStatuses) {
			assert.ok(statuses.has(status), `${starter.id} is missing ${status}`);
		}

		assert.equal(readiness.intent, 'workflow-mapping');
		assert.ok(readiness.score >= 90, `${starter.id} should be ready for mapping`);
		assert.ok(canvas.nodes.some((node) => node.kind === 'constraint' && node.status === 'stop'));
		assert.ok(canvas.nodes.some((node) => node.kind === 'human' && node.status === 'wait'));
		assert.ok(canvas.nodes.some((node) => node.kind === 'system' && node.status === 'run'));
	}
});

test('unknown starter id falls back to the blank public canvas', () => {
	const canvas = createPublicAtlasCanvasFromStarter('missing-starter');

	assert.equal(canvas.nodes.length, 3);
	assert.ok(canvas.nodes.some((node) => node.id === 'data_workflow'));
	assert.ok(canvas.nodes.some((node) => node.id === 'human_approval'));
});
