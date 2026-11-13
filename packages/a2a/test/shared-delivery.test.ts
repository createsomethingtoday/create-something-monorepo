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
test('renewal during credential verification retries the same work event; revocation still suspends it', async (t) => {
  for (const scenario of [
    'authorized renewal',
    'revoked after renewal',
    'stale credential rejected'
  ])
    await t.test(scenario, async (context) => {
      const revoke = scenario === 'revoked after renewal';
      const f = await fixture();
      try {
        await f.subscribe();
        const eventId = await f.send();
        const deliveryId = (await f.delivery(eventId))!;
        const decrypt = crypto.subtle.decrypt.bind(crypto.subtle);
        let renew = true;
        context.mock.method(
          crypto.subtle,
          'decrypt',
          async (...args: Parameters<SubtleCrypto['decrypt']>) => {
            const result = await decrypt(...args);
            if (renew) {
              renew = false;
              await f.subscribe();
              if (revoke) await unsubscribeShared(f.env, f.bearer, f.params);
              if (scenario === 'stale credential rejected')
                return new TextEncoder().encode('invalidated-old-token').buffer;
            }
            return result;
          }
        );
        await deliverShared(f.env, deliveryId);
        assert.equal(
          f.received.length,
          0,
          'Do not dispatch using the stale subscription snapshot.'
        );
        const row = f.storage.sqlite
          .prepare('SELECT state FROM shared_deliveries WHERE id=?')
          .get(deliveryId);
        assert.equal(row!.state, revoke ? 'suspended' : 'retrying');
        if (!revoke) {
          f.storage.sqlite
            .prepare('UPDATE shared_deliveries SET next_attempt_at=0 WHERE id=?')
            .run(deliveryId);
          await recoverSharedDelivery(f.env);
          assert.ok(f.jobs.some((j) => j.sharedDeliveryId === deliveryId));
          await deliverShared(f.env, deliveryId);
          assert.equal(f.received.length, 1);
          assert.equal(f.received[0].eventId, eventId);
          assert.equal(
            f.storage.sqlite
              .prepare('SELECT state FROM shared_deliveries WHERE id=?')
              .get(deliveryId)!.state,
            'accepted'
          );
        }
      } finally {
        context.mock.restoreAll();
        f.storage.close();
      }
    });
});
test('event replay retains its high-water mark and reports pruned history after ninety days', async () => {
  const f = await fixture();
  try {
    await f.send();
    const high = f.storage.sqlite
      .prepare('SELECT MAX(cursor) AS n FROM shared_event_positions')
      .get()!.n as number;
    const old = Date.now() - 91 * 86400000;
    f.storage.sqlite
      .prepare('UPDATE shared_messages SET created_at=?,expires_at=?')
      .run(old, old + 30 * 86400000);
    f.storage.sqlite.prepare('UPDATE shared_outbox SET created_at=?').run(old);
    await f.service.pruneRetention();
    assert.equal(
      f.storage.sqlite.prepare('SELECT count(*) AS n FROM shared_event_positions').get()!.n,
      0
    );
    const tail = await f.subscribe();
    assert.equal(tail.cursor, String(high), 'Pruning must not reset event position.');
    const replay = await f.subscribe({
      cursor: '0',
      delivery: { ...f.params.delivery, url: 'https://hooks.example.net/replay' }
    });
    assert.equal(replay.truncated, true, 'Retired events must not look like complete catch-up.');
    await f.send();
    assert.ok(
      Number(
        f.storage.sqlite.prepare('SELECT MAX(cursor) AS n FROM shared_event_positions').get()!.n
      ) > high
    );
  } finally {
    f.storage.close();
  }
});
test('shared delivery encrypts credentials, bounds renewal, targets assignee and contains no text', async () => {
  const f = await fixture();
  try {
    const result = await f.subscribe();
    assert.ok(Date.parse(result.refreshBefore) <= Date.now() + 600000);
    const stored = await f.storage.db.prepare('SELECT * FROM shared_subscriptions').first<any>();
    assert.ok(!JSON.stringify(stored).includes(await f.token()));
    const id = await f.delivery(await f.send());
    assert.ok(id);
    await Promise.all([deliverShared(f.env, id!), deliverShared(f.env, id!)]);
    assert.equal(f.received.length, 1);
    assert.equal(f.received[0].data.agent_id, f.agent.id);
    assert.ok(!JSON.stringify(f.received).includes('Private work content'));
    const wrong = await f.delivery(await f.send(f.other.id));
    assert.equal(wrong, null);
    const status = await listSharedMonitoring(f.env, f.owner, f.box.id);
    assert.ok(!JSON.stringify(status).includes('ciphertext'));
  } finally {
    f.storage.close();
  }
});
test('connection/member revocation and generation changes prevent egress', async () => {
  for (const mode of ['connection', 'membership', 'generation', 'assignment']) {
    const f = await fixture();
    try {
      await f.subscribe();
      const id = await f.delivery(await f.send());
      if (mode === 'connection') await f.service.revokeConnection(f.owner, f.connection.id);
      if (mode === 'membership') await f.service.removeMember(f.owner, f.box.id, f.agent.id);
      if (mode === 'generation')
        await f.storage.db.prepare('UPDATE shared_memberships SET generation=generation+1').run();
      if (mode === 'assignment')
        await f.storage.db
          .prepare('UPDATE shared_messages SET assignment_version=assignment_version+1')
          .run();
      await deliverShared(f.env, id!);
      assert.equal(f.received.length, 0, mode);
    } finally {
      f.storage.close();
    }
  }
});
test('malformed callback, expired OAuth and wrong signed binding fail closed', async () => {
  const f = await fixture();
  try {
    f.setMalformed();
    await assert.rejects(f.subscribe(), { code: 'callback_verification_failed' });
    assert.equal(
      await f.storage.db.prepare('SELECT COUNT(*) AS n FROM shared_subscriptions').first('n'),
      0
    );
    await assert.rejects(subscribeShared(f.env, f.bearer, f.params, await f.token({ exp: 1 })), {
      code: 'invalid_token'
    });
    await assert.rejects(
      subscribeShared(f.env, f.bearer, f.params, await f.token({ connection_id: 'other' })),
      { code: 'invalid_token' }
    );
  } finally {
    f.storage.close();
  }
});
test('expiry erases bearer/secret, renewal replaces token, revocation does not resurrect', async () => {
  const f = await fixture();
  try {
    const sub = await f.subscribe();
    await f.storage.db.prepare('UPDATE shared_subscriptions SET expires_at=1').run();
    await recoverSharedDelivery(f.env);
    const expired = await f.storage.db.prepare('SELECT * FROM shared_subscriptions').first<any>();
    assert.equal(expired.token_ciphertext, '');
    assert.equal(expired.secret_ciphertext, '');
    await f.subscribe({ cursor: '0' });
    await unsubscribeShared(f.env, f.bearer, f.params);
    await assert.rejects(f.subscribe(), { code: 'subscription_revoked' });
    assert.equal(
      (
        await f.storage.db
          .prepare('SELECT token_ciphertext FROM shared_subscriptions WHERE id=?')
          .bind(sub.id)
          .first<any>()
      ).token_ciphertext,
      ''
    );
  } finally {
    f.storage.close();
  }
});
test('concurrent callback registrations cannot exceed the active quota', async () => {
  const f = await fixture();
  try {
    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        f.subscribe({ delivery: { ...f.params.delivery, url: `https://hooks.example.net/${i}` } })
      )
    );
    assert.equal(
      await f.storage.db
        .prepare("SELECT COUNT(*) AS n FROM shared_subscriptions WHERE status='active'")
        .first('n'),
      4
    );
    assert.equal(attempts.filter((x) => x.status === 'fulfilled').length, 4);
  } finally {
    f.storage.close();
  }
});
test('lapsed explicit replay renews cursor without skipping unaccepted work and reports retention gaps', async () => {
  const f = await fixture();
  try {
    await f.send();
    const sub = await f.subscribe();
    await f.storage.db.prepare('UPDATE shared_subscriptions SET expires_at=1').run();
    await recoverSharedDelivery(f.env);
    await f.subscribe({ cursor: '0' });
    const stored = await f.storage.db
      .prepare('SELECT cursor FROM shared_subscriptions WHERE id=?')
      .bind(sub.id)
      .first<number>('cursor');
    assert.equal(
      stored,
      0,
      'Event replay starts at event position zero independently of transcript admission'
    );
    const e = await f.send();
    await f.storage.db
      .prepare(
        'UPDATE shared_messages SET expires_at=1 WHERE id=(SELECT message_id FROM shared_outbox WHERE id=?)'
      )
      .bind(e)
      .run();
    await f.storage.db.prepare('UPDATE shared_subscriptions SET expires_at=1').run();
    await recoverSharedDelivery(f.env);
    assert.equal((await f.subscribe({ cursor: '0' })).truncated, true);
  } finally {
    f.storage.close();
  }
});
test('stored OAuth expiry is terminal and erases credential before callback', async () => {
  const f = await fixture();
  try {
    await f.subscribe();
    const id = await f.delivery(await f.send());
    const { seal } = await import('../src/crypto');
    const s = await f.storage.db.prepare('SELECT id FROM shared_subscriptions').first<any>();
    await f.storage.db
      .prepare('UPDATE shared_subscriptions SET token_ciphertext=? WHERE id=?')
      .bind(await seal(f.env.SESSION_KEY, await f.token({ exp: 1 }), `shared-token:${s.id}`), s.id)
      .run();
    await deliverShared(f.env, id!);
    assert.equal(f.received.length, 0);
    const row = await f.storage.db
      .prepare('SELECT status,token_ciphertext FROM shared_subscriptions')
      .first<any>();
    assert.equal(row.status, 'revoked');
    assert.equal(row.token_ciphertext, '');
  } finally {
    f.storage.close();
  }
});
test('old callback failure cannot cancel a renewed subscription revision', async () => {
  const f = await fixture();
  try {
    await f.subscribe();
    const id = await f.delivery(await f.send());
    f.setStatus(410);
    f.setCallbackHook(async () => {
      await f.subscribe();
    });
    await deliverShared(f.env, id!);
    assert.equal(f.received.length, 1);
    assert.equal(
      (await f.storage.db.prepare('SELECT status FROM shared_subscriptions').first<any>()).status,
      'active'
    );
  } finally {
    f.storage.close();
  }
});

