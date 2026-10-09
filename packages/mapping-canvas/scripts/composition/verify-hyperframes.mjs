import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
const base = process.env.DRAW_COMPOSITION_URL || 'http://127.0.0.1:51959';
const out = '../../output/integration/hyperframes';
await mkdir(out, {recursive:true});
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const result = {completed:false, assertions:[], errors:[], exports:[]};
try {
 const ctx = await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
 await ctx.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
 const p = await ctx.newPage();
 p.on('pageerror',e=>result.errors.push(e.message));
 await p.goto(`${base}/compose`);
 await p.locator('.preview-form').getByLabel('Your name').fill('PRIVATE SENTINEL NOT FOR EXPORT');
 await p.getByRole('button',{name:'Motion',exact:true}).click();
 for (const id of ['context','detail']) {
  const pending = p.waitForEvent('download',{timeout:15000});
  await p.getByRole('button',{name:`Export ${id === 'context' ? 'Context' : 'Detail'} ZIP`,exact:true}).click();
  const download = await pending;
  const bundle = await readFile(await download.path());
  const files = unzipSync(bundle);
  assert.deepEqual(Object.keys(files).sort(), ['README.txt','assets/gsap.min.js','draw-handoff.json','hyperframes.json','index.html']);
  const html = strFromU8(files['index.html']);
  assert.ok(!html.includes('PRIVATE SENTINEL'));
  assert.ok(html.includes('Alex Morgan'));
  await mkdir(`${out}/${id}`,{recursive:true});
  await mkdir(`${out}/${id}/assets`,{recursive:true});
  for (const [name, content] of Object.entries(files)) await writeFile(`${out}/${id}/${name}`, content);
  await writeFile(`${out}/draw-${id}-hyperframes.zip`,bundle);
  const frame = await ctx.newPage();
  await frame.setViewportSize({width:1200,height:900});
  await frame.route(`${base}/__export/${id}/**`, async route => {
   const name = new URL(route.request().url()).pathname.split(`/__export/${id}/`)[1];
   const file = files[name];
   if (!file) return route.abort();
   await route.fulfill({status:200,body:Buffer.from(file),contentType:name.endsWith('.js') ? 'text/javascript' : 'text/html'});
  });
  await frame.goto(`${base}/__export/${id}/index.html`);
  assert.equal(await frame.evaluate(id=>window.__timelines[`draw-${id}`].duration(),id),18);
  for (const t of [0,4.1,8.1,13.1,8.1,4.1,0]) {
   const expected=t>=13?3:t>=8?2:t>=4?1:0;
   const visible=await frame.evaluate(({id,t})=>{window.__timelines[`draw-${id}`].seek(t);return [...document.querySelectorAll('.snapshot')].filter(el=>getComputedStyle(el).display!=='none').map(el=>el.id);},{id,t});
   assert.deepEqual(visible,[`frame-${expected}`]);
   assert.equal(await frame.locator(`#frame-${expected} form`).getAttribute('inert'),'');
   assert.equal(await frame.locator('form:visible').count(),1);
   assert.equal(await frame.locator('form:visible').getAttribute('data-state'), (id === 'context' ? ['recovered','empty','error','recovered'] : ['recovered','invalid','error','recovered'])[expected]);
   const caption = await frame.evaluate(({id,expected}) => JSON.parse(document.getElementById('draw-handoff').textContent).sequence.beats[expected].caption, {id,expected});
   assert.equal(await frame.locator('.caption:visible p').innerText(), caption);
   await frame.screenshot({path:`${out}/${id}/seek-${t}.png`});
  }
  result.exports.push({id,bytes:Buffer.byteLength(html),duration:18});
  result.assertions.push(`${id}: actual Canon scripted export, no live entries, forward/reverse seeks, inert form`);
  await frame.close();
 }
 assert.deepEqual(result.errors,[]);
 result.completed=true;
 await ctx.close();
} finally {
 await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));
 await browser.close();
}
console.log(JSON.stringify(result,null,2));
