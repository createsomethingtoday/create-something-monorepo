import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const root = new URL('../output/pilot-demo/',import.meta.url);
await mkdir(root,{recursive:true});
const browser=await chromium.launch(process.env.DRAW_CHROMIUM ? {executablePath:process.env.DRAW_CHROMIUM} : {channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,recordVideo:{dir:root.pathname,size:{width:1440,height:1000}}});
// Capture harness only: the app's registered tools execute normally. No model or external agent service is simulated.
await context.addInitScript(()=>{window.__tools={};Object.defineProperty(document,'modelContext',{configurable:true,value:{registerTool(t){window.__tools[t.name]=t;}}});});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const receipts=[];const beats=[];const started=Date.now();
const call=async(name,input={})=>{const result=await page.evaluate(({name,input})=>window.__tools[name].execute(input),{name,input});receipts.push({tool:name,input,result});return result;};
const beat=async(name,hold=2200)=>{await page.waitForTimeout(600);beats.push({name,seconds:(Date.now()-started)/1000});await page.screenshot({path:new URL(name+'.png',root).pathname});await page.waitForTimeout(hold);};
try{
 await page.goto(process.env.CANVAS_URL || 'http://127.0.0.1:5187',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Start sketching',exact:true}).click();
 await page.getByLabel('Canvas title').fill('Synthetic workflow · request to handoff');
 await page.getByLabel('Canvas title').press('Tab');
 await page.waitForFunction(()=>!!window.__tools.draw_compose);
 await beat('01-empty',1200);
 const map=await call('draw_compose',{layout:{direction:'row',gap:95},nodes:[
 {ref:'trigger',text:'01 · Request arrives\nA synthetic form starts the workflow.\nCapture scope and owner.',width:240,height:180},
 {ref:'review',text:'02 · Review request\nApprove every request automatically.\nOwner: technical lead.',width:240,height:180},
 {ref:'handoff',text:'03 · Handoff\nSend approved scope to delivery.\nKeep an editable map with the owner.',width:240,height:180}],edges:[{ref:'route1',from:'trigger',to:'review',label:'validate scope'},{ref:'route2',from:'review',to:'handoff',label:'approved'}],groups:[{ref:'workflow',label:'Synthetic automation workflow',members:['trigger','review','handoff']}]});
 const ids=map.refs;await page.getByRole('button',{name:'Fit drawing',exact:true}).click();await beat('02-map');
 await call('draw_select',{ids:[ids.review]});await page.getByRole('button',{name:'Edit & format',exact:true}).click();
 await page.getByLabel('Block 1 style',{exact:true}).selectOption('heading2');
 await page.getByLabel('Block 2 text',{exact:true}).fill('Route uncertain requests to human review.');
 await page.getByLabel('Block 3 style',{exact:true}).selectOption('bullet');
 const body=page.getByLabel('Block 2 text',{exact:true});await body.focus();await body.evaluate(el=>{const start=el.value.indexOf('human review');el.setSelectionRange(start,start+12);el.dispatchEvent(new Event('select'));});
 await page.getByRole('button',{name:'Bold',exact:true}).click();await expect(page.locator('.preview .bold')).toHaveText('human review');await beat('03-correction-editor',2200);
 await page.getByRole('button',{name:'Save note',exact:true}).click();
 await expect(page.locator(`[data-object-id="${ids.review}"] h2`)).toHaveText('02 · Review request');await beat('04-corrected');
 const before=await call('draw_inspect',{ids:[ids.handoff]});
 const change=await call('draw_patch_objects',{expectedRevision:before.revision,patches:[{id:ids.handoff,text:'03 · Handoff\nAgent draft: add an acceptance owner.\nReview this proposal before keeping it.'}]});
 expect(change.changeId).toBeTruthy();await beat('05-agent-draft',3200);
 const after=await call('draw_inspect',{ids:[ids.handoff]});expect(after.objects[0].text).toContain('Agent draft');
 await call('draw_revert_change',{changeId:change.changeId,expectedRevision:after.revision});await expect(page.locator(`[data-object-id="${ids.handoff}"]`)).toHaveAttribute('aria-label',/Send approved scope/);await beat('06-reverted',2600);
 await call('draw_select',{ids:[]});await page.getByRole('button',{name:'Fit drawing',exact:true}).click();
 await page.locator('.file-menu summary').click();
 const exports={};for(const ext of ['json','svg','png']){const pending=page.waitForEvent('download');await page.getByRole('button',{name:ext.toUpperCase(),exact:true}).click();const download=await pending;const path=new URL('workflow-handoff.'+ext,root).pathname;await download.saveAs(path);exports[ext]=path;}
 await beat('07-exported',2200);await page.locator('.file-menu summary').click();
 const saved=await call('draw_get_state');
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__tools.draw_get_state);
 const reopened=await call('draw_get_state');expect(reopened.document.objects).toEqual(saved.document.objects);await beat('08-saved-handoff',2600);
 const json=JSON.parse(await readFile(exports.json,'utf8'));expect(json.objects).toEqual(saved.document.objects);
 const svg=await readFile(exports.svg,'utf8');expect(svg).toContain('human review');expect(svg).toContain('font-weight="700"');expect(svg).not.toContain('Approve every request automatically');
 expect(errors).toEqual([]);
 await copyFile(new URL('08-saved-handoff.png',root),new URL('../static/images/draw/workflow-pilot.png',import.meta.url));
 await writeFile(new URL('receipts.json',root),JSON.stringify({synthetic:true,agentHarness:'Registration capture shim; real browser-local tool implementations, no LLM or phone/native mutation claim',beats,receipts,errors,exportsVerified:true,persistenceVerified:true},null,2));
 const video=page.video();await context.close();const src=await video.path();await copyFile(src,new URL('workflow-demo-original.webm',root));
 execFileSync('ffmpeg',['-y','-i',new URL('workflow-demo-original.webm',root).pathname,'-c:v','libx264','-preset','veryfast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart','-an',new URL('workflow-demo.mp4',root).pathname],{stdio:'ignore'});
 console.log(JSON.stringify({status:'passed',beats,output:root.pathname}));
}catch(e){await context.close();throw e;}finally{await browser.close();}
