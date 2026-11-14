import assert from 'node:assert/strict';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AirtableClient } from '../src/airtable.js';
import {
  buildReviewCommentsClient,
  ReviewCommentsClient,
  ReviewCommentsClientError,
  type ReviewComment,
} from '../src/review-comments.js';
import type { ReviewerProfile } from '../src/reviewer-directory.js';
import { registerTools, WRITE_TOOL_NAMES } from '../src/tools.js';
import type { ZendeskClient } from '../src/zendesk.js';

type ToolResult = { content: Array<{ type?: string; text?: string }>; isError?: boolean };
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

const COMMENT_WRITE_TOOLS = [
  'template_review_add_comment',
  'template_review_edit_comment',
  'template_review_delete_comment',
  'template_review_release_feedback',
  'template_review_resolve_comment',
];

const VERSION_ID = 'recTEST_VERSION_1';
const ASSET_ID = 'recTEST_ASSET_1';

const reviewer: ReviewerProfile = {
  accountId: 'acct_test_reviewer',
  airtableCollaboratorId: 'usr_test_reviewer',
  email: 'Reviewer@Example.com',
  name: 'Test Reviewer',
};

const version = {
  versionId: VERSION_ID,
  assetId: ASSET_ID,
  versionNumber: 2,
  reviewOwner: { id: 'usr_test_reviewer' },
  reviewStatus: '🏃🏾In Review',
  rawFields: {},
};

function harness() {
  const names: string[] = [];
  const handlers = new Map<string, ToolHandler>();
  const server = {
    registerTool(name: string, _config: unknown, handler: ToolHandler) {
      names.push(name);
      handlers.set(name, handler);
    },
    tool(name: string, ...args: unknown[]) {
      names.push(name);
      handlers.set(name, args.at(-1) as ToolHandler);
    },
  } as unknown as McpServer;
  return { server, names, handlers };
}

function payload(result: ToolResult | undefined) {
  assert.ok(result, 'tool returned no result');
  return JSON.parse(result.content[0]?.text ?? '{}') as { ok: boolean; data?: any; error?: any };
}

function comment(overrides: Partial<ReviewComment>): ReviewComment {
  return {
    id: 'c-1',
    assetRef: ASSET_ID,
    versionRef: VERSION_ID,
    parentId: null,
    authorEmail: 'reviewer@example.com',
    authorRole: 'reviewer',
    body: 'Fix the 404 page',
    visibility: 'draft',
    releasedAt: null,
    resolution: 'open',
    rubricRef: null,
    createdAt: '2026-11-09T00:00:00.000Z',
    editedAt: null,
    ...overrides,
  };
}

/** Records every call; `existing` seeds listVersion, `failWith` makes every call throw. */
function fakeComments(options: { existing?: ReviewComment[]; failWith?: Error } = {}) {
  const calls: Array<[string, ...unknown[]]> = [];
  const record = <T>(name: string, args: unknown[], value: T): Promise<T> => {
    calls.push([name, ...args]);
    return options.failWith ? Promise.reject(options.failWith) : Promise.resolve(value);
  };
  const client = {
    listVersion: (...args: unknown[]) => record('listVersion', args, options.existing ?? []),
    add: (...args: unknown[]) => record('add', args, comment({ body: (args[2] as { body: string }).body })),
    edit: (...args: unknown[]) => record('edit', args, comment({ body: args[2] as string, editedAt: 'now' })),
    remove: (...args: unknown[]) => record('remove', args, { deleted: args[0] }),
    release: (...args: unknown[]) => record('release', args, { released: 2 }),
    resolve: (...args: unknown[]) => record('resolve', args, comment({ resolution: args[2] as 'resolved' })),
  } as unknown as ReviewCommentsClient;
  return { client, calls };
}

function fakeAirtable(overrides: Record<string, unknown> = {}) {
  const writes: unknown[] = [];
  const client = {
    getScopedVersion: async () => ({ version, asset: { assetId: ASSET_ID } }),
    requireAssignedVersion: async () => version,
    updateVersionReview: async (id: string, input: unknown) => {
      writes.push([id, input]);
      return { ...version, ...(input as object) };
    },
    ...overrides,
  } as unknown as AirtableClient;
  return { client, writes };
}

