import assert from 'node:assert/strict';
import { test } from 'node:test';
import { discoverTasteCandidates } from '../src/lib/taste/discovery.ts';
interface DiscoveryBody {
	source: string;
	status: string;
	candidates: { imageUrl: string }[];
	writePolicy: { writesEnabled: boolean };
	evidence: { visualInspection: string };
}
const operator = {
	subject: 'operator',
	email: 'owner@example.com',
	claims: { email_verified: true }
};
function setup() {
	const calls: string[] = [];
	return {
		calls,
		deps: {
			verify: async (token: string) => (token === 'valid' ? operator : null),
			search: async ({ query }: { query: string }) => {
				calls.push(query);
				return {
					blocks: [
						{
							id: 1,
							class: 'Image' as const,
							title: 'minimal dashboard',
							imageUrl: 'https://example.com/original.png'
						}
					]
				};
			}
		}
	};
}
test('denies unauthenticated, invalid, unconfigured, unverified and unlisted callers before provider access', async () => {
	for (const [token, allowedEmails, identity, status] of [
		[null, 'owner@example.com', operator, 401],
		['bad', 'owner@example.com', operator, 401],
		['valid', '', operator, 403],
		['valid', 'other@example.com', operator, 403],
		['valid', 'owner@example.com', { ...operator, claims: { email_verified: false } }, 403]
	] as const) {
		const { calls, deps } = setup();
		if (token === 'valid') deps.verify = async () => identity;
		const response = await discoverTasteCandidates(
			{
				url: new URL('https://example.com?q=dashboard'),
				token,
				allowedEmails,
				accessToken: 'secret'
			},
			deps
		);
		assert.equal(response.status, status);
		assert.equal(response.headers.get('cache-control'), 'private, no-store');
		assert.equal(calls.length, 0);
	}
});
test('uses bounded v3 discovery, deduplicates candidates, and remains proposal-only without shared caching', async () => {
	const { calls, deps } = setup();
	const response = await discoverTasteCandidates(
		{
			url: new URL('https://example.com?q=minimal%20dashboard&q=clear%20interface&limit=1'),
			token: 'valid',
			allowedEmails: ' OWNER@example.com ',
			accessToken: 'secret'
		},
		deps
	);
	assert.equal(response.status, 200);
	assert.equal(response.headers.get('cache-control'), 'private, no-store');
	const body = (await response.json()) as DiscoveryBody;
	assert.deepEqual(calls, ['minimal dashboard', 'clear interface']);
	assert.equal(body.source, 'are.na-v3-search');
	assert.equal(body.candidates.length, 1);
	assert.equal(body.candidates[0].imageUrl, 'https://example.com/original.png');
	assert.equal(body.writePolicy.writesEnabled, false);
	assert.equal(body.evidence.visualInspection, 'required');
});
test('reports partial and total provider failures truthfully without raw errors or legacy fallback', async () => {
	for (const allFail of [false, true]) {
		const { calls, deps } = setup();
		deps.search = async ({ query }) => {
			calls.push(query);
			if (allFail || query === 'fail') throw new Error('secret provider body');
			return { blocks: [] };
		};
		const response = await discoverTasteCandidates(
			{
				url: new URL('https://example.com?q=ok&q=fail'),
				token: 'valid',
				allowedEmails: 'owner@example.com',
				accessToken: 'secret'
			},
			deps
		);
		const body = (await response.json()) as DiscoveryBody;
		assert.equal(body.status, allFail ? 'degraded' : 'partial');
		assert.equal(response.status, allFail ? 502 : 200);
		assert.equal(JSON.stringify(body).includes('secret'), false);
		assert.equal(calls.length, 2);
	}
});
test('rejects oversized queries before issuing any provider reads', async () => {
	const { calls, deps } = setup();
	const response = await discoverTasteCandidates(
		{
			url: new URL('https://example.com?q=' + 'x'.repeat(201)),
			token: 'valid',
			allowedEmails: 'owner@example.com',
			accessToken: 'secret'
		},
		deps
	);
	assert.equal(response.status, 400);
	assert.equal(calls.length, 0);
});
