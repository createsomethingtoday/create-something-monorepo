import assert from 'node:assert/strict';
import test from 'node:test';
import { Effect } from 'effect';
import { contactIntake, createResendContactMailer, CONTACT_SAVED_MESSAGE, CONTACT_UNKNOWN_MESSAGE, type ContactRepository, type ContactReceipt, type EmailOutcome } from '../src/lib/server/contact-intake.ts';
import { createContactRequest } from '../src/lib/contact/request.ts';
const input = { name: 'Fixture', email: 'fixture@example.invalid', message: 'Test inquiry' };
const id = 'test-request-00000001';
function fixture() {
  let receipt: ContactReceipt | null = null;
  let creates = 0; let sends = 0; let records = 0; let secondary = 0;
  const repository: ContactRepository = {
    async read() { return receipt; },
    async create(_id, hash) { creates++; if (receipt) throw new Error('unique'); receipt = { payload_sha256: hash, emails: ['confirmation', 'notification'].map(kind => ({ kind, state: 'pending', provider_id: null })) } as ContactReceipt; },
    async claim(_id, kind) { const email = receipt!.emails.find(e => e.kind === kind)!; if (email.state !== 'pending') return false; email.state = 'sending'; return true; },
    async record(_id, kind, outcome) { records++; Object.assign(receipt!.emails.find(e => e.kind === kind)!, { state: outcome.state, provider_id: outcome.state === 'accepted' ? outcome.providerId : null }); }
  };
  let outcome: EmailOutcome = { state: 'accepted', providerId: 'provider-receipt' };
  const mailer = { async send() { sends++; return outcome; } };
  return { repository, mailer, setOutcome(value: EmailOutcome) { outcome = value; }, get receipt() { return receipt; },
    run: (data = input) => Effect.runPromise(contactIntake(data, id, repository, mailer, async () => { secondary++; })),
    counts: () => ({ creates, sends, records, secondary }) };
}
test('success requires two durable acceptances; duplicate does no work; changed payload conflicts', async () => {
  const f = fixture(); assert.equal((await f.run()).success, true);
  assert.equal((await f.run()).success, true);
  assert.equal((await f.run({ ...input, message: 'Different' })).status, 409);
  assert.deepEqual(f.counts(), { creates: 1, sends: 2, records: 2, secondary: 1 });
});
for (const state of ['permanent_failure', 'transient_failure', 'unknown'] as const) test(`${state} is saved, never retried`, async () => {
  const f = fixture(); f.setOutcome({ state });
  const reply = await f.run(); assert.equal(reply.success, false); assert.equal(reply.message, CONTACT_SAVED_MESSAGE);
  await f.run(); assert.equal(f.counts().sends, 2);
});
test('partial acceptance is not success', async () => {
  const f = fixture(); let call = 0;
  f.mailer.send = async () => ++call === 1 ? { state: 'accepted', providerId: 'accepted' } : { state: 'permanent_failure' };
  assert.equal((await f.run()).success, false); assert.equal(f.receipt!.emails[0].state, 'accepted');
});
test('lost create acknowledgement reconciles saved without sending', async () => {
  const f = fixture(); const create = f.repository.create;
  f.repository.create = async (...args) => { await create(...args); throw new Error('lost acknowledgement'); };
  assert.equal((await f.run()).message, CONTACT_SAVED_MESSAGE); await f.run(); assert.equal(f.counts().sends, 0);
});
test('absent/unavailable readback after uncertain create stays unknown', async () => {
  const f = fixture(); f.repository.create = async () => { throw new Error('timeout'); };
  assert.equal((await f.run()).message, CONTACT_UNKNOWN_MESSAGE); assert.equal(f.counts().sends, 0);
  f.repository.read = async () => { throw new Error('unavailable'); };
  assert.equal((await f.run()).message, CONTACT_UNKNOWN_MESSAGE);
});
test('lost claim acknowledgement forbids sending even if claim committed', async () => {
  const f = fixture(); const claim = f.repository.claim;
  f.repository.claim = async (...args) => { await claim(...args); throw new Error('timeout'); };
  assert.equal((await f.run()).success, false); await f.run(); assert.equal(f.counts().sends, 0);
});
test('lost post-send receipt stays sending and is never sent again', async () => {
  const f = fixture(); f.repository.record = async () => { throw new Error('interrupted'); };
  assert.equal((await f.run()).success, false); await f.run(); assert.equal(f.counts().sends, 2);
  assert.ok(f.receipt!.emails.every(e => e.state === 'sending'));
});
test('committed post-send receipt reconciles despite lost acknowledgement', async () => {
  const f = fixture(); const record = f.repository.record;
  f.repository.record = async (...args) => { await record(...args); throw new Error('timeout'); };
  assert.equal((await f.run()).success, true); await f.run(); assert.equal(f.counts().sends, 2);
});
test('concurrent identical requests have only one owner', async () => {
  const f = fixture(); await Promise.all([f.run(), f.run()]); assert.equal(f.counts().sends, 2);
});
for (const [status, body, expected] of [[200, { id: 'receipt' }, 'accepted'], [200, {}, 'unknown'], [422, {}, 'permanent_failure'], [429, {}, 'transient_failure'], [500, {}, 'unknown'], [408, {}, 'unknown']] as const) {
  test(`provider ${status}/${expected} is classified with one attempt`, async () => {
    let attempts = 0;
    const mailer = createResendContactMailer('fake-token', { confirmation: {}, notification: {} }, async (_url, init) => {
      attempts++; assert.equal(new Headers(init?.headers).get('Idempotency-Key'), `contact/${id}/confirmation`);
      return new Response(JSON.stringify(body), { status });
    });
    assert.equal((await mailer.send('confirmation', id, new AbortController().signal)).state, expected); assert.equal(attempts, 1);
  });
}
test('transport failure and malformed success are unknown with no retry', async () => {
  for (const send of [async () => { throw new Error('network'); }, async () => new Response('not json')]) {
    const mailer = createResendContactMailer('fake-token', { confirmation: {}, notification: {} }, send);
    assert.equal((await mailer.send('confirmation', id, new AbortController().signal)).state, 'unknown');
  }
});
test('browser retains ID/body and shows saved/unknown message on non-success', async () => {
  const values = new Map<string, string>();
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
  const submit = createContactRequest(storage); const attempts: RequestInit[] = [];
  const send: typeof fetch = async (_url, init) => { attempts.push(init!); if (attempts.length === 1) throw new Error('lost'); return new Response(JSON.stringify({ success: false, message: CONTACT_SAVED_MESSAGE }), { status: 202 }); };
  assert.equal((await submit(input, send)).message, CONTACT_UNKNOWN_MESSAGE);
  assert.equal((await submit({ ...input, message: 'changed' }, send)).message, CONTACT_SAVED_MESSAGE);
  assert.deepEqual(attempts[0], attempts[1]); assert.equal(values.size, 1);
  await createContactRequest(storage)(input, async (_url, init) => { assert.deepEqual(init?.headers, attempts[0].headers); return new Response(JSON.stringify({ success: true, message: 'Sent' })); });
  assert.equal(values.size, 0);
});
test('interrupted provider call leaves a durable sending claim and no replay', async () => {
  const f = fixture(); const controller = new AbortController();
  let started!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  let aborted = false;
  const mailer = { async send(_kind: unknown, _id: string, signal: AbortSignal): Promise<EmailOutcome> {
    started(); return new Promise(resolve => { signal.addEventListener('abort', () => { aborted = true; resolve({ state: 'unknown' }); }, { once: true }); });
  } };
  const running = Effect.runPromise(contactIntake(input, id, f.repository, mailer), { signal: controller.signal });
  await ready; controller.abort(); await assert.rejects(running);
  assert.equal(aborted, true); assert.equal(f.receipt!.emails[0].state, 'sending');
  await f.run(); assert.equal(f.counts().sends, 0);
});
test('secondary failures cannot erase accepted inquiry or authorize resend', async () => {
  const f = fixture();
  const result = await Effect.runPromise(contactIntake(input, id, f.repository, f.mailer, async () => { throw new Error('analytics unavailable'); }));
  assert.equal(result.success, true); assert.equal(result.secondary, 'failed');
  await f.run(); assert.equal(f.counts().sends, 2);
});
test('real database timeout reconciles without repeating the unacknowledged write', async () => {
  const f = fixture(); let attempts = 0;
  f.repository.create = async () => { attempts++; await new Promise<void>(() => {}); };
  assert.equal((await f.run()).message, CONTACT_UNKNOWN_MESSAGE);
  assert.equal(attempts, 1); assert.equal(f.counts().sends, 0);
});
test('interrupted database write may commit later; readback never dispatches it', async () => {
  const f = fixture(); const controller = new AbortController();
  const create = f.repository.create;
  let release!: () => void;
  let started!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  const barrier = new Promise<void>(resolve => { release = resolve; });
  let committed!: Promise<void>;
  f.repository.create = (...args) => {
    committed = (async () => { started(); await barrier; await create(...args); })();
    return committed;
  };
  const running = Effect.runPromise(contactIntake(input, id, f.repository, f.mailer), { signal: controller.signal });
  await ready; controller.abort(); await assert.rejects(running);
  release(); await committed;
  assert.equal((await f.run()).message, CONTACT_SAVED_MESSAGE);
  assert.equal(f.counts().creates, 1); assert.equal(f.counts().sends, 0);
});
