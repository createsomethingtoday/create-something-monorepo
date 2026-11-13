import { readFileSync } from 'node:fs';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';

import type { AirtableClient } from './airtable.js';
import {
  buildReleaseNotice,
  ReviewCommentsClientError,
  type ReviewComment,
  type ReviewCommentsClient,
} from './review-comments.js';
import { registerTools } from './tools.js';
import type { ZendeskClient } from './zendesk.js';

type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: Array<{ text: string }> }>;

const VERSION = 'recTEST_VERSION_1';
const ASSET = 'recTEST_ASSET_1';
const REVIEWER_EMAIL = 'reviewer@example.com';

function comment(overrides: Partial<ReviewComment> = {}): ReviewComment {
  return {
    id: 'comment-1',
    assetRef: ASSET,
    versionRef: VERSION,
    parentId: null,
    authorEmail: REVIEWER_EMAIL,
    authorRole: 'reviewer',
    body: 'Install URL returns a 404',
    visibility: 'draft',
    releasedAt: null,
    resolution: 'open',
    rubricRef: null,
    createdAt: '2026-11-13T00:00:00.000Z',
    editedAt: null,
    ...overrides,
  };
}

function createAirtable(version: Record<string, unknown> = {}) {
  return {
    getVersionById: vi.fn().mockResolvedValue({ versionId: VERSION, assetId: ASSET, versionNumber: 3, ...version }),
    getAssetById: vi.fn().mockResolvedValue({ assetId: ASSET, appName: 'Example App' }),
    updateVersionReview: vi.fn().mockResolvedValue({ versionId: VERSION, reviewStatus: 'saved' }),
  };
}

function createComments() {
  return {
    listVersion: vi.fn().mockResolvedValue([] as ReviewComment[]),
    add: vi.fn().mockResolvedValue(comment()),
    edit: vi.fn().mockResolvedValue(comment({ body: 'edited' })),
    remove: vi.fn().mockResolvedValue({ deleted: 'comment-1' }),
    release: vi.fn().mockResolvedValue({ released: 2 }),
    resolve: vi.fn().mockResolvedValue(comment({ resolution: 'resolved' })),
  };
}

function setup(
  options: {
    airtable?: ReturnType<typeof createAirtable>;
    comments?: ReturnType<typeof createComments> | null;
    email?: string | null;
    zendesk?: Partial<ZendeskClient> | null;
  } = {},
) {
  const names: string[] = [];
  const handlers = new Map<string, ToolHandler>();
  const server = {
    tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
      names.push(name);
      handlers.set(name, handler);
    },
  } as unknown as McpServer;

  const airtable = options.airtable ?? createAirtable();
  const comments = options.comments === undefined ? createComments() : options.comments;
  const email = options.email === undefined ? REVIEWER_EMAIL : options.email;

  registerTools(
    server,
    () => airtable as unknown as AirtableClient,
    () => (email ? { email } : null),
    () => (options.zendesk ?? null) as ZendeskClient | null,
    () => comments as unknown as ReviewCommentsClient | null,
  );

  const run = async (name: string, args: Record<string, unknown>) => {
    const result = await handlers.get(name)!(args);
    return JSON.parse(result.content[0].text) as { ok: boolean; data?: any; error?: any };
  };
  return { names, run, airtable, comments };
}

const COMMENT_TOOLS = [
  'app_review_list_comments',
  'app_review_add_comment',
  'app_review_edit_comment',
  'app_review_delete_comment',
  'app_review_release_feedback',
  'app_review_resolve_comment',
];

describe('registration', () => {
  it('registers the comment tools only when the comments service is configured', () => {
    expect(setup().names).toEqual(expect.arrayContaining(COMMENT_TOOLS));
    const without = setup({ comments: null }).names;
    for (const tool of COMMENT_TOOLS) expect(without).not.toContain(tool);
  });

  it('keeps one client implementation across the two review MCPs', () => {
    const own = readFileSync(new URL('./review-comments.ts', import.meta.url), 'utf8');
    const template = readFileSync(
      new URL('../../webflow-template-review-mcp/src/review-comments.ts', import.meta.url),
      'utf8',
    );
    expect(own).toBe(template);
  });
});