test('comment tools stay unregistered until the comments service is configured', () => {
  const { server, names } = harness();
  registerTools(server, () => fakeAirtable().client, () => reviewer);
  for (const name of [...COMMENT_WRITE_TOOLS, 'template_review_list_comments']) {
    assert.equal(names.includes(name), false, `${name} should not register without the service`);
  }
  assert.equal(buildReviewCommentsClient(undefined, 'key'), null);
  assert.equal(buildReviewCommentsClient('https://comments.test', ' '), null);
});

test('comment writes are hidden from read-only sessions; listing stays available', () => {
  for (const name of COMMENT_WRITE_TOOLS) assert.ok(WRITE_TOOL_NAMES.has(name), `${name} must be a write tool`);
  assert.equal(WRITE_TOOL_NAMES.has('template_review_list_comments'), false);

  const { client } = fakeComments();
  const full = harness();
  registerTools(full.server, () => fakeAirtable().client, () => reviewer, { getReviewCommentsClient: () => client });
  for (const name of [...COMMENT_WRITE_TOOLS, 'template_review_list_comments']) assert.ok(full.names.includes(name), name);

  const readOnly = harness();
  registerTools(readOnly.server, () => fakeAirtable().client, () => reviewer, { getReviewCommentsClient: () => client }, { allowWrites: false });
  assert.ok(readOnly.names.includes('template_review_list_comments'));
  for (const name of COMMENT_WRITE_TOOLS) assert.equal(readOnly.names.includes(name), false, name);
});

test('add_comment takes the asset from Airtable and needs assignment for drafts', async () => {
  const { client, calls } = fakeComments();
  let assignmentChecks = 0;
  const airtable = fakeAirtable({
    requireAssignedVersion: async () => {
      assignmentChecks += 1;
      return version;
    },
  });
  const { server, handlers } = harness();
  registerTools(server, () => airtable.client, () => reviewer, { getReviewCommentsClient: () => client });

  const draft = payload(
    await handlers.get('template_review_add_comment')?.({ version_id: VERSION_ID, body: ' Fix the 404 page ', visibility: 'draft' }),
  );
  assert.equal(draft.ok, true);
  assert.equal(assignmentChecks, 1);
  assert.deepEqual(calls[0], ['add', VERSION_ID, 'Reviewer@Example.com', { assetRef: ASSET_ID, body: 'Fix the 404 page', visibility: 'draft' }]);

  // Internal notes never reach the creator, so any mapped reviewer may leave one.
  const note = payload(
    await handlers.get('template_review_add_comment')?.({ version_id: VERSION_ID, body: 'Second opinion: fine', visibility: 'internal', parent_id: 'c-1' }),
  );
  assert.equal(note.ok, true);
  assert.equal(assignmentChecks, 1);
  assert.deepEqual(calls[1], ['add', VERSION_ID, 'Reviewer@Example.com', { assetRef: ASSET_ID, body: 'Second opinion: fine', visibility: 'internal', parentId: 'c-1' }]);
});

test('comment tools fail closed without a reviewer email', async () => {
  const { client, calls } = fakeComments();
  const { server, handlers } = harness();
  registerTools(server, () => fakeAirtable().client, () => ({ ...reviewer, email: undefined }), { getReviewCommentsClient: () => client });
  const result = payload(await handlers.get('template_review_list_comments')?.({ version_id: VERSION_ID }));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'REVIEWER_EMAIL_UNAVAILABLE');
  assert.equal(calls.length, 0);
});

test('edit, delete, resolve, and release pass through with the reviewer email', async () => {
  const { client, calls } = fakeComments();
  const { server, handlers } = harness();
  registerTools(server, () => fakeAirtable().client, () => reviewer, { getReviewCommentsClient: () => client });

  assert.equal(payload(await handlers.get('template_review_edit_comment')?.({ comment_id: 'c-1', body: 'Alt text missing' })).ok, true);
  assert.equal(payload(await handlers.get('template_review_delete_comment')?.({ comment_id: 'c-2' })).ok, true);
  assert.equal(payload(await handlers.get('template_review_resolve_comment')?.({ comment_id: 'c-1', resolution: 'resolved' })).ok, true);
  const released = payload(await handlers.get('template_review_release_feedback')?.({ version_id: VERSION_ID, expected_drafts: [] }));
  assert.equal(released.data.released, 2);
  assert.equal(released.data.creator_email_sent, false);

  assert.deepEqual(calls, [
    ['edit', 'c-1', 'Reviewer@Example.com', 'Alt text missing'],
    ['remove', 'c-2', 'Reviewer@Example.com'],
    ['resolve', 'c-1', 'Reviewer@Example.com', 'resolved'],
    ['release', VERSION_ID, 'Reviewer@Example.com', undefined, []],
  ]);
});

