import { beforeEach, describe, expect, it } from 'vitest';
import worker from '../src/index';
import type { Env } from '../src/index';
import { createTestDb } from './d1-sqlite';

const REVIEWER_KEY = 'test-reviewer-key-0123456789abcdef';
const CREATOR_KEY = 'test-creator-key-0123456789abcdefg';
const CALLER_KEYS = JSON.stringify([
	{ name: 'template-review-mcp', role: 'reviewer', key: REVIEWER_KEY },
	{ name: 'asset-dashboard', role: 'creator', key: CREATOR_KEY }
]);

const VERSION = 'recTEST_VERSION_1';
const ASSET = 'recTEST_ASSET_1';
const REVIEWER = { email: 'reviewer@example.com', role: 'reviewer' };
const OTHER_REVIEWER = { email: 'other-reviewer@example.com', role: 'reviewer' };
const CREATOR = { email: 'Creator@Example.com', role: 'creator' };

type TestActor = { email: string; role: string };

let env: Env;

beforeEach(() => {
	env = { DB: createTestDb(), CALLER_KEYS };
});

function keyFor(actor: TestActor | null): string {
	return actor?.role === 'creator' ? CREATOR_KEY : REVIEWER_KEY;
}

async function call(
	method: string,
	path: string,
	actor: TestActor | null,
	body?: unknown,
	options: { key?: string; role?: string | null } = {}
) {
	const headers: Record<string, string> = { Authorization: `Bearer ${options.key ?? keyFor(actor)}` };
	if (actor) headers['X-Actor-Email'] = actor.email;
	const role = options.role === undefined ? actor?.role : options.role;
	if (role) headers['X-Actor-Role'] = role;
	const response = await worker.fetch(
		new Request(`https://comments.test${path}`, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body)
		}),
		env
	);
	return { status: response.status, json: (await response.json()) as any };
}

const post = (actor: TestActor, body: Record<string, unknown>, version = VERSION) =>
	call('POST', `/v1/versions/${version}/comments`, actor, { assetRef: ASSET, ...body });

describe('auth', () => {
	it('serves health without a key', async () => {
		const response = await worker.fetch(new Request('https://comments.test/'), env);
		expect(response.status).toBe(200);
	});

	it('rejects a wrong key and a missing or invalid actor email', async () => {
		expect((await call('GET', `/v1/versions/${VERSION}/comments`, REVIEWER, undefined, { key: 'nope' })).status).toBe(401);
		expect((await call('GET', `/v1/versions/${VERSION}/comments`, null)).status).toBe(400);
		expect((await call('GET', `/v1/versions/${VERSION}/comments`, { email: 'not-an-email', role: 'reviewer' })).status).toBe(400);
	});

	it('fails closed when caller keys are missing or malformed', async () => {
		env.CALLER_KEYS = undefined;
		expect((await call('GET', `/v1/versions/${VERSION}/comments`, REVIEWER)).status).toBe(401);
		env.CALLER_KEYS = '{not json';
		expect((await call('GET', `/v1/versions/${VERSION}/comments`, REVIEWER)).status).toBe(401);
	});

	it('ignores caller keys shorter than 32 characters', async () => {
		env.CALLER_KEYS = JSON.stringify([{ name: 'weak', role: 'reviewer', key: 'short-key' }]);
		expect((await call('GET', `/v1/versions/${VERSION}/comments`, REVIEWER, undefined, { key: 'short-key' })).status).toBe(401);
	});

	it('takes the role from the key, not from the header', async () => {
		// A creator-scoped caller cannot claim the reviewer role.
		const claimed = await call('POST', `/v1/versions/${VERSION}/release`, REVIEWER, undefined, { key: CREATOR_KEY });
		expect(claimed.status).toBe(403);

		// Without the header the key's role applies.
		const draft = await call('POST', `/v1/versions/${VERSION}/comments`, REVIEWER, { assetRef: ASSET, body: 'note' }, { role: null });
		expect(draft.status).toBe(201);
		expect(draft.json.data).toMatchObject({ authorRole: 'reviewer', visibility: 'draft' });
		await call('POST', `/v1/versions/${VERSION}/release`, REVIEWER);

		const creatorReply = await call('POST', `/v1/versions/${VERSION}/comments`, CREATOR, { assetRef: ASSET, body: 'hi' }, { role: null });
		expect(creatorReply.json.data).toMatchObject({ authorRole: 'creator', visibility: 'released' });
	});
});

