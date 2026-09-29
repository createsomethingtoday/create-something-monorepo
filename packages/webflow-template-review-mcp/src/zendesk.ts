// Ported verbatim from packages/webflow-app-review-mcp/src/zendesk.ts (2026-09-29)
// so template reviewers get the same Zendesk leg as app reviewers. Both MCPs
// share the Marketplace Review Team group and the Asset Versions table, so the
// safety properties (escape-first HTML, group-scoped status writes, fresh-read
// preconditions) are identical. Keep the two files in sync until the client is
// consolidated into a shared package. Deliberate divergences from the source:
// the local FetchFn alias, `agentTicketUrl()` (subdomain-aware links),
// `parseZendeskGroupId()`, renderer hardening (quotes escaped, only http(s)
// link targets become anchors), safe_update/updated_stamp on status writes, and
// hiding the raw comment count from public-only reads, and paging until `limit`
// visible comments are collected, and `createOutboundTicket()` — port back per CRE-2176.

type FetchFn = typeof fetch;

// Creator-facing Zendesk follow-ups bypass the Airtable email composer, so this
// module owns the same safety property the patched composer has: input is
// HTML-escaped BEFORE any markdown-to-HTML conversion. A literal <script> tag in
// reviewer text renders as visible text instead of being parsed as markup and
// truncating the delivered email (observed: Onart ZD 1170959; Wistia ZD 1170775).

export class ZendeskClientError extends Error {
  code: string;
  status?: number;
  details?: unknown;

