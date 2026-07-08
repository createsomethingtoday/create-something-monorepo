import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const coveragePath = path.join(packageRoot, 'data', 'create-something-runtime-binding-coverage.json');
const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

function recordByPath(configPath) {
  return coverage.records.find((record) => record.configPath === configPath);
}

test('runtime binding coverage maps Cloudflare Wrangler configs', () => {
  assert.equal(coverage.id, 'substrate:create-something:runtime-binding-coverage:cloudflare');
  assert.equal(coverage.runtime, 'cloudflare');
  assert.ok(coverage.records.length >= 90);
  assert.ok(coverage.records.every((record) => record.sourceRecord.status === 'ready'));
  assert.ok(coverage.records.every((record) => record.sourceRecord.bindingHealth === 'bound'));
});

test('runtime binding coverage extracts D1, Durable Object, vars, and routes without secret values', () => {
  const abundance = recordByPath('packages/abundance-jobs-mcp/worker/wrangler.toml');
  const appGovernance = recordByPath('packages/app-governance-db/worker/wrangler.toml');
  const outerfields = recordByPath('packages/agency/clients/outerfields/mcp-remote/wrangler.toml');

  assert.ok(abundance?.bindings.some((binding) => binding.kind === 'd1' && binding.name === 'JOBS_DB'));
  assert.ok(abundance?.bindings.some((binding) => binding.kind === 'var' && binding.name === 'MCP_ACCOUNT_ID'));
  assert.ok(appGovernance?.bindings.some((binding) => binding.kind === 'durable_object' && binding.name === 'MCP_OBJECT'));
  assert.ok(appGovernance?.routes.includes('app-governance.mcp.createsomething.agency'));
  assert.ok(outerfields?.routes.includes('outerfields.mcp.createsomething.agency'));
  assert.equal(
    coverage.records.some((record) =>
      JSON.stringify(record.bindings).includes('support@createsomething.io')
    ),
    false
  );
});

test('runtime binding coverage includes JSONC Wrangler configs', () => {
  const bettermode = recordByPath('apps/bettermode-marketplace-creator-agent/wrangler.jsonc');
  const theStack = recordByPath('packages/agency/clients/the-stack/wrangler.jsonc');

  assert.equal(bettermode?.format, 'jsonc');
  assert.equal(theStack?.format, 'jsonc');
  assert.ok(bettermode?.bindings.length > 0);
  assert.equal(theStack?.name, 'the-stack-client');
});

test('runtime binding coverage creates review actions and receipts for every config', () => {
  for (const record of coverage.records) {
    assert.equal(record.receipt.type, 'proof');
    assert.equal(record.receipt.recordId, record.recordId);
    assert.equal(record.reviewAction.recordId, record.recordId);
    assert.equal(record.reviewAction.state, 'wait');
    assert.ok(record.reviewAction.policy.includes('Runtime binding review'));
  }
});
