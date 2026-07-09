import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { registerTools } from '../dist/tools/index.js';
import { createSession } from '../dist/studio/store.js';

test('Atlas Studio database health is exposed as a read-only MCP tool', async () => {
  const previousHome = process.env.CREATE_SOMETHING_ATLAS_HOME;
  const home = await mkdtemp(path.join(tmpdir(), 'atlas-tools-health-test-'));
  process.env.CREATE_SOMETHING_ATLAS_HOME = home;

  try {
    const session = await createSession({
      client: 'CREATE SOMETHING',
      workflow: 'Internal operating topology',
      owner: 'Micah'
    });
    const tools = new Map();
    const server = {
      tool(name, description, schema, handler, options) {
        tools.set(name, { description, handler, options, schema });
      }
    };

    registerTools(server);

    const entry = tools.get('atlas_studio_database_health');
    assert.ok(entry, 'atlas_studio_database_health should be registered');
    assert.equal(entry.options?.readOnly, true);

    const result = await entry.handler(
      { session_id: session.id },
      { accountId: 'acct_test', metadata: {}, policy: {}, userId: 'user_test' }
    );
    const payload = JSON.parse(result.content[0].text);

    assert.equal(payload.accountId, 'acct_test');
    assert.equal(payload.health.sessionId, session.id);
    assert.equal(payload.health.topology.title, 'Business health');
  } finally {
    if (previousHome === undefined) {
      delete process.env.CREATE_SOMETHING_ATLAS_HOME;
    } else {
      process.env.CREATE_SOMETHING_ATLAS_HOME = previousHome;
    }
  }
});
