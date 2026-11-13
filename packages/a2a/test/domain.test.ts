import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { InboxService, DomainError, PILOT_POLICY } from '../src/domain.ts';
import { createTestDatabase } from './sqlite.ts';

const open: ReturnType<typeof createTestDatabase>[] = [];
afterEach(() => { for (const db of open.splice(0)) db.close(); });
const alice = { subject: 'owner-alice', scopes: ['inbox:read', 'inbox:write'] };
const bob = { subject: 'owner-bob', scopes: ['inbox:read', 'inbox:write'] };
const eve = { subject: 'owner-eve', scopes: ['inbox:read', 'inbox:write'], admin: true };
function fixture() {
	const db = createTestDatabase(); open.push(db);
	return { ...db, service: new InboxService(db.db) };
}

test('offline: only an inbox owner can authorize a sender', async () => {
	const { service } = fixture();
	const a = await service.registerAgent(alice, 'Alice');
	const b = await service.registerAgent(bob, 'Bob');
	await assert.rejects(service.grantSender(alice, b.id, a.id), (error: unknown) => error instanceof DomainError && error.status === 404);
	assert.deepEqual(await service.listGrants(bob, b.id), []);
});

async function pair() {
	const f = fixture();
	const a = await f.service.registerAgent(alice, 'Alice');
	const b = await f.service.registerAgent(bob, 'Bob');
	const permission = await f.service.grantSender(bob, b.id, a.id);
	const input = { fromAgentId: a.id, toAgentId: b.id, text: 'Please review this proposal.', idempotencyKey: 'request-1' };
	return { ...f, a, b, permission, input };
}

test('offline: message persistence, outbox and owner isolation share the application boundary', async () => {
	const { service, sqlite, a, b, input } = await pair();
	const sent = await service.sendMessage(alice, input);
	assert.equal(sent.message.sequence, 1);
	assert.equal(sent.duplicate, false);
	assert.equal((await service.listMessages(bob, b.id))[0].id, sent.message.id);
	assert.equal((await service.readMessage(alice, sent.message.id)).text, input.text);
	assert.equal(sqlite.prepare('SELECT count(*) AS n FROM outbox_events WHERE message_id=?').get(sent.message.id)!.n, 1);
	await assert.rejects(service.readMessage(eve, sent.message.id), { code: 'not_found' });
	await assert.rejects(service.listMessages(alice, b.id), { code: 'not_found' });
	await assert.rejects(service.setAgentPaused(eve, a.id, true), { code: 'not_found' });
	await assert.rejects(service.sendMessage(eve, { ...input, idempotencyKey: 'impersonate' }), { code: 'send_not_allowed' });
	assert.deepEqual(await service.listAgents(eve), []);
});

test('offline: same-owner concurrent retries produce one message, one event, and no duplicate writes', async () => {
	const { service, sqlite, input } = await pair();
	const results = await Promise.all(Array.from({ length: 10 }, () => service.sendMessage(alice, input)));
	assert.equal(new Set(results.map(r => r.message.id)).size, 1);
	assert.equal(results.filter(r => !r.duplicate).length, 1);
	for (const table of ['messages', 'threads', 'outbox_events', 'idempotency', 'audit_events']) {
		assert.equal(sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get()!.n, 1, table);
	}
	const before = sqlite.prepare('SELECT total_changes() AS n').get()!.n;
	await service.sendMessage(alice, input);
	await assert.rejects(service.sendMessage(alice, { ...input, text: 'A different request' }), { code: 'idempotency_conflict' });
	assert.equal(sqlite.prepare('SELECT total_changes() AS n').get()!.n, before);
});

test('offline: idempotency keys are scoped to verified owner rather than caller agent IDs', async () => {
	const { service, a, b, input } = await pair();
	await service.grantSender(alice, a.id, b.id);
	const request = await service.sendMessage(alice, input);
	const reply = await service.sendMessage(bob, { ...input, fromAgentId: b.id, toAgentId: a.id, threadId: request.message.threadId });
	assert.notEqual(reply.message.id, request.message.id);
	assert.equal(reply.message.sequence, 2);
});

