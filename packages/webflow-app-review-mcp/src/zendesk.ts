import type { FetchFn } from './airtable.js';

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
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
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
  includesInternalNotes: boolean;
}

export class ZendeskClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly fetchFn: FetchFn;
  readonly marketplaceGroupId: number;

  constructor(options: ZendeskClientOptions) {
    this.baseUrl = `https://${options.subdomain}.zendesk.com/api/v2`;
    this.authHeader = `Basic ${btoa(`${options.email}/token:${options.apiToken}`)}`;
    this.fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init));
    this.marketplaceGroupId = options.marketplaceGroupId ?? DEFAULT_MARKETPLACE_GROUP_ID;
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
    const { ticket } = (await current.json()) as { ticket?: { status?: string; group_id?: number | null; tags?: string[] } };
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
    if (update.additionalTags?.length) body.additional_tags = update.additionalTags;
    if (update.removeTags?.length) body.remove_tags = update.removeTags;
    if (update.privateNote?.trim()) body.comment = { body: update.privateNote.trim(), public: false };
    const res = await this.fetchFn(`${this.baseUrl}/tickets/${ticketId}.json`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket: body }),
    });
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

    const [ticketRes, commentsRes] = await Promise.all([
      this.fetchFn(`${this.baseUrl}/tickets/${ticketId}.json?include=users`, { headers }),
      this.fetchFn(
        `${this.baseUrl}/tickets/${ticketId}/comments.json?include=users&sort_order=desc&per_page=${limit}`,
        { headers },
      ),
    ]);
    for (const [label, res] of [['ticket', ticketRes], ['comments', commentsRes]] as const) {
      if (!res.ok) {
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
      }
    }

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
    };
    const ticketPayload = (await ticketRes.json()) as RawTicket;
    const commentsPayload = (await commentsRes.json()) as RawComments;

    const users = new Map<number, RawUser>();
    for (const u of [...(ticketPayload.users ?? []), ...(commentsPayload.users ?? [])]) {
      if (typeof u.id === 'number') users.set(u.id, u);
    }
    const author = (id: number | null | undefined): TicketThreadAuthor => {
      const u = typeof id === 'number' ? users.get(id) : undefined;
      return { id: id ?? null, name: u?.name ?? null, role: u?.role ?? null, email: u?.email ?? null };
    };

    const comments = (commentsPayload.comments ?? [])
      .filter((c) => includeInternalNotes || c.public !== false)
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
      totalCommentsOnTicket: typeof commentsPayload.count === 'number' ? commentsPayload.count : null,
      includesInternalNotes: includeInternalNotes,
    };
  }
}
