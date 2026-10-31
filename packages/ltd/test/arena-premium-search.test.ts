import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	ArenaPremiumSearchError,
	searchPublicArenaBlocks
} from '../src/lib/integrations/arena/premium-search.ts';

test('search returns only explicit public blocks and narrow safe reference fields', async () => {
	const result = await searchPublicArenaBlocks({
		query: 'UI & navigation',
		accessToken: 'synthetic-token',
		per: 5,
		fetch: async (input, init) => {
			const url = new URL(String(input));
			assert.equal(url.origin + url.pathname, 'https://api.are.na/v3/search');
			assert.equal(url.searchParams.get('query'), 'UI & navigation');
			assert.equal(url.searchParams.get('type'), 'Block');
			assert.equal(url.searchParams.get('page'), '1');
			assert.equal(url.searchParams.get('per'), '5');
			assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer synthetic-token');
			return Response.json({
				data: [
					{
						id: 1,
						type: 'Image',
						visibility: 'public',
						title: 'Navigation',
						image: {
							src: 'https://example.test/original.png',
							small: { src: 'https://example.test/thumb.png' }
						},
						user: { name: 'secret' },
						connections: [{ visibility: 'private' }]
					},
					{ id: 2, type: 'Text', visibility: 'private', content: 'hidden' },
					{ id: 3, type: 'Link', title: 'unknown visibility' },
					{ id: 4, type: 'Channel', visibility: 'public' },
					{ id: '5', type: 'Image', visibility: 'public' }
				]
			});
		}
	});
	assert.deepEqual(result.blocks, [
		{ id: 1, class: 'Image', title: 'Navigation', imageUrl: 'https://example.test/original.png' }
	]);
});

test('normalizes supported types while omitting unsafe URLs and provider metadata', async () => {
	const result = await searchPublicArenaBlocks({
		query: 'layout',
		accessToken: 'synthetic-token',
		fetch: async () =>
			Response.json({
				data: [
					{
						id: 1,
						type: 'Embed',
						visibility: 'public',
						source: { url: 'javascript:alert(1)' },
						image: { src: 'data:image/png;base64,secret' },
						embed: { html: '<script>bad()</script>' }
					},
					{
						id: 2,
						type: 'Link',
						visibility: 'public',
						source: {
							url: 'https://example.test/reference',
							title: 'Reference',
							provider: { token: 'secret' }
						},
						image: { src: 'https://user:password@example.test/private.png' }
					},
					{
						id: 3,
						type: 'Text',
						visibility: 'public',
						content: 'Useful observation',
						description: 'A note'
					},
					{ id: 4, type: 'Image', visibility: 'closed' },
					{ id: 0, type: 'Image', visibility: 'public' },
					{ id: 1.5, type: 'Image', visibility: 'public' },
					{ id: Number.MAX_SAFE_INTEGER + 1, type: 'Image', visibility: 'public' },
					{ id: 8, type: '__proto__', visibility: 'public' },
					null
				],
				meta: { next_page: 2 },
				user: { secret: true }
			})
	});
	assert.deepEqual(result, {
		blocks: [
			{ id: 1, class: 'Media' },
			{
				id: 2,
				class: 'Link',
				source: { url: 'https://example.test/reference', title: 'Reference' }
			},
			{ id: 3, class: 'Text', content: 'Useful observation', description: 'A note' }
		]
	});
});

test('uses one bounded request even when upstream advertises more pages or returns extra rows', async () => {
	let calls = 0;
	const result = await searchPublicArenaBlocks({
		query: '  typography ✓ + #  ',
		accessToken: 'synthetic-token',
		per: 1,
		fetch: async (input, init) => {
			calls++;
			assert.equal(new URL(String(input)).searchParams.get('query'), 'typography ✓ + #');
			assert.equal(init?.redirect, 'error');
			return Response.json({
				data: [1, 2, 3].map((id) => ({ id, type: 'Text', visibility: 'public' })),
				meta: { has_more_pages: true, next_page: 2 }
			});
		}
	});
	assert.equal(calls, 1);
	assert.deepEqual(result.blocks, [{ id: 1, class: 'Text' }]);
});

