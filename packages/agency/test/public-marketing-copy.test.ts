import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  auditPublicCopy,
  discoverPublicCopyFiles,
  packageRoot
} from '../scripts/check-public-copy.mjs';

function packageRelative(file: string): string {
  return file.replace(`${packageRoot}/`, '');
}

test('public agency copy guard discovers every visitor-facing route', () => {
  const files = discoverPublicCopyFiles().map(packageRelative);

  assert.ok(files.includes('src/routes/+page.svelte'));
  assert.ok(files.includes('src/routes/cloudflare/+page.svelte'));
  assert.ok(files.includes('src/routes/products/ground/+page.svelte'));
  assert.ok(files.includes('src/routes/terms/+page.svelte'));
  assert.ok(!files.includes('src/routes/admin/funnel/+page.svelte'));
  assert.ok(!files.includes('src/routes/login/+page.svelte'));
});

test('public agency copy avoids internal strategy and unclear control language', () => {
  assert.deepEqual(auditPublicCopy(), []);
});

test('public agency copy guard catches phrases split across markup whitespace', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'agency-copy-'));
  const fixture = path.join(tempDir, '+page.svelte');

  try {
    writeFileSync(fixture, '<p>Bring the approval\n  owner before the build.</p>');

    assert.deepEqual(auditPublicCopy([fixture]), [
      {
        file: path.relative(packageRoot, fixture).replaceAll(path.sep, '/'),
        line: 1,
        column: 14,
        rule: 'approval-owner',
        text: 'approval\n  owner',
        replacement: 'approval authority'
      }
    ]);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('public agency copy guard catches old lane and partner framing', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'agency-copy-'));
  const fixture = path.join(tempDir, '+page.svelte');

  try {
    writeFileSync(
      fixture,
      '<p>The Partner Lane should not include a partner claim when the support lane requires review.</p>'
    );

    assert.deepEqual(auditPublicCopy([fixture]), [
      {
        file: path.relative(packageRoot, fixture).replaceAll(path.sep, '/'),
        line: 1,
        column: 8,
        rule: 'partner-lane',
        text: 'Partner Lane',
        replacement: 'workflow tool paths'
      },
      {
        file: path.relative(packageRoot, fixture).replaceAll(path.sep, '/'),
        line: 1,
        column: 42,
        rule: 'partner-claim',
        text: 'partner claim',
        replacement: 'public claim'
      },
      {
        file: path.relative(packageRoot, fixture).replaceAll(path.sep, '/'),
        line: 1,
        column: 65,
        rule: 'support-lane',
        text: 'support lane',
        replacement: 'support scope'
      },
      {
        file: path.relative(packageRoot, fixture).replaceAll(path.sep, '/'),
        line: 1,
        column: 73,
        rule: 'lane-requires',
        text: 'lane requires',
        replacement: 'workflow scope requires'
      }
    ]);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('agency README documents the public copy contract', () => {
  const source = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

  assert.match(source, /### Public Copy Contract/);
  assert.match(source, /Public `\.agency` copy should read like a clear business conversation/);
  assert.match(source, /Avoid public words and frames like:/);
  assert.match(source, /partner lane/);
  assert.match(source, /support lane/);
  assert.match(source, /Run `pnpm copy:check`/);
  assert.match(source, /Run `pnpm copy:heal`/);
});
