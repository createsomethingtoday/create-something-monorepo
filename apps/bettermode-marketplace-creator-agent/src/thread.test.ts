import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { BettermodeMember, BettermodePost } from './bettermode';
import { draftToHtml, isStaff, textFingerprint, threadState } from './thread.ts';

const creator: BettermodeMember = { id: 'm-creator', name: 'Creator', email: 'creator@example.com' };
const other: BettermodeMember = { id: 'm-other', name: 'Other', email: 'other@example.com' };
const staff: BettermodeMember = { id: 'm-staff', name: 'Staff', email: 'staff@example.org' };
const byStaffId = (member: BettermodeMember | null) => member?.id === staff.id;

function post(
  id: string,
  owner: BettermodeMember,
  createdAt: string,
  extra: Partial<BettermodePost> = {},
): BettermodePost {
  return { id, owner, createdAt, status: 'PUBLISHED', textContent: `text ${id}`, ...extra };
}

function thread(...replies: BettermodePost[]): BettermodePost {
  return post('root', creator, '2026-01-01T00:00:00Z', { replies: { nodes: replies } });
}

test('a new creator thread needs a response and waits since the root post', () => {
  const state = threadState(thread(), byStaffId);
  assert.equal(state.needsResponse, true);
  assert.equal(state.waitingSince, '2026-01-01T00:00:00Z');
  assert.equal(state.latestCreatorMessage?.id, 'root');
  assert.equal(state.latestCreatorMessage?.isRoot, true);
  assert.equal(state.lastStaffReplyAt, null);
});

test('a staff reply answers the thread', () => {
  const state = threadState(thread(post('r1', staff, '2026-01-02T00:00:00Z')), byStaffId);
  assert.equal(state.needsResponse, false);
  assert.equal(state.waitingSince, null);
  assert.equal(state.lastStaffReplyAt, '2026-01-02T00:00:00Z');
});

test('a nested creator reply under a staff reply reopens the thread', () => {
  const state = threadState(
    thread(
      post('r1', staff, '2026-01-02T00:00:00Z', {
        replies: {
          nodes: [
            post('n1', creator, '2026-01-03T00:00:00Z'),
            post('n2', other, '2026-01-04T00:00:00Z'),
          ],
        },
      }),
    ),
    byStaffId,
  );
  assert.equal(state.needsResponse, true);
  // Waiting starts at the first unanswered creator message, not the latest.
  assert.equal(state.waitingSince, '2026-01-03T00:00:00Z');
  assert.equal(state.latestCreatorMessage?.id, 'n2');
  assert.equal(state.messages.length, 4);
});

test('a staff reply that moderation holds does not count as a response', () => {
  const state = threadState(
    thread(post('r1', staff, '2026-01-02T00:00:00Z', { status: 'BLOCKED' })),
    byStaffId,
  );
  assert.equal(state.needsResponse, true);
  assert.equal(state.lastStaffReplyAt, null);
  assert.deepEqual(
    state.messages.map((message) => message.id),
    ['root'],
  );
});

test('a staff announcement with no creator message owes no response', () => {
  const state = threadState(post('root', staff, '2026-01-01T00:00:00Z'), byStaffId);
  assert.equal(state.needsResponse, false);
  assert.equal(state.latestCreatorMessage, null);
});

test('messages are ordered by time across nesting levels', () => {
  const state = threadState(
    thread(
      post('r1', creator, '2026-01-02T00:00:00Z', {
        replies: { nodes: [post('n1', staff, '2026-01-05T00:00:00Z')] },
      }),
      post('r2', creator, '2026-01-03T00:00:00Z'),
    ),
    byStaffId,
  );
  assert.deepEqual(
    state.messages.map((message) => message.id),
    ['root', 'r1', 'r2', 'n1'],
  );
  assert.equal(state.needsResponse, false);
});

test('the full body is preferred over the truncated preview', () => {
  const state = threadState(
    post('root', creator, '2026-01-01T00:00:00Z', {
      textContent: 'full body',
      shortContent: '<p>short</p>',
    }),
    byStaffId,
  );
  assert.equal(state.messages[0].text, 'full body');
});

test('staff are admin IDs, staff email domains, and the app identity', () => {
  const config = { adminIds: ['m-admin'], domains: ['example.org'] };
  assert.equal(isStaff({ id: 'm-admin' }, config), true);
  assert.equal(isStaff({ id: 'm-1', email: 'Person@Example.org' }, config), true);
  // API replies are owned by the app, not by the admin who approved them.
  assert.equal(isStaff({ id: 'APP::abc123' }, config), true);
  assert.equal(isStaff({ id: 'm-2', email: 'person@example.com' }, config), false);
  assert.equal(isStaff({ id: 'm-3', email: 'person@notexample.org' }, config), false);
  assert.equal(isStaff(null, config), false);
});

test('an edit changes the text fingerprint, a repeat of the same text does not', () => {
  const original = textFingerprint('How do I update my template?');
  assert.equal(textFingerprint('  How do I update\n my template? '), original);
  assert.notEqual(textFingerprint('How do I delete my template?'), original);
  assert.notEqual(textFingerprint(''), original);
});

test('a draft becomes paragraphs, and a URL becomes a link', () => {
  const url = 'https://example.com/post/abc?highlight=xyz';
  assert.equal(
    draftToHtml(`First line.\n\nSee:\n\n${url}\n\nLast line.`),
    `<p>First line.</p><p>See:</p><p><a href="${url}">${url}</a></p><p>Last line.</p>`,
  );
});

test('punctuation after a URL stays outside the link, and markup is escaped', () => {
  assert.equal(
    draftToHtml('Read https://example.com/a?x=1&y=2. Then <b>reply</b> "here".'),
    '<p>Read <a href="https://example.com/a?x=1&amp;y=2">https://example.com/a?x=1&amp;y=2</a>. Then &lt;b&gt;reply&lt;/b&gt; &quot;here&quot;.</p>',
  );
  assert.equal(
    draftToHtml('(see https://example.com/a)\nnext'),
    '<p>(see <a href="https://example.com/a">https://example.com/a</a>)<br>next</p>',
  );
  assert.equal(
    draftToHtml('Quote "https://example.com/a" ends.'),
    '<p>Quote &quot;<a href="https://example.com/a">https://example.com/a</a>&quot; ends.</p>',
  );
});

test('a URL in angle brackets or with its own brackets links cleanly', () => {
  assert.equal(
    draftToHtml('See <https://example.com/help> first.'),
    '<p>See &lt;<a href="https://example.com/help">https://example.com/help</a>&gt; first.</p>',
  );
  assert.equal(
    draftToHtml('Read https://example.com/wiki/Name_(band).'),
    '<p>Read <a href="https://example.com/wiki/Name_(band)">https://example.com/wiki/Name_(band)</a>.</p>',
  );
});
