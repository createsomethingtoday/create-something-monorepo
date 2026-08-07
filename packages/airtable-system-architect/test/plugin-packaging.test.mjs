import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

test('plugin binds only the official Airtable MCP through an environment-delivered PAT', () => {
  const manifest = readJson('../plugin/.codex-plugin/plugin.json');
  const mcpConfig = readJson('../plugin/.mcp.json');

  assert.equal(manifest.name, 'airtable-system-architect');
  assert.equal(manifest.mcpServers, './.mcp.json');
  assert.deepEqual(Object.keys(mcpConfig.mcpServers), ['airtable']);

  const server = mcpConfig.mcpServers.airtable;
  assert.equal(server.type, 'http');
  assert.equal(server.url, 'https://mcp.airtable.com/mcp');
  assert.equal(server.bearer_token_env_var, 'AIRTABLE_API_TOKEN');
  assert.equal(server.command, undefined);
  assert.equal(server.args, undefined);
  assert.equal(server.headers, undefined);
  assert.doesNotMatch(JSON.stringify(mcpConfig), /pat[A-Za-z0-9._-]{8,}/i);
});

test('architect skill enforces discovery, proposals, approvals, readback, and bounded lanes', () => {
  const skill = read('../plugin/skills/airtable-system-architect/SKILL.md');

  assert.match(skill, /Use `search_bases` or `list_bases`; never guess a base ID/);
  assert.match(skill, /Use `get_table_schema`/);
  assert.match(skill, /Produce the proposal artifact/);
  assert.match(skill, /explicit approval/);
  assert.match(skill, /Read back the changed schema/);
  assert.match(skill, /PAT does not authenticate or authorize browser UI actions/);
  assert.match(skill, /Template Review MCP or App Review MCP/);
  assert.match(skill, /Never expose, echo, log, or persist `AIRTABLE_API_TOKEN`/);
});

test('capability matrix names supported tools and preserves current gaps', () => {
  const matrix = read('../plugin/skills/airtable-system-architect/references/capability-matrix.md');

  for (const tool of [
    'create_base',
    'create_table',
    'create_field',
    'create_interface',
    'create_page',
    'delete_page',
    'publish_interface',
    'create_automation',
    'update_automation'
  ]) {
    assert.match(matrix, new RegExp(`\\b${tool}\\b`));
  }

  assert.match(matrix, /delete a field or table/);
  assert.match(matrix, /Arbitrary edits to an existing interface\/page layout are not listed/);
  assert.match(matrix, /Activation is an Airtable UI operation/);
  assert.match(matrix, /Do not call undocumented Airtable endpoints/);
});

test('machine-readable policy matches the human approval and receipt contract', () => {
  const policy = readJson(
    '../plugin/skills/airtable-system-architect/references/policy.airtable-system-architect.v1.json'
  );
  const humanPolicy = read(
    '../plugin/skills/airtable-system-architect/references/policy.airtable-system-architect.v1.md'
  );

  assert.equal(policy.id, 'policy.airtable-system-architect.v1');
  assert.equal(policy.version, '1.0.0');
  assert.deepEqual(Object.keys(policy.riskClasses), ['R0', 'R1', 'R2', 'R3']);
  assert.equal(policy.riskClasses.R3.approval, 'post-proposal-exact-operation-approval');
  assert.ok(policy.stopConditions.includes('unsupported-operation'));
  assert.ok(policy.receiptFields.includes('readback'));
  assert.match(humanPolicy, /PAT capability is not user approval/);
  assert.match(
    humanPolicy,
    /Routine Marketplace review decisions remain in their bounded review MCPs/
  );
});

test('evaluation pack contains ten independent read-only policy questions', () => {
  const evaluation = read('../evals/airtable-system-architect.xml');
  const pairs = evaluation.match(/<qa_pair>/g) ?? [];

  assert.equal(pairs.length, 10);
  assert.doesNotMatch(evaluation, /create a live record|publish this interface|delete this/i);
  assert.match(evaluation, /get_table_schema/);
  assert.match(evaluation, /R3/);
});
