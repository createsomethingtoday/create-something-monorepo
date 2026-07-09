import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const conceptUrl = new URL(
	'../src/lib/content/canon/concepts/conviction-without-dependence.md',
	import.meta.url
);
const navigationUrl = new URL('../src/lib/canon/navigation.ts', import.meta.url);
const voiceUrl = new URL('../src/routes/voice/+page.svelte', import.meta.url);
const standardsUrl = new URL('../src/routes/standards/+page.svelte', import.meta.url);
const generatedCanonUrl = new URL(
	'../../create-something-mcp/src/content/generated/canon.ts',
	import.meta.url
);
const generatedPropertyDocsUrl = new URL(
	'../../create-something-mcp/src/content/generated/property-docs.ts',
	import.meta.url
);
const strategyUrls = [
	new URL('../../../docs/AGENCY_CODEX_VECTOR_STRATEGY.md', import.meta.url),
	new URL('../../../docs/CREATE_SOMETHING_SYSTEMS_THESIS.md', import.meta.url),
	new URL('../../../docs/POLICY_OS_PRODUCT_DEFINITION.md', import.meta.url),
	new URL('../../../docs/OPENAI_PARTNER_READINESS_PACKET.md', import.meta.url)
];

test('Canon publishes conviction without dependence as a discoverable operating doctrine', () => {
	assert.ok(existsSync(conceptUrl), 'expected the public Canon doctrine source to exist');

	const concept = readFileSync(conceptUrl, 'utf8');
	const navigation = readFileSync(navigationUrl, 'utf8');
	const voice = readFileSync(voiceUrl, 'utf8');
	const standards = readFileSync(standardsUrl, 'utf8');

	assert.match(concept, /title: "Conviction Without Dependence"/);
	assert.match(concept, /Model-opinionated in practice\. Model-portable by design\./);
	assert.match(concept, /Use the best instrument\. Own the system\./);
	assert.match(concept, /builds primarily with (?:\*\*)?OpenAI Codex(?:\*\*)?/i);
	assert.match(concept, /not (?:an? )?official OpenAI partnership/i);

	for (const ownedLayer of [
		'data',
		'MCP',
		'harness',
		'skills',
		'prompts',
		'policy',
		'evals',
		'receipts',
		'routing',
		'open-weight',
		'custom models'
	]) {
		assert.match(
			concept,
			new RegExp(`\\b${ownedLayer.replace('-', '[- ]')}\\b`, 'i'),
			`expected Canon to account for ${ownedLayer}`
		);
	}

	assert.match(concept, /\/canon\/concepts\/gelassenheit/);
	assert.match(concept, /\/canon\/concepts\/complementarity/);
	assert.match(concept, /\/patterns\/crystallization/);
	assert.match(navigation, /label: 'Conviction Without Dependence'/);
	assert.match(navigation, /href: '\/canon\/concepts\/conviction-without-dependence'/);
	assert.match(voice, /Platform Claims/);
	assert.match(voice, /Built primarily with OpenAI Codex/);
	assert.match(voice, /\/canon\/concepts\/conviction-without-dependence/);
	assert.match(standards, /Platform Conviction Standard/);
	assert.match(standards, /model routing, fallback, and rollback/i);
	assert.match(standards, /\/canon\/concepts\/conviction-without-dependence/);

	for (const strategyUrl of strategyUrls) {
		const strategy = readFileSync(strategyUrl, 'utf8');
		assert.match(strategy, /Conviction [Ww]ithout [Dd]ependence/);
		assert.match(strategy, /Model-opinionated in practice\. Model-portable by design\./);
	}
});

test('generated MCP knowledge preserves the Canon doctrine and agency claim boundary', () => {
	const generatedCanon = readFileSync(generatedCanonUrl, 'utf8');
	const generatedPropertyDocs = readFileSync(generatedPropertyDocsUrl, 'utf8');

	assert.match(generatedCanon, /title: "Conviction Without Dependence"/);
	assert.match(generatedCanon, /Model-opinionated in practice\. Model-portable by design\./);
	assert.match(generatedCanon, /Built primarily with OpenAI Codex\. Designed to outlast any model\./);
	assert.match(generatedCanon, /not an official OpenAI partnership/i);

	assert.match(generatedPropertyDocs, /Conviction Without Dependence/);
	assert.match(
		generatedPropertyDocs,
		/Built primarily with OpenAI Codex\. Designed to outlast any model\./
	);
	assert.match(
		generatedPropertyDocs,
		/Model-opinionated in practice\. Model-portable by design\./
	);
});
