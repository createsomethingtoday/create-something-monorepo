import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pluginRoot = new URL('../halfdozen-editorial/', import.meta.url);
const read = (relativePath) => readFileSync(new URL(relativePath, pluginRoot), 'utf8');

test('the audience editorial plugin has a matching identity and no integration surface', () => {
  const manifest = JSON.parse(read('.codex-plugin/plugin.json'));

  assert.equal(manifest.name, basename(fileURLToPath(pluginRoot)));
  assert.equal(manifest.name, 'halfdozen-editorial');
  assert.deepEqual(manifest.interface.capabilities, ['Interactive', 'Read']);
  assert.equal('mcpServers' in manifest, false);
  assert.equal('apps' in manifest, false);
  assert.match(manifest.interface.longDescription, /every 14 days/i);
  assert.match(manifest.interface.longDescription, /technical detail is optional/i);
  assert.match(manifest.interface.longDescription, /never schedules, publishes, or sends content/i);
});

test('the legacy monthly plugin path is absent', () => {
  assert.equal(existsSync(new URL('../halfdozen-monthly-editorial/', import.meta.url)), false);
});

test('the skill enforces audience-first selection every 14 days', () => {
  const skill = read('skills/halfdozen-audience-article/SKILL.md');
  const ledger = read('skills/halfdozen-audience-article/references/evidence-ledger.md');
  const template = read('skills/halfdozen-audience-article/references/audience-draft-template.md');

  assert.match(skill, /Draft-only boundary/);
  assert.match(skill, /explicit operator approval/i);
  assert.match(skill, /Every 14 days means the context review cadence/i);
  assert.match(skill, /least-tenured credible owner or operator/i);
  assert.match(skill, /Technical complexity is not a positive selection signal/i);
  assert.match(skill, /Technical detail is optional/i);
  assert.match(skill, /Return a hold/i);
  assert.match(skill, /claim ledger/i);
  assert.match(ledger, /Audience relevance/);
  assert.match(ledger, /Operating tension/);
  assert.match(ledger, /Useful takeaway/);
  assert.match(ledger, /Return a hold/);
  for (const proofLevel of ['planned', 'reviewed', 'merged', 'released', 'deployed']) {
    assert.match(ledger, new RegExp(proofLevel));
  }
  assert.match(template, /Quick answer/);
  assert.match(template, /The operating tension/);
  assert.match(template, /What to do or consider next/);
  assert.match(template, /Technical note \(optional\)/);
  assert.match(template, /Not published/);
});

test('the revised contract removes monthly and mandatory developer framing', () => {
  const manifest = read('.codex-plugin/plugin.json');
  const skill = read('skills/halfdozen-audience-article/SKILL.md');
  const template = read('skills/halfdozen-audience-article/references/audience-draft-template.md');
  const contract = `${manifest}\n${skill}\n${template}`;

  assert.doesNotMatch(contract, /monthly/i);
  assert.doesNotMatch(contract, /For developers/i);
});