test('event replay watermark waits for failed earlier work across other-assignee events', async () => {
  const f = await fixture();
  try {
    const sub = await f.subscribe();
    const first = await f.send();
    await f.send(f.other.id);
    const last = await f.send();
    const firstDelivery = await f.delivery(first),
      lastDelivery = await f.delivery(last);
    const pos = async (eventId: string) =>
      f.storage.db
        .prepare('SELECT cursor FROM shared_event_positions WHERE event_id=?')
        .bind(eventId)
        .first<number>('cursor');
    f.setStatus(500);
    await deliverShared(f.env, firstDelivery!);
    f.setStatus(200);
    await deliverShared(f.env, lastDelivery!);
    const cursor = () =>
      f.storage.db
        .prepare('SELECT cursor FROM shared_subscriptions WHERE id=?')
        .bind(sub.id)
        .first<number>('cursor');
    assert.ok(
      (await cursor())! < (await pos(first))!,
      'Later accepted event cannot skip earlier failed work'
    );
    await f.storage.db
      .prepare('UPDATE shared_deliveries SET next_attempt_at=0 WHERE id=?')
      .bind(firstDelivery!)
      .run();
    await deliverShared(f.env, firstDelivery!);
    assert.equal(await cursor(), await pos(last));
    assert.equal(f.received.filter((x) => x.eventId === first).length, 2);
  } finally {
    f.storage.close();
  }
});

