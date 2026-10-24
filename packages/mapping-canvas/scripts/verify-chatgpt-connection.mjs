// Actual Svelte app, synthetic native connection. Never calls OAuth/Keychain/model APIs.
import {chromium, expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const output=new URL('../output/chatgpt-connection/',import.meta.url);await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome'});
const checks=[];
async function pageFor(role='host',width=1440){
 const context=await browser.newContext({viewport:{width,height:920}});
 await context.addInitScript(({role})=>{
  const clone=x=>JSON.parse(JSON.stringify(x));
  const doc={version:'create-something.mapping-canvas.v1',id:'chatgpt-synthetic',title:'SYNTHETIC — connection isolation',createdAt:'2026-10-24T00:00:00Z',updatedAt:'2026-10-24T00:00:00Z',background:'#000000',viewport:{x:0,y:0,zoom:1},objects:[{kind:'note',id:'protected-note',text:'Never automatically send this canvas text.',x:100,y:100,width:300,height:150,createdAt:'2026-10-24T00:00:00Z'}]};
  const t=window.__chatGPTTest={document:doc,calls:[],status:{available:true,busy:false,accounts:[],activeClientId:null,pendingClientIds:['incomplete']},mode:'normal',pending:null};
  window.__TAURI_INTERNALS__={invoke:async(command,args={})=>{
   t.calls.push({command,args:clone(args)});
   if(command==='draw_runtime_role')return role;
   if(command==='draw_host_status')return{document:clone(doc),sessionId:'synthetic-session',revision:0,pairedClients:[],history:{canUndo:false,canRedo:false,depth:0}};
   if(command==='draw_companion_status')return{status:'unpaired'};
   if(command==='draw_agent_status')return{active:false};
   if(command==='draw_chatgpt_open_usage')return;
   if(command==='draw_chatgpt_status')return clone(t.status);
   if(command==='draw_chatgpt_connect'){
    t.status.busy=true;
    if(t.mode==='delayed-connect')return new Promise(resolve=>{t.pending=()=>resolve({available:true,busy:false,activeClientId:'late',pendingClientIds:[],accounts:[{clientId:'late',subject:'late',connected:true,planEnabled:true}]});});
    t.status={available:true,busy:false,activeClientId:'ready',pendingClientIds:[],accounts:[{clientId:'identity',subject:'identity',email:'same@example.test',connected:true,planEnabled:false},{clientId:'ready',subject:'ready',email:'same@example.test',connected:true,planEnabled:true}]};return clone(t.status);
   }
   if(command==='draw_chatgpt_cancel'){t.status.busy=false;return;}
   if(command==='draw_chatgpt_select'){t.status.activeClientId=args.clientId;return clone(t.status);}
   if(command==='draw_chatgpt_models')return[{slug:'available-model',displayName:'Available model'}];
   if(command==='draw_chatgpt_respond'){
    if(t.mode==='limit')throw 'usage_limit_reached';
    if(t.mode==='expired'){const account=t.status.accounts.find(x=>x.clientId===t.status.activeClientId);account.connected=false;account.planEnabled=false;throw 'sign_in_required';}
    if(t.mode==='delayed-response')return new Promise(resolve=>{t.pending=()=>resolve('Late response must be ignored.');});
    return 'Synthetic text-only response.';
   }
   if(command==='draw_chatgpt_disconnect'){t.status.accounts.find(x=>x.clientId===args.clientId).connected=false;t.status.error='revocation_unconfirmed';return clone(t.status);}
   throw new Error('Unexpected synthetic command: '+command);
  }};
 },{role});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.CANVAS_URL || 'http://127.0.0.1:5288');
 await expect(page.getByText(role==='host'?'MAC AUTHORITY':role==='companion'?'IPHONE COMPANION':'LOCAL CANVAS',{exact:true})).toBeAttached();
 return{context,page,errors};
}
try{
 const{page,context,errors}=await pageFor();
 const before=await page.evaluate(()=>structuredClone(window.__chatGPTTest.document));
 await page.getByRole('button',{name:'ChatGPT',exact:true}).click();
 const panel=page.getByRole('dialog',{name:'ChatGPT connection'});
 await expect(panel).toBeVisible();await expect(panel.getByRole('heading',{name:'ChatGPT connection',exact:true})).toBeFocused();checks.push('Optional panel opens with accessible focus; offline canvas remains intact');
 await expect(panel.getByRole('button',{name:'Retry incomplete connection',exact:true})).toBeVisible();
 await page.evaluate(()=>window.__chatGPTTest.mode='delayed-connect');
 await panel.getByRole('button',{name:'Retry incomplete connection',exact:true}).click();await expect(panel.getByRole('button',{name:'Cancel sign-in'})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__chatGPTTest.calls.filter(x=>x.command==='draw_chatgpt_connect').at(-1).args.selectedClientId)).toBe('incomplete');
 await panel.getByRole('button',{name:'Cancel sign-in'}).click();await page.evaluate(()=>window.__chatGPTTest.pending());
 await expect(panel.getByText('Identity connected',{exact:false})).toHaveCount(0);checks.push('Explicit pending-registration retry; cancelled late OAuth result cannot activate account');
 await page.evaluate(()=>window.__chatGPTTest.mode='normal');await panel.getByRole('button',{name:'Add ChatGPT account',exact:true}).click();
 await expect(panel.getByText('Identity connected · ChatGPT plan usage enabled',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.__chatGPTTest.calls.filter(x=>x.command==='draw_chatgpt_models'||x.command==='draw_chatgpt_respond').length)).toBe(0);checks.push('Sign-in alone sends no prompt, canvas, or model request');
 await panel.getByRole('button',{name:'Load available models'}).click();await expect(panel.getByLabel('ChatGPT model')).toHaveValue('available-model');
 await panel.getByLabel('Text to send to ChatGPT').fill('Only the explicitly typed synthetic question.');
 await panel.getByRole('button',{name:'Send text to ChatGPT'}).click();await expect(panel.getByRole('article',{name:'ChatGPT response'})).toContainText('Synthetic text-only response.');
 expect(await page.evaluate(()=>window.__chatGPTTest.calls.filter(x=>x.command==='draw_chatgpt_respond').at(-1).args)).toEqual({model:'available-model',input:'Only the explicitly typed synthetic question.'});checks.push('Account-discovered model and explicit typed text only sent; response cannot mutate canvas');await panel.getByRole('article',{name:'ChatGPT response'}).scrollIntoViewIfNeeded();await expect(panel.getByRole('button',{name:'Close ChatGPT connection'})).toBeVisible();await page.screenshot({path:new URL('desktop-response.png',output).pathname});
 await panel.getByLabel('Saved ChatGPT account').selectOption('identity');await expect(panel.getByRole('button',{name:'Enable ChatGPT plan usage'})).toBeVisible();await expect(panel.getByLabel('ChatGPT model')).toHaveCount(0);await expect(panel.getByRole('article',{name:'ChatGPT response'})).toHaveCount(0);checks.push('Identity-only registration cannot borrow plan scope from same-email account; switch clears model/result');
 await panel.getByLabel('Saved ChatGPT account').selectOption('ready');await panel.getByRole('button',{name:'Load available models'}).click();await page.evaluate(()=>window.__chatGPTTest.mode='limit');await panel.getByRole('button',{name:'Send text to ChatGPT'}).click();await expect(panel.getByRole('alert')).toContainText('No other billing method');await expect(panel.getByLabel('Text to send to ChatGPT')).toHaveValue('Only the explicitly typed synthetic question.');await panel.getByRole('alert').getByRole('button',{name:'Manage usage',exact:true}).click();expect(await page.evaluate(()=>window.__chatGPTTest.calls.filter(x=>x.command==='draw_chatgpt_open_usage').at(-1).args)).toEqual({});checks.push('Exhaustion preserves typed request, offers fixed Manage usage action, and never changes billing');
 await page.evaluate(()=>window.__chatGPTTest.mode='delayed-response');await panel.getByRole('button',{name:'Send text to ChatGPT'}).click();await panel.getByRole('button',{name:'Cancel request'}).click();await page.evaluate(()=>window.__chatGPTTest.pending());await expect(panel.getByRole('article',{name:'ChatGPT response'})).toHaveCount(0);checks.push('Cancelled late inference result discarded');
 await panel.getByRole('button',{name:'Disconnect ChatGPT'}).click();await expect(panel.getByRole('alert')).toContainText('Remote revocation was not confirmed');checks.push('Unconfirmed remote revocation remains visible after local disconnect');
 await panel.getByRole('button',{name:'Continue with saved ChatGPT account'}).click();expect(await page.evaluate(()=>window.__chatGPTTest.calls.filter(x=>x.command==='draw_chatgpt_connect').at(-1).args.selectedClientId)).toBe('ready');checks.push('Returning signed-out account reuses issued client ID rather than registering anew');
 await panel.getByRole('button',{name:'Load available models'}).click();await page.evaluate(()=>window.__chatGPTTest.mode='expired');await panel.getByRole('button',{name:'Send text to ChatGPT'}).click();await expect(panel.getByRole('alert')).toContainText('needs sign-in again');await expect(panel.getByRole('button',{name:'Continue with saved ChatGPT account'})).toBeVisible();await expect(panel.getByLabel('ChatGPT model')).toHaveCount(0);checks.push('Terminal expiry refreshes signed-out status and clears stale model/result, retaining the request');
 await panel.getByRole('button',{name:'Continue with saved ChatGPT account'}).click();await expect(panel.getByLabel('Text to send to ChatGPT')).toHaveValue('Only the explicitly typed synthetic question.');
 await page.screenshot({path:new URL('desktop-disconnected.png',output).pathname});
 await panel.press('Escape');await expect(page.getByRole('button',{name:/^ChatGPT(?: · connected)?$/})).toBeFocused();
 expect(await page.evaluate(()=>window.__chatGPTTest.document)).toEqual(before);
 expect(await page.evaluate(()=>window.__chatGPTTest.calls.filter(x=>/draw_agent_(start|review)|draw_host_apply|draw_get_state/.test(x.command)))).toEqual([]);expect(errors).toEqual([]);checks.push('Escape focus, document equality and no local-agent permission/edit calls');await context.close();
 const mobile=await pageFor('host',780);await mobile.page.getByRole('button',{name:'ChatGPT',exact:true}).click();await expect(mobile.page.getByRole('dialog',{name:'ChatGPT connection'})).toBeVisible();expect(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await mobile.page.screenshot({path:new URL('narrow-780.png',output).pathname});await mobile.context.close();checks.push('Native minimum-width connection panel fits');
 for(const role of ['web','companion']){const x=await pageFor(role);await expect(x.page.getByRole('button',{name:'ChatGPT',exact:true})).toHaveCount(0);expect(await x.page.evaluate(()=>window.__chatGPTTest.calls.some(x=>x.command.startsWith('draw_chatgpt')))).toBe(false);await x.context.close();}checks.push('No ChatGPT connection UI or commands in web/iPhone roles');
 await writeFile(new URL('result.json',output),JSON.stringify({passed:true,checks,liveOAuth:false,providerCalls:false,syntheticNativeBridge:true},null,2)+'\n');console.log(JSON.stringify({passed:true,checks:checks.length}));
}finally{await browser.close();}
