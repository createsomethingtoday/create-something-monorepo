import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSocialDraft,socialReceiptCopy,socialWorkspaceView,socialErrorMessage,socialDraftIssues,createSocialWorkspace} from './social.mjs';
test('drafts can be incomplete but publishing requires account and public image',()=>{
 assert.deepEqual(validateSocialDraft({title:'Studio idea',caption:''}),[]);
 assert.equal(validateSocialDraft({title:'Idea',caption:'x'.repeat(2201)}).length,1);
 assert.equal(validateSocialDraft({title:'Idea',caption:'',imageUrl:'file:///private/song.jpg'},true).length,3);
});
test('unknown and unverified receipts never claim published',()=>{
 assert.match(socialReceiptCopy({state:'unknown'}).detail,/Do not publish/);
 assert.match(socialReceiptCopy({state:'published_unverified'}).title,/verification pending/);
 assert.equal(socialReceiptCopy({state:'published'}).title,'Published on Instagram');
});
test('draft content escaped, image does not load until requested, unsafe receipt links omitted',()=>{
 const state={items:[],editor:{title:'<script>',caption:'<img onerror=evil>',imageUrl:'https://example.com/private.jpg'},selected:{id:'1',revision:1,state:'unknown',receipt:{state:'unknown',permalink:'javascript:evil()'}},account:null};
 const html=socialWorkspaceView(state);
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<img onerror'));
 assert.ok(!html.includes('src="https://example.com/private.jpg"'));assert.ok(!html.includes('href="javascript:'));
 assert.ok(html.includes('Check publish receipt'));
});
test('connection flow preserves pending consent and does not offer a duplicate grant',()=>{
 const state={items:[],editor:null,setupOpen:true,connection:{provider:'instagram',state:'pending',connectedAccountId:'ca_test'},connectionAttempt:{status:'awaiting_consent',connectedAccountId:'ca_test',url:'https://connect.composio.dev/link',expiresAt:'2099-01-01T00:00:00Z'}};
 const html=socialWorkspaceView(state);
 assert.ok(html.includes('Open existing consent page'));assert.ok(html.includes('Verify connected account'));
 assert.ok(!html.includes('data-social-connect '));
});
test('only a definitive not-published receipt offers an explicit new draft copy',()=>{
 const base={items:[],editor:{title:'Test',caption:'',imageUrl:''},selected:{id:'1',revision:1,state:'not_published',body:{},receipt:{state:'not_published'}}};
 assert.ok(socialWorkspaceView(base).includes('Copy into a new draft'));
 assert.ok(!socialWorkspaceView({...base,selected:{...base.selected,state:'unknown',receipt:{state:'unknown'}}}).includes('Copy into a new draft'));
});

