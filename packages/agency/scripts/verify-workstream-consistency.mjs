import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.BASE_URL||'http://127.0.0.1:4189';
const out=process.env.EVIDENCE_DIR||'/tmp/w4fjph-consistency';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const results=[];
try{
for(const route of (process.env.ROUTES?.split(',')||['/','/products','/contact?intent=membership']))for(const width of [1440,1024,768,390,320])for(const reducedMotion of ['reduce','no-preference']){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(new URL(route,base).href);await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);
 let selector;
 if(route==='/'){
  const meta=await page.locator('meta[name="description"]').getAttribute('content');assert.match(meta,/agreed workstream, between check-ins/);assert.match(meta,/Remote sessions available when useful/);
  const summary=page.locator('#work-library>summary');await summary.focus();await page.keyboard.press('Enter');await page.locator('.selected-work').waitFor();
  selector='.selected-work>.scope';assert.match(await page.locator(selector).innerText(),/one workstream with Focused, or up to two with Team/);
  assert.deepEqual(await page.locator('.cc-plan').evaluateAll(cards=>cards.map(c=>[...c.querySelectorAll('dd')].map(e=>e.textContent.replace(/\s/g,'')))),[['1','1','2×30min','2×60min','1'],['2','2','2×30min','4×60min','1']]);
 }else if(route==='/products'){
  selector='#capabilities>p';const copy=(await page.locator(selector).allInnerTexts()).join(' ');assert.match(copy,/agreed improvements between check-ins/);assert.match(copy,/onboarding, pairing or troubleshooting/);assert.match(copy,/two 60-minute remote sessions available; Team has four/);
 }else{
  selector='.inquiry-intro,.contact-option';const copy=(await page.locator(selector).allTextContents()).join(' ');assert.match(copy,/one agreed area of work/);assert.match(copy,/work between check-ins and show what changed/);assert.match(copy,/onboarding, pairing or troubleshooting/);
  const select=page.locator('#membership-plan');assert.equal(await select.getAttribute('aria-describedby'),'membership-plan-help');assert.equal(await select.inputValue(),'focused');
  assert.deepEqual(await select.locator('option').allTextContents(),['Focused · 1 workstream','Team · up to 2 workstreams']);
  await select.selectOption('team');assert.equal(await select.inputValue(),'team');await select.focus();await page.keyboard.press('Tab');assert.equal(await page.locator('#message').evaluate(e=>document.activeElement===e),true);
  const summary=page.locator('.path-choice>summary');await summary.focus();await page.keyboard.press('Enter');assert.ok(await summary.evaluate(e=>e.parentElement.open));
 }
 const geometry=()=>page.evaluate(selector=>{
  const roots=[...document.querySelectorAll(selector)];const set=new Set(roots.flatMap(e=>e.matches('p')?[e]:[...e.querySelectorAll('p,h1,h2,h3,label,select,textarea,input,summary')]));
  const nodes=[...set].filter(e=>e.checkVisibility()&&(!e.closest('details:not([open])')||e.tagName==='SUMMARY'));const collisions=[];
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){if(nodes[i].contains(nodes[j])||nodes[j].contains(nodes[i]))continue;const a=nodes[i].getBoundingClientRect(),b=nodes[j].getBoundingClientRect();if(a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1)collisions.push([nodes[i].textContent.slice(0,35),nodes[j].textContent.slice(0,35)])}
  return{overflow:document.documentElement.scrollWidth>innerWidth+1,collisions};
 },selector);
 const verify=async state=>{const g=await geometry();assert.equal(g.overflow,false,`${route} ${width} ${state}`);assert.deepEqual(g.collisions,[],`${route} ${width} ${state}`)};
 await verify('normal/expanded');
 if([1440,390].includes(width)&&reducedMotion==='reduce'){
  await page.evaluate(()=>{for(const e of document.querySelectorAll('body *'))if(getComputedStyle(e).position==='fixed')e.setAttribute('data-capture-fixed','true')});
  const shot=route==='/'?'.selected-work':route==='/products'?'#capabilities':'.contact-section';
  await page.locator(shot).screenshot({path:`${out}/${route==='/'?'library':route==='/products'?'products':'contact'}-${width}.png`,style:'[data-capture-fixed]{visibility:hidden!important}'});
 }
 await page.locator(selector).evaluateAll(roots=>{const nodes=[...new Set(roots.flatMap(e=>e.matches('p')?[e]:[...e.querySelectorAll('p,h1,h2,h3,label,select,textarea,input,summary,small,legend')]))];const sizes=nodes.map(e=>parseFloat(getComputedStyle(e).fontSize));nodes.forEach((e,i)=>{e.style.fontSize=`${sizes[i]*2}px`;e.style.lineHeight='1.5'})});
 await verify('doubled text');assert.deepEqual(errors,[]);results.push({route,width,reducedMotion,doubledText:true,keyboard:true,overflow:false,collisions:0,pageErrors:0});await page.close();
}
await writeFile(`${out}/results.json`,JSON.stringify({passed:true,states:results},null,2));console.log(JSON.stringify({passed:true,routeViewportMotionPairs:results.length}));
}finally{await browser.close()}