describe('comment tools', () => {
  it('takes the asset from the app version record and passes the comment through', async () => {
    const { run, comments, airtable } = setup();
    const result = await run('app_review_add_comment', {
      version_id: VERSION,
      body: '  Install URL returns a 404  ',
      visibility: 'internal',
      parent_id: 'comment-0',
    });

    expect(result.ok).toBe(true);
    expect(airtable.getAssetById).toHaveBeenCalledWith(ASSET);
    expect(comments!.add).toHaveBeenCalledWith(VERSION, REVIEWER_EMAIL, {
      assetRef: ASSET,
      body: 'Install URL returns a 404',
      visibility: 'internal',
      parentId: 'comment-0',
    });
  });

  it('refuses a version outside app-review scope before calling the service', async () => {
    const airtable = createAirtable();
    airtable.getAssetById.mockResolvedValue(null);
    const { run, comments } = setup({ airtable });

    const result = await run('app_review_add_comment', { version_id: VERSION, body: 'note', visibility: 'draft' });
    expect(result.error.code).toBe('ASSET_NOT_FOUND_OR_OUT_OF_SCOPE');
    expect(comments!.add).not.toHaveBeenCalled();

    const release = await run('app_review_release_feedback', { version_id: VERSION });
    expect(release.error.code).toBe('ASSET_NOT_FOUND_OR_OUT_OF_SCOPE');
    expect(comments!.release).not.toHaveBeenCalled();
  });

  it('needs a signed-in reviewer', async () => {
    const { run, comments } = setup({ email: null });
    for (const [tool, args] of [
      ['app_review_list_comments', { version_id: VERSION }],
      ['app_review_add_comment', { version_id: VERSION, body: 'note', visibility: 'draft' }],
      ['app_review_edit_comment', { comment_id: 'comment-1', body: 'x' }],
      ['app_review_delete_comment', { comment_id: 'comment-1' }],
      ['app_review_release_feedback', { version_id: VERSION }],
      ['app_review_resolve_comment', { comment_id: 'comment-1', resolution: 'resolved' }],
    ] as const) {
      expect((await run(tool, args)).error.code).toBe('REVIEWER_EMAIL_UNAVAILABLE');
    }
    for (const call of Object.values(comments!)) expect(call).not.toHaveBeenCalled();
  });

  it('passes list, edit, delete, release and resolve to the service as the reviewer', async () => {
    const { run, comments } = setup();
    comments!.listVersion.mockResolvedValue([comment()]);

    expect((await run('app_review_list_comments', { version_id: VERSION })).data.comments).toHaveLength(1);
    await run('app_review_edit_comment', { comment_id: 'comment-1', body: ' edited ' });
    await run('app_review_delete_comment', { comment_id: 'comment-1' });
    const released = await run('app_review_release_feedback', { version_id: VERSION });
    await run('app_review_resolve_comment', { comment_id: 'comment-1', resolution: 'carried_forward' });

    expect(comments!.edit).toHaveBeenCalledWith('comment-1', REVIEWER_EMAIL, 'edited');
    expect(comments!.remove).toHaveBeenCalledWith('comment-1', REVIEWER_EMAIL);
    expect(comments!.release).toHaveBeenCalledWith(VERSION, REVIEWER_EMAIL);
    expect(released.data).toEqual({ version_id: VERSION, released: 2, developer_email_sent: false });
    expect(comments!.resolve).toHaveBeenCalledWith('comment-1', REVIEWER_EMAIL, 'carried_forward');
  });

  it('returns the service error as a tool error', async () => {
    const { run, comments } = setup();
    comments!.edit.mockRejectedValue(
      new ReviewCommentsClientError('REVIEW_COMMENTS_REQUEST_FAILED', 'released comments cannot be edited', 403),
    );
    const result = await run('app_review_edit_comment', { comment_id: 'comment-1', body: 'x' });
    expect(result.error).toMatchObject({ code: 'REVIEW_COMMENTS_REQUEST_FAILED', status: 403 });
  });
});

