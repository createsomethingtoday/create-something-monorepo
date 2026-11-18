import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { createTestDatabase } from './sqlite';
import { SharedInboxService } from '../src/shared-domain';
import {
  subscribeShared,
  fanoutSharedEvent,
  deliverShared,
  recoverSharedDelivery,
  unsubscribeShared,
  listSharedMonitoring
} from '../src/shared-delivery';
import type { RuntimeEnv } from '../src/env';
async function fixture() {
  const storage = createTestDatabase(),
    service = new SharedInboxService(storage.db),
    owner = { subject: 'alice', scopes: ['a2a:admin'], authentication: 'owner_session' as const };
  const agent = await service.createAgent(owner, 'Agent'),
    other = await service.createAgent(owner, 'Other'),
    box = await service.createInbox(owner, 'Shared');
  await service.addOwnMembership(owner, box.id, agent.id);
  await service.addOwnMembership(owner, box.id, other.id);
  const pair = await generateKeyPair('ES256'),
    jwk = await exportJWK(pair.publicKey);
  jwk.kid = 'delivery';
  const token = async (extra: Record<string, unknown> = {}) =>
    new SignJWT({
      kind: 'oauth_access_token',
      resource: 'https://a2a.createsomething.agency/mcp',
      scope: 'a2a:read a2a:write',
      email: 'alice@example.com',
      email_verified: true,
      connection_id: 'family',
      client_id: 'client',
      sub: 'alice',
      iss: 'https://id.createsomething.space',
      aud: 'https://a2a.createsomething.agency/mcp',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 600,
      ...extra
    })
      .setProtectedHeader({ alg: 'ES256', kid: 'delivery' })
      .sign(pair.privateKey);
  const bearer = {
    subject: 'alice',
    scopes: ['a2a:read', 'a2a:write'],
    authentication: 'bearer' as const,
    connectionId: 'family'
  };
  const connection = await service.requestConnection(bearer, 'Runtime');
  await service.approveConnection(owner, connection.id, agent.id);
  const received: any[] = [],
    jobs: any[] = [];
  let malformed = false;
  let callbackStatus = 200;
  let callbackHook: (() => Promise<void>) | undefined;
  const env = {
    DB: storage.db,
    ENVIRONMENT: 'test',
    IDENTITY_ISSUER: 'https://id.createsomething.space',
    AUTH_RESOURCE: 'https://a2a.createsomething.agency/mcp',
    ALLOWED_EMAILS: 'alice@example.com',
    LOCAL_TEST_JWKS: JSON.stringify({ keys: [jwk] }),
    SESSION_KEY: Buffer.alloc(32, 3).toString('base64'),
    CALLBACK_SENDER_TOKEN: 'x'.repeat(40),
    SHARED_INBOXES_ENABLED: 'true',
    DELIVERIES: {
      async send(x: unknown) {
        jobs.push(x);
      }
    },
    CALLBACK_SENDER: {
      idFromName() {
        return 'fixture';
      },
      get() {
        return {
          async fetch(request: Request) {
            const transport: any = await request.json(),
              body = JSON.parse(transport.body);
            if (body.type !== 'verification') {
              received.push(body);
              await callbackHook?.();
            }
            return Response.json({
              status: body.type === 'verification' ? 200 : callbackStatus,
              body:
                body.type === 'verification'
                  ? JSON.stringify({ challenge: malformed ? 'wrong' : body.challenge })
                  : 'ok'
            });
          }
        };
      }
    }
  } as unknown as RuntimeEnv;
  const params = {
    name: 'shared_inbox.work.created',
    arguments: { inbox_id: box.id },
    delivery: {
      mode: 'webhook',
      url: 'https://hooks.example.net/events',
      secret: 'whsec_' + Buffer.alloc(32, 1).toString('base64')
    }
  };
  const subscribe = async (extra = {}) =>
    subscribeShared(env, bearer, { ...params, ...extra }, await token());
  const send = async (to = agent.id) => {
    await service.sendMessage(bearer, box.id, {
      kind: 'request',
      text: 'Private work content',
      assigneeAgentId: to,
      idempotencyKey: crypto.randomUUID()
    });
    return (await storage.db
      .prepare('SELECT id FROM shared_outbox ORDER BY created_at DESC,rowid DESC LIMIT 1')
      .first<{ id: string }>())!.id;
  };
  const delivery = async (e: string) => {
    await fanoutSharedEvent(env, e);
    return storage.db
      .prepare('SELECT id FROM shared_deliveries WHERE event_id=?')
      .bind(e)
      .first<string>('id');
  };
  return {
    storage,
    service,
    owner,
    agent,
    other,
    box,
    bearer,
    connection,
    env,
    token,
    params,
    subscribe,
    send,
    delivery,
    received,
    jobs,
    setMalformed() {
      malformed = true;
    },
    setStatus(status: number) {
      callbackStatus = status;
    },
    setCallbackHook(h: () => Promise<void>) {
      callbackHook = h;
    }
  };
}
test('REVIEW: reassignment after accepted delivery produces a fresh notification', async () => {
  const f = await fixture();
  try {
    const sub = await f.subscribe();
    const e = await f.send();
    const d = await f.delivery(e);
    assert.ok(d);
    await deliverShared(f.env, d!);
    const m = f.storage.sqlite
      .prepare(
        'SELECT * FROM shared_messages WHERE id=(SELECT message_id FROM shared_outbox WHERE id=?)'
      )
      .get(e) as any;
    await f.service.reassignMessage(f.owner, f.box.id, m.id, f.agent.id, m.assignment_version);
    const e2 = f.storage.sqlite
      .prepare('SELECT id FROM shared_outbox WHERE message_id=? AND assignment_version=2')
      .get(m.id) as any;
    const d2 = await f.delivery(e2.id);
    assert.ok(
      d2,
      'New assignment event must materialize even when transcript cursor was already acknowledged'
    );
  } finally {
    f.storage.close();
  }
});

