import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import TOML from '@iarna/toml';

import { writeCodexConfig } from '../dist/config.js';

test('writeCodexConfig prunes registry servers and preserves non-registry entries', () => {
  const root = mkdtempSync(join(tmpdir(), 'cs-mcp-hub-config-'));
  const codexConfigPath = join(root, '.codex', 'config.toml');
  mkdirSync(join(root, '.codex'), { recursive: true });

  writeFileSync(
    codexConfigPath,
    `
[mcp_servers.old-removed]
url = "https://example.com/removed/mcp"
enabled = false

[mcp_servers.custom-local]
command = "node"
args = ["./scripts/custom-local-mcp.js"]
enabled = true
`,
    'utf-8',
  );

  const paths = {
    rootDir: root,
    registryPath: join(root, 'registry.json'),
    statePath: join(root, 'state.json'),
    routingPath: join(root, 'routing.json'),
    codexConfigPath,
  };

  const registry = {
    version: 1,
    servers: {
      'old-removed': {
        transport: 'http',
        url: 'https://example.com/removed/mcp',
      },
    },
    bundles: {},
  };

  const result = writeCodexConfig(paths, registry, {});
  assert.equal(result.path, codexConfigPath);

  const parsed = TOML.parse(readFileSync(codexConfigPath, 'utf-8'));
  const servers = parsed.mcp_servers ?? {};

  assert.equal(servers['old-removed'], undefined);
  assert.ok(servers['custom-local']);
  assert.ok(servers['create-something-hub']);
  assert.equal(servers['create-something-hub'].enabled, true);
});
