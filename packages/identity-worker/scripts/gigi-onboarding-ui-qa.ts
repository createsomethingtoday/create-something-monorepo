// Synthetic browser acceptance: every request is intercepted; no email/account is created.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import worker from '../src/index.ts';
const root=new URL('../../../artifacts/gigi-onboarding/',import.meta.url).pathname;
await mkdir(root,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const results=[];
try {
 for(const width of [1440,390]) {
  const page=await browser.newPage(); await page.setViewport({width,height:1000});
  let outcome=200;const bodies=[];const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.setRequestInterception(true);
  page.on('request',async req=>{
   if(req.method()==='GET'){
    const r=await worker.fetch(new Request(req.url()),{GIGI_ENROLLMENT_ENABLED:'true'} as any);
    await req.respond({status:r.status,body:await r.text(),headers:Object.fromEntries(r.headers)}).catch(()=>{});
   } else {bodies.push(JSON.parse(req.postData()||'{}'));await req.respond({status:outcome,contentType:'application/json',body:JSON.stringify(outcome===200?{success:true}:{error:'synthetic_failure'})});}
  });
  await page.goto('https://id.createsomething.space/signup?app=gigi');
  assert.equal(await page.$eval('h1',e=>e.textContent),'Create your GiGi account.');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.keyboard.press('Tab'); assert.ok(await page.evaluate(()=>document.activeElement?.tagName==='A'));
  await page.screenshot({path:root+`signup-${width}.png`,fullPage:true});
  await page.type('input[name=email]','synthetic@example.test');outcome=429;await page.click('button');
  await page.waitForFunction(()=>document.querySelector('[role=alert]')?.textContent?.includes('Too many'));
  assert.equal(await page.$eval('button',e=>e.disabled),false);
  outcome=200;await page.click('button');await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent?.includes('verification link'));
  assert.deepEqual(bodies.at(-1),{email:'synthetic@example.test',purpose:'signup',experience:'identity',app:'gigi'});
  await page.screenshot({path:root+`email-sent-${width}.png`,fullPage:true});
  await page.goto('https://id.createsomething.space/verify?mode=signup&app=gigi#token='+ 'a'.repeat(43));
  assert.equal(await page.evaluate(()=>location.hash),'');
  await page.type('input[name=password]','Synthetic-password-123');await page.type('input[name=confirmation]','Synthetic-password-123');
  outcome=400;await page.click('button');await page.waitForFunction(()=>document.querySelector('[role=alert]')?.textContent?.includes('expired'));
  await page.screenshot({path:root+`expired-${width}.png`,fullPage:true});
  assert.equal(await page.$eval('input[name=password]',e=>e.value),'');
  await page.type('input[name=password]','Synthetic-password-123');await page.type('input[name=confirmation]','Synthetic-password-123');
  outcome=200;await page.click('button');await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent?.includes('GiGi account is ready'));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  await page.screenshot({path:root+`complete-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);results.push({width,signup:true,rateLimit:true,expiredProof:true,complete:true,noOverflow:true,noStorage:true});await page.close();
 }
 await writeFile(root+'ui-qa.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally {await browser.close();}
