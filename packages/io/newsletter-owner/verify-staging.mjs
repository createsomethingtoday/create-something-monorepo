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
    '--config', 'newsletter-owner/wrangler.jsonc', '--dry-run', '--outdir', bundle], { cwd: project });
  const inbox = [];
  const linkOrigin = 'https://newsletter-preview.example';
  const email = 'operator@example.invalid';
  mf = new Miniflare({
    modules: true,
    modulesRoot: bundle,
    scriptPath: join(bundle, 'worker.js'),
    compatibilityDate: '2026-07-01',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'], kvNamespaces: ['CACHE'],
    bindings: { STAGING_RECIPIENT: email, NEWSLETTER_LINK_ORIGIN: linkOrigin, NEWSLETTER_OWNER_TOKEN: 'fixture-token',
      RESEND_API_KEY: 'synthetic-key', TURNSTILE_SECRET_KEY: 'synthetic-turnstile' },
    outboundService: async req => {
      const url = new URL(req.url);
      if (url.hostname === 'challenges.cloudflare.com') {
        const params = new URLSearchParams(await req.text());
        assert.equal(params.has('remoteip'), false);
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
    method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify(body)
  });
  const signup = { email, turnstileToken: 'test-challenge' };
  assert.equal((await send('', signup, 'wrong-token')).status, 401);
  assert.equal((await send('', { ...signup, email: 'other@example.invalid' })).status, 403);
  assert.equal((await send('', { email })).status, 400);
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
  assert.equal((await (await send('/confirm', confirmation)).json()).success, true);
  assert.equal(inbox.length, 2);
  assert.equal((await state()).consent_evidence, 'confirmation_link');
  assert.equal((await (await send('/confirm', confirmation)).json()).alreadyConfirmed, true);
  assert.equal(inbox.length, 2);
  const unsubscribe = link(inbox[1], 'unsubscribe');
  assert.equal((await (await send('/unsubscribe', unsubscribe)).json()).success, true);
  assert.equal((await state()).active, 0);
  assert.equal((await (await send('/confirm', confirmation)).json()).success, false);
  assert.equal((await (await send('/unsubscribe', unsubscribe)).json()).success, true);
  console.log('PASS. Isolated D1/KV signup, confirmation, repeat confirmation, unsubscribe, stale and repeat links; two captured messages; zero external deliveries.');
} finally {
  await mf?.dispose();
  await rm(bundle, { recursive: true, force: true });
}
