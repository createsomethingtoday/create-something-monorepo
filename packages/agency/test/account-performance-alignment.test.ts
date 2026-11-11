import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const accountRoute = read('../src/routes/account/+page.svelte');
const accountPage = read('../src/lib/components/AgencyAccountPage.svelte');

test('agency account keeps its own presentation and remains noindex', () => {
  assert.match(accountRoute, /<AgencyAccountPage user=\{accountUser\}/);
  assert.match(accountRoute, /noindex=\{true\}/);
});

test('each account wayfinding destination exists in the task surface', () => {
  const destinations = [...accountRoute.matchAll(/id: '(account-[^']+)'/g)].map(match => match[1]);
  assert.deepEqual(destinations, ['account-profile', 'account-mcp-access', 'account-properties', 'account-session']);
  let previous = -1;
  for (const id of destinations) {
    const index = accountPage.indexOf(`id="${id}" tabindex="-1"`);
    assert.ok(index > previous, `${id} must be a focusable heading in reading order`);
    previous = index;
  }
});

test('Performance account presentation preserves functional account controls', () => {
  for (const expected of [
    'Account details',
    'Connected Properties',
    'Session',
    'handleLogout',
    'https://createsomething.agency/login?redirect=/account',
    "fetch('/api/auth/logout', { method: 'POST' })"
  ]) {
    assert.ok(accountPage.includes(expected), `account surface lost ${expected}`);
  }

  assert.match(accountPage, /MCP Access/);
  assert.match(accountPage, /href="\/mcp-access"/);
});
