import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSocialDraft,socialReceiptCopy,socialWorkspaceView} from './social.mjs';
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
 assert.ok(html.includes('Open Connection setup below'));
 assert.ok(!html.includes('account in Sources'));
});

test('connection setup discloses the full existing grant before consent',()=>{
 const html=socialWorkspaceView({items:[],editor:null,setupOpen:true,connection:{provider:'instagram',state:'disconnected'}});
 assert.ok(html.includes('profile access, content publishing, messages, comments and insights'));
 assert.ok(html.includes('GiGi uses only account identity and publishing'));
 assert.ok(html.includes('the provider grant is broader'));
 assert.ok(html.includes('Start Instagram consent'));
});
