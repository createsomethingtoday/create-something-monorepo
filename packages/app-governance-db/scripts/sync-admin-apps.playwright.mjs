#!/usr/bin/env node
/**
 * Automated Webflow Apps Admin sync via Playwright.
 *
 * Ports the proven IC console-script contract (webflow-apps-admin client-id-audit
 * v2.0.0: load-more loop, card collection, edit-page enrichment at 500ms) into a
 * persistent browser profile, then pushes the snapshot into the governance DB
 * (drift detection + subscriber notifications fire server-side).
 *
 * Requirements: device on Tailscale; one-time interactive login.
 *
 * Usage (from monorepo root):
 *   node packages/app-governance-db/scripts/sync-admin-apps.playwright.mjs --login   # first run, headed
 *   node packages/app-governance-db/scripts/sync-admin-apps.playwright.mjs           # scheduled runs, headless
 * Flags: --login (headed, wait for Okta), --no-enrich (skip edit pages), --keep-snapshot, --no-push
 */
import { chromium } from 'playwright';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ARGS = new Set(process.argv.slice(2));
const HEADED = ARGS.has('--login');
const ENRICH = !ARGS.has('--no-enrich');
const PUSH = !ARGS.has('--no-push');

const PROFILE_DIR = path.join(os.homedir(), '.config', 'webflow-admin-sync', 'profile');
const OUT_DIR = path.join(os.homedir(), '.config', 'webflow-admin-sync');
const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');

const CONFIG = {
  RATE_LIMIT_MS: 500,
  LOAD_MORE_WAIT_MS: 1500,
  LOAD_MORE_SELECTOR: '[data-automation-id="collection-list-load-more"]',
  APP_LINK_SELECTOR: 'a[href^="/apps/detail/"]',
  VISIBILITY_TOKENS: ['PUBLIC', 'PRIVATE'],
  STATUS_TOKENS: ['APPROVED', 'PENDING', 'DENIED', 'IN REVIEW', 'DRAFT', 'ARCHIVED'],
};

fs.mkdirSync(PROFILE_DIR, { recursive: true });

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: !HEADED,
  viewport: { width: 1440, height: 1000 },
});
const page = context.pages()[0] ?? (await context.newPage());

// Capture the internal API routes the admin page calls (for the future
// headless read-API conversation with platform).
const apiRoutes = new Map();
page.on('response', (res) => {
  const url = res.url();
  if (/webflow\.com\/(api|.*\/api)\//.test(url) && (res.headers()['content-type'] ?? '').includes('json')) {
    const key = `${res.request().method()} ${url.split('?')[0]}`;
    apiRoutes.set(key, (apiRoutes.get(key) ?? 0) + 1);
  }
});

console.log('→ opening webflow.com/apps');
await page.goto('https://webflow.com/apps', { waitUntil: 'domcontentloaded', timeout: 60000 });

// The public marketplace at the same URL also shows app cards, so cards alone
// prove nothing — require the ADMIN VIEW banner that only the admin surface renders.
const adminViewVisible = async () =>
  (await page.locator(CONFIG.APP_LINK_SELECTOR).count()) > 0 &&
  (await page.evaluate(() => document.body.innerText.includes('ADMIN VIEW')));

if (!(await adminViewVisible())) {
  if (!HEADED) {
    console.error('✗ ADMIN VIEW not detected — logged out, missing admin role, or Tailscale down. Run once with --login to establish the session.');
    await context.close();
    process.exit(2);
  }
  console.log('… waiting for you to complete login (Okta) until ADMIN VIEW appears. Checking every 5s, up to 5 minutes.');
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline && !(await adminViewVisible())) {
    await page.waitForTimeout(5000);
  }
  if (!(await adminViewVisible())) {
    console.error('✗ ADMIN VIEW not detected in time; run again with --login.');
    await context.close();
    process.exit(2);
  }
}
console.log('✓ ADMIN VIEW confirmed');

// Load-more loop (identical contract to the console script).
let clicks = 0;
while (true) {
  const btn = page.locator(CONFIG.LOAD_MORE_SELECTOR);
  if ((await btn.count()) === 0 || !(await btn.first().isVisible()) || (await btn.first().isDisabled().catch(() => false))) break;
  await btn.first().click();
  clicks++;
  await page.waitForTimeout(CONFIG.LOAD_MORE_WAIT_MS);
}
console.log(`✓ listing fully loaded (${clicks} "Show more" clicks)`);

