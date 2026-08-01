import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

interface PluginManifest {
  mcpServers?: string;
}

interface McpConfig {
  mcpServers?: Record<
    string,
    {
      type?: string;
      url?: string;
      command?: string;
      args?: string[];
      cwd?: string;
    }
  >;
}

test('personal plugin packages the production HTTPS MCP without a local launcher', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../plugin/.codex-plugin/plugin.json', import.meta.url), 'utf8')
  ) as PluginManifest;
  const mcpConfig = JSON.parse(
    readFileSync(new URL('../plugin/.mcp.json', import.meta.url), 'utf8')
  ) as McpConfig;

  assert.equal(manifest.mcpServers, './.mcp.json');
  assert.deepEqual(Object.keys(mcpConfig.mcpServers ?? {}), ['offer-savings']);

  const server = mcpConfig.mcpServers?.['offer-savings'];
  assert.equal(server?.type, 'http');
  assert.equal(server?.url, 'https://offer-savings-agent.createsomething.workers.dev/mcp');
  assert.equal(server?.command, undefined);
  assert.equal(server?.args, undefined);
  assert.equal(server?.cwd, undefined);
});
