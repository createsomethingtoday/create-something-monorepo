import { describe, expect, it, vi } from 'vitest';

import { ZendeskClient, ZendeskClientError, renderCreatorFacingHtml } from './zendesk.js';

describe('renderCreatorFacingHtml', () => {
  it('escapes raw HTML tags so they render as visible text', () => {
    const html = renderCreatorFacingHtml('Remove the <script type="application/ld+json"> block.');
    expect(html).toContain('&lt;script type="application/ld+json"&gt;');
    expect(html).not.toMatch(/<script/);
  });

  it('renders backticked tags as code, matching the patched composer', () => {
    const html = renderCreatorFacingHtml('Remove the `<script>` block.');
    expect(html).toContain('<code>&lt;script&gt;</code>');
  });

  it('renders bold, links, and autolinks', () => {
    const html = renderCreatorFacingHtml(
      '**Required change:** see [the guidelines](https://example.com/docs) and <https://example.com/more>.',
    );
    expect(html).toContain('<strong>Required change:</strong>');
    expect(html).toContain('<a href="https://example.com/docs">the guidelines</a>');
    expect(html).toContain('<a href="https://example.com/more">https://example.com/more</a>');
  });

  it('renders ordered and unordered lists with <br> between paragraphs', () => {
    const html = renderCreatorFacingHtml('Hi Wistia,\n\n1. Fix the iframe.\n2. Pin the script.\n\nCheers');
    expect(html).toContain('<ol><li>Fix the iframe.</li><li>Pin the script.</li></ol>');
    expect(html).toContain('Hi Wistia,<br>');
    expect(html).toContain('Cheers');
  });
});