describe('visibility', () => {
	it('hides drafts and internal notes from creators until release', async () => {
		await post(REVIEWER, { body: 'Fix the 404 page', rubricRef: 'rubric-404' });
		await post(REVIEWER, { body: 'Possible plagiarism, check with lead', visibility: 'internal' });

		// An unreleased thread reads as absent to the creator: no read, no reply.
		expect((await call('GET', `/v1/versions/${VERSION}/comments?assetRef=${ASSET}`, CREATOR)).status).toBe(404);
		expect((await call('GET', `/v1/assets/${ASSET}/comments`, CREATOR)).json.data).toEqual([]);
		expect((await post(CREATOR, { body: 'Any update?' })).status).toBe(404);
		expect((await call('GET', `/v1/versions/${VERSION}/comments`, REVIEWER)).json.data).toHaveLength(2);

		const release = await call('POST', `/v1/versions/${VERSION}/release`, REVIEWER);
		// With no Knock key the email is off, and the release says so.
		expect(release.json.data).toEqual({ released: 1, notification: { status: 'none', reason: 'not_configured' } });

		const creatorView = (await call('GET', `/v1/versions/${VERSION}/comments?assetRef=${ASSET}`, CREATOR)).json.data;
		expect(creatorView).toHaveLength(1);
		expect(creatorView[0]).toMatchObject({ body: 'Fix the 404 page', visibility: 'released', rubricRef: 'rubric-404' });
		expect(creatorView[0].releasedAt).toBeTruthy();
	});

	it('releases creator replies on write and lowercases the author email', async () => {
		await post(REVIEWER, { body: 'Fix the 404 page', visibility: 'released' });
		const reply = await post(CREATOR, { body: 'Fixed, please re-check' });
		expect(reply.status).toBe(201);
		expect(reply.json.data).toMatchObject({
			authorEmail: 'creator@example.com',
			authorRole: 'creator',
			visibility: 'released'
		});
	});

	it('blocks creators from posting drafts and from releasing', async () => {
		expect((await post(CREATOR, { body: 'x', visibility: 'internal' })).status).toBe(403);
		expect((await call('POST', `/v1/versions/${VERSION}/release`, CREATOR)).status).toBe(403);
	});

	it('treats an unreleased parent as missing for creators', async () => {
		const draft = await post(REVIEWER, { body: 'draft note' });
		const reply = await post(CREATOR, { body: 'replying', parentId: draft.json.data.id });
		expect(reply.status).toBe(404);
	});

	it('rejects a parent from another version', async () => {
		const other = await post(REVIEWER, { body: 'other version', visibility: 'released' }, 'recTEST_VERSION_9');
		const reply = await post(REVIEWER, { body: 'cross-thread', parentId: other.json.data.id });
		expect(reply.status).toBe(404);
	});
});

