import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

test('plugin binds only the production HTTPS Zendesk MCP through an environment token', () => {
  const manifest = readJson('../plugin/.codex-plugin/plugin.json');
  const mcpConfig = readJson('../plugin/.mcp.json');

  assert.equal(manifest.name, 'webflow-zendesk-reviewer');
  assert.equal(manifest.version, '0.1.0');
  assert.equal(manifest.skills, './skills/');
  assert.equal(manifest.mcpServers, './.mcp.json');
  assert.deepEqual(Object.keys(mcpConfig.mcpServers), ['webflow-zendesk']);

  const server = mcpConfig.mcpServers['webflow-zendesk'];
  assert.equal(server.type, 'http');
  assert.equal(server.url, 'https://zendesk-mcp.createsomething.workers.dev/mcp');
  assert.equal(server.bearer_token_env_var, 'ZENDESK_MCP_API_KEY');
  assert.equal(server.command, undefined);
  assert.equal(server.args, undefined);
  assert.equal(server.cwd, undefined);
  assert.equal(server.headers, undefined);
  assert.doesNotMatch(JSON.stringify(mcpConfig), /Bearer\s+[A-Za-z0-9._-]{8,}/i);
  assert.doesNotMatch(
    JSON.stringify(mcpConfig),
    /WEBFLOW_ZENDESK_(?:API_TOKEN|PASSWORD|OAUTH_TOKEN)/
  );
});

test('bundled reviewer skill stays identical to the canonical Pi Webflow skill', () => {
  const bundled = read('../plugin/skills/webflow-zendesk-reviewer/SKILL.md');
  const canonical = read('../../pi-webflow/skills/webflow-zendesk-reviewer/SKILL.md');

  assert.equal(bundled, canonical);
});

test('reviewer skill preserves cross-system routing, read-first behavior, and write guards', () => {
  const skill = read('../plugin/skills/webflow-zendesk-reviewer/SKILL.md');

  assert.match(skill, /Ticket conversation.*Webflow Zendesk MCP/);
  assert.match(skill, /Airtable review records.*Webflow App Review MCP/);
  assert.match(skill, /Read the canonical ticket payload with `zendesk_get_ticket`/);
  assert.match(skill, /Read conversation history with `zendesk_list_ticket_comments`/);
  assert.match(skill, /explicit approval/i);
  assert.match(skill, /confirm_public_reply/);
  assert.match(skill, /Do not write a private note merely to prove connectivity/);
  assert.match(skill, /receipt-template\.md/);
});

test('machine-readable policy matches human approval, readback, and stop rules', () => {
  const policy = readJson(
    '../plugin/skills/webflow-zendesk-reviewer/references/policy.webflow-zendesk-reviewer.v1.json'
  );
  const human = read(
    '../plugin/skills/webflow-zendesk-reviewer/references/policy.webflow-zendesk-reviewer.v1.md'
  );

  assert.equal(policy.id, 'policy.webflow-zendesk-reviewer.v1');
  assert.equal(policy.version, '1.0.0');
  assert.deepEqual(Object.keys(policy.riskClasses), ['R0', 'R1', 'R2']);
  assert.equal(policy.riskClasses.R1.approval, 'exact-user-authorized-note');
  assert.equal(policy.riskClasses.R2.approval, 'exact-user-authorized-operation');
  assert.ok(policy.stopConditions.includes('review-or-draft-only-request'));
  assert.ok(policy.receiptFields.includes('readback'));
  assert.match(human, /MCP capability is not user approval/);
  assert.match(human, /connectivity test must remain read-only/);
  assert.match(human, /Do not collapse attempted or draft-only work into complete/);
});

test('authentication reference separates transport auth from Zendesk service credentials', () => {
  const auth = read('../plugin/skills/webflow-zendesk-reviewer/references/authentication.md');

  assert.match(auth, /ZENDESK_MCP_API_KEY/);
  assert.match(auth, /distinct from the Zendesk service credentials/);
  assert.match(auth, /without printing its value/);
  assert.match(auth, /Call `zendesk_health` through the plugin MCP/);
  assert.match(auth, /Do not probe possible tokens/);
});
