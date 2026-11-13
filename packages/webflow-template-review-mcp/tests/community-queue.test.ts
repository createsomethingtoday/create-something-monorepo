import assert from 'node:assert/strict';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AirtableClient } from '../src/airtable.js';
import {
  COMMUNITY_QUEUE_WRITE_TOOL_NAMES,
  flattenHealth,
  flattenQueueItem,
  type CommunityQueueBinding,
  type CommunityQueueHealth,
  type CommunityQueueItem,
} from '../src/community-queue.js';
import { applyCommunityQueueAdmins, parseReviewerDirectory, type ReviewerProfile } from '../src/reviewer-directory.js';
import { registerTools, WRITE_TOOL_NAMES } from '../src/tools.js';

type ToolResult = { content: Array<{ type?: string; text?: string }>; isError?: boolean };
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

function harness() {
  const handlers = new Map<string, ToolHandler>();
  const server = {
    registerTool(name: string, _config: unknown, handler: ToolHandler) {
      handlers.set(name, handler);
    },
    tool(name: string, ...args: unknown[]) {
      handlers.set(name, args.at(-1) as ToolHandler);
    },
  } as unknown as McpServer;
  return { server, handlers };
}

function payload(result: ToolResult) {
  return JSON.parse(result.content[0]?.text ?? '{}') as {
    ok: boolean;
    count?: number;
    data?: unknown;
    errors?: unknown[];
    error?: { code: string; message: string; status: number };
  };
}

const reviewer: ReviewerProfile = {
  accountId: 'acct_reviewer',
  airtableCollaboratorId: 'usr_reviewer',
  email: 'reviewer@example.com',
};
const admin: ReviewerProfile = { ...reviewer, accountId: 'acct_admin', email: 'admin@example.com', communityQueueAdmin: true };

const item: CommunityQueueItem = {
  post_id: 'p1',
  url: 'https://example.com/post/p1',
  title: 'A question',
  status: 'queued',
  waiting_since: '2026-01-01T00:00:00.000Z',
  hours_waiting: 5,
  started_by: 'Creator',
  waiting_on: 'Creator',
  message_count: 2,
  excerpt: 'Hello',
  draft: { id: 'q1', text: 'Draft text', reasoning: 'note', created_at: '2026-01-01T01:00:00.000Z' },
  last_error: null,
  synced_at: '2026-01-01T02:00:00.000Z',
};

const health: CommunityQueueHealth = {
  generated_at: '2026-01-01T03:00:00.000Z',
  sweep: { last_run_at: '2026-01-01T02:30:00.000Z', status: 'completed', error: null, checked: 18, missed: 0, stale: 1, reverified: 0, minutes_since: 30, healthy: true },
  webhook: { last_event_at: '2026-01-01T02:45:00.000Z', last_event: 'post.published', events_recorded: 4, hours_since: 0.3 },
  counts: { open: 1, new: 0, queued: 1, responded: 30, dismissed: 36 },
  drafts: { pending: 1, sending: 0 },
  oldest_wait_hours: 5,
  sends: { last_7_days: 3, not_published: 0 },
  errors: [],
};

function fakeBinding() {
  const calls: Array<{ method: string; input: unknown }> = [];
  const binding: CommunityQueueBinding = {
    async listQueue(input) {
      calls.push({ method: 'listQueue', input });
      return { count: 1, items: [item] };
    },
    async getThread(input) {
      calls.push({ method: 'getThread', input });
      return { found: true, post_id: input.postId, title: 'A question', url: null, messages: [] };
    },
    async health() {
      calls.push({ method: 'health', input: null });
      return health;
    },
    async history(input) {
      calls.push({ method: 'history', input });
      return { count: 0, items: [] };
    },
    async saveDraft(input) {
      calls.push({ method: 'saveDraft', input });
      return { ok: true, queue_id: 'q1' };
    },
    async dismiss(input) {
      calls.push({ method: 'dismiss', input });
      return { ok: true };
    },
    async sendDraft(input) {
      calls.push({ method: 'sendDraft', input });
      return { ok: true, reply_id: 'r1' };
    },
  };
  return { binding, calls };
}

function register(options: { who: ReviewerProfile | null; binding?: CommunityQueueBinding | null; allowWrites?: boolean }) {
  const { server, handlers } = harness();
  registerTools(
    server,
    () => ({}) as AirtableClient,
    () => options.who,
    { communityQueue: { getBinding: () => options.binding ?? null } },
    { allowWrites: options.allowWrites ?? true },
  );
  return handlers;
}

test('the community write tools are in the write set, so a read-only session never sees them', () => {
  for (const name of COMMUNITY_QUEUE_WRITE_TOOL_NAMES) assert.equal(WRITE_TOOL_NAMES.has(name), true, name);
  const { binding } = fakeBinding();
  const handlers = register({ who: admin, binding, allowWrites: false });
  for (const name of COMMUNITY_QUEUE_WRITE_TOOL_NAMES) assert.equal(handlers.has(name), false, name);
  assert.equal(handlers.has('template_review_community_queue'), true);
  assert.equal(handlers.has('template_review_community_health'), true);
});