test('work committed during replay advancement stays deliverable', async (t) => {
  for (const boundary of ['pending', 'latest'] as const)
    await t.test(`request commits after the ${boundary} query`, async (context) => {
      const f = await fixture();
      try {
        const sub = await f.subscribe();
        const acceptedEvent = await f.send();
        const acceptedDelivery = (await f.delivery(acceptedEvent))!;
        const prepare = f.storage.db.prepare.bind(f.storage.db);
        let concurrentEvent: string | undefined;
        let injected = false;
        context.mock.method(f.storage.db, 'prepare', (sql: string) => {
          const statement = prepare(sql);
          const matches =
            boundary === 'pending'
              ? sql.startsWith('SELECT MIN(ep.cursor)')
              : sql.startsWith('SELECT COALESCE(MAX(ep.cursor),0)');
          if (!matches) return statement;
          const intercept = (bound: D1PreparedStatement): D1PreparedStatement =>
            new Proxy(bound, {
              get(target, property) {
                if (property === 'bind')
                  return (...values: unknown[]) => intercept(target.bind(...values));
                if (property === 'first')
                  return async (column?: string) => {
                    const result =
                      column === undefined ? await target.first() : await target.first(column);
                    if (!injected) {
                      injected = true;
                      await f.send(f.other.id);
                      concurrentEvent = await f.send();
                    }
                    return result;
                  };
                return Reflect.get(target, property);
              }
            });
          return intercept(statement);
        });
        await deliverShared(f.env, acceptedDelivery);
        assert.ok(concurrentEvent, 'The request must commit inside the advancement window.');
        const cursor = () =>
          prepare('SELECT cursor FROM shared_subscriptions WHERE id=?')
            .bind(sub.id)
            .first<number>('cursor');
        const position = (id: string) =>
          prepare('SELECT cursor FROM shared_event_positions WHERE event_id=?')
            .bind(id)
            .first<number>('cursor');
        assert.equal(await cursor(), await position(acceptedEvent));
        assert.ok(
          (await cursor())! < (await position(concurrentEvent))!,
          'The watermark must not skip work that the host has not accepted.'
        );
        await recoverSharedDelivery(f.env);
        const nextDelivery = await prepare('SELECT id FROM shared_deliveries WHERE event_id=?')
          .bind(concurrentEvent)
          .first<string>('id');
        assert.ok(nextDelivery, 'Scheduled recovery must materialize the concurrent event.');
        assert.ok(f.jobs.some((job) => job.sharedDeliveryId === nextDelivery));
        await deliverShared(f.env, nextDelivery);
        await deliverShared(f.env, acceptedDelivery);
        assert.deepEqual(
          f.received.map((event) => event.eventId),
          [acceptedEvent, concurrentEvent]
        );
        assert.equal(await cursor(), await position(concurrentEvent));
      } finally {
        context.mock.restoreAll();
        f.storage.close();
      }
    });
});
