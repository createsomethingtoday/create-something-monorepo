import assert from 'node:assert/strict';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { resolveCtxCommand, searchCtxHistory } from '../src/lib/server/ctx-history.js';

test('history search resolves the launchd-safe CTX installation', () => {
  assert.equal(resolveCtxCommand({
    home: '/Users/operator',
    configured: '',
    exists: (path) => path === '/Users/operator/.local/bin/ctx'
  }), '/Users/operator/.local/bin/ctx');
});

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
      results: [{ sessionId: 'session-1', provider: 'codex' }]
    });
  } finally {
    await rm(directory, { recursive: true });
  }
});

test('history search returns citation metadata without transcript content', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'client-workspace-ctx-private-'));
  const command = join(directory, 'ctx');
  await writeFile(command, `#!/usr/bin/env node
console.log(JSON.stringify({results:[{ctx_session_id:'session-1',provider:'codex',snippet:'Read /Users/operator/private/project and Bearer example-token API_KEY=secret-value sk-private-value'}]}));
`);
  await chmod(command, 0o700);
  try {
    const result = await searchCtxHistory({ workspaceRoot: '/verified/workspace', query: 'project', command });
    assert.equal(result.status, 'available');
    assert.deepEqual(result.results, [{ sessionId: 'session-1', provider: 'codex' }]);
  } finally {
    await rm(directory, { recursive: true });
  }
});
