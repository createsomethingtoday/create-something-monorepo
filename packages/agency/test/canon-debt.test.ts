import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  auditCanonDebt,
  discoverCanonDebtFiles,
  packageRoot
} from '../scripts/check-canon-debt.mjs';

function packageRelative(file: string): string {
  return file.replace(`${packageRoot}/`, '');
}

test('canon debt guard discovers the managed admin security surface', () => {
  const files = discoverCanonDebtFiles().map(packageRelative);

  assert.ok(files.includes('src/routes/admin/security/+page.svelte'));
  assert.ok(files.includes('src/routes/admin/security/bearer-tokens/+page.svelte'));
  assert.ok(files.includes('src/routes/admin/security/contracts/+page.svelte'));
  assert.ok(files.includes('src/routes/admin/security/seeds/+page.svelte'));
});

test('canon debt guard catches raw color and motion values', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'agency-canon-debt-'));
  const fixture = path.join(tempDir, '+page.svelte');

  try {
    writeFileSync(
      fixture,
      '<style>p { color: #fff; background: rgba(255,255,255,0.1); transition: color 150ms ease; }</style>'
    );

    assert.deepEqual(auditCanonDebt([fixture]), [
      {
        file: path.relative(packageRoot, fixture).replaceAll(path.sep, '/'),
        line: 1,
        column: 19,
        rule: 'hardcoded-hex',
        text: '#fff',
        message: 'Use a Canon color token instead of a raw hex value.'
      },
      {
        file: path.relative(packageRoot, fixture).replaceAll(path.sep, '/'),
        line: 1,
        column: 37,
        rule: 'hardcoded-rgba',
        text: 'rgba(255,255,255,0.1)',
        message: 'Use a Canon color token instead of a raw rgba()/rgb() value.'
      },
      {
        file: path.relative(packageRoot, fixture).replaceAll(path.sep, '/'),
        line: 1,
        column: 60,
        rule: 'hardcoded-transition-timing',
        text: 'transition: color 150ms ease',
        message: 'Use Canon duration and easing tokens for transitions and animations.'
      }
    ]);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('canon debt guard accepts tokenized color and motion values', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'agency-canon-tokenized-'));
  const fixture = path.join(tempDir, '+page.svelte');

  try {
    writeFileSync(
      fixture,
      '<style>p { color: var(--color-fg-primary); background: var(--color-hover); transition: color var(--duration-micro) var(--ease-standard); }</style>'
    );

    assert.deepEqual(auditCanonDebt([fixture]), []);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('admin security canon debt stays tokenized', () => {
  assert.deepEqual(auditCanonDebt(), []);
});

test('package check runs the canon debt guard', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

  assert.match(manifest.scripts.check, /pnpm canon:check/);
});
