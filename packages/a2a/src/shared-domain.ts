import { DomainError } from './domain';
import { SHARED_POLICY as P } from './shared-types';
import type {
  SharedPrincipal,
  SharedCapability,
  SharedAgent,
  SharedInbox,
  SharedConnection,
  SharedMembership,
  SharedInvitation,
  SharedMessage,
  SharedContext,
  SharedPage,
  SharedSendInput
} from './shared-types';
export * from './shared-types';
type V = string | number | null;
const id = () => crypto.randomUUID();
const fail = (): never => {
  throw new DomainError('not_found', 404, 'Shared resource unavailable');
};
function admin(p: SharedPrincipal) {
  if (!p.subject || p.authentication !== 'owner_session' || !p.scopes.includes('a2a:admin'))
    throw new DomainError('owner_approval_required', 403);
  return p.subject;
}
function text(s: string, max: number = P.maxTextBytes) {
  if (typeof s !== 'string' || !s.trim() || new TextEncoder().encode(s).length > max)
    throw new DomainError('invalid_input', 400);
  return s.trim();
}
function caps(c: SharedCapability[] = ['read', 'post', 'work']) {
  if (!c.includes('read') || c.some((x) => !['read', 'post', 'work'].includes(x)))
    throw new DomainError('invalid_capabilities', 400);
  return [...new Set(c)].sort().join(',');
}
/** All content predicates are evaluated by SQLite at read/write time. */
export class SharedInboxService {
  constructor(readonly db: D1Database) {}
  private st(sql: string, ...v: V[]) {
    return this.db.prepare(sql).bind(...v);
  }
  private async one<T>(sql: string, ...v: V[]) {
    return this.st(sql, ...v).first<T>();
  }
  private async rows<T>(sql: string, ...v: V[]) {
    return (await this.st(sql, ...v).all<T>()).results;
  }
  private async write(sql: string, ...v: V[]) {
    const r = await this.db.batch([this.st(sql, ...v)]);
    if (!r[0].meta.changes) fail();
  }
  private ownInbox(p: SharedPrincipal, inbox: string) {
    return this.one<SharedInbox>(
      'SELECT * FROM shared_inboxes WHERE id=? AND owner_subject=?',
      inbox,
      admin(p)
    ).then((x) => x ?? fail());
  }
  private auth(p: SharedPrincipal, inbox: string, cap: SharedCapability) {
    if (
      !p.subject ||
      p.authentication !== 'bearer' ||
      !p.connectionId ||
      !p.scopes.includes(cap === 'read' ? 'a2a:read' : 'a2a:write')
    )
      throw new DomainError('connection_required', 403);
    return {
      sql: `EXISTS(SELECT 1 FROM shared_connections co JOIN shared_agents ag ON ag.id=co.agent_id JOIN shared_memberships mb ON mb.agent_id=ag.id JOIN shared_inboxes ib ON ib.id=mb.inbox_id WHERE co.owner_subject=? AND co.family_id=? AND co.state='approved' AND ag.owner_subject=co.owner_subject AND ag.paused=0 AND ag.deleted_at IS NULL AND mb.inbox_id=? AND mb.state='active' AND instr(','||mb.capabilities||',',?)>0 AND ib.state='active')`,
      v: [p.subject, p.connectionId, inbox, ',' + cap + ','] as V[]
    };
  }
  async resolveAgent(p: SharedPrincipal) {
    if (p.authentication !== 'bearer' || !p.connectionId) fail();
    const r = await this.one<SharedAgent & { connection_id: string }>(
      `SELECT ag.*,co.id AS connection_id FROM shared_connections co JOIN shared_agents ag ON ag.id=co.agent_id WHERE co.owner_subject=? AND co.family_id=? AND co.state='approved' AND ag.owner_subject=co.owner_subject AND ag.paused=0 AND ag.deleted_at IS NULL`,
      p.subject,
      p.connectionId!
    );
    return r ?? fail();
  }
  async authorize(p: SharedPrincipal, inboxId: string, cap: SharedCapability = 'read') {
    const a = this.auth(p, inboxId, cap);
    const row = await this.one<SharedMembership & { connection_id: string }>(
      `SELECT mb.*,co.id AS connection_id FROM shared_memberships mb JOIN shared_connections co ON co.agent_id=mb.agent_id WHERE co.owner_subject=? AND co.family_id=? AND mb.inbox_id=? AND ${a.sql}`,
      p.subject,
      p.connectionId!,
      inboxId,
      ...a.v
    );
    return row ?? fail();
  }
  async createAgent(p: SharedPrincipal, name: string) {
    const owner = admin(p),
      i = id();
    await this.write(
      `INSERT INTO shared_agents(id,owner_subject,name,created_at) SELECT ?,?,?,? WHERE (SELECT count(*) FROM shared_agents WHERE owner_subject=? AND deleted_at IS NULL)<?`,
      i,
      owner,
      text(name, 120),
      Date.now(),
      owner,
      P.maxAgentsPerOwner
    );
    return (await this.one<SharedAgent>('SELECT * FROM shared_agents WHERE id=?', i))!;
  }
  async listAgents(p: SharedPrincipal) {
    return this.rows<SharedAgent>(
      'SELECT * FROM shared_agents WHERE owner_subject=? AND deleted_at IS NULL ORDER BY created_at',
      admin(p)
    );
  }
  private invalidation(where: string, ...v: V[]) {
    return this.st(
      `UPDATE shared_messages SET state='awaiting_assignment',assignment_version=assignment_version+1,claim_token=NULL,claim_until=NULL WHERE kind='request' AND state IN ('pending','claimed','approval_required') AND ${where}`,
      ...v
    );
  }
  async setAgentPaused(p: SharedPrincipal, agentId: string, paused: boolean) {
    const owner = admin(p);
    await this.db.batch([
      this.st(
        'UPDATE shared_agents SET paused=? WHERE id=? AND owner_subject=? AND deleted_at IS NULL',
        paused ? 1 : 0,
        agentId,
        owner
      ),
      ...(paused
        ? [
            this.invalidation(
              'assignee_agent_id IN (SELECT id FROM shared_agents WHERE id=? AND owner_subject=? AND paused=1)',
              agentId,
              owner
            )
          ]
        : [])
    ]);
    return this.one<SharedAgent>(
      'SELECT * FROM shared_agents WHERE id=? AND owner_subject=?',
      agentId,
      owner
    );
  }
  async deleteAgent(p: SharedPrincipal, agentId: string) {
    const owner = admin(p);
    await this.db.batch([
      this.st(
        `UPDATE shared_invitations SET state='revoked' WHERE agent_id=? AND state='pending' AND EXISTS(SELECT 1 FROM shared_agents WHERE id=? AND owner_subject=?)`,
        agentId,
        agentId,
        owner
      ),
      this.st(
        'UPDATE shared_agents SET deleted_at=?,paused=1 WHERE id=? AND owner_subject=?',
        Date.now(),
        agentId,
        owner
      ),
      this.invalidation(
        'assignee_agent_id IN (SELECT id FROM shared_agents WHERE id=? AND owner_subject=? AND deleted_at IS NOT NULL)',
        agentId,
        owner
      ),
      this.st(
        `UPDATE shared_memberships SET state='revoked',generation=generation+1 WHERE agent_id IN (SELECT id FROM shared_agents WHERE id=? AND owner_subject=? AND deleted_at IS NOT NULL)`,
        agentId,
        owner
      )
    ]);
    return { ok: true };
  }
  async createInbox(p: SharedPrincipal, name: string) {
    const owner = admin(p),
      i = id();
    await this.write(
      `INSERT INTO shared_inboxes(id,owner_subject,name,created_at) SELECT ?,?,?,? WHERE (SELECT count(*) FROM shared_inboxes WHERE owner_subject=? AND state!='closed')<?`,
      i,
      owner,
      text(name, 120),
      Date.now(),
      owner,
      P.maxInboxesPerOwner
    );
    return (await this.one<SharedInbox>('SELECT * FROM shared_inboxes WHERE id=?', i))!;
  }
  async listInboxes(p: SharedPrincipal) {
    if (p.authentication === 'owner_session') {
      const rows = await this.rows<SharedInbox>(
        `SELECT DISTINCT ib.* FROM shared_inboxes ib LEFT JOIN shared_memberships mb ON mb.inbox_id=ib.id LEFT JOIN shared_agents ag ON ag.id=mb.agent_id WHERE ib.owner_subject=? OR (ag.owner_subject=? AND mb.state='active' AND ag.deleted_at IS NULL)`,
        admin(p),
        p.subject
      );
      return Promise.all(
        rows.map(async (row) => ({
          id: row.id,
          name: row.name,
          state: row.state,
          policy_version: row.policy_version,
          created_at: row.created_at,
          isOwner: row.owner_subject === p.subject,
          views: await this.rows<{
            agent_id: string;
            name: string;
            generation: number;
            admission_cursor: number;
            capabilities: string;
          }>(
            `SELECT mb.agent_id,ag.name,mb.generation,mb.admission_cursor,mb.capabilities FROM shared_memberships mb JOIN shared_agents ag ON ag.id=mb.agent_id WHERE mb.inbox_id=? AND ag.owner_subject=? AND mb.state='active' AND ag.deleted_at IS NULL`,
            row.id,
            p.subject
          )
        }))
      );
    }
    if (!p.scopes.includes('a2a:read')) fail();
    const a = await this.resolveAgent(p);
    return this.rows<SharedInbox & { isOwner: boolean }>(
      `SELECT ib.id,ib.name,ib.state,ib.policy_version,ib.created_at,0 AS isOwner FROM shared_inboxes ib JOIN shared_memberships mb ON mb.inbox_id=ib.id WHERE mb.agent_id=? AND mb.state='active' AND ib.state='active'`,
      a.id
    );
  }
  async setInboxState(
    p: SharedPrincipal,
    inboxId: string,
    state: 'active' | 'archived' | 'closed'
  ) {
    if (!['active', 'archived', 'closed'].includes(state))
      throw new DomainError('invalid_input', 400);
    await this.ownInbox(p, inboxId);
    await this.db.batch([
      this.st(
        `UPDATE shared_inboxes SET state=? WHERE id=? AND owner_subject=? AND state!='closed'`,
        state,
        inboxId,
        p.subject
      ),
      ...(state !== 'active' ? [this.invalidation('inbox_id=?', inboxId)] : [])
    ]);
    return { ok: true };
  }
  async requestConnection(p: SharedPrincipal, label: string) {
    if (p.authentication !== 'bearer' || !p.connectionId || !p.subject)
      throw new DomainError('connection_required', 403);
    await this.db.batch([
      this.st(
        `INSERT OR IGNORE INTO shared_connections(id,owner_subject,family_id,label,client_id,created_at) SELECT ?,?,?,?,?,? WHERE (SELECT count(*) FROM shared_connections WHERE owner_subject=?)<100`,
        id(),
        p.subject,
        p.connectionId,
        text(label, 120),
        p.clientId ?? null,
        Date.now(),
        p.subject
      )
    ]);
    const r = await this.one<SharedConnection>(
      `SELECT id,owner_subject,label,client_id,agent_id,state,created_at FROM shared_connections WHERE owner_subject=? AND family_id=?`,
      p.subject,
      p.connectionId
    );
    return r ?? fail();
  }
  async listConnections(p: SharedPrincipal) {
    return this.rows<SharedConnection>(
      'SELECT id,owner_subject,label,client_id,agent_id,state,created_at FROM shared_connections WHERE owner_subject=?',
      admin(p)
    );
  }
  async approveConnection(p: SharedPrincipal, recordId: string, agentId: string) {
    await this.write(
      `UPDATE shared_connections SET agent_id=?,state='approved' WHERE id=? AND owner_subject=? AND (state='pending' OR (state='approved' AND agent_id=?)) AND EXISTS(SELECT 1 FROM shared_agents WHERE id=? AND owner_subject=? AND deleted_at IS NULL AND paused=0)`,
      agentId,
      recordId,
      admin(p),
      agentId,
      agentId,
      p.subject
    );
    return { ok: true };
  }
  async revokeConnection(p: SharedPrincipal, recordId: string) {
    await this.db.batch([
      this.st(
        `UPDATE shared_connections SET state='revoked' WHERE id=? AND owner_subject=?`,
        recordId,
        admin(p)
      ),
      this.invalidation(
        `claim_connection_id IN (SELECT id FROM shared_connections WHERE id=? AND owner_subject=? AND state='revoked')`,
        recordId,
        p.subject
      )
    ]);
    return { ok: true };
  }
  async invite(
    p: SharedPrincipal,
    inboxId: string,
    agentId: string,
    capabilities: SharedCapability[] = ['read', 'post', 'work']
  ) {
    const owner = admin(p),
      i = id(),
      now = Date.now();
    await this.write(
      `INSERT INTO shared_invitations(id,inbox_id,agent_id,owner_subject,capabilities,expires_at,created_at) SELECT ?,ib.id,ag.id,ag.owner_subject,?,?,? FROM shared_inboxes ib,shared_agents ag WHERE ib.id=? AND ib.owner_subject=? AND ib.state='active' AND ag.id=? AND ag.deleted_at IS NULL AND (SELECT count(*) FROM shared_invitations WHERE inbox_id=ib.id AND state='pending' AND expires_at>?)<?`,
      i,
      caps(capabilities),
      now + P.invitationMs,
      now,
      inboxId,
      owner,
      agentId,
      now,
      P.maxPendingInvitations
    );
    return (await this.one<SharedInvitation>(
      'SELECT id,inbox_id,agent_id,capabilities,state,expires_at,created_at,admission_cursor FROM shared_invitations WHERE id=?',
      i
    ))!;
  }
  async listInvitations(p: SharedPrincipal) {
    return this.rows<SharedInvitation>(
      `SELECT iv.id,iv.inbox_id,iv.agent_id,iv.capabilities,iv.state,iv.expires_at,iv.created_at,iv.admission_cursor FROM shared_invitations iv JOIN shared_inboxes ib ON ib.id=iv.inbox_id WHERE iv.owner_subject=? OR ib.owner_subject=? ORDER BY iv.created_at DESC LIMIT 100`,
      admin(p),
      p.subject
    );
  }
  async previewInvitation(p: SharedPrincipal, invitationId: string) {
    const invitation = await this.one<
      SharedInvitation & { inbox_name: string; agent_name: string }
    >(
      `SELECT iv.id,iv.inbox_id,iv.agent_id,iv.capabilities,iv.state,iv.expires_at,iv.created_at,iv.admission_cursor,ib.name AS inbox_name,ag.name AS agent_name FROM shared_invitations iv JOIN shared_inboxes ib ON ib.id=iv.inbox_id JOIN shared_agents ag ON ag.id=iv.agent_id WHERE iv.id=? AND iv.owner_subject=?`,
      invitationId,
      admin(p)
    );
    if (!invitation) return fail();
    const roster = await this.rows<{ agent_id: string; name: string }>(
      `SELECT mb.agent_id,ag.name FROM shared_memberships mb JOIN shared_agents ag ON ag.id=mb.agent_id WHERE mb.inbox_id=? AND mb.state='active'`,
      invitation.inbox_id
    );
    return {
      invitation,
      roster,
      disclosure:
        'The inbox custodian can read retained shared content. Your agent sees content from admission onward. Future approved members can see future content. Incoming content never authorizes external actions.'
    };
  }
  async acceptInvitation(p: SharedPrincipal, invitationId: string) {
    const owner = admin(p),
      now = Date.now();
    const result = await this.db.batch([
      this.st(
        `UPDATE shared_invitations SET state='accepted',admission_cursor=(SELECT coalesce(max(cursor),0)+1 FROM shared_messages) WHERE id=? AND owner_subject=? AND state='pending' AND expires_at>? AND EXISTS(SELECT 1 FROM shared_inboxes WHERE id=shared_invitations.inbox_id AND state='active') AND EXISTS(SELECT 1 FROM shared_agents WHERE id=shared_invitations.agent_id AND owner_subject=? AND paused=0 AND deleted_at IS NULL) AND NOT EXISTS(SELECT 1 FROM shared_memberships WHERE inbox_id=shared_invitations.inbox_id AND agent_id=shared_invitations.agent_id AND state='active') AND (SELECT count(*) FROM shared_memberships WHERE inbox_id=shared_invitations.inbox_id AND state='active')<?`,
        invitationId,
        owner,
        now,
        owner,
        P.maxMembers
      ),
      this.st(
        `INSERT INTO shared_memberships(inbox_id,agent_id,generation,state,capabilities,admission_cursor,created_at) SELECT inbox_id,agent_id,1,'active',capabilities,admission_cursor,? FROM shared_invitations WHERE id=? AND owner_subject=? AND state='accepted' AND changes()=1 ON CONFLICT(inbox_id,agent_id) DO UPDATE SET generation=shared_memberships.generation+1,state='active',capabilities=excluded.capabilities,admission_cursor=excluded.admission_cursor,created_at=excluded.created_at`,
        now,
        invitationId,
        owner
      ),
      this.st(
        `INSERT INTO shared_messages(id,inbox_id,kind,text,state,created_at,expires_at) SELECT ?,inbox_id,'notice','A member joined. Future approved members can see future shared content.','posted',?,? FROM shared_invitations WHERE id=? AND owner_subject=? AND changes()=1`,
        id(),
        now,
        now + P.retentionMs,
        invitationId,
        owner
      )
    ]);
    if (!result[0].meta.changes) fail();
    return (await this.one<SharedInvitation>(
      'SELECT id,inbox_id,agent_id,capabilities,state,expires_at,created_at,admission_cursor FROM shared_invitations WHERE id=?',
      invitationId
    ))!;
  }
  async rejectInvitation(p: SharedPrincipal, invitationId: string) {
    await this.write(
      `UPDATE shared_invitations SET state='rejected' WHERE id=? AND owner_subject=? AND state='pending'`,
      invitationId,
      admin(p)
    );
    return { ok: true };
  }
  async revokeInvitation(p: SharedPrincipal, invitationId: string) {
    await this.write(
      `UPDATE shared_invitations SET state='revoked' WHERE id=? AND state='pending' AND inbox_id IN(SELECT id FROM shared_inboxes WHERE owner_subject=?)`,
      invitationId,
      admin(p)
    );
    return { ok: true };
  }
  async addOwnMembership(
    p: SharedPrincipal,
    inboxId: string,
    agentId: string,
    capabilities: SharedCapability[] = ['read', 'post', 'work']
  ) {
    admin(p);
    const ag = await this.one(
      'SELECT id FROM shared_agents WHERE id=? AND owner_subject=? AND deleted_at IS NULL',
      agentId,
      p.subject
    );
    if (!ag) fail();
    const iv = await this.invite(p, inboxId, agentId, capabilities);
    return this.acceptInvitation(p, iv.id);
  }
  private access(
    p: SharedPrincipal,
    inboxId: string,
    cap: SharedCapability = 'read',
    viewAgentId?: string
  ) {
    if (p.authentication === 'owner_session') {
      const owner = admin(p);
      return {
        sql: `EXISTS(SELECT 1 FROM shared_inboxes ib WHERE ib.id=? AND ((ib.owner_subject=? AND ?='') OR EXISTS(SELECT 1 FROM shared_memberships mb JOIN shared_agents ag ON ag.id=mb.agent_id WHERE mb.inbox_id=ib.id AND mb.agent_id=? AND ag.owner_subject=? AND ag.deleted_at IS NULL AND ag.paused=0 AND mb.state='active' AND instr(','||mb.capabilities||',',?)>0)))`,
        v: [inboxId, owner, viewAgentId ?? '', viewAgentId ?? '', owner, ',' + cap + ','] as V[]
      };
    }
    return this.auth(p, inboxId, cap);
  }
  private boundary(p: SharedPrincipal, inboxId: string, viewAgentId?: string) {
    if (p.authentication === 'owner_session')
      return {
        sql: `CASE WHEN EXISTS(SELECT 1 FROM shared_inboxes WHERE id=? AND owner_subject=? AND ?='') THEN 0 ELSE coalesce((SELECT admission_cursor FROM shared_memberships mb JOIN shared_agents ag ON ag.id=mb.agent_id WHERE mb.inbox_id=? AND mb.agent_id=? AND ag.owner_subject=? AND mb.state='active'),9223372036854775807) END`,
        v: [inboxId, p.subject, viewAgentId ?? '', inboxId, viewAgentId ?? '', p.subject] as V[]
      };
    return {
      sql: `coalesce((SELECT mb.admission_cursor FROM shared_memberships mb JOIN shared_connections co ON co.agent_id=mb.agent_id WHERE co.owner_subject=? AND co.family_id=? AND mb.inbox_id=? AND mb.state='active'),9223372036854775807)`,
      v: [p.subject, p.connectionId ?? '', inboxId] as V[]
    };
  }
  async roster(p: SharedPrincipal, inboxId: string, viewAgentId?: string) {
    const a = this.access(p, inboxId, 'read', viewAgentId);
    if (!(await this.one(`SELECT 1 WHERE ${a.sql}`, ...a.v))) fail();
    return this.rows<SharedMembership & { name: string; paused: number }>(
      `SELECT mb.*,ag.name,ag.paused FROM shared_memberships mb JOIN shared_agents ag ON ag.id=mb.agent_id WHERE mb.inbox_id=? AND mb.state='active' AND ${a.sql}`,
      inboxId,
      ...a.v
    );
  }
  private async remove(p: SharedPrincipal, inboxId: string, agentId: string, leave = false) {
    const owner = admin(p),
      now = Date.now();
    const permitted = leave
      ? `EXISTS(SELECT 1 FROM shared_agents WHERE id=? AND owner_subject=?)`
      : `EXISTS(SELECT 1 FROM shared_inboxes WHERE id=? AND owner_subject=?)`;
    const v = leave ? [agentId, owner] : [inboxId, owner];
    const r = await this.db.batch([
      this.st(
        `UPDATE shared_invitations SET state='revoked' WHERE inbox_id=? AND agent_id=? AND state='pending' AND EXISTS(SELECT 1 FROM shared_memberships WHERE inbox_id=? AND agent_id=? AND state='active') AND ${permitted}`,
        inboxId,
        agentId,
        inboxId,
        agentId,
        ...v
      ),
      this.st(
        `UPDATE shared_memberships SET state='revoked',generation=generation+1 WHERE inbox_id=? AND agent_id=? AND state='active' AND ${permitted}`,
        inboxId,
        agentId,
        ...v
      ),
      this.invalidation(`inbox_id=? AND assignee_agent_id=? AND changes()=1`, inboxId, agentId),
      this.st(
        `INSERT INTO shared_messages(id,inbox_id,kind,text,state,created_at,expires_at) SELECT ?,?,'notice','A member left or was removed.','posted',?,? WHERE ${permitted}`,
        id(),
        inboxId,
        now,
        now + P.retentionMs,
        ...v
      )
    ]);
    if (!r[1].meta.changes) fail();
    return { ok: true };
  }
  removeMember(p: SharedPrincipal, inboxId: string, agentId: string) {
    return this.remove(p, inboxId, agentId);
  }
  leave(p: SharedPrincipal, inboxId: string, agentId: string) {
    return this.remove(p, inboxId, agentId, true);
  }
  async listMessages(
    p: SharedPrincipal,
    inboxId: string,
    after = 0,
    limit = 50,
    viewAgentId?: string
  ): Promise<SharedPage<SharedMessage>> {
    const a = this.access(p, inboxId, 'read', viewAgentId),
      b = this.boundary(p, inboxId, viewAgentId);
    if (!(await this.one(`SELECT 1 WHERE ${a.sql}`, ...a.v))) fail();
    limit = Math.max(1, Math.min(P.maxPage, Math.floor(limit) || 50));
    const rows = await this.rows<SharedMessage>(
      `SELECT cursor,id,inbox_id,author_agent_id,author_kind,author_name,kind,text,assignee_agent_id,assignment_version,state,created_at,expires_at,CASE WHEN kind='request' THEN created_at+604800000 ELSE NULL END AS actionable_until FROM shared_messages WHERE inbox_id=? AND cursor>? AND cursor>=(${b.sql}) AND expires_at>? AND ${a.sql} ORDER BY cursor LIMIT ?`,
      inboxId,
      after,
      ...b.v,
      Date.now(),
      ...a.v,
      limit + 1
    );
    const gap = await this.one<{ n: number }>(
      `SELECT count(*) AS n FROM shared_messages WHERE inbox_id=? AND cursor>? AND cursor>=(${b.sql}) AND expires_at<=? AND ${a.sql}`,
      inboxId,
      after,
      ...b.v,
      Date.now(),
      ...a.v
    );
    return {
      items: rows.slice(0, limit),
      nextAfter: rows.length ? rows[Math.min(rows.length, limit) - 1].cursor : null,
      hasMore: rows.length > limit,
      truncated:
        !!gap?.n ||
        !!(await this.one(
          `SELECT 1 FROM shared_retention_watermarks WHERE inbox_id=? AND pruned_through_cursor>? AND pruned_through_cursor>=(${b.sql}) AND ${a.sql}`,
          inboxId,
          after,
          ...b.v,
          ...a.v
        ))
    };
  }
  async readMessage(p: SharedPrincipal, inboxId: string, messageId: string, viewAgentId?: string) {
    const a = this.access(p, inboxId, 'read', viewAgentId),
      b = this.boundary(p, inboxId, viewAgentId);
    return (
      (await this.one<SharedMessage>(
        `SELECT cursor,id,inbox_id,author_agent_id,author_kind,author_name,kind,text,assignee_agent_id,assignment_version,state,created_at,expires_at,CASE WHEN kind='request' THEN created_at+604800000 ELSE NULL END AS actionable_until FROM shared_messages WHERE inbox_id=? AND id=? AND cursor>=(${b.sql}) AND expires_at>? AND ${a.sql}`,
        inboxId,
        messageId,
        ...b.v,
        Date.now(),
        ...a.v
      )) ?? fail()
    );
  }
  async sendMessage(p: SharedPrincipal, inboxId: string, input: SharedSendInput) {
    const a = this.auth(p, inboxId, 'post'),
      ag = await this.resolveAgent(p),
      now = Date.now(),
      i = id();
    const kind = input.kind ?? 'conversation';
    if (
      !['conversation', 'request'].includes(kind) ||
      (kind === 'request' && !input.assigneeAgentId) ||
      !input.idempotencyKey ||
      input.idempotencyKey.length > 200
    )
      throw new DomainError('invalid_input', 400);
    const body = text(input.text);
    const assignee = kind === 'request' ? input.assigneeAgentId! : null;
    await this.db.batch([
      this.st(
        `INSERT OR IGNORE INTO shared_messages(id,inbox_id,author_agent_id,kind,text,assignee_agent_id,state,created_at,expires_at,idempotency_key) SELECT ?,?,?,?,?,?,?,?, ?,? WHERE ${a.sql} AND (SELECT count(*) FROM shared_messages WHERE inbox_id=? AND created_at>?)<? AND (? IS NULL OR EXISTS(SELECT 1 FROM shared_memberships mb JOIN shared_agents ag ON ag.id=mb.agent_id WHERE mb.inbox_id=? AND mb.agent_id=? AND mb.state='active' AND instr(','||mb.capabilities||',',',work,')>0 AND ag.paused=0 AND ag.deleted_at IS NULL))`,
        i,
        inboxId,
        ag.id,
        kind,
        body,
        assignee,
        kind === 'request' ? 'pending' : 'posted',
        now,
        now + P.retentionMs,
        input.idempotencyKey,
        ...a.v,
        inboxId,
        now - 86400000,
        P.maxMessagesPerDay,
        assignee,
        inboxId,
        assignee
      ),
      this.st(
        `INSERT OR IGNORE INTO shared_outbox(id,message_id,inbox_id,cursor,created_at) SELECT ?,id,inbox_id,cursor,created_at FROM shared_messages WHERE id=?`,
        id(),
        i
      )
    ]);
    const boundary = this.boundary(p, inboxId);
    const r = await this.one<SharedMessage>(
      `SELECT cursor,id,inbox_id,author_agent_id,author_kind,author_name,kind,text,assignee_agent_id,assignment_version,state,created_at,expires_at,CASE WHEN kind='request' THEN created_at+604800000 ELSE NULL END AS actionable_until FROM shared_messages WHERE inbox_id=? AND author_agent_id=? AND idempotency_key=? AND cursor>=(${boundary.sql}) AND expires_at>? AND ${a.sql}`,
      inboxId,
      ag.id,
      input.idempotencyKey,
      ...boundary.v,
      Date.now(),
      ...a.v
    );
    if (!r) return fail();
    if (r.text !== body || r.kind !== kind || r.assignee_agent_id !== assignee)
      throw new DomainError('idempotency_conflict', 409);
    return r;
  }
  async sendOwnerMessage(
    p: SharedPrincipal,
    inboxId: string,
    input: SharedSendInput,
    viewAgentId?: string
  ) {
    admin(p);
    const a = this.access(p, inboxId, 'post', viewAgentId),
      i = id(),
      now = Date.now(),
      body = text(input.text),
      kind = input.kind ?? 'conversation',
      assignee = kind === 'request' ? (input.assigneeAgentId ?? null) : null;
    if (
      !['conversation', 'request'].includes(kind) ||
      !input.idempotencyKey ||
      input.idempotencyKey.length > 200 ||
      (kind === 'request' && !assignee)
    )
      throw new DomainError('invalid_input', 400);
    await this.db.batch([
      this.st(
        `INSERT OR IGNORE INTO shared_messages(id,inbox_id,author_kind,author_name,actor_key,kind,text,assignee_agent_id,state,created_at,expires_at,idempotency_key) SELECT ?,?,'owner',?,?,?,?,?,?,?, ?,? WHERE ${a.sql} AND EXISTS(SELECT 1 FROM shared_inboxes WHERE id=? AND state='active') AND (SELECT count(*) FROM shared_messages WHERE inbox_id=? AND created_at>?)<? AND (? IS NULL OR EXISTS(SELECT 1 FROM shared_memberships mb JOIN shared_agents ag ON ag.id=mb.agent_id WHERE mb.inbox_id=? AND mb.agent_id=? AND mb.state='active' AND instr(','||mb.capabilities||',',',work,')>0 AND ag.paused=0 AND ag.deleted_at IS NULL))`,
        i,
        inboxId,
        p.displayName ?? 'Owner',
        p.subject,
        kind,
        body,
        assignee,
        kind === 'request' ? 'pending' : 'posted',
        now,
        now + P.retentionMs,
        input.idempotencyKey,
        ...a.v,
        inboxId,
        inboxId,
        now - 86400000,
        P.maxMessagesPerDay,
        assignee,
        inboxId,
        assignee
      ),
      this.st(
        `INSERT OR IGNORE INTO shared_outbox(id,message_id,inbox_id,cursor,created_at) SELECT ?,id,inbox_id,cursor,created_at FROM shared_messages WHERE id=?`,
        id(),
        i
      )
    ]);
    const boundary = this.boundary(p, inboxId, viewAgentId);
    const r = await this.one<SharedMessage>(
      `SELECT cursor,id,inbox_id,author_agent_id,author_kind,author_name,kind,text,assignee_agent_id,assignment_version,state,created_at,expires_at,CASE WHEN kind='request' THEN created_at+604800000 ELSE NULL END AS actionable_until FROM shared_messages WHERE inbox_id=? AND actor_key=? AND idempotency_key=? AND cursor>=(${boundary.sql}) AND expires_at>? AND ${a.sql}`,
      inboxId,
      p.subject,
      input.idempotencyKey,
      ...boundary.v,
      Date.now(),
      ...a.v
    );
    if (!r) return fail();
    if (r.text !== body || r.kind !== kind || r.assignee_agent_id !== assignee)
      throw new DomainError('idempotency_conflict', 409);
    return r;
  }
  async claimMessage(
    p: SharedPrincipal,
    inboxId: string,
    messageId: string,
    expectedVersion?: number
  ) {
    const a = this.auth(p, inboxId, 'work'),
      ag = await this.resolveAgent(p),
      mb = await this.authorize(p, inboxId, 'work'),
      now = Date.now(),
      token = id();
    await this.write(
      `UPDATE shared_messages SET state='claimed',claim_token=?,claim_connection_id=?,claim_generation=?,claim_until=? WHERE id=? AND inbox_id=? AND kind='request' AND assignee_agent_id=? AND (state='pending' OR (state='claimed' AND claim_until<=?)) AND expires_at>? AND created_at>? AND cursor>=? AND (? IS NULL OR assignment_version=?) AND EXISTS(SELECT 1 FROM shared_memberships WHERE inbox_id=shared_messages.inbox_id AND agent_id=shared_messages.assignee_agent_id AND generation=? AND state='active') AND ${a.sql}`,
      token,
      ag.connection_id,
      mb.generation,
      now + P.claimLeaseMs,
      messageId,
      inboxId,
      ag.id,
      now,
      now,
      now - 7 * 86400000,
      mb.admission_cursor,
      expectedVersion ?? null,
      expectedVersion ?? null,
      mb.generation,
      ...a.v
    );
    return {
      claimToken: token,
      assignmentVersion: (await this.readMessage(p, inboxId, messageId)).assignment_version,
      claimedUntil: now + P.claimLeaseMs
    };
  }
  async finishMessage(
    p: SharedPrincipal,
    inboxId: string,
    messageId: string,
    input: {
      claimToken: string;
      assignmentVersion: number;
      state: 'completed' | 'rejected' | 'approval_required';
    }
  ) {
    if (!['completed', 'rejected', 'approval_required'].includes(input.state))
      throw new DomainError('invalid_input', 400);
    const a = this.auth(p, inboxId, 'work'),
      ag = await this.resolveAgent(p);
    await this.write(
      `UPDATE shared_messages SET state=?,claim_token=NULL,claim_until=NULL WHERE id=? AND inbox_id=? AND assignee_agent_id=? AND state='claimed' AND claim_token=? AND claim_connection_id=? AND assignment_version=? AND claim_until>? AND expires_at>? AND created_at>? AND claim_generation=(SELECT generation FROM shared_memberships WHERE inbox_id=? AND agent_id=? AND state='active') AND ${a.sql}`,
      input.state,
      messageId,
      inboxId,
      ag.id,
      input.claimToken,
      ag.connection_id,
      input.assignmentVersion,
      Date.now(),
      Date.now(),
      Date.now() - 7 * 86400000,
      inboxId,
      ag.id,
      ...a.v
    );
    return this.readMessage(p, inboxId, messageId);
  }
  async reassignMessage(
    p: SharedPrincipal,
    inboxId: string,
    messageId: string,
    agentId: string,
    expectedVersion: number
  ) {
    const result = await this.db.batch([
      this.st(
        `UPDATE shared_messages SET assignee_agent_id=?,assignment_version=assignment_version+1,state='pending',claim_token=NULL,claim_until=NULL WHERE id=? AND inbox_id=? AND kind='request' AND state IN('pending','claimed','awaiting_assignment','approval_required') AND assignment_version=? AND expires_at>? AND created_at>? AND EXISTS(SELECT 1 FROM shared_inboxes WHERE id=? AND owner_subject=? AND state='active') AND EXISTS(SELECT 1 FROM shared_memberships mb JOIN shared_agents ag ON ag.id=mb.agent_id WHERE mb.inbox_id=? AND mb.agent_id=? AND mb.state='active' AND mb.admission_cursor<=shared_messages.cursor AND instr(','||mb.capabilities||',',',work,')>0 AND ag.paused=0 AND ag.deleted_at IS NULL)`,
        agentId,
        messageId,
        inboxId,
        expectedVersion,
        Date.now(),
        Date.now() - 7 * 86400000,
        inboxId,
        admin(p),
        inboxId,
        agentId
      ),
      this.st(
        `INSERT OR IGNORE INTO shared_outbox(id,message_id,inbox_id,cursor,assignment_version,created_at) SELECT ?,id,inbox_id,cursor,assignment_version,? FROM shared_messages WHERE id=? AND inbox_id=? AND changes()=1`,
        id(),
        Date.now(),
        messageId,
        inboxId
      )
    ]);
    if (!result[0].meta.changes) fail();
    return this.readMessage(p, inboxId, messageId);
  }
  async cancelMessage(
    p: SharedPrincipal,
    inboxId: string,
    messageId: string,
    expectedVersion: number
  ) {
    await this.write(
      `UPDATE shared_messages SET state='cancelled',assignment_version=assignment_version+1,claim_token=NULL,claim_until=NULL WHERE id=? AND inbox_id=? AND assignment_version=? AND state IN('pending','claimed','awaiting_assignment','approval_required') AND EXISTS(SELECT 1 FROM shared_inboxes WHERE id=? AND owner_subject=?)`,
      messageId,
      inboxId,
      expectedVersion,
      inboxId,
      admin(p)
    );
    return { ok: true };
  }
  async deliveryEligible(
    connectionRecordId: string,
    inboxId: string,
    generation: number,
    cursor: number
  ) {
    return !!(await this.one(
      `SELECT 1 FROM shared_connections co JOIN shared_agents ag ON ag.id=co.agent_id JOIN shared_memberships mb ON mb.agent_id=ag.id JOIN shared_inboxes ib ON ib.id=mb.inbox_id JOIN shared_messages m ON m.inbox_id=ib.id WHERE co.id=? AND co.state='approved' AND ag.owner_subject=co.owner_subject AND ag.paused=0 AND ag.deleted_at IS NULL AND mb.inbox_id=? AND mb.state='active' AND mb.generation=? AND mb.admission_cursor<=? AND instr(','||mb.capabilities||',',',read,')>0 AND ib.state='active' AND m.cursor=? AND m.expires_at>?`,
      connectionRecordId,
      inboxId,
      generation,
      cursor,
      cursor,
      Date.now()
    ));
  }
  async createContext(
    p: SharedPrincipal,
    inboxId: string,
    input: { title: string; text: string },
    viewAgentId?: string
  ) {
    const a = this.access(p, inboxId, 'post', viewAgentId),
      i = id(),
      marker = id(),
      now = Date.now(),
      body = (text(input.text, P.maxContextBytes), input.text),
      title = text(input.title, 200),
      hash = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))),
        (x) => x.toString(16).padStart(2, '0')
      ).join('');
    await this.db.batch([
      this.st(
        `INSERT INTO shared_messages(id,inbox_id,kind,text,state,created_at,expires_at) SELECT ?,?,'notice','Shared context added.','posted',?,? WHERE ${a.sql} AND EXISTS(SELECT 1 FROM shared_inboxes WHERE id=? AND state='active') AND (SELECT count(*) FROM shared_context WHERE inbox_id=? AND expires_at>? AND revoked_at IS NULL)<?`,
        marker,
        inboxId,
        now,
        now + P.retentionMs,
        ...a.v,
        inboxId,
        inboxId,
        now,
        P.maxContextPerInbox
      ),
      this.st(
        `INSERT INTO shared_context(id,inbox_id,cursor,title,text,created_at,expires_at,uploader_subject,sha256) SELECT ?,inbox_id,cursor,?,?,?,?,?,? FROM shared_messages WHERE id=? AND changes()=1`,
        i,
        title,
        body,
        now,
        now + P.retentionMs,
        p.subject,
        hash,
        marker
      )
    ]);
    const r = await this.one<SharedContext>(
      'SELECT id,inbox_id,cursor,title,created_at,expires_at,sha256 FROM shared_context WHERE id=?',
      i
    );
    return r ?? fail();
  }
  async listContext(
    p: SharedPrincipal,
    inboxId: string,
    after = 0,
    limit = 50,
    viewAgentId?: string
  ) {
    const a = this.access(p, inboxId, 'read', viewAgentId),
      b = this.boundary(p, inboxId, viewAgentId);
    if (!(await this.one(`SELECT 1 WHERE ${a.sql}`, ...a.v))) fail();
    limit = Math.max(1, Math.min(P.maxPage, Math.floor(limit) || 50));
    const rows = await this.rows<Omit<SharedContext, 'text'>>(
      `SELECT id,inbox_id,cursor,title,created_at,expires_at,sha256 FROM shared_context WHERE inbox_id=? AND cursor>? AND cursor>=(${b.sql}) AND expires_at>? AND revoked_at IS NULL AND ${a.sql} ORDER BY cursor LIMIT ?`,
      inboxId,
      after,
      ...b.v,
      Date.now(),
      ...a.v,
      limit + 1
    );
    return {
      items: rows.slice(0, limit),
      hasMore: rows.length > limit,
      nextAfter: rows.length ? rows[Math.min(limit, rows.length) - 1].cursor : null,
      truncated: false
    };
  }
  async readContext(
    p: SharedPrincipal,
    inboxId: string,
    contextId: string,
    viewAgentId?: string,
    offset = 0,
    length = 4096
  ) {
    if (!Number.isInteger(offset) || offset < 0 || offset > P.maxContextBytes)
      throw new DomainError('invalid_input', 400);
    length = Math.max(1, Math.min(4096, Math.floor(length) || 4096));
    const a = this.access(p, inboxId, 'read', viewAgentId),
      b = this.boundary(p, inboxId, viewAgentId);
    const r = await this.one<SharedContext & { total_length: number }>(
      `SELECT id,inbox_id,cursor,title,substr(text,?,?) AS text,length(text) AS total_length,created_at,expires_at,sha256 FROM shared_context WHERE inbox_id=? AND id=? AND cursor>=(${b.sql}) AND expires_at>? AND revoked_at IS NULL AND ${a.sql}`,
      offset + 1,
      length,
      inboxId,
      contextId,
      ...b.v,
      Date.now(),
      ...a.v
    );
    if (!r) return fail();
    return {
      ...r,
      offset,
      nextOffset:
        offset + Array.from(r.text).length < r.total_length
          ? offset + Array.from(r.text).length
          : null,
      truncated: offset + Array.from(r.text).length < r.total_length
    };
  }
  async searchContext(p: SharedPrincipal, inboxId: string, query: string, viewAgentId?: string) {
    query = text(query, 200);
    const a = this.access(p, inboxId, 'read', viewAgentId),
      b = this.boundary(p, inboxId, viewAgentId);
    if (!(await this.one(`SELECT 1 WHERE ${a.sql}`, ...a.v))) fail();
    const items = await this.rows(
      `SELECT id,inbox_id,cursor,title,substr(text,max(1,instr(lower(text),lower(?))-60),200) AS snippet,sha256 FROM shared_context WHERE inbox_id=? AND cursor>=(${b.sql}) AND expires_at>? AND revoked_at IS NULL AND instr(lower(title||' '||text),lower(?))>0 AND ${a.sql} ORDER BY cursor LIMIT 21`,
      query,
      inboxId,
      ...b.v,
      Date.now(),
      query,
      ...a.v
    );
    return { items: items.slice(0, 20), truncated: items.length > 20 };
  }
  async revokeContext(p: SharedPrincipal, inboxId: string, contextId: string) {
    await this.write(
      `UPDATE shared_context SET revoked_at=?,text='' WHERE id=? AND inbox_id=? AND (uploader_subject=? OR EXISTS(SELECT 1 FROM shared_inboxes WHERE id=? AND owner_subject=?))`,
      Date.now(),
      contextId,
      inboxId,
      admin(p),
      inboxId,
      p.subject
    );
    return { ok: true };
  }
  /** Content lasts thirty days; action windows seven; content/audit metadata
   * ninety. Consent, revocations, identities and compact inbox watermarks persist
   * to prevent resurrection and preserve meaningful catch-up after pruning.
   * Explicitly revoked subscription IDs are permanent callback revocation
   * tombstones; after ninety days their callback URL and all secrets are erased.
   * Idempotency keys expire with ninety-day message tombstones; expired content
   * is never returned by reconciliation even before its key is removed.
   */
  async pruneRetention(now = Date.now()) {
    const auditFloor = now - 90 * 86400000;
    await this.db.batch([
      this.st(
        `UPDATE shared_messages SET state='expired',assignment_version=assignment_version+1,claim_token=NULL,claim_connection_id=NULL,claim_generation=NULL,claim_until=NULL WHERE kind='request' AND state IN('pending','claimed','approval_required','awaiting_assignment') AND created_at<=?`,
        now - 7 * 86400000
      ),
      this.st(
        `UPDATE shared_messages SET text='',claim_token=NULL,claim_connection_id=NULL,claim_generation=NULL,claim_until=NULL WHERE expires_at<=?`,
        now
      ),
      this.st(`UPDATE shared_context SET text='' WHERE expires_at<=?`, now),
      this.st(
        `UPDATE shared_subscriptions SET status=CASE WHEN status='revoked' THEN 'revoked' ELSE 'expired' END,secret_ciphertext='',token_ciphertext='',previous_secret_ciphertext=NULL,previous_secret_until=NULL WHERE expires_at<=? OR status='revoked'`,
        now
      ),
      this.st(
        `INSERT INTO shared_retention_watermarks(inbox_id,pruned_through_cursor,pruned_through_event_cursor,last_pruned_at)
        SELECT ib.id,coalesce((SELECT max(m.cursor) FROM shared_messages m WHERE m.inbox_id=ib.id AND m.created_at<=?),0),coalesce((SELECT max(ep.cursor) FROM shared_event_positions ep JOIN shared_outbox e ON e.id=ep.event_id WHERE e.inbox_id=ib.id AND e.created_at<=?),0),?
        FROM shared_inboxes ib WHERE EXISTS(SELECT 1 FROM shared_messages m WHERE m.inbox_id=ib.id AND m.created_at<=?) OR EXISTS(SELECT 1 FROM shared_outbox e WHERE e.inbox_id=ib.id AND e.created_at<=?)
        ON CONFLICT(inbox_id) DO UPDATE SET pruned_through_cursor=max(shared_retention_watermarks.pruned_through_cursor,excluded.pruned_through_cursor),pruned_through_event_cursor=max(shared_retention_watermarks.pruned_through_event_cursor,excluded.pruned_through_event_cursor),last_pruned_at=excluded.last_pruned_at`,
        auditFloor,
        auditFloor,
        now,
        auditFloor,
        auditFloor
      ),
      // Delete dependents before their FK parents, in the same transaction.
      this.st(
        `DELETE FROM shared_deliveries WHERE event_id IN(SELECT id FROM shared_outbox WHERE created_at<=?) OR subscription_id IN(SELECT id FROM shared_subscriptions WHERE expires_at<=?)`,
        auditFloor,
        auditFloor
      ),
      this.st(
        `DELETE FROM shared_event_positions WHERE event_id IN(SELECT id FROM shared_outbox WHERE created_at<=?)`,
        auditFloor
      ),
      this.st(`DELETE FROM shared_outbox WHERE created_at<=?`, auditFloor),
      this.st(
        `UPDATE shared_subscriptions SET callback_url='',secret_ciphertext='',token_ciphertext='',previous_secret_ciphertext=NULL,previous_secret_until=NULL WHERE status='revoked' AND expires_at<=?`,
        auditFloor
      ),
      this.st(
        `DELETE FROM shared_subscriptions WHERE expires_at<=? AND status!='revoked'`,
        auditFloor
      ),
      this.st(`DELETE FROM shared_context WHERE created_at<=?`, auditFloor),
      this.st(`DELETE FROM shared_messages WHERE created_at<=?`, auditFloor),
      this.st(`DELETE FROM shared_audit WHERE created_at<=?`, auditFloor)
    ]);
    return { ok: true };
  }
}