test('request_changes writes Airtable first, then posts the feedback and releases drafts', async () => {
  const { client, calls } = fakeComments();
  const airtable = fakeAirtable();
  const { server, handlers } = harness();
  registerTools(server, () => airtable.client, () => reviewer, { getReviewCommentsClient: () => client });

  const result = payload(
    await handlers.get('template_review_request_changes')?.({ version_id: VERSION_ID, review_feedback: 'Fix the 404 page' }),
  );
  assert.equal(result.ok, true);
  assert.equal(airtable.writes.length, 1);
  assert.deepEqual(
    calls.map(([name]) => name),
    ['listVersion', 'add', 'release'],
  );
  assert.deepEqual(calls[1], ['add', VERSION_ID, 'Reviewer@Example.com', { assetRef: ASSET_ID, body: 'Fix the 404 page', visibility: 'draft' }]);
  assert.deepEqual(result.data.review_comments, { ok: true, feedback_comment_added: true, released: 2, creator_email_sent: false });
});

test('a retried decision does not post the same feedback twice', async () => {
  const { client, calls } = fakeComments({
    existing: [comment({ body: 'Fix the 404 page', visibility: 'released', authorEmail: 'reviewer@example.com' })],
  });
  const { server, handlers } = harness();
  registerTools(server, () => fakeAirtable().client, () => reviewer, { getReviewCommentsClient: () => client });

  const result = payload(
    await handlers.get('template_review_reject_version')?.({ version_id: VERSION_ID, reject_reason: 'Quality', rejection_feedback: 'Fix the 404 page' }),
  );
  assert.equal(result.data.review_comments.feedback_comment_added, false);
  assert.deepEqual(
    calls.map(([name]) => name),
    ['listVersion', 'release'],
  );
});

test('an internal note with the same words does not count as posted feedback', async () => {
  const { client, calls } = fakeComments({
    existing: [comment({ body: 'Fix the 404 page', visibility: 'internal', authorEmail: 'reviewer@example.com' })],
  });
  const { server, handlers } = harness();
  registerTools(server, () => fakeAirtable().client, () => reviewer, { getReviewCommentsClient: () => client });

  const result = payload(
    await handlers.get('template_review_request_changes')?.({ version_id: VERSION_ID, review_feedback: 'Fix the 404 page' }),
  );
  assert.equal(result.data.review_comments.feedback_comment_added, true);
  assert.deepEqual(
    calls.map(([name]) => name),
    ['listVersion', 'add', 'release'],
  );
});

test('approve releases drafts without adding a comment', async () => {
  const { client, calls } = fakeComments();
  const { server, handlers } = harness();
  registerTools(server, () => fakeAirtable().client, () => reviewer, { getReviewCommentsClient: () => client });

  const result = payload(await handlers.get('template_review_approve_version')?.({ version_id: VERSION_ID }));
  assert.equal(result.ok, true);
  assert.deepEqual(calls, [['release', VERSION_ID, 'Reviewer@Example.com']]);
  assert.equal(result.data.review_comments.feedback_comment_added, false);
});

test('decisions and release_feedback name the creator from the asset record for the email', async () => {
  const calls: unknown[][] = [];
  const client = {
    listVersion: async () => [],
    add: async () => comment({}),
    release: async (...args: unknown[]) => {
      calls.push(args);
      return { released: 1, notification: { status: 'sent', sent: 1 } };
    },
  } as unknown as ReviewCommentsClient;
  const airtable = fakeAirtable({
    getScopedVersion: async () => ({
      version,
      asset: { assetId: ASSET_ID, templateName: 'Example Template', creatorEmail: 'creator@example.com', creatorName: 'Casey' },
    }),
  });
  const { server, handlers } = harness();
  registerTools(server, () => airtable.client, () => reviewer, { getReviewCommentsClient: () => client });

  const decision = payload(
    await handlers.get('template_review_request_changes')?.({ version_id: VERSION_ID, review_feedback: 'Fix the 404 page' }),
  );
  assert.deepEqual(calls[0], [
    VERSION_ID,
    'Reviewer@Example.com',
    {
      recipientEmail: 'creator@example.com',
      assetName: 'Example Template',
      assetType: 'Template',
      recipientName: 'Casey',
      versionNumber: 2,
      outcome: 'changes_requested',
    },
  ]);
  assert.equal(decision.data.review_comments.creator_email_sent, true);
  assert.deepEqual(decision.data.review_comments.notification, { status: 'sent', sent: 1 });

  const released = payload(await handlers.get('template_review_release_feedback')?.({ version_id: VERSION_ID, expected_drafts: [] }));
  assert.equal((calls[1][2] as { outcome?: string }).outcome, undefined);
  assert.equal((calls[1][2] as { recipientEmail: string }).recipientEmail, 'creator@example.com');
  assert.equal(released.data.creator_email_sent, true);
});

