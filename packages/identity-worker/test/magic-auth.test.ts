import assert from 'node:assert/strict';
import test from 'node:test';

import identityWorker from '../src/index.ts';
import { claimLmsMagicProof, hashMailboxMagicToken } from '../src/services/magic-auth.ts';

test('mailbox proof exchange requires the LMS service boundary and a complete proof', async () => {
	const base = new Request('https://id.createsomething.space/v1/auth/magic-exchange', {
		method: 'POST', headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token: 'proof', session_id: 'session' }),
	});
	const unauthorized = await identityWorker.fetch(base.clone(), {
		ENVIRONMENT: 'test', ALLOWED_ORIGINS: 'https://learn.createsomething.space', LMS_MAGIC_EXCHANGE_TOKEN: 'secret',
	} as never);
	assert.equal(unauthorized.status, 401);
	assert.equal(unauthorized.headers.has('Access-Control-Allow-Origin'), false);
	const incomplete = await identityWorker.fetch(new Request(base.url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'X-LMS-Magic-Exchange-Token': 'secret' },
		body: JSON.stringify({ email: 'known@example.com' }),
	}), { ENVIRONMENT: 'test', ALLOWED_ORIGINS: '', LMS_MAGIC_EXCHANGE_TOKEN: 'secret' } as never);
	assert.equal(incomplete.status, 400);
	assert.equal((await incomplete.json() as { error: string }).error, 'mailbox_proof_required');
});

test('a valid mailbox proof is consumed once and hashing matches LMS storage', async () => {
	const session = { id: 'proof-1', email: 'verified@example.com', status: 'pending', expires_at: 2000, token_hash: 'expected' };
	const db = {
		prepare(sql: string) {
			return { bind(...values: unknown[]) { return {
				async first() { return values[1] === session.token_hash ? { ...session } : null; },
				async run() {
					if (sql.includes("SET status = 'verified'") && values[2] === session.token_hash && session.status === 'pending') {
						session.status = 'verified'; return { meta: { changes: 1 } };
					}
					return { meta: { changes: 0 } };
				},
			}; } };
		},
	} as unknown as D1Database;
	assert.equal((await claimLmsMagicProof(db, 'session', 'expected', 1000)).ok, true);
	assert.deepEqual(await claimLmsMagicProof(db, 'session', 'expected', 1001), { ok: false, reason: 'used' });
	assert.equal(await hashMailboxMagicToken('cre1494-local-token'), '5cbc6e3023dbc5d5ae974c6d73316385b34c60dcb0b8dacd116ccc7c52e65326');
});
