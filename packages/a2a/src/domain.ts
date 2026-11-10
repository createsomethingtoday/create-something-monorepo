import { PILOT_POLICY } from './domain-types';
import type { Agent, ConversationPage, ConversationParticipant, FinishMessageInput, Grant, Message, MessageKind, MessageState, Principal, SendMessageInput, SendOwnerMessageInput, SendMessageResult } from './domain-types';
export * from './domain-types';

export class DomainError extends Error {
	readonly code: string;
	readonly status: number;
	constructor(code: string, status: number, message = code, options?: ErrorOptions) {
		super(message, options);
		this.name = 'DomainError'; this.code = code; this.status = status;
	}
}

interface AgentRow { id: string; name: string; owner_subject: string; paused: number; created_at: number }
interface GrantRow { id: string; agent_id: string; sender_agent_id: string; created_at: number; revoked_at: number | null }
interface MessageRow {
	id: string; thread_id: string; sequence: number; cursor: number; from_agent_id: string; to_agent_id: string;
	text: string; created_at: number; expires_at: number; state: MessageState; claimed_until: number | null; claim_token: string | null;
	body_hash?: string; event_id?: string; author_kind: Message['authorKind']; author_name:string; kind:MessageKind; from_agent_name:string; to_agent_name:string;
}
const agent = (r: AgentRow): Agent => ({ id: r.id, name: r.name, ownerSubject: r.owner_subject, paused: r.paused === 1, createdAt: r.created_at });
const grant = (r: GrantRow): Grant => ({ id: r.id, agentId: r.agent_id, senderAgentId: r.sender_agent_id, createdAt: r.created_at, ...(r.revoked_at === null ? {} : { revokedAt: r.revoked_at }) });
function message(r: MessageRow, includeClaim = false): Message {
	return { id: r.id, threadId: r.thread_id, sequence: r.sequence, cursor: r.cursor, fromAgentId: r.from_agent_id,
		toAgentId: r.to_agent_id, fromAgentName:r.from_agent_name||r.from_agent_id,toAgentName:r.to_agent_name||r.to_agent_id,authorKind:r.author_kind,authorName:r.author_name,kind:r.kind,text: r.text, createdAt: r.created_at, expiresAt: r.expires_at, state: r.state,
		...(r.claimed_until === null ? {} : { claimedUntil: r.claimed_until }),
		...(includeClaim && r.claim_token ? { claimToken: r.claim_token } : {}) };
}
function principal(p: Principal): string {
	if (!p || typeof p.subject !== 'string' || !p.subject.trim()) throw new DomainError('unauthenticated', 401);
	return p.subject;
}
const notFound = () => new DomainError('not_found', 404, 'Inbox or message unavailable');
const invalid = (detail: string) => new DomainError('invalid_input', 400, detail);

// This predicate is evaluated in the same SQL statement as each content read or mutation.
// Revocation/pause after a prior API read cannot authorize a later write.
const AVAILABLE_MESSAGE = `m.content_deleted_at IS NULL AND m.expires_at > ?
 AND EXISTS (SELECT 1 FROM threads th WHERE th.id=m.thread_id AND th.expires_at > ?)
 AND EXISTS (SELECT 1 FROM agents a WHERE a.id=m.from_agent_id AND a.paused=0 AND a.deleted_at IS NULL)
 AND EXISTS (SELECT 1 FROM agents a WHERE a.id=m.to_agent_id AND a.paused=0 AND a.deleted_at IS NULL)
 AND EXISTS (SELECT 1 FROM grants g WHERE g.agent_id=m.to_agent_id AND g.sender_agent_id=m.from_agent_id AND g.revoked_at IS NULL)
 AND (m.sequence=1 OR EXISTS (SELECT 1 FROM grants g WHERE g.agent_id=m.from_agent_id AND g.sender_agent_id=m.to_agent_id AND g.revoked_at IS NULL))`;

