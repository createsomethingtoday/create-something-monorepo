import assert from 'node:assert/strict';
import test from 'node:test';
import {
	captureZeroContextSurface,
	normalizeVisibleText
} from '../scripts/capture-zero-context-surface.mjs';

test('surface capture fingerprints visible copy while ignoring script, style, and whitespace noise', async () => {
	const html = `<!doctype html>
		<style>.hidden { display: none; }</style>
		<script>window.secret = 'do not fingerprint';</script>
		<main><h1>Make one workflow safe to delegate.</h1><p>Routine work can move &amp; judgment stays with the owner.</p></main>`;
	const fetchImpl = async () => new Response(html, { status: 200 });
	const first = await captureZeroContextSurface({
		baseUrl: 'https://example.test',
		routes: ['/'],
		fetchImpl,
		capturedAt: '2026-07-12T18:00:00.000Z'
	});
	const second = await captureZeroContextSurface({
		baseUrl: 'https://example.test',
		routes: ['/'],
		fetchImpl,
		capturedAt: '2026-07-13T18:00:00.000Z'
	});

	assert.equal(
		normalizeVisibleText(html),
		'Make one workflow safe to delegate. Routine work can move & judgment stays with the owner.'
	);
	assert.equal(first.conditionId, second.conditionId);
	assert.equal(first.routes[0].first300Words.includes('window.secret'), false);
	assert.equal(first.routes[0].status, 200);
	assert.equal(first.capturedAt, '2026-07-12T18:00:00.000Z');
});

test('surface capture condition changes when visitor-visible copy changes', async () => {
	const capture = async (copy) =>
		captureZeroContextSurface({
			baseUrl: 'https://example.test',
			routes: ['/'],
			fetchImpl: async () => new Response(`<main><h1>${copy}</h1></main>`, { status: 200 }),
			capturedAt: '2026-07-12T18:00:00.000Z'
		});

	const before = await capture('Make one workflow safe to delegate.');
	const after = await capture('Make every workflow autonomous.');
	assert.notEqual(before.conditionId, after.conditionId);
	assert.notEqual(before.routes[0].textHash, after.routes[0].textHash);
});

test('surface capture fails closed on an unavailable route', async () => {
	await assert.rejects(
		captureZeroContextSurface({
			baseUrl: 'https://example.test',
			routes: ['/missing'],
			fetchImpl: async () => new Response('missing', { status: 404 }),
			capturedAt: '2026-07-12T18:00:00.000Z'
		}),
		/\/missing returned 404/
	);
});
