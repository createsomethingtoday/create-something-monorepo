import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
	computePublicAtlasReadiness,
	createPublicAtlasGraphArtifact,
	createPublicAtlasStoryArtifact,
	PUBLIC_ATLAS_LANES,
	type PublicAtlasNodeStatus
} from '@create-something/canon/atlas/headless';
import {
	createPublicAtlasCanvasFromStarter,
	PUBLIC_ATLAS_INDUSTRY_STARTERS
} from '../src/lib/atlas/public.ts';

const requiredStatuses = new Set<PublicAtlasNodeStatus>(['run', 'wait', 'stop']);
const agencyPublicAtlasModule = readFileSync(
	new URL('../src/lib/atlas/public.ts', import.meta.url),
	'utf8'
);
const agencyIntakePolicyModule = readFileSync(
	new URL('../src/lib/atlas/intake-policy.ts', import.meta.url),
	'utf8'
);
const agencyModelAgentModule = readFileSync(
	new URL('../src/lib/atlas/model-agent.ts', import.meta.url),
	'utf8'
);
const agencyPublicAgentRoute = readFileSync(
	new URL('../src/routes/api/atlas/public-agent/+server.ts', import.meta.url),
	'utf8'
);
const agencyPublicAtlasCanvas = readFileSync(
	new URL('../src/lib/components/PublicAtlasCanvas.svelte', import.meta.url),
	'utf8'
);
const agencyBookingRoute = readFileSync(
	new URL('../src/routes/book/+page.svelte', import.meta.url),
	'utf8'
);
const agencyAgentContractModule = readFileSync(
	new URL('../src/lib/atlas/agent-contract.ts', import.meta.url),
	'utf8'
);

test('agency public Atlas module re-exports Canon headless primitives', () => {
	assert.ok(agencyPublicAtlasModule.includes("from '@create-something/canon/atlas/headless'"));
	assert.ok(agencyPublicAtlasModule.includes('createPublicAtlasGraphArtifact'));
	assert.ok(agencyPublicAtlasModule.includes('createPublicAtlasStoryArtifact'));
	assert.equal(agencyPublicAtlasModule.includes('export function createPublicAtlasGraphArtifact'), false);
	assert.equal(agencyPublicAtlasModule.includes('export function createPublicAtlasStoryArtifact'), false);
	assert.equal(agencyPublicAtlasModule.includes('export function computePublicAtlasReadiness'), false);
	assert.equal(agencyPublicAtlasModule.includes('export function normalizePublicAtlasCanvas'), false);
});

test('agency public Atlas intake policy owns local limits and storage keys', () => {
	assert.ok(agencyIntakePolicyModule.includes('export const PUBLIC_ATLAS_STORAGE_KEYS'));
	assert.ok(agencyIntakePolicyModule.includes('export const PUBLIC_ATLAS_LIMITS'));
	assert.ok(agencyIntakePolicyModule.includes('export type PublicAtlasTier'));
	assert.ok(agencyPublicAtlasModule.includes("from './intake-policy'"));
	assert.equal(agencyPublicAtlasModule.includes('export const PUBLIC_ATLAS_STORAGE_KEYS'), false);
	assert.equal(agencyPublicAtlasModule.includes('export const PUBLIC_ATLAS_LIMITS'), false);
});

test('public Atlas UI and API import intake policy while booking delegates context to the scheduler', () => {
	assert.ok(agencyPublicAtlasCanvas.includes("from '$lib/atlas/intake-policy'"));
	assert.ok(agencyBookingRoute.includes('buildFirstPartySchedulerUrl'));
	assert.ok(agencyBookingRoute.includes("from '$lib/atlas/intake-policy'"));
	assert.ok(agencyPublicAgentRoute.includes("from '$lib/atlas/intake-policy'"));
	assert.equal(
		agencyPublicAgentRoute.includes("PUBLIC_ATLAS_LIMITS,\n\trunPublicAtlasMappingAgent"),
		false
	);
	assert.ok(agencyPublicAgentRoute.includes("from '$lib/atlas/public'"));
	assert.ok(agencyPublicAgentRoute.includes('runPublicAtlasMappingAgent'));
});

test('server-side Atlas agent code imports Canon headless primitives directly', () => {
	assert.ok(agencyModelAgentModule.includes("from '@create-something/canon/atlas/headless'"));
	assert.equal(agencyModelAgentModule.includes("from './public'"), false);
	assert.ok(agencyModelAgentModule.includes("from './agent-contract'"));
	assert.ok(agencyPublicAgentRoute.includes("from '@create-something/canon/atlas/headless'"));
});