describe('version pinned to one asset', () => {
	it('rejects a comment whose asset differs from the version asset', async () => {
		expect((await post(REVIEWER, { body: 'first' })).status).toBe(201);

		const wrongAsset = await call('POST', `/v1/versions/${VERSION}/comments`, REVIEWER, {
			assetRef: 'recTEST_ASSET_2',
			body: 'sent with the wrong asset',
			visibility: 'released'
		});
		expect(wrongAsset.status).toBe(409);

		// The other asset's creator never sees it.
		expect((await call('GET', '/v1/assets/recTEST_ASSET_2/comments', CREATOR)).json.data).toEqual([]);
	});

	it('only a reviewer opens a thread; creators cannot pin a version', async () => {
		// A creator key naming its own asset on someone else's fresh version.
		expect((await post(CREATOR, { body: 'question before review' })).status).toBe(404);
		const reviewer = await call('POST', `/v1/versions/${VERSION}/comments`, REVIEWER, {
			assetRef: 'recTEST_ASSET_2',
			body: 'the real asset, from Airtable'
		});
		expect(reviewer.status).toBe(201);
		// The creator of the first asset still cannot post on it.
		expect((await post(CREATOR, { body: 'mine?' })).status).toBe(409);
	});

	it('a rejected request leaves no pin behind', async () => {
		expect((await post(REVIEWER, { body: 'reply', parentId: 'missing-parent' })).status).toBe(404);
		const other = await call('POST', `/v1/versions/${VERSION}/comments`, REVIEWER, { assetRef: 'recTEST_ASSET_2', body: 'x' });
		expect(other.status).toBe(201);
	});

	it('creator reads of a version must name its asset', async () => {
		await post(REVIEWER, { body: 'feedback', visibility: 'released' });
		expect((await call('GET', `/v1/versions/${VERSION}/comments`, CREATOR)).status).toBe(400);
		expect((await call('GET', `/v1/versions/${VERSION}/comments?assetRef=recTEST_ASSET_2`, CREATOR)).status).toBe(404);
		expect((await call('GET', `/v1/versions/recTEST_VERSION_9/comments?assetRef=${ASSET}`, CREATOR)).status).toBe(404);
		expect((await call('GET', `/v1/versions/${VERSION}/comments?assetRef=${ASSET}`, CREATOR)).json.data).toHaveLength(1);
		// Reviewers read any version without naming the asset.
		expect((await call('GET', `/v1/versions/${VERSION}/comments`, REVIEWER)).status).toBe(200);
	});
});

describe('editing and deleting unreleased comments', () => {
	it('lets the author edit a draft and records the edit time', async () => {
		const draft = await post(REVIEWER, { body: 'Alt txt missing' });
		const edited = await call('PATCH', `/v1/comments/${draft.json.data.id}`, REVIEWER, { body: 'Alt text missing' });
		expect(edited.status).toBe(200);
		expect(edited.json.data).toMatchObject({ body: 'Alt text missing', visibility: 'draft' });
		expect(edited.json.data.editedAt).toBeTruthy();
	});

	it('lets the author edit an internal note', async () => {
		const note = await post(REVIEWER, { body: 'check w/ lead', visibility: 'internal' });
		expect((await call('PATCH', `/v1/comments/${note.json.data.id}`, REVIEWER, { body: 'check with lead' })).status).toBe(200);
	});

	it('blocks other reviewers, creators, and released comments', async () => {
		const draft = await post(REVIEWER, { body: 'draft' });
		const id = draft.json.data.id;
		expect((await call('PATCH', `/v1/comments/${id}`, OTHER_REVIEWER, { body: 'mine now' })).status).toBe(403);
		expect((await call('PATCH', `/v1/comments/${id}`, CREATOR, { body: 'mine now' })).status).toBe(403);
		expect((await call('DELETE', `/v1/comments/${id}`, OTHER_REVIEWER)).status).toBe(403);

		await call('POST', `/v1/versions/${VERSION}/release`, REVIEWER);
		expect((await call('PATCH', `/v1/comments/${id}`, REVIEWER, { body: 'too late' })).status).toBe(403);
		expect((await call('DELETE', `/v1/comments/${id}`, REVIEWER)).status).toBe(403);
	});

	it('rejects an empty edit and 404s unknown comments', async () => {
		const draft = await post(REVIEWER, { body: 'draft' });
		expect((await call('PATCH', `/v1/comments/${draft.json.data.id}`, REVIEWER, { body: '  ' })).status).toBe(400);
		expect((await call('PATCH', '/v1/comments/missing-id', REVIEWER, { body: 'x' })).status).toBe(404);
		expect((await call('DELETE', '/v1/comments/missing-id', REVIEWER)).status).toBe(404);
	});

	it('deletes the author draft, but not one that has replies', async () => {
		const lone = await post(REVIEWER, { body: 'remove me' });
		const removed = await call('DELETE', `/v1/comments/${lone.json.data.id}`, REVIEWER);
		expect(removed.status).toBe(200);
		expect(removed.json.data).toEqual({ deleted: lone.json.data.id });

		const parent = await post(REVIEWER, { body: 'parent draft' });
		await post(OTHER_REVIEWER, { body: 'agree', parentId: parent.json.data.id, visibility: 'internal' });
		expect((await call('DELETE', `/v1/comments/${parent.json.data.id}`, REVIEWER)).status).toBe(409);

		const remaining = (await call('GET', `/v1/versions/${VERSION}/comments`, REVIEWER)).json.data;
		expect(remaining.map((c: { body: string }) => c.body).sort()).toEqual(['agree', 'parent draft']);
	});
});

