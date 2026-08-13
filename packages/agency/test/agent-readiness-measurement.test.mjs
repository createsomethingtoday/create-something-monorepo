import assert from 'node:assert/strict';
import test from 'node:test';

import {
	AGENCY_MARKDOWN_FOR_AGENTS_PRIORITY_ROUTES,
	checkMarkdownForAgents,
	inspectMarkdownForAgentsResponse
} from '../scripts/verify-markdown-for-agents.mjs';
import {
	AGENCY_CLOUDFLARE_ACCOUNT_ID,
	buildAgentReadinessFunnelSql,
	buildAgentReadinessReportEnvironment
} from '../scripts/report-agent-readiness-funnel.mjs';

test('Markdown for Agents check covers the high-intent agency routes with real negotiation assertions', async () => {
	assert.deepEqual(AGENCY_MARKDOWN_FOR_AGENTS_PRIORITY_ROUTES, [
		'/',
		'/agent-readiness',
		'/workflows',
		'/map',
		'/book'
	]);

	const requests = [];
	const receipt = await checkMarkdownForAgents({
		origin: 'https://example.test',
		fetchImpl: async (url, init) => {
			requests.push({ url: String(url), init });
			return new Response('# Agent-ready content', {
				status: 200,
				headers: {
					'content-type': 'text/markdown; charset=utf-8',
					vary: 'accept',
					'x-markdown-tokens': '4153',
					'x-original-tokens': '18267',
					'content-signal': 'ai-train=yes, search=yes, ai-input=yes'
				}
			});
		}
	});

	assert.equal(receipt.passed, true);
	assert.equal(receipt.routes.length, AGENCY_MARKDOWN_FOR_AGENTS_PRIORITY_ROUTES.length);
	assert.ok(requests.every(({ init }) => init.headers.Accept === 'text/markdown'));
	assert.ok(requests.every(({ url }) => url.startsWith('https://example.test/')));
});

test('Markdown for Agents check rejects an HTML response or missing negotiation evidence', () => {
	const result = inspectMarkdownForAgentsResponse(
		'/book',
		new Response('<html></html>', {
			status: 200,
			headers: { 'content-type': 'text/html; charset=utf-8' }
		})
	);

	assert.equal(result.passed, false);
	assert.deepEqual(result.failures, [
		'content-type must be text/markdown',
		'vary must include accept',
		'x-markdown-tokens must be a positive integer',
		'x-original-tokens must be a positive integer',
		'content-signal must include ai-input=yes'
	]);
});

test('AI Buyer Readiness funnel report is read-only and isolates attributed booking sessions', () => {
	const sql = buildAgentReadinessFunnelSql({ days: 30 });

	for (const action of [
		'booking_handoff_viewed',
		'booking_form_started',
		'booking_initiated',
		'booking_completed'
	]) {
		assert.ok(sql.includes(`'${action}'`), `missing ${action} stage`);
	}
	assert.ok(sql.includes("json_extract(metadata, '$.source') = 'agent-readiness'"));
	assert.ok(sql.includes("json_extract(metadata, '$.intent') = 'ai-readiness-audit'"));
	assert.ok(sql.includes("datetime('now', '-30 days')"));
	assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i);
	assert.throws(() => buildAgentReadinessFunnelSql({ days: 0 }), /between 1 and 365/);
});

test('AI Buyer Readiness report targets the owned Cloudflare account unless an explicit account is supplied', () => {
	assert.equal(
		buildAgentReadinessReportEnvironment({}).CLOUDFLARE_ACCOUNT_ID,
		AGENCY_CLOUDFLARE_ACCOUNT_ID
	);
	assert.equal(
		buildAgentReadinessReportEnvironment({ CLOUDFLARE_ACCOUNT_ID: 'override-account' })
			.CLOUDFLARE_ACCOUNT_ID,
		'override-account'
	);
});