  constructor(code: string, message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ZendeskClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Escape-first markdown-to-HTML, matching the patched composer's dialect so
// follow-ups render like the automated review emails: inline code, bold,
// italic, [text](url) links, <https://…> autolinks, ordered/unordered lists,
// newlines as <br>.
export function renderCreatorFacingHtml(markdown: string): string {
  let html = escapeHtml(markdown);

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Only http(s) targets become anchors; anything else stays literal text. Quotes
  // are already &quot; from escapeHtml, so the href attribute cannot be broken out of.
  html = html.replace(/\[([^\]]*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/&lt;(https?:\/\/[^\s]+?)&gt;/g, '<a href="$1">$1</a>');

  const lines = html.split('\n');
  const result: string[] = [];
  let openList: 'ol' | 'ul' | null = null;

  const closeList = () => {
    if (openList) {
      result.push(`</li></${openList}>`);
      openList = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const ordered = line.match(/^\d+\.\s+(.*)$/);
    const unordered = line.match(/^-\s+(.*)$/);

    if (ordered || unordered) {
      const listType: 'ol' | 'ul' = ordered ? 'ol' : 'ul';
      const content = (ordered ?? unordered)![1];
      if (openList === listType) {
        result.push(`</li><li>${content}`);
      } else {
        closeList();
        result.push(`<${listType}><li>${content}`);
        openList = listType;
      }
    } else {
      closeList();
      result.push(line);
    }
  }
  closeList();

  return result
    .join('\n')
    .replace(/\n/g, '<br>')
    .replace(/<br><\/li>/g, '</li>')
    .replace(/(<\/(?:ol|ul)>)<br>/g, '$1')
    .replace(/<br>(<(?:ol|ul)>)/g, '$1');
}

export interface ZendeskClientOptions {
  subdomain: string;
  email: string;
  apiToken: string;
  fetchFn?: FetchFn;
  /** Zendesk group that owns Marketplace review tickets. Search defaults to it; status writes are confined to it. */
  marketplaceGroupId?: number;
}

/** Marketplace Review Team group in webflow2579. Programs Support (46157931219347) is NOT in scope. */
export const DEFAULT_MARKETPLACE_GROUP_ID = 1500002744702;

/**
 * Parse MARKETPLACE_ZENDESK_GROUP_ID. A malformed value would otherwise become NaN,
 * which scopes every search to `group:NaN` and refuses every status write; fall
 * back to the default group and warn instead.
 */
export function parseZendeskGroupId(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') return undefined;
  const trimmed = raw.trim();
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || String(parsed) !== trimmed) {
    console.warn(`[zendesk] MARKETPLACE_ZENDESK_GROUP_ID "${raw}" is not a positive integer; using default ${DEFAULT_MARKETPLACE_GROUP_ID}.`);
    return undefined;
  }
  return parsed;
}

export const ZENDESK_WRITABLE_STATUSES = ['new', 'open', 'pending', 'hold', 'solved'] as const;
export type ZendeskWritableStatus = (typeof ZENDESK_WRITABLE_STATUSES)[number];
export type ZendeskSearchScope = 'marketplace_review' | 'all';

export interface TicketSearchParams {
  query?: string;
  status?: string;
  tags?: string[];
  requesterEmail?: string;
  assigneeId?: number;
  createdAfter?: string;
  createdBefore?: string;
  sortBy?: 'updated_at' | 'created_at' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  scope?: ZendeskSearchScope;
}

export interface TicketSearchHit {
  ticketId: string;
  subject: string | null;
  status: string | null;
  priority: string | null;
  requesterId: number | null;
  assigneeId: number | null;
  groupId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  tags: string[];
}

export interface TicketSearchResult {
  scope: ZendeskSearchScope;
  query: string;
  count: number | null;
  hasMore: boolean;
  tickets: TicketSearchHit[];
}

export interface TicketStatusUpdate {
  status: ZendeskWritableStatus;
  expectedStatus: string;
  additionalTags?: string[];
  removeTags?: string[];
  privateNote?: string;
}

export interface TicketStatusUpdateResult {
  ticketId: string;
  previousStatus: string;
  status: string | null;
  tags: string[];
  auditId?: number;
}

export interface TicketCommentResult {
  ticketId: string;
  isPublic: boolean;
  auditId?: number;
  ticketStatus?: string;
}

export interface OutboundTicketInput {
  requesterEmail: string;
  requesterName?: string;
  subject: string;
  /** Creator-facing message, already rendered to HTML (renderCreatorFacingHtml). Posted as a public agent update. */
  publicHtml: string;
  /** Private first comment (audit trail for the team); never emailed. */
  internalNoteHtml: string;
  tags?: string[];
  /**
   * Idempotency key stored as the ticket's external_id. Before creating, the client searches
   * for an existing ticket with this external_id and refuses to create a second one
   * (ZENDESK_OUTBOUND_TICKET_EXISTS), so a lost create response cannot become a duplicate.
   */
  externalId?: string;
}

export interface TicketSummary {
  ticketId: string;
  status: string | null;
  groupId: number | null;
  brandId: number | null;
  tags: string[];
  externalId: string | null;
  requesterId: number | null;
  requesterEmail: string | null;
}

export interface OutboundTicketResult {
  ticketId: string;
  status: string | null;
  groupId: number | null;
  brandId: number | null;
  requesterId: number | null;
  agentId: number;
  publicCommentAuditId?: number;
  /** true = a Notification event to the requester was found in the audit trail; null = could not verify. */
  requesterNotified: boolean | null;
  steps: string[];
}

export interface TicketThreadAuthor {
  id: number | null;
  name: string | null;
  role: string | null;
  email: string | null;
}

export interface TicketThreadComment {
  id: number;
  createdAt: string | null;
  isPublic: boolean;
  author: TicketThreadAuthor;
  body: string;
  attachments: Array<{ fileName: string | null; contentType: string | null; url: string | null }>;
}

export interface TicketThread {
  ticketId: string;
  subject: string | null;
  status: string | null;
  priority: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  tags: string[];
  requester: TicketThreadAuthor | null;
  assignee: TicketThreadAuthor | null;
  comments: TicketThreadComment[];
  totalCommentsOnTicket: number | null;
  /** True when older visible comments exist beyond the returned window (raise `limit` to read further back). */
  hasOlderComments: boolean;
  includesInternalNotes: boolean;
}

export class ZendeskClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly fetchFn: FetchFn;
  readonly subdomain: string;
  readonly marketplaceGroupId: number;

  constructor(options: ZendeskClientOptions) {
    this.subdomain = options.subdomain;
    this.baseUrl = `https://${options.subdomain}.zendesk.com/api/v2`;
    this.authHeader = `Basic ${btoa(`${options.email}/token:${options.apiToken}`)}`;
    this.fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init));
    this.marketplaceGroupId = options.marketplaceGroupId ?? DEFAULT_MARKETPLACE_GROUP_ID;
  }

