import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('plugin requests renewable consent with exactly the existing tool privileges', () => {
  const config = JSON.parse(readFileSync(new URL('../plugin/a2a-inbox/mcp.json', import.meta.url), 'utf8'));
  const auth = config.mcpServers['a2a-inbox'].extensions['com.openai'].auth;
  for (const scopes of [auth.baseScopes, auth.defaultScopes]) {
    assert.deepEqual([...scopes].sort(), ['a2a:read', 'a2a:write', 'offline_access']);
  }
});
