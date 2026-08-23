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
