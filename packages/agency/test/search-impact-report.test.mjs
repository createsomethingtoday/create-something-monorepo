import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { buildSearchImpactSql, buildCloudflareSearchQuery } from '../scripts/report-search-impact.mjs';

test('search impact keeps host scope, first landing source, traffic classes and booking stages separate', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE unified_events(id TEXT, session_id TEXT, property TEXT, action TEXT, url TEXT, referrer TEXT, metadata TEXT, user_agent TEXT, created_at TEXT)');
  const insert = db.prepare('INSERT INTO unified_events VALUES(?,?,?,?,?,?,?,?,?)');
  let id = 0;
  const event = (session, action, url, referrer = '', trafficClass = 'external', date = '2026-10-25T12:00:00Z') =>
    insert.run(String(++id).padStart(3, '0'), session, 'agency', action, url, referrer, JSON.stringify({ trafficClass }), 'browser', date);
  event('organic', 'page_view', 'https://createsomething.agency/workflows/mcp-vs-api?x=private', 'https://www.google.com/search?q=private');
  event('organic', 'page_view', 'https://createsomething.agency/book', 'https://createsomething.agency/workflows/mcp-vs-api');
  event('organic', 'booking_cta_click', 'https://createsomething.agency/book');
  event('organic', 'booking_cta_click', 'https://createsomething.agency/book');
  event('organic', 'booking_completed', 'https://createsomething.agency/book');
  event('ai', 'page_view', 'https://www.createsomething.agency/', 'https://chatgpt.com/');
  event('subdomain', 'page_view', 'https://draw.createsomething.agency/', 'https://createsomething.agency/');
  event('spoof', 'page_view', 'https://createsomething.agency.attacker.example/', 'https://google.com.attacker.example/');
  event('unknown', 'page_view', 'https://createsomething.agency/', '', null);
  event('test', 'page_view', 'https://createsomething.agency/');
  event('test', 'booking_completed', 'https://createsomething.agency/book', '', 'test');
  event('excluded', 'page_view', 'https://createsomething.agency/', '', 'external', '2026-11-01T00:00:00Z');
  event('private', 'page_view', 'https://createsomething.agency/admin/accounts');
  try {
    const rows = db.prepare(buildSearchImpactSql({ start: '2026-10-25', end: '2026-11-01' })).all();
    const organic = rows.find(r => r.channel === 'search_referral');
    assert.equal(organic.sessions, 1);
    assert.equal(organic.page_views, 2);
    assert.equal(organic.booking_cta_sessions, 1);
    assert.equal(organic.booking_completed_sessions, 1);
    assert.equal(organic.landing_path, '/workflows/mcp-vs-api');
    assert.equal(rows.find(r => r.channel === 'ai_referral').host_scope, 'public_site');
    assert.equal(rows.find(r => r.host === 'draw.createsomething.agency').host_scope, 'subdomain');
    assert.equal(rows.find(r => r.host.includes('attacker')).host_scope, 'other_host');
    assert.equal(rows.find(r => r.host.includes('attacker')).channel, 'other_referral');
    assert.equal(rows.find(r => r.traffic_class === 'test').booking_completed_sessions, 1);
    assert.equal(rows.find(r => r.traffic_class === 'unclassified').sessions, 1);
    assert.equal(rows.find(r => r.host_scope === 'private_route').landing_path, '(private route)');
    assert.ok(!JSON.stringify(rows).includes('x=private'));
    assert.ok(!JSON.stringify(rows).includes('q=private'));
    assert.equal(rows.reduce((n, r) => n + r.sessions, 0), 7);
  } finally { db.close(); }
});