describe('decisions release feedback', () => {
  it('request_changes saves the status, then posts the feedback once and releases', async () => {
    const { run, comments, airtable } = setup();
    const result = await run('app_review_request_changes', { version_id: VERSION, review_feedback: 'Fix the install URL' });

    expect(airtable.updateVersionReview).toHaveBeenCalledWith(VERSION, {
      review_status: '📤Changes Requested',
      rejection_reason: undefined,
      review_feedback: 'Fix the install URL',
    });
    expect(comments!.add).toHaveBeenCalledWith(VERSION, REVIEWER_EMAIL, {
      assetRef: ASSET,
      body: 'Fix the install URL',
      visibility: 'draft',
    });
    expect(airtable.updateVersionReview.mock.invocationCallOrder[0]).toBeLessThan(comments!.add.mock.invocationCallOrder[0]);
    expect(comments!.add.mock.invocationCallOrder[0]).toBeLessThan(comments!.release.mock.invocationCallOrder[0]);
    expect(result.data.review_comments).toEqual({
      ok: true,
      feedback_comment_added: true,
      released: 2,
      developer_email_sent: false,
    });
  });

  it('does not post the same feedback again on a retried decision', async () => {
    const { run, comments } = setup();
    comments!.listVersion.mockResolvedValue([comment({ body: 'Fix the install URL', visibility: 'released' })]);

    const result = await run('app_review_request_changes', { version_id: VERSION, review_feedback: 'Fix the install URL' });
    expect(comments!.add).not.toHaveBeenCalled();
    expect(comments!.release).toHaveBeenCalledTimes(1);
    expect(result.data.review_comments.feedback_comment_added).toBe(false);
  });

  it('still posts the feedback when only an internal note has the same words', async () => {
    const { run, comments } = setup();
    comments!.listVersion.mockResolvedValue([comment({ body: 'Fix the install URL', visibility: 'internal' })]);

    const result = await run('app_review_request_changes', { version_id: VERSION, review_feedback: 'Fix the install URL' });
    expect(comments!.add).toHaveBeenCalledWith(VERSION, REVIEWER_EMAIL, expect.objectContaining({ visibility: 'draft' }));
    expect(result.data.review_comments.feedback_comment_added).toBe(true);
  });

  it('stays silent on a "(No Notification)" status, with or without a reviewer email', async () => {
    for (const email of [REVIEWER_EMAIL, null]) {
      const { run, comments, airtable } = setup({ email });
      const result = await run('app_review_request_changes', {
        version_id: VERSION,
        review_feedback: 'Held behind the partnership shield',
        review_status: '📤Changes Requested (No Notification)',
      });

      expect(airtable.updateVersionReview).toHaveBeenCalledTimes(1);
      expect(result.data.review_comments).toMatchObject({ ok: true, skipped: 'no_notification_status', released: 0 });
      for (const call of Object.values(comments!)) expect(call).not.toHaveBeenCalled();
    }
  });

  it('approve releases drafts and posts feedback only when given', async () => {
    const { run, comments } = setup();
    const result = await run('app_review_approve_version', { version_id: VERSION });

    expect(comments!.add).not.toHaveBeenCalled();
    expect(comments!.listVersion).not.toHaveBeenCalled();
    expect(comments!.release).toHaveBeenCalledWith(VERSION, REVIEWER_EMAIL);
    expect(result.data.review_comments.ok).toBe(true);
  });

  it('reject posts the rejection feedback and releases', async () => {
    const { run, comments, airtable } = setup();
    await run('app_review_reject_version', {
      version_id: VERSION,
      rejection_reason: 'App issue',
      review_feedback: 'The bundle does not load',
    });

    expect(airtable.updateVersionReview).toHaveBeenCalledWith(
      VERSION,
      expect.objectContaining({ review_status: '❌Rejected', rejection_feedback: 'The bundle does not load' }),
    );
    expect(comments!.add).toHaveBeenCalledWith(VERSION, REVIEWER_EMAIL, expect.objectContaining({ body: 'The bundle does not load' }));
    expect(comments!.release).toHaveBeenCalledTimes(1);
  });

  it('stops before the Airtable write when no reviewer is signed in', async () => {
    const { run, airtable } = setup({ email: null });
    for (const [tool, args] of [
      ['app_review_request_changes', { version_id: VERSION, review_feedback: 'x' }],
      ['app_review_approve_version', { version_id: VERSION }],
      ['app_review_reject_version', { version_id: VERSION, rejection_reason: 'App issue', review_feedback: 'x' }],
    ] as const) {
      expect((await run(tool, args)).error.code).toBe('REVIEWER_EMAIL_UNAVAILABLE');
    }
    expect(airtable.updateVersionReview).not.toHaveBeenCalled();
  });

  it('keeps the saved status and says how to retry when the comments service fails', async () => {
    const { run, comments, airtable } = setup();
    comments!.release.mockRejectedValue(new ReviewCommentsClientError('REVIEW_COMMENTS_UNREACHABLE', 'no response', 503));

    const result = await run('app_review_request_changes', { version_id: VERSION, review_feedback: 'Fix the install URL' });
    expect(result.ok).toBe(true);
    expect(airtable.updateVersionReview).toHaveBeenCalledTimes(1);
    expect(result.data.review_comments).toMatchObject({
      ok: false,
      error: { code: 'REVIEW_COMMENTS_UNREACHABLE', status: 503 },
      next_step: expect.stringContaining('re-run app_review_request_changes'),
    });
  });

  it('leaves decisions unchanged when the comments service is not configured', async () => {
    const { run, airtable } = setup({ comments: null, email: null });
    const result = await run('app_review_request_changes', { version_id: VERSION, review_feedback: 'Fix the install URL' });

    expect(result.ok).toBe(true);
    expect(airtable.updateVersionReview).toHaveBeenCalledTimes(1);
    expect(result.data).not.toHaveProperty('review_comments');
  });
});

