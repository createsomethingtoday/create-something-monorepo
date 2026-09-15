import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { tmpdir } from 'node:os';

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
  assert.match(packet.modelContext, /Prior run restored the schedule without writes/);
  assert.ok(packet.modelContext.length <= 2400);
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

test('buildContextPacket derives cited highlights from current CTX result cards', () => {
  const packet = buildContextPacket({
    surface: 'docs/guides',
    run: () => ({
      ok: true,
      stdout: `1. Prior worker receipts stayed no-write and required current-source verification.\n\nSession  codex · provider-session-a\nAgent    primary\nEvent    event-a · 2026-08-23T20:00:00.000Z\nCtx session    session-a\nProvider session    provider-session-a\nSource    codex_session_jsonl\n\n2. A second bounded receipt carried a rollback note.\n\nSession  claude · provider-session-b\nAgent    primary\nEvent    event-b · 2026-08-23T20:01:00.000Z\nCtx session    session-b\nProvider session    provider-session-b\nSource    claude_session_jsonl\n`,
      stderr: '',
    }),
  });

  assert.equal(packet.available, true);
  assert.deepEqual(packet.citations.map((citation) => citation.provider), ['codex', 'claude']);
  assert.deepEqual(packet.citations.map((citation) => citation.ctxEventId), ['event-a', 'event-b']);
  assert.match(packet.modelContext, /Prior worker receipts stayed no-write/);
  assert.match(packet.modelContext, /second bounded receipt carried a rollback note/);
});

test('buildContextPacket falls back to cross-worktree CTX history when the scoped search has no citations', () => {
  const calls = [];
  const packet = buildContextPacket({
    surface: 'docs/guides',
    workspace: '/private/tmp/new-worktree',
    run: (_command, args) => {
      calls.push(args);
      if (calls.length === 1) return { ok: true, stdout: '0 results', stderr: '' };
      return {
        ok: true,
        stdout: `1. A prior agent documented a no-write recovery path.\n\nSession  codex · provider-session-a\nEvent    event-a · 2026-08-23T20:00:00.000Z\nCtx session    session-a\nProvider session    provider-session-a\nSource    codex_session_jsonl\n`,
        stderr: '',
      };
    },
  });

  assert.equal(calls.length, 2);
  assert.ok(calls[0].includes('--workspace'));
  assert.ok(!calls[1].includes('--workspace'));
  assert.equal(packet.searchScope, 'cross-worktree-fallback');
  assert.equal(packet.citations[0].ctxEventId, 'event-a');
});

test('buildContextPacket deduplicates CTX card highlights without their result-card ordinal', () => {
  const packet = buildContextPacket({
    surface: 'docs/guides',
    run: () => ({
      ok: true,
      stdout: `1. 1. Prior agents required current-source verification.\n\nSession  codex · provider-session-a\nEvent    event-a · 2026-08-23T20:00:00.000Z\nCtx session    session-a\nProvider session    provider-session-a\nSource    codex_session_jsonl\n\n2. 1. Prior agents required current-source verification.\n\nSession  codex · provider-session-b\nEvent    event-b · 2026-08-23T20:01:00.000Z\nCtx session    session-b\nProvider session    provider-session-b\nSource    codex_session_jsonl\n`,
      stderr: '',
    }),
  });

  assert.deepEqual(packet.highlights, ['1. Prior agents required current-source verification.']);
});

test('buildContextPacket excludes CTX result-card presentation noise from highlights', () => {
  const packet = buildContextPacket({
    surface: 'docs/guides',
    run: () => ({
      ok: true,
      stdout: `1. More 5 results from this session\n\nSession  codex · provider-session-a\nEvent    event-a · 2026-08-23T20:00:00.000Z\nCtx session    session-a\nProvider session    provider-session-a\nSource    codex_session_jsonl\n`,
      stderr: '',
    }),
  });

  assert.deepEqual(packet.highlights, []);
  assert.match(packet.modelContext, /Cited history: codex:event-a/);
  assert.doesNotMatch(packet.modelContext, /More 5 results/);
});

test('buildContextPacket injects bounded declared repository guidance even when CTX is unavailable', () => {
  const repoRoot = mkdtempSync(path.join(tmpdir(), 'operator-agent-context-'));
  mkdirSync(path.join(repoRoot, 'config'), { recursive: true });
  mkdirSync(path.join(repoRoot, 'docs', 'agent-wiki'), { recursive: true });
  writeFileSync(path.join(repoRoot, 'AGENTS.md'), '# Repository contract\nVerify current sources before action.\n');
  writeFileSync(path.join(repoRoot, 'docs', 'agent-wiki', 'README.md'), '# Agent wiki\nUse this wiki for orientation, never authority.\n');
  writeFileSync(
    path.join(repoRoot, 'config', 'operator-agent-capabilities.v1.json'),
    JSON.stringify({
      schemaVersion: 'operator-agent-capabilities.v1',
      defaultProfile: 'local-readonly',
      profiles: [
        {
          id: 'local-readonly',
          autonomyLevel: 'A0',
          skills: [
            { id: 'repository-contract', source: 'AGENTS.md', access: 'read' },
            { id: 'agent-wiki', source: 'docs/agent-wiki/README.md', access: 'read' },
          ],
        },
      ],
    })
  );

  const packet = buildContextPacket({
    surface: 'docs/guides',
    repoRoot,
    run: () => ({ ok: false, stdout: '', stderr: 'ctx unavailable' }),
  });

  assert.equal(packet.repository.available, true);
  assert.equal(packet.repository.profileId, 'local-readonly');
  assert.deepEqual(packet.repository.sources.map((source) => source.id), ['repository-contract', 'agent-wiki']);
  assert.match(packet.modelContext, /Repository contract/);
  assert.match(packet.modelContext, /wiki for orientation/);
  assert.match(packet.modelContext, /No CTX history was available/);
});
