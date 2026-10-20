import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const baseURL = process.env.AGENCY_PREVIEW_URL || 'http://127.0.0.1:4177';
const output = process.env.CONTINUITY_EVIDENCE_DIR || 'preview/support-example/evidence';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
const results = [], pageErrors = [];
try {
 for (const width of [1440,390,320]) {
  const context = await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto(baseURL,{waitUntil:'networkidle'});
  assert.equal(await page.locator('h1').innerText(),'AI-native\nTechnical support');
  assert.equal(await page.locator('.hero-actions .primary').getAttribute('href'),'/book?source=agency&intent=workflow-mapping&lane=workflow_infrastructure');
  const figure=page.locator('.service-journey > figure');await figure.scrollIntoViewIfNeeded();
  assert.match(await figure.innerText(),/Context stays with the work/);
  assert.equal(await figure.locator('button').count(),0);
  assert.equal(await figure.locator('.stage').count(),3);
  assert.equal(await figure.evaluate(el=>el.getAnimations({subtree:true}).length),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('.service-journey').screenshot({path:`${output}/continuity-${width}.png`, style: '.nav-fixed, .privacy-choice { display: none !important; }'});
  results.push({width,test:'static diagram, exact hero/CTA, no overflow, reduced motion',pass:true});await context.close();
 }
 {
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
  const page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto(baseURL,{waitUntil:'networkidle'});
  const figure=page.locator('.service-journey > figure');const button=figure.getByRole('button',{name:'Trace the connection'});
  await button.focus();assert.notEqual(await button.evaluate(el=>getComputedStyle(el).outlineStyle),'none');
  await page.keyboard.press('Enter');await figure.getByRole('button',{name:'Stop motion'}).waitFor();
  assert.ok(await figure.evaluate(el=>el.getAnimations({subtree:true}).some(a=>a.playState==='running')));
  await figure.screenshot({path:`${output}/continuity-motion.png`,animations:'allow'});
  await page.keyboard.press('Enter');await button.waitFor();
  assert.equal(await figure.evaluate(el=>el.getAnimations({subtree:true}).length),0);
  await button.click();await button.waitFor({timeout:6000});
  assert.equal(await figure.evaluate(el=>el.getAnimations({subtree:true}).length),0);
  await button.click();await page.emulateMedia({reducedMotion:'reduce'});await button.waitFor({state:'hidden'});
  await page.waitForFunction(() => document.querySelector('.service-journey > figure').getAnimations({subtree:true}).length === 0, null, {timeout:1000});
  assert.equal(await figure.evaluate(el=>el.getAnimations({subtree:true}).length),0);
  results.push({test:'keyboard start/stop, focus, automatic end, changed motion preference',pass:true});await context.close();
 }
 {
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const page=await context.newPage();await page.goto(baseURL,{waitUntil:'networkidle'});
  const figure=page.locator('.service-journey > figure');assert.equal(await figure.locator('.stage:visible').count(),3);
  assert.match(await figure.innerText(),/A starting point for the next agreed task/);assert.equal(await figure.locator('button').count(),0);
  await figure.screenshot({path:`${output}/continuity-no-js.png`});
  results.push({test:'complete no-JavaScript explanation',pass:true});await context.close();
 }
 assert.deepEqual(pageErrors,[]);
} finally {await writeFile(`${output}/results.json`,JSON.stringify({baseURL,results,pageErrors},null,2));await browser.close();}
console.log(JSON.stringify(results,null,2));
