import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  extractPackageCoverageKeys,
  findMissingCoverageForStagedFiles,
  isMcpPackage,
} from '../check-staged-mcp-registry-coverage.mjs';

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

test('CLI reads exact manifests beneath dynamic routes and still rejects uncovered MCP packages', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'mcp-coverage-'));
  const script = fileURLToPath(new URL('../check-staged-mcp-registry-coverage.mjs', import.meta.url));
  const git = (...args) => execFileSync('git', args, { cwd, stdio: 'pipe' });
  try {
    git('init');
    mkdirSync(join(cwd, 'scripts'), { recursive: true });
    mkdirSync(join(cwd, 'packages/viewer/src/routes/[id]'), { recursive: true });
    writeFileSync(join(cwd, 'scripts/mcp-registry-coverage.mjs'), 'const PACKAGE_COVERAGE = {\n};\n');
    writeFileSync(join(cwd, 'packages/viewer/package.json'), JSON.stringify({ name: 'viewer' }));
    writeFileSync(join(cwd, 'packages/viewer/src/routes/[id]/+page.svelte'), '<h1>Lesson</h1>');
    git('add', '.');
    const passed = spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' });
    assert.equal(passed.status, 0, passed.stderr);
    writeFileSync(join(cwd, 'packages/viewer/package.json'), JSON.stringify({ name: 'viewer-mcp' }));
    git('add', '.');
    const rejected = spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' });
    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /packages\/viewer/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
