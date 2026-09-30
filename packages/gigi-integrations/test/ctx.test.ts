import assert from 'node:assert/strict';
import { chmod, mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createCtxClient, CtxError } from '../src/index.ts';

test('CTX search uses isolated app data and returns only bounded cited snippets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-ctx-'));
  const binary = join(root, 'ctx-fixture');
  await writeFile(binary, `#!/usr/bin/env node
const args = process.argv.slice(2);
if (!args.includes('--data-root') || args[args.indexOf('--data-root')+1] !== ${JSON.stringify(join(root, 'ctx'))}) process.exit(2);
if (!args.includes('--source-id') || args[args.indexOf('--source-id')+1] !== 'gigi-user') process.exit(3);
console.log(JSON.stringify({results:[{ctx_session_id:'session-1',provider:'claude',snippet:'x'.repeat(900),score:0.9},{ctx_session_id:'session-2',provider:'codex',snippet:'second',score:0.8}]}));
`);
  await chmod(binary, 0o700);
  try {
    const ctx = createCtxClient({ dataRoot: join(root, 'ctx'), binary, sourceId: 'gigi-user' });
    const result = await ctx.search('Friday shift', { limit: 1 });
    assert.equal(result.length, 1);
    assert.equal(result[0]?.sessionId, 'session-1');
    assert.equal(result[0]?.snippet.length, 500);
  } finally { await rm(root, { recursive: true }); }
});

test('CTX import accepts only app-staged history and calls explicit JSONL v2 format', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-ctx-import-'));
  const imports = join(root, 'imports');
  const source = join(imports, 'history.jsonl');
  const binary = join(root, 'ctx-fixture');
  await mkdir(imports);
  await writeFile(source, '{}\n');
  const resolvedSource = await realpath(source);
  await writeFile(binary, `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] !== 'import' || args[args.indexOf('--input-format')+1] !== 'ctx-history-jsonl-v2' || args[args.indexOf('--path')+1] !== ${JSON.stringify(resolvedSource)}) process.exit(2);
console.log(JSON.stringify({schema_version:2,outcome:'success',failure_scope:'none',sources:[{status:'published'}],totals:{current_indexed_documents:1,current_rejected_records:0,failed_sources:0}}));
`);
  await chmod(binary, 0o700);
  try {
    const ctx = createCtxClient({ dataRoot: join(root, 'ctx'), binary, sourceId: 'gigi-user', importRoot: imports });
    await assert.rejects(ctx.importHistory('/tmp/other.jsonl'), (error) =>
      error instanceof CtxError && error.reason === 'invalid_configuration');
    await ctx.importHistory(source);
  } finally { await rm(root, { recursive: true }); }
});