  private agentIdCache: number | null = null;

  /** The Zendesk user the API token authenticates as (ZENDESK_API_EMAIL). Cached per client. */
  async getAuthenticatedAgentId(): Promise<number> {
    if (this.agentIdCache !== null) return this.agentIdCache;
    const res = await this.fetchFn(`${this.baseUrl}/users/me.json`, {
      headers: { Authorization: this.authHeader, Accept: 'application/json' },
    });
    if (!res.ok) await this.failFrom(res, 'users/me read');
    const payload = (await res.json()) as { user?: { id?: number } };
    if (typeof payload.user?.id !== 'number') {
      throw new ZendeskClientError('ZENDESK_AGENT_UNRESOLVED', 'Zendesk did not return an authenticated user id.', 502);
    }
    this.agentIdCache = payload.user.id;
    return this.agentIdCache;
  }

  /**
   * Open a NEW outbound ticket to a creator and actually notify them. Zendesk's create
   * event does not email Marketplace-brand requesters and attributes an author-less
   * comment to the requester, and triggers re-route new tickets out of the Marketplace
   * Review group. So: (1) create with a PRIVATE agent-authored note, (2) pin the group
   * back to Marketplace Review, (3) post the public message as an agent UPDATE, which
   * fires the requester email, (4) confirm a Notification event in the audit trail.
   * If a step after creation fails, the error carries the ticket id so the operator can
   * finish by hand instead of creating a duplicate.
   */
  async createOutboundTicket(input: OutboundTicketInput): Promise<OutboundTicketResult> {
    const headers = { Authorization: this.authHeader, Accept: 'application/json', 'Content-Type': 'application/json' };
    const steps: string[] = [];
    const agentId = await this.getAuthenticatedAgentId();
    steps.push(`agent:${agentId}`);

    if (input.externalId) {
      const existing = await this.findTicketByExternalId(input.externalId);
      if (existing) {
        throw new ZendeskClientError(
          'ZENDESK_OUTBOUND_TICKET_EXISTS',
          `A ticket with this idempotency key already exists (${existing}). Read it before sending anything else; do not create a duplicate.`,
          409,
          { ticketId: existing, ticketUrl: this.agentTicketUrl(existing), externalId: input.externalId },
        );
      }
      steps.push('idempotency_checked');
    }

    const createRes = await this.fetchFn(`${this.baseUrl}/tickets.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ticket: {
          subject: input.subject,
          requester: { email: input.requesterEmail, ...(input.requesterName ? { name: input.requesterName } : {}) },
          group_id: this.marketplaceGroupId,
          ...(input.externalId ? { external_id: input.externalId } : {}),
          ...(input.tags?.length ? { tags: input.tags } : {}),
          comment: { html_body: input.internalNoteHtml, public: false, author_id: agentId },
        },
      }),
    });
    if (!createRes.ok) await this.failFrom(createRes, 'ticket create');
    type RawTicket = { id?: number; status?: string; group_id?: number | null; brand_id?: number | null; requester_id?: number | null };
    const created = ((await createRes.json()) as { ticket?: RawTicket }).ticket ?? {};
    if (typeof created.id !== 'number') {
      throw new ZendeskClientError('ZENDESK_REQUEST_FAILED', 'Zendesk ticket create returned no ticket id.', 502, { steps });
    }
    const ticketId = String(created.id);
    steps.push('created');
    let ticket: RawTicket = created;

    const incomplete = (step: string, res: Response | null, extra?: unknown): never => {
      throw new ZendeskClientError(
        'ZENDESK_OUTBOUND_TICKET_INCOMPLETE',
        `Ticket ${ticketId} was created but step "${step}" failed${res ? ` with status ${res.status}` : ''}. Finish it in Zendesk instead of creating another ticket.`,
        res?.status ?? 502,
        { ticketId, ticketUrl: this.agentTicketUrl(ticketId), failedStep: step, steps, extra },
      );
    };

    try {
      if (ticket.group_id !== this.marketplaceGroupId) {
        const groupRes = await this.fetchFn(`${this.baseUrl}/tickets/${ticketId}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ ticket: { group_id: this.marketplaceGroupId } }),
        });
        if (!groupRes.ok) incomplete('group_fix', groupRes);
        ticket = ((await groupRes.json()) as { ticket?: RawTicket }).ticket ?? ticket;
        steps.push(`group_fixed:${ticket.group_id ?? 'unknown'}`);
      }

      const publicRes = await this.fetchFn(`${this.baseUrl}/tickets/${ticketId}.json`, {
        method: 'PUT',
        headers,
        // status:'open' is required, not cosmetic — every "Email > Public reply" trigger in
        // webflow2579 has `status is_not new`, so a public update on a `new` ticket emails nobody
        // (observed on ticket 1199586, 2026-09-29).
        body: JSON.stringify({ ticket: { status: 'open', comment: { html_body: input.publicHtml, public: true, author_id: agentId } } }),
      });
      if (!publicRes.ok) incomplete('public_comment', publicRes);
      const publicPayload = (await publicRes.json()) as { ticket?: RawTicket; audit?: { id?: number } };
      ticket = publicPayload.ticket ?? ticket;
      steps.push('public_comment_posted');

      let requesterNotified: boolean | null = null;
      const auditsRes = await this.fetchFn(`${this.baseUrl}/tickets/${ticketId}/audits.json`, {
        headers: { Authorization: this.authHeader, Accept: 'application/json' },
      });
      if (auditsRes.ok) {
        const audits = (await auditsRes.json()) as {
          audits?: Array<{ events?: Array<{ type?: string; recipients?: number[] }> }>;
        };
        const requesterId = ticket.requester_id ?? null;
        requesterNotified =
          requesterId !== null &&
          (audits.audits ?? []).some((a) =>
            (a.events ?? []).some((e) => e.type === 'Notification' && (e.recipients ?? []).includes(requesterId)),
          );
        steps.push(requesterNotified ? 'notification_verified' : 'notification_not_found');
      } else {
        steps.push('audit_read_failed');
      }

      return {
        ticketId,
        status: ticket.status ?? null,
        groupId: ticket.group_id ?? null,
        brandId: ticket.brand_id ?? null,
        requesterId: ticket.requester_id ?? null,
        agentId,
        publicCommentAuditId: publicPayload.audit?.id,
        requesterNotified,
        steps,
      };
    } catch (error) {
      if (error instanceof ZendeskClientError) throw error;
      return incomplete('unexpected', null, error instanceof Error ? error.message : String(error));
    }
  }

  /** Read one ticket's routing and requester identity (no comments). Used to verify a ticket before trusting it. */
  async getTicketSummary(ticketId: string): Promise<TicketSummary> {
    if (!/^\d+$/.test(ticketId)) {
      throw new ZendeskClientError('INVALID_TICKET_ID', 'Zendesk ticket ID must be numeric.', 400, { ticketId });
    }
    const res = await this.fetchFn(`${this.baseUrl}/tickets/${ticketId}.json?include=users`, {
      headers: { Authorization: this.authHeader, Accept: 'application/json' },
    });
    if (!res.ok) await this.failFrom(res, 'ticket read', ticketId);
    const payload = (await res.json()) as {
      ticket?: { status?: string; group_id?: number | null; brand_id?: number | null; tags?: string[]; external_id?: string | null; requester_id?: number | null };
      users?: Array<{ id?: number; email?: string }>;
    };
    const t = payload.ticket ?? {};
    const requester = (payload.users ?? []).find((u) => u.id === t.requester_id);
    return {
      ticketId,
      status: t.status ?? null,
      groupId: t.group_id ?? null,
      brandId: t.brand_id ?? null,
      tags: t.tags ?? [],
      externalId: t.external_id ?? null,
      requesterId: t.requester_id ?? null,
      requesterEmail: requester?.email ?? null,
    };
  }

  /** Find a ticket previously created with this external_id (idempotency key), if any. */
  async findTicketByExternalId(externalId: string): Promise<string | null> {
    const search = new URLSearchParams({ query: `type:ticket external_id:${externalId}`, per_page: '1' });
    const res = await this.fetchFn(`${this.baseUrl}/search.json?${search.toString()}`, {
      headers: { Authorization: this.authHeader, Accept: 'application/json' },
    });
    if (!res.ok) await this.failFrom(res, 'external_id search');
    const payload = (await res.json()) as { results?: Array<{ id?: number; result_type?: string }> };
    const hit = (payload.results ?? []).find((r) => typeof r.id === 'number' && (!r.result_type || r.result_type === 'ticket'));
    return hit ? String(hit.id) : null;
  }

  /** Agent-UI link for a ticket on the configured Zendesk instance. */
  agentTicketUrl(ticketId: string): string {
    return `https://${this.subdomain}.zendesk.com/agent/tickets/${ticketId}`;
  }

  private async failFrom(res: Response, label: string, ticketId?: string): Promise<never> {
    let details: unknown;
    try {
      details = await res.json();
    } catch {
      details = await res.text().catch(() => undefined);
    }
    const code =
      res.status === 404 ? 'ZENDESK_TICKET_NOT_FOUND' : res.status === 429 ? 'ZENDESK_RATE_LIMITED' : 'ZENDESK_REQUEST_FAILED';
    throw new ZendeskClientError(code, `Zendesk ${label} failed with status ${res.status}.`, res.status, { ticketId, details });
  }

  /** Build a Zendesk search string. Scope defaults to the Marketplace Review group. */
  buildSearchQuery(params: TicketSearchParams): string {
    const parts = ['type:ticket'];
    if ((params.scope ?? 'marketplace_review') === 'marketplace_review') parts.push(`group:${this.marketplaceGroupId}`);
    if (params.query?.trim()) parts.push(params.query.trim());
    if (params.status) parts.push(`status:${params.status}`);
    for (const tag of params.tags ?? []) {
      const t = tag.trim();
      if (t) parts.push(`tags:${t}`);
    }
    if (params.requesterEmail?.trim()) parts.push(`requester:${params.requesterEmail.trim()}`);
    if (params.assigneeId) parts.push(`assignee:${params.assigneeId}`);
    if (params.createdAfter) parts.push(`created>${params.createdAfter}`);
    if (params.createdBefore) parts.push(`created<${params.createdBefore}`);
    return parts.join(' ');
  }

  /** Read-only ticket search. */
  async searchTickets(params: TicketSearchParams = {}): Promise<TicketSearchResult> {
    const scope: ZendeskSearchScope = params.scope ?? 'marketplace_review';
    const query = this.buildSearchQuery({ ...params, scope });
    const search = new URLSearchParams({ query, per_page: String(Math.min(Math.max(params.limit ?? 25, 1), 100)) });
    if (params.sortBy) search.set('sort_by', params.sortBy);
    if (params.sortOrder) search.set('sort_order', params.sortOrder);
    const res = await this.fetchFn(`${this.baseUrl}/search.json?${search.toString()}`, {
      headers: { Authorization: this.authHeader, Accept: 'application/json' },
    });
    if (!res.ok) await this.failFrom(res, 'ticket search');
    const payload = (await res.json()) as {
      results?: Array<{
        id: number;
        result_type?: string;
        subject?: string;
        status?: string;
        priority?: string | null;
        requester_id?: number | null;
        assignee_id?: number | null;
        group_id?: number | null;
        created_at?: string;
        updated_at?: string;
        tags?: string[];
      }>;
      count?: number;
      next_page?: string | null;
    };
    const tickets = (payload.results ?? [])
      .filter((r) => !r.result_type || r.result_type === 'ticket')
      .map<TicketSearchHit>((r) => ({
        ticketId: String(r.id),
        subject: r.subject ?? null,
        status: r.status ?? null,
        priority: r.priority ?? null,
        requesterId: r.requester_id ?? null,
        assigneeId: r.assignee_id ?? null,
        groupId: r.group_id ?? null,
        createdAt: r.created_at ?? null,
        updatedAt: r.updated_at ?? null,
        tags: r.tags ?? [],
      }));
    return {
      scope,
      query,
      count: typeof payload.count === 'number' ? payload.count : null,
      hasMore: Boolean(payload.next_page),
      tickets,
    };
  }

  /**
   * Change a ticket's status (and tags) with a fresh-read precondition.
   * Refuses tickets outside the Marketplace Review group and never posts a public comment.
   */
  async updateTicketStatus(ticketId: string, update: TicketStatusUpdate): Promise<TicketStatusUpdateResult> {
    if (!/^\d+$/.test(ticketId)) {
      throw new ZendeskClientError('INVALID_TICKET_ID', 'Zendesk ticket ID must be numeric.', 400, { ticketId });
    }
    if (!(ZENDESK_WRITABLE_STATUSES as readonly string[]).includes(update.status)) {
      throw new ZendeskClientError(
        'INVALID_TICKET_STATUS',
        `Status must be one of ${ZENDESK_WRITABLE_STATUSES.join(', ')}. "closed" is set by Zendesk, not by the API.`,
        400,
        { status: update.status },
      );
    }
    const headers = { Authorization: this.authHeader, Accept: 'application/json' };
    const current = await this.fetchFn(`${this.baseUrl}/tickets/${ticketId}.json`, { headers });
    if (!current.ok) await this.failFrom(current, 'ticket read', ticketId);
    const { ticket } = (await current.json()) as {
      ticket?: { status?: string; group_id?: number | null; tags?: string[]; updated_at?: string };
    };
    const previousStatus = ticket?.status ?? 'unknown';
    if (ticket?.group_id !== this.marketplaceGroupId) {
      throw new ZendeskClientError(
        'ZENDESK_TICKET_OUT_OF_SCOPE',
        `Ticket ${ticketId} is not in the Marketplace Review group; status writes are confined to that group.`,
        403,
        { ticketId, groupId: ticket?.group_id ?? null, marketplaceGroupId: this.marketplaceGroupId },
      );
    }
    if (previousStatus !== update.expectedStatus) {
      throw new ZendeskClientError(
        'ZENDESK_STATUS_CONFLICT',
        `Ticket ${ticketId} is "${previousStatus}", not "${update.expectedStatus}". Re-read and confirm again.`,
        409,
        { ticketId, currentStatus: previousStatus, expectedStatus: update.expectedStatus },
      );
    }
    const body: Record<string, unknown> = { status: update.status };
    // Zendesk's provider-side precondition: the PUT is rejected with 409 if the ticket
    // changed after the read above, so the expected-status check holds under concurrency.
    if (ticket?.updated_at) {
      body.safe_update = true;
      body.updated_stamp = ticket.updated_at;
    }
    if (update.additionalTags?.length) body.additional_tags = update.additionalTags;
    if (update.removeTags?.length) body.remove_tags = update.removeTags;
    if (update.privateNote?.trim()) body.comment = { body: update.privateNote.trim(), public: false };
    const res = await this.fetchFn(`${this.baseUrl}/tickets/${ticketId}.json`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket: body }),
    });
    if (res.status === 409) {
      throw new ZendeskClientError(
        'ZENDESK_STATUS_CONFLICT',
        `Ticket ${ticketId} changed after it was read (Zendesk safe_update rejected the write). Re-read and confirm again.`,
        409,
        { ticketId, expectedStatus: update.expectedStatus, updatedStamp: ticket?.updated_at ?? null },
      );
    }
    if (!res.ok) await this.failFrom(res, 'ticket status update', ticketId);
    const payload = (await res.json()) as { ticket?: { status?: string; tags?: string[] }; audit?: { id?: number } };
    return {
      ticketId,
      previousStatus,
      status: payload.ticket?.status ?? null,
      tags: payload.ticket?.tags ?? ticket?.tags ?? [],
      auditId: payload.audit?.id,
    };
  }

  async addTicketComment(
    ticketId: string,
    input: { htmlBody: string; isPublic: boolean },
  ): Promise<TicketCommentResult> {
    if (!/^\d+$/.test(ticketId)) {
      throw new ZendeskClientError('INVALID_TICKET_ID', 'Zendesk ticket ID must be numeric.', 400, { ticketId });
    }

    const response = await this.fetchFn(`${this.baseUrl}/tickets/${ticketId}.json`, {
      method: 'PUT',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticket: {
          comment: {
            html_body: input.htmlBody,
            public: input.isPublic,
          },
        },
      }),
    });

    if (!response.ok) {
      let details: unknown;
      try {
        details = await response.json();
      } catch {
        details = await response.text().catch(() => undefined);
      }
      throw new ZendeskClientError(
        'ZENDESK_REQUEST_FAILED',
        `Zendesk ticket update failed with status ${response.status}.`,
        response.status,
        { ticketId, details },
      );
    }

    const payload = (await response.json()) as {
      audit?: { id?: number };
      ticket?: { status?: string };
    };

    return {
      ticketId,
      isPublic: input.isPublic,
      auditId: payload.audit?.id,
      ticketStatus: payload.ticket?.status,
    };
  }

  /**
   * Read a ticket plus its most recent comments (oldest → newest in the result).
   * Read-only. Private/internal notes are dropped unless `includeInternalNotes` is set.
   */
  async getTicketThread(
    ticketId: string,
    options: { includeInternalNotes?: boolean; limit?: number } = {},
  ): Promise<TicketThread> {
    if (!/^\d+$/.test(ticketId)) {
      throw new ZendeskClientError('INVALID_TICKET_ID', 'Zendesk ticket ID must be numeric.', 400, { ticketId });
    }
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const includeInternalNotes = options.includeInternalNotes === true;
    const headers = { Authorization: this.authHeader, Accept: 'application/json' };

    const firstCommentsUrl = `${this.baseUrl}/tickets/${ticketId}/comments.json?include=users&sort_order=desc&per_page=${limit}`;
    const [ticketRes, firstCommentsRes] = await Promise.all([
      this.fetchFn(`${this.baseUrl}/tickets/${ticketId}.json?include=users`, { headers }),
      this.fetchFn(firstCommentsUrl, { headers }),
    ]);
    const failRead = async (label: string, res: Response): Promise<never> => {
      let details: unknown;
      try {
        details = await res.json();
      } catch {
        details = await res.text().catch(() => undefined);
      }
      throw new ZendeskClientError(
        res.status === 404 ? 'ZENDESK_TICKET_NOT_FOUND' : 'ZENDESK_REQUEST_FAILED',
        `Zendesk ${label} read failed with status ${res.status}.`,
        res.status,
        { ticketId, details },
      );
    };
    if (!ticketRes.ok) await failRead('ticket', ticketRes);
    if (!firstCommentsRes.ok) await failRead('comments', firstCommentsRes);

    type RawUser = { id?: number; name?: string; role?: string; email?: string };
    type RawTicket = {
      ticket?: {
        subject?: string;
        status?: string;
        priority?: string | null;
        created_at?: string;
        updated_at?: string;
        tags?: string[];
        requester_id?: number;
        assignee_id?: number | null;
      };
      users?: RawUser[];
    };
    type RawComments = {
      comments?: Array<{
        id: number;
        author_id?: number;
        public?: boolean;
        body?: string;
        plain_body?: string;
        created_at?: string;
        attachments?: Array<{ file_name?: string; content_type?: string; content_url?: string }>;
      }>;
      users?: RawUser[];
      count?: number;
      next_page?: string | null;
    };
    type RawComment = NonNullable<RawComments['comments']>[number];
    const ticketPayload = (await ticketRes.json()) as RawTicket;

    // Zendesk cannot filter comments by visibility server-side. When private notes are
    // excluded, the newest `limit` records may all be internal triage, so keep paging
    // (newest → oldest) until `limit` visible comments are collected, a bounded number
    // of pages have been read, or the history is exhausted.
    const MAX_COMMENT_PAGES = 10;
    const users = new Map<number, RawUser>();
    for (const u of ticketPayload.users ?? []) if (typeof u.id === 'number') users.set(u.id, u);
    const isVisible = (c: RawComment) => includeInternalNotes || c.public !== false;
    const rawComments: RawComment[] = [];
    let commentsPayload = (await firstCommentsRes.json()) as RawComments;
    let totalCount = commentsPayload.count;
    let pagesRead = 1;
    let nextPage = commentsPayload.next_page ?? null;
    for (;;) {
      for (const u of commentsPayload.users ?? []) if (typeof u.id === 'number') users.set(u.id, u);
      rawComments.push(...(commentsPayload.comments ?? []));
      if (rawComments.filter(isVisible).length >= limit || !nextPage || pagesRead >= MAX_COMMENT_PAGES) break;
      const res = await this.fetchFn(nextPage, { headers });
      if (!res.ok) await failRead('comments', res);
      commentsPayload = (await res.json()) as RawComments;
      if (typeof commentsPayload.count === 'number') totalCount = commentsPayload.count;
      nextPage = commentsPayload.next_page ?? null;
      pagesRead += 1;
    }
    const visibleNewestFirst = rawComments.filter(isVisible);
    const hasOlderComments = visibleNewestFirst.length > limit || Boolean(nextPage);
    const author = (id: number | null | undefined): TicketThreadAuthor => {
      const u = typeof id === 'number' ? users.get(id) : undefined;
      return { id: id ?? null, name: u?.name ?? null, role: u?.role ?? null, email: u?.email ?? null };
    };

    const comments = visibleNewestFirst
      .slice(0, limit)
      .map<TicketThreadComment>((c) => ({
        id: c.id,
        createdAt: c.created_at ?? null,
        isPublic: c.public !== false,
        author: author(c.author_id),
        body: (c.plain_body ?? c.body ?? '').trim(),
        attachments: (c.attachments ?? []).map((a) => ({
          fileName: a.file_name ?? null,
          contentType: a.content_type ?? null,
          url: a.content_url ?? null,
        })),
      }))
      .reverse();

    const t = ticketPayload.ticket ?? {};
    return {
      ticketId,
      subject: t.subject ?? null,
      status: t.status ?? null,
      priority: t.priority ?? null,
      createdAt: t.created_at ?? null,
      updatedAt: t.updated_at ?? null,
      tags: t.tags ?? [],
      requester: typeof t.requester_id === 'number' ? author(t.requester_id) : null,
      assignee: typeof t.assignee_id === 'number' ? author(t.assignee_id) : null,
      comments,
      // The raw count includes private notes; only expose it when the caller was allowed to see them.
      totalCommentsOnTicket: includeInternalNotes && typeof totalCount === 'number' ? totalCount : null,
      hasOlderComments,
      includesInternalNotes: includeInternalNotes,
    };
  }
}
