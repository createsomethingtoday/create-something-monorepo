import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  classifyAgentResponseFailure,
  classifyAgentStreamFailure,
  createStreamWatchdog,
  isSessionError,
  parseSseFrames,
} from '../src/components/chat/templateChatStream';

const frame = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;

test('parses the framing the agent Worker actually emits', () => {
  const buffer = frame({ type: 'status', label: 'searching' }) + frame({ type: 'done' });
  const { events, rest } = parseSseFrames(buffer);

  assert.deepEqual(
    events.map((data) => JSON.parse(data)),
    [{ type: 'status', label: 'searching' }, { type: 'done' }],
  );
  assert.equal(rest, '');
});

test('a CRLF-normalizing proxy does not break framing', () => {
  const buffer = 'data: {"type":"text_delta","text":"a"}\r\n\r\ndata: {"type":"done"}\r\n\r\n';
  const { events, rest } = parseSseFrames(buffer);

  assert.deepEqual(
    events.map((data) => JSON.parse(data)),
    [{ type: 'text_delta', text: 'a' }, { type: 'done' }],
  );
  assert.equal(rest, '');
});

test('legacy CR-only boundaries still dispatch', () => {
  const { events } = parseSseFrames('data: {"type":"done"}\r\r');
  assert.deepEqual(events.map((data) => JSON.parse(data)), [{ type: 'done' }]);
});

test('the optional space after data: is optional', () => {
  const { events } = parseSseFrames('data:{"type":"done"}\n\n');
  assert.deepEqual(events.map((data) => JSON.parse(data)), [{ type: 'done' }]);
});

test('keep-alive comments and non-data fields are skipped without dropping the event', () => {
  const buffer = [
    ': ping',
    '',
    'event: message',
    'id: 7',
    'retry: 1000',
    'data: {"type":"done"}',
    '',
    '',
  ].join('\n');

  const { events } = parseSseFrames(buffer);
  assert.deepEqual(events.map((data) => JSON.parse(data)), [{ type: 'done' }]);
});

test('multi-line data is rejoined per spec so split JSON still parses', () => {
  const buffer = 'data: {"type":"text_delta",\ndata: "text":"hi"}\n\n';
  const { events } = parseSseFrames(buffer);
  assert.deepEqual(events.map((data) => JSON.parse(data)), [{ type: 'text_delta', text: 'hi' }]);
});

test('a partial frame is carried forward instead of being parsed early', () => {
  const first = parseSseFrames('data: {"type":"status",');
  assert.deepEqual(first.events, []);
  assert.equal(first.rest, 'data: {"type":"status",');

  const second = parseSseFrames(first.rest + '"label":"curating"}\n\n');
  assert.deepEqual(
    second.events.map((data) => JSON.parse(data)),
    [{ type: 'status', label: 'curating' }],
  );
  assert.equal(second.rest, '');
});

test('a final frame with no terminating blank line is still dispatched', () => {
  const tail = 'data: {"type":"context","payload":{"context_token":"tok"}}';

  assert.deepEqual(parseSseFrames(tail).events, [], 'not dispatched while the stream is open');
  assert.deepEqual(
    parseSseFrames(tail, true).events.map((data) => JSON.parse(data)),
    [{ type: 'context', payload: { context_token: 'tok' } }],
    'dispatched once the reader is done, so continuity survives',
  );
});

test('frames carrying no data field produce no events', () => {
  assert.deepEqual(parseSseFrames(': ping\n\n\n\n', true).events, []);
  assert.deepEqual(parseSseFrames('data: \n\n', true).events, []);
});

test('response failures classify into distinct reader-facing outcomes', () => {
  assert.equal(classifyAgentResponseFailure(401).code, 'unauthorized');
  assert.equal(classifyAgentResponseFailure(403).code, 'unauthorized');
  assert.equal(classifyAgentResponseFailure(429).code, 'rate_limited');
  assert.equal(classifyAgentResponseFailure(504).code, 'timeout');
  assert.equal(classifyAgentResponseFailure(500).code, 'upstream');
  assert.equal(classifyAgentResponseFailure(502).code, 'upstream');

  const throttled = classifyAgentResponseFailure(429, '30');
  assert.equal(throttled.retryAfterSeconds, 30);
  assert.equal(throttled.retryable, true);
  assert.match(throttled.message, /busy/);
  assert.doesNotMatch(throttled.message, /429/, 'status codes stay out of the conversation');
});

test('a non-auth 4xx is not advertised as retryable', () => {
  const failure = classifyAgentResponseFailure(422);
  assert.equal(failure.code, 'unavailable');
  assert.equal(failure.retryable, false);
});

test('Retry-After is clamped and tolerates a malformed header', () => {
  assert.equal(classifyAgentResponseFailure(429, '99999').retryAfterSeconds, 600);
  assert.equal(classifyAgentResponseFailure(429, 'soon').retryAfterSeconds, null);
  assert.equal(classifyAgentResponseFailure(429).retryAfterSeconds, null);
});

test('a stall reads as a stall, not as a generic connection problem', () => {
  const stalled = classifyAgentStreamFailure(new Error('aborted'), { stalled: true });
  assert.equal(stalled.code, 'stalled');
  assert.match(stalled.message, /stopped responding/);

  const offline = classifyAgentStreamFailure(new Error('failed to fetch'), { online: false });
  assert.equal(offline.code, 'offline');

  assert.equal(classifyAgentStreamFailure(new Error('failed to fetch')).code, 'network');
});

test('bot-check failures are attributed to the session, not the network', () => {
  assert.ok(isSessionError(new Error('Bot check unavailable.')));
  assert.ok(isSessionError(new Error('Secure session is not configured.')));
  assert.ok(isSessionError(new Error('Session unavailable (403).')));
  assert.equal(isSessionError(new Error('Failed to fetch')), false);

  assert.equal(classifyAgentStreamFailure(new Error('Bot check unavailable.')).code, 'session');
});

test('the watchdog fires only after silence and every frame resets it', () => {
  let now = 0;
  const timers = new Map<number, { at: number; run: () => void }>();
  let nextHandle = 1;
  const schedule = (callback: () => void, delay: number) => {
    const handle = nextHandle++;
    timers.set(handle, { at: now + delay, run: callback });
    return handle;
  };
  const cancel = (handle: number) => void timers.delete(handle);
  const advance = (ms: number) => {
    now += ms;
    for (const [handle, timer] of [...timers]) {
      if (timer.at <= now) {
        timers.delete(handle);
        timer.run();
      }
    }
  };

  let stalls = 0;
  const watchdog = createStreamWatchdog(() => void (stalls += 1), 1_000, schedule, cancel);

  advance(900);
  assert.equal(stalls, 0);
  watchdog.touch();
  advance(900);
  assert.equal(stalls, 0, 'a frame arrived, so the countdown restarted');
  advance(200);
  assert.equal(stalls, 1, 'silence past the timeout is a stall');

  watchdog.stop();
  watchdog.touch();
  advance(5_000);
  assert.equal(stalls, 1, 'a stopped watchdog never fires again');
  assert.equal(timers.size, 0, 'and leaves no timer behind');
});
