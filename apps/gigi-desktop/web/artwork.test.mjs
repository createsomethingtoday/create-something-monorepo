import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {imageMarkup,imageUrl,provenanceLabel,installArtworkUI} from './artwork.mjs';
import {referenceCards} from './reference-layout.mjs';
import {socialWorkspaceView} from './social.mjs';
const w='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
const cover={workspaceId:w,assetId:id,alt:'Blue <shapes>',provenance:{origin:'generated',purpose:'illustration',rights:'unknown'}};
test('image URLs have only workspace-owned IDs and thumbnails retain accessible text',()=>{
 assert.equal(imageUrl({...cover,assetId:'../../private'}),'');
 assert.match(imageMarkup(cover),/alt="Blue &lt;shapes&gt;"/);
 assert.match(imageMarkup(cover),/loading="lazy"/);
 assert.equal(provenanceLabel(cover),'AI illustration');
 assert.equal(imageMarkup(null),'');
});
test('Today event cards preserve cross-dataset identity and image fallback text',()=>{
 const html=referenceCards('events',[{id,entity:'schedule',title:'Calendar event',date:'2026-10-24',cover}],{status:()=>'',date:s=>s,money:()=>''});
 assert.match(html,/data-entity="schedule"/);assert.match(html,/Calendar event/);assert.match(html,/AI illustration/);assert.match(html,/<img/);
});
test('a saved local-artwork draft previews offline without a publish control',()=>{
 const body={title:'Artwork idea',caption:'Draft',imageUrl:'',imageAssetId:id,imageAlt:'Blue shapes',imageSnapshot:cover};
 const html=socialWorkspaceView({items:[],editor:body,selected:{id:'draft',revision:1,state:'draft',body}});
 assert.match(html,/Local artwork/);assert.match(html,/gigi-image:/);assert.doesNotMatch(html,/data-social-review/);assert.match(html,/not available for publishing/);
});

test('artwork dialog wraps focus through visible storage controls and skips hidden ancestors',async()=>{
 const previous=globalThis.document;
 let opened;
 const root={listeners:{},addEventListener(type,handler){this.listeners[type]=handler;}};
 // Rectangles deliberately remain nonempty for hidden/collapsed controls: the
 // controller must also honor their semantic state. This is not a layout engine.
 const doc={activeElement:null,body:{append(node){opened=node;}},createElement(){
  const node={listeners:{},controls:[],setAttribute(){},addEventListener(type,handler){this.listeners[type]=handler;},showModal(){},remove(){},
   set innerHTML(html){
    this.html=html;
    const form={elements:{},matches:()=>false};let details=null;
    for(const token of html.matchAll(/<(\/?)(details|textarea|input|select|button|summary)\b([^>]*)>/gi)){
     const [,closing,tag,source]=token;if(closing){if(tag==='details')details=null;continue;}
     if(tag==='details'){details={open:false,matches(selector){return selector==='details:not([open])'&&!this.open;}};this.details=details;continue;}
     const attrs=new Map([...source.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([,key,value])=>[key,value??'']));
     const parent=details||form;
     const control={tagName:tag.toUpperCase(),attrs,parentElement:parent,hidden:attrs.has('hidden'),disabled:attrs.has('disabled'),hiddenAncestor:false,
      getClientRects:()=>[{}],
      matches:selector=>selector==='summary'?tag==='summary':false,
      closest(selector){return selector==='[hidden]'?(this.hidden||this.hiddenAncestor?this:null):selector==='details:not([open])'&&parent===node.details&&!parent.open?parent:null;},
      focus(){if(this.hidden||this.hiddenAncestor||this.disabled||(parent===node.details&&!parent.open&&tag!=='summary')||(tag==='summary'&&attrs.get('tabindex')!=='0'))return;doc.activeElement=this;}
     };
     this.controls.push(control);if(attrs.has('name'))form.elements[attrs.get('name')]=control;
    }
    this.form=form;
   },
   querySelector(selector){return selector==='form'?this.form:this.controls.find(control=>control.attrs.has(selector.slice(1,-1)));},
   querySelectorAll(selector){const tags=selector.split(',');return this.controls.filter(control=>tags.includes(control.tagName.toLowerCase()));}
  };return node;
 }};
 globalThis.document=doc;
 try{
  installArtworkUI(root,{workspaceId:()=>w,call:async()=>{throw Error('Focus navigation must not invoke a native operation');}});
  const trigger={dataset:{imageEntity:'gigs',imageId:id,imageRevision:'0',imageAlt:''}};
  await root.listeners.click({target:{closest:selector=>selector==='[data-image-edit]'?trigger:null}});
  const first=opened.form.elements.alt;
  const summary=opened.controls.find(control=>control.tagName==='SUMMARY');
  const cleanup=opened.querySelector('[data-cleanup]');
  assert.equal(opened.querySelector('[data-check]').hidden,true,'recovery starts hidden');
  assert.equal(summary.attrs.get('tabindex'),'0','storage summary must support explicit focus in WebKit');
  const tab=(shiftKey=false)=>{let prevented=false;opened.listeners.keydown({key:'Tab',shiftKey,preventDefault(){prevented=true;}});assert(prevented,'the boundary Tab must wrap inside the dialog');};
  const focused=(control,message)=>assert.equal(doc.activeElement===control,true,message);
  focused(first,'opening focuses the image description');
  tab(true);focused(summary,'closed storage skips its cleanup button');
  tab();focused(first,'forward Tab wraps to the image description');
  opened.details.open=true;
  tab(true);focused(cleanup,'expanded storage includes its cleanup button');
  tab();focused(first,'expanded storage still wraps forward');
  cleanup.hiddenAncestor=true;
  tab(true);focused(summary,'an ancestor hidden attribute removes a control from the focus cycle');
  tab();focused(first,'hidden ancestors do not break forward wrapping');
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('artwork dialog author styles preserve hidden controls despite button display rules',async()=>{
 const css=await readFile(new URL('./reference-layout.css',import.meta.url),'utf8');
 assert.match(css,/\.artwork-dialog\s+\[hidden\]\s*\{\s*display\s*:\s*none\s*!important\s*;?\s*\}/);
});