test('agency mapping agent result shape is defined once locally', () => {
	assert.ok(agencyAgentContractModule.includes('export type PublicAtlasAgentResult'));
	assert.ok(agencyAgentContractModule.includes("from '@create-something/canon/atlas/headless'"));
	assert.ok(agencyPublicAtlasModule.includes("from './agent-contract'"));
	assert.ok(agencyModelAgentModule.includes("from './agent-contract'"));
	assert.equal(agencyPublicAtlasModule.includes('export type PublicAtlasAgentResult ='), false);
	assert.equal(agencyModelAgentModule.includes('type PublicAtlasAgentResult ='), false);
});

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

test('marketplace review queue starter uses complete operational statuses', () => {
	const canvas = createPublicAtlasCanvasFromStarter('marketplace-review-queue');
	const statusByNode = new Map(canvas.nodes.map((node) => [node.id, node.status]));

	assert.equal(statusByNode.get('actor_owner'), 'wait');
	assert.equal(statusByNode.get('data_workflow'), 'wait');
	assert.equal(statusByNode.get('system_route'), 'run');
	assert.equal(statusByNode.get('ai_assist'), 'run');
	assert.equal(statusByNode.get('human_review'), 'wait');
	assert.equal(statusByNode.get('constraint_stop'), 'stop');
	assert.equal(statusByNode.get('touchpoint_receipt'), 'run');
});

test('unknown starter id falls back to the blank public canvas', () => {
	const canvas = createPublicAtlasCanvasFromStarter('missing-starter');

	assert.equal(canvas.nodes.length, 3);
	assert.ok(canvas.nodes.some((node) => node.id === 'data_workflow'));
	assert.ok(canvas.nodes.some((node) => node.id === 'human_approval'));
});

test('starter maps export a renderer-independent agent graph artifact', () => {
	const canvas = createPublicAtlasCanvasFromStarter('marketplace-review-queue');
	const readiness = computePublicAtlasReadiness(canvas);
	const artifact = createPublicAtlasGraphArtifact(canvas, readiness);

	assert.equal(artifact.version, 1);
	assert.equal(artifact.canvasId, canvas.id);
	assert.equal(artifact.nodeCount, canvas.nodes.length);
	assert.equal(artifact.edgeCount, canvas.edges.length);
	assert.equal(artifact.renderer.primary, 'atlas');
	assert.equal(artifact.renderer.fallback, 'static-story');
	assert.equal(artifact.renderer.scale, 'workflow');
	assert.equal(artifact.agentContract.sourceOfTruth, 'atlas-graph');
	assert.equal(artifact.agentContract.purpose, 'workflow-intake');
	assert.deepEqual(artifact.agentContract.allowedStatuses, ['run', 'wait', 'stop', 'unknown']);
	assert.deepEqual(
		new Set(artifact.agentContract.requiredNodeKinds),
		new Set(PUBLIC_ATLAS_LANES.map((lane) => lane.kind))
	);

	assert.ok(
		artifact.nodes.some(
			(node) =>
				node.kind === 'constraint' &&
				node.status === 'stop' &&
				node.agentRole === 'guardrail' &&
				node.agentInstruction.includes('Stop')
		)
	);
	assert.ok(artifact.edges.some((edge) => edge.relationship === 'owns'));
	assert.ok(artifact.edges.some((edge) => edge.relationship === 'bounded_by'));
	assert.ok(artifact.edges.some((edge) => edge.relationship === 'observed_in'));
});

test('starter maps export static story chapters from the same Atlas graph', () => {
	const canvas = createPublicAtlasCanvasFromStarter('construction-rfi-submittal-control');
	const story = createPublicAtlasStoryArtifact(canvas);

	assert.equal(story.version, 1);
	assert.equal(story.canvasId, canvas.id);
	assert.equal(story.renderer, 'static-story');
	assert.match(story.headline, /RFI or submittal packet/);
	assert.match(story.summary, /7 nodes, 7 handoffs/);
	assert.equal(story.chapters.length, 6);
	assert.deepEqual(
		story.chapters.map((chapter) => chapter.id),
		['claim', 'automation', 'judgment', 'boundary', 'receipt', 'next-step']
	);

	const automation = story.chapters.find((chapter) => chapter.id === 'automation');
	const boundary = story.chapters.find((chapter) => chapter.id === 'boundary');
	const receipt = story.chapters.find((chapter) => chapter.id === 'receipt');

	assert.equal(automation?.state, 'run');
	assert.equal(automation?.motionCue, 'trace-handoff');
	assert.ok(automation?.focusNodeIds.includes('system_route'));
	assert.ok(automation?.focusNodeIds.includes('ai_assist'));
	assert.ok((automation?.relationshipIds.length ?? 0) >= 2);

	assert.equal(boundary?.state, 'stop');
	assert.equal(boundary?.motionCue, 'reveal-proof');
	assert.deepEqual(boundary?.focusNodeIds, ['constraint_stop']);

	assert.equal(receipt?.proofLabel, 'inspection point named');
	assert.ok(story.accessibilitySummary.includes('Contract and scope boundary is the stop condition.'));
});
