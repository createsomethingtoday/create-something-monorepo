import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const TSX_BIN = path.join(REPO_ROOT, 'node_modules', '.bin', 'tsx');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'list-exports.ts');

function runExports(...args) {
  return spawnSync(TSX_BIN, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: process.env
  });
}

test('accepts scoped package names for Canon root exports', () => {
  const result = runExports('@create-something/canon', 'getCanonOverlayCatalog');

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /getCanonOverlayCatalog exists in @create-something\/canon/);
  assert.match(result.stdout, /Source: packages\/canon\/src\/lib\/overlays\/index\.ts/);
});

test('preserves shorthand package lookup', () => {
  const result = runExports('canon', 'CommandPalette');

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /CommandPalette exists in @create-something\/canon/);
});

test('accepts scoped Canon subpaths backed by package exports', () => {
  const result = runExports(
    '@create-something/canon/overlays/project-template',
    'buildCanonProjectOverlayTemplateFilePack'
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(
    result.stdout,
    /buildCanonProjectOverlayTemplateFilePack exists in @create-something\/canon\/overlays\/project-template/
  );
});

test('rejects missing scoped packages with the existing package-not-found contract', () => {
  const result = runExports('@create-something/missing');

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Package not found: @create-something\/missing/);
});
