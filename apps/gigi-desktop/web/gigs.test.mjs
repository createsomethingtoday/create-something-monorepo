import test from 'node:test';
import assert from 'node:assert/strict';
import {createGigs,gigsView} from './gigs.mjs';
const tick=()=>new Promise(r=>setImmediate(r));
const pending=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{resolve,reject,promise};};
test('pending Gigs criteria do not show old matching or view counts',()=>{
 const html=gigsView({criteria:{view:'all',sort:'date',query:'needle'},loading:true,result:{items:[{id:'old',title:'Previous gig'}],count:42,total:57,viewCounts:{all:42,upcoming:40,past:2},needsDateCount:3}});
 assert.match(html,/Updating results/);assert.match(html,/Previous results are shown/);assert.doesNotMatch(html,/All \(42\)|Upcoming \(40\)|Past \(2\)|Needs date \(3\)|Showing 1 of 42/);
});
test('Gigs ignores stale search results, retains rows on failure, and restores workspace state',async()=>{
 const calls=[],deferred=[];const store=new Map();
 const gigs=createGigs({read:async(w,c,cursor)=>{calls.push({w,c,cursor});const p=pending();deferred.push(p);return p.promise;},storage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},changed(){}});
 const opening=gigs.open('w1');await tick();deferred[0].resolve({items:[{id:'saved'}],count:40,total:57,nextCursor:'page2'});await opening;
 gigs.remember(720,'saved');gigs.update({query:'first'},false);await tick();gigs.update({query:'second'},false);await tick();
 deferred[2].resolve({items:[{id:'new'}],count:1,total:57});await tick();deferred[1].resolve({items:[{id:'stale'}],count:5});await tick();
 assert.equal(gigs.state.result.items[0].id,'new');assert.equal(gigs.state.criteria.query,'second');
 gigs.update({status:null},false);await tick();deferred[3].reject(Error('Synthetic read failed'));await tick();
 assert.equal(gigs.state.result.items[0].id,'new');assert.match(gigs.state.error,/Synthetic read failed/);
 gigs.remember(520,'new');gigs.cancel();const other=gigs.open('w2');await tick();deferred[4].resolve({items:[],count:0,total:0});await other;
 assert.equal(gigs.state.criteria.query,'');const returning=gigs.open('w1');await tick();deferred[5].resolve({items:[{id:'new'}],count:1,total:57});await returning;assert.equal(gigs.state.criteria.query,'second');assert.equal(gigs.state.scroll,520);gigs.cancel();
});

test('Gigs uses opaque scoped cursors, resets paging on criteria change and persists preferences',async()=>{
 const calls=[],store=new Map();const storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
 const read=async(w,c,cursor)=>{calls.push({w,c,cursor});return cursor?{items:[{id:'second'}],count:2,total:57}:{items:[{id:'first'}],count:2,total:57,nextCursor:'opaque-scope'};};
 const gigs=createGigs({read,storage});await gigs.open('one');await gigs.more();assert.deepEqual(gigs.state.result.items.map(v=>v.id),['first','second']);assert.equal(calls[1].cursor,'opaque-scope');
 gigs.update({type:'Shift',view:'all',from:'2026-10-01'},false);await tick();assert.equal(calls.at(-1).cursor,null);gigs.remember(340,'first');gigs.cancel();
 const restored=createGigs({read,storage});await restored.open('one');assert.equal(restored.state.criteria.type,'Shift');assert.equal(restored.state.criteria.view,'all');assert.equal(restored.state.scroll,340);
 restored.reset();await tick();assert.equal(restored.state.criteria.view,'upcoming');assert.equal(restored.state.criteria.type,undefined);restored.cancel();
});

test('Gigs rejects reversed date ranges without discarding previous rows',async()=>{
 let reads=0;const gigs=createGigs({storage:null,read:async()=>{reads++;return{items:[{id:'keep'}],count:1,total:1};}});await gigs.open('one');
 gigs.update({from:'2026-11-05',to:'2026-10-01'},false);await tick();assert.equal(reads,1);assert.match(gigs.state.error,/Start date/);assert.equal(gigs.state.result.items[0].id,'keep');gigs.cancel();
});

test('a cancelled search is reread on return and mutations invalidate the owning workspace cache',async()=>{
 let reads=0;const gigs=createGigs({storage:null,read:async(_w,c)=>{reads++;return{items:[{id:c.query||'initial'}],count:1,total:1};}});await gigs.open('one');
 gigs.update({query:'needle'});gigs.cancel();await gigs.open('one');assert.equal(reads,2);assert.equal(gigs.state.result.items[0].id,'needle');
 gigs.cancel();gigs.invalidate('one');await gigs.open('one');assert.equal(reads,3);gigs.cancel();
});

test('a read begun before a mutation cannot clear invalidation',async()=>{
 let reads=0;const old=pending();const gigs=createGigs({storage:null,read:async()=>++reads===2?old.promise:{items:[{id:`read-${reads}`}],count:1,total:1}});await gigs.open('one');
 const refreshing=gigs.refresh();await tick();gigs.invalidate('one');old.resolve({items:[{id:'pre-write'}],count:1,total:1});await refreshing;
 gigs.cancel();await gigs.open('one');assert.equal(reads,3);assert.equal(gigs.state.result.items[0].id,'read-3');gigs.cancel();
});

test('reopening revalidates external changes and the current day while restoring loaded depth',async()=>{
 let revision='before',day='2026-10-21';const calls=[];
 const gigs=createGigs({storage:null,read:async(_w,c,cursor)=>{calls.push({revision,day,c,cursor});return{items:[{id:`${revision}-${day}-${cursor||'first'}`}],count:3,total:3,nextCursor:cursor?null:'next'};}});
 await gigs.open('one');await gigs.more();gigs.remember(620,'old');gigs.cancel();revision='external-write';day='2026-10-22';await gigs.open('one');
 assert.equal(calls.length,4);assert.equal(calls[2].cursor,null);assert.equal(calls[3].cursor,'next');assert.equal(gigs.state.result.items.length,2);assert.ok(gigs.state.result.items.every(row=>row.id.startsWith('external-write-2026-10-22')));assert.equal(gigs.state.scroll,620);gigs.cancel();
});
