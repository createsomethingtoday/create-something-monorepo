import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { getCanonRules, getQuickReference } from '../src/tools/canon.js';

const guidePath =
  'packages/dotfiles/codex/skills/writing-for-humans/references/create-something-voice.md';

test('voice rules deliver the shared guide to MCP consumers without filesystem access', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'harness-canon-'));
  const originalCwd = process.cwd();
  mkdirSync(join(fixtureRoot, '.beads'));
  mkdirSync(join(fixtureRoot, '.claude/rules'), { recursive: true });
  writeFileSync(join(fixtureRoot, '.claude/rules/voice-canon.md'), '# Voice router');
  mkdirSync(dirname(join(fixtureRoot, guidePath)), { recursive: true });
  const guide = readFileSync(
    fileURLToPath(
      new URL(
        '../../dotfiles/codex/skills/writing-for-humans/references/create-something-voice.md',
        import.meta.url
      )
    ),
    'utf8'
  );
  writeFileSync(join(fixtureRoot, guidePath), guide);
  try {
    process.chdir(fixtureRoot);
    assert.ok(getCanonRules('voice').voice?.includes(guide));
    assert.ok(getCanonRules('all').voice?.includes(guide));
  } finally {
    process.chdir(originalCwd);
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('quick reference preserves uncertainty instead of requiring fabricated metrics', () => {
  const reference = getQuickReference();
  assert.ok(reference.includes(guidePath));
  assert.doesNotMatch(reference, /every claim must be measurable/i);
  assert.match(reference, /evidence or an honest limit/i);
  assert.match(reference, /inclusive/i);
  assert.match(reference, /verification/i);
});
