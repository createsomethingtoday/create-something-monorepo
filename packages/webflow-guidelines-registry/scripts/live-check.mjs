#!/usr/bin/env node
/**
 * Live verification against the published wrop, authenticated with the
 * cached Cloudflare Access token (`cloudflared access login https://wrop.wf.app`).
 *
 *   node scripts/live-check.mjs [--propose] [--publish]
 *
 * --propose  saves a registry-only confirmation draft and posts it as a proposal
 * --publish  (owner) publishes that draft as a new version, then resolves the thread
 * Without flags it only reads: identity, owner flag, proposals.
 */
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { WROP_TOPIC } from './build.mjs';

const BASE = 'https://wrop.wf.app';
const argv = new Set(process.argv.slice(2));
const token = execFileSync('cloudflared', ['access', 'token', `--app=${BASE}`], { encoding: 'utf8' }).trim();
const headers = { 'cf-access-token': token };
const j = (p, init = {}) => fetch(`${BASE}${p}`, { ...init, headers: { ...headers, 'Content-Type': 'application/json', ...(init.headers || {}) } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

const found = await j(`/api/wrops?metadata.topic=${encodeURIComponent(WROP_TOPIC)}`);
const wrop = found.body?.data?.[0];
if (!wrop) throw new Error('registry wrop not found');
const viewer = await fetch(`${BASE}/w/${wrop.slug}`, { headers });
console.log(`wrop ${wrop.slug} v${wrop.latest_version} owner=${wrop.created_by} viewer=${viewer.status}`);

function findChromium() {
  const base = join(homedir(), 'Library', 'Caches', 'ms-playwright');
  for (const d of readdirSync(base).filter((x) => /^chromium-\d+$/.test(x)).sort().reverse()) {
    for (const app of ['chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
      const p = join(base, d, app);
      if (existsSync(p)) return p;
    }
  }
  throw new Error('no chromium');
}
const browser = await puppeteer.launch({ executablePath: findChromium(), headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setExtraHTTPHeaders(headers);
page.on('dialog', (d) => d.accept());
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`));

const version = wrop.latest_version;
await page.goto(`${BASE}/api/wrops/${wrop.slug}/raw?v=${version}`, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => window.__guidelineRegistry?.state?.me, { timeout: 15000 });
const boot = await page.evaluate(() => ({ me: window.__guidelineRegistry.state.me, isOwner: window.__guidelineRegistry.state.isOwner, latest: window.__guidelineRegistry.state.meta?.latest_version, header: document.querySelector('.top .sub').textContent.trim(), publishBtn: Boolean(document.querySelector('[data-act="publish"]')) }));
console.log('boot', JSON.stringify(boot));
const proposalsBefore = await page.evaluate(() => window.__guidelineRegistry.call('list_proposals'));
console.log(`proposals before: ${proposalsBefore.length}`);

const SECTION = 'marketplace-guidelines/listing-language';
if (argv.has('--propose')) {
  const r = await page.evaluate(async (id) => {
    const reg = window.__guidelineRegistry;
    await reg.call('update_section', { id, registry: { check: 'form', owner: 'Submission form', confidence: 'confirmed' }, rationale: 'Confirmed: the submission form emits a non-blocking `non-english-listing` warning (lib/contentGuidelines.js, PR #11, 2026-08-11) and the long-description hint carries the English requirement.' });
    return reg.call('propose_drafts', { note: 'Live check of the proposal path from the registry page.' });
  }, SECTION);
  console.log('proposed', JSON.stringify(r));
  const threads = await j(`/api/wrops/${wrop.slug}/comments?v=${version}`);
  const mine = (threads.body?.threads || []).find((t) => String(t.id) === String(r.threadId));
  console.log(`thread visible via API: ${Boolean(mine)}; author=${mine?.comments?.[0]?.author}; text starts: ${mine?.comments?.[0]?.text.slice(0, 60)}`);
  const list = await page.evaluate(() => window.__guidelineRegistry.call('list_proposals'));
  console.log(`proposals after: ${list.length}; first summary: ${list[0]?.summary}`);

  if (argv.has('--publish')) {
    if (!boot.isOwner) throw new Error('not owner; cannot publish');
    await page.click('[data-act="publish"]');
    await page.waitForFunction(() => location.pathname.startsWith('/w/'), { timeout: 20000 }).catch(() => {});
    await new Promise((res) => setTimeout(res, 1500));
    const meta = await j(`/api/wrops/${wrop.slug}`);
    console.log(`after publish: latest_version=${meta.body.latest_version}`);
    const raw = await fetch(`${BASE}/api/wrops/${wrop.slug}/raw`, { headers }).then((x) => x.text());
    const island = JSON.parse(raw.match(/<script id="wfgr-data" type="application\/json">([\s\S]*?)<\/script>/)[1].replace(/<\\\/script/g, '</script>'));
    console.log(`new version registry.${SECTION}.confidence=${island.working.registry[SECTION].confidence}; changelog entries=${island.working.changelog.length}; last by ${island.working.changelog.at(-1)?.by}`);
    const resolved = await j(`/api/wrops/${wrop.slug}/comments/${r.threadId}?v=${version}`, { method: 'PATCH', body: JSON.stringify({ resolved: true }) });
    console.log(`thread resolved: HTTP ${resolved.status}`);
    // Reload latest and confirm the page reads the proposal as merged.
    await page.goto(`${BASE}/api/wrops/${wrop.slug}/raw?v=${meta.body.latest_version}`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => window.__guidelineRegistry?.state?.me, { timeout: 15000 });
    const after = await page.evaluate(async () => {
      const reg = window.__guidelineRegistry;
      const props = await reg.call('list_proposals');
      const sec = await reg.call('get_section', { id: 'marketplace-guidelines/listing-language' });
      return { proposals: props.map((p) => ({ v: p.version, resolved: p.resolved })), confidence: sec.registry.confidence, drafts: (await reg.call('list_drafts')).length, unsynced: sec.unsynced };
    });
    console.log('after reload', JSON.stringify(after));
  }
}
await browser.close();
if (errors.length) {
  console.error('CONSOLE ERRORS:\n' + errors.join('\n'));
  process.exitCode = 1;
}
console.log(process.exitCode ? 'LIVE CHECK FAILED' : 'LIVE CHECK OK');