describe('asset history and resolution', () => {
	it('lists released comments across versions for the creator', async () => {
		await post(REVIEWER, { body: 'v1 feedback', visibility: 'released' });
		await post(REVIEWER, { body: 'v2 internal', visibility: 'internal' }, 'recTEST_VERSION_2');

		const creatorHistory = (await call('GET', `/v1/assets/${ASSET}/comments`, CREATOR)).json.data;
		expect(creatorHistory.map((c: { body: string }) => c.body)).toEqual(['v1 feedback']);
		expect((await call('GET', `/v1/assets/${ASSET}/comments`, REVIEWER)).json.data).toHaveLength(2);
	});

	it('lets reviewers resolve, and 404s unknown comments', async () => {
		const comment = await post(REVIEWER, { body: 'Alt text missing' });
		const resolved = await call('POST', `/v1/comments/${comment.json.data.id}/resolution`, REVIEWER, {
			resolution: 'resolved'
		});
		expect(resolved.json.data.resolution).toBe('resolved');

		expect((await call('POST', `/v1/comments/${comment.json.data.id}/resolution`, CREATOR, { resolution: 'resolved' })).status).toBe(403);
		expect((await call('POST', '/v1/comments/missing-id/resolution', REVIEWER, { resolution: 'resolved' })).status).toBe(404);
		expect((await call('POST', `/v1/comments/${comment.json.data.id}/resolution`, REVIEWER, { resolution: 'done' })).status).toBe(400);
	});
});