test('a failed email is reported with the way to retry it', async () => {
  const client = {
    release: async () => ({ released: 1, notification: { status: 'failed', sent: 0, pending: 1, error: 'Knock returned HTTP 503' } }),
  } as unknown as ReviewCommentsClient;
  const { server, handlers } = harness();
  registerTools(server, () => fakeAirtable().client, () => reviewer, { getReviewCommentsClient: () => client });

  const result = payload(await handlers.get('template_review_release_feedback')?.({ version_id: VERSION_ID, expected_drafts: [] }));
  assert.equal(result.data.creator_email_sent, false);
  assert.match(result.data.email_next_step, /template_review_release_feedback/);
});

test('a comments failure after the Airtable write is reported, not thrown', async () => {
  const { client } = fakeComments({ failWith: new ReviewCommentsClientError('REVIEW_COMMENTS_UNREACHABLE', 'down', 503) });
  const airtable = fakeAirtable();
  const { server, handlers } = harness();
  registerTools(server, () => airtable.client, () => reviewer, { getReviewCommentsClient: () => client });

  const result = payload(await handlers.get('template_review_approve_version')?.({ version_id: VERSION_ID }));
  assert.equal(result.ok, true);
  assert.equal(airtable.writes.length, 1);
  assert.equal(result.data.review_comments.ok, false);
  assert.equal(result.data.review_comments.error.code, 'REVIEW_COMMENTS_UNREACHABLE');
  assert.match(result.data.review_comments.next_step, /re-run template_review_approve_version/);
});

test('decisions are unchanged when the comments service is not configured', async () => {
  const { server, handlers } = harness();
  registerTools(server, () => fakeAirtable().client, () => reviewer);
  const result = payload(await handlers.get('template_review_approve_version')?.({ version_id: VERSION_ID }));
  assert.equal(result.ok, true);
  assert.equal('review_comments' in result.data, false);
});

test('get_ticket_thread returns comments even when the version has no Zendesk ticket', async () => {
  const { client } = fakeComments({
    existing: [
      comment({ id: 'c-1', visibility: 'released', releasedAt: '2026-11-09T01:00:00.000Z' }),
      comment({ id: 'c-2', visibility: 'draft' }),
      comment({ id: 'c-3', visibility: 'internal' }),
    ],
  });
  const zendesk = { getTicketThread: async () => assert.fail('no ticket to read') } as unknown as ZendeskClient;
  const { server, handlers } = harness();
  registerTools(server, () => fakeAirtable().client, () => reviewer, {
    getReviewCommentsClient: () => client,
    getZendeskClient: () => zendesk,
  });

  const publicView = payload(
    await handlers.get('template_review_get_ticket_thread')?.({ version_id: VERSION_ID, include_internal_notes: false, limit: 20 }),
  );
  assert.equal(publicView.ok, true);
  assert.equal(publicView.data.thread, null);
  assert.deepEqual(
    publicView.data.review_comments.map((c: ReviewComment) => c.id),
    ['c-1'],
  );

  const fullView = payload(
    await handlers.get('template_review_get_ticket_thread')?.({ version_id: VERSION_ID, include_internal_notes: true, limit: 20 }),
  );
  assert.deepEqual(
    fullView.data.review_comments.map((c: ReviewComment) => c.id),
    ['c-1', 'c-2', 'c-3'],
  );
});

