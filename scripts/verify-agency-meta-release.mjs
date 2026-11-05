#!/usr/bin/env node
/** Read-only by default. Explicit flags exercise an operator consent and optional real PageView. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const args = process.argv.slice(2);
const exercise = args.includes('--exercise-consent');
const emit = args.includes('--send-page-view');
if (args.some(arg => !['--exercise-consent', '--send-page-view'].includes(arg))) {
  throw new Error('Usage: node scripts/verify-agency-meta-release.mjs [--exercise-consent] [--send-page-view]');
}
if (emit && !exercise) throw new Error('--send-page-view requires --exercise-consent');
const origin = 'https://createsomething.agency';
let cookie;
const checks = [];
async function request(path, options = {}) {
  const response = await fetch(origin + path, {
    ...options,
    headers: { Origin: origin, 'Content-Type': 'application/json',
      'User-Agent': 'CREATE SOMETHING release verification', ...(cookie ? { Cookie: cookie } : {}), ...options.headers },
    signal: AbortSignal.timeout(15000)
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { nonJson: true }; }
  return { response, body };
}
try {
  const initial = await request('/api/marketing/consent');
  assert.equal(initial.response.status, 200);
  assert.equal(initial.body.available, true);
  assert.equal(initial.body.marketing, false);
  assert.match(initial.response.headers.get('cache-control'), /no-store/);
  assert.equal(initial.response.headers.get('set-cookie'), null);
  checks.push('default off, available, no-store, no identifier before choice');
  if (exercise) {
    const denied = await request('/api/marketing/consent', { method: 'POST',
      headers: { Origin: 'https://example.invalid' }, body: '{"marketing":true}' });
    assert.equal(denied.response.status, 403);
    const grant = await request('/api/marketing/consent', { method: 'POST', body: '{"marketing":true}' });
    // Capture the cleanup handle before assertions, including for an unexpected grant response.
    const setCookie = grant.response.headers.get('set-cookie');
    if (setCookie?.startsWith('cs_meta_consent=')) cookie = setCookie.split(';')[0];
    assert.equal(grant.response.status, 200);
    assert.equal(grant.body.marketing, true);
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict']) assert.ok(setCookie?.includes(flag));
    assert.equal((await request('/api/marketing/consent')).body.marketing, true);
    checks.push('same-origin grant and durable consent read');
    const invalid = await request('/api/marketing/page-view', { method: 'POST',
      body: JSON.stringify({ url: origin + '/services?email=private', eventId: randomUUID() }) });
    assert.equal(invalid.response.status, 400);
    if (emit) {
      const eventId = randomUUID();
      const page = await request('/api/marketing/page-view', { method: 'POST',
        body: JSON.stringify({ url: origin + '/services', eventId }) });
      assert.equal(page.response.status, 200, 'canonical-domain Meta delivery must succeed');
      assert.equal(page.body.forwarded, true);
      checks.push(`Meta API accepted operator PageView ${eventId}; campaign attribution is not established`);
    }
    const blocked = await request('/api/marketing/consent', { headers: { 'Sec-GPC': '1' } });
    assert.equal(blocked.body.marketing, false);
    assert.equal(blocked.body.blocked, true);
    assert.equal((await request('/api/marketing/consent')).body.marketing, false);
    const page = await request('/api/marketing/page-view', { method: 'POST',
      body: JSON.stringify({ url: origin + '/services', eventId: randomUUID() }) });
    assert.equal(page.body.forwarded, false);
    checks.push('GPC durably revokes; revoked consent cannot forward');
  }
} finally {
  if (cookie) {
    const withdrawn = await request('/api/marketing/consent', { method: 'POST', body: '{"marketing":false}' });
    assert.equal(withdrawn.response.status, 200, 'operator consent cleanup must succeed');
    assert.equal(withdrawn.body.marketing, false);
  }
}
console.log(JSON.stringify({ passed: true, checks, liveInquiryTested: false }, null, 2));
