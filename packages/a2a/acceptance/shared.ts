/** Called only by the disposable lab; actual handlers + native workerd D1. */
import a2a from '../src/app';
import { createSignedToken } from '../../identity-worker/src/services/tokens';
import { randomToken, hash, seal } from '../src/crypto';
import { context } from './transport';
export async function sharedAcceptance(original: any, identityEnv: any) {
  const env = {
    ...original,
    SELF_SERVICE_ENABLED: 'true',
    SHARED_INBOXES_ENABLED: 'true',
    DELIVERIES: { send: async () => {} }
  };
  const db = identityEnv.DB as D1Database,
    now = Math.floor(Date.now() / 1000),
    base = env.BASE_URL;
  const check = (value: unknown, message: string) => {
    if (!value) throw new Error(message);
  };
  const owners = [];
  for (const label of ['a', 'b']) {
    const subject = 'shared-' + label + '-' + crypto.randomUUID(),
      client = 'shared-' + crypto.randomUUID(),
      family = crypto.randomUUID();
    await db.batch([
      db
        .prepare(
          'INSERT INTO users(id,email,password_hash,source,email_verified) VALUES(?,?,?,?,1)'
        )
        .bind(subject, subject + '@example.invalid', 'not-a-password', 'io'),
      db
        .prepare(
          "INSERT INTO oauth_clients(client_id,client_name,redirect_uris_json,token_endpoint_auth_method,grant_types_json,response_types_json,scope) VALUES(?,?,'[]','none','[]','[]',?)"
        )
        .bind(client, 'Shared lab', 'offline_access a2a:read a2a:write a2a:admin'),
      db
        .prepare('INSERT INTO oauth_refresh_families(family_id,client_id,user_id) VALUES(?,?,?)')
        .bind(family, client, subject)
    ]);
    const token = await createSignedToken(db, {
      sub: subject,
      iss: base,
      aud: [env.AUTH_RESOURCE],
      iat: now,
      exp: now + 3600,
      kind: 'oauth_access_token',
      client_id: client,
      connection_id: family,
      resource: env.AUTH_RESOURCE,
      scope: 'a2a:read a2a:write a2a:admin'
    });
    const raw = randomToken(),
      id = await hash(raw);
    await env.DB.prepare(
      'INSERT INTO auth_sessions(id_hash,owner_subject,token_ciphertext,access_expires_at,expires_at,created_at) VALUES(?,?,?,?,?,?)'
    )
      .bind(
        id,
        subject,
        await seal(
          env.SESSION_KEY,
          JSON.stringify({ access_token: token, expires_in: 3600 }),
          'session:' + id
        ),
        Date.now() + 3600000,
        Date.now() + 3600000,
        Date.now()
      )
      .run();
    owners.push({
      cookie: { cookie: '__Host-a2a_session=' + raw },
      bearer: { authorization: 'Bearer ' + token },
      subject,
      family
    });
  }
  async function api(
    path: string,
    headers: Record<string, string>,
    method = 'GET',
    body?: unknown
  ) {
    const response = await context.run({ identityEnv }, () =>
      a2a.fetch(
        new Request(base + path, {
          method,
          headers: { ...headers, origin: base, 'content-type': 'application/json' },
          ...(body === undefined ? {} : { body: JSON.stringify(body) })
        }),
        env
      )
    );
    return { response, value: (await response.json()) as any };
  }
  async function good(
    path: string,
    headers: Record<string, string>,
    method = 'GET',
    body?: unknown
  ) {
    const { response, value } = await api(path, headers, method, body);
    check(response.ok, 'shared_http_' + response.status);
    return value;
  }
  async function rpc(
    headers: Record<string, string>,
    name: string,
    args: Record<string, unknown> = {}
  ) {
    const value = await good('/mcp', headers, 'POST', {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args }
    });
    check(!value.result.isError, 'shared_tool_failed');
    return value.result.structuredContent;
  }
  const [alice, bob] = owners;
  const a = (await good('/api/v2/agents', alice.cookie, 'POST', { name: 'Lab Research' })).agent;
  const a2 = (await good('/api/v2/agents', alice.cookie, 'POST', { name: 'Lab Other' })).agent;
  const b = (await good('/api/v2/agents', bob.cookie, 'POST', { name: 'Lab Delivery' })).agent;
  const box = (await good('/api/v2/inboxes', alice.cookie, 'POST', { name: 'Shared native D1' }))
    .inbox;
  await good(`/api/v2/inboxes/${box.id}/members`, alice.cookie, 'POST', { agentId: a.id });
  for (const [owner, agent] of [
    [alice, a],
    [bob, b]
  ] as const) {
    const c = await rpc(owner.bearer, 'a2a_request_connection', { label: 'Lab runtime' });
    await good(`/api/v2/connections/${c.connection.id}/approve`, owner.cookie, 'POST', {
      agentId: agent.id
    });
  }
  const iv = (
    await good(`/api/v2/inboxes/${box.id}/invitations`, alice.cookie, 'POST', { agentId: b.id })
  ).invitation;
  const preview = await good(`/api/v2/invitations/${iv.id}`, bob.cookie);
  check(
    preview.roster.some((member: any) => member.agent_id === a.id),
    'shared_pending_preview'
  );
  check(
    (await api(`/api/v2/invitations/${iv.id}/accept`, alice.cookie, 'POST', {})).response.status ===
      404,
    'shared_wrong_owner_denied'
  );
  const accepts = await Promise.all([
    api(`/api/v2/invitations/${iv.id}/accept`, bob.cookie, 'POST', {}),
    api(`/api/v2/invitations/${iv.id}/accept`, bob.cookie, 'POST', {})
  ]);
  check(accepts.filter((x) => x.response.ok).length === 1, 'shared_accept_once');
  const m = await rpc(alice.bearer, 'a2a_shared_send_message', {
    inbox_id: box.id,
    text: 'Synthetic task',
    kind: 'request',
    assignee_agent_id: b.id,
    idempotency_key: 'native-work'
  });
  const duplicate = await rpc(alice.bearer, 'a2a_shared_send_message', {
    inbox_id: box.id,
    text: 'Synthetic task',
    kind: 'request',
    assignee_agent_id: b.id,
    idempotency_key: 'native-work'
  });
  check(m.id === duplicate.id, 'shared_idempotency');
  const claims = await Promise.all([
    api('/mcp', bob.bearer, 'POST', {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'a2a_shared_claim_message',
        arguments: { inbox_id: box.id, message_id: m.id }
      }
    }),
    api('/mcp', bob.bearer, 'POST', {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'a2a_shared_claim_message',
        arguments: { inbox_id: box.id, message_id: m.id }
      }
    })
  ]);
  const winners = claims.filter((x) => !x.value.result.isError);
  check(winners.length === 1, 'shared_claim_once');
  const claim = winners[0].value.result.structuredContent.message;
  const done = await rpc(bob.bearer, 'a2a_shared_finish_message', {
    inbox_id: box.id,
    message_id: m.id,
    claim_token: claim.claimToken,
    assignment_version: claim.assignmentVersion,
    state: 'completed'
  });
  check(done.message.state === 'completed', 'shared_finish');
  await good(`/api/v2/inboxes/${box.id}/members`, alice.cookie, 'POST', { agentId: a2.id });
  const retries = [];
  for (const [label, headers] of [
    ['owner', alice.cookie],
    ['agent', alice.bearer]
  ] as const) {
    const input = {
      text: 'Uncertain send',
      kind: 'request',
      assigneeAgentId: b.id,
      idempotencyKey: `reassigned-${label}`
    };
    const sent = await good(`/api/v2/inboxes/${box.id}/messages`, headers, 'POST', input);
    await good(`/api/v2/inboxes/${box.id}/messages/${sent.id}/reassign`, alice.cookie, 'POST', {
      agentId: a2.id,
      assignmentVersion: sent.assignment_version
    });
    retries.push({ headers, input, id: sent.id });
  }
  await good(`/api/v2/inboxes/${box.id}/members/${b.id}`, alice.cookie, 'DELETE');
  const later = (await good('/api/v2/agents', alice.cookie, 'POST', { name: 'Later member' }))
    .agent;
  await good(`/api/v2/inboxes/${box.id}/members`, alice.cookie, 'POST', { agentId: later.id });
  const stalePreview = await api(`/api/v2/invitations/${iv.id}`, bob.cookie);
  check(stalePreview.response.status === 404, 'shared_old_preview_denied');
  check(!JSON.stringify(stalePreview.value).includes(later.id), 'shared_new_roster_private');
  const count = await env.DB.prepare('SELECT count(*) AS n FROM shared_messages WHERE inbox_id=?')
    .bind(box.id)
    .first('n');
  for (let n = 0; n < 3; n++)
    check(
      (await api(`/api/v2/inboxes/${box.id}/members/${b.id}/leave`, bob.cookie, 'POST', {}))
        .response.status === 404,
      'shared_repeated_leave_denied'
    );
  check(
    (await env.DB.prepare('SELECT count(*) AS n FROM shared_messages WHERE inbox_id=?')
      .bind(box.id)
      .first('n')) === count,
    'shared_denied_leave_did_not_write'
  );
  for (const { headers, input, id } of retries) {
    const retried = await good(`/api/v2/inboxes/${box.id}/messages`, headers, 'POST', input);
    check(
      retried.id === id && retried.assignee_agent_id === a2.id && retried.assignment_version === 2,
      'shared_original_send_reconciled'
    );
    check(
      (
        await api(`/api/v2/inboxes/${box.id}/messages`, headers, 'POST', {
          ...input,
          assigneeAgentId: a2.id
        })
      ).response.status === 409,
      'shared_changed_send_conflicts'
    );
  }
  const denied = await api('/mcp', bob.bearer, 'POST', {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'a2a_shared_read_message', arguments: { inbox_id: box.id, message_id: m.id } }
  });
  check(denied.value.result.isError, 'shared_removal_denied');
  await db
    .prepare("UPDATE oauth_refresh_families SET revoked_at=datetime('now') WHERE family_id=?")
    .bind(alice.family)
    .run();
  check(
    (await api('/api/v2/inboxes', alice.bearer)).response.status === 401,
    'shared_live_family_revoked'
  );
  check(a2.id !== a.id, 'shared_multiple_agents');
  return [
    'shared_multiowner_native_d1',
    'shared_invitation_atomicity',
    'shared_idempotent_send',
    'shared_claim_atomicity',
    'shared_revocation',
    'shared_identity_family_revocation',
    'shared_repeated_leave_no_writes',
    'shared_reassigned_send_reconciliation',
    'shared_invitation_preview_revocation'
  ];
}
