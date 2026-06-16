import test from 'node:test';
import assert from 'node:assert/strict';

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
