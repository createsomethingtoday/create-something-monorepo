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

describe('ZendeskClient.searchTickets', () => {
  const searchJson = {
    results: [
      { id: 1188879, subject: 'Your Webflow Marketplace App submission', status: 'solved', requester_id: 11, assignee_id: 22, group_id: 1500002744702, created_at: '2026-09-10T14:26:00Z', updated_at: '2026-09-14T20:31:07Z', tags: ['marketplace', 'app_review'], result_type: 'ticket' },
      { id: 1170775, subject: 'Wistia submission', status: 'pending', requester_id: 33, assignee_id: null, group_id: 1500002744702, created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-02T00:00:00Z', tags: [], result_type: 'ticket' },
    ],
    count: 2,
    next_page: null,
  };
  function fetchSpy() {
    const calls: string[] = [];
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return { ok: true, status: 200, json: async () => searchJson, text: async () => '' } as unknown as Response;
    });
    return { fetchFn, calls };
  }
  const opts = { subdomain: 'webflow2579', email: 'a@b.c', apiToken: 't', marketplaceGroupId: 1500002744702 };

  it('scopes to the Marketplace Review group by default and composes Zendesk search syntax', async () => {
    const { fetchFn, calls } = fetchSpy();
    const client = new ZendeskClient({ ...opts, fetchFn });
    const result = await client.searchTickets({
      query: 'CMS Smart Sync',
      status: 'pending',
      tags: ['app_review'],
      requesterEmail: 'dev@example.com',
      createdAfter: '2026-09-01',
      limit: 10,
      sortBy: 'updated_at',
      sortOrder: 'desc',
    });
    const url = new URL(calls[0]!);
    expect(url.pathname).toBe('/api/v2/search.json');
    expect(url.searchParams.get('query')).toBe(
      'type:ticket group:1500002744702 CMS Smart Sync status:pending tags:app_review requester:dev@example.com created>2026-09-01',
    );
    expect(url.searchParams.get('per_page')).toBe('10');
    expect(url.searchParams.get('sort_by')).toBe('updated_at');
    expect(url.searchParams.get('sort_order')).toBe('desc');
    expect(result.scope).toBe('marketplace_review');
    expect(result.count).toBe(2);
    expect(result.tickets[0]).toMatchObject({ ticketId: '1188879', status: 'solved', groupId: 1500002744702, tags: ['marketplace', 'app_review'] });
    expect(result.tickets[1]).toMatchObject({ ticketId: '1170775', assigneeId: null });
  });

  it('omits the group clause only when scope is explicitly "all"', async () => {
    const { fetchFn, calls } = fetchSpy();
    const client = new ZendeskClient({ ...opts, fetchFn });
    const result = await client.searchTickets({ query: 'refund', scope: 'all' });
    const url = new URL(calls[0]!);
    expect(url.searchParams.get('query')).toBe('type:ticket refund');
    expect(url.searchParams.get('per_page')).toBe('25');
    expect(result.scope).toBe('all');
  });
});

describe('ZendeskClient.updateTicketStatus', () => {
  const ticket = (over: Record<string, unknown> = {}) => ({
    ticket: { id: 1188879, status: 'pending', group_id: 1500002744702, tags: ['marketplace'], ...over },
  });
  function fetchSeq(getJson: unknown, putJson: unknown = { ticket: { id: 1188879, status: 'solved', tags: ['marketplace', 'resolved'] }, audit: { id: 99 } }) {
    const calls: Array<{ url: string; method: string; body: unknown }> = [];
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      calls.push({ url: String(input), method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      const json = method === 'PUT' ? putJson : getJson;
      return { ok: true, status: 200, json: async () => json, text: async () => '' } as unknown as Response;
    });
    return { fetchFn, calls };
  }
  const opts = { subdomain: 'webflow2579', email: 'a@b.c', apiToken: 't', marketplaceGroupId: 1500002744702 };

  it('re-reads the ticket, checks expected status and scope, then writes status/tags/private note', async () => {
    const { fetchFn, calls } = fetchSeq(ticket());
    const client = new ZendeskClient({ ...opts, fetchFn });
    const result = await client.updateTicketStatus('1188879', {
      status: 'solved',
      expectedStatus: 'pending',
      additionalTags: ['resolved'],
      removeTags: ['needs_reply'],
      privateNote: 'Closing after v12 approval.',
    });
    expect(calls[0]).toMatchObject({ method: 'GET' });
    expect(calls[0]!.url).toContain('/tickets/1188879.json');
    expect(calls[1]).toMatchObject({ method: 'PUT' });
    expect(calls[1]!.body).toEqual({
      ticket: {
        status: 'solved',
        additional_tags: ['resolved'],
        remove_tags: ['needs_reply'],
        comment: { body: 'Closing after v12 approval.', public: false },
      },
    });
    expect(result).toMatchObject({ ticketId: '1188879', previousStatus: 'pending', status: 'solved', auditId: 99 });
  });

  it('refuses when the fresh status differs from expected_status and does not write', async () => {
    const { fetchFn, calls } = fetchSeq(ticket({ status: 'open' }));
    const client = new ZendeskClient({ ...opts, fetchFn });
    await expect(client.updateTicketStatus('1188879', { status: 'solved', expectedStatus: 'pending' })).rejects.toMatchObject({
      code: 'ZENDESK_STATUS_CONFLICT',
      status: 409,
    });
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
  });

  it('refuses tickets outside the Marketplace Review group', async () => {
    const { fetchFn, calls } = fetchSeq(ticket({ group_id: 46157931219347 }));
    const client = new ZendeskClient({ ...opts, fetchFn });
    await expect(client.updateTicketStatus('1188879', { status: 'solved', expectedStatus: 'pending' })).rejects.toMatchObject({
      code: 'ZENDESK_TICKET_OUT_OF_SCOPE',
      status: 403,
    });
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
  });

  it('never writes "closed" (Zendesk rejects it) and never sends a public comment', async () => {
    const { fetchFn, calls } = fetchSeq(ticket());
    const client = new ZendeskClient({ ...opts, fetchFn });
    await expect(
      client.updateTicketStatus('1188879', { status: 'closed' as never, expectedStatus: 'pending' }),
    ).rejects.toMatchObject({ code: 'INVALID_TICKET_STATUS' });
    expect(calls).toHaveLength(0);
  });
});
