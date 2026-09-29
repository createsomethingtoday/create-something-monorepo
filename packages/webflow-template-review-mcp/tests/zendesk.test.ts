import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_MARKETPLACE_GROUP_ID, parseZendeskGroupId, renderCreatorFacingHtml, ZendeskClient, ZendeskClientError } from '../src/zendesk.js';

type FetchFn = typeof fetch;

function jsonResponse(json: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => json, text: async () => JSON.stringify(json) } as unknown as Response;
}

test('renderCreatorFacingHtml escapes raw HTML tags so they render as visible text', () => {
  const html = renderCreatorFacingHtml('Remove the <script type="application/ld+json"> block.');
  assert.ok(html.includes('&lt;script type=&quot;application/ld+json&quot;&gt;'));
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
  assert.equal(thread.totalCommentsOnTicket, null, 'raw count would reveal how many private notes exist');
  assert.equal(thread.includesInternalNotes, false);

  const withNotes = await client.getTicketThread('1199299', { includeInternalNotes: true });
  assert.deepEqual(withNotes.comments.map((c) => c.id), [1, 2, 3]);
  assert.equal(withNotes.totalCommentsOnTicket, 3);
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
      : jsonResponse({ ticket: { status: 'pending', group_id: 1500002744702, tags: ['marketplace'], updated_at: '2026-09-29T16:00:00Z' } });
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
    body: { ticket: { status: 'solved', safe_update: true, updated_stamp: '2026-09-29T16:00:00Z', additional_tags: ['resolved'], comment: { body: 'Closing after approval.', public: false } } },
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

test('parseZendeskGroupId accepts a positive integer and falls back on anything else', () => {
  assert.equal(parseZendeskGroupId('1500002744702'), 1500002744702);
  assert.equal(parseZendeskGroupId(' 1500002744702 '), 1500002744702);
  assert.equal(parseZendeskGroupId(undefined), undefined);
  assert.equal(parseZendeskGroupId(''), undefined);
  const warn = console.warn;
  const warnings: unknown[] = [];
  console.warn = (...args: unknown[]) => { warnings.push(args); };
  try {
    assert.equal(parseZendeskGroupId('15000O2744702'), undefined);
    assert.equal(parseZendeskGroupId('1500002744702abc'), undefined);
    assert.equal(parseZendeskGroupId('-5'), undefined);
  } finally {
    console.warn = warn;
  }
  assert.equal(warnings.length, 3);
  assert.equal(new ZendeskClient({ subdomain: 's', email: 'a@b.c', apiToken: 't', marketplaceGroupId: parseZendeskGroupId('nope') }).marketplaceGroupId, DEFAULT_MARKETPLACE_GROUP_ID);
});

test('agentTicketUrl follows the configured subdomain', () => {
  const client = new ZendeskClient({ subdomain: 'webflow2579-sandbox', email: 'a@b.c', apiToken: 't' });
  assert.equal(client.agentTicketUrl('123'), 'https://webflow2579-sandbox.zendesk.com/agent/tickets/123');
});

test('renderCreatorFacingHtml escapes quotes in link targets and leaves non-http links as text', () => {
  const injected = renderCreatorFacingHtml('see [review](https://example.test" title="unexpected)');
  assert.doesNotMatch(injected, /title="unexpected"/);
  assert.ok(injected.includes('&quot;'));
  const js = renderCreatorFacingHtml('click [here](javascript:alert(1))');
  assert.doesNotMatch(js, /<a /);
  assert.ok(js.includes('javascript:alert(1)'));
  const plain = renderCreatorFacingHtml('see [the guidelines](https://example.com/docs?x=1&y=2)');
  assert.ok(plain.includes('<a href="https://example.com/docs?x=1&amp;y=2">the guidelines</a>'));
});

test('updateTicketStatus surfaces a Zendesk safe_update rejection as ZENDESK_STATUS_CONFLICT', async () => {
  const client = new ZendeskClient({
    subdomain: 'webflow2579', email: 'a@b.c', apiToken: 't', marketplaceGroupId: 1500002744702,
    fetchFn: async (_input, init) =>
      init?.method === 'PUT'
        ? jsonResponse({ error: 'UpdateConflict' }, 409)
        : jsonResponse({ ticket: { status: 'pending', group_id: 1500002744702, tags: [], updated_at: '2026-09-29T16:00:00Z' } }),
  });
  await assert.rejects(client.updateTicketStatus('1199299', { status: 'solved', expectedStatus: 'pending' }), (e: unknown) => {
    assert.ok(e instanceof ZendeskClientError);
    assert.equal(e.code, 'ZENDESK_STATUS_CONFLICT');
    assert.equal(e.status, 409);
    return true;
  });
});

test('getTicketThread pages past internal notes until the visible limit is filled', async () => {
  const urls: string[] = [];
  const page1 = {
    comments: [
      { id: 9, author_id: 22, public: false, plain_body: 'note c', created_at: '2026-09-29T18:00:00Z' },
      { id: 8, author_id: 22, public: false, plain_body: 'note b', created_at: '2026-09-29T17:00:00Z' },
    ],
    users: [{ id: 22, name: 'Review Teammate', role: 'agent' }],
    count: 5,
    next_page: 'https://webflow2579.zendesk.com/api/v2/tickets/1199299/comments.json?page=2&per_page=2&sort_order=desc',
  };
  const page2 = {
    comments: [
      { id: 7, author_id: 22, public: false, plain_body: 'note a', created_at: '2026-09-29T16:00:00Z' },
      { id: 6, author_id: 11, public: true, plain_body: 'Creator reply', created_at: '2026-09-29T15:00:00Z' },
    ],
    users: [{ id: 11, name: 'Creator Person', role: 'end-user' }],
    count: 5,
    next_page: 'https://webflow2579.zendesk.com/api/v2/tickets/1199299/comments.json?page=3&per_page=2&sort_order=desc',
  };
  const page3 = { comments: [{ id: 5, author_id: 22, public: true, body: 'Review feedback', created_at: '2026-09-29T14:00:00Z' }], users: [], count: 5, next_page: null };
  const fetchFn: FetchFn = async (input) => {
    const url = String(input);
    urls.push(url);
    if (!url.includes('/comments.json')) return jsonResponse(ticketJson);
    if (url.includes('?page=3&')) return jsonResponse(page3);
    if (url.includes('?page=2&')) return jsonResponse(page2);
    return jsonResponse(page1);
  };
  const client = new ZendeskClient({ subdomain: 'webflow2579', email: 'a@b.c', apiToken: 't', fetchFn });

  const thread = await client.getTicketThread('1199299', { limit: 2 });
  assert.equal(urls.filter((u) => u.includes('/comments.json')).length, 3, 'keeps paging until two visible comments are found');
  assert.deepEqual(thread.comments.map((c) => c.id), [5, 6]);
  assert.equal(thread.comments[1]?.author.name, 'Creator Person');
  assert.equal(thread.hasOlderComments, false);
  assert.equal(thread.totalCommentsOnTicket, null);

  const one = await client.getTicketThread('1199299', { limit: 1 });
  assert.deepEqual(one.comments.map((c) => c.id), [6]);
  assert.equal(one.hasOlderComments, true, 'a third page still exists');

  const withNotes = await client.getTicketThread('1199299', { includeInternalNotes: true, limit: 2 });
  assert.deepEqual(withNotes.comments.map((c) => c.id), [8, 9]);
  assert.equal(withNotes.hasOlderComments, true);
  assert.equal(withNotes.totalCommentsOnTicket, 5);
});

function outboundFetch(overrides: { groupOnCreate?: number; publicStatus?: number; auditsStatus?: number; notify?: boolean } = {}) {
  const calls: Array<{ method: string; url: string; body?: Record<string, unknown> }> = [];
  const fetchFn: FetchFn = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
    calls.push({ method, url, body });
    if (url.endsWith('/users/me.json')) return jsonResponse({ user: { id: 1507275866202 } });
    if (url.endsWith('/tickets.json') && method === 'POST') {
      return jsonResponse({ ticket: { id: 1200001, status: 'new', group_id: overrides.groupOnCreate ?? 46157931219347, brand_id: 1, requester_id: 555 } }, 201);
    }
    if (url.endsWith('/tickets/1200001.json') && method === 'PUT') {
      const ticket = body?.ticket as Record<string, unknown>;
      if (ticket.group_id !== undefined) return jsonResponse({ ticket: { id: 1200001, status: 'new', group_id: 1500002744702, brand_id: 35121420416531, requester_id: 555 } });
      if (overrides.publicStatus && overrides.publicStatus >= 400) return jsonResponse({ error: 'RecordInvalid' }, overrides.publicStatus);
      return jsonResponse({ ticket: { id: 1200001, status: 'open', group_id: 1500002744702, brand_id: 35121420416531, requester_id: 555 }, audit: { id: 777 } });
    }
    if (url.endsWith('/tickets/1200001/audits.json')) {
      if (overrides.auditsStatus && overrides.auditsStatus >= 400) return jsonResponse({}, overrides.auditsStatus);
      return jsonResponse({ audits: [{ events: [{ type: 'Comment' }, ...(overrides.notify === false ? [] : [{ type: 'Notification', recipients: [555] }])] }] });
    }
    return jsonResponse({ error: 'unexpected ' + method + ' ' + url }, 500);
  };
  return { calls, fetchFn };
}
const outboundInput = {
  requesterEmail: 'creator@example.com',
  requesterName: 'Creator Person',
  subject: 'About your Marketplace template',
  publicHtml: 'Hi Creator,<br>Please update your listing.',
  internalNoteHtml: 'Outbound ticket opened via Template Review MCP.',
  tags: ['template_review_mcp_outbound'],
};

test('createOutboundTicket creates privately, pins the group, posts a public agent update, and verifies the notification', async () => {
  const { calls, fetchFn } = outboundFetch();
  const client = new ZendeskClient({ subdomain: 'webflow2579', email: 'support-admin@webflow.com', apiToken: 't', marketplaceGroupId: 1500002744702, fetchFn });
  const result = await client.createOutboundTicket(outboundInput);

  assert.deepEqual(calls.map((c) => c.method + ' ' + c.url.replace('https://webflow2579.zendesk.com/api/v2', '')), [
    'GET /users/me.json',
    'POST /tickets.json',
    'PUT /tickets/1200001.json',
    'PUT /tickets/1200001.json',
    'GET /tickets/1200001/audits.json',
  ]);
  const created = calls[1]!.body!.ticket as Record<string, unknown>;
  assert.deepEqual(created.requester, { email: 'creator@example.com', name: 'Creator Person' });
  assert.equal(created.group_id, 1500002744702);
  assert.deepEqual(created.tags, ['template_review_mcp_outbound']);
  assert.deepEqual(created.comment, { html_body: 'Outbound ticket opened via Template Review MCP.', public: false, author_id: 1507275866202 }, 'first comment is private and agent-authored');
  assert.deepEqual(calls[2]!.body!.ticket, { group_id: 1500002744702 }, 'group pinned back after trigger re-route');
  assert.deepEqual(calls[3]!.body!.ticket, { comment: { html_body: 'Hi Creator,<br>Please update your listing.', public: true, author_id: 1507275866202 } }, 'public message is an agent update');
  assert.equal(result.ticketId, '1200001');
  assert.equal(result.groupId, 1500002744702);
  assert.equal(result.brandId, 35121420416531);
  assert.equal(result.publicCommentAuditId, 777);
  assert.equal(result.requesterNotified, true);
  assert.deepEqual(result.steps, ['agent:1507275866202', 'created', 'group_fixed:1500002744702', 'public_comment_posted', 'notification_verified']);
});

test('createOutboundTicket skips the group fix when the ticket already landed in the review group and reports missing notifications', async () => {
  const { calls, fetchFn } = outboundFetch({ groupOnCreate: 1500002744702, notify: false });
  const client = new ZendeskClient({ subdomain: 'webflow2579', email: 'a@b.c', apiToken: 't', marketplaceGroupId: 1500002744702, fetchFn });
  const result = await client.createOutboundTicket(outboundInput);
  assert.equal(calls.filter((c) => c.method === 'PUT').length, 1);
  assert.equal(result.requesterNotified, false);
  assert.ok(result.steps.includes('notification_not_found'));

  const { fetchFn: noAudit } = outboundFetch({ groupOnCreate: 1500002744702, auditsStatus: 500 });
  const client2 = new ZendeskClient({ subdomain: 'webflow2579', email: 'a@b.c', apiToken: 't', marketplaceGroupId: 1500002744702, fetchFn: noAudit });
  const result2 = await client2.createOutboundTicket(outboundInput);
  assert.equal(result2.requesterNotified, null);
  assert.ok(result2.steps.includes('audit_read_failed'));
});

test('createOutboundTicket surfaces a post-create failure with the ticket id instead of a generic error', async () => {
  const { fetchFn } = outboundFetch({ publicStatus: 422 });
  const client = new ZendeskClient({ subdomain: 'webflow2579', email: 'a@b.c', apiToken: 't', marketplaceGroupId: 1500002744702, fetchFn });
  await assert.rejects(client.createOutboundTicket(outboundInput), (e: unknown) => {
    assert.ok(e instanceof ZendeskClientError);
    assert.equal(e.code, 'ZENDESK_OUTBOUND_TICKET_INCOMPLETE');
    assert.equal((e.details as { ticketId: string }).ticketId, '1200001');
    assert.equal((e.details as { failedStep: string }).failedStep, 'public_comment');
    return true;
  });

  let posts = 0;
  const failing = new ZendeskClient({
    subdomain: 'webflow2579', email: 'a@b.c', apiToken: 't',
    fetchFn: async (input, init) => {
      if (String(input).endsWith('/users/me.json')) return jsonResponse({ user: { id: 1 } });
      posts += 1;
      return jsonResponse({ error: 'RecordInvalid' }, 422);
    },
  });
  await assert.rejects(failing.createOutboundTicket(outboundInput), (e: unknown) => (e as ZendeskClientError).code === 'ZENDESK_REQUEST_FAILED');
  assert.equal(posts, 1, 'a failed create makes no further writes');
});
