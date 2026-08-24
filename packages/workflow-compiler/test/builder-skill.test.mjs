import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the shipped Codex skill keeps the paired terminal workflow local, inspectable, and approval-gated', async () => {
  const [manifest, skill] = await Promise.all([
    readFile(new URL('../package.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../skills/workflow-compiler/SKILL.md', import.meta.url), 'utf8')
  ]);

  assert.ok(manifest.files.includes('skills'));
  assert.match(skill, /^---\nname: workflow-compiler\n/m);
  assert.match(skill, /npx workflow-compiler init --template local-runbook --dir/i);
  assert.match(skill, /npx workflow-compiler init --template marketplace-submission --dir/i);
  assert.match(skill, /Airtable\s+Automation handoff/i);
  assert.match(skill, /cd WORKFLOW_DIRECTORY/i);
  assert.match(skill, /npx workflow-compiler validate --workflow workflow.json/i);
  assert.match(
    skill,
    /npx workflow-compiler simulate --workflow workflow.json --cases cases.json/i
  );
  assert.match(skill, /does not execute live actions/i);
  assert.match(skill, /explicit approval/i);
  assert.match(skill, /not an official OpenAI partnership/i);
});

test('the public quickstart documents the paired local builder loop without a hosted-execution claim', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');

  assert.match(readme, /Codex paired terminal quickstart/i);
  assert.match(readme, /workflow-compiler init --template local-runbook --dir/i);
  assert.match(readme, /workflow-compiler init --template marketplace-submission --dir/i);
  assert.match(readme, /submission-to-review/i);
  assert.match(readme, /workflow-compiler validate --workflow workflow.json/i);
  assert.match(readme, /workflow-compiler simulate --workflow workflow.json --cases cases.json/i);
  assert.match(readme, /workflow-compiler explain --workflow workflow.json --cases cases.json/i);
  assert.match(readme, /does not execute live actions/i);
  assert.doesNotMatch(readme, /bounded prototype/i);
});

test('the shipped System Map explains the Marketplace path without claiming live execution', async () => {
  const [manifest, readme, systemMap] = await Promise.all([
    readFile(new URL('../package.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../README.md', import.meta.url), 'utf8'),
    readFile(new URL('../SYSTEM.md', import.meta.url), 'utf8')
  ]);

  assert.ok(manifest.files.includes('SYSTEM.md'));
  assert.match(readme, /\[System Map\]\(\.\/SYSTEM\.md\)/i);
  assert.match(systemMap, /Marketplace Submission Cloud/i);
  assert.match(systemMap, /Validator App preflight/i);
  assert.match(systemMap, /Airtable Automation handoff/i);
  assert.match(systemMap, /webhook receipt alone.*not.*handoff/i);
  assert.match(systemMap, /marketplace reviewer/i);
  assert.match(systemMap, /does not execute live actions/i);
  assert.match(systemMap, /authenticated execution host/i);
  assert.match(systemMap, /local marketplace starter.*enforced contract/i);
  assert.match(systemMap, /enforce.*default/i);
  assert.match(systemMap, /warn.*non-passing.*proceed/i);
  assert.match(systemMap, /disabled.*not_required/i);
  assert.match(systemMap, /cannot be reported as a passing\s+preflight/i);
  assert.match(systemMap, /submission ID only after form and preflight\s+checks/i);
  assert.match(
    systemMap,
    /does not return separate form-validation\s+or Validator preflight receipts/i
  );
  assert.match(systemMap, /local modeled evidence/i);
  assert.match(systemMap, /local modeled evidence additionally expects automation version and webhook receipt/i);
  assert.match(systemMap, /does\s+not return an automation version or webhook receipt/i);
});