describe('scoped reviewer keys', () => {
	const TEMPLATE_KEY = 'test-template-key-0123456789abcdef';
	const APP_KEY = 'test-app-review-key-0123456789abcd';
	const APP_VERSION = 'recTEST_APP_VERSION_1';
	const APP_ASSET = 'recTEST_APP_ASSET_1';
	const asTemplate = { key: TEMPLATE_KEY };
	const asApp = { key: APP_KEY };

	beforeEach(() => {
		env.CALLER_KEYS = JSON.stringify([
			{ name: 'template-review-mcp', role: 'reviewer', scope: 'template', key: TEMPLATE_KEY },
			{ name: 'app-review-mcp', role: 'reviewer', scope: 'app', key: APP_KEY },
			{ name: 'asset-dashboard', role: 'creator', key: CREATOR_KEY }
		]);
	});

	const postApp = (body: Record<string, unknown>) =>
		call('POST', `/v1/versions/${APP_VERSION}/comments`, REVIEWER, { assetRef: APP_ASSET, ...body }, asApp);

	it('hides a thread from a reviewer key in another scope', async () => {
		const draft = await postApp({ body: 'OAuth redirect fails on install' });
		expect(draft.status).toBe(201);

		expect((await call('GET', `/v1/versions/${APP_VERSION}/comments`, REVIEWER, undefined, asApp)).json.data).toHaveLength(1);
		expect((await call('GET', `/v1/versions/${APP_VERSION}/comments`, REVIEWER, undefined, asTemplate)).json.data).toEqual([]);
		expect((await call('GET', `/v1/assets/${APP_ASSET}/comments`, REVIEWER, undefined, asTemplate)).json.data).toEqual([]);
	});

	it('blocks writes, release, edits and resolution from another scope', async () => {
		const id = (await postApp({ body: 'Scopes exceed the stated use' })).json.data.id;

		const foreignWrite = await call(
			'POST',
			`/v1/versions/${APP_VERSION}/comments`,
			REVIEWER,
			{ assetRef: APP_ASSET, body: 'template reviewer note' },
			asTemplate
		);
		expect(foreignWrite.status).toBe(404);
		expect((await call('PATCH', `/v1/comments/${id}`, REVIEWER, { body: 'changed' }, asTemplate)).status).toBe(404);
		expect((await call('DELETE', `/v1/comments/${id}`, REVIEWER, undefined, asTemplate)).status).toBe(404);
		expect((await call('POST', `/v1/comments/${id}/resolution`, REVIEWER, { resolution: 'resolved' }, asTemplate)).status).toBe(404);
		expect((await call('POST', `/v1/versions/${APP_VERSION}/release`, REVIEWER, undefined, asTemplate)).json.data).toMatchObject({ released: 0 });

		// The owning scope still works, and the draft is still a draft.
		expect((await call('POST', `/v1/versions/${APP_VERSION}/release`, REVIEWER, undefined, asApp)).json.data).toMatchObject({ released: 1 });
		expect((await call('POST', `/v1/comments/${id}/resolution`, REVIEWER, { resolution: 'resolved' }, asApp)).status).toBe(200);
	});

	it('lets the unscoped creator surface read and reply in every scope', async () => {
		await postApp({ body: 'Please add a privacy policy link', visibility: 'released' });
		await call('POST', `/v1/versions/${VERSION}/comments`, REVIEWER, { assetRef: ASSET, body: 'Alt text', visibility: 'released' }, asTemplate);

		expect((await call('GET', `/v1/assets/${APP_ASSET}/comments`, CREATOR)).json.data).toHaveLength(1);
		expect((await call('GET', `/v1/assets/${ASSET}/comments`, CREATOR)).json.data).toHaveLength(1);
		const reply = await call('POST', `/v1/versions/${APP_VERSION}/comments`, CREATOR, { assetRef: APP_ASSET, body: 'Added' });
		expect(reply.status).toBe(201);
		expect((await call('GET', `/v1/versions/${APP_VERSION}/comments`, REVIEWER, undefined, asApp)).json.data).toHaveLength(2);
	});

	it('skips a key whose scope does not parse, so it is never widened', async () => {
		env.CALLER_KEYS = JSON.stringify([{ name: 'bad', role: 'reviewer', scope: 'App Review!', key: APP_KEY }]);
		expect((await call('GET', `/v1/versions/${APP_VERSION}/comments`, REVIEWER, undefined, asApp)).status).toBe(401);
	});
});