test('a reviewer reads the queue as flat rows', async () => {
  const { binding, calls } = fakeBinding();
  const handlers = register({ who: reviewer, binding });
  const result = payload(await handlers.get('template_review_community_queue')!({}));
  assert.equal(result.ok, true);
  assert.deepEqual(result.data, [flattenQueueItem(item)]);
  assert.equal((result.data as Array<Record<string, unknown>>)[0].draft_text, 'Draft text');
  assert.deepEqual(calls[0], { method: 'listQueue', input: { limit: 50 } });
});

test('health is one flat row and says whether the viewer may write', async () => {
  const { binding } = fakeBinding();
  const asReviewer = payload(await register({ who: reviewer, binding }).get('template_review_community_health')!({}));
  const asAdmin = payload(await register({ who: admin, binding }).get('template_review_community_health')!({}));
  assert.deepEqual(asReviewer.data, [flattenHealth(health, false)]);
  assert.equal((asReviewer.data as Array<Record<string, unknown>>)[0].viewer_can_write, 0);
  assert.equal((asAdmin.data as Array<Record<string, unknown>>)[0].viewer_can_write, 1);
  assert.deepEqual(asAdmin.errors, []);
});

test('a reviewer who is not a community-queue admin cannot write', async () => {
  const { binding, calls } = fakeBinding();
  const handlers = register({ who: reviewer, binding });
  const attempts: Array<[string, Record<string, unknown>]> = [
    ['template_review_community_save_draft', { post_id: 'p1', draft: 'x' }],
    ['template_review_community_dismiss', { post_id: 'p1', reason: 'x' }],
    ['template_review_community_send', { post_id: 'p1', draft: 'x', confirm_public_reply: true }],
  ];
  for (const [name, args] of attempts) {
    const result = await handlers.get(name)!(args);
    assert.equal(result.isError, true, name);
    assert.equal(payload(result).error?.code, 'COMMUNITY_QUEUE_ADMIN_REQUIRED', name);
  }
  assert.equal(calls.length, 0);
});

test('a session with no reviewer cannot write', async () => {
  const { binding, calls } = fakeBinding();
  const result = await register({ who: null, binding }).get('template_review_community_send')!({
    post_id: 'p1',
    draft: 'x',
    confirm_public_reply: true,
  });
  assert.equal(payload(result).error?.code, 'COMMUNITY_QUEUE_ADMIN_REQUIRED');
  assert.equal(calls.length, 0);
});

test('send needs the public-reply confirmation, then records who asked', async () => {
  const { binding, calls } = fakeBinding();
  const handlers = register({ who: admin, binding });
  const send = handlers.get('template_review_community_send')!;

  const refused = await send({ post_id: 'p1', draft: 'Reply text', confirm_public_reply: false });
  assert.equal(payload(refused).error?.code, 'PUBLIC_REPLY_CONFIRMATION_REQUIRED');
  assert.equal(calls.length, 0);

  const sent = payload(await send({ post_id: 'p1', draft: 'Reply text', confirm_public_reply: true }));
  assert.deepEqual(sent.data, { post_id: 'p1', sent: true, reply_id: 'r1' });
  assert.deepEqual(calls, [
    { method: 'sendDraft', input: { postId: 'p1', draft: 'Reply text', requestedBy: 'admin@example.com' } },
  ]);
});

test('a refused write from the queue reaches the caller as an error', async () => {
  const { binding } = fakeBinding();
  binding.sendDraft = async () => ({ ok: false, error: 'This draft is not open for sending.' });
  binding.dismiss = async () => ({ ok: false, reason: 'No open queue item for this post ID.' });
  const handlers = register({ who: admin, binding });
  const send = await handlers.get('template_review_community_send')!({ post_id: 'p1', draft: 'x', confirm_public_reply: true });
  assert.equal(send.isError, true);
  assert.equal(payload(send).error?.code, 'COMMUNITY_QUEUE_SEND_FAILED');
  const dismiss = await handlers.get('template_review_community_dismiss')!({ post_id: 'p1', reason: 'x' });
  assert.equal(payload(dismiss).error?.code, 'COMMUNITY_QUEUE_WRITE_REFUSED');
});

test('without the binding every community tool fails closed', async () => {
  const handlers = register({ who: admin, binding: null });
  for (const name of ['template_review_community_queue', 'template_review_community_health', 'template_review_community_history']) {
    const result = await handlers.get(name)!({});
    assert.equal(payload(result).error?.code, 'COMMUNITY_QUEUE_NOT_CONFIGURED', name);
  }
  const send = await handlers.get('template_review_community_send')!({ post_id: 'p1', draft: 'x', confirm_public_reply: true });
  assert.equal(payload(send).error?.code, 'COMMUNITY_QUEUE_NOT_CONFIGURED');
});

test('the admin grant comes from the account ID list', () => {
  const directory = parseReviewerDirectory(
    JSON.stringify({
      acct_a: { airtableCollaboratorId: 'usr_a', email: 'a@example.com' },
      acct_b: { airtableCollaboratorId: 'usr_b', email: 'b@example.com' },
    }),
  );
  const granted = applyCommunityQueueAdmins(directory, 'acct_b, acct_missing');
  assert.equal(granted.get('acct_a')?.communityQueueAdmin, undefined);
  assert.equal(granted.get('acct_b')?.communityQueueAdmin, true);
  assert.equal(applyCommunityQueueAdmins(directory, '').get('acct_b')?.communityQueueAdmin, undefined);
});
