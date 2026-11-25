// Run with Node 22 after pnpm bootstrap:worktree. All requests terminate in local workerd.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const project = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const bundle = await mkdtemp(join(tmpdir(), 'newsletter-owner-test-'));
let mf;
try {
  execFileSync('node', ['scripts/run-wrangler.mjs', '--cwd', 'packages/io', 'deploy',
    '--config', 'newsletter-owner/wrangler.production.jsonc', '--dry-run', '--outdir', bundle], { cwd: project });
  const inbox = [];
  const linkOrigin = 'https://createsomething.io';
  const email = 'operator@example.invalid';
  mf = new Miniflare({
    modules: true,
    modulesRoot: bundle,
    scriptPath: join(bundle, 'worker.js'),
    compatibilityDate: '2026-07-01',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'], kvNamespaces: ['CACHE'],
    bindings: { NEWSLETTER_MODE: 'production', NEWSLETTER_LINK_ORIGIN: linkOrigin, NEWSLETTER_OWNER_TOKEN: 'fixture-token',
      RESEND_API_KEY: 'synthetic-key', TURNSTILE_SECRET_KEY: 'synthetic-turnstile' },
    outboundService: async req => {
      const url = new URL(req.url);
      if (url.hostname === 'challenges.cloudflare.com') {
        const params = new URLSearchParams(await req.text());
        assert.ok(['192.0.2.10', '192.0.2.20'].includes(params.get('remoteip')));
        return Response.json({ success: params.get('response') === 'test-challenge' });
      }
      assert.equal(req.url, 'https://api.resend.com/emails');
      inbox.push(await req.json());
      return Response.json({ id: 'fixture-receipt-' + inbox.length });
    }
  });
  const db = await mf.getD1Database('DB');
  const schema = await readFile(new URL('./migrations/0001_staging_schema.sql', import.meta.url), 'utf8');
  for (const statement of schema.replace(/^--.*$/gm, '').split(';').map(x => x.trim()).filter(Boolean)) {
    await db.prepare(statement).run();
  }
  const send = (endpoint, body, token = 'fixture-token') => mf.dispatchFetch('https://owner.invalid/api/newsletter' + endpoint, {
    method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json', 'x-newsletter-client-ip': '192.0.2.10',
      'x-newsletter-original-url': 'https://createsomething.io' + (endpoint ? endpoint : '/api/newsletter'),
      'x-newsletter-user-opted-out': 'false' }, body: JSON.stringify(body)
  });
  const signup = { email, turnstileToken: 'test-challenge', source: 'io-newsletter-archive', analyticsEnabled: true,
    landingUrl: 'https://createsomething.io/newsletters?utm_source=newsletter&utm_medium=email&utm_campaign=2026-09-01-the-interface-is-becoming-executable',
    sourceProperty: 'agency', intent: 'newsletter', lane: 'field-notes' };
  assert.equal((await send('', signup, 'wrong-token')).status, 401);
  assert.equal((await mf.dispatchFetch('https://owner.invalid/api/newsletter', {
    method: 'POST', headers: { authorization: 'Bearer fixture-token', 'content-type': 'application/json' },
    body: JSON.stringify(signup)
  })).status, 400);
  assert.equal((await send('', { email })).status, 400);
  for (const original of ['https://attacker.invalid/api/newsletter', 'https://createsomething.io/admin']) {
    assert.equal((await mf.dispatchFetch('https://owner.invalid/api/newsletter', {
      method: 'POST', headers: { authorization: 'Bearer fixture-token', 'content-type': 'application/json',
        'x-newsletter-original-url': original, 'x-newsletter-client-ip': '192.0.2.10' },
      body: JSON.stringify(signup)
    })).status, 400);
  }
  assert.equal((await mf.dispatchFetch('https://owner.invalid/api/newsletter', {
    method: 'POST', headers: { authorization: 'Bearer fixture-token', 'content-type': 'application/json',
      'x-newsletter-original-url': 'https://createsomething.io/api/newsletter' }, body: JSON.stringify(signup)
  })).status, 503);

  assert.equal(inbox.length, 0);
  assert.equal((await (await send('', signup)).json()).success, true);
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].to, email);
  const link = (message, route) => {
    const address = new URL(message.text.match(new RegExp('https://[^\\s]+/' + route + '\\?token=[^\\s]+'))[0]);
    assert.equal(address.origin, linkOrigin);
    return { token: address.searchParams.get('token') };
  };
  const confirmation = link(inbox[0], 'confirm');
  const state = () => db.prepare('SELECT * FROM newsletter_subscribers').first();
  assert.equal((await state()).confirmed_at, null);
  assert.equal((await state()).source, 'io-newsletter-archive');
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM newsletter_signup_attributions').first()).n, 1);
  assert.equal((await (await send('/confirm', confirmation)).json()).success, true);
  assert.equal(inbox.length, 2);
  assert.equal((await state()).consent_evidence, 'confirmation_link');
  assert.ok((await db.prepare('SELECT confirmed_at FROM newsletter_signup_attributions').first()).confirmed_at);
  assert.equal((await (await send('/confirm', confirmation)).json()).alreadyConfirmed, true);
  assert.equal(inbox.length, 2);
  const unsubscribe = link(inbox[1], 'unsubscribe');
  assert.equal((await (await send('/unsubscribe', unsubscribe)).json()).success, true);
  assert.equal((await state()).active, 0);
  assert.equal((await (await send('/confirm', confirmation)).json()).success, false);
  assert.equal((await (await send('/unsubscribe', unsubscribe)).json()).success, true);
  // Real shared KV rate limit remains per original browser address.
  const cache = await mf.getKVNamespace('CACHE');
  await cache.put('newsletter_rate:192.0.2.10', '3');
  assert.equal((await send('', signup)).status, 429);
  // Attribution must fail closed when ingress cannot resolve privacy preference.
  const privateEmail = 'privacy@example.invalid';
  const privateResponse = await mf.dispatchFetch('https://owner.invalid/api/newsletter', {
    method: 'POST', headers: { authorization: 'Bearer fixture-token', 'content-type': 'application/json',
      'x-newsletter-original-url': 'https://createsomething.io/api/newsletter', 'x-newsletter-client-ip': '192.0.2.20' },
    body: JSON.stringify({ ...signup, email: privateEmail })
  });
  assert.equal(privateResponse.status, 200);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM newsletter_signup_attributions').first()).n, 1);
  console.log('PASS. Production-mode trusted ingress, existing-data configuration; isolated D1/KV signup, confirmation, repeat confirmation, unsubscribe, stale and repeat links; synthetic captured messages; zero external deliveries.');
} finally {
  await mf?.dispose();
  await rm(bundle, { recursive: true, force: true });
}