const owner = (subject: string) => ({
  subject,
  scopes: ['a2a:admin'],
  authentication: 'owner_session' as const
});
async function setup() {
  const t = createTestDatabase(),
    s = new SharedInboxService(t.db),
    o = owner('owner'),
    ag = await s.createAgent(o, 'Agent'),
    box = await s.createInbox(o, 'Box');
  await s.addOwnMembership(o, box.id, ag.id);
  const p = {
    subject: o.subject,
    scopes: ['a2a:read', 'a2a:write'],
    authentication: 'bearer' as const,
    connectionId: 'connection'
  };
  const c = await s.requestConnection(p, 'Runtime');
  await s.approveConnection(o, c.id, ag.id);
  return { t, s, o, ag, box, p, c };
}

test('REVIEW: rejoin cannot read old messages through idempotent send', async () => {
  const { t, s, o, ag, box, p } = await setup();
  try {
    const input = { text: 'old secret', idempotencyKey: 'remembered-key' };
    const old = await s.sendMessage(p, box.id, input);
    await s.removeMember(o, box.id, ag.id);
    await s.addOwnMembership(o, box.id, ag.id);
    await assert.rejects(() => s.readMessage(p, box.id, old.id));
    await assert.rejects(() => s.sendMessage(p, box.id, input));
  } finally {
    t.close();
  }
});
test('REVIEW: removal invalidates outstanding invitation consent', async () => {
  const { t, s, o, ag, box, p } = await setup();
  try {
    const pending = await s.invite(o, box.id, ag.id);
    await s.removeMember(o, box.id, ag.id);
    await assert.rejects(() => s.acceptInvitation(o, pending.id));
  } finally {
    t.close();
  }
});
test('REVIEW: replay backlog larger than batch does not starve behind failed receipt', async () => {
  const f = await fixture();
  try {
    for (let n = 0; n < 101; n++) await f.send();
    await f.subscribe({ cursor: '0' });
    assert.equal(
      f.storage.sqlite.prepare('SELECT count(*) AS n FROM shared_deliveries').get()?.n,
      100
    );
    const ds = f.storage.sqlite.prepare('SELECT id FROM shared_deliveries').all() as any[];
    f.setStatus(500);
    for (const d of ds) await deliverShared(f.env, d.id);
    await recoverSharedDelivery(f.env);
    assert.equal(
      f.storage.sqlite.prepare('SELECT count(*) AS n FROM shared_deliveries').get()?.n,
      101
    );
  } finally {
    f.storage.close();
  }
});
test('REVIEW: retention cleanup never converts explicit subscription revocation to resumable expiry',async()=>{
 const f=await fixture();try{
 const sub=await f.subscribe();
 await unsubscribeShared(f.env,f.bearer,f.params);
 f.storage.sqlite.prepare('UPDATE shared_subscriptions SET expires_at=? WHERE id=?').run(Date.now()-1,sub.id);
 await f.service.pruneRetention();
 await assert.rejects(()=>f.subscribe());
 }finally{f.storage.close()}
});
test('REVIEW: ninety-day cleanup retains explicit subscription revocation fence',async()=>{
 const f=await fixture();try{
 const sub=await f.subscribe();await unsubscribeShared(f.env,f.bearer,f.params);
 f.storage.sqlite.prepare('UPDATE shared_subscriptions SET expires_at=? WHERE id=?').run(Date.now()-91*86400000,sub.id);
 await f.service.pruneRetention();await assert.rejects(()=>f.subscribe());
 }finally{f.storage.close()}
});
