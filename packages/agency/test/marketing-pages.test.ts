import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
	marketingPageMinimums,
	marketingPagePortfolio,
	scoreMarketingPage
} from '../src/lib/data/marketingPages.ts';

const packageRoot = new URL('..', import.meta.url).pathname;

function pageFileForRoute(route: string): string {
	const routePath = route === '/' ? '' : route.slice(1);
	return path.join(packageRoot, 'src/routes', routePath, '+page.svelte');
}

test('Dify marketing portfolio has one pillar and indexable support routes', () => {
	const difyPages = marketingPagePortfolio.filter((entry) => entry.cluster === 'dify');

	assert.equal(difyPages.filter((entry) => entry.role === 'pillar').length, 1);
	assert.deepEqual(
		difyPages.map((entry) => entry.path).sort(),
		[
			'/dify',
			'/dify/agent-eval-gates',
			'/dify/content-engine',
			'/dify/mcp-control-plane',
			'/dify/n8n-vs-dify',
			'/dify/ship-dify-app-with-mcp-tools'
		]
	);
	assert.ok(difyPages.every((entry) => entry.decision === 'index'));
});

test('current marketing portfolio pages clear their route-decision strength threshold', () => {
	for (const entry of marketingPagePortfolio) {
		const source = readFileSync(pageFileForRoute(entry.path), 'utf8');
		const score = scoreMarketingPage(entry, source);

		assert.ok(
			score.percent >= marketingPageMinimums[entry.decision],
			`${entry.path} scored ${score.percent}`
		);
	}
});

test('internal-language drift lowers marketing page strength', () => {
	const entry = marketingPagePortfolio[0];
	const source = readFileSync(pageFileForRoute(entry.path), 'utf8');
	const cleanScore = scoreMarketingPage(entry, source, { plainLanguagePassed: true });
	const driftScore = scoreMarketingPage(entry, source, { plainLanguagePassed: false });

	assert.equal(cleanScore.percent - driftScore.percent, 12);
});
