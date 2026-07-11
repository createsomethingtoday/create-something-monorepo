import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(
  REPO_ROOT,
  'packages/dotfiles/codex/skills/svg-education-precision/scripts/svg-education.mjs'
);
const FIXTURES = path.join(
  REPO_ROOT,
  'packages/dotfiles/codex/skills/svg-education-precision/fixtures'
);

function runCli(...args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
}

function readReport(result) {
  const output = result.stdout || result.stderr;
  return JSON.parse(output);
}

test('public CLI builds a deterministic accessible workflow SVG', (t) => {
  const outputDir = mkdtempSync(path.join(tmpdir(), 'svg-education-'));
  t.after(() => rmSync(outputDir, { recursive: true, force: true }));

  const spec = path.join(FIXTURES, 'workflow-valid.json');
  const firstOutput = path.join(outputDir, 'first.svg');
  const secondOutput = path.join(outputDir, 'second.svg');
  const first = runCli('build', spec, firstOutput);
  const second = runCli('build', spec, secondOutput);

  assert.equal(first.status, 0, first.stderr || first.stdout);
  assert.equal(second.status, 0, second.stderr || second.stdout);

  const firstSvg = readFileSync(firstOutput, 'utf8');
  const secondSvg = readFileSync(secondOutput, 'utf8');

  assert.equal(firstSvg, secondSvg);
  assert.match(firstSvg, /viewBox="0 0 1200 720"/);
  assert.match(firstSvg, /style="max-width:100%;height:auto"/);
  assert.match(firstSvg, /role="img"/);
  assert.match(firstSvg, /aria-labelledby="svg-title svg-desc"/);
  assert.match(firstSvg, /id="decision-card"/);
  assert.match(firstSvg, /id="signal-to-decision"/);
  assert.match(firstSvg, /marker-end="url\(#arrow\)"/);
});

test('public CLI rejects an element that overflows the canvas', () => {
  const result = runCli('validate', path.join(FIXTURES, 'shape-overflow.json'));

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.deepEqual(readReport(result).errors, [
    {
      code: 'ELEMENT_OUT_OF_BOUNDS',
      elementIds: ['overflow-card'],
      message: 'Element overflow-card extends outside canvas 0 0 400 240.'
    }
  ]);
});

test('public CLI rejects text that exceeds its declared box', () => {
  const result = runCli('validate', path.join(FIXTURES, 'text-overflow.json'));

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.deepEqual(readReport(result).errors, [
    {
      code: 'TEXT_OVERFLOW',
      elementIds: ['overflow-label'],
      message: 'Text overflow-label line 1 exceeds its declared width of 120.'
    }
  ]);
});

test('public CLI rejects unintended element collisions', () => {
  const result = runCli('validate', path.join(FIXTURES, 'collision.json'));

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.deepEqual(readReport(result).errors, [
    {
      code: 'ELEMENT_COLLISION',
      elementIds: ['first-card', 'second-card'],
      message: 'Elements first-card and second-card overlap without an explicit relationship.'
    }
  ]);
});

test('explicit relationships allow only selected containment and overlap', () => {
  const allowed = runCli('validate', path.join(FIXTURES, 'relationships-valid.json'));
  const unrelated = runCli(
    'validate',
    path.join(FIXTURES, 'relationships-unrelated-collision.json')
  );

  assert.equal(allowed.status, 0, allowed.stderr || allowed.stdout);
  assert.equal(unrelated.status, 1, unrelated.stderr || unrelated.stdout);
  assert.deepEqual(readReport(unrelated).errors, [
    {
      code: 'ELEMENT_COLLISION',
      elementIds: ['host-card', 'rogue-card'],
      message: 'Elements host-card and rogue-card overlap without an explicit relationship.'
    }
  ]);
});

test('public CLI reports malformed geometry and relationship references', () => {
  const result = runCli('validate', path.join(FIXTURES, 'invalid-structure.json'));

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.deepEqual(
    readReport(result).errors.map((error) => error.code),
    ['INVALID_ELEMENT_ID', 'DUPLICATE_ID', 'INVALID_ELEMENT_BOUNDS', 'UNKNOWN_RELATIONSHIP_TARGET']
  );
});

test('containment cannot hide a child that extends outside its owner', () => {
  const result = runCli('validate', path.join(FIXTURES, 'containment-invalid.json'));

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.deepEqual(readReport(result).errors, [
    {
      code: 'INVALID_CONTAINMENT',
      elementIds: ['host-card', 'escaping-label'],
      message: 'Element escaping-label is not fully contained by host-card.'
    }
  ]);
});
