#!/usr/bin/env node
/**
 * Headless smoke test for dist/index.html: loads the page in Chromium, mocks a
 * WebMCP `navigator.modelContext`, exercises the views, the editor, drafts,
 * export, and every tool. Fails on any console error.
 *
 *   node scripts/smoke.mjs [--url <wrop raw url>] [--screenshots]
 */
import puppeteer from 'puppeteer-core';
import { readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const argv = process.argv.slice(2);
const arg = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
const url = arg('--url') || `file://${join(root, 'dist', 'index.html')}`;
const shots = argv.includes('--screenshots');

function findChromium() {
  const base = join(homedir(), 'Library', 'Caches', 'ms-playwright');
  const dirs = readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    for (const app of ['chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium']) {
      const p = join(base, d, app);
      if (existsSync(p)) return p;
    }
  }
  throw new Error('no Playwright Chromium found under ~/Library/Caches/ms-playwright');
}

const browser = await puppeteer.launch({ executablePath: process.env.CHROMIUM || findChromium(), headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

// Mock WebMCP before any page script runs.
await page.evaluateOnNewDocument(() => {
  const registered = [];
  Object.defineProperty(navigator, 'modelContext', {
    value: {
      registerTool: (t) => registered.push(t),
      __registered: registered,
    },
    configurable: true,
  });
});

await page.goto(url, { waitUntil: 'load' });
const results = {};
const step = async (name, fn) => {
  try {
    results[name] = await fn();
  } catch (e) {
    results[name] = `FAIL: ${e.message}`;
    process.exitCode = 1;
  }
};

await step('boot', () => page.evaluate(() => ({ version: window.__guidelineRegistry.version, webmcp: window.__guidelineRegistry.webmcp, tools: navigator.modelContext.__registered.length, sections: document.querySelectorAll('article.section').length })));
await step('pages render', async () => {
  const out = {};
  const slugs = await page.evaluate(() => window.__guidelineRegistry.data.working.pages.map((p) => p.slug));
  for (const slug of slugs) {
    await page.click(`button.page[data-page="${slug}"]`);
    out[slug] = await page.evaluate(() => ({ sections: document.querySelectorAll('article.section').length, tables: document.querySelectorAll('.md table').length, callouts: document.querySelectorAll('.md .callout').length, tabs: document.querySelectorAll('.md .tabs-c').length, chips: document.querySelectorAll('.chips .chip').length }));
    if (shots) {
      mkdirSync(join(root, 'dist', 'shots'), { recursive: true });
      await page.screenshot({ path: join(root, 'dist', 'shots', `${slug}.png`), fullPage: false });
    }
  }
  return out;
});
await step('tabs component toggles', async () => {
  await page.click('button.page[data-page="submitting-your-app"]');
  const has = await page.$('.md .tabs-c [data-tab-btn="1"]');
  if (!has) return 'no tabs on page';
  await has.click();
  return page.evaluate(() => ({ activePanelVisible: !document.querySelector('.md .tabs-c [data-tab-panel="1"]').hidden, firstHidden: document.querySelector('.md .tabs-c [data-tab-panel="0"]').hidden }));
});
await step('tool: search + get_section', () => page.evaluate(async () => {
  const r = window.__guidelineRegistry;
  const hits = await r.call('search_guidelines', { query: 'client_secret' });
  const sec = await r.call('get_section', { id: 'marketplace-guidelines/token-security' });
  return { hits: hits.length, firstHit: hits[0]?.id, rules: sec.rules.length, check: sec.registry.check, owner: sec.registry.owner };
}));
await step('tool: update_section → draft → diff', () => page.evaluate(async () => {
  const r = window.__guidelineRegistry;
  const sec = await r.call('get_section', { id: 'marketplace-guidelines/session-behavior' });
  const mdx = sec.mdx.replace('Complete the OAuth flow once at install', 'Complete the OAuth flow exactly once at install');
  const upd = await r.call('update_section', { id: sec.id, mdx, registry: { check: 'manual', confidence: 'confirmed' }, rationale: 'smoke test' });
  const drafts = await r.call('list_drafts');
  const diff = await r.call('diff_section', { id: sec.id });
  const stored = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith('wfgr:'))));
  return { diff: upd.diff, drafts: drafts.length, diffHasAdd: diff.diff.includes('+[exactly'), storedIds: Object.keys(stored), badge: Boolean(document.querySelector('article.section.has-draft')) };
}));
await step('tool: rejects heading level change', () => page.evaluate(async () => {
  try {
    await window.__guidelineRegistry.call('update_section', { id: 'marketplace-guidelines/session-behavior', mdx: '### Session behavior\nx' });
    return 'did not throw';
  } catch (e) {
    return e.message;
  }
}));
await step('editor UI: open, edit, save', async () => {
  await page.click('button.page[data-page="private-apps"]');
  await page.click('article.section[data-section="private-apps/best-practices"] [data-act="edit"]');
  await page.waitForSelector('[data-editor="private-apps/best-practices"] textarea.mdx');
  await page.evaluate(() => {
    const ta = document.querySelector('[data-editor="private-apps/best-practices"] textarea.mdx');
    ta.value += '\n- Smoke-test bullet';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-editor="private-apps/best-practices"] [data-field="rationale"]').value = 'ui smoke';
  });
  await new Promise((r) => setTimeout(r, 300));
  const previewUpdated = await page.evaluate(() => document.querySelector('[data-preview]').innerHTML.includes('Smoke-test bullet'));
  await page.click('[data-editor="private-apps/best-practices"] [data-act="save"]');
  return page.evaluate(() => ({ previewUpdated: undefined, drafts: Object.keys(window.__guidelineRegistry.state.drafts), rendered: document.querySelector('article.section[data-section="private-apps/best-practices"] .content').innerHTML.includes('Smoke-test bullet') })).then((r) => ({ ...r, previewUpdated }));
});
await step('registry view + inline change', async () => {
  await page.click('nav.tabs [data-view="registry"]');
  await page.waitForSelector('table.reg');
  const rows = await page.evaluate(() => document.querySelectorAll('table.reg tbody tr').length);
  await page.select('table.reg select[data-reg="check"][data-id="marketplace-guidelines/audit-cooperation"]', 'manual');
  const after = await page.evaluate(async () => (await window.__guidelineRegistry.call('get_section', { id: 'marketplace-guidelines/audit-cooperation' })).registry);
  return { rows, check: after.check, confidence: after.confidence };
});
await step('export: round trip with drafts applied', () => page.evaluate(async () => {
  const r = window.__guidelineRegistry;
  const out = {};
  for (const p of r.data.working.pages) {
    const exp = await r.call('export_page_mdx', { slug: p.slug });
    const base = r.data.baseline.pages.find((b) => b.slug === p.slug);
    const baseText = base.frontmatter + base.sections.filter((s) => !(s.empty && s.raw === '')).map((s) => s.raw).join('\n');
    out[p.slug] = exp.mdx === baseText ? 'identical' : 'changed';
  }
  const pr = await r.call('get_pr_summary');
  return { pages: out, prLines: pr.markdown.split('\n').length, prMentionsSession: pr.markdown.includes('Session behavior') };
}));
await step('changelog + export views render', async () => {
  await page.click('nav.tabs [data-view="changelog"]');
  const c = await page.evaluate(() => document.querySelector('main h2').textContent);
  await page.click('nav.tabs [data-view="export"]');
  const e = await page.evaluate(() => ({ h: document.querySelector('main h2').textContent, cards: document.querySelectorAll('.card').length }));
  await page.click('nav.tabs [data-view="proposals"]');
  const p = await page.evaluate(() => document.querySelector('main .notice, main .empty')?.textContent.slice(0, 80));
  return { changelog: c, export: e, proposals: p };
});
await step('webmcp wrappers: write tools via navigator.modelContext', () => page.evaluate(async () => {
  const tools = Object.fromEntries(navigator.modelContext.__registered.map((t) => [t.name, t]));
  const parse = (r) => JSON.parse(r.content[0].text);
  const sec = parse(await tools.get_section.execute({ id: 'marketplace-guidelines/advertising' }));
  const upd = parse(await tools.update_section.execute({ id: sec.id, mdx: sec.mdx.replace('Do not display ads', 'Do not display advertisements'), rationale: 'wrapper test' }));
  const drafts = parse(await tools.list_drafts.execute({}));
  const bad = await tools.update_section.execute({ id: 'nope/none', mdx: '#### x' });
  const pub = await tools.publish_version.execute({ confirm: true });
  const disc = parse(await tools.discard_draft.execute({ id: sec.id }));
  return { updDiff: upd.diff, drafts: drafts.length, badIsError: bad.isError === true, badMsg: JSON.parse(bad.content[0].text).error, publishRefusedOffline: pub.isError === true, publishMsg: JSON.parse(pub.content[0].text).error, discarded: disc.discarded, names: Object.keys(tools).length };
}));
await step('discard drafts', () => page.evaluate(async () => {
  const r = window.__guidelineRegistry;
  for (const d of await r.call('list_drafts')) await r.call('discard_draft', { id: d.id });
  return (await r.call('list_drafts')).length;
}));

await browser.close();
console.log(JSON.stringify(results, null, 2));
if (errors.length) {
  console.error('CONSOLE ERRORS:\n' + errors.join('\n'));
  process.exitCode = 1;
}
console.log(process.exitCode ? 'SMOKE FAILED' : 'SMOKE OK');
