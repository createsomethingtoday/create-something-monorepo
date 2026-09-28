// Read-only release receipt. Never print or persist environment secret values.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const account = '9645bd52e640b8a4f40a3a55ff1dd75a';
assert.equal(process.env.CLOUDFLARE_ACCOUNT_ID, account, 'Unexpected Cloudflare account');
assert.ok(process.env.CLOUDFLARE_API_TOKEN, 'Existing Pages credentials required');
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/templates-platform`, {
  headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` }
});
assert.ok(response.ok, `Provider read failed: ${response.status}`);
const data = await response.json();
assert.ok(data.success);
const project = data.result;
assert.equal(project.id, '29bb2723-e0cf-4ff0-9a9a-74c3964b41f1');
function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    key === 'env_vars' ? Object.fromEntries(Object.entries(item || {}).map(([name, entry]) => [name, { type: entry.type, value: '[redacted]' }]))
      : /token|secret/i.test(key) ? '[redacted]' : redact(item)
  ]));
}
const receipt = { capturedAt: new Date().toISOString(), accountId: account, project: redact(project) };
await writeFile(process.argv[2], JSON.stringify(receipt, null, 2) + '\n');
if (process.argv[3]) {
  const before = JSON.parse(await readFile(process.argv[3], 'utf8'));
  for (const key of ['id', 'name', 'domains', 'production_branch', 'source', 'build_config', 'deployment_configs']) {
    assert.deepEqual(receipt.project[key], before.project[key], `Provider setting changed: ${key}; stop acceptance and investigate`);
  }
  assert.equal(project.canonical_deployment.deployment_trigger.metadata.commit_hash, process.env.GITHUB_SHA);
  assert.equal(project.canonical_deployment.deployment_trigger.metadata.commit_dirty, false);
  assert.equal(project.canonical_deployment.latest_stage.status, 'success');
}
console.log(JSON.stringify({ project: project.name, deployment: project.canonical_deployment.id, receipt: process.argv[2] }));
