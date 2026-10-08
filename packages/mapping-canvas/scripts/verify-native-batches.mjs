import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import assert from 'node:assert/strict';
import '../offline-agent/server.mjs';
const { createDocument } = await import('../src/lib/document.ts');
const { applyCanvasOperations } = await import('../src/lib/paired-session.ts');
const root=resolve(new URL('../build/',import.meta.url).pathname);
const output=resolve(new URL('../../../offline-preview/',import.meta.url).pathname);
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!path.startsWith(root+'/')&&path!==root){res.writeHead(403).end();return;}
  const file=path===root?resolve(root,'index.html'):path;
  try{const bytes=await readFile(file);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.html':'text/html','.json':'application/json'})[extname(file)]||'application/octet-stream');res.end(bytes);}
  catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.DRAW_CHROMIUM_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
let document=createDocument('Synthetic native authority'),revision=0;
const calls=[],errors=[];let failNext=false,delay=0;
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
 await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 await context.exposeFunction('fixtureInvoke',async(command,args={})=>{
   calls.push({command,args:structuredClone(args)});
   if(command==='draw_runtime_role')return 'host';
   if(command==='draw_host_status')return {sessionId:'synthetic-native',revision,document:structuredClone(document),transport:null};
   if(command==='draw_host_apply_batch'){
     if(delay)await new Promise(r=>setTimeout(r,delay));
     if(failNext){failNext=false;document={...document,title:'Concurrent authority'};revision++;throw new Error('HOST_REVISION_CONFLICT');}
     assert.equal(args.request.expectedRevision,revision);
     assert.equal(args.request.documentId,document.id);
     const before=structuredClone(document),next=applyCanvasOperations(document,args.request.operations);
     if(!next)throw new Error('Invalid batch');
     document=next;revision++;
     return {status:'applied',revision,document:structuredClone(document),previousDocument:before};
   }
   if(command==='draw_host_replace_document'){
     assert.equal(args.expectedRevision,revision);document=structuredClone(args.document);revision++;
     return {status:'applied',revision,document:structuredClone(document)};
   }
   throw new Error(`Unexpected native command: ${command}`);
 });
 await context.addInitScript(()=>{window.__TAURI_INTERNALS__={invoke:(command,args)=>window.fixtureInvoke(command,args)};});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.getByText('Mac session ready · LAN pairing disabled').waitFor();
 const title=page.getByLabel('Canvas title');
 delay=150;await title.fill('First queued edit');await title.fill('Second queued edit');
 await page.waitForFunction(()=>document.querySelector('[aria-label="Canvas title"]').value==='Second queued edit');
 await new Promise(r=>setTimeout(r,450));delay=0;
 assert.equal(document.title,'Second queued edit');
 assert.deepEqual(calls.filter(c=>c.command==='draw_host_apply_batch').map(c=>c.args.request.expectedRevision),[0,1]);
 await title.evaluate(n=>n.blur());
 const surface=page.locator('svg[aria-label="Canvas objects"]'),box=await surface.boundingBox();
 await page.getByRole('button',{name:/Note tool/}).click();await page.mouse.click(box.x+320,box.y+220);
 await page.waitForFunction(()=>document.querySelectorAll('[aria-label="Edit note"]').length===1);
 await new Promise(r=>setTimeout(r,100));assert.equal(document.objects.length,1);
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await new Promise(r=>setTimeout(r,150));assert.equal(document.objects.length,0);
 await page.getByRole('button',{name:'Redo',exact:true}).click();
 await new Promise(r=>setTimeout(r,150));assert.equal(document.objects.length,1);
 failNext=true;delay=100;
 await title.fill('Rejected edit');await title.fill('Dependent rejected edit');
 await new Promise(r=>setTimeout(r,350));
 assert.equal(document.title,'Concurrent authority');assert.equal(await title.inputValue(),'Concurrent authority');
 assert.equal(await page.getByRole('button',{name:'Undo',exact:true}).isDisabled(),true);
 assert(!calls.some(c=>c.command==='draw_host_apply_local'));
 assert.deepEqual(errors,[]);
 await page.screenshot({path:resolve(output,'native-batch-ui.png'),fullPage:true});
 await writeFile(resolve(output,'native-batch-ui.json'),JSON.stringify({synthetic:true,transport:'mocked Tauri IPC, actual bundled Canvas UI and TypeScript operations',passed:true,revision,checks:['queued CAS revisions','native batch route','undo/redo','conflict drops dependent edits','undo invalidated after conflict','LAN-disabled status'],calls: calls.map(c=>({command:c.command,expectedRevision:c.args.request?.expectedRevision}))},null,2));
 console.log('Native batch UI acceptance passed (mocked IPC).');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