test('social surfaces use the host dark theme tokens and embedded connection setup',()=>{
 const css=readFileSync(new URL('./social.css',import.meta.url),'utf8');
 assert.ok(!/--surface|--border|#fff\b|#ddd\b/.test(css));
 assert.ok(css.includes('background:var(--panel); color:var(--text)'));
 assert.ok(css.includes('background:var(--bg); color:inherit'));
 assert.ok(css.includes('max-height:calc(100dvh - 24px)'));
 const html=socialWorkspaceView({items:[],editor:null});
 assert.ok(html.includes('Drafting needs no connection.'));
 assert.ok(!html.includes('account in Sources'));
});

test('connection setup discloses the full existing grant before consent',()=>{
 const html=socialWorkspaceView({items:[],editor:null,setupOpen:true,connection:{provider:'instagram',state:'disconnected'}});
 assert.ok(html.includes('profile access, content publishing, messages, comments and insights'));
 assert.ok(html.includes('GiGi uses only account identity and publishing'));
 assert.ok(html.includes('the provider grant is broader'));
 assert.ok(html.includes('Start Instagram consent'));
});

test('media and account errors explain a concrete recovery without exposing reason codes',()=>{
 const expected={
  image_changed:'The image changed since you reviewed it. Load the verified preview again, save the draft, then review the new image before publishing.',
  jpeg_required:'Choose a direct URL to a JPEG image. Other image formats cannot be published from this workspace.',
  image_dimensions:'Use a JPEG at least 320 pixels wide, with an aspect ratio from 4:5 to 1.91:1. Crop or resize it, then load the preview again.',
  media_too_large:'The image exceeds 8 MiB. Export a smaller JPEG and load its preview again.',
  media_host_not_allowed:'This release accepts public JPEG URLs only from media.createsomething.io. Ask the GiGi operator for an approved media URL; local files are not uploaded automatically.',
  media_staging_unconfigured:'GiGi cannot prepare the image for Instagram on this release. Keep the draft saved and ask the GiGi operator to configure media publishing.',
  publication_conflict:'A publishing attempt already exists for this post. Check its receipt and Instagram before creating another post.',
  account_changed:'The Instagram account changed after review. Check the connection, select the intended account, then review the draft again.',
  account_unsupported:'Use an Instagram Business or Creator account. Personal accounts cannot publish through this integration.',
  connection_unavailable:'The Instagram connection is unavailable. Check connection status and finish any existing consent or reconnection attempt before publishing.',
  caption_limits:'Keep the caption within 2,200 characters, with no more than 30 hashtags and 20 mentions. Edit and save it before reviewing again.',
  invalid_media_url:'Use a direct public HTTPS JPEG URL from media.createsomething.io, without a sign-in or embedded credentials.',
 };
 for(const [code,message] of Object.entries(expected)){
  assert.equal(socialErrorMessage(code),message);
  assert.equal(socialErrorMessage(new Error(code)),message);
  assert.ok(!message.includes(code));
 }
});
test('image field explains the approved host and JPEG constraints before preview',()=>{
 const html=socialWorkspaceView({items:[],editor:{title:'Draft',caption:'',imageUrl:''}});
 for(const text of ['8 MiB','320 pixels wide','4:5 to 1.91:1','media.createsomething.io only'])assert.ok(html.includes(text));
});

test('observed signed-out connection error directs the user to embedded sign-in',()=>{
 const expected='Sign in to GiGi sources in Connection setup, then check Instagram status again. Your local drafts are still available.';
 assert.equal(socialErrorMessage('reauthentication_required'),expected);
 assert.equal(socialErrorMessage(new Error('reauthentication_required')),expected);
});
test('current auth and runner failure codes never reach the user as raw identifiers',()=>{
 for(const code of ['reauthentication_required','unauthorized','unavailable','refresh_in_progress','refresh_outcome_unknown','cancelled','timeout','invalid_data_directory','unsafe_data_directory','unsafe_session_file','invalid_configuration','invalid_request','unsupported_operation','unknown_operation','browser_unavailable','identity_contract_mismatch','identity_mismatch','invalid_readback','invalid_token_readback','loopback_unavailable','redirect_registration_mismatch','connection_changed','connection_not_found']){
  const message=socialErrorMessage(code);
  assert.notEqual(message,code,code);if(code.includes('_'))assert.ok(!message.includes(code),code);assert.ok(message.length>30,code);
 }
 assert.equal(socialErrorMessage('unavailable'),'The connection service is unavailable. Keep your draft saved and try Check connection later.');
 assert.equal(socialErrorMessage('A readable native error.'),'A readable native error.');
});

test('pending processing explicitly describes continuation and definitive rejection gives recovery',()=>{
 const pending={state:'unknown',reason:'container_processing'};
 assert.match(socialReceiptCopy(pending).detail,/may publish the exact image, caption and account you already confirmed/);
 const html=socialWorkspaceView({items:[],editor:{title:'Test',caption:'',imageUrl:''},selected:{id:'1',revision:1,state:'unknown',body:{},receipt:pending}});
 assert.match(html,/Continue pending publish/);assert.doesNotMatch(html,/Copy into a new draft/);
 assert.match(socialReceiptCopy({state:'not_published',reason:'image_changed'}).detail,/Load the verified preview again/);
});


test('publishing issues identify fields without telling an already saved draft to save again',()=>{
 const issues=socialDraftIssues({title:'Idea',caption:'',imageUrl:''},true);
 assert.deepEqual(issues.map(issue=>issue.field),['imageUrl','imageUrl','connectedAccountId']);
 assert.ok(issues.every(issue=>!issue.message.includes('save this draft')));
 const html=socialWorkspaceView({items:[],editor:{title:'Idea',caption:'',imageUrl:''},validationMode:true,selected:{id:'one',revision:1,state:'draft'}});
 assert.match(html,/data-social-field="imageUrl" aria-describedby="social-imageUrl-error" aria-invalid="true"/);
 assert.ok(html.indexOf('data-social-save ')<html.indexOf('<label>Title'));
 assert.match(html,/<details class="social-media-guide">/);
});

test('saved draft review focuses invalid media without calling publishing and CmdS saves locally',async()=>{
 const calls=[],listeners={},elements=new Map();let html='',focused='';
 const saved={id:'draft',revision:1,state:'draft',body:{title:'Idea',caption:'',imageUrl:'',connectedAccountId:''}};
 const element=selector=>{if(!elements.has(selector))elements.set(selector,{listeners:{},disabled:false,textContent:'',setAttribute(){},scrollIntoView(){},focus(){focused=selector;},addEventListener(type,fn){this.listeners[type]=fn;},click(){return this.listeners.click?.({currentTarget:this});}});return elements.get(selector);};
 const container={get innerHTML(){return html;},set innerHTML(value){html=value;elements.clear();},addEventListener(type,fn){listeners[type]=fn;},removeEventListener(type){delete listeners[type];},querySelector:element,querySelectorAll(selector){return [element(selector)];}};
 const workspace=createSocialWorkspace({workspaceId:'w',call:async(operation,input)=>{calls.push(operation);if(operation==='social.list')return {items:[saved],total:1};if(operation==='social.save')return {...saved,revision:2,body:{...saved.body,title:input.title}};throw Error('Unexpected '+operation);}});
 await workspace.mount(container);workspace.state.selected=saved;workspace.state.editor={...saved.body};
 // Repaint through the list action, retaining the synthetic selected state.
 await element('[data-social-more]').click();
 await element('[data-social-review]').click();
 assert.equal(focused,'[data-social-field="imageUrl"]');
 assert.deepEqual(calls,['social.list','social.list']);
 workspace.state.editor.title='Changed title';workspace.state.dirty=true;
 let prevented=false;listeners.keydown({metaKey:true,key:'s',preventDefault(){prevented=true;}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(prevented,true);assert.ok(calls.includes('social.save'));assert.equal(workspace.state.selected.body.title,'Changed title');
 assert.ok(!calls.includes('social.publish'));
 workspace.dispose();assert.equal(listeners.keydown,undefined);
});

test('selecting a saved draft focuses its title and reveals the editor only after loading',async()=>{
 const elements=new Map(),moves=[];let resolveRecord;
 const saved={id:'draft',revision:1,state:'draft',body:{title:'Idea',caption:'',imageUrl:'',connectedAccountId:''}};
 const element=selector=>{if(!elements.has(selector))elements.set(selector,{dataset:{socialSelect:'draft'},listeners:{},focus(options){moves.push(['focus',selector,options]);},scrollIntoView(options){moves.push(['scroll',selector,options]);},addEventListener(type,fn){this.listeners[type]=fn;},click(){return this.listeners.click?.({currentTarget:this});}});return elements.get(selector);};
 const container={set innerHTML(value){elements.clear();},addEventListener(){},removeEventListener(){},querySelector:element,querySelectorAll(selector){return [element(selector)];}};
 const workspace=createSocialWorkspace({workspaceId:'w',call:async operation=>{if(operation==='social.list')return {items:[saved],total:1};if(operation==='social.get')return new Promise(resolve=>{resolveRecord=resolve;});if(operation==='social.save')return saved;throw Error('Unexpected '+operation);}});
 await workspace.mount(container);
 const selecting=element('[data-social-select]').click();
 assert.deepEqual(moves,[],'do not move focus into the disabled loading editor');
 resolveRecord(saved);await selecting;
 assert.deepEqual(moves,[['focus','[data-social-field="title"]',{preventScroll:true}],['scroll','.social-composer',{block:'start'}]]);
 moves.length=0;await element('[data-social-save]').click();
 assert.deepEqual(moves,[],'saving and repainting must not jump back to the editor top');
 workspace.dispose();
});