test('invalid credentials and input never invoke the provider', async () => {
	const request: typeof fetch = async () => {
		throw Error('provider should not be invoked');
	};
	for (const [overrides, code] of [
		[{ accessToken: '' }, 'missing_token'],
		[{ query: '  ' }, 'invalid_query'],
		[{ query: 'x'.repeat(201) }, 'invalid_query'],
		[{ per: 0 }, 'invalid_limit'],
		[{ per: 51 }, 'invalid_limit'],
		[{ per: 1.5 }, 'invalid_limit'],
		[{ per: NaN }, 'invalid_limit']
	] as const) {
		await assert.rejects(
			searchPublicArenaBlocks(
				Object.assign(
					{ query: 'layout', accessToken: 'synthetic-token', fetch: request },
					overrides
				)
			),
			(error: unknown) => error instanceof ArenaPremiumSearchError && error.code === code
		);
	}
});

for (const [status, code] of [
	[401, 'unauthorized'],
	[403, 'forbidden'],
	[429, 'rate_limited'],
	[503, 'upstream_unavailable'],
	[400, 'upstream_error']
] as const) {
	test(`HTTP ${status} returns a safe ${code} error without retries`, async () => {
		let calls = 0;
		await assert.rejects(
			searchPublicArenaBlocks({
				query: 'layout',
				accessToken: 'synthetic-token',
				fetch: async () => {
					calls++;
					return new Response('secret provider body', { status });
				}
			}),
			(error: unknown) => {
				assert.ok(error instanceof ArenaPremiumSearchError);
				assert.equal(error.code, code);
				assert.doesNotMatch(String(error), /secret|synthetic-token/);
				return true;
			}
		);
		assert.equal(calls, 1);
	});
}

test('malformed JSON and missing data fail truthfully; empty search remains successful', async () => {
	for (const response of [
		new Response('not-json'),
		Response.json(null),
		Response.json({ data: {} })
	]) {
		await assert.rejects(
			searchPublicArenaBlocks({
				query: 'layout',
				accessToken: 'synthetic-token',
				fetch: async () => response
			}),
			(error: unknown) =>
				error instanceof ArenaPremiumSearchError && error.code === 'invalid_response'
		);
	}
	assert.deepEqual(
		await searchPublicArenaBlocks({
			query: 'layout',
			accessToken: 'synthetic-token',
			fetch: async () => Response.json({ data: [] })
		}),
		{ blocks: [] }
	);
});

test('network failures omit sensitive exception detail', async () => {
	await assert.rejects(
		searchPublicArenaBlocks({
			query: 'layout',
			accessToken: 'synthetic-token',
			fetch: async () => {
				throw Error('Bearer synthetic-token private provider payload');
			}
		}),
		(error: unknown) => {
			assert.ok(error instanceof ArenaPremiumSearchError);
			assert.equal(error.code, 'network_error');
			assert.doesNotMatch(String(error), /synthetic-token|private/);
			return true;
		}
	);
});

test('timeout aborts a stalled provider request and clears its scoped timer', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] });
	let signal: AbortSignal | undefined;
	const pending = searchPublicArenaBlocks({
		query: 'layout',
		accessToken: 'synthetic-token',
		fetch: async (_input, init) => {
			signal = init?.signal ?? undefined;
			return new Promise<Response>(() => {});
		}
	});
	t.mock.timers.tick(10_000);
	await assert.rejects(
		pending,
		(error: unknown) => error instanceof ArenaPremiumSearchError && error.code === 'timeout'
	);
	assert.equal(signal?.aborted, true);
});

test('timeout covers reading the response body as well as receiving headers', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] });
	const pending = searchPublicArenaBlocks({
		query: 'layout',
		accessToken: 'synthetic-token',
		fetch: async () => new Response(new ReadableStream({ start() {} }))
	});
	await Promise.resolve();
	t.mock.timers.tick(10_000);
	await assert.rejects(
		pending,
		(error: unknown) => error instanceof ArenaPremiumSearchError && error.code === 'timeout'
	);
});
