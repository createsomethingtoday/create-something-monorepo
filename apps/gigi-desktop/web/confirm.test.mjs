import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmAction} from './confirm.mjs';
function fixture(){
 const doc={activeElement:null};
 const node=()=>({children:[],listeners:{},attributes:{},inert:false,isConnected:true,append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,v){this.listeners[k]=v;},focus(){doc.activeElement=this;},remove(){this.parent.children=this.parent.children.filter(n=>n!==this);this.isConnected=false;}});
 doc.createElement=node;doc.body=node();const trigger=node(),alreadyInert=node();alreadyInert.inert=true;doc.body.append(trigger,alreadyInert);trigger.focus();
 return {doc,trigger,alreadyInert,controls(){const backdrop=doc.body.children.at(-1),dialog=backdrop.children[0],actions=dialog.children[2];return {backdrop,dialog,cancel:actions.children[0],accept:actions.children[1]};}};
}
for(const accepted of [true,false])test(`HTML confirmation ${accepted?'accepts':'rejects'} and restores focus/inert state`,async()=>{
 const f=fixture();const pending=confirmAction('<unsafe message>',{document:f.doc,acceptLabel:'Discard changes'});const c=f.controls();
 assert.equal(c.dialog.attributes.role,'dialog');assert.equal(c.dialog.attributes['aria-modal'],'true');assert.equal(c.dialog.children[1].textContent,'<unsafe message>');assert.equal(f.doc.activeElement,c.cancel);assert.equal(f.trigger.inert,true);
 assert.equal(await confirmAction('Second request',{document:f.doc}),false,'do not queue a second action behind consent');
 (accepted?c.accept:c.cancel).listeners.click();assert.equal(await pending,accepted);assert.equal(f.doc.activeElement,f.trigger);assert.equal(f.trigger.inert,false);assert.equal(f.alreadyInert.inert,true);assert.equal(f.doc.body.children.length,2);
});
test('HTML confirmation traps Tab in both directions and Escape declines',async()=>{
 const f=fixture(),pending=confirmAction('Discard?',{document:f.doc}),c=f.controls();let prevented=0,stopped=0;
 const key=(key,shiftKey=false)=>c.backdrop.listeners.keydown({key,shiftKey,preventDefault(){prevented++;},stopPropagation(){stopped++;}});
 key('Tab');assert.equal(f.doc.activeElement,c.accept);key('Tab');assert.equal(f.doc.activeElement,c.cancel);key('Tab',true);assert.equal(f.doc.activeElement,c.accept);
 key('Escape');assert.equal(await pending,false);assert.equal(f.doc.activeElement,f.trigger);assert.equal(prevented,4);assert.equal(stopped,4);
});
