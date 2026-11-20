import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base=process.env.AGENCY_BASE_URL??'http://127.0.0.1:4297';
const evidence=process.env.AGENCY_EVIDENCE_DIR??'/tmp/agency-webflow-review';
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
await mkdir(evidence,{recursive:true});
const report=[];const route='/case-studies/webflow-marketplace';
async function ready(video){await video.evaluate(async v=>{v.load();if(v.readyState<1)await new Promise((resolve,reject)=>{v.addEventListener('loadedmetadata',resolve,{once:true});v.addEventListener('error',()=>reject(new Error('Media unavailable')),{once:true});});});}
try{
 for(const width of [320,390,768,1024,1440]){
  console.log('Checking width',width);
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/#workflow');
  await page.locator('[data-work-chapter]').last().waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('[data-work-chapter]').disabled);
  assert.match(await page.locator('#workflow').innerText(),/Webflow did not commission/);
  assert.doesNotMatch(await page.locator('#workflow').innerText(),/Maverick/);
  const button=page.locator('[data-work-chapter]').last();await button.click();
  const dialog=page.locator('#work-dialog');await page.waitForFunction(()=>document.querySelector('#work-dialog video').currentTime>=151.12);
  await dialog.locator('video').evaluate(v=>v.pause());assert.equal(await dialog.evaluate(d=>d.open),true);
  assert.equal(await dialog.locator('video').evaluate(v=>Math.abs(v.duration-168.266667)<.02),true);
  assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
  const box=await dialog.locator('video').boundingBox();assert.ok(box.width<=width+1&&box.height<900);
  await page.keyboard.press('Escape');assert.equal(await dialog.evaluate(d=>d.open),false);
  assert.equal(await dialog.locator('video').evaluate(v=>v.paused),true);
  assert.equal(await button.evaluate(b=>b===document.activeElement),true);
  assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');
  await page.locator('[data-home-open="work-dialog"]').click();await page.waitForFunction(()=>document.querySelector('#work-dialog video').currentTime<2);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if([390,1440].includes(width))await page.locator('#workflow').screenshot({path:`${evidence}/home-${width}.png`});
  await page.goto(base+route);assert.equal(await page.locator('.study-row').count(),8);
  await page.waitForFunction(()=>!document.querySelector('.chapters button').disabled);
  const video=page.locator('.walkthrough video');await ready(video);
  for(let i=0;i<5;i++){await page.locator('.chapters button').nth(i).click();await page.waitForFunction(i=>document.querySelectorAll('.chapters button')[i].getAttribute('aria-current')==='step',i);}
  await video.evaluate(async v=>{v.currentTime=v.duration-.15;await v.play();});await page.waitForFunction(()=>document.querySelector('.walkthrough video').ended);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if([390,1440].includes(width))await page.screenshot({path:`${evidence}/study-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);report.push({width,homepage:'passed',chapters:'5 passed',ending:'passed'});await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto(base+route);
 const urls=await page.locator('.study-row').evaluateAll(as=>as.map(a=>a.getAttribute('href')));
 for(const url of urls){const response=await page.goto(base+url);assert.equal(response.status(),200);assert.ok(await page.locator('h1').innerText());assert.match(await page.locator('.attribution').innerText(),/did not commission/);const videos=page.locator('.walkthrough video');for(let i=0;i<await videos.count();i++){await ready(videos.nth(i));assert.ok(await videos.nth(i).evaluate(v=>v.duration>0));}report.push({route:url,videos:await videos.count(),passed:true});}
 await page.goto(base+urls[0]);await ready(page.locator('.walkthrough video'));await page.getByRole('link',{name:/Next:/}).click();await page.waitForURL(base+urls[1]);await page.waitForFunction(()=>document.querySelector('.walkthrough source').src.endsWith('/validator.mp4'));await ready(page.locator('.walkthrough video'));assert.match(await page.locator('.walkthrough video').evaluate(v=>v.currentSrc),/validator.mp4$/);
 assert.equal((await page.goto(base+route+'/unknown')).status(),404);await page.close();
 const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto(base);assert.ok(await nojs.locator(`a[href="${route}"]`).count());assert.ok(await nojs.locator('noscript a[href*="overview.mp4"]').count());await nojs.goto(base+route);assert.equal(await nojs.locator('.study-row').count(),8);await nojs.close();
 const denied=await browser.newPage();await denied.addInitScript(()=>{HTMLMediaElement.prototype.play=()=>Promise.reject(new DOMException('Denied','NotAllowedError'));});await denied.goto(base);await denied.waitForFunction(()=>!document.querySelector('[data-home-open]').disabled);await denied.locator('[data-home-open="work-dialog"]').click();assert.equal(await denied.locator('#work-dialog').evaluate(d=>d.open),true);assert.equal(await denied.locator('#work-dialog video').getAttribute('controls'),'');await denied.keyboard.press('Escape');await denied.close();
 await writeFile(`${evidence}/checks.json`,JSON.stringify({report,noJavaScript:'passed',deniedPlayback:'native controls preserved'},null,2));console.log('Webflow feature checks passed: five widths, five stages, eight studies, media, keyboard, no-JS, denied playback.');
}finally{await browser.close();}
