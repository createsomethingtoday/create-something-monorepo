import assert from 'node:assert/strict';
import test from 'node:test';

import {
	OPENAI_REALTIME_CLIENT_SECRET_URL,
	REALTIME_MODEL,
	createReceptionistSessionResponse
} from '../src/lib/server/receptionist-session';

const standardKey = 'sk-test-standard-key-that-must-stay-server-side';

test('the session boundary exchanges the standard key for a bounded client secret', async () => {
	let capturedRequest: Request | undefined;
	const fetchImpl: typeof fetch = async (input, init) => {
		capturedRequest = new Request(input, init);
		return Response.json({
			value: 'ek_demo_ephemeral_value',
			expires_at: 1_800_000_000,
			session: { model: REALTIME_MODEL }
		});
	};

	const response = await createReceptionistSessionResponse({ apiKey: standardKey, fetchImpl });
	const body = (await response.json()) as Record<string, unknown>;

	assert.equal(response.status, 200);
	assert.equal(response.headers.get('cache-control'), 'no-store, private');
	assert.equal(response.headers.get('pragma'), 'no-cache');
	assert.deepEqual(body, {
		value: 'ek_demo_ephemeral_value',
		expiresAt: 1_800_000_000,
		model: REALTIME_MODEL
	});
	assert.ok(capturedRequest);
	assert.equal(capturedRequest.url, OPENAI_REALTIME_CLIENT_SECRET_URL);
	assert.equal(capturedRequest.method, 'POST');
	assert.equal(capturedRequest.headers.get('authorization'), `Bearer ${standardKey}`);

	const upstreamBody = (await capturedRequest.json()) as {
		session?: { model?: string; instructions?: string; type?: string };
	};
	assert.equal(upstreamBody.session?.type, 'realtime');
	assert.equal(upstreamBody.session?.model, REALTIME_MODEL);
	assert.match(upstreamBody.session?.instructions ?? '', /call 911 now/i);
	assert.doesNotMatch(JSON.stringify(body), /sk-test-standard-key/);
});

test('the session boundary fails closed when the standard key is unavailable', async () => {
	let called = false;
	const fetchImpl: typeof fetch = async () => {
		called = true;
		return Response.json({});
	};

	const response = await createReceptionistSessionResponse({ apiKey: undefined, fetchImpl });
	assert.equal(response.status, 503);
	assert.equal(called, false);
	assert.deepEqual(await response.json(), {
		error: 'receptionist_unavailable',
		message: 'The voice demo is not configured right now.'
	});
});

test('the session boundary returns a safe error when OpenAI rejects the request', async () => {
	const fetchImpl: typeof fetch = async () =>
		new Response(`upstream rejected ${standardKey}`, { status: 401 });

	const response = await createReceptionistSessionResponse({ apiKey: standardKey, fetchImpl });
	const responseText = await response.text();

	assert.equal(response.status, 502);
	assert.doesNotMatch(responseText, /upstream rejected/i);
	assert.doesNotMatch(responseText, /sk-test-standard-key/);
	assert.match(responseText, /could not start the voice demo/i);
});

test('the session boundary rejects malformed client-secret responses', async () => {
	const fetchImpl: typeof fetch = async () => Response.json({ expires_at: 1_800_000_000 });

	const response = await createReceptionistSessionResponse({ apiKey: standardKey, fetchImpl });
	assert.equal(response.status, 502);
	assert.deepEqual(await response.json(), {
		error: 'session_start_failed',
		message: 'We could not start the voice demo. Please try again.'
	});
});
