import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createCtxClient } from '../src/ctx.ts';

test('official CTX imports and searches only GiGi staged history under isolated root', {
  skip: !process.env.GIGI_CTX_REAL_BINARY,
}, async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-ctx-official-'));
  let passed = false;
  try {
    const imports = join(root, 'imports');
    await mkdir(imports, { mode: 0o700 });
    const source = join(imports, 'gigi-history.jsonl');
    await writeFile(source, [
      { record_type: 'manifest', schema_version: 'ctx-history-jsonl-v2', producer: 'gigi-desktop' },
      { record_type: 'source', source_id: 'gigi-workspace-1', provider_key: 'gigi-local', source_format: 'gigi-sqlite-history-v1', trust: 'provider_export', fidelity: 'summary_only' },
      { record_type: 'session', source_id: 'gigi-workspace-1', provider_session_id: 'workspace-workspace-1', started_at: '2026-09-30T12:00:00Z', status: 'active', fidelity: 'summary_only' },
      { record_type: 'event', source_id: 'gigi-workspace-1', provider_session_id: 'workspace-workspace-1', event_index: 0, event_id: 'event-1', event_type: 'message', role: 'assistant', occurred_at: '2026-09-30T12:00:01Z', fidelity: 'summary_only', payload: { text: 'Saved schedule: Soundcheck at Bluebird', operation: 'records.save', entity: 'schedule', recordId: 'record-1' } },
    ].map((line) => JSON.stringify(line)).join('\n') + '\n', { mode: 0o600 });
    const client = createCtxClient({ dataRoot: join(root, 'ctx'), importRoot: imports, binary: process.env.GIGI_CTX_REAL_BINARY });
    try { await client.importHistory(source); }
    catch (error) { throw new Error(`official CTX import: ${String((error as { cause?: { stderr?: string } }).cause?.stderr ?? error)}`); }
    const hits = await client.search('Soundcheck Bluebird', { limit: 2 });
    assert.equal(hits.length, 1);
    assert.match(hits[0]!.snippet, /Soundcheck/);
    passed = true;
  } finally {
    if (passed) await rm(root, { recursive: true, maxRetries: 5, retryDelay: 100 });
    else process.stderr.write(`Scoped official CTX test root retained: ${root}\n`);
  }
});
