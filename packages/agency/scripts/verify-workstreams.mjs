import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const url = process.env.PREVIEW_URL || 'http://127.0.0.1:4185';
const out = process.env.EVIDENCE_DIR || '/tmp/w4fjph-evidence';
await mkdir(out,{recursive:true});
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const results=[];
try {
for(const width of [1440,1024,768,390,320]) {
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
  await page.goto(url); await page.waitForLoadState('networkidle'); await page.locator('#ws-title').waitFor(); await page.evaluate(()=>document.fonts.ready); await page.addStyleTag({content:'[aria-label="Primary"],.privacy-choice{visibility:hidden!important}'});
  await page.locator('#work-library > summary').focus(); await page.keyboard.press('Enter');
  await page.locator('#engineering-work').waitFor();
  const check=async()=>page.evaluate(()=>{
    const rect=s=>document.querySelector(s).getBoundingClientRect();
    const header=rect('#engineering-work > header'),title=rect('#built-work-title'),intro=rect('#engineering-work .intro'),row=rect('#engineering-work .work-index>li');
    const intersect=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
    const story=document.querySelector('#workstreams');
    const leaves=[...story.querySelectorAll('p,h3,h4,dt,dd,figcaption')].map(e=>({tag:e.tagName,text:e.textContent.slice(0,30),r:e.getBoundingClientRect()}));
    const collisions=[];
    for(let i=0;i<leaves.length;i++)for(let j=i+1;j<leaves.length;j++)if(intersect(leaves[i].r,leaves[j].r))collisions.push([leaves[i].text,leaves[j].text]);
    return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,headerContainsTitle:title.bottom<=header.bottom+1,headerContainsIntro:intro.bottom<=header.bottom+1,headingIntroOverlap:intersect(title,intro),headerRowOverlap:intersect(header,row),storyCollisions:collisions,headerDisplay:getComputedStyle(document.querySelector('#engineering-work > header')).display};
  });
  let r=await check(); results.push({mode:'normal',...r});
  assert.equal(r.overflow,false,`page overflow ${width}`);assert.equal(r.headingIntroOverlap,false);assert.equal(r.headerRowOverlap,false);assert.ok(r.headerContainsTitle&&r.headerContainsIntro);assert.deepEqual(r.storyCollisions,[]);
  if(width===1440){
    await page.locator('#engineering-work').screenshot({style:'[aria-label="Primary"],.privacy-choice{opacity:0!important;visibility:hidden!important}',path:`${out}/library-after.png`});
    const oldCss=execFileSync('git',['show','HEAD:packages/agency/static/styles/agency/home.css'],{encoding:'utf8'});
    const old=await page.addStyleTag({content:oldCss});
    const before=await check();assert.equal(before.headerContainsTitle,false,'reproduce original fixed-header overflow');results.push({mode:'before',...before});
    await page.locator('#engineering-work').screenshot({style:'[aria-label="Primary"],.privacy-choice{opacity:0!important;visibility:hidden!important}',path:`${out}/library-before.png`});await old.evaluate(e=>e.remove());
    await page.locator('#workstreams').screenshot({style:'[aria-label="Primary"],.privacy-choice{opacity:0!important;visibility:hidden!important}',path:`${out}/story-desktop.png`});
  }
  if(width===390)await page.locator('#workstreams').screenshot({style:'[aria-label="Primary"],.privacy-choice{opacity:0!important;visibility:hidden!important}',path:`${out}/story-mobile.png`});
  // Text enlargement and longer content exercise the public layout, not implementation selectors alone.
  await page.addStyleTag({content:'.agency-home{font-size:200%}.ws-story p,.ws-story h3,.ws-story h4,.built-work p,.built-work h2{font-size:200%!important;line-height:1.5!important}'});
  await page.locator('#built-work-title').evaluate(e=>e.append(' More tools, longer customer descriptions and a useful handoff.'));
  r=await check();results.push({mode:'200-percent-text-long-title',...r}); if(r.overflow)console.log(JSON.stringify({width,overflowElements:await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflowX==='visible').map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,scroll:e.scrollWidth,client:e.clientWidth})).slice(0,20))}));
  assert.equal(r.overflow,false);assert.equal(r.headingIntroOverlap,false);assert.equal(r.headerRowOverlap,false);assert.ok(r.headerContainsTitle&&r.headerContainsIntro);assert.deepEqual(r.storyCollisions,[]);
  await page.locator('#work-library > summary').focus();await page.keyboard.press('Enter');await page.locator('#engineering-work').waitFor({state:'detached'});
  await page.close();
}
await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify({passed:true,checks:results.length,evidence:out}));
} finally {await browser.close();}
