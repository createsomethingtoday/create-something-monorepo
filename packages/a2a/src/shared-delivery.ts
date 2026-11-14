import type { Principal } from './domain-types';
import type { RuntimeEnv } from './env';
import { SharedInboxService } from './shared-domain';
import { verifyIdentityToken, limitAdmission } from './auth';
import { callbackDetails, sameChallenge, signedPost } from './delivery';
import { hash, randomToken, seal, unseal } from './crypto';
import { HttpError } from './http';
import { DomainError } from './domain';
const NAME = 'shared_inbox.work.created',
  DAY = 86400000,
  RETENTION = 30 * DAY;
export const sharedEventDefinition = {
  name: NAME,
  description:
    'Work explicitly assigned to your approved shared-inbox agent. Content and external authority are not included.',
  delivery: ['webhook'],
  inputSchema: {
    type: 'object',
    properties: { inbox_id: { type: 'string' } },
    required: ['inbox_id'],
    additionalProperties: false
  },
  payloadSchema: {
    type: 'object',
    properties: {
      inbox_id: { type: 'string' },
      message_id: { type: 'string' },
      agent_id: { type: 'string' },
      assignment_version: { type: 'integer' }
    },
    required: ['inbox_id', 'message_id', 'agent_id', 'assignment_version'],
    additionalProperties: false
  }
};
interface Sub {
  id: string;
  owner_subject: string;
  connection_id: string;
  agent_id: string;
  inbox_id: string;
  generation: number;
  callback_url: string;
  secret_ciphertext: string;
  token_ciphertext: string;
  previous_secret_ciphertext: string | null;
  previous_secret_until: number | null;
  status: string;
  cursor: number;
  replay_floor_at: number;
  expires_at: number;
  revision: string;
}
interface Event {
  event_cursor: number;
  id: string;
  message_id: string;
  inbox_id: string;
  cursor: number;
  created_at: number;
  expires_at: number;
  assignee_agent_id: string | null;
  assignment_version: number;
  state: string;
  kind: string;
}
interface Delivery {
  id: string;
  subscription_id: string;
  event_id: string;
  assignment_version: number;
  attempts: number;
  lease_token: string;
}
function enabled(env: RuntimeEnv) {
  if ((env as RuntimeEnv & { SHARED_INBOXES_ENABLED?: string }).SHARED_INBOXES_ENABLED !== 'true')
    throw new HttpError('shared_unavailable', 404, 'Shared inboxes are unavailable.');
}
function inbox(params: Record<string, unknown>) {
  if (params.name !== NAME) throw new HttpError('unknown_event', 400, 'Event unavailable.');
  const args = params.arguments as Record<string, unknown>;
  if (
    !args ||
    Array.isArray(args) ||
    Object.keys(args).length !== 1 ||
    typeof args.inbox_id !== 'string' ||
    !args.inbox_id
  )
    throw new HttpError('invalid_arguments', 400, 'Specify only inbox_id.');
  return args.inbox_id;
}
async function job(
  env: RuntimeEnv,
  value: { sharedEventId: string } | { sharedDeliveryId: string }
) {
  await (env.DELIVERIES as unknown as { send(v: typeof value): Promise<void> }).send(value);
}
async function terminate(env: RuntimeEnv, id: string, status = 'revoked', revision?: string) {
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE shared_subscriptions SET status=?,secret_ciphertext='',token_ciphertext='',previous_secret_ciphertext=NULL,previous_secret_until=NULL,revision=? WHERE id=? AND (? IS NULL OR revision=?)"
    ).bind(status, randomToken(), id, revision ?? null, revision ?? null),
    env.DB.prepare(
      "UPDATE shared_deliveries SET state='suspended',lease_until=NULL,lease_token=NULL WHERE subscription_id=? AND state IN('pending','retrying') AND EXISTS(SELECT 1 FROM shared_subscriptions s WHERE s.id=subscription_id AND s.status<>'active')"
    ).bind(id)
  ]);
}
async function event(env: RuntimeEnv, id: string) {
  return env.DB.prepare(
    'SELECT e.id,e.message_id,e.inbox_id,m.cursor,ep.cursor AS event_cursor,e.created_at,m.expires_at,m.assignee_agent_id,m.assignment_version,m.state,m.kind FROM shared_outbox e JOIN shared_event_positions ep ON ep.event_id=e.id JOIN shared_messages m ON m.id=e.message_id AND e.assignment_version=m.assignment_version WHERE e.id=?'
  )
    .bind(id)
    .first<Event>();
}
async function eligible(env: RuntimeEnv, s: Sub, e?: Event) {
  if (s.status !== 'active' || s.expires_at <= Date.now()) return false;
  if (
    e &&
    !(await new SharedInboxService(env.DB).deliveryEligible(
      s.connection_id,
      s.inbox_id,
      s.generation,
      e.cursor
    ))
  )
    return false;
  const row = await env.DB.prepare(
    `SELECT 1 AS ok FROM shared_connections co JOIN shared_agents ag ON ag.id=co.agent_id JOIN shared_memberships mb ON mb.agent_id=ag.id JOIN shared_inboxes ib ON ib.id=mb.inbox_id WHERE co.id=? AND co.owner_subject=? AND co.agent_id=? AND co.state='approved' AND ag.paused=0 AND ag.deleted_at IS NULL AND ag.owner_subject=co.owner_subject AND mb.inbox_id=? AND mb.generation=? AND mb.state='active' AND instr(','||mb.capabilities||',',',read,')>0 AND instr(','||mb.capabilities||',',',work,')>0 AND ib.state='active' AND (? IS NULL OR mb.admission_cursor<?)`
  )
    .bind(
      s.connection_id,
      s.owner_subject,
      s.agent_id,
      s.inbox_id,
      s.generation,
      e?.cursor ?? null,
      e?.cursor ?? null
    )
    .first();
  return Boolean(
    row &&
    (!e ||
      (e.inbox_id === s.inbox_id &&
        e.kind === 'request' &&
        e.assignee_agent_id === s.agent_id &&
        ['pending', 'claimed'].includes(e.state) &&
        e.event_cursor > s.cursor &&
        e.created_at >= s.replay_floor_at &&
        e.expires_at > Date.now()))
  );
}
async function credential(env: RuntimeEnv, s: Sub) {
  const p = await verifyIdentityToken(
    env,
    await unseal(env.SESSION_KEY, s.token_ciphertext, `shared-token:${s.id}`)
  );
  const a = await new SharedInboxService(env.DB).resolveAgent({ ...p, authentication: 'bearer' });
  if (p.subject !== s.owner_subject || a.connection_id !== s.connection_id || a.id !== s.agent_id)
    throw new HttpError('invalid_token', 401, 'Connection changed.');
  return p;
}
export async function subscribeShared(
  env: RuntimeEnv,
  p: Principal,
  params: Record<string, unknown>,
  rawBearerToken: string
) {
  enabled(env);
  const inboxId = inbox(params);
  if (p.authentication !== 'bearer' || !rawBearerToken)
    throw new HttpError('connection_required', 403, 'Agent bearer authorization required.');
  const verified = await verifyIdentityToken(env, rawBearerToken);
  if (
    verified.subject !== p.subject ||
    verified.connectionId !== p.connectionId ||
    !verified.connectionId
  )
    throw new HttpError('invalid_token', 401, 'Connection binding required.');
  const principal = { ...verified, authentication: 'bearer' as const };
  const service = new SharedInboxService(env.DB);
  const mb = await service.authorize(principal, inboxId, 'work');
  const agent = await service.resolveAgent(principal);
  const { url, secret } = callbackDetails(params.delivery, true);
  let ttl = DAY;
  if (params.ttlMs !== undefined) {
    if (
      typeof params.ttlMs !== 'number' ||
      !Number.isSafeInteger(params.ttlMs) ||
      params.ttlMs <= 0
    )
      throw new HttpError('invalid_ttl', 400, 'Positive ttlMs required.');
    ttl = Math.min(ttl, params.ttlMs);
  }
  if (
    params.maxAgeMs !== undefined &&
    (typeof params.maxAgeMs !== 'number' ||
      !Number.isSafeInteger(params.maxAgeMs) ||
      params.maxAgeMs < 0)
  )
    throw new HttpError('invalid_max_age', 400, 'Invalid replay age.');
  const explicit = params.cursor !== undefined && params.cursor !== null;
  if (
    explicit &&
    (typeof params.cursor !== 'string' ||
      !/^\d{1,16}$/.test(params.cursor) ||
      !Number.isSafeInteger(Number(params.cursor)))
  )
    throw new HttpError('invalid_cursor', 400, 'Invalid replay cursor.');
  await limitAdmission(env, `shared-subscribe:${p.subject}`, 20, 600000);
  const id =
    'ss_' +
    (await hash(JSON.stringify([p.subject, mb.connection_id, inboxId, mb.generation, url])));
  const previous = await env.DB.prepare('SELECT * FROM shared_subscriptions WHERE id=?')
    .bind(id)
    .first<Sub>();
  if (previous?.status === 'revoked')
    throw new HttpError(
      'subscription_revoked',
      409,
      'Use a fresh callback connection after revocation.'
    );
  const now = Date.now(),
    live = previous?.status === 'active' && previous.expires_at > now;
  const pruned = await env.DB.prepare(
    'SELECT pruned_through_cursor,pruned_through_event_cursor FROM shared_retention_watermarks WHERE inbox_id=?'
  )
    .bind(inboxId)
    .first<{ pruned_through_cursor: number; pruned_through_event_cursor: number }>();
  const latest = Math.max(
    pruned?.pruned_through_event_cursor ?? 0,
    (await env.DB.prepare(
      'SELECT COALESCE(MAX(ep.cursor),0) AS n FROM shared_event_positions ep JOIN shared_outbox e ON e.id=ep.event_id WHERE e.inbox_id=?'
    )
      .bind(inboxId)
      .first<number>('n')) ?? 0
  );
  let cursor = live ? previous!.cursor : explicit ? Number(params.cursor) : latest;
  if (cursor > latest) throw new HttpError('invalid_cursor', 400, 'Cursor is beyond this inbox.');
  // Replay positions and transcript admission cursors are separate domains.
  const floor = live
    ? previous!.replay_floor_at
    : Math.max(now - RETENTION, typeof params.maxAgeMs === 'number' ? now - params.maxAgeMs : 0);
  const expiresAt = Math.min(now + ttl, verified.accessExpiresAt ?? 0);
  if (expiresAt <= now)
    throw new HttpError('invalid_token', 401, 'Renew Identity before subscribing.');
  const challenge = randomToken();
  let result;
  try {
    result = await signedPost(
      env,
      url,
      secret,
      id,
      'verify_' + crypto.randomUUID(),
      JSON.stringify({ type: 'verification', challenge })
    );
  } catch {
    throw new HttpError('callback_verification_failed', 502, 'Callback verification failed.');
  }
  let echoed: unknown;
  try {
    echoed = JSON.parse(result.body);
  } catch {}
  if (
    result.status < 200 ||
    result.status >= 300 ||
    !sameChallenge((echoed as { challenge?: unknown })?.challenge, challenge)
  )
    throw new HttpError('callback_verification_failed', 502, 'Callback verification failed.');
  const candidate: Sub = {
    id,
    owner_subject: p.subject,
    connection_id: mb.connection_id,
    agent_id: agent.id,
    inbox_id: inboxId,
    generation: mb.generation,
    callback_url: url,
    secret_ciphertext: await seal(env.SESSION_KEY, secret, `shared-secret:${id}`),
    token_ciphertext: await seal(env.SESSION_KEY, rawBearerToken, `shared-token:${id}`),
    previous_secret_ciphertext: live ? previous!.secret_ciphertext : null,
    previous_secret_until: live ? now + 30000 : null,
    status: 'active',
    cursor,
    replay_floor_at: floor,
    expires_at: expiresAt,
    revision: randomToken()
  };
  if (!(await eligible(env, candidate)))
    throw new HttpError('access_changed', 403, 'Shared inbox access changed.');
  const count = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM shared_subscriptions WHERE connection_id=? AND inbox_id=? AND id<>? AND status='active' AND expires_at>?"
  )
    .bind(mb.connection_id, inboxId, id, now)
    .first<number>('n');
  if ((count ?? 0) >= 4)
    throw new HttpError(
      'subscription_limit',
      429,
      'Four active callbacks per inbox are supported.'
    );
  const saved = await env.DB.prepare(
    `INSERT INTO shared_subscriptions(id,owner_subject,connection_id,agent_id,inbox_id,generation,callback_url,secret_ciphertext,token_ciphertext,previous_secret_ciphertext,previous_secret_until,status,cursor,replay_floor_at,expires_at,created_at,revision) SELECT ?,?,?,?,?,?,?,?,?,?,?,'active',?,?,?,?,? WHERE (SELECT COUNT(*) FROM shared_subscriptions WHERE connection_id=? AND inbox_id=? AND id<>? AND status='active' AND expires_at>?)<4 AND EXISTS(SELECT 1 FROM shared_connections co JOIN shared_agents ag ON ag.id=co.agent_id JOIN shared_memberships mb ON mb.agent_id=ag.id JOIN shared_inboxes ib ON ib.id=mb.inbox_id WHERE co.id=? AND co.owner_subject=? AND co.state='approved' AND ag.paused=0 AND ag.deleted_at IS NULL AND mb.inbox_id=? AND mb.generation=? AND mb.state='active' AND instr(','||mb.capabilities||',',',read,')>0 AND instr(','||mb.capabilities||',',',work,')>0 AND ib.state='active') ON CONFLICT(id) DO UPDATE SET secret_ciphertext=excluded.secret_ciphertext,token_ciphertext=excluded.token_ciphertext,previous_secret_ciphertext=excluded.previous_secret_ciphertext,previous_secret_until=excluded.previous_secret_until,status='active',cursor=excluded.cursor,replay_floor_at=excluded.replay_floor_at,expires_at=excluded.expires_at,revision=excluded.revision WHERE shared_subscriptions.revision=? AND shared_subscriptions.status<>'revoked' RETURNING id`
  )
    .bind(
      id,
      p.subject,
      mb.connection_id,
      agent.id,
      inboxId,
      mb.generation,
      url,
      candidate.secret_ciphertext,
      candidate.token_ciphertext,
      candidate.previous_secret_ciphertext,
      candidate.previous_secret_until,
      cursor,
      floor,
      expiresAt,
      now,
      candidate.revision,
      mb.connection_id,
      inboxId,
      id,
      now,
      mb.connection_id,
      p.subject,
      inboxId,
      mb.generation,
      previous?.revision ?? ''
    )
    .first();
  if (!saved) throw new HttpError('subscription_changed', 409, 'Subscription changed. Retry.');
  if (!live && explicit)
    await env.DB.prepare(
      "UPDATE shared_deliveries SET state='pending',attempts=0,next_attempt_at=?,lease_until=NULL,lease_token=NULL,accepted_at=NULL WHERE subscription_id=? AND event_id IN(SELECT e.id FROM shared_outbox e JOIN shared_event_positions ep ON ep.event_id=e.id JOIN shared_messages m ON m.id=e.message_id AND e.assignment_version=m.assignment_version WHERE ep.cursor>? AND e.created_at>=? AND m.expires_at>?)"
    )
      .bind(Date.now(), id, cursor, floor, Date.now())
      .run();
  const gaps = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM shared_outbox e JOIN shared_event_positions ep ON ep.event_id=e.id JOIN shared_messages m ON m.id=e.message_id AND e.assignment_version=m.assignment_version WHERE e.inbox_id=? AND ep.cursor>? AND m.assignee_agent_id=? AND m.kind='request' AND m.cursor>(SELECT admission_cursor FROM shared_memberships WHERE inbox_id=m.inbox_id AND agent_id=m.assignee_agent_id AND state='active') AND (m.expires_at<=? OR e.created_at<?)"
  )
    .bind(inboxId, cursor, agent.id, now, floor)
    .first<number>('n');
  await materialize(env, undefined, id);
  await enqueue(env, id);
  return {
    id,
    refreshBefore: new Date(expiresAt).toISOString(),
    cursor: String(cursor),
    truncated:
      (gaps ?? 0) > 0 ||
      Boolean(
        pruned &&
        cursor < pruned.pruned_through_event_cursor &&
        mb.admission_cursor <= pruned.pruned_through_cursor
      )
  };
}
export async function unsubscribeShared(
  env: RuntimeEnv,
  p: Principal,
  params: Record<string, unknown>
) {
  enabled(env);
  const inboxId = inbox(params);
  const mb = await new SharedInboxService(env.DB).authorize(p, inboxId, 'read');
  const { url } = callbackDetails(params.delivery, false);
  const id =
    'ss_' +
    (await hash(JSON.stringify([p.subject, mb.connection_id, inboxId, mb.generation, url])));
  await terminate(env, id);
  return {};
}
export async function cancelSharedSubscription(env: RuntimeEnv, p: Principal, id: string) {
  enabled(env);
  if (p.authentication !== 'owner_session' || !p.scopes.includes('a2a:admin'))
    throw new HttpError('owner_approval_required', 403, 'Owner approval required.');
  const row = await env.DB.prepare(
    'SELECT id FROM shared_subscriptions WHERE id=? AND owner_subject=?'
  )
    .bind(id, p.subject)
    .first();
  if (!row) throw new HttpError('not_found', 404, 'Subscription unavailable.');
  await terminate(env, id);
}
export async function publishSharedOutbox(env: RuntimeEnv) {
  enabled(env);
  const rows = await env.DB.prepare(
    'SELECT id FROM shared_outbox WHERE published_at IS NULL ORDER BY created_at LIMIT 100'
  ).all<{ id: string }>();
  for (const r of rows.results) {
    await job(env, { sharedEventId: r.id });
    await env.DB.prepare(
      'UPDATE shared_outbox SET published_at=? WHERE id=? AND published_at IS NULL'
    )
      .bind(Date.now(), r.id)
      .run();
  }
}
async function materialize(env: RuntimeEnv, eventId?: string, subscriptionId?: string) {
  const now = Date.now();
  const rows = await env.DB.prepare(
    `SELECT s.*,e.id AS event_id FROM shared_subscriptions s JOIN shared_outbox e ON e.inbox_id=s.inbox_id JOIN shared_event_positions ep ON ep.event_id=e.id JOIN shared_messages m ON m.id=e.message_id AND e.assignment_version=m.assignment_version WHERE s.status='active' AND s.expires_at>? AND ep.cursor>s.cursor AND e.created_at>=s.replay_floor_at AND m.expires_at>? AND m.kind='request' AND m.cursor>(SELECT admission_cursor FROM shared_memberships WHERE inbox_id=s.inbox_id AND agent_id=s.agent_id AND generation=s.generation AND state='active') AND m.assignee_agent_id=s.agent_id AND m.state IN('pending','claimed') AND (? IS NULL OR e.id=?) AND (? IS NULL OR s.id=?) AND NOT EXISTS(SELECT 1 FROM shared_deliveries d WHERE d.event_id=e.id AND d.subscription_id=s.id AND d.assignment_version=e.assignment_version) ORDER BY ep.cursor LIMIT 100`
  )
    .bind(
      now,
      now,
      eventId ?? null,
      eventId ?? null,
      subscriptionId ?? null,
      subscriptionId ?? null
    )
    .all<Sub & { event_id: string }>();
  for (const s of rows.results) {
    const e = await event(env, s.event_id);
    if (!e || !(await eligible(env, s, e))) continue;
    await env.DB.prepare(
      `INSERT OR IGNORE INTO shared_deliveries(id,event_id,subscription_id,assignment_version,state,next_attempt_at) VALUES(?,?,?,?,'pending',?)`
    )
      .bind(`${e.id}:${s.id}:${e.assignment_version}`, e.id, s.id, e.assignment_version, now)
      .run();
  }
}
async function enqueue(env: RuntimeEnv, subscriptionId?: string, eventId?: string) {
  const now = Date.now();
  const rows = await env.DB.prepare(
    `SELECT d.id FROM shared_deliveries d JOIN shared_subscriptions s ON s.id=d.subscription_id WHERE d.state IN('pending','retrying') AND d.next_attempt_at<=? AND (d.lease_until IS NULL OR d.lease_until<?) AND s.status='active' AND s.expires_at>? AND (? IS NULL OR s.id=?) AND (? IS NULL OR d.event_id=?) ORDER BY d.next_attempt_at LIMIT 100`
  )
    .bind(
      now,
      now,
      now,
      subscriptionId ?? null,
      subscriptionId ?? null,
      eventId ?? null,
      eventId ?? null
    )
    .all<{ id: string }>();
  for (const r of rows.results) await job(env, { sharedDeliveryId: r.id });
}
export async function fanoutSharedEvent(env: RuntimeEnv, id: string) {
  enabled(env);
  await materialize(env, id);
  await enqueue(env, undefined, id);
}
async function outcome(env: RuntimeEnv, d: Delivery, state: string, error: string | null) {
  await env.DB.prepare(
    'UPDATE shared_deliveries SET state=?,last_error=?,accepted_at=?,lease_until=NULL,lease_token=NULL WHERE id=? AND lease_token=?'
  )
    .bind(state, error, state === 'accepted' ? Date.now() : null, d.id, d.lease_token)
    .run();
}
async function retry(env: RuntimeEnv, d: Delivery, error: string) {
  if (d.attempts >= 6) {
    await outcome(env, d, 'failed', 'attempts_exhausted');
    return;
  }
  await env.DB.prepare(
    "UPDATE shared_deliveries SET state='retrying',last_error=?,next_attempt_at=?,lease_until=NULL,lease_token=NULL WHERE id=? AND lease_token=?"
  )
    .bind(error, Date.now() + Math.min(3600000, 10000 * 2 ** (d.attempts - 1)), d.id, d.lease_token)
    .run();
}
export async function deliverShared(env: RuntimeEnv, id: string) {
  enabled(env);
  const now = Date.now(),
    fence = randomToken();
  const d = await env.DB.prepare(
    "UPDATE shared_deliveries SET lease_until=?,lease_token=?,attempts=attempts+1 WHERE id=? AND state IN('pending','retrying') AND next_attempt_at<=? AND (lease_until IS NULL OR lease_until<?) RETURNING *"
  )
    .bind(now + 30000, fence, id, now, now)
    .first<Delivery>();
  if (!d) return;
  const s = await env.DB.prepare('SELECT * FROM shared_subscriptions WHERE id=?')
    .bind(d.subscription_id)
    .first<Sub>();
  const e = await event(env, d.event_id);
  try {
    if (!s || !e || !(await eligible(env, s, e)) || e.assignment_version !== d.assignment_version) {
      if (s && !(await eligible(env, s)))
        await terminate(env, s.id, s.expires_at <= now ? 'expired' : 'revoked', s.revision);
      await outcome(env, d, 'suspended', 'access_or_assignment_changed');
      return;
    }
    // A real signed access JWT plus live Identity userinfo is rechecked for every egress.
    await credential(env, s);
    const secret = await unseal(env.SESSION_KEY, s.secret_ciphertext, `shared-secret:${s.id}`);
    const old =
      s.previous_secret_ciphertext && s.previous_secret_until! > Date.now()
        ? await unseal(env.SESSION_KEY, s.previous_secret_ciphertext, `shared-secret:${s.id}`)
        : undefined;
    const current = await env.DB.prepare('SELECT * FROM shared_subscriptions WHERE id=?')
      .bind(s.id)
      .first<Sub>();
    const latest = await event(env, e.id);
    if (
      !current ||
      !latest ||
      latest.assignment_version !== d.assignment_version ||
      !(await eligible(env, current, latest))
    ) {
      await outcome(env, d, 'suspended', 'access_or_assignment_changed');
      return;
    }
    if (current.revision !== s.revision) {
      // Renewal replaces credentials, not the work assignment. Reload and verify
      // the new snapshot on the next bounded attempt before any egress.
      await retry(env, d, 'subscription_renewed');
      return;
    }
    const lease = await env.DB.prepare(
      'SELECT id FROM shared_deliveries WHERE id=? AND lease_token=? AND lease_until>?'
    )
      .bind(d.id, fence, Date.now())
      .first();
    if (!lease) return;
    const body = JSON.stringify({
      eventId: e.id,
      name: NAME,
      timestamp: new Date(e.created_at).toISOString(),
      data: {
        inbox_id: e.inbox_id,
        message_id: e.message_id,
        agent_id: s.agent_id,
        assignment_version: e.assignment_version
      },
      cursor: String(s.cursor)
    });
    const response = await signedPost(env, s.callback_url, secret, s.id, e.id, body, old);
    if (response.status >= 200 && response.status < 300) {
      await outcome(env, d, 'accepted', null);
      await advance(env, current);
      return;
    }
    if (response.status === 410) {
      await terminate(env, s.id, 'revoked', s.revision);
      return;
    }
    if (response.status >= 300 && response.status < 500 && ![408, 429].includes(response.status)) {
      await outcome(env, d, 'failed', 'callback_rejected');
      return;
    }
    await retry(env, d, 'callback_unavailable');
  } catch (error) {
    if (
      (error instanceof HttpError || error instanceof DomainError) &&
      error.status >= 400 &&
      error.status < 500
    ) {
      // A stale credential may fail while a live renewal is replacing it.
      // Only defer if current membership and the exact assignment still hold.
      if (s) {
        const current = await env.DB.prepare('SELECT * FROM shared_subscriptions WHERE id=?')
          .bind(s.id)
          .first<Sub>();
        const latest = await event(env, d.event_id);
        if (
          current &&
          current.revision !== s.revision &&
          latest &&
          latest.assignment_version === d.assignment_version &&
          (await eligible(env, current, latest))
        ) {
          await retry(env, d, 'subscription_renewed');
          return;
        }
      }
      if (s) await terminate(env, s.id, 'revoked', s.revision);
      await outcome(env, d, 'suspended', 'identity_revoked');
    } else await retry(env, d, 'verification_or_transport_unavailable');
  }
}
async function advance(env: RuntimeEnv, s: Sub) {
  // Capture the upper bound before checking blockers. A request committed after
  // this read must remain ahead of the watermark, even if pending does not see it.
  const latest =
    (await env.DB.prepare(
      'SELECT COALESCE(MAX(ep.cursor),0) AS n FROM shared_event_positions ep JOIN shared_outbox e ON e.id=ep.event_id WHERE e.inbox_id=?'
    )
      .bind(s.inbox_id)
      .first<number>('n')) ?? s.cursor;
  // Missing, failed, and unaccepted deliveries block the replay watermark.
  const pending = await env.DB.prepare(
    `SELECT MIN(ep.cursor) AS n FROM shared_outbox e JOIN shared_event_positions ep ON ep.event_id=e.id JOIN shared_messages m ON m.id=e.message_id AND e.assignment_version=m.assignment_version LEFT JOIN shared_deliveries d ON d.event_id=e.id AND d.subscription_id=? AND d.assignment_version=m.assignment_version WHERE m.inbox_id=? AND m.assignee_agent_id=? AND m.cursor>(SELECT admission_cursor FROM shared_memberships WHERE inbox_id=m.inbox_id AND agent_id=m.assignee_agent_id AND state='active') AND m.kind='request' AND ep.cursor>? AND m.expires_at>? AND e.created_at>=? AND m.state IN('pending','claimed') AND (d.id IS NULL OR d.state<>'accepted')`
  )
    .bind(s.id, s.inbox_id, s.agent_id, s.cursor, Date.now(), s.replay_floor_at)
    .first<number>('n');
  await env.DB.prepare(
    "UPDATE shared_subscriptions SET cursor=MAX(cursor,?) WHERE id=? AND revision=? AND status='active'"
  )
    .bind(pending !== null ? Math.min(pending - 1, latest) : latest, s.id, s.revision)
    .run();
}
export async function recoverSharedDelivery(env: RuntimeEnv) {
  enabled(env);
  const subs = await env.DB.prepare(
    "SELECT * FROM shared_subscriptions WHERE status='active' LIMIT 500"
  ).all<Sub>();
  for (const s of subs.results) {
    if (!(await eligible(env, s))) {
      await terminate(env, s.id, s.expires_at <= Date.now() ? 'expired' : 'revoked', s.revision);
      continue;
    }
    await env.DB.prepare(
      'UPDATE shared_subscriptions SET previous_secret_ciphertext=NULL,previous_secret_until=NULL WHERE id=? AND previous_secret_until<=?'
    )
      .bind(s.id, Date.now())
      .run();
  }
  await publishSharedOutbox(env);
  await materialize(env);
  await enqueue(env);
}
export async function listSharedMonitoring(
  env: RuntimeEnv,
  p: Principal,
  inboxId: string,
  viewAgentId?: string
) {
  enabled(env);
  if (p.authentication !== 'owner_session' || !p.scopes.includes('a2a:admin'))
    throw new HttpError('owner_approval_required', 403, 'Owner approval required.');
  const access = await env.DB.prepare(
    `SELECT 1 FROM shared_inboxes ib WHERE ib.id=? AND (ib.owner_subject=? OR EXISTS(SELECT 1 FROM shared_memberships mb JOIN shared_agents ag ON ag.id=mb.agent_id WHERE mb.inbox_id=ib.id AND mb.state='active' AND ag.owner_subject=? AND (? IS NULL OR ag.id=?)))`
  )
    .bind(inboxId, p.subject, p.subject, viewAgentId ?? null, viewAgentId ?? null)
    .first();
  if (!access) throw new HttpError('not_found', 404, 'Inbox unavailable.');
  const rows = await env.DB.prepare(
    `SELECT s.id,s.agent_id AS agentId,s.generation,s.status,s.expires_at AS expiresAt,s.cursor,(SELECT COUNT(*) FROM shared_deliveries d WHERE d.subscription_id=s.id AND d.state='accepted') AS accepted,(SELECT COUNT(*) FROM shared_deliveries d WHERE d.subscription_id=s.id AND d.state IN('pending','retrying')) AS pending FROM shared_subscriptions s WHERE s.inbox_id=? AND s.owner_subject=? AND (? IS NULL OR s.agent_id=?)`
  )
    .bind(inboxId, p.subject, viewAgentId ?? null, viewAgentId ?? null)
    .all();
  return { subscriptions: rows.results };
}
