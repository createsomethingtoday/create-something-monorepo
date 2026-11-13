import test from 'node:test';
import assert from 'node:assert/strict';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import app from '../src/app';
import { randomToken, hash, seal } from '../src/crypto';
import { createTestDatabase } from './sqlite';
import type { RuntimeEnv } from '../src/env';

const base = 'https://a2a.createsomething.agency';
export async function sharedHttpFixture() {
  const storage = createTestDatabase();
  const pair = await generateKeyPair('ES256');
  const jwk = await exportJWK(pair.publicKey);
  jwk.kid = 'shared-http';
  const env = {
    DB: storage.db,
    BASE_URL: base,
    AUTH_RESOURCE: base + '/mcp',
    IDENTITY_ISSUER: 'https://id.createsomething.space',
    ENVIRONMENT: 'test',
    ALLOWED_EMAILS: 'pilot@example.com',
    SELF_SERVICE_ENABLED: 'true',
    SHARED_INBOXES_ENABLED: 'true',
    LOCAL_TEST_JWKS: JSON.stringify({ keys: [jwk] }),
    SESSION_KEY: randomToken(),
    AUTH_CLIENT_ID: 'test',
    BUILD_REVISION: 'shared-fixture',
    ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) },
    DELIVERIES: { send: async () => {} }
  } as unknown as RuntimeEnv;
  async function token(subject: string, connection?: string) {
    return new SignJWT({
      kind: 'oauth_access_token',
      resource: base + '/mcp',
      scope: 'a2a:read a2a:write a2a:admin',
      email: subject + '@example.com',
      email_verified: true,
      client_id: 'test',
      ...(connection ? { connection_id: connection } : {})
    })
      .setProtectedHeader({ alg: 'ES256', kid: jwk.kid })
      .setIssuer(env.IDENTITY_ISSUER)
      .setAudience(env.AUTH_RESOURCE)
      .setSubject(subject)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(pair.privateKey);
  }
  async function owner(subject: string) {
    const raw = randomToken(),
      id = await hash(raw),
      now = Date.now();
    await storage.db
      .prepare(
        'INSERT INTO auth_sessions(id_hash,owner_subject,token_ciphertext,access_expires_at,expires_at,created_at) VALUES(?,?,?,?,?,?)'
      )
      .bind(
        id,
        subject,
        await seal(
          env.SESSION_KEY,
          JSON.stringify({ access_token: await token(subject), expires_in: 3600 }),
          `session:${id}`
        ),
        now + 3600000,
        now + 3600000,
        now
      )
      .run();
    return { cookie: `__Host-a2a_session=${raw}` };
  }
  async function call(
    path: string,
    headers: Record<string, string>,
    method = 'GET',
    body?: unknown
  ) {
    return app.fetch(
      new Request(base + path, {
        method,
        headers: {
          origin: base,
          ...headers,
          ...(body !== undefined ? { 'content-type': 'application/json' } : {})
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
      }),
      env
    );
  }
  return { storage, env, token, owner, call };
}
test('shared HTTP: new verified owner creates multiple agents and inboxes; bearer cannot manage', async () => {
  const f = await sharedHttpFixture();
  try {
    const owner = await f.owner('new-owner');
    for (const name of ['Research', 'Delivery']) {
      const response = await f.call('/api/v2/agents', owner, 'POST', { name });
      assert.equal(response.status, 201, await response.clone().text());
      assert.equal(((await response.json()) as any).agent.name, name);
    }
    for (const name of ['Client project', 'Internal operations'])
      assert.equal((await f.call('/api/v2/inboxes', owner, 'POST', { name })).status, 201);
    assert.equal(((await (await f.call('/api/v2/agents', owner)).json()) as any).agents.length, 2);
    const bearer = { authorization: `Bearer ${await f.token('new-owner', 'new-connection')}` };
    assert.equal(
      (await f.call('/api/v2/agents', bearer, 'POST', { name: 'Impersonator' })).status,
      403
    );
    assert.equal((await f.call('/api/v2/inboxes', bearer, 'POST', { name: 'Bypass' })).status, 403);
    assert.equal(
      (
        await f.call('/api/v2/agents', { ...owner, origin: 'https://evil.example' }, 'POST', {
          name: 'CSRF'
        })
      ).status,
      403
    );
  } finally {
    f.storage.close();
  }
});

test('shared enrollment entry is flag gated and cannot redirect to caller supplied URLs', async () => {
  const f = await sharedHttpFixture();
  try {
    const response = await f.call('/auth/signup?returnTo=https://evil.example', {});
    assert.equal(response.status, 302);
    assert.equal(
      response.headers.get('location'),
      'https://id.createsomething.space/signup?app=a2a'
    );
    assert.equal(
      ((await (await f.call('/api/v1/config', {})).json()) as any).sharedSelfService,
      true
    );
    f.env.SELF_SERVICE_ENABLED = 'false';
    assert.equal((await f.call('/auth/signup', {})).status, 404);
    assert.equal(
      ((await (await f.call('/api/v1/config', {})).json()) as any).sharedSelfService,
      false
    );
  } finally {
    f.storage.close();
  }
});

