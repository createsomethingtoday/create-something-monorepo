import assert from 'node:assert/strict';
import test from 'node:test';

import { renderCreatorFacingHtml, ZendeskClient, ZendeskClientError } from '../src/zendesk.js';

type FetchFn = typeof fetch;

function jsonResponse(json: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => json, text: async () => JSON.stringify(json) } as unknown as Response;
}

test('renderCreatorFacingHtml escapes raw HTML tags so they render as visible text', () => {
  const html = renderCreatorFacingHtml('Remove the <script type="application/ld+json"> block.');
  assert.ok(html.includes('&lt;script type="application/ld+json"&gt;'));
  assert.doesNotMatch(html, /<script/);
});

test('renderCreatorFacingHtml renders backticked tags as code, bold, links, and lists', () => {
  assert.ok(renderCreatorFacingHtml('Remove the `<script>` block.').includes('<code>&lt;script&gt;</code>'));
  const rich = renderCreatorFacingHtml('**Required change:** see [the guidelines](https://example.com/docs) and <https://example.com/more>.');
  assert.ok(rich.includes('<strong>Required change:</strong>'));
  assert.ok(rich.includes('<a href="https://example.com/docs">the guidelines</a>'));
  assert.ok(rich.includes('<a href="https://example.com/more">https://example.com/more</a>'));
  const list = renderCreatorFacingHtml('Hi Studio,\n\n1. Fix the hero image alt text.\n2. Remove the placeholder blog post.\n\nCheers');
  assert.ok(list.includes('<ol><li>Fix the hero image alt text.</li><li>Remove the placeholder blog post.</li></ol>'));
  assert.ok(list.includes('Hi Studio,<br>'));
});

test('addTicketComment PUTs an html_body comment with basic token auth', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchFn: FetchFn = async (input, init) => {
    calls.push({ url: String(input), init });
    return jsonResponse({ audit: { id: 42 }, ticket: { status: 'open' } });
  };
  const client = new ZendeskClient({ subdomain: 'webflow2579', email: 'reviewer@webflow.com', apiToken: 'secret', fetchFn });
  const result = await client.addTicketComment('1199299', { htmlBody: 'Hi Studio', isPublic: true });

  assert.deepEqual(result, { ticketId: '1199299', isPublic: true, auditId: 42, ticketStatus: 'open' });
  assert.equal(calls[0]?.url, 'https://webflow2579.zendesk.com/api/v2/tickets/1199299.json');
  assert.equal(calls[0]?.init?.method, 'PUT');
  assert.equal((calls[0]?.init?.headers as Record<string, string>).Authorization, `Basic ${btoa('reviewer@webflow.com/token:secret')}`);
  const body = JSON.parse(String(calls[0]?.init?.body)) as { ticket: { comment: { html_body: string; public: boolean } } };
  assert.equal(body.ticket.comment.public, true);
  assert.equal(body.ticket.comment.html_body, 'Hi Studio');
});

test('addTicketComment rejects non-numeric ticket IDs and surfaces Zendesk errors', async () => {
  let called = 0;
  const client = new ZendeskClient({
    subdomain: 'webflow2579',
    email: 'a@b.c',
    apiToken: 't',
    fetchFn: async () => {
      called += 1;
      return jsonResponse({ error: 'RecordInvalid' }, 422);
    },
  });
  await assert.rejects(client.addTicketComment('recABC', { htmlBody: 'x', isPublic: true }), (error: unknown) => {
    assert.ok(error instanceof ZendeskClientError);
    assert.equal(error.code, 'INVALID_TICKET_ID');
    return true;
  });
  assert.equal(called, 0);
  await assert.rejects(client.addTicketComment('123', { htmlBody: 'x', isPublic: false }), (error: unknown) => {
    assert.ok(error instanceof ZendeskClientError);
    assert.equal(error.status, 422);
    return true;
  });
});

const ticketJson = {
  ticket: {
    id: 1199299,
    subject: 'Your Webflow Marketplace Template submission',
    status: 'pending',
    priority: null,
    created_at: '2026-09-29T15:24:47Z',
    updated_at: '2026-09-29T16:00:00Z',
    tags: ['marketplace'],
    requester_id: 11,
    assignee_id: 22,
  },
  users: [
    { id: 11, name: 'Creator Person', role: 'end-user', email: 'creator@example.com' },
    { id: 22, name: 'Review Teammate', role: 'agent', email: 'reviewer@webflow.com' },
  ],
};
const commentsJson = {
  comments: [
    { id: 3, author_id: 22, public: false, plain_body: 'internal note', created_at: '2026-09-29T16:00:00Z' },
    { id: 2, author_id: 11, public: true, plain_body: 'Placeholder text removed.', created_at: '2026-09-29T15:50:00Z' },
    { id: 1, author_id: 22, public: true, body: 'Review feedback below.', created_at: '2026-09-29T15:30:00Z' },
  ],
  users: [],
  count: 3,
};