describe('feedback email', () => {
  const withDeveloper = () => {
    const airtable = createAirtable();
    airtable.getAssetById.mockResolvedValue({
      assetId: ASSET,
      appName: 'Example App',
      creatorEmail: 'developer@example.com',
      creatorName: 'Dana',
    });
    return airtable;
  };

  it('names the developer from the asset record, with the outcome of the decision', async () => {
    const { run, comments } = setup({ airtable: withDeveloper() });
    comments!.release.mockResolvedValue({ released: 1, notification: { status: 'sent', sent: 1 } });

    const result = await run('app_review_request_changes', { version_id: VERSION, review_feedback: 'Fix the install URL' });
    expect(comments!.release).toHaveBeenCalledWith(VERSION, REVIEWER_EMAIL, {
      recipientEmail: 'developer@example.com',
      recipientName: 'Dana',
      assetName: 'Example App',
      assetType: 'App',
      versionNumber: 3,
      outcome: 'changes_requested',
    });
    expect(result.data.review_comments).toMatchObject({
      ok: true,
      developer_email_sent: true,
      notification: { status: 'sent', sent: 1 },
    });

    await run('app_review_approve_version', { version_id: VERSION });
    expect(comments!.release.mock.calls[1][2]).toMatchObject({ outcome: 'approved' });
    await run('app_review_reject_version', { version_id: VERSION, rejection_reason: 'App issue', review_feedback: 'x' });
    expect(comments!.release.mock.calls[2][2]).toMatchObject({ outcome: 'rejected' });
  });

  it('release_feedback names the developer and reports a failed email with the way to retry it', async () => {
    const { run, comments } = setup({ airtable: withDeveloper() });
    comments!.release.mockResolvedValue({
      released: 2,
      notification: { status: 'failed', sent: 0, pending: 1, error: 'Knock returned HTTP 503' },
    });

    const result = await run('app_review_release_feedback', { version_id: VERSION });
    const notice = comments!.release.mock.calls[0][2];
    expect(notice).toMatchObject({ recipientEmail: 'developer@example.com', assetName: 'Example App' });
    expect(notice).not.toHaveProperty('outcome');
    expect(result.data).toMatchObject({
      released: 2,
      developer_email_sent: false,
      notification: { status: 'failed', pending: 1 },
      email_next_step: expect.stringContaining('app_review_release_feedback'),
    });
  });

  it('releases with no email when the asset record has no usable address', async () => {
    for (const creatorEmail of [undefined, '', 'n/a', 'not-an-address; also not']) {
      const airtable = createAirtable();
      airtable.getAssetById.mockResolvedValue({ assetId: ASSET, appName: 'Example App', creatorEmail });
      const { run, comments } = setup({ airtable });

      const result = await run('app_review_release_feedback', { version_id: VERSION });
      expect(comments!.release).toHaveBeenCalledWith(VERSION, REVIEWER_EMAIL);
      expect(result.data.developer_email_sent).toBe(false);
    }
  });

  it('emails the first valid address when the record lists several creators', async () => {
    const airtable = createAirtable();
    airtable.getAssetById.mockResolvedValue({
      assetId: ASSET,
      appName: 'Example App',
      creatorEmail: 'n/a, first@example.com; second@example.com',
    });
    const { run, comments } = setup({ airtable });

    await run('app_review_release_feedback', { version_id: VERSION });
    expect(comments!.release.mock.calls[0][2]).toMatchObject({ recipientEmail: 'first@example.com' });
  });

  it('builds a notice only from a usable address and name, cut to the service limits', () => {
    expect(buildReleaseNotice({ email: 'a@example.com', assetName: '  ', assetType: 'App' })).toBeUndefined();
    expect(buildReleaseNotice({ email: 'not an email', assetName: 'App', assetType: 'App' })).toBeUndefined();
    const notice = buildReleaseNotice({
      email: ' dev@example.com ',
      name: 'N'.repeat(300),
      assetName: 'A'.repeat(300),
      assetType: 'App',
      versionNumber: 2.5,
    });
    expect(notice).toEqual({
      recipientEmail: 'dev@example.com',
      recipientName: 'N'.repeat(120),
      assetName: 'A'.repeat(200),
      assetType: 'App',
    });
  });
});

