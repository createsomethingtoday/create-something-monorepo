import {createServer} from '../apps/gigi-desktop/node_modules/vite/dist/node/index.js';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium}=createRequire(new URL('../packages/agency/package.json',import.meta.url))('@playwright/test');
const root=resolve(process.argv[2]||'apps/gigi-desktop');
const server=await createServer({root,configFile:resolve(root,'vite.config.mjs'),server:{port:0,host:'127.0.0.1'}});await server.listen();
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const page=await browser.newPage({viewport:{width:880,height:620},reducedMotion:'reduce'});
 const wav=readFileSync(resolve(root,'src-tauri/tests/fixtures/recovery-tone.wav')).toString('base64');
 await page.addInitScript(({wav})=>{
  globalThis.mediaEvents=[];
  for(const kind of ['loadedmetadata','canplay','play','ended']) document.addEventListener(kind,event=>{if(event.target.tagName==='AUDIO')mediaEvents.push(kind);},true);
  const original=Element.prototype.setAttribute;
  Element.prototype.setAttribute=function(name,value){return original.call(this,name,this.tagName==='AUDIO'&&name==='src'&&String(value).startsWith('gigi-media://')?'data:audio/wav;base64,'+wav:value);};
 },{wav});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?fixture=music&recovery=1`);await page.waitForFunction(()=>globalThis.gigiTest);
 await page.locator('[data-music-preview]').first().click();
 await page.waitForFunction(()=>mediaEvents.includes('ended'));
 const events=await page.evaluate(()=>mediaEvents);
 for(const event of ['loadedmetadata','canplay','play','ended'])assert.ok(events.includes(event),event);
 console.log(JSON.stringify({passed:true,events,limit:'Synthetic Chromium audio decode/playback through explicit data-WAV protocol shim. Native gigi-media handler, WebKit, device sound and aesthetic audio quality untested.'}));
}finally{await browser.close();await server.close();}
