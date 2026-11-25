import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublisher, createReceiver, validOccurrence, TILE_STALE_MS } from './lifecycle.mjs';
const a = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const b = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
test('occurrence transport contains only bounded lifecycle data', () => {
  const messages = [];
  const publisher = createPublisher({ postMessage: (m) => messages.push(m) }, a);
  publisher.setState('recording');
  publisher.publish();
  assert.deepEqual(messages[0], { version: 1, session: a, state: 'recording', sequence: 1 });
  assert.equal(messages[1].sequence, 2);
  assert.throws(() => publisher.setState('secret meeting URL'));
});
test('multiple controls cannot update another occurrence; replay is rejected', () => {
  const rendered = [];
  const receiver = createReceiver(a, (s) => rendered.push(s));
  assert.equal(
    receiver.receive({ version: 1, session: b, state: 'recording', sequence: 1 }),
    false
  );
  assert.equal(receiver.receive({ version: 1, session: a, state: 'recording', sequence: 1 }), true);
  assert.equal(receiver.receive({ version: 1, session: a, state: 'idle', sequence: 1 }), false);
  assert.deepEqual(rendered, ['disconnected', 'recording']);
});
test('missing heartbeat fails closed and suspended control cannot restore recording', () => {
  let time = 0;
  const rendered = [];
  const receiver = createReceiver(
    a,
    (s) => rendered.push(s),
    () => time
  );
  receiver.receive({ version: 1, session: a, state: 'recording', sequence: 1 });
  time = TILE_STALE_MS + 1;
  receiver.check();
  assert.equal(
    receiver.receive({ version: 1, session: a, state: 'recording', sequence: 2 }),
    false
  );
  assert.deepEqual(rendered, ['disconnected', 'recording', 'disconnected']);
});
test('explicit disconnect is terminal and malformed messages ignored', () => {
  const rendered = [];
  const receiver = createReceiver(a, (s) => rendered.push(s));
  for (const bad of [null, {}, { version: 1, session: a, state: 'recording', sequence: NaN }])
    assert.equal(receiver.receive(bad), false);
  receiver.receive({ version: 1, session: a, state: 'disconnected', sequence: 1 });
  assert.equal(
    receiver.receive({ version: 1, session: a, state: 'recording', sequence: 2 }),
    false
  );
  assert.equal(validOccurrence(a), true);
  assert.equal(validOccurrence('https://meet.google.com/abc'), false);
});

test('queued heartbeat after viewer suspension cannot conceal a stale occurrence', () => {
  let time = 0;
  const rendered = [];
  const receiver = createReceiver(
    a,
    (s) => rendered.push(s),
    () => time
  );
  receiver.receive({ version: 1, session: a, state: 'recording', sequence: 1 });
  time = TILE_STALE_MS + 1;
  assert.equal(
    receiver.receive({ version: 1, session: a, state: 'recording', sequence: 2 }),
    false
  );
  assert.deepEqual(rendered, ['disconnected', 'recording', 'disconnected']);
});

test('positive receipt is occurrence and sequence scoped, expires, and rejects waiting', () => {
  let time = 0;
  const publisher = createPublisher({ postMessage() {} }, a, () => time);
  publisher.setState('recording');
  assert.equal(publisher.acknowledged('recording'), false);
  assert.equal(publisher.receive({ version: 1, type: 'rendered', session: b, state: 'recording', sequence: 1 }), false);
  assert.equal(publisher.receive({ version: 1, type: 'rendered', session: a, state: 'idle', sequence: 1 }), false);
  assert.equal(publisher.receive({ version: 1, type: 'rendered', session: a, state: 'recording', sequence: 1 }), true);
  assert.equal(publisher.acknowledged('recording'), true);
  time = TILE_STALE_MS + 1;
  assert.equal(publisher.acknowledged('recording'), false);
});
