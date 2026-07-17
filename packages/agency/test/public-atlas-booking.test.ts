import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
	computePublicAtlasReadiness,
	createPublicAtlasCanvas,
	normalizePublicAtlasCanvas,
	type PublicAtlasCanvas
} from '@create-something/canon/atlas/headless';
import { buildPublicAtlasBookingUrl } from '../src/lib/atlas/public-booking.ts';
import { createPublicAtlasCanvasFromStarter } from '../src/lib/atlas/public.ts';

const publicAtlasCanvas = readFileSync(
	new URL('../src/lib/components/PublicAtlasCanvas.svelte', import.meta.url),
	'utf8'
);

function assertBookingMatches(canvas: PublicAtlasCanvas): void {
	const readiness = computePublicAtlasReadiness(canvas);
	const bookingUrl = new URL(
		buildPublicAtlasBookingUrl({ bookingHref: '/book', canvas, readiness }),
		'https://createsomething.agency'
	);

	assert.equal(bookingUrl.searchParams.get('readiness'), readiness.slug);
	assert.equal(bookingUrl.searchParams.get('score'), String(readiness.score));
	assert.equal(bookingUrl.searchParams.get('atlas_session_id'), canvas.id);
	assert.equal(bookingUrl.searchParams.get('agent_messages'), String(canvas.agentMessages));
}

test('booking context follows the currently displayed Map canvas', () => {
	const canvas = createPublicAtlasCanvasFromStarter('revops-lead-routing');
	canvas.agentMessages = 3;
	const readiness = computePublicAtlasReadiness(canvas);
	const bookingUrl = new URL(
		buildPublicAtlasBookingUrl({ bookingHref: '/book?stale=1', canvas, readiness }),
		'https://createsomething.agency'
	);

	assert.equal(bookingUrl.pathname, '/book');
	assert.equal(bookingUrl.searchParams.get('source'), 'atlas-canvas');
	assert.equal(bookingUrl.searchParams.get('intent'), readiness.intent);
	assert.equal(bookingUrl.searchParams.get('lane'), readiness.lane);
	assert.equal(bookingUrl.searchParams.get('readiness'), readiness.slug);
	assert.equal(bookingUrl.searchParams.get('score'), String(readiness.score));
	assert.equal(bookingUrl.searchParams.get('atlas_session_id'), canvas.id);
	assert.equal(bookingUrl.searchParams.get('agent_messages'), '3');
	assert.equal(bookingUrl.searchParams.has('stale'), false);

	assert.match(
		publicAtlasCanvas,
		/\$: bookingUrl = buildPublicAtlasBookingUrl\(\{ bookingHref, canvas, readiness \}\);/
	);
});

test('booking context stays current through edits, agent mutation, restoration, and reset', () => {
	const starter = createPublicAtlasCanvasFromStarter('revops-lead-routing');
	assertBookingMatches(starter);

	const edited = normalizePublicAtlasCanvas({
		...starter,
		agentMessages: starter.agentMessages + 1,
		mutationCount: starter.mutationCount + 1,
		nodes: starter.nodes.map((node) =>
			node.id === 'human_review' ? { ...node, status: 'run' as const } : node
		)
	});
	assertBookingMatches(edited);

	const restored = normalizePublicAtlasCanvas(JSON.parse(JSON.stringify(edited)));
	assertBookingMatches(restored);

	assertBookingMatches(createPublicAtlasCanvas());
});