describe('ticket thread', () => {
  it('returns the review comments when the version has no Zendesk ticket', async () => {
    const { run, comments } = setup();
    comments!.listVersion.mockResolvedValue([
      comment({ id: 'a', visibility: 'released' }),
      comment({ id: 'b', visibility: 'internal' }),
    ]);

    const result = await run('app_review_get_ticket_thread', { version_id: VERSION, include_internal_notes: false, limit: 20 });
    expect(result.data.thread).toBeNull();
    expect(result.data.thread_note).toContain('no linked Zendesk ticket');
    expect(result.data.review_comments.map((entry: ReviewComment) => entry.id)).toEqual(['a']);

    const withInternal = await run('app_review_get_ticket_thread', { version_id: VERSION, include_internal_notes: true, limit: 20 });
    expect(withInternal.data.review_comments).toHaveLength(2);
  });

  it('keeps the Zendesk thread when the comments service is down', async () => {
    const zendesk = { getTicketThread: vi.fn().mockResolvedValue({ subject: 'App review', comments: [] }) };
    const { run, comments } = setup({ airtable: createAirtable({ zendeskTicketId: '12345' }), zendesk });
    comments!.listVersion.mockRejectedValue(new ReviewCommentsClientError('REVIEW_COMMENTS_UNREACHABLE', 'no response', 503));

    const result = await run('app_review_get_ticket_thread', { version_id: VERSION, include_internal_notes: false, limit: 20 });
    expect(result.data.thread).toEqual({ subject: 'App review', comments: [] });
    expect(result.data.review_comments).toBeNull();
    expect(result.data.review_comments_error).toMatchObject({ code: 'REVIEW_COMMENTS_UNREACHABLE' });
  });

  it('behaves as before when the comments service is not configured', async () => {
    const { run } = setup({ comments: null });
    const result = await run('app_review_get_ticket_thread', { version_id: VERSION, include_internal_notes: false, limit: 20 });
    expect(result.error.code).toBe('ZENDESK_NOT_CONFIGURED');
  });
});