test('offline: revocation or pause cannot be bypassed by cached permission or reconciliation', async () => {
	const { service, a, b, input, permission, beforeNextBatch, sqlite } = await pair();
	const sent = await service.sendMessage(alice, input);
	await service.revokeGrant(bob, permission.id);
	await assert.rejects(service.sendMessage(alice, input), error => error instanceof DomainError && error.code==='write_outcome_unknown' && error.status===503 && error.cause instanceof DomainError && error.cause.code==='not_found' && error.cause.status===404);
	await assert.rejects(service.readMessage(bob, sent.message.id), { code: 'not_found' });
	await assert.rejects(service.sendMessage(alice, { ...input, idempotencyKey: 'revoked' }), { code: 'send_not_allowed' });
	await service.grantSender(bob, b.id, a.id);
	beforeNextBatch(() => sqlite.prepare('UPDATE grants SET revoked_at=? WHERE id=?').run(Date.now(), permission.id));
	await assert.rejects(service.sendMessage(alice, { ...input, idempotencyKey: 'race' }), { code: 'send_not_allowed' });
	assert.equal(sqlite.prepare('SELECT count(*) AS n FROM messages').get()!.n, 1);
	await service.grantSender(bob, b.id, a.id);
	await service.setAgentPaused(bob, b.id, true);
	await assert.rejects(service.claimMessage(bob, sent.message.id), { code: 'claim_unavailable' });
	await assert.rejects(service.sendMessage(alice, { ...input, idempotencyKey: 'paused' }), { code: 'send_not_allowed' });
});

test('offline: replies require reciprocal owner grants and threads reject another agent pair', async () => {
	const { service, a, b, input } = await pair();
	const request = await service.sendMessage(alice, input);
	await assert.rejects(service.sendMessage(bob, { fromAgentId: b.id, toAgentId: a.id, text: 'Reply', threadId: request.message.threadId, idempotencyKey: 'reply' }), { code: 'send_not_allowed' });
	await service.grantSender(alice, a.id, b.id);
	const reply = await service.sendMessage(bob, { fromAgentId: b.id, toAgentId: a.id, text: 'Reply', threadId: request.message.threadId, idempotencyKey: 'reply' });
	assert.equal(reply.message.sequence, 2);
	const e = await service.registerAgent(eve, 'Eve');
	await service.grantSender(bob, b.id, e.id);
	await service.grantSender(eve, e.id, b.id);
	await assert.rejects(service.sendMessage(eve, { fromAgentId: e.id, toAgentId: b.id, text: 'Hijack', threadId: request.message.threadId, idempotencyKey: 'hijack' }), { code: 'send_not_allowed' });
});

