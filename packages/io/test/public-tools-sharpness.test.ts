import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../../../', import.meta.url);

async function source(path: string): Promise<string> {
	return readFile(new URL(path, root), 'utf8');
}

test('io-public-tools is registered as one migrated tool cohort', async () => {
	const registry = await source('config/performance-pages/registry.ts');
	const group = registry.match(/'io-public-tools',[\s\S]*?\n\s*\)/)?.[0] ?? '';

	assert.match(group, /'io',[\s\S]*?\['graph', 'status'\],[\s\S]*?'migrated'/);
	assert.match(group, /'tool'/);
	assert.match(group, /current state|workflow task/i);
});

test('both public tools use three non-overlapping chapters under the layout main', async () => {
	for (const route of ['graph', 'status']) {
		const page = await source(`packages/io/src/routes/${route}/+page.svelte`);

		assert.equal(
			(page.match(/data-performance-chapter=/g) ?? []).length,
			3,
			`${route} should expose exactly three tool chapters`
		);
		assert.match(page, /data-performance-chapter="task-state"/);
		assert.match(page, /data-performance-chapter="workspace"/);
		assert.match(page, /data-performance-chapter="decision-receipt"/);
		assert.doesNotMatch(page, /<main(?:\s|>)/);
		assert.doesNotMatch(page, /\bthe page\b/i);
	}
});

test('the graph keeps every source artifact and default while moving large data off SSR', async () => {
	const server = await source('packages/io/src/routes/graph/+page.server.ts');
	const page = await source('packages/io/src/routes/graph/+page.svelte');
	const controls = await source('packages/io/src/lib/graph/GraphControls.svelte');

	assert.match(server, /fetch\('\/\.graph\/metadata\.json'\)/);
	assert.doesNotMatch(server, /fetch\('\/\.graph\/(?:nodes|edges)\.json'\)/);
	assert.match(page, /fetch\('\/api\/graph\/nodes'\)/);
	assert.match(page, /fetch\('\/api\/graph\/edges'\)/);
	assert.match(page, /explicit:\s*true/);
	assert.match(page, /crossReference:\s*true/);
	assert.match(page, /concept:\s*true/);
	assert.match(page, /semantic:\s*false/);
	assert.match(page, /infrastructure:\s*true/);
	assert.match(page, /showLabels[^=]*=\s*\$state\(true\)/);
	assert.match(page, /showEdgeLabels[^=]*=\s*\$state\(false\)/);
	assert.match(page, /hideOrphans[^=]*=\s*\$state\(true\)/);
	assert.match(controls, /All documents/);
	assert.match(controls, /Same package/);
	assert.match(controls, /Shared concept/);
});

test('the graph has a keyboard start, visible meanings, selected evidence, and no-JavaScript recovery', async () => {
	const page = await source('packages/io/src/routes/graph/+page.svelte');
	const graph = await source('packages/io/src/lib/graph/KnowledgeGraph.svelte');
	const controls = await source('packages/io/src/lib/graph/GraphControls.svelte');
	const detail = await source('packages/io/src/lib/graph/NodeDetail.svelte');

	assert.match(page, /type="search"/);
	assert.match(page, /Search documents/i);
	assert.match(page, /data-graph-results/);
	assert.match(page, /GraphLegend/);
	assert.match(page, /<noscript>/);
	assert.match(page, /href="\/api\/graph\/nodes"/);
	assert.match(page, /href="\/api\/graph\/edges"/);
	assert.match(page, /href="\/api\/graph\/metadata"/);
	const sourceEndpoint = await source('packages/io/src/routes/api/graph/[artifact]/+server.ts');
	assert.match(sourceEndpoint, /nodes|edges|metadata/);
	assert.match(sourceEndpoint, /application\/json/);
	assert.match(page, /156|days old|built/i);
	assert.match(graph, /role="img"/);
	assert.match(graph, /aria-label=/);
	assert.match(graph, /selectedNodeId/);
	assert.doesNotMatch(graph, /rgba\(255,\s*255,\s*255/);
	assert.match(controls, /aria-pressed=/);
	assert.match(detail, /View source|Open source/i);
	assert.match(page, /aria-label="Close document details"/);
});

test('the status source checks all public properties and keeps incident-source truth separate', async () => {
	const { loadPublicStatus } = await import('../src/lib/status/source.ts');
	const calls: string[] = [];
	const fetchOk = async (input: string | URL | Request): Promise<Response> => {
		const url = String(input);
		calls.push(url);
		if (url.includes('modal.run')) {
			return Response.json({
				incidents: [{ timestamp: '2026-07-19T12:00:00.000Z', message: 'Recovered' }]
			});
		}
		return new Response('ok', { status: 200 });
	};

	const current = await loadPublicStatus(fetchOk, {
		now: () => new Date('2026-07-20T04:00:00.000Z'),
		timeoutMs: 100
	});

	assert.equal(current.status, 'operational');
	assert.equal(current.properties.length, 4);
	assert.equal(current.properties.every((property) => property.healthy), true);
	assert.equal(current.incidentSource.state, 'available');
	assert.equal(current.incidents.length, 1);
	assert.deepEqual(
		current.properties.map((property) => property.domain),
		[
			'createsomething.io',
			'createsomething.space',
			'createsomething.agency',
			'createsomething.ltd'
		]
	);
	assert.equal(calls.length, 5);

	const fetchPartial = async (input: string | URL | Request): Promise<Response> => {
		const url = String(input);
		if (url.includes('modal.run')) return new Response('gone', { status: 404 });
		if (url.includes('createsomething.space')) return new Response('down', { status: 503 });
		return new Response('ok', { status: 200 });
	};
	const partial = await loadPublicStatus(fetchPartial, {
		now: () => new Date('2026-07-20T04:00:00.000Z'),
		timeoutMs: 100
	});

	assert.equal(partial.status, 'degraded');
	assert.equal(partial.properties.find((property) => property.domain === 'createsomething.space')?.status_code, 503);
	assert.equal(partial.incidentSource.state, 'unavailable');
	assert.deepEqual(partial.incidents, []);
});

test('the status route exposes verified, degraded, unknown, freshness, incident, and recovery states', async () => {
	const server = await source('packages/io/src/routes/status/+page.server.ts');
	const page = await source('packages/io/src/routes/status/+page.svelte');

	assert.match(server, /loadPublicStatus/);
	assert.doesNotMatch(server, /Status fetch failed/);
	assert.match(page, /operational/);
	assert.match(page, /degraded/);
	assert.match(page, /outage/);
	assert.match(page, /unknown/);
	assert.match(page, /incidentSource/);
	assert.match(page, /updated_at/);
	assert.match(page, /href="\/status"/);
	assert.match(page, /Check again|Retry/i);
	assert.match(page, /status_code/);
	assert.doesNotMatch(page, /Unable to fetch status:/);
	assert.doesNotMatch(page, /Real-time health monitoring/);
});
