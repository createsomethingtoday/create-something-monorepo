import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

import {
  extractPackageCoverageKeys,
  findMissingCoverageForStagedFiles,
  isMcpPackage,
} from '../check-staged-mcp-registry-coverage.mjs';

test('CLI handles bracketed routes and still rejects uncovered MCP packages', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'registry-bracket-route-'));
  const script = fileURLToPath(new URL('../check-staged-mcp-registry-coverage.mjs', import.meta.url));
  try {
    execFileSync('git', ['init', '-q', cwd]);
    mkdirSync(join(cwd, 'scripts'));
    mkdirSync(join(cwd, 'packages/draw/src/routes/[shareId]'), { recursive: true });
    writeFileSync(join(cwd, 'scripts/mcp-registry-coverage.mjs'), 'const PACKAGE_COVERAGE = {\n};\n');
    writeFileSync(join(cwd, 'packages/draw/package.json'), JSON.stringify({ name: 'draw' }));
    writeFileSync(join(cwd, 'packages/draw/src/routes/[shareId]/+page.svelte'), '<p>Draw</p>');
    execFileSync('git', ['add', '.'], { cwd });
    execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture'], { cwd });
    writeFileSync(join(cwd, 'packages/draw/src/routes/[shareId]/+page.svelte'), '<p>Draw identity</p>');
    execFileSync('git', ['add', '.'], { cwd });
    const clean = spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' });
    assert.equal(clean.status, 0, clean.stderr);
    writeFileSync(join(cwd, 'packages/draw/package.json'), JSON.stringify({ name: 'draw-mcp' }));
    execFileSync('git', ['add', '.'], { cwd });
    const uncovered = spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' });
    assert.equal(uncovered.status, 1);
    assert.match(uncovered.stderr, /Missing coverage entries:[\s\S]*packages\/draw/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('extracts top-level PACKAGE_COVERAGE keys from the coverage script source', () => {
  const source = `
const PACKAGE_COVERAGE = {
  'packages/spotify-mcp': {
    registry: ['spotify-mcp']
  },
  'packages/spotify-mcp/worker': {
    registry: ['spotify-mcp']
  }
};
`;

  assert.deepEqual([...extractPackageCoverageKeys(source)], [
    'packages/spotify-mcp',
    'packages/spotify-mcp/worker',
  ]);
});

test('detects MCP packages by package name or directory', () => {
  assert.equal(isMcpPackage('packages/spotify-mcp', '@create-something/spotify'), true);
  assert.equal(isMcpPackage('packages/halfdozen-gmail-sync', '@create-something/halfdozen-gmail-sync'), false);
  assert.equal(isMcpPackage('packages/concierge-chat', '@create-something/concierge-chat'), false);
});

test('flags staged MCP package dirs missing from PACKAGE_COVERAGE', () => {
  const missing = findMissingCoverageForStagedFiles(
    [
      'packages/spotify-mcp/src/index.ts',
      'packages/spotify-mcp/worker/src/index.ts',
      'packages/concierge-chat/src/routes/+page.svelte',
    ],
    {
      'packages/spotify-mcp': '@create-something/spotify-mcp',
      'packages/spotify-mcp/worker': '@create-something/spotify-mcp-worker',
      'packages/concierge-chat': '@create-something/concierge-chat',
    },
    new Set(['packages/spotify-mcp']),
  );

  assert.deepEqual(missing, ['packages/spotify-mcp/worker']);
});

test('ignores staged files outside MCP package dirs', () => {
  const missing = findMissingCoverageForStagedFiles(
    ['packages/concierge-chat/src/routes/+page.svelte'],
    {
      'packages/concierge-chat': '@create-something/concierge-chat',
    },
    new Set(),
  );

  assert.deepEqual(missing, []);
});
