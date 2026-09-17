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

  constructor(options: ZendeskClientOptions) {
    this.baseUrl = `https://${options.subdomain}.zendesk.com/api/v2`;
    this.authHeader = `Basic ${btoa(`${options.email}/token:${options.apiToken}`)}`;
    this.fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init));
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