describe('ZendeskClient.addTicketComment', () => {
  it('PUTs an html_body comment with basic token auth', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://webflow2579.zendesk.com/api/v2/tickets/1170775.json');
      expect(init?.method).toBe('PUT');
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe(`Basic ${btoa('reviewer@webflow.com/token:secret')}`);
      const body = JSON.parse(String(init?.body)) as {
        ticket: { comment: { html_body: string; public: boolean } };
      };
      expect(body.ticket.comment.public).toBe(true);
      expect(body.ticket.comment.html_body).toContain('Hi Wistia');
      return new Response(JSON.stringify({ audit: { id: 42 }, ticket: { status: 'open' } }), { status: 200 });
    });

    const client = new ZendeskClient({
      subdomain: 'webflow2579',
      email: 'reviewer@webflow.com',
      apiToken: 'secret',
      fetchFn,
    });

    const result = await client.addTicketComment('1170775', { htmlBody: 'Hi Wistia', isPublic: true });
    expect(result).toEqual({ ticketId: '1170775', isPublic: true, auditId: 42, ticketStatus: 'open' });
  });

  it('rejects non-numeric ticket IDs without calling Zendesk', async () => {
    const fetchFn = vi.fn();
    const client = new ZendeskClient({
      subdomain: 'webflow2579',
      email: 'reviewer@webflow.com',
      apiToken: 'secret',
      fetchFn,
    });

    await expect(client.addTicketComment('recABC', { htmlBody: 'x', isPublic: true })).rejects.toMatchObject({
      code: 'INVALID_TICKET_ID',
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('surfaces Zendesk errors with status and details', async () => {
    const fetchFn = vi.fn(
      async () => new Response(JSON.stringify({ error: 'RecordInvalid' }), { status: 422 }),
    );
    const client = new ZendeskClient({
      subdomain: 'webflow2579',
      email: 'reviewer@webflow.com',
      apiToken: 'secret',
      fetchFn,
    });

    await expect(client.addTicketComment('123', { htmlBody: 'x', isPublic: false })).rejects.toSatisfy(
      (error: unknown) => {
        expect(error).toBeInstanceOf(ZendeskClientError);
        expect((error as ZendeskClientError).status).toBe(422);
        return true;
      },
    );
  });
});

describe('ZendeskClient.getTicketThread', () => {
  const ticketJson = {
    ticket: {
      id: 1188879,
      subject: 'Your Webflow Marketplace App submission',
      status: 'pending',
      priority: null,
      created_at: '2026-09-10T14:26:00Z',
      updated_at: '2026-09-12T09:00:00Z',
      tags: ['marketplace'],
      requester_id: 11,
      assignee_id: 22,
    },
    users: [
      { id: 11, name: 'Dev Person', role: 'end-user', email: 'dev@example.com' },
      { id: 22, name: 'Shea Sisco', role: 'agent', email: 'shea.sisco@webflow.com' },
    ],
  };
  const commentsJson = {
    comments: [
      { id: 3, author_id: 22, public: false, plain_body: 'internal note', created_at: '2026-09-12T09:00:00Z' },
      { id: 2, author_id: 11, public: true, plain_body: 'We fixed the CSP.', created_at: '2026-09-11T10:00:00Z',
        attachments: [{ file_name: 'bundle.zip', content_type: 'application/zip', content_url: 'https://z/x' }] },
      { id: 1, author_id: 22, public: true, body: 'Review feedback below.', created_at: '2026-09-10T14:30:00Z' },
    ],
    users: [],
    count: 3,
  };

  function fetchFor(overrides: Partial<Record<'ticket' | 'comments', { ok: boolean; status: number; json: unknown }>> = {}) {
    const calls: string[] = [];
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      const key = url.includes('/comments.json') ? 'comments' : 'ticket';
      const spec = overrides[key] ?? { ok: true, status: 200, json: key === 'comments' ? commentsJson : ticketJson };
      return {
        ok: spec.ok,
        status: spec.status,
        json: async () => spec.json,
        text: async () => JSON.stringify(spec.json),
      } as unknown as Response;
    });
    return { fetchFn, calls };
  }

  it('returns ticket metadata and public comments oldest-first, resolving authors', async () => {
    const { fetchFn, calls } = fetchFor();
    const client = new ZendeskClient({ subdomain: 'webflow2579', email: 'a@b.c', apiToken: 't', fetchFn });
    const thread = await client.getTicketThread('1188879', { limit: 5 });

    expect(calls.some((u) => u.endsWith('/tickets/1188879.json?include=users'))).toBe(true);
    expect(calls.some((u) => u.includes('/tickets/1188879/comments.json') && u.includes('per_page=5'))).toBe(true);
    expect(thread.subject).toBe('Your Webflow Marketplace App submission');
    expect(thread.requester).toMatchObject({ name: 'Dev Person', role: 'end-user' });
    expect(thread.assignee).toMatchObject({ name: 'Shea Sisco', role: 'agent' });
    expect(thread.comments.map((c) => c.id)).toEqual([1, 2]);
    expect(thread.comments[1]).toMatchObject({
      body: 'We fixed the CSP.',
      author: { name: 'Dev Person' },
      attachments: [{ fileName: 'bundle.zip' }],
    });
    expect(thread.totalCommentsOnTicket).toBe(3);
    expect(thread.includesInternalNotes).toBe(false);
  });

  it('includes internal notes only when asked', async () => {
    const { fetchFn } = fetchFor();
    const client = new ZendeskClient({ subdomain: 'webflow2579', email: 'a@b.c', apiToken: 't', fetchFn });
    const thread = await client.getTicketThread('1188879', { includeInternalNotes: true });
    expect(thread.comments.map((c) => c.id)).toEqual([1, 2, 3]);
    expect(thread.comments[2]).toMatchObject({ isPublic: false, body: 'internal note' });
  });

  it('maps a missing ticket to ZENDESK_TICKET_NOT_FOUND and rejects non-numeric ids', async () => {
    const { fetchFn } = fetchFor({ ticket: { ok: false, status: 404, json: { error: 'RecordNotFound' } } });
    const client = new ZendeskClient({ subdomain: 'webflow2579', email: 'a@b.c', apiToken: 't', fetchFn });
    await expect(client.getTicketThread('1188879')).rejects.toMatchObject({ code: 'ZENDESK_TICKET_NOT_FOUND', status: 404 });
    await expect(client.getTicketThread('abc')).rejects.toMatchObject({ code: 'INVALID_TICKET_ID' });
  });
});
