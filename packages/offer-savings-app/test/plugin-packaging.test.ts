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

test('plugin skill delegates search to the host and scoring to resolve_offers', () => {
  const skill = readFileSync(
    new URL('../plugin/skills/offer-savings/SKILL.md', import.meta.url),
    'utf8'
  );

  assert.match(skill, /host agent's public-web capability/i);
  assert.match(skill, /Call `plan_offer_search` first/i);
  assert.match(skill, /LTK.*first/i);
  assert.match(skill, /Call `resolve_offers` once/i);
  assert.match(skill, /Never calculate or edit a score/i);
  assert.match(skill, /MCP never refreshes a watch/i);
  assert.doesNotMatch(skill, /find_offers/i);
});