// Collect cards + badges, then enrich from edit pages — all inside the page so
// fetches ride the session cookies. Direct port of the audit-script logic.
const snapshot = await page.evaluate(
  async ({ CONFIG, ENRICH }) => {
    const seen = new Set();
    const apps = [];
    for (const link of document.querySelectorAll(CONFIG.APP_LINK_SELECTOR)) {
      const match = (link.getAttribute('href') || '').match(/^\/apps\/detail\/([^\/]+)$/);
      if (!match || seen.has(match[1])) continue;
      seen.add(match[1]);
      const card = link.closest('li, article, [class*="card"], [class*="Card"]') || link;
      const text = (card.innerText || '').toUpperCase();
      // No `name` here on purpose. The card yields img alt text or a heading,
      // which can be an asset filename ("roolify_icon.png"), a logo label
      // ("theConsent logo"), or a marketing tagline — values that only ever
      // reached the DB as a fallback when the edit page wasn't read, and then
      // surfaced as listing drift once enrichment corrected them.
      // The edit page's #name is the only authoritative source; when we can't
      // read it we omit the key so the server's COALESCE keeps the stored name
      // and the diff skips the field (it only diffs `!== undefined`).
      apps.push({
        slug: match[1],
        visibility: CONFIG.VISIBILITY_TOKENS.find((t) => text.includes(t)) ?? null,
        review_status: CONFIG.STATUS_TOKENS.find((t) => text.includes(t)) ?? null,
        detail_url: `${location.origin}/apps/detail/${match[1]}`,
      });
    }
    if (ENRICH) {
      for (let i = 0; i < apps.length; i++) {
        try {
          const res = await fetch(`${apps[i].detail_url}/edit`, { credentials: 'include', headers: { Accept: 'text/html' } });
          if (res.ok) {
            const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
            apps[i].client_id = doc.querySelector('#clientId')?.value || null;
            apps[i].workspace_id = doc.querySelector('#workspaceId')?.value || null;
            const editName = doc.querySelector('#name')?.value?.trim();
            if (editName) apps[i].name = editName;
          } else {
            apps[i].enrich_error = `HTTP ${res.status}`;
          }
        } catch (err) {
          apps[i].enrich_error = String(err);
        }
        await new Promise((r) => setTimeout(r, CONFIG.RATE_LIMIT_MS));
      }
    }
    return { captured_at: new Date().toISOString(), source: 'webflow.com/apps (admin view, playwright)', count: apps.length, apps };
  },
  { CONFIG, ENRICH },
);

await context.close();
snapshot.admin_api_routes = [...apiRoutes.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([route, count]) => ({ route, count }));
console.log(`✓ snapshot captured: ${snapshot.count} apps (${ENRICH ? 'enriched' : 'listing-only'})`);

// Names come only from the edit page. Report the gap instead of letting it pass
// silently: these apps keep whatever name is already stored, and a later run
// with working enrichment fills them in.
const unnamed = snapshot.apps.filter((a) => !a.name).length;
if (unnamed) {
  console.log(`  ${unnamed}/${snapshot.count} without an authoritative name (edit-page #name unread) — stored names left untouched`);
}

// Defense in depth: an admin-view capture must yield client_ids. A snapshot with
// none means we scraped the wrong surface — never push it.
if (ENRICH && snapshot.count > 0 && !snapshot.apps.some((a) => a.client_id)) {
  console.error('✗ Zero client_ids captured — this is not admin data. Aborting without push.');
  process.exit(3);
}

if (apiRoutes.size) {
  console.log('\nInternal API routes observed on the admin page (option C candidates):');
  for (const [route, count] of [...apiRoutes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`  ${count}× ${route}`);
  }
}

const snapFile = path.join(OUT_DIR, `admin-apps-snapshot-${snapshot.captured_at.slice(0, 10)}.json`);
fs.writeFileSync(snapFile, JSON.stringify(snapshot, null, 2));
console.log(`\n✓ snapshot written: ${snapFile}`);

if (PUSH) {
  let key = process.env.APP_GOVERNANCE_MCP_KEY;
  if (!key) {
    const out = execFileSync('infisical', ['secrets', 'get', 'APP_GOVERNANCE_MCP_KEY', '--plain'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    key = out.trim().split('\n').pop().trim();
  }
  const push = spawnSync('node', [path.join(REPO_ROOT, 'packages/app-governance-db/scripts/push-admin-apps.mjs'), snapFile], {
    env: { ...process.env, APP_GOVERNANCE_MCP_KEY: key },
    stdio: 'inherit',
  });
  if (push.status !== 0) process.exit(push.status ?? 1);
}
if (!ARGS.has('--keep-snapshot') && PUSH) fs.unlinkSync(snapFile);
console.log('\n✓ admin sync complete');