test('fragmented private landings stay separate from public sessions and duplicate completions', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE unified_events(id TEXT, session_id TEXT, property TEXT, action TEXT, url TEXT, referrer TEXT, metadata TEXT, user_agent TEXT, created_at TEXT)');
  const insert = db.prepare('INSERT INTO unified_events VALUES(?,?,?,?,?,?,?,?,?)');
  let id = 0;
  const event = (action, path, referrer = '') => insert.run(String(++id).padStart(3, '0'), 'mixed', 'agency', action,
    `https://createsomething.agency${path}`, referrer, '{"trafficClass":"external"}', 'browser', '2026-10-26T12:00:00Z');
  event('page_view', '/admin#private', 'https://www.google.com/');
  event('page_view', '/login/callback?secret=hidden#private');
  event('page_view', '/book', 'https://createsomething.agency/admin');
  event('booking_cta_click', '/book');
  event('booking_completed', '/book');
  event('booking_completed', '/book');
  try {
    const rows = db.prepare(buildSearchImpactSql({ start: '2026-10-25', end: '2026-11-01' })).all();
    assert.equal(rows.length, 2);
    const privateRow = rows.find(row => row.host_scope === 'private_route');
    assert.equal(privateRow.page_views, 2);
    assert.equal(privateRow.landing_path, '(private route)');
    assert.equal(privateRow.channel, 'search_referral');
    assert.equal(privateRow.booking_completed_sessions, 0);
    const publicRow = rows.find(row => row.host_scope === 'public_site');
    assert.equal(publicRow.page_views, 1);
    assert.equal(publicRow.landing_path, '/book');
    assert.equal(publicRow.channel, 'own_properties');
    assert.equal(publicRow.sessions, 1);
    assert.equal(publicRow.booking_cta_sessions, 1);
    assert.equal(publicRow.booking_completed_sessions, 1);
    assert.doesNotMatch(JSON.stringify(rows), /secret|hidden|#private|\/admin|\/login/);
  } finally { db.close(); }
});

test('report requires real bounded dates and generates a read-only matching Cloudflare scope', () => {
  for (const options of [{ start: '2026-02-30', end: '2026-03-04' }, { start: '2026-11-01', end: '2026-10-25' }, { start: '2025-01-01', end: '2026-11-01' }]) {
    assert.throws(() => buildSearchImpactSql(options));
  }
  const options = { start: '2026-10-25', end: '2026-11-01' };
  assert.doesNotMatch(buildSearchImpactSql(options), /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b|\bREPLACE\s+INTO\b/i);
  const query = buildCloudflareSearchQuery({ ...options, accountId: '9645bd52e640b8a4f40a3a55ff1dd75a' });
  assert.match(query, /bot: 0/);
  assert.match(query, /refererHost/);
  assert.match(query, /requestHost/);
  assert.match(query, /2026-11-01T00:00:00Z/);
  assert.throws(() => buildCloudflareSearchQuery({ ...options, accountId: 'bad"injection' }));
});

test('protected Map links never expose bearer tokens or workspace identifiers in acquisition rows', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE unified_events(id TEXT, session_id TEXT, property TEXT, action TEXT, url TEXT, referrer TEXT, metadata TEXT, user_agent TEXT, created_at TEXT)');
  const insert = db.prepare('INSERT INTO unified_events VALUES(?,?,?,?,?,?,?,?,?)');
  for (const [i, path] of ['/map/share/private-bearer-token', '/map/workspace/private-map-id', '/map/subscribe', '/map/share', '/map/workspace#private'].entries()) {
    insert.run(String(i), `session-${i}`, 'agency', 'page_view', `https://createsomething.agency${path}`, '', '{"trafficClass":"external"}', 'browser', '2026-10-26T12:00:00Z');
  }
  try {
    const rows = db.prepare(buildSearchImpactSql({ start: '2026-10-25', end: '2026-11-01' })).all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].host_scope, 'private_route');
    assert.equal(rows[0].landing_path, '(private route)');
    assert.equal(rows[0].sessions, 5);
    assert.doesNotMatch(JSON.stringify(rows), /private-bearer-token|private-map-id|\/map\//);
  } finally { db.close(); }
});

test('encoded routing segments are redacted instead of exposing protected Map tokens', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE unified_events(id TEXT, session_id TEXT, property TEXT, action TEXT, url TEXT, referrer TEXT, metadata TEXT, user_agent TEXT, created_at TEXT)');
  const insert = db.prepare('INSERT INTO unified_events VALUES(?,?,?,?,?,?,?,?,?)');
  for (const [i, path] of ['/map/%73hare/private-bearer-token', '/%6dap/workspace/private-map-id'].entries()) {
    insert.run(String(i), `session-${i}`, 'agency', 'page_view', `https://createsomething.agency${path}?utm_content=ordinary%20tag`, '', '{"trafficClass":"external"}', 'browser', '2026-10-26T12:00:00Z');
  }
  try {
    const rows = db.prepare(buildSearchImpactSql({ start: '2026-10-25', end: '2026-11-01' })).all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].host_scope, 'redacted_path');
    assert.equal(rows[0].sessions, 2);
    assert.doesNotMatch(JSON.stringify(rows), /private-bearer-token|private-map-id/);
  } finally { db.close(); }
});
