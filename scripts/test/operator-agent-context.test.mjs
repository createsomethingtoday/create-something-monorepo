import assert from 'node:assert/strict';
import test from 'node:test';

import { buildContextPacket, resolveCtxBin } from '../operator-agent-context.mjs';

test('resolveCtxBin prefers the stable user-local CTX installation for launchd', () => {
  assert.equal(
    resolveCtxBin({ home: '/Users/operator', exists: (file) => file === '/Users/operator/.local/bin/ctx' }),
    '/Users/operator/.local/bin/ctx'
  );
});

test('buildContextPacket emits a bounded cited model context from CTX search results', () => {
  const packet = buildContextPacket({
    surface: 'docs/guides',
    task: 'Review scheduled operator-agent drift.',
    limit: 2,
    run: () => ({
      ok: true,
      stdout: `codex assistant message - session-a\n  ctx_event_id: event-a\n  ctx_session_id: session-a\n  provider: codex\n  provider_session_id: provider-a\n  source_format: codex_session_jsonl\n  Prior run restored the schedule without writes.\n\ncodex assistant message - session-b\n  ctx_event_id: event-b\n  ctx_session_id: session-b\n  provider: codex\n  provider_session_id: provider-b\n  source_format: codex_session_jsonl\n  Confirm receipt provenance before promotion.\n`,
      stderr: '',
    }),
  });

  assert.equal(packet.mode, 'ctx-history-packet');
  assert.equal(packet.available, true);
  assert.equal(packet.citations.length, 2);
  assert.deepEqual(packet.citations[0], {
    provider: 'codex',
    ctxEventId: 'event-a',
    ctxSessionId: 'session-a',
    providerSessionId: 'provider-a',
    sourceFormat: 'codex_session_jsonl',
  });
  assert.match(packet.modelContext, /CTX history is advisory/);
  assert.match(packet.modelContext, /event-a/);
  assert.ok(packet.modelContext.length <= 1200);
  assert.equal(packet.highlights.length, 2);
  assert.ok(packet.highlights.every((highlight) => highlight.length <= 280));
});

test('buildContextPacket falls back deterministically when CTX is unavailable', () => {
  const packet = buildContextPacket({
    surface: 'docs/guides',
    task: 'Review scheduled operator-agent drift.',
    run: () => ({ ok: false, stdout: '', stderr: 'ctx unavailable' }),
  });

  assert.equal(packet.available, false);
  assert.deepEqual(packet.citations, []);
  assert.deepEqual(packet.highlights, []);
  assert.match(packet.modelContext, /No CTX history was available/);
  assert.equal(packet.failure, 'ctx unavailable');
});

test('buildContextPacket derives provider and highlight from CTX verbose headers', () => {
  const packet = buildContextPacket({
    surface: 'docs/guides',
    run: () => ({
      ok: true,
      stdout: `codex assistant message - provider-session-a\n  ctx_event_id: event-a\n  ctx_session_id: session-a\n  provider_session_id: provider-a\n  source_format: codex_session_jsonl\n  Prior schedule run stayed no-write and produced a receipt.\n  rank: 1.00\n`,
      stderr: '',
    }),
  });

  assert.equal(packet.citations[0].provider, 'codex');
  assert.deepEqual(packet.highlights, ['Prior schedule run stayed no-write and produced a receipt.']);
});