test('shared HTTP/MCP: two owners approve agents, exchange work and revoke access without widening legacy grants', async () => {
  const f = await sharedHttpFixture();
  try {
    const alice = await f.owner('alice'),
      bob = await f.owner('bob');
    async function api(path: string, who: Record<string, string>, method = 'GET', body?: unknown) {
      const r = await f.call('/api/v2' + path, who, method, body);
      assert.ok(r.ok, `${method} ${path}: ${r.status} ${await r.clone().text()}`);
      return r.json() as Promise<any>;
    }
    async function rpc(
      who: Record<string, string>,
      name: string,
      args: Record<string, unknown> = {}
    ) {
      const r = await f.call('/mcp', who, 'POST', {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name, arguments: args }
      });
      assert.equal(r.status, 200);
      return ((await r.json()) as any).result;
    }
    const a = (await api('/agents', alice, 'POST', { name: 'Alice Research' })).agent;
    const a2 = (await api('/agents', alice, 'POST', { name: 'Alice Private' })).agent;
    const b = (await api('/agents', bob, 'POST', { name: 'Bob Delivery' })).agent;
    const box = (await api('/inboxes', alice, 'POST', { name: 'Joint work' })).inbox;
    const privateBox = (await api('/inboxes', alice, 'POST', { name: 'Alice only' })).inbox;
    await api(`/inboxes/${box.id}/members`, alice, 'POST', { agentId: a.id });
    await api(`/inboxes/${privateBox.id}/members`, alice, 'POST', { agentId: a2.id });
    const pa = { authorization: `Bearer ${await f.token('alice', 'family-a')}` },
      pa2 = { authorization: `Bearer ${await f.token('alice', 'family-a2')}` },
      pb = { authorization: `Bearer ${await f.token('bob', 'family-b')}` };
    for (const [principal, owner, agent] of [
      [pa, alice, a],
      [pa2, alice, a2],
      [pb, bob, b]
    ] as const) {
      const request = await rpc(principal, 'a2a_request_connection', { label: agent.name });
      assert.equal(request.isError, undefined);
      await api(`/connections/${request.structuredContent.connection.id}/approve`, owner, 'POST', {
        agentId: agent.id
      });
    }
    assert.equal(
      (await rpc(pa2, 'a2a_shared_read_inbox', { inbox_id: box.id })).isError,
      true,
      'Same owner does not grant a second agent access.'
    );
    const before = await api(`/inboxes/${box.id}/messages`, alice, 'POST', {
      text: 'Before invitation',
      idempotencyKey: 'before'
    });
    const iv = (
      await api(`/inboxes/${box.id}/invitations`, alice, 'POST', {
        agentId: b.id,
        capabilities: ['read', 'post', 'work']
      })
    ).invitation;
    assert.equal(
      (await f.call(`/api/v2/invitations/${iv.id}/accept`, alice, 'POST', {})).status,
      404
    );
    const preview = await api(`/invitations/${iv.id}`, bob);
    assert.ok(JSON.stringify(preview).includes('Joint work'));
    await api(`/invitations/${iv.id}/accept`, bob, 'POST', {});
    const history = await rpc(pb, 'a2a_shared_read_inbox', { inbox_id: box.id });
    assert.equal(history.isError, undefined);
    assert.ok(!history.structuredContent.items.some((m: any) => m.id === before.id));
    const forged = await rpc(pa, 'a2a_shared_send_message', {
      inbox_id: box.id,
      text: 'Forged',
      idempotency_key: 'forged',
      from_agent_id: a2.id
    });
    assert.equal(forged.isError, true);
    const work = await rpc(pa, 'a2a_shared_send_message', {
      inbox_id: box.id,
      text: 'Please report the result',
      kind: 'request',
      assignee_agent_id: b.id,
      idempotency_key: 'work'
    });
    assert.equal(work.isError, undefined);
    const m = work.structuredContent;
    assert.equal(
      (await rpc(pa, 'a2a_shared_claim_message', { inbox_id: box.id, message_id: m.id })).isError,
      true
    );
    const claimed = await rpc(pb, 'a2a_shared_claim_message', {
      inbox_id: box.id,
      message_id: m.id
    });
    assert.equal(claimed.isError, undefined);
    const claim = claimed.structuredContent.message;
    const finished = await rpc(pb, 'a2a_shared_finish_message', {
      inbox_id: box.id,
      message_id: m.id,
      claim_token: claim.claimToken,
      assignment_version: claim.assignmentVersion,
      state: 'completed'
    });
    assert.equal(finished.isError, undefined);
    assert.equal(finished.structuredContent.message.state, 'completed');
    const doc = (
      await api(`/inboxes/${box.id}/context`, alice, 'POST', {
        title: 'Shared brief',
        text: 'Only shared context'
      })
    ).context;
    assert.equal(
      (await rpc(pb, 'a2a_shared_read_context', { inbox_id: box.id, resource_id: doc.id }))
        .structuredContent.text,
      'Only shared context'
    );
    await api(`/inboxes/${box.id}/members/${b.id}`, alice, 'DELETE');
    assert.equal(
      (await rpc(pb, 'a2a_shared_read_context', { inbox_id: box.id, resource_id: doc.id })).isError,
      true
    );
    assert.equal(
      (await rpc(pb, 'a2a_shared_read_message', { inbox_id: box.id, message_id: m.id })).isError,
      true
    );
    assert.equal(f.storage.sqlite.prepare('SELECT COUNT(*) AS n FROM agents').get()?.n, 0);
    assert.equal(f.storage.sqlite.prepare('SELECT COUNT(*) AS n FROM grants').get()?.n, 0);
    f.env.SHARED_INBOXES_ENABLED = 'false';
    assert.equal((await f.call('/api/v2/inboxes', alice)).status, 503);
    const list = await f.call('/mcp', pa, 'POST', { jsonrpc: '2.0', id: 2, method: 'tools/list' });
    assert.ok(!(await list.text()).includes('a2a_shared_'));
  } finally {
    f.storage.close();
  }
});
