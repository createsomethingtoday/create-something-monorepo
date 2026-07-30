import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageRoot, '../..');
const skillRoot = resolve(repoRoot, 'packages/dotfiles/codex/skills/offer-resolution');
const skill = await readFile(resolve(skillRoot, 'SKILL.md'), 'utf8');
const metadata = await readFile(resolve(skillRoot, 'agents/openai.yaml'), 'utf8');
const registry = await readFile(resolve(skillRoot, 'references/source-registry.md'), 'utf8');

const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/);
assert.ok(frontmatter, 'SKILL.md must begin with YAML frontmatter');
const keys = frontmatter[1]
  .split('\n')
  .filter((line) => /^[a-z_]+:/.test(line))
  .map((line) => line.slice(0, line.indexOf(':')))
  .sort();
assert.deepEqual(keys, ['description', 'name']);
assert.match(frontmatter[1], /^name: offer-resolution$/m);
assert.doesNotMatch(skill, /TODO/);
assert.match(metadata, /\$offer-resolution/);
assert.match(registry, /No private LTK API/i);

process.stdout.write(`${JSON.stringify({ ok: true, skill: 'offer-resolution', files: 3 })}\n`);
