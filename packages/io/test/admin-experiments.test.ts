import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import {
	createAdminExperimentCatalog,
	createUnavailableExperimentCatalog,
	getAdminExperimentCatalogStats
} from '../src/lib/admin/experiment-catalog';

const adminExperimentCandidates = [
	'src/routes/api/admin/experiments/+server.ts',
	'src/routes/api/admin/bulk-tag/+server.ts',
	'src/routes/api/admin/tags/+server.ts',
	'src/routes/api/admin/stats/+server.ts',
	'src/routes/admin/experiments/+page.server.ts',
	'src/routes/admin/experiments/+page.svelte',
	'src/routes/admin/experiments/new/+page.svelte',
	'src/routes/admin/experiments/[id]/edit/+page.svelte'
];

const activeAdminExperimentSources = adminExperimentCandidates
	.map((path) => new URL(`../${path}`, import.meta.url))
	.filter((path) => existsSync(path))
	.map((path) => readFileSync(path, 'utf8'))
	.join('\n');

test('the active admin experiment surface does not depend on the retired papers table', () => {
	assert.doesNotMatch(
		activeAdminExperimentSources,
		/\b(?:FROM|INTO|UPDATE|DELETE\s+FROM)\s+papers\b|table:\s*['"]papers['"]/i
	);
});

test('the admin catalog exposes only published navigation metadata', () => {
	const catalog = createAdminExperimentCatalog([
		{
			id: 'file-one',
			slug: 'one',
			title: 'One',
			description: 'First experiment',
			category: 'research',
			featured: 1,
			updated_at: '2026-07-17T00:00:00Z'
		},
		{
			id: 'static-two',
			slug: 'two',
			title: 'Two',
			category: 'operations',
			featured: 0,
			route: '/experiments/two'
		}
	]);

	assert.equal(catalog.status, 'ready');
	if (catalog.status === 'ready') {
		assert.deepEqual(
			catalog.experiments.map(({ slug, publicPath, featured }) => ({ slug, publicPath, featured })),
			[
				{ slug: 'one', publicPath: '/experiments/one', featured: true },
				{ slug: 'two', publicPath: '/experiments/two', featured: false }
			]
		);
	}
	assert.deepEqual(getAdminExperimentCatalogStats(catalog), { total: 2, featured: 1 });
});

test('an unavailable catalog cannot become zero metrics', () => {
	assert.deepEqual(getAdminExperimentCatalogStats(createUnavailableExperimentCatalog()), {
		total: null,
		featured: null
	});
});

test('the rendered admin surface is explicitly read-only', () => {
	const pageSource = readFileSync(
		new URL('../src/routes/admin/experiments/+page.svelte', import.meta.url),
		'utf8'
	);

	assert.match(pageSource, /Read-only/);
	assert.match(pageSource, /Source of truth: repository/);
	assert.doesNotMatch(pageSource, /Auto-Tag All|New Experiment|Unfeature|Delete/);
});

test('admin execution statistics use the production executed_at column', () => {
	const statsSource = readFileSync(
		new URL('../src/routes/api/admin/stats/+server.ts', import.meta.url),
		'utf8'
	);

	assert.match(statsSource, /WHERE executed_at >=/);
	assert.doesNotMatch(statsSource, /WHERE created_at >=/);
	assert.match(statsSource, /Cache-Control': complete \? 'private, max-age=300' : 'no-store'/);
});
