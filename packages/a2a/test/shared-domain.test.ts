import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDatabase } from './sqlite';
import { SharedInboxService } from '../src/shared-domain';
const owner = (subject: string) => ({
  subject,
  scopes: ['a2a:admin'],
  authentication: 'owner_session' as const
});
test('v2 multi-agent connection isolation and admission history', async () => {
  const t = createTestDatabase();
  try {
    const s = new SharedInboxService(t.db),
      a = owner('a'),
      b = owner('b');
    const x = await s.createAgent(a, 'X'),
      y = await s.createAgent(a, 'Y'),
      z = await s.createAgent(b, 'Z');
    const box = await s.createInbox(a, 'Shared');
    await s.addOwnMembership(a, box.id, x.id);
    const p = {
      subject: 'a',
      scopes: ['a2a:read', 'a2a:write'],
      authentication: 'bearer' as const,
      connectionId: 'family'
    };
    await assert.rejects(() => s.listMessages(p, box.id));
    const c = await s.requestConnection(p, 'Runtime');
    await s.approveConnection(a, c.id, x.id);
    await assert.rejects(() => s.approveConnection(a, c.id, y.id));
    await s.sendMessage(p, box.id, { text: 'Before', idempotencyKey: '1' });
    const inv = await s.invite(a, box.id, z.id);
    await assert.rejects(() => s.acceptInvitation(a, inv.id));
    await s.acceptInvitation(b, inv.id);
    const q = { ...p, subject: 'b', connectionId: 'family-b' };
    const d = await s.requestConnection(q, 'B');
    await s.approveConnection(b, d.id, z.id);
    assert.equal((await s.listMessages(q, box.id)).items.length, 1);
    await s.sendMessage(p, box.id, { text: 'After', idempotencyKey: '2' });
    assert.equal((await s.listMessages(q, box.id)).items.at(-1)?.text, 'After');
    await s.removeMember(a, box.id, z.id);
    await assert.rejects(() => s.listMessages(q, box.id));
  } finally {
    t.close();
  }
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
test('a valid claim cannot complete work after its seven-day action window', async (testContext) => {
  const { t, s, o, ag, box, p } = await setup();
  try {
    let now = Date.now();
    testContext.mock.method(Date, 'now', () => now);
    const message = await s.sendOwnerMessage(o, box.id, {
      text: 'Time-bounded work',
      kind: 'request',
      assigneeAgentId: ag.id,
      idempotencyKey: 'deadline'
    });
    now += 7 * 86400000 - 60000;
    const claim = await s.claimMessage(p, box.id, message.id, message.assignment_version);
    now += 120000;
    await assert.rejects(() =>
      s.finishMessage(p, box.id, message.id, { ...claim, state: 'completed' })
    );
    assert.notEqual((await s.readMessage(o, box.id, message.id)).state, 'completed');
  } finally {
    t.close();
  }
});
test('work fencing, owner attribution, rejoin boundary and immutable context', async () => {
  const { t, s, o, ag, box, p, c } = await setup();
  try {
    const m = await s.sendOwnerMessage(o, box.id, {
      kind: 'request',
      text: 'Do it',
      assigneeAgentId: ag.id,
      idempotencyKey: 'owner-1'
    });
    assert.equal(m.author_kind, 'owner');
    assert.equal(
      (
        await s.sendOwnerMessage(o, box.id, {
          kind: 'request',
          text: 'Do it',
          assigneeAgentId: ag.id,
          idempotencyKey: 'owner-1'
        })
      ).id,
      m.id
    );
    const claim = await s.claimMessage(p, box.id, m.id, m.assignment_version);
    await assert.rejects(() => s.claimMessage(p, box.id, m.id));
    await s.setAgentPaused(o, ag.id, true);
    assert.equal((await s.readMessage(o, box.id, m.id)).state, 'awaiting_assignment');
    await s.setAgentPaused(o, ag.id, false);
    await assert.rejects(() => s.finishMessage(p, box.id, m.id, { ...claim, state: 'completed' }));
    await s.reassignMessage(o, box.id, m.id, ag.id, 2);
    const next = await s.claimMessage(p, box.id, m.id, 3);
    await s.finishMessage(p, box.id, m.id, { ...next, state: 'completed' });
    const doc = await s.createContext(p, box.id, { title: 'Context', text: 'secret text' });
    assert.equal((await s.readContext(p, box.id, doc.id)).text, 'secret text');
    assert.equal((await s.searchContext(p, box.id, 'secret')).items.length, 1);
    const old = await s.authorize(p, box.id);
    await s.removeMember(o, box.id, ag.id);
    assert.equal(await s.deliveryEligible(c.id, box.id, old.generation, m.cursor), false);
    await assert.rejects(() => s.readContext(p, box.id, doc.id));
    await s.addOwnMembership(o, box.id, ag.id);
    assert.ok((await s.authorize(p, box.id)).generation > old.generation);
    await assert.rejects(() => s.readMessage(p, box.id, m.id));
    await assert.rejects(() => s.readContext(p, box.id, doc.id));
    await s.revokeContext(o, box.id, doc.id);
    assert.equal((await s.listContext(o, box.id)).items.length, 0);
  } finally {
    t.close();
  }
});
test('atomic revoke/send and revoke/claim races fail closed', async () => {
  const { t, s, o, ag, box, p } = await setup();
  try {
    t.beforeNextBatch(() =>
      t.sqlite
        .prepare("UPDATE shared_connections SET state='revoked' WHERE family_id=?")
        .run('connection')
    );
    await assert.rejects(() => s.sendMessage(p, box.id, { text: 'race', idempotencyKey: 'race' }));
    assert.equal(
      t.sqlite
        .prepare("SELECT count(*) AS n FROM shared_messages WHERE idempotency_key='race'")
        .get()?.n,
      0
    );
    const p2 = { ...p, connectionId: 'second' };
    const co = await s.requestConnection(p2, 'second');
    await s.approveConnection(o, co.id, ag.id);
    const m = await s.sendOwnerMessage(o, box.id, {
      text: 'Work',
      kind: 'request',
      assigneeAgentId: ag.id,
      idempotencyKey: 'work'
    });
    t.beforeNextBatch(() =>
      t.sqlite
        .prepare(
          "UPDATE shared_memberships SET state='revoked',generation=generation+1 WHERE agent_id=?"
        )
        .run(ag.id)
    );
    await assert.rejects(() => s.claimMessage(p2, box.id, m.id));
    assert.equal((await s.readMessage(o, box.id, m.id)).state, 'pending');
  } finally {
    t.close();
  }
});
test('invitation single use, wrong owner, expiry and concurrent acceptance', async () => {
  const { t, s, o, box } = await setup();
  try {
    const b = owner('other'),
      a = await s.createAgent(b, 'Other'),
      iv = await s.invite(o, box.id, a.id);
    const r = await Promise.allSettled([
      s.acceptInvitation(b, iv.id),
      s.acceptInvitation(b, iv.id)
    ]);
    assert.equal(r.filter((x) => x.status === 'fulfilled').length, 1);
    await s.removeMember(o, box.id, a.id);
    const expired = await s.invite(o, box.id, a.id);
    t.sqlite.prepare('UPDATE shared_invitations SET expires_at=0 WHERE id=?').run(expired.id);
    await assert.rejects(() => s.acceptInvitation(b, expired.id));
    const revoked = await s.invite(o, box.id, a.id);
    await s.revokeInvitation(o, revoked.id);
    await assert.rejects(() => s.acceptInvitation(b, revoked.id));
    assert.equal(t.sqlite.prepare('SELECT count(*) AS n FROM agents').get()?.n, 0);
  } finally {
    t.close();
  }
});
test('retention gap is explicit and quotas preserve v1 tables', async () => {
  const { t, s, o, box, p } = await setup();
  try {
    const m = await s.sendMessage(p, box.id, { text: 'old', idempotencyKey: 'old' });
    t.sqlite.prepare('UPDATE shared_messages SET expires_at=0 WHERE id=?').run(m.id);
    const page = await s.listMessages(p, box.id);
    assert.equal(page.truncated, true);
    assert.ok(!page.items.some((x) => x.id === m.id));
    await s.pruneRetention();
    assert.equal(
      t.sqlite.prepare('SELECT text FROM shared_messages WHERE id=?').get(m.id)?.text,
      ''
    );
    for (let i = 1; i < 20; i++) await s.createAgent(o, 'Agent ' + i);
    await assert.rejects(() => s.createAgent(o, 'Limit'));
    assert.equal(t.sqlite.prepare('SELECT count(*) AS n FROM agents').get()?.n, 0);
  } finally {
    t.close();
  }
});
test('selected participant-owner view never inherits custodian history', async () => {
  const { t, s, o, box, p } = await setup();
  try {
    const m = await s.sendMessage(p, box.id, {
        text: 'Before second agent',
        idempotencyKey: 'before'
      }),
      second = await s.createAgent(o, 'Second');
    await s.addOwnMembership(o, box.id, second.id);
    assert.equal(
      (await s.listMessages(o, box.id)).items.some((x) => x.id === m.id),
      true
    );
    assert.equal(
      (await s.listMessages(o, box.id, 0, 50, second.id)).items.some((x) => x.id === m.id),
      false
    );
    await assert.rejects(() => s.readMessage(o, box.id, m.id, second.id));
    await assert.rejects(() => s.listMessages(o, box.id, 0, 50, 'unknown'));
  } finally {
    t.close();
  }
});
test('separate same-owner credentials and cross-owner work completion', async () => {
  const { t, s, o, ag, box, p } = await setup();
  try {
    const second = await s.createAgent(o, 'Second');
    await s.addOwnMembership(o, box.id, second.id);
    const q = { ...p, connectionId: 'connection-second' };
    const conn = await s.requestConnection(q, 'Second');
    await s.approveConnection(o, conn.id, second.id);
    const b = owner('another'),
      third = await s.createAgent(b, 'Third'),
      iv = await s.invite(o, box.id, third.id);
    await s.acceptInvitation(b, iv.id);
    const r = { ...p, subject: b.subject, connectionId: 'third' };
    const rc = await s.requestConnection(r, 'Third');
    await s.approveConnection(b, rc.id, third.id);
    const x = await s.sendMessage(p, box.id, { text: 'first', idempotencyKey: 'same-key' }),
      y = await s.sendMessage(q, box.id, { text: 'second', idempotencyKey: 'same-key' });
    assert.notEqual(x.id, y.id);
    assert.equal(y.author_agent_id, second.id);
    const m = await s.sendMessage(p, box.id, {
      text: 'Third acts',
      kind: 'request',
      assigneeAgentId: third.id,
      idempotencyKey: 'work-third'
    });
    await assert.rejects(() => s.claimMessage(q, box.id, m.id));
    await assert.rejects(() => s.claimMessage(p, box.id, m.id));
    const claim = await s.claimMessage(r, box.id, m.id);
    assert.equal(
      (await s.finishMessage(r, box.id, m.id, { ...claim, state: 'completed' })).state,
      'completed'
    );
    const other = await s.createInbox(o, 'Other');
    await s.addOwnMembership(o, other.id, ag.id);
    await assert.rejects(() => s.readMessage(p, other.id, m.id));
    await assert.rejects(() => s.listMessages(q, other.id));
  } finally {
    t.close();
  }
});
test('Unicode context pagination uses codepoints and bounds output bytes', async () => {
  const { t, s, box, p } = await setup();
  try {
    const body = '😀'.repeat(5000),
      doc = await s.createContext(p, box.id, { title: 'Unicode', text: body }),
      first = await s.readContext(p, box.id, doc.id, undefined, 0, 8192);
    assert.ok(new TextEncoder().encode(first.text).length <= 16384);
    assert.equal(first.nextOffset, 4096);
    const rest = await s.readContext(p, box.id, doc.id, undefined, first.nextOffset!);
    assert.equal(first.text + rest.text, body);
    assert.equal(rest.nextOffset, null);
  } finally {
    t.close();
  }
});
test('reassignment atomically enqueues a distinct assignment-version event', async () => {
  const { t, s, o, ag, box } = await setup();
  try {
    const m = await s.sendOwnerMessage(o, box.id, {
      text: 'Work',
      kind: 'request',
      assigneeAgentId: ag.id,
      idempotencyKey: 'reassign'
    });
    await s.reassignMessage(o, box.id, m.id, ag.id, 1);
    assert.equal(
      t.sqlite.prepare('SELECT count(*) AS n FROM shared_outbox WHERE message_id=?').get(m.id)?.n,
      2
    );
    await assert.rejects(() => s.reassignMessage(o, box.id, m.id, ag.id, 1));
    assert.equal(
      t.sqlite.prepare('SELECT count(*) AS n FROM shared_outbox WHERE message_id=?').get(m.id)?.n,
      2
    );
  } finally {
    t.close();
  }
});
test('shared context preserves exact whitespace, BOM and immutable digest', async () => {
  const { t, s, box, p } = await setup();
  try {
    const body = '\uFEFF  header\r\n😀\t \n',
      doc = await s.createContext(p, box.id, { title: 'Exact', text: body });
    assert.equal((await s.readContext(p, box.id, doc.id)).text, body);
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))),
      (x) => x.toString(16).padStart(2, '0')
    ).join('');
    assert.equal(doc.sha256, digest);
    assert.equal('text' in (await s.listContext(p, box.id)).items[0], false);
  } finally {
    t.close();
  }
});
test('context writes and search cannot cross revocation or inbox boundaries', async () => {
  const { t, s, o, ag, box, p } = await setup();
  try {
    const doc = await s.createContext(p, box.id, { title: 'Private', text: 'needle' }),
      other = await s.createInbox(o, 'Other');
    await s.addOwnMembership(o, other.id, ag.id);
    await assert.rejects(() => s.readContext(p, other.id, doc.id));
    assert.equal((await s.searchContext(p, other.id, 'needle')).items.length, 0);
    t.beforeNextBatch(() =>
      t.sqlite
        .prepare(
          "UPDATE shared_memberships SET state='revoked',generation=generation+1 WHERE inbox_id=? AND agent_id=?"
        )
        .run(box.id, ag.id)
    );
    await assert.rejects(() =>
      s.createContext(p, box.id, { title: 'Race', text: 'must not persist' })
    );
    assert.equal(
      t.sqlite.prepare("SELECT count(*) AS n FROM shared_context WHERE title='Race'").get()?.n,
      0
    );
    await assert.rejects(() => s.searchContext(p, box.id, 'needle'));
  } finally {
    t.close();
  }
});
test('pending connection and invitation quotas are atomic and audit records persist', async () => {
  const { t, s, o, ag, box, p } = await setup();
  try {
    for (let n = 1; n < 100; n++)
      await s.requestConnection({ ...p, connectionId: 'family-' + n }, 'pending');
    await assert.rejects(() => s.requestConnection({ ...p, connectionId: 'family-over' }, 'over'));
    for (let n = 0; n < 100; n++) await s.invite(o, box.id, ag.id);
    await assert.rejects(() => s.invite(o, box.id, ag.id));
    assert.ok(Number(t.sqlite.prepare('SELECT count(*) AS n FROM shared_audit').get()?.n) >= 2);
    const other = owner('other');
    await assert.rejects(() => s.roster(other, box.id));
    await assert.rejects(() => s.setInboxState(other, box.id, 'closed'));
  } finally {
    t.close();
  }
});
test('finish loses to transactional reassignment and context batch failures roll back', async () => {
  const { t, s, o, ag, box, p } = await setup();
  try {
    const m = await s.sendOwnerMessage(o, box.id, {
        text: 'Work',
        kind: 'request',
        assigneeAgentId: ag.id,
        idempotencyKey: 'finish-race'
      }),
      claim = await s.claimMessage(p, box.id, m.id);
    t.beforeNextBatch(() =>
      t.sqlite
        .prepare(
          "UPDATE shared_messages SET assignment_version=assignment_version+1,state='pending',claim_token=NULL WHERE id=?"
        )
        .run(m.id)
    );
    await assert.rejects(() => s.finishMessage(p, box.id, m.id, { ...claim, state: 'completed' }));
    t.sqlite.exec(
      "CREATE TRIGGER fail_context BEFORE INSERT ON shared_context BEGIN SELECT RAISE(ABORT,'fixture failure'); END"
    );
    const before = t.sqlite.prepare('SELECT count(*) AS n FROM shared_messages').get()?.n;
    await assert.rejects(() => s.createContext(p, box.id, { title: 'Failure', text: 'rollback' }));
    assert.equal(t.sqlite.prepare('SELECT count(*) AS n FROM shared_messages').get()?.n, before);
  } finally {
    t.close();
  }
});
test('idempotent reconciliation never bypasses rejoin history or retention', async () => {
  const { t, s, o, ag, box, p } = await setup();
  try {
    const input = { text: 'Old exact body', idempotencyKey: 'old-body' };
    const m = await s.sendMessage(p, box.id, input);
    await s.removeMember(o, box.id, ag.id);
    await s.addOwnMembership(o, box.id, ag.id);
    await assert.rejects(() => s.sendMessage(p, box.id, input));
    const human = { text: 'Human old body', idempotencyKey: 'human-old-body' };
    await s.sendOwnerMessage(o, box.id, human, ag.id);
    await s.removeMember(o, box.id, ag.id);
    await s.addOwnMembership(o, box.id, ag.id);
    await assert.rejects(() => s.sendOwnerMessage(o, box.id, human, ag.id));
    const fresh = await s.sendMessage(p, box.id, { text: 'Expiry', idempotencyKey: 'expired' });
    t.sqlite.prepare('UPDATE shared_messages SET expires_at=0 WHERE id=?').run(fresh.id);
    await assert.rejects(() =>
      s.sendMessage(p, box.id, { text: 'Expiry', idempotencyKey: 'expired' })
    );
    assert.notEqual(m.id, fresh.id);
  } finally {
    t.close();
  }
});
test('retention expires seven-day work and prunes ninety-day metadata with live FK references', async () => {
  const { t, s, o, ag, box, p, c } = await setup();
  try {
    t.sqlite.exec('PRAGMA foreign_keys=ON');
    const now = Date.now(),
      day = 86400000;
    const work = await s.sendMessage(p, box.id, {
      text: 'Seven day work',
      kind: 'request',
      assigneeAgentId: ag.id,
      idempotencyKey: 'seven-day'
    });
    t.sqlite
      .prepare('UPDATE shared_messages SET created_at=? WHERE id=?')
      .run(now - 8 * day, work.id);
    const old = await s.sendMessage(p, box.id, {
      text: 'Ninety day body',
      idempotencyKey: 'ninety-day'
    });
    const doc = await s.createContext(p, box.id, { title: 'Old context', text: 'Old document' });
    const event = t.sqlite.prepare('SELECT id FROM shared_outbox WHERE message_id=?').get(old.id)!
      .id as string;
    t.sqlite
      .prepare('UPDATE shared_messages SET created_at=?,expires_at=? WHERE id=?')
      .run(now - 91 * day, now - 61 * day, old.id);
    t.sqlite
      .prepare('UPDATE shared_context SET created_at=?,expires_at=? WHERE id=?')
      .run(now - 91 * day, now - 61 * day, doc.id);
    t.sqlite.prepare('UPDATE shared_outbox SET created_at=? WHERE id=?').run(now - 91 * day, event);
    t.sqlite.prepare('UPDATE shared_audit SET created_at=?').run(now - 91 * day);
    t.sqlite
      .prepare(
        `INSERT INTO shared_subscriptions(id,owner_subject,connection_id,agent_id,inbox_id,generation,callback_url,secret_ciphertext,token_ciphertext,status,cursor,replay_floor_at,expires_at,created_at,revision) VALUES('old-sub',?,?,?,?,1,'https://example.com','secret','token','expired',0,?,?,?,'old')`
      )
      .run(o.subject, c.id, ag.id, box.id, now - 91 * day, now - 91 * day, now - 92 * day);
    t.sqlite
      .prepare(
        `INSERT INTO shared_deliveries(id,event_id,subscription_id,assignment_version,state,next_attempt_at) VALUES('old-delivery',?,'old-sub',1,'accepted',?)`
      )
      .run(event, now - 91 * day);
    await s.pruneRetention(now);
    assert.equal((await s.readMessage(p, box.id, work.id)).state, 'expired');
    assert.equal(
      t.sqlite.prepare('SELECT count(*) AS n FROM shared_messages WHERE id=?').get(old.id)?.n,
      0
    );
    for (const table of [
      'shared_context',
      'shared_deliveries',
      'shared_outbox',
      'shared_audit',
      'shared_subscriptions'
    ])
      assert.equal(
        t.sqlite
          .prepare(
            `SELECT count(*) AS n FROM ${table} ${table === 'shared_outbox' ? 'WHERE id=?' : ''}`
          )
          .get(...(table === 'shared_outbox' ? [event] : []))?.n,
        0,
        table
      );
    assert.equal(
      t.sqlite
        .prepare('SELECT count(*) AS n FROM shared_event_positions WHERE event_id=?')
        .get(event)?.n,
      0
    );
    assert.equal((await s.listMessages(p, box.id, 0)).truncated, true);
    assert.equal((await s.listMessages(p, box.id, old.cursor)).truncated, false);
    const member = await s.authorize(p, box.id);
    assert.equal(member.state, 'active');
    assert.equal((await s.resolveAgent(p)).id, ag.id);
    const next = await s.sendMessage(p, box.id, {
      text: 'After prune',
      idempotencyKey: 'after-prune'
    });
    assert.ok(next.cursor > old.cursor);
    await s.removeMember(o, box.id, ag.id);
    await s.addOwnMembership(o, box.id, ag.id);
    assert.equal(
      (await s.listMessages(p, box.id, 0)).truncated,
      false,
      'rejoined agent must not learn a pre-admission pruning gap'
    );
    assert.equal(
      (await s.listMessages(o, box.id, 0)).truncated,
      true,
      'custodian still sees its retained pruning gap'
    );
    await s.pruneRetention(now);
    assert.equal(
      t.sqlite.prepare('SELECT count(*) AS n FROM shared_retention_watermarks').get()?.n,
      1,
      'repeated pruning retains one compact watermark per inbox'
    );
    assert.equal(t.sqlite.prepare('PRAGMA foreign_key_check').all().length, 0);
  } finally {
    t.close();
  }
});
test('retention keeps revoked callback tombstones and erases their credentials and old URLs', async () => {
  const { t, s, o, ag, box, c } = await setup();
  try {
    const now = Date.now(),
      day = 86400000;
    for (const [key, expires] of [
      ['recent', now - 1],
      ['old', now - 91 * day]
    ] as const)
      t.sqlite
        .prepare(
          `INSERT INTO shared_subscriptions(id,owner_subject,connection_id,agent_id,inbox_id,generation,callback_url,secret_ciphertext,token_ciphertext,previous_secret_ciphertext,previous_secret_until,status,cursor,replay_floor_at,expires_at,created_at,revision) VALUES(?,?,?,?,?,1,'https://example.com/revoked','secret','token','old-secret',?,'revoked',0,?,?,?,'revoked')`
        )
        .run(key, o.subject, c.id, ag.id, box.id, now, now - 92 * day, expires, now - 92 * day);
    await s.pruneRetention(now);
    const recent = t.sqlite.prepare("SELECT * FROM shared_subscriptions WHERE id='recent'").get()!,
      old = t.sqlite.prepare("SELECT * FROM shared_subscriptions WHERE id='old'").get()!;
    for (const row of [recent, old]) {
      assert.equal(row.status, 'revoked');
      assert.equal(row.secret_ciphertext, '');
      assert.equal(row.token_ciphertext, '');
      assert.equal(row.previous_secret_ciphertext, null);
      assert.equal(row.previous_secret_until, null);
      assert.equal(row.connection_id, c.id);
      assert.equal(row.agent_id, ag.id);
      assert.equal(row.inbox_id, box.id);
    }
    assert.equal(old.callback_url, '');
    assert.equal(recent.callback_url, 'https://example.com/revoked');
    await s.pruneRetention(now);
    assert.equal(t.sqlite.prepare('SELECT count(*) AS n FROM shared_subscriptions').get()?.n, 2);
  } finally {
    t.close();
  }
});