test('get_ticket_thread keeps the Zendesk thread when the comments service is down', async () => {
  const { client } = fakeComments({ failWith: new ReviewCommentsClientError('REVIEW_COMMENTS_UNREACHABLE', 'down', 503) });
  const zendesk = {
    agentTicketUrl: (id: string) => `https://zendesk.test/agent/tickets/${id}`,
    getTicketThread: async (ticketId: string) => ({ ticketId, comments: [{ id: 1, isPublic: true, body: 'Fixed.' }] }),
  } as unknown as ZendeskClient;
  const airtable = fakeAirtable({ getScopedVersion: async () => ({ version: { ...version, zendeskTicketId: '100' }, asset: { assetId: ASSET_ID } }) });
  const { server, handlers } = harness();
  registerTools(server, () => airtable.client, () => reviewer, { getReviewCommentsClient: () => client, getZendeskClient: () => zendesk });

  const result = payload(
    await handlers.get('template_review_get_ticket_thread')?.({ version_id: VERSION_ID, include_internal_notes: false, limit: 20 }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.data.thread.ticketId, '100');
  assert.equal(result.data.review_comments, null);
  assert.equal(result.data.review_comments_error.code, 'REVIEW_COMMENTS_UNREACHABLE');
});

test('the HTTP client sends the reviewer key, actor, and JSON body', async () => {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const client = new ReviewCommentsClient({
    baseUrl: 'https://comments.test/',
    apiKey: 'test-key',
    fetch: (async (url: string, init: RequestInit) => {
      requests.push({ url, init });
      return Response.json({ success: true, data: { released: 1 } });
    }) as unknown as typeof fetch,
  });

  assert.deepEqual(await client.release(VERSION_ID, 'reviewer@example.com'), { released: 1 });
  await client.edit('c-1', 'reviewer@example.com', 'new text');

  assert.equal(requests[0].url, `https://comments.test/v1/versions/${VERSION_ID}/release`);
  assert.equal(requests[0].init.method, 'POST');
  assert.deepEqual(requests[0].init.headers, {
    Authorization: 'Bearer test-key',
    'X-Actor-Email': 'reviewer@example.com',
    'X-Actor-Role': 'reviewer',
  });
  assert.equal(requests[1].url, 'https://comments.test/v1/comments/c-1');
  assert.equal(requests[1].init.method, 'PATCH');
  assert.equal(requests[1].init.body, JSON.stringify({ body: 'new text' }));

  // With a notice, the release carries the recipient for the Worker to email.
  const notice = { recipientEmail: 'creator@example.com', assetName: 'Example Template', assetType: 'Template' };
  await client.release(VERSION_ID, 'reviewer@example.com', notice);
  assert.equal(requests[2].init.body, JSON.stringify({ notify: notice }));
  assert.equal((requests[2].init.headers as Record<string, string>)['Content-Type'], 'application/json');
});

test('the HTTP client maps service and network failures to typed errors', async () => {
  const refused = new ReviewCommentsClient({
    baseUrl: 'https://comments.test',
    apiKey: 'test-key',
    fetch: (async () => Response.json({ success: false, error: 'version belongs to a different asset' }, { status: 409 })) as unknown as typeof fetch,
  });
  await assert.rejects(refused.listVersion(VERSION_ID, 'reviewer@example.com'), (error: unknown) => {
    assert.ok(error instanceof ReviewCommentsClientError);
    assert.equal(error.code, 'REVIEW_COMMENTS_REQUEST_FAILED');
    assert.equal(error.status, 409);
    assert.equal(error.message, 'version belongs to a different asset');
    return true;
  });

  const down = new ReviewCommentsClient({
    baseUrl: 'https://comments.test',
    apiKey: 'test-key',
    fetch: (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch,
  });
  await assert.rejects(down.listVersion(VERSION_ID, 'reviewer@example.com'), (error: unknown) => {
    assert.ok(error instanceof ReviewCommentsClientError);
    assert.equal(error.code, 'REVIEW_COMMENTS_UNREACHABLE');
    return true;
  });
});

test('release_feedback passes the drafts the reviewer read, and add_comment passes the request key', async () => {
  const { calls, client } = fakeComments();
  const { server, handlers } = harness();
  registerTools(server, () => fakeAirtable().client, () => reviewer, { getReviewCommentsClient: () => client });

  await handlers.get('template_review_release_feedback')?.({
    version_id: VERSION_ID,
    expected_drafts: [{ id: 'c-1', edited_at: null }, { id: 'c-2', edited_at: '2026-01-02T03:04:05.000Z' }],
  });
  assert.deepEqual(calls.at(-1), [
    'release',
    VERSION_ID,
    'Reviewer@Example.com',
    undefined,
    [{ id: 'c-1', editedAt: null }, { id: 'c-2', editedAt: '2026-01-02T03:04:05.000Z' }],
  ]);

  await handlers.get('template_review_add_comment')?.({ version_id: VERSION_ID, body: 'Fix the 404 page', visibility: 'draft', request_key: 'save-0123456789' });
  assert.equal((calls.at(-1)?.[3] as { requestKey?: string }).requestKey, 'save-0123456789');
});
