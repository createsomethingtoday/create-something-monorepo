import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pluginRoot = new URL('../halfdozen-monthly-editorial/', import.meta.url);
const read = (relativePath) => readFileSync(new URL(relativePath, pluginRoot), 'utf8');

test('the monthly editorial plugin is draft-only and contains no integration surface', () => {
  const manifest = JSON.parse(read('.codex-plugin/plugin.json'));

  assert.equal(manifest.name, 'halfdozen-monthly-editorial');
  assert.deepEqual(manifest.interface.capabilities, ['Interactive', 'Read']);
  assert.equal('mcpServers' in manifest, false);
  assert.equal('apps' in manifest, false);
  assert.match(manifest.interface.longDescription, /never publishes or sends content/i);
});

test('the editorial skill requires evidence and explicit approval before publication', () => {
  const skill = read('skills/halfdozen-monthly-article/SKILL.md');
  const ledger = read('skills/halfdozen-monthly-article/references/evidence-ledger.md');
  const template = read('skills/halfdozen-monthly-article/references/monthly-draft-template.md');

  assert.match(skill, /Draft-only boundary/);
  assert.match(skill, /explicit operator approval/i);
  assert.match(skill, /claim ledger/i);
  for (const proofLevel of ['planned', 'reviewed', 'merged', 'released', 'deployed']) {
    assert.match(ledger, new RegExp(proofLevel));
  }
  assert.match(template, /In plain language/);
  assert.match(template, /For developers/);
  assert.match(template, /For Half Dozen operations/);
  assert.match(template, /Not published/);
});