test('offline: concurrent thread turns have unique monotone sequences and stop at eight', async () => {
	const { service, sqlite, a, b, input } = await pair();
	await service.grantSender(alice, a.id, b.id);
	const first = await service.sendMessage(alice, input);
	const outcomes = await Promise.allSettled(Array.from({ length: 9 }, (_, n) => service.sendMessage(alice, { ...input, threadId: first.message.threadId, idempotencyKey: `turn-${n}` })));
	assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 7);
	assert.equal(outcomes.filter(o => o.status === 'rejected').length, 2);
	assert.deepEqual(sqlite.prepare('SELECT sequence FROM messages ORDER BY sequence').all().map(r => r.sequence), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('offline: only recipient can claim; sender cannot learn the lease token or finish', async () => {
	const { service, input, b } = await pair();
	const sent = await service.sendMessage(alice, input);
	await assert.rejects(service.claimMessage(alice, sent.message.id), { code: 'claim_unavailable' });
	const claimed = await service.claimMessage(bob, sent.message.id);
	assert.equal(claimed.state, 'claimed');
	assert.ok(claimed.claimToken);
	assert.equal((await service.readMessage(alice, sent.message.id)).claimToken, undefined);
	assert.equal((await service.readMessage(bob, sent.message.id)).claimToken, undefined);
	assert.equal((await service.listMessages(bob, b.id))[0].claimToken, undefined);
	await assert.rejects(service.claimMessage(bob, sent.message.id), { code: 'claim_unavailable' });
	await assert.rejects(service.finishMessage(alice, sent.message.id, { state: 'completed', claimToken: claimed.claimToken! }), { code: 'finish_unavailable' });
	await assert.rejects(service.finishMessage(bob, sent.message.id, { state: 'completed', claimToken: 'wrong' }), { code: 'finish_unavailable' });
	const finished = await service.finishMessage(bob, sent.message.id, { state: 'approval_required', claimToken: claimed.claimToken! });
	assert.equal(finished.state, 'approval_required');
	assert.equal(finished.claimToken, undefined);
	await assert.rejects(service.claimMessage(bob, sent.message.id), { code: 'claim_unavailable' });
});

test('offline: expired claim is reclaimable and its old token cannot finish the new lease', async () => {
	const { service, sqlite, input } = await pair();
	const sent = await service.sendMessage(alice, input);
	const previous = await service.claimMessage(bob, sent.message.id);
	sqlite.prepare('UPDATE messages SET claimed_until=? WHERE id=?').run(Date.now() - 1, sent.message.id);
	await assert.rejects(service.finishMessage(bob, sent.message.id, { state: 'completed', claimToken: previous.claimToken! }), { code: 'finish_unavailable' });
	const current = await service.claimMessage(bob, sent.message.id);
	assert.notEqual(current.claimToken, previous.claimToken);
	await assert.rejects(service.finishMessage(bob, sent.message.id, { state: 'completed', claimToken: previous.claimToken! }), { code: 'finish_unavailable' });
	assert.equal((await service.finishMessage(bob, sent.message.id, { state: 'completed', claimToken: current.claimToken! })).state, 'completed');
});

test('offline: UTF-8 byte limit, rolling quotas, expiration and soft deletion fail closed', async () => {
	const { service, sqlite, input, b } = await pair();
	await assert.rejects(service.sendMessage(alice, { ...input, text: '😀'.repeat(4097) }), { code: 'invalid_input' });
	await assert.rejects(service.registerAgent(alice, 'Another runtime label'), { code: 'agent_limit' });
	const first = await service.sendMessage(alice, { ...input, text: '😀'.repeat(4096) });
	await Promise.all(Array.from({ length: PILOT_POLICY.maxSenderMessagesPerDay - 1 }, (_, n) => service.sendMessage(alice, { ...input, idempotencyKey: `quota-${n}` })));
	await assert.rejects(service.sendMessage(alice, { ...input, idempotencyKey: 'quota-over' }), { code: 'send_not_allowed' });
	sqlite.prepare('UPDATE messages SET expires_at=? WHERE id=?').run(Date.now() - 1, first.message.id);
	await assert.rejects(service.readMessage(bob, first.message.id), { code: 'not_found' });
	await assert.rejects(service.claimMessage(bob, first.message.id), { code: 'claim_unavailable' });
	sqlite.prepare('UPDATE agents SET deleted_at=? WHERE id=?').run(Date.now(), b.id);
	await assert.rejects(service.listMessages(bob, b.id), { code: 'not_found' });
});

test('offline: global arrival cursors page multiple conversations without skipping equal turn sequences', async () => {
	const { service, input, b } = await pair();
	const first = await service.sendMessage(alice, input);
	const second = await service.sendMessage(alice, { ...input, idempotencyKey: 'request-2' });
	assert.equal(first.message.sequence, second.message.sequence);
	assert.deepEqual((await service.listMessages(bob, b.id, first.message.cursor)).map(m => m.id), [second.message.id]);
});

test('offline: failed event insert rolls back message, conversation and idempotency atomically', async () => {
	const { service, sqlite, input } = await pair();
	sqlite.exec("CREATE TRIGGER fail_outbox BEFORE INSERT ON outbox_events BEGIN SELECT RAISE(ABORT, 'injected storage failure'); END");
	await assert.rejects(service.sendMessage(alice, input), (error: unknown) => error instanceof DomainError && error.code === 'storage_unavailable' && error.cause instanceof Error);
	for (const table of ['messages', 'threads', 'idempotency', 'outbox_events']) assert.equal(sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get()!.n, 0);
	sqlite.exec('DROP TRIGGER fail_outbox');
	assert.equal((await service.sendMessage(alice, input)).duplicate, false);
});

test('offline: fixed retention erases content at 30 days and audit/idempotency at 90 days', async () => {
	const { service, sqlite, input } = await pair();
	const sent = await service.sendMessage(alice, input);
	await service.claimMessage(bob, sent.message.id);
	sqlite.prepare('UPDATE messages SET created_at=? WHERE id=?').run(Date.now() - PILOT_POLICY.contentRetentionMs - 1, sent.message.id);
	await service.pruneRetention();
	const stored = sqlite.prepare('SELECT text,state,claim_token,content_deleted_at FROM messages WHERE id=?').get(sent.message.id)!;
	assert.equal(stored.text, null);
	assert.equal(stored.state, 'rejected');
	assert.equal(stored.claim_token, null);
	assert.ok(stored.content_deleted_at);
	assert.equal(sqlite.prepare('SELECT count(*) AS n FROM audit_events').get()!.n, 1);
	sqlite.prepare('UPDATE audit_events SET created_at=?').run(Date.now() - PILOT_POLICY.auditRetentionMs - 1);
	sqlite.prepare('UPDATE idempotency SET created_at=?').run(Date.now() - PILOT_POLICY.auditRetentionMs - 1);
	await service.pruneRetention();
	assert.equal(sqlite.prepare('SELECT count(*) AS n FROM audit_events').get()!.n, 0);
	assert.equal(sqlite.prepare('SELECT count(*) AS n FROM idempotency').get()!.n, 0);
});