describe('validation', () => {
	it('rejects empty bodies, bad refs, and non-JSON', async () => {
		expect((await post(REVIEWER, { body: '   ' })).status).toBe(400);
		expect((await call('POST', `/v1/versions/${VERSION}/comments`, REVIEWER, { assetRef: 'bad ref!', body: 'x' })).status).toBe(400);
		expect((await call('GET', '/v1/versions/bad ref!/comments', REVIEWER)).status).toBe(404);

		const response = await worker.fetch(
			new Request(`https://comments.test/v1/versions/${VERSION}/comments`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${REVIEWER_KEY}`,
					'X-Actor-Email': REVIEWER.email,
					'X-Actor-Role': REVIEWER.role
				},
				body: '{not json'
			}),
			env
		);
		expect(response.status).toBe(400);
	});
});

describe('release with the drafts the reviewer read', () => {
	const release = (expected: unknown) => call('POST', `/v1/versions/${VERSION}/release`, REVIEWER, { expected });
	const drafts = async () =>
		((await call('GET', `/v1/versions/${VERSION}/comments`, REVIEWER)).json.data as any[])
			.filter((comment) => comment.visibility === 'draft')
			.map((comment) => ({ id: comment.id, editedAt: comment.editedAt }));

	it('releases when the drafts are the expected ones', async () => {
		await post(REVIEWER, { body: 'Fix the 404 page' });
		await post(OTHER_REVIEWER, { body: 'Add alt text' });
		await post(REVIEWER, { body: 'ask the lead', visibility: 'internal' });
		const result = await release(await drafts());
		expect(result.status).toBe(200);
		expect(result.json.data.released).toBe(2);
	});

	it('releases nothing when a draft was added after the read', async () => {
		await post(REVIEWER, { body: 'Fix the 404 page' });
		const read = await drafts();
		await post(OTHER_REVIEWER, { body: 'A draft the reviewer did not read' });
		expect((await release(read)).status).toBe(409);
		expect(await drafts()).toHaveLength(2);
	});

	it('releases nothing when a draft was edited or deleted after the read', async () => {
		const first = await post(REVIEWER, { body: 'Fix the 404 page' });
		const second = await post(REVIEWER, { body: 'Add alt text' });
		const read = await drafts();
		await call('PATCH', `/v1/comments/${first.json.data.id}`, REVIEWER, { body: 'Fix the 404 page and the footer' });
		expect((await release(read)).status).toBe(409);
		const afterEdit = await drafts();
		await call('DELETE', `/v1/comments/${second.json.data.id}`, REVIEWER);
		expect((await release(afterEdit)).status).toBe(409);
		expect(await drafts()).toHaveLength(1);
		expect((await release(await drafts())).json.data.released).toBe(1);
	});

	it('accepts an empty list only when no draft waits', async () => {
		expect((await release([])).json.data.released).toBe(0);
		await post(REVIEWER, { body: 'Fix the 404 page' });
		expect((await release([])).status).toBe(409);
	});

	it('rejects a list that is not valid', async () => {
		expect((await release('all')).status).toBe(400);
		expect((await release([{ id: 'not a ref!' }])).status).toBe(400);
		expect((await release([{ id: 'abc' }, { id: 'abc' }])).status).toBe(400);
	});

	it('still releases every draft when no list is sent', async () => {
		await post(REVIEWER, { body: 'Fix the 404 page' });
		expect((await call('POST', `/v1/versions/${VERSION}/release`, REVIEWER)).json.data.released).toBe(1);
	});
});

describe('one save, one comment', () => {
	const KEY = 'save-0123456789abcdef';

	it('returns the first comment when a save is repeated with the same key', async () => {
		const first = await post(REVIEWER, { body: 'Fix the 404 page', requestKey: KEY });
		const again = await post(REVIEWER, { body: 'Fix the 404 page', requestKey: KEY });
		expect(first.status).toBe(201);
		expect(again.json.data.id).toBe(first.json.data.id);
		expect((await call('GET', `/v1/versions/${VERSION}/comments`, REVIEWER)).json.data).toHaveLength(1);
	});

	it('refuses the key for a different comment and keeps keys apart by author', async () => {
		await post(REVIEWER, { body: 'Fix the 404 page', requestKey: KEY });
		expect((await post(REVIEWER, { body: 'Another text', requestKey: KEY })).status).toBe(409);
		expect((await post(OTHER_REVIEWER, { body: 'Fix the 404 page', requestKey: KEY })).status).toBe(201);
		expect((await call('GET', `/v1/versions/${VERSION}/comments`, REVIEWER)).json.data).toHaveLength(2);
	});

	it('writes each save without a key, and rejects a key that is not valid', async () => {
		await post(REVIEWER, { body: 'Same text' });
		await post(REVIEWER, { body: 'Same text' });
		expect((await call('GET', `/v1/versions/${VERSION}/comments`, REVIEWER)).json.data).toHaveLength(2);
		expect((await post(REVIEWER, { body: 'x', requestKey: 'short' })).status).toBe(400);
	});

	it('does not show the key in a comment', async () => {
		const saved = await post(REVIEWER, { body: 'Fix the 404 page', requestKey: KEY });
		expect(JSON.stringify(saved.json.data)).not.toContain(KEY);
	});
});
