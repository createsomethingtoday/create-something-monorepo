import assert from 'node:assert/strict';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { searchCtxHistory } from '../src/lib/server/ctx-history.js';

test('history search reports CTX absence without inventing sessions', async () => {
  const result = await searchCtxHistory({
    workspaceRoot: '/verified/workspace',
    query: 'previous algorithm',
    command: '/missing/ctx'
  });

  assert.deepEqual(result, { status: 'unavailable', results: [] });
});

test('history search stays within the verified workspace and returns bounded evidence', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'client-workspace-ctx-'));
  const command = join(directory, 'ctx');
  await writeFile(command, `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] !== 'search' || args[1] !== 'algorithm' || args[args.indexOf('--workspace') + 1] !== '/verified/workspace') process.exit(2);
console.log(JSON.stringify({results:[{ctx_session_id:'session-1',provider:'codex',snippet:'Earlier algorithm discussion'}]}));
`);
  await chmod(command, 0o700);
  try {
    assert.deepEqual(await searchCtxHistory({
      workspaceRoot: '/verified/workspace',
      query: 'algorithm',
      command
    }), {
      status: 'available',
      results: [{ sessionId: 'session-1', provider: 'codex', snippet: 'Earlier algorithm discussion' }]
    });
  } finally {
    await rm(directory, { recursive: true });
  }
});
