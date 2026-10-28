import { test } from 'node:test';
import assert from 'node:assert/strict';
import './server.mjs';
const { createDocument,commit,undo }=await import('../src/lib/document.ts');
const { NativeHostBatches,settleNativeHostBatch }=await import('../src/lib/native-host-batches.ts');
const authority=()=>({sessionId:'synthetic-session',revision:5,document:createDocument('Synthetic')});
test('queued edits reserve authored successive revisions and block both mirror phases',()=>{
  const batches=new NativeHostBatches(),state=authority(),operations=[{type:'set_title',title:'A'}];
  const first=batches.reserve(state,operations),second=batches.reserve(state,[{type:'set_background',background:'#ffffff'}]);
  operations[0].title='mutated later';
  assert.equal(first.request.expectedRevision,5); assert.equal(second.request.expectedRevision,6);
  assert.equal(first.request.operations[0].title,'A'); assert.equal(batches.canMirror,false);
  state.revision=6;batches.finish(first); assert.equal(batches.canMirror,false);
  const third=batches.reserve(state,[{type:'set_title',title:'C'}]);assert.equal(third.request.expectedRevision,7);
  batches.finish(second);batches.finish(third);assert.equal(batches.canMirror,true);
});
test('conflict invalidates dependent work and blocks until explicit recovery',()=>{
  const batches=new NativeHostBatches(),state=authority();
  const first=batches.reserve(state,[{type:'set_title',title:'A'}]),second=batches.reserve(state,[{type:'set_title',title:'B'}]);
  batches.invalidate();assert.equal(batches.current(first),false);assert.equal(batches.current(second),false);
  assert.throws(()=>batches.reserve(state,[]),/recovery/);batches.finish(first);batches.finish(second);
  assert.equal(batches.canMirror,false);batches.recovered();state.revision=9;
  assert.equal(batches.reserve(state,[{type:'set_title',title:'Reviewed retry'}]).request.expectedRevision,9);
});
test('multi-operation edit has one undo step, exact retry cannot manufacture history',()=>{
  const before=createDocument('Before'),after={...before,title:'After',background:'#ffffff'};
  const optimistic=commit({past:[],present:before,future:[]},after);
  const settled=settleNativeHostBatch(optimistic,{status:'applied',document:after,previousDocument:before},true,false);
  assert.equal(settled.past.length,1);assert.deepEqual(undo(settled).present,before);
  const recovered=settleNativeHostBatch(settled,{status:'duplicate',document:after},true,false);
  assert.equal(recovered.past.length,0);
  assert.throws(()=>settleNativeHostBatch(settled,{status:'conflict',document:before},true,false),/not committed/);
});

test('reactive viewport proxies are snapshotted through the JSON operation contract',()=>{
  const viewport=new Proxy({x:1,y:2,zoom:1},{}),batches=new NativeHostBatches();
  const ticket=batches.reserve(authority(),[{type:'set_viewport',viewport}]);
  viewport.x=99;
  assert.deepEqual(ticket.request.operations[0].viewport,{x:1,y:2,zoom:1});
});
