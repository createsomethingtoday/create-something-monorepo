import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const coveragePath = path.join(packageRoot, 'data', 'create-something-agent-config-coverage.json');
const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

function recordByPath(configPath) {
  return coverage.records.find((record) => record.configPath === configPath);
}

test('agent config coverage maps Dify agents and MCP intake configs', () => {
  assert.equal(coverage.id, 'substrate:create-something:agent-config-coverage:dify-mcp');
  assert.equal(coverage.topologyId, 'substrate:create-something:topology:internal');
  assert.equal(coverage.records.filter((record) => record.kind === 'dify_agent').length, 16);
  assert.equal(coverage.records.filter((record) => record.kind === 'dify_mcp_intake').length, 24);
  assert.equal(coverage.records.length, 40);
});

test('agent config coverage captures server refs, tool counts, smoke status, and eval status', () => {
  const abundance = recordByPath('config/dify-agents/abundance-hub.json');
  const guide = recordByPath('config/dify-agents/create-something-guide-agent.json');

  assert.equal(abundance?.title, 'ABUNDANCE HUB');
  assert.equal(abundance?.smokeStatus, 'passed');
  assert.ok(abundance?.evalStatus?.includes('passed'));
  assert.ok(abundance?.serverRefs.some((server) => server.serverId === 'abundance-jobs'));
  assert.ok(Number(abundance?.toolCount) > 0);
  assert.ok(Number(abundance?.secretRefCount) > 0);

  assert.equal(guide?.title, 'CREATE SOMETHING Guide Agent');
  assert.ok(guide?.serverRefs.some((server) => server.serverId === 'create-something'));
  assert.ok(guide?.serverRefs.some((server) => server.serverId === 'three-tier-framework'));
  assert.equal(guide?.writeToolCount, 0);
});

test('agent config coverage maps MCP intake artifacts without secret values', () => {
  const webflow = recordByPath('config/dify-mcp-intake/webflow-app-review.json');

  assert.equal(webflow?.kind, 'dify_mcp_intake');
  assert.ok(webflow?.serverRefs.some((server) => server.serverId === 'webflow-app-review'));
  assert.ok(Number(webflow?.toolCount) >= 20);
  assert.ok(Number(webflow?.secretRefCount) > 0);
  assert.equal(JSON.stringify(webflow).includes('MCP_BEARER_TOKEN='), false);
});

test('agent config coverage creates Substrate records, receipts, and review actions', () => {
  for (const record of coverage.records) {
    assert.equal(record.sourceRecord.status, 'ready');
    assert.equal(record.sourceRecord.bindingHealth, 'bound');
    assert.equal(record.receipt.type, 'proof');
    assert.equal(record.receipt.recordId, record.recordId);
    assert.equal(record.reviewAction.recordId, record.recordId);
    assert.equal(record.reviewAction.state, 'wait');
  }
});