test('getTicketThread returns metadata and public comments oldest-first, internal notes only when asked', async () => {
  const calls: string[] = [];
  const fetchFn: FetchFn = async (input) => {
    const url = String(input);
    calls.push(url);
    return jsonResponse(url.includes('/comments.json') ? commentsJson : ticketJson);
  };
  const client = new ZendeskClient({ subdomain: 'webflow2579', email: 'a@b.c', apiToken: 't', fetchFn });

  const thread = await client.getTicketThread('1199299', { limit: 5 });
  assert.ok(calls.some((u) => u.endsWith('/tickets/1199299.json?include=users')));
  assert.ok(calls.some((u) => u.includes('/tickets/1199299/comments.json') && u.includes('per_page=5')));
  assert.equal(thread.subject, 'Your Webflow Marketplace Template submission');
  assert.equal(thread.requester?.name, 'Creator Person');
  assert.equal(thread.assignee?.role, 'agent');
  assert.deepEqual(thread.comments.map((c) => c.id), [1, 2]);
  assert.equal(thread.totalCommentsOnTicket, 3);
  assert.equal(thread.includesInternalNotes, false);

  const withNotes = await client.getTicketThread('1199299', { includeInternalNotes: true });
  assert.deepEqual(withNotes.comments.map((c) => c.id), [1, 2, 3]);
  assert.equal(withNotes.comments[2]?.isPublic, false);
});

test('getTicketThread maps a missing ticket to ZENDESK_TICKET_NOT_FOUND', async () => {
  const client = new ZendeskClient({ subdomain: 'webflow2579', email: 'a@b.c', apiToken: 't', fetchFn: async () => jsonResponse({ error: 'RecordNotFound' }, 404) });
  await assert.rejects(client.getTicketThread('1199299'), (error: unknown) => {
    assert.ok(error instanceof ZendeskClientError);
    assert.equal(error.code, 'ZENDESK_TICKET_NOT_FOUND');
    assert.equal(error.status, 404);
    return true;
  });
});

test('searchTickets scopes to the Marketplace Review group by default and widens only on scope=all', async () => {
  const calls: string[] = [];
  const fetchFn: FetchFn = async (input) => {
    calls.push(String(input));
    return jsonResponse({
      results: [{ id: 1199299, subject: 'Your Webflow Marketplace Template submission', status: 'pending', group_id: 1500002744702, tags: ['marketplace'], result_type: 'ticket' }],
      count: 1,
      next_page: null,
    });
  };
  const client = new ZendeskClient({ subdomain: 'webflow2579', email: 'a@b.c', apiToken: 't', marketplaceGroupId: 1500002744702, fetchFn });

  const scoped = await client.searchTickets({ query: 'Template submission', status: 'pending', requesterEmail: 'creator@example.com', createdAfter: '2026-09-01', limit: 10 });
  const url = new URL(calls[0]!);
  assert.equal(url.pathname, '/api/v2/search.json');
  assert.equal(url.searchParams.get('query'), 'type:ticket group:1500002744702 Template submission status:pending requester:creator@example.com created>2026-09-01');
  assert.equal(url.searchParams.get('per_page'), '10');
  assert.equal(scoped.scope, 'marketplace_review');
  assert.equal(scoped.tickets[0]?.ticketId, '1199299');

  const all = await client.searchTickets({ query: 'refund', scope: 'all' });
  assert.equal(new URL(calls[1]!).searchParams.get('query'), 'type:ticket refund');
  assert.equal(all.scope, 'all');
});

test('updateTicketStatus re-reads, checks expected status and group, then writes status/tags/private note', async () => {
  const calls: Array<{ method: string; body?: unknown }> = [];
  const fetchFn: FetchFn = async (_input, init) => {
    const method = init?.method ?? 'GET';
    calls.push({ method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return method === 'PUT'
      ? jsonResponse({ ticket: { status: 'solved', tags: ['marketplace', 'resolved'] }, audit: { id: 99 } })
      : jsonResponse({ ticket: { status: 'pending', group_id: 1500002744702, tags: ['marketplace'] } });
  };
  const client = new ZendeskClient({ subdomain: 'webflow2579', email: 'a@b.c', apiToken: 't', marketplaceGroupId: 1500002744702, fetchFn });
  const result = await client.updateTicketStatus('1199299', {
    status: 'solved',
    expectedStatus: 'pending',
    additionalTags: ['resolved'],
    privateNote: 'Closing after approval.',
  });
  assert.equal(calls[0]?.method, 'GET');
  assert.deepEqual(calls[1], {
    method: 'PUT',
    body: { ticket: { status: 'solved', additional_tags: ['resolved'], comment: { body: 'Closing after approval.', public: false } } },
  });
  assert.equal(result.previousStatus, 'pending');
  assert.equal(result.status, 'solved');
  assert.equal(result.auditId, 99);
});

test('updateTicketStatus refuses stale reads, out-of-scope groups, and "closed" without writing', async () => {
  const puts: number[] = [];
  const clientFor = (ticket: Record<string, unknown>) =>
    new ZendeskClient({
      subdomain: 'webflow2579',
      email: 'a@b.c',
      apiToken: 't',
      marketplaceGroupId: 1500002744702,
      fetchFn: async (_input, init) => {
        if (init?.method === 'PUT') puts.push(1);
        return jsonResponse({ ticket: { status: 'pending', group_id: 1500002744702, tags: [], ...ticket } });
      },
    });

  await assert.rejects(clientFor({ status: 'open' }).updateTicketStatus('1199299', { status: 'solved', expectedStatus: 'pending' }), (e: unknown) => (e as ZendeskClientError).code === 'ZENDESK_STATUS_CONFLICT');
  await assert.rejects(clientFor({ group_id: 46157931219347 }).updateTicketStatus('1199299', { status: 'solved', expectedStatus: 'pending' }), (e: unknown) => (e as ZendeskClientError).code === 'ZENDESK_TICKET_OUT_OF_SCOPE');
  await assert.rejects(clientFor({}).updateTicketStatus('1199299', { status: 'closed' as never, expectedStatus: 'pending' }), (e: unknown) => (e as ZendeskClientError).code === 'INVALID_TICKET_STATUS');
  assert.equal(puts.length, 0);
});
