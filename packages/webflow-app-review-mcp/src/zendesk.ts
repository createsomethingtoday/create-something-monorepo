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
}
