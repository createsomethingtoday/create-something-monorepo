import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isThreadEvent, webhookEventName, webhookPostId, type WebhookEvent } from './events.ts';

const SPACE = 'space-1';

function subscription(data: WebhookEvent['data']): WebhookEvent {
  return { type: 'SUBSCRIPTION', entityId: 'network-1', data };
}

test('a SUBSCRIPTION event takes its name from data.name', () => {
  const event = subscription({ name: 'post.published', object: { id: 'p1', spaceId: SPACE } });
  assert.equal(webhookEventName(event), 'post.published');
  assert.equal(isThreadEvent(event, SPACE), true);
  assert.equal(webhookPostId(event), 'p1');
});

test('noun and verb give the name when data.name is absent', () => {
  const event = subscription({ noun: 'POST', verb: 'UPDATED', object: { id: 'p1' } });
  assert.equal(webhookEventName(event), 'post.updated');
  assert.equal(isThreadEvent(event, SPACE), true);
});

test('a delete or hide is a thread event, so the item can close', () => {
  assert.equal(isThreadEvent(subscription({ name: 'post.deleted', object: { id: 'p1' } }), SPACE), true);
  assert.equal(isThreadEvent(subscription({ name: 'post.hidden', object: { id: 'p1' } }), SPACE), true);
});

test('events about other things are not thread events', () => {
  for (const name of ['member.updated', 'reaction.added', 'space_membership.created']) {
    const event = subscription({ name, object: { id: 'x1', spaceId: SPACE } });
    assert.equal(isThreadEvent(event, SPACE), false, name);
  }
});

test('an unnamed SUBSCRIPTION event counts only inside the marketplace space', () => {
  assert.equal(isThreadEvent(subscription({ object: { id: 'p1', spaceId: SPACE } }), SPACE), true);
  assert.equal(isThreadEvent(subscription({ object: { id: 'p1', spaceId: 'other' } }), SPACE), false);
  assert.equal(isThreadEvent(subscription({ object: { id: 'p1', spaceId: SPACE } }), ''), false);
  assert.equal(isThreadEvent(subscription({ object: { spaceId: SPACE } }), SPACE), false);
});

test('the network ID of a SUBSCRIPTION event is never used as a post ID', () => {
  assert.equal(webhookPostId(subscription({ name: 'post.published' })), undefined);
  assert.equal(webhookPostId(subscription({ name: 'post.published', target: { postId: 'p9' } })), 'p9');
});

test('a direct call keeps the event in type and may use entityId', () => {
  const event: WebhookEvent = { type: 'post.published', entityId: 'p1', data: {} };
  assert.equal(webhookEventName(event), 'post.published');
  assert.equal(isThreadEvent(event, SPACE), true);
  assert.equal(webhookPostId(event), 'p1');
  assert.equal(isThreadEvent({ type: 'TEST' }, SPACE), false);
  assert.equal(isThreadEvent({ type: 'INTERACTION' }, SPACE), false);
});
