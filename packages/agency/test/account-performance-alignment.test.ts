import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const accountRoute = read('../src/routes/account/+page.svelte');
const accountPage = read('../../canon/src/lib/auth/components/AccountPage.svelte');

test('agency account opts into the shared Performance account surface', () => {
  assert.match(accountRoute, /visualStyle="performance"/);
  assert.match(accountPage, /visualStyle\?: 'default' \| 'performance'/);
  assert.match(accountPage, /class:performance=\{visualStyle === 'performance'\}/);
});

test('Performance account presentation uses the current paper, panel, ink, and line contract', () => {
  assert.match(accountPage, /\.account-container\.performance/);
  assert.match(accountPage, /var\(--color-performance-paper/);
  assert.match(accountPage, /var\(--color-performance-panel/);
  assert.match(accountPage, /var\(--color-performance-ink/);
  assert.match(accountPage, /var\(--color-performance-line/);
  assert.match(accountPage, /var\(--font-performance-mono/);
  assert.match(accountPage, /var\(--color-performance-ready/);
});

test('Performance account presentation preserves functional account controls', () => {
  for (const expected of [
    'Account Details',
    'Connected Properties',
    'Session',
    'handleLogout',
    'propertyUrls',
    'currentProperty'
  ]) {
    assert.ok(accountPage.includes(expected), `account surface lost ${expected}`);
  }

  assert.match(accountRoute, /MCP Access/);
  assert.match(accountRoute, /href="\/mcp-access"/);
});
