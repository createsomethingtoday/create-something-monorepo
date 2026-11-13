import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import type { Env } from '../src/index';
import { createTestDb } from './d1-sqlite';

const APP_KEY = 'test-app-review-key-0123456789abcd';
const TEMPLATE_KEY = 'test-template-key-0123456789abcdef';
const CREATOR_KEY = 'test-creator-key-0123456789abcdefg';
const VERSION = 'recTEST_VERSION_1';
const ASSET = 'recTEST_ASSET_1';
const REVIEWER = 'reviewer@example.com';
const NOTICE = {
	recipientEmail: 'Creator@Example.com',
	recipientName: 'Casey',
	assetName: 'Example App',
	assetType: 'App',
	versionNumber: 4,
	outcome: 'changes_requested'
};

let env: Env;
const knock = vi.fn();

beforeEach(() => {
	env = {
		DB: createTestDb(),
		CALLER_KEYS: JSON.stringify([
			{ name: 'app-review-mcp', role: 'reviewer', scope: 'app', key: APP_KEY },
			{ name: 'template-review-mcp', role: 'reviewer', scope: 'template', key: TEMPLATE_KEY },
			{ name: 'asset-dashboard', role: 'creator', key: CREATOR_KEY }
		]),
		KNOCK_API_KEY: 'knock-key-for-tests',
		ASSET_DASHBOARD_URL: 'https://dashboard.example/'
	};
	knock.mockReset();
	knock.mockImplementation(async () => Response.json({ workflow_run_id: 'run-1' }));
	vi.stubGlobal('fetch', knock);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

async function call(method: string, path: string, body?: unknown, key = APP_KEY, email = REVIEWER) {
	const response = await worker.fetch(
		new Request(`https://comments.test${path}`, {
			method,
			headers: { Authorization: `Bearer ${key}`, 'X-Actor-Email': email },
			body: body === undefined ? undefined : JSON.stringify(body)
		}),
		env
	);
	return { status: response.status, json: (await response.json()) as any };
}

const draft = (body = 'Fix the install URL') =>
	call('POST', `/v1/versions/${VERSION}/comments`, { assetRef: ASSET, body });
const release = (notify: unknown = NOTICE, key = APP_KEY) =>
	call('POST', `/v1/versions/${VERSION}/release`, notify === null ? undefined : { notify }, key);
const outbox = async () =>
	(await env.DB.prepare('SELECT * FROM review_notifications ORDER BY created_at, id').all<any>()).results;

describe('release email', () => {
	it('sends one email when drafts are released, with the link built from the pinned asset', async () => {
		await draft();
		const result = await release();

		expect(result.json.data).toEqual({ released: 1, notification: { status: 'sent', sent: 1 } });
		expect(knock).toHaveBeenCalledTimes(1);

		const [url, init] = knock.mock.calls[0];
		expect(url).toBe('https://api.knock.app/v1/workflows/marketplace-review-feedback-released/trigger');
		expect(init.headers.Authorization).toBe('Bearer knock-key-for-tests');
		const [row] = await outbox();
		expect(init.headers['Idempotency-Key']).toBe(`review-feedback:${row.id}`);
		expect(JSON.parse(init.body)).toEqual({
			recipients: [{ id: 'creator@example.com', email: 'creator@example.com' }],
			data: {
				creator_name: 'Casey',
				asset_name: 'Example App',
				asset_type: 'App',
				version_number: 4,
				outcome: 'changes_requested',
				thread_url: `https://dashboard.example/assets/${ASSET}?tab=timeline`
			}
		});

		// The recipient is cleared once Knock has the message.
		expect(row).toMatchObject({ version_ref: VERSION, asset_ref: ASSET, workflow_run_id: 'run-1', payload: '{}' });
		expect(row.sent_at).toBeTruthy();
	});

	it('does not email again when nothing new is released', async () => {
		await draft();
		await release();
		const again = await release();

		expect(again.json.data).toEqual({ released: 0, notification: { status: 'none', reason: 'nothing_released' } });
		expect(knock).toHaveBeenCalledTimes(1);
		expect(await outbox()).toHaveLength(1);
	});

	it('emails once per release that makes new feedback visible', async () => {
		await draft('First round');
		await release();
		await draft('One more thing');
		await release();

		expect(knock).toHaveBeenCalledTimes(2);
		const keys = knock.mock.calls.map(([, init]) => init.headers['Idempotency-Key']);
		expect(new Set(keys).size).toBe(2);
	});

	it('keeps a failed send and retries it with the same idempotency key on the next release', async () => {
		knock.mockImplementationOnce(async () => new Response('upstream error for someone@example.com', { status: 503 }));
		await draft();

		const failed = await release();
		expect(failed.json.data).toEqual({
			released: 1,
			notification: { status: 'failed', sent: 0, pending: 1, error: 'Knock returned HTTP 503' }
		});
		const [pending] = await outbox();
		expect(pending).toMatchObject({ sent_at: null, attempts: 1, last_error: 'Knock returned HTTP 503' });

		// The retry carries no recipient: the queued row has it.
		const retried = await release(null);
		expect(retried.json.data).toEqual({ released: 0, notification: { status: 'sent', sent: 1 } });
		expect(knock.mock.calls[1][1].headers['Idempotency-Key']).toBe(knock.mock.calls[0][1].headers['Idempotency-Key']);
		expect(JSON.parse(knock.mock.calls[1][1].body).recipients[0].email).toBe('creator@example.com');
	});

	it('clears the recipient after a retry succeeds, and when the retry window ends', async () => {
		knock.mockImplementationOnce(async () => new Response('', { status: 500 }));
		await draft();
		await release();
		expect((await outbox())[0].payload).toContain('creator@example.com');
		await release(null);
		expect((await outbox())[0]).toMatchObject({ payload: '{}', attempts: 2 });

		// A second version whose email never goes out.
		knock.mockImplementation(async () => new Response('', { status: 500 }));
		const other = 'recTEST_VERSION_2';
		await call('POST', `/v1/versions/${other}/comments`, { assetRef: ASSET, body: 'More' });
		await call('POST', `/v1/versions/${other}/release`, { notify: NOTICE });
		vi.useFakeTimers({ now: Date.now() + 25 * 60 * 60 * 1000, toFake: ['Date'] });
		// Any later release call, on any version, drops the expired recipient.
		await release(null);
		const expired = (await outbox()).find((row) => row.version_ref === other);
		expect(expired).toMatchObject({ payload: '{}', last_error: 'expired', sent_at: null });
	});

	it('sends once when two release calls arrive at the same moment', async () => {
		let finish: (response: Response) => void = () => {};
		knock.mockImplementationOnce(() => new Promise<Response>((resolve) => (finish = resolve)));
		await draft();

		const first = release();
		// Let the first call release, queue, and reach Knock.
		await vi.waitFor(() => expect(knock).toHaveBeenCalledTimes(1));
		const second = await release();
		expect(second.json.data).toEqual({ released: 0, notification: { status: 'none', reason: 'send_in_progress' } });

		finish(Response.json({ workflow_run_id: 'run-1' }));
		expect((await first).json.data).toEqual({ released: 1, notification: { status: 'sent', sent: 1 } });
		expect(knock).toHaveBeenCalledTimes(1);
	});

	it('still reports the release when the email step itself breaks', async () => {
		await draft();
		const db = env.DB;
		// The release runs through batch(); every statement the email step prepares afterwards fails.
		let released = false;
		env.DB = {
			batch: async (statements: D1PreparedStatement[]) => {
				const results = await db.batch(statements);
				released = true;
				return results;
			},
			prepare: (sql: string) => {
				if (released) throw new Error('database unavailable');
				return db.prepare(sql);
			}
		} as unknown as D1Database;

		const result = await release();
		expect(result.status).toBe(200);
		expect(result.json.data).toEqual({
			released: 1,
			notification: { status: 'failed', sent: 0, pending: 0, error: 'email step failed' }
		});
		env.DB = db;
		expect((await call('GET', `/v1/versions/${VERSION}/comments`)).json.data[0].visibility).toBe('released');
	});

	it('treats a network failure as a failed send, not a failed release', async () => {
		knock.mockRejectedValueOnce(new Error('network down'));
		await draft();

		const result = await release();
		expect(result.status).toBe(200);
		expect(result.json.data).toMatchObject({ released: 1, notification: { status: 'failed', pending: 1 } });
	});

	it('leaves a send older than the retry window unsent', async () => {
		knock.mockImplementationOnce(async () => new Response('', { status: 500 }));
		await draft();
		await release();

		vi.useFakeTimers({ now: Date.now() + 25 * 60 * 60 * 1000, toFake: ['Date'] });
		const late = await release(null);
		expect(late.json.data.notification).toEqual({ status: 'none', reason: 'nothing_released' });
		expect(knock).toHaveBeenCalledTimes(1);
	});

	it('releases without an email when the caller names no recipient', async () => {
		await draft();
		const result = await release(null);

		expect(result.json.data).toEqual({ released: 1, notification: { status: 'none', reason: 'no_recipient' } });
		expect(knock).not.toHaveBeenCalled();
		expect(await outbox()).toEqual([]);
	});

	it('queues nothing when there is no draft to release', async () => {
		await call('POST', `/v1/versions/${VERSION}/comments`, { assetRef: ASSET, body: 'note', visibility: 'internal' });
		const result = await release();

		expect(result.json.data).toEqual({ released: 0, notification: { status: 'none', reason: 'nothing_released' } });
		expect(knock).not.toHaveBeenCalled();
		expect(await outbox()).toEqual([]);
	});

	it('stays off, and stores no recipient, until both the key and the dashboard address are set', async () => {
		for (const missing of ['KNOCK_API_KEY', 'ASSET_DASHBOARD_URL'] as const) {
			env = { ...env, DB: createTestDb(), [missing]: undefined };
			await draft();
			const result = await release();
			expect(result.json.data).toEqual({ released: 1, notification: { status: 'none', reason: 'not_configured' } });
			expect(await outbox()).toEqual([]);
		}
		env = { ...env, DB: createTestDb(), KNOCK_API_KEY: 'knock-key-for-tests', ASSET_DASHBOARD_URL: 'http://dashboard.example' };
		await draft();
		expect((await release()).json.data.notification).toEqual({ status: 'none', reason: 'not_configured' });
		expect(knock).not.toHaveBeenCalled();
	});

	it('rejects a malformed recipient before releasing anything', async () => {
		await draft();
		for (const notify of [
			{ ...NOTICE, recipientEmail: 'not-an-email' },
			{ ...NOTICE, assetName: '' },
			{ ...NOTICE, outcome: 'maybe' },
			{ ...NOTICE, versionNumber: 1.5 },
			'creator@example.com'
		]) {
			expect((await release(notify)).status).toBe(400);
		}
		expect(knock).not.toHaveBeenCalled();
		const thread = await call('GET', `/v1/versions/${VERSION}/comments`);
		expect(thread.json.data[0].visibility).toBe('draft');
	});

	it('does not release, queue or send for a reviewer key in another scope', async () => {
		knock.mockImplementationOnce(async () => new Response('', { status: 500 }));
		await draft();
		await release();
		expect(await outbox()).toHaveLength(1);

		// A pending email exists. The template key must not be able to trigger it.
		const foreign = await release(NOTICE, TEMPLATE_KEY);
		expect(foreign.json.data).toEqual({ released: 0, notification: { status: 'none', reason: 'nothing_released' } });
		expect(knock).toHaveBeenCalledTimes(1);
		expect(await outbox()).toHaveLength(1);
	});

	it('keeps release a reviewer action', async () => {
		await draft();
		const result = await call('POST', `/v1/versions/${VERSION}/release`, { notify: NOTICE }, CREATOR_KEY, 'creator@example.com');
		expect(result.status).toBe(403);
		expect(knock).not.toHaveBeenCalled();
	});
});
