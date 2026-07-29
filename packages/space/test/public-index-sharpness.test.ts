import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dataSource = readFileSync(new URL('../src/routes/data/+page.svelte', import.meta.url), 'utf8');
const discoverSource = readFileSync(
	new URL('../src/routes/discover/+page.svelte', import.meta.url),
	'utf8'
);
const layoutSource = readFileSync(new URL('../src/routes/+layout.svelte', import.meta.url), 'utf8');
const registrySource = readFileSync(
	new URL('../../../config/performance-pages/registry.ts', import.meta.url),
	'utf8'
);

function chapters(source: string): string[] {
	return [...source.matchAll(/data-page-chapter="([^"]+)"/g)].map((match) => match[1]);
}

test('each Space index has one orientation and one complete collection', () => {
	for (const source of [dataSource, discoverSource]) {
		assert.deepEqual(chapters(source), ['orientation', 'collection']);
		assert.match(source, /aria-labelledby="[^"]+-collection-title"/);
	}
});

test('route fragments do not nest another main landmark inside the shared layout', () => {
	assert.match(layoutSource, /<main id="main-content"/);
	for (const source of [dataSource, discoverSource]) {
		assert.doesNotMatch(source, /<\/?main(?:\s|>)/);
	}
});

test('Data Studio names the only default and explains its complete evidence card plainly', () => {
	assert.match(dataSource, /Choose a live dataset to inspect\./);
	assert.match(dataSource, /Start with NBA Live\./);
	assert.match(dataSource, /href:\s*'\/data\/nba'/);
	for (const evidence of [
		'A Cloudflare Worker limits requests and caches results',
		'Saved snapshots make analysis repeatable',
		'Built for close inspection, not decoration'
	]) {
		assert.match(dataSource, new RegExp(evidence));
	}
});

test('Discover defines the first technical term and preserves all six concepts', () => {
	assert.match(discoverSource, /Choose the concept closest to your current question\./);
	assert.match(discoverSource, /Model Context Protocol \(MCP\)/);
	for (const slug of [
		'creation-moat',
		'three-tier-framework',
		'hermeneutic-circle',
		'policy-as-artifact',
		'composio-bridge',
		'subtractive-triad'
	]) {
		assert.match(discoverSource, new RegExp(`slug: '${slug}'`));
	}
});

test('both indexes contain cards and links at mobile width', () => {
	for (const source of [dataSource, discoverSource]) {
		assert.match(source, /min-width:\s*0/);
		assert.match(source, /max-width:\s*100%/);
	}
});

test('the complete two-route registry cohort migrates atomically', () => {
	const cohort = registrySource.match(/group\(\s*'space-indexes',[\s\S]*?\n\s*\),/)?.[0];
	assert.ok(cohort, 'space-indexes registry cohort should exist');
	assert.match(cohort, /\['data', 'discover'\],\s*'migrated'/);
});