/** Application boundary shared by MCP, HTTP, and CLI. No write is retried implicitly.
 * Endpoint scopes and owner-only administration are enforced by adapters; every
 * service operation independently enforces subject ownership and current grants.
 */
export class InboxService {
	private readonly db: D1Database;
	constructor(db: D1Database) { this.db = db; }
	private statement(sql: string, ...values: (string | number | null)[]): D1PreparedStatement { return this.db.prepare(sql).bind(...values); }
	private async first<T>(sql: string, ...values: (string | number | null)[]): Promise<T | null> {
		try { return await this.statement(sql, ...values).first<T>(); }
		catch (cause) { throw new DomainError('storage_unavailable', 503, 'Inbox storage unavailable', { cause }); }
	}
	private async all<T>(sql: string, ...values: (string | number | null)[]): Promise<T[]> {
		try { return (await this.statement(sql, ...values).all<T>()).results; }
		catch (cause) { throw new DomainError('storage_unavailable', 503, 'Inbox storage unavailable', { cause }); }
	}
	private async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
		try { return await this.db.batch(statements); }
		catch (cause) { throw new DomainError('storage_unavailable', 503, 'Write outcome is uncertain; reconcile before retrying', { cause }); }
	}

	async registerAgent(p: Principal, name: string): Promise<Agent> {
		const subject = principal(p);
		if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) throw invalid('Name must contain 1–80 characters');
		const row = await this.first<AgentRow>(`INSERT INTO agents(id, owner_subject, name, created_at)
 SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM agents WHERE owner_subject=? AND deleted_at IS NULL) < ?
 ON CONFLICT DO NOTHING RETURNING *`, crypto.randomUUID(), subject, name.trim(), Date.now(), subject, PILOT_POLICY.maxAgentsPerOwner);
		if (!row) throw new DomainError('agent_limit', 409, 'The pilot permits one inbox identity per owner');
		return agent(row);
	}
	async listAgents(p: Principal): Promise<Agent[]> {
		return (await this.all<AgentRow>('SELECT * FROM agents WHERE owner_subject=? AND deleted_at IS NULL ORDER BY created_at,id', principal(p))).map(agent);
	}
	async requireOwnedAgent(p: Principal, id: string): Promise<Agent> {
		const row = await this.first<AgentRow>('SELECT * FROM agents WHERE id=? AND owner_subject=? AND deleted_at IS NULL', id, principal(p));
		if (!row) throw notFound();
		return agent(row);
	}
	async setAgentPaused(p: Principal, id: string, paused: boolean): Promise<Agent> {
		if (typeof paused !== 'boolean') throw invalid('Paused must be boolean');
		const row = await this.first<AgentRow>('UPDATE agents SET paused=? WHERE id=? AND owner_subject=? AND deleted_at IS NULL RETURNING *', paused ? 1 : 0, id, principal(p));
		if (!row) throw notFound();
		return agent(row);
	}
	async grantSender(p: Principal, agentId: string, senderAgentId: string): Promise<Grant> {
		const row = await this.first<GrantRow>(`INSERT INTO grants(id,agent_id,sender_agent_id,created_at)
 SELECT ?,a.id,s.id,? FROM agents a,agents s
 WHERE a.id=? AND a.owner_subject=? AND a.deleted_at IS NULL AND a.paused=0
 AND s.id=? AND s.deleted_at IS NULL AND s.paused=0 AND a.id<>s.id
 ON CONFLICT(agent_id,sender_agent_id) DO UPDATE SET revoked_at=NULL,created_at=excluded.created_at RETURNING *`,
		crypto.randomUUID(), Date.now(), agentId, principal(p), senderAgentId);
		if (!row) throw notFound();
		return grant(row);
	}
	async revokeGrant(p: Principal, grantId: string): Promise<Grant> {
		const row = await this.first<GrantRow>(`UPDATE grants SET revoked_at=COALESCE(revoked_at,?) WHERE id=?
 AND EXISTS (SELECT 1 FROM agents a WHERE a.id=grants.agent_id AND a.owner_subject=? AND a.deleted_at IS NULL) RETURNING *`, Date.now(), grantId, principal(p));
		if (!row) throw notFound();
		return grant(row);
	}
	async listGrants(p: Principal, agentId: string): Promise<Grant[]> {
		await this.requireOwnedAgent(p, agentId);
		return (await this.all<GrantRow>(`SELECT g.* FROM grants g JOIN agents a ON a.id=g.agent_id
 WHERE a.id=? AND a.owner_subject=? AND a.deleted_at IS NULL ORDER BY g.created_at,g.id`, agentId, principal(p))).map(grant);
	}

	async sendMessage(p: Principal, input: SendMessageInput): Promise<SendMessageResult> {
		return this.persistMessage(p,input,'request','agent');
	}
	async sendOwnerMessage(p:Principal,input:SendOwnerMessageInput):Promise<SendMessageResult> {
		if(p.authentication!=='owner_session'||!p.scopes.includes('a2a:admin'))throw new DomainError('owner_session_required',403,'Use your signed-in owner console to post as yourself.');
		const kind=input.kind??'conversation';
		if(kind!=='conversation'&&kind!=='request')throw invalid('Select conversation or request.');
		return this.persistMessage(p,input,kind,'owner');
	}
	private async persistMessage(p:Principal,input:SendMessageInput,kind:MessageKind,authorKind:'owner'|'agent'):Promise<SendMessageResult> {
		const subject=principal(p);
		if (!input || typeof input.text !== 'string' || !input.text.trim() || new TextEncoder().encode(input.text).byteLength > PILOT_POLICY.maxTextBytes) throw invalid('Message must contain 1–16384 UTF-8 bytes');
		if (typeof input.idempotencyKey !== 'string' || !input.idempotencyKey.trim() || input.idempotencyKey.length > 128) throw invalid('Idempotency key must contain 1–128 characters');
		if (typeof input.fromAgentId !== 'string' || typeof input.toAgentId !== 'string' || input.fromAgentId === input.toAgentId || (input.threadId !== undefined && (typeof input.threadId !== 'string' || !input.threadId))) throw invalid('Valid distinct sender and recipient IDs are required');
		const payload=[input.fromAgentId,input.toAgentId,input.text,input.threadId??null];
		const digest=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),b=>b.toString(16).padStart(2,'0')).join('');
		const bodyHash=await digest([...payload,authorKind,kind]);
		const now=Date.now(),threadId=input.threadId??crypto.randomUUID(),messageId=crypto.randomUUID(),eventId=crypto.randomUUID();
		const ownerName=authorKind==='owner'&&typeof p.displayName==='string'&&p.displayName.trim()&&p.displayName.length<=80?p.displayName.trim():null;
		// Every statement repeats current admission inside the D1 transaction. Chat
		// shares routing and quotas, but never creates an actionable outbox event.
		const cte=`WITH input AS (SELECT ? AS subject,? AS key,? AS body_hash,? AS from_id,? AS to_id,? AS thread_id,? AS now,? AS expiry,? AS text,? AS message_id,? AS event_id,? AS kind,? AS author_kind,? AS owner_name),
 allowed AS (SELECT i.* FROM input i JOIN agents f ON f.id=i.from_id JOIN agents t ON t.id=i.to_id
 WHERE f.owner_subject=i.subject AND f.paused=0 AND t.paused=0 AND f.deleted_at IS NULL AND t.deleted_at IS NULL
 AND EXISTS (SELECT 1 FROM grants g WHERE g.agent_id=t.id AND g.sender_agent_id=f.id AND g.revoked_at IS NULL)
 AND NOT EXISTS (SELECT 1 FROM idempotency d WHERE d.owner_subject=i.subject AND d.idempotency_key=i.key)
 AND (SELECT COUNT(*) FROM messages m WHERE m.from_agent_id=f.id AND m.created_at>i.now-86400000)<${PILOT_POLICY.maxSenderMessagesPerDay}
 AND (SELECT COUNT(*) FROM messages m WHERE m.to_agent_id=t.id AND m.created_at>i.now-86400000)<${PILOT_POLICY.maxInboxMessagesPerDay}) `;
		const values=[subject,input.idempotencyKey,bodyHash,input.fromAgentId,input.toAgentId,threadId,now,now+PILOT_POLICY.actionableTtlMs,input.text,messageId,eventId,kind,authorKind,ownerName] as const;
		const statements:D1PreparedStatement[]=[];
		if(!input.threadId)statements.push(this.statement(cte+`INSERT INTO threads(id,agent_a_id,agent_b_id,created_at,expires_at) SELECT thread_id,from_id,to_id,now,expiry FROM allowed`,...values));
		statements.push(this.statement(cte+`INSERT INTO messages(id,thread_id,sequence,from_agent_id,to_agent_id,text,created_at,expires_at,state,kind,author_kind,author_name,from_agent_name,to_agent_name)
 SELECT i.message_id,th.id,COALESCE((SELECT MAX(sequence) FROM messages WHERE thread_id=th.id),0)+1,i.from_id,i.to_id,i.text,i.now,MIN(i.expiry,th.expires_at),CASE WHEN i.kind='conversation' THEN 'posted' ELSE 'pending' END,i.kind,i.author_kind,
 CASE WHEN i.author_kind='owner' THEN COALESCE(i.owner_name,'Owner of '||f.name) ELSE f.name END,f.name,t.name
 FROM allowed i JOIN threads th ON th.id=i.thread_id JOIN agents f ON f.id=i.from_id JOIN agents t ON t.id=i.to_id
 WHERE th.expires_at>i.now AND ((th.agent_a_id=i.from_id AND th.agent_b_id=i.to_id) OR (th.agent_a_id=i.to_id AND th.agent_b_id=i.from_id))
 AND (i.kind='conversation' OR (SELECT COUNT(*) FROM messages WHERE thread_id=th.id AND kind='request')<${PILOT_POLICY.maxThreadMessages})
 ${input.threadId?'AND EXISTS (SELECT 1 FROM grants g WHERE g.agent_id=i.from_id AND g.sender_agent_id=i.to_id AND g.revoked_at IS NULL)':''}`,...values));
		statements.push(this.statement(`INSERT INTO idempotency(owner_subject,idempotency_key,body_hash,message_id,created_at) SELECT ?,?,?,id,? FROM messages WHERE id=?`,subject,input.idempotencyKey,bodyHash,now,messageId));
		if(kind==='request')statements.push(this.statement('INSERT INTO outbox_events(id,message_id,recipient_agent_id,created_at) SELECT ?,id,to_agent_id,created_at FROM messages WHERE id=?',eventId,messageId));
		statements.push(this.statement(`INSERT INTO audit_events(id,actor_subject,action,agent_id,message_id,created_at) SELECT ?,?,?,to_agent_id,id,created_at FROM messages WHERE id=?`,crypto.randomUUID(),subject,authorKind==='owner'?'owner.message.created':'message.created',messageId));
		statements.push(this.statement(`SELECT m.*,d.body_hash,o.id AS event_id FROM idempotency d JOIN messages m ON m.id=d.message_id LEFT JOIN outbox_events o ON o.message_id=m.id WHERE d.owner_subject=? AND d.idempotency_key=? AND EXISTS (SELECT 1 FROM agents f WHERE f.id=m.from_agent_id AND f.owner_subject=? AND f.deleted_at IS NULL)`,subject,input.idempotencyKey,subject));
		const result=await this.batch(statements),row=result[result.length-1].results?.[0] as unknown as MessageRow|undefined;
		if(!row) {
			// Diagnose a full work budget only after independently rechecking the
			// same current owner, pair, grants, pause and expiry boundary.
			if(kind==='request'&&input.threadId) {
				const full=await this.first<{full:number}>(`SELECT 1 AS full FROM threads th JOIN agents f ON f.id=? JOIN agents t ON t.id=?
 WHERE th.id=? AND th.expires_at>? AND f.owner_subject=? AND f.paused=0 AND t.paused=0 AND f.deleted_at IS NULL AND t.deleted_at IS NULL
 AND ((th.agent_a_id=f.id AND th.agent_b_id=t.id) OR (th.agent_a_id=t.id AND th.agent_b_id=f.id))
 AND EXISTS(SELECT 1 FROM grants g WHERE g.agent_id=t.id AND g.sender_agent_id=f.id AND g.revoked_at IS NULL)
 AND EXISTS(SELECT 1 FROM grants g WHERE g.agent_id=f.id AND g.sender_agent_id=t.id AND g.revoked_at IS NULL)
 AND (SELECT COUNT(*) FROM messages m WHERE m.thread_id=th.id AND m.kind='request')>=?`,input.fromAgentId,input.toAgentId,input.threadId,Date.now(),subject,PILOT_POLICY.maxThreadMessages);
				if(full)throw new DomainError('work_budget_exhausted',409,'This thread has reached its eight-work-message limit. You can still post conversation, or start a new thread for more work.');
			}
			throw new DomainError('send_not_allowed',403,'Send unavailable: check counterpart approval, active inboxes, work budget, expiry, and pilot limits');
		}
		if(row.body_hash!==bodyHash&&!(row.author_kind==='legacy'&&authorKind==='agent'&&kind==='request'&&row.body_hash===await digest(payload)))throw new DomainError('idempotency_conflict',409,'Idempotency key already used for a different request');
		const visible=await this.readMessage(p,row.id);
		return {message:visible,duplicate:row.id!==messageId,...(row.event_id?{eventId:row.event_id}:{})};
	}
	async listMessages(p: Principal, agentId: string, after = 0, includeSent = false): Promise<Message[]> {
		if (!Number.isSafeInteger(after) || after < 0) throw invalid('Cursor must be a nonnegative integer');
		const owned = await this.requireOwnedAgent(p, agentId);
		if (owned.paused) throw new DomainError('inbox_paused', 409);
		const now = Date.now();
		return (await this.all<MessageRow>(`SELECT m.* FROM messages m WHERE (m.to_agent_id=? OR (?=1 AND m.from_agent_id=?)) AND m.cursor>? AND m.kind='request'
 AND EXISTS (SELECT 1 FROM agents a WHERE a.id=? AND a.owner_subject=?)
 AND ${AVAILABLE_MESSAGE} ORDER BY m.cursor LIMIT 100`, agentId, includeSent ? 1 : 0, agentId, after, agentId, principal(p), now, now)).map(r => message(r));
	}
	/** Console history starts with current work; older pages use an exclusive cursor.
	 * MCP inbox reads retain their ascending incremental `after` contract. */
	async listConversationPage(p: Principal, agentId: string, before = Number.MAX_SAFE_INTEGER): Promise<{messages:Message[];hasMore:boolean;nextBefore:number|null}> {
		if (!Number.isSafeInteger(before) || before < 0) throw invalid('Cursor must be a nonnegative integer');
		const owned = await this.requireOwnedAgent(p, agentId);
		if (owned.paused) throw new DomainError('inbox_paused', 409);
		const now = Date.now();
		const rows = await this.all<MessageRow>(`SELECT m.* FROM messages m WHERE (m.to_agent_id=? OR m.from_agent_id=?) AND m.cursor<?
 AND EXISTS (SELECT 1 FROM agents a WHERE a.id=? AND a.owner_subject=?)
 AND ${AVAILABLE_MESSAGE} ORDER BY m.cursor DESC LIMIT 101`, agentId, agentId, before, agentId, principal(p), now, now);
		const page = rows.slice(0,100);
		return {messages:page.map(r=>message(r)).reverse(),hasMore:rows.length>100,nextBefore:page.at(-1)?.cursor??null};
	}
	async readMessage(p: Principal, messageId: string): Promise<Message> {
		const now = Date.now();
		const row = await this.first<MessageRow>(`SELECT m.* FROM messages m WHERE m.id=?
 AND EXISTS (SELECT 1 FROM agents a WHERE (a.id=m.from_agent_id OR a.id=m.to_agent_id) AND a.owner_subject=? AND a.deleted_at IS NULL)
 AND ${AVAILABLE_MESSAGE}`, messageId, principal(p), now, now);
		if (!row) throw notFound();
		return message(row);
	}
	private async conversationParticipants(p:Principal,agentId:string,threadId:string):Promise<ConversationParticipant[]> {
		const owned=await this.requireOwnedAgent(p,agentId);
		if(owned.paused)throw new DomainError('inbox_paused',409);
		const now=Date.now(),subject=principal(p);
		const visible=`EXISTS (SELECT 1 FROM messages m WHERE m.thread_id=th.id AND ${AVAILABLE_MESSAGE})`;
		const rows=await this.all<AgentRow&{monitoring_active:number;owner_name:string}>(`SELECT a.*,
 COALESCE((SELECT m.author_name FROM messages m WHERE m.thread_id=th.id AND m.from_agent_id=a.id AND m.author_kind='owner' AND ${AVAILABLE_MESSAGE} ORDER BY m.cursor DESC LIMIT 1),'Owner of '||a.name) AS owner_name,
 EXISTS(SELECT 1 FROM subscriptions s WHERE s.agent_id=a.id AND s.owner_subject=a.owner_subject AND s.status='active' AND s.verified_at>0 AND s.expires_at>?) AS monitoring_active
 FROM threads th JOIN agents a ON (a.id=th.agent_a_id OR a.id=th.agent_b_id)
 WHERE th.id=? AND (th.agent_a_id=? OR th.agent_b_id=?)
 AND EXISTS(SELECT 1 FROM agents own WHERE own.id=? AND own.owner_subject=? AND own.deleted_at IS NULL)
 AND ${visible} ORDER BY a.id`,now,now,now,threadId,agentId,agentId,agentId,subject,now,now);
		if(rows.length!==2)throw notFound();
		return rows.map(r=>({agentId:r.id,agentName:r.name,ownerName:r.owner_name,paused:r.paused===1,monitoringActive:r.monitoring_active===1}));
	}
	/** MCP context is ascending and incremental; ordinary chat is never assignment. */
	async readThread(p:Principal,agentId:string,threadId:string,after=0):Promise<ConversationPage> {
		if(!Number.isSafeInteger(after)||after<0)throw invalid('Cursor must be a nonnegative integer');
		const participants=await this.conversationParticipants(p,agentId,threadId),now=Date.now();
		const messages=await this.all<MessageRow>(`SELECT m.* FROM messages m WHERE m.thread_id=? AND m.cursor>?
 AND (m.from_agent_id=? OR m.to_agent_id=?)
 AND EXISTS(SELECT 1 FROM agents own WHERE own.id=? AND own.owner_subject=? AND own.deleted_at IS NULL)
 AND ${AVAILABLE_MESSAGE} ORDER BY m.cursor LIMIT 101`,threadId,after,agentId,agentId,agentId,principal(p),now,now);
		const page=messages.slice(0,100);
		return {threadId,participants,messages:page.map(r=>message(r)),hasMore:messages.length>100,nextAfter:page.at(-1)?.cursor??null};
	}
	/** Owner UI starts with latest context; earlier pages retain exclusive cursors. */
	async readThreadHistory(p:Principal,agentId:string,threadId:string,before=Number.MAX_SAFE_INTEGER):Promise<Omit<ConversationPage,'nextAfter'>&{nextBefore:number|null}> {
		if(!Number.isSafeInteger(before)||before<0)throw invalid('Cursor must be a nonnegative integer');
		const participants=await this.conversationParticipants(p,agentId,threadId),now=Date.now();
		const messages=await this.all<MessageRow>(`SELECT m.* FROM messages m WHERE m.thread_id=? AND m.cursor<?
 AND (m.from_agent_id=? OR m.to_agent_id=?)
 AND EXISTS(SELECT 1 FROM agents own WHERE own.id=? AND own.owner_subject=? AND own.deleted_at IS NULL)
 AND ${AVAILABLE_MESSAGE} ORDER BY m.cursor DESC LIMIT 101`,threadId,before,agentId,agentId,agentId,principal(p),now,now);
		const page=messages.slice(0,100);
		return {threadId,participants,messages:page.map(r=>message(r)).reverse(),hasMore:messages.length>100,nextBefore:page.at(-1)?.cursor??null};
	}
	async claimMessage(p: Principal, messageId: string): Promise<Message> {
		const now = Date.now(), token = crypto.randomUUID();
		const row = await this.first<MessageRow>(`UPDATE messages AS m SET state='claimed',claim_token=?,claimed_until=? WHERE m.id=?
 AND m.kind='request' AND (m.state='pending' OR (m.state='claimed' AND m.claimed_until<=?))
 AND EXISTS (SELECT 1 FROM agents a WHERE a.id=m.to_agent_id AND a.owner_subject=?) AND ${AVAILABLE_MESSAGE} RETURNING *`, token, now + PILOT_POLICY.claimLeaseMs, messageId, now, principal(p), now, now);
		if (!row) throw new DomainError('claim_unavailable', 409, 'Message unavailable or already claimed');
		return message(row, true);
	}
	async finishMessage(p: Principal, messageId: string, input: FinishMessageInput): Promise<Message> {
		if (!input || !['completed', 'rejected', 'approval_required'].includes(input.state) || typeof input.claimToken !== 'string' || !input.claimToken) throw invalid('A valid terminal state and claim token are required');
		const now = Date.now();
		const row = await this.first<MessageRow>(`UPDATE messages AS m SET state=?,claim_token=NULL,claimed_until=NULL WHERE m.id=? AND m.state='claimed'
 AND m.claim_token=? AND m.claimed_until>? AND EXISTS (SELECT 1 FROM agents a WHERE a.id=m.to_agent_id AND a.owner_subject=?)
 AND ${AVAILABLE_MESSAGE} RETURNING *`, input.state, messageId, input.claimToken, now, principal(p), now, now);
		if (!row) throw new DomainError('finish_unavailable', 409, 'Message unavailable or claim expired');
		return message(row);
	}

	/** Scheduled maintenance only; no user-controlled retention overrides. Content is
	 * nulled at 30 days. IDs and audit metadata remain for 90-day reconciliation.
	 * Delivery adapters must independently stop expired/deleted content before egress.
	 */
	async pruneRetention(): Promise<void> {
		const now = Date.now();
		await this.batch([
			this.statement(`UPDATE messages SET text=NULL,content_deleted_at=?,state=CASE WHEN state IN ('pending','claimed') THEN 'rejected' ELSE state END,claim_token=NULL,claimed_until=NULL WHERE created_at<=? AND content_deleted_at IS NULL`, now, now - PILOT_POLICY.contentRetentionMs),
			this.statement('DELETE FROM audit_events WHERE created_at<=?', now - PILOT_POLICY.auditRetentionMs),
			this.statement('DELETE FROM idempotency WHERE created_at<=?', now - PILOT_POLICY.auditRetentionMs)
		]);
	}
}
