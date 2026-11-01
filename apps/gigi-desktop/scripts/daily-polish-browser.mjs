// Offline synthetic profile. Serve owned app files through interception only;
// every native operation is denied. No installed app, user DB or provider opens.
import { createRequire } from 'node:module';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(new URL('../../../packages/agency/package.json', import.meta.url))('@playwright/test');
const web = resolve(new URL('../web/', import.meta.url).pathname);
const out = resolve(process.env.GIGI_POLISH_EVIDENCE || new URL('../evidence/daily-polish-0217/', import.meta.url).pathname);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
 const page = await browser.newPage({ viewport: { width: 880, height: 620 }, reducedMotion: 'reduce' });
 await page.addInitScript(() => { globalThis.__TAURI__ = { core: { invoke: async (_, req) => { throw Error(`Denied synthetic operation: ${req.operation}`); } } }; });
 await page.route('**/*', async route => {
  const url = new URL(route.request().url()); if (url.origin !== 'http://gigi.test') return route.abort();
  const path = resolve(web, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (!path.startsWith(web + '/') || !existsSync(path)) return route.fulfill({ status: 404, body: '' });
  let body = readFileSync(path);
  if (path.endsWith('/app.mjs')) {
   body = Buffer.from(body.toString().slice(0, body.toString().lastIndexOf('load().catch')) + `
   globalThis.polishFixture = (page = 'overview', theme = 'studio', empty = false) => {
    state.workspace = { id:'synthetic-daily-polish', name:'Rehearsal workspace' }; state.currency = 'USD'; state.currencyKnown = true; state.page = page; state.selected = null; state.editing = false;
    preferences = {...defaults, theme}; applyPreferences(preferences);
    const record=(id, title, entity='gigs')=>({id, title, entity, date:'2026-11-02', status:'in_progress', fields:{Status:'in_progress'}});
    state.overview = {counts:empty?{}:{gigs:8,tasks:6,finances:2,contacts:12}, events:{items:empty?[]:[record('gig-1','Soundcheck and rehearsal · autumn showcase'),record('gig-2','Late set at the studio')],count:empty?0:8},tasks:{items:empty?[]:[record('task-1','Confirm the revised rehearsal time','tasks'),record('task-2','Send the stage plan to the crew','tasks')],count:empty?0:6},finances:{items:[],count:0}};
    state.records = []; state.recordCount = 0;
    attention = {items:empty?[]:[{id:'attention-1',recordId:'task-1',entity:'tasks',kind:'task_due',unread:true,title:'Confirm the revised rehearsal time',body:'Due today. Review the task and decide what happens next.'},{id:'attention-2',sessionId:'session-1',kind:'approval',unread:true,title:'Review the rehearsal checklist',body:'GiGi prepared a change. Nothing changes until you approve.'}],unreadCount:2};
    render();
   };
   globalThis.polishNotice = notice;
   globalThis.polishAttentionError = () => {attention.error="Synthetic read unavailable. Try Check again.";render();};
   `);
  }
  await route.fulfill({ body, contentType: path.endsWith('.mjs') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html' });
 });
 await page.goto('http://gigi.test/'); await page.waitForFunction(() => globalThis.polishFixture);
 await page.evaluate(() => polishFixture());
 await page.screenshot({ path: resolve(out, process.env.BASELINE ? 'baseline-studio-880.png' : 'studio-880.png'), fullPage: true });
 if (!process.env.BASELINE) {
  const metrics=[];
  for (const width of [880,1280]) for (const theme of ['studio','paper','midnight']) {
   await page.setViewportSize({width,height:width===880?620:840});
   await page.evaluate(theme=>polishFixture('overview',theme),theme);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${theme} ${width}: no horizontal overflow`);
   const cards=page.locator('.today-grid').first().locator('.today-card');
   assert.equal((await cards.nth(0).boundingBox()).y,(await cards.nth(1).boundingBox()).y,'two cards fit minimum window');
   const height=await page.locator('.attention-panel').evaluate(e=>e.getBoundingClientRect().height);
   metrics.push({theme,width,attentionHeight:height});
   await page.screenshot({path:resolve(out,`${theme}-${width}.png`),fullPage:true});
   await page.evaluate(()=>document.documentElement.dataset.density='compact');
   assert.ok(await page.locator('.attention-panel').evaluate(e=>e.getBoundingClientRect().height)<height,'compact spacing reduces attention height');
   await page.screenshot({path:resolve(out,`${theme}-${width}-compact.png`),fullPage:true});
   await page.evaluate(()=>document.documentElement.dataset.density='comfortable');
  }
  await page.setViewportSize({width:880,height:620});
  await page.evaluate(()=>polishFixture('overview','paper',true));
  await page.screenshot({path:resolve(out,'empty-paper-880.png'),fullPage:true});
  await page.evaluate(()=>{polishFixture('overview','midnight',true);polishAttentionError();});
  assert.equal(await page.getByText('You’re caught up.',{exact:false}).count(),0);
  await page.screenshot({path:resolve(out,'attention-error-midnight-880.png'),fullPage:true});
  await page.evaluate(()=>polishFixture('overview','midnight',true));
  await page.locator('[data-nav-overflow]').focus();await page.keyboard.press('ArrowDown');
  assert.equal(await page.locator('.reference-more').evaluate(e=>e.open),true);
  assert.equal(await page.locator('.reference-menu [data-page]').first().evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('End');await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-nav-overflow]').evaluate(e=>e===document.activeElement),true);
  await page.locator('[data-new="tasks"]').first().focus();await page.keyboard.press('Enter');
  await page.locator('#title').fill('Keep this synthetic daily task');
  assert.equal(await page.locator('#title').evaluate(e=>e===document.activeElement),true);
  await page.locator('.reference-nav [data-page="contacts"]').click();
  await page.getByRole('alertdialog').waitFor();await page.keyboard.press('Escape');
  assert.equal(await page.locator('#title').inputValue(),'Keep this synthetic daily task');
  await page.clock.install();
  await page.evaluate(()=>polishNotice('Synthetic save failed. Your unsaved task is still here. Review it and try again.',true));
  await page.clock.fastForward(6000);
  assert.equal(await page.locator('.toast[role="alert"]').count(),1);
  assert.equal(await page.locator('#title').inputValue(),'Keep this synthetic daily task');
  await page.screenshot({path:resolve(out,'error-draft-midnight-880.png'),fullPage:true});
  await page.getByRole('button',{name:'Dismiss message'}).focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('.toast').count(),0);
  assert.equal(await page.locator('#title').evaluate(e=>e===document.activeElement),true);
  await page.evaluate(()=>polishNotice('Synthetic preferences saved.'));
  await page.getByRole('button',{name:'Dismiss message'}).focus();await page.clock.fastForward(6000);
  assert.equal(await page.locator('.toast').count(),1,'timer never removes a focused message');
  await page.locator('#title').focus();
  await page.clock.fastForward(5000);
  assert.equal(await page.locator('.toast').count(),0,'success expiry resumes after keyboard focus leaves');
  await page.evaluate(()=>polishFixture('appearance','paper'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Appearance header fits minimum window');
  await page.screenshot({path:resolve(out,'appearance-paper-880.png'),fullPage:true});
  console.log('PASS: actual app/CSS in isolated Chromium fixture; 3 themes × 2 widths × 2 densities; empty/error; New task keyboard/draft protection; persistent alert and dismiss focus; More arrow/Escape.');
  console.log(JSON.stringify(metrics));
 }

} finally { await browser.close(); }
