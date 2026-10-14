import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { searchContext } from '../scripts/atlas-context.mjs';

test('local search returns bounded cited context without granting authority', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'atlas-context-'));
  try {
    const directory = path.join(root, 'packages/database-layer/docs/agent-wiki');
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, 'management-surface.md'), '# Management\n\n## Approval\nProduction deployment requires approval and a receipt.\n');
    const result = searchContext('production deployment approval', { root, maxBytes: 4000 });
    assert.equal(result.results[0].sourceId, 'atlas-context:management-surface');
    assert.match(result.results[0].citation, /management-surface.md:\d+/);
    assert.equal(result.authority, 'orientation_only');
    assert.equal(result.freshness.liveVerified, false);
    assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 4000);
    assert.equal(searchContext('zxqvnonexistent', { root }).status, 'no_match');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { indexContext, repoRoot } from '../scripts/atlas-context.mjs';

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'atlas-context-'));
  const base = path.join(root, 'packages/database-layer');
  mkdirSync(path.join(base, 'docs/agent-wiki'), { recursive: true });
  mkdirSync(path.join(base, 'scripts'), { recursive: true });
  mkdirSync(path.join(base, 'data'), { recursive: true });
  writeFileSync(path.join(base, 'scripts/generate-agent-wiki.mjs'), 'process.exit(0);');
  writeFileSync(path.join(base, 'data/source.json'), '{"revision":1}');
  const file = path.join(base, 'docs/agent-wiki/operating-loop.md');
  writeFileSync(file, '# Operating Loop\n\n> Source snapshot range (UTC): 2026-01-01T00:00:00.000Z to 2026-01-01T00:00:00.000Z.\n\n## Ownership\nSubstrate owns record truth. Atlas provides canvas context, not production authority.\n');
  return { root, base, file, cache: path.join(root, '.cache/atlas-context/index.json') };
}

test('explicit cache detects changed documents, corrupt cache, and changed upstream evidence', () => {
  const f = fixture();
  try {
    const initial = searchContext('record truth', { root: f.root, now: Date.parse('2026-01-20') });
    assert.equal(initial.freshness.stale, true);
    assert.equal(existsSync(f.cache), false, 'search must never persist an index');
    indexContext({ root: f.root });
    const warm = searchContext('record truth', { root: f.root });
    assert.equal(warm.cache, 'hit');
    assert.equal(warm.freshness.projectionConsistency, 'verified_at_index');
    assert.deepEqual(warm.results, initial.results);
    const id = warm.results[0].id;
    writeFileSync(f.file, '\n' + readFileSync(f.file, 'utf8'));
    const changed = searchContext('record truth', { root: f.root });
    assert.equal(changed.cache, 'invalid');
    assert.equal(changed.results[0].id, id, 'line shifts preserve passage identity');
    assert.notEqual(changed.results[0].citation, warm.results[0].citation);
    assert.equal(changed.freshness.projectionConsistency, 'unverified');
    indexContext({ root: f.root });
    writeFileSync(path.join(f.base, 'data/source.json'), '{"revision":2}');
    assert.equal(searchContext('record truth', { root: f.root }).freshness.projectionConsistency, 'unverified');
    writeFileSync(f.cache, '{broken');
    assert.equal(searchContext('record truth', { root: f.root }).status, 'matches');
    assert.equal(searchContext('', { root: f.root, id }).results[0].id, id);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test('unknown freshness, missing modules, hard bounds and invalid arguments are explicit', () => {
  const f = fixture();
  try {
    writeFileSync(f.file, '# Huge row\n\n| Name | Meaning |\n| --- | --- |\n| approval | ' + 'review '.repeat(1500) + '|\n');
    const result = searchContext('approval', { root: f.root, maxBytes: 2000 });
    assert.equal(result.status, 'budget_exhausted');
    assert.equal(result.freshness.stale, null);
    assert.ok(result.freshness.missingModules.includes('README'));
    assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 2000);
    assert.throws(() => searchContext('x'.repeat(2001)), /2000/);
    assert.throws(() => searchContext('query', { maxBytes: 1999 }), /max-bytes/);
    assert.throws(() => searchContext('query', { domain: '../secret' }), /Unknown domain/);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

export const queries = [
  ['production approval operations', 'management-surface'],
  ['client delivery packets', 'business-recommendations'],
  ['source snapshot freshness', 'README'],
  ['Substrate record truth Atlas canvas', 'operating-loop'],
  ['database_layer_get_topology_record_context', 'management-surface'],
];

test('representative questions select the correct source and cite exact observed lines', () => {
  for (const [query, domain] of queries) {
    const result = searchContext(query, { ignoreCache: true });
    assert.equal(result.results[0].sourceId, `atlas-context:${domain}`, query);
    for (const hit of result.results) {
      const lines = readFileSync(path.join(repoRoot, hit.path), 'utf8').split('\n');
      assert.equal(hit.excerpt, hit.sourceLines.map(line => lines[line - 1]).join('\n'));
    }
    assert.equal(result.authority, 'orientation_only');
    assert.equal(result.requiresSourceInspection, true);
  }
});

test('CLI search and show provide bounded JSON and reject unknown commands', () => {
  const script = path.join(repoRoot, 'packages/database-layer/scripts/atlas-context.mjs');
  const run = args => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  const search = run(['search', 'client delivery packets', '--limit', '1', '--no-cache']);
  assert.equal(search.status, 0, search.stderr);
  const hit = JSON.parse(search.stdout).results[0];
  const shown = run(['show', hit.id]);
  assert.equal(JSON.parse(shown.stdout).results[0].id, hit.id);
  assert.equal(run(['refresh']).status, 1);
});

test('Codex and Claude entry instructions resolve to one shared repository skill', () => {
  const skill = '.agents/skills/atlas-substrate/SKILL.md';
  for (const file of ['AGENTS.md', 'CLAUDE.md']) {
    const content = readFileSync(path.join(repoRoot, file), 'utf8');
    assert.ok(content.includes(skill));
    assert.ok(content.includes('atlas-context.mjs search'));
  }
  assert.equal(readFileSync(path.join(repoRoot, '.claude/skills/atlas-substrate/SKILL.md'), 'utf8'), readFileSync(path.join(repoRoot, skill), 'utf8'));
  const scripts = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).scripts;
  assert.equal(scripts['atlas:context'], 'node packages/database-layer/scripts/atlas-context.mjs');
  assert.match(readFileSync(path.join(repoRoot, 'AGENTS.md'), 'utf8'), /not before every search/);
});
