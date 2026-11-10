import test from 'node:test';
import assert from 'node:assert/strict';
import {completeTask,createTasks,tasksView,taskDateLabel} from './calm-work.mjs';

const record=()=>({id:'one',workspaceId:'w',title:'Confirm soundcheck',updatedAt:'revision-one',fields:{Status:'Waiting','Due Date':'2026-11-06','Do Date':'2026-11-04','Estimated Time':2,Recurring:'Custom value'},source:{kind:'imported',provider:'gmail',externalId:'source-one'},relations:[{id:'preserved-link'}]});
test('completion preserves the fresh full fields/source contract and verifies the saved status',async()=>{
  const original=record();let saved;let reads=0;
  const bridge={getRecord:async()=>++reads===1?original:{...original,fields:{...original.fields,Status:'Done'}},saveRecord:async(_w,_entity,input)=>{saved=input;}};
  const result=await completeTask(bridge,'w',{id:'one',updatedAt:'revision-one'});
  assert.equal(reads,2);assert.equal(result.fields.Status,'Done');assert.deepEqual(saved.fields,{...original.fields,Status:'Done'});assert.deepEqual(saved.expectedRecord,{title:original.title,fields:original.fields,source:original.source});assert.equal(saved.fieldsMode,'replace');
});
test('stale tasks and navigation during the full read never save',async()=>{
  let writes=0;const bridge={getRecord:async()=>record(),saveRecord:async()=>writes++};
  await assert.rejects(completeTask(bridge,'w',{id:'one',updatedAt:'old'}),/changed/);
  assert.equal(await completeTask(bridge,'w',{id:'one'},()=>false),null);assert.equal(writes,0);
});
test('failed saves and unconfirmed completion do not fabricate success',async()=>{
  const bridge={getRecord:async()=>record(),saveRecord:async()=>{throw Error('Synthetic conflict');}};
  await assert.rejects(completeTask(bridge,'w',{id:'one'}),/Synthetic conflict/);
  await assert.rejects(completeTask({...bridge,saveRecord:async()=>{}},'w',{id:'one'}),/could not be confirmed/);
});
test('Tasks view preferences are independent of Gigs and map to native filtered paging',async()=>{
  const calls=[],stored=new Map([['gigi:gigs:w',JSON.stringify({criteria:{view:'past',query:'Gigs only'}})]]);
  const tasks=createTasks({storage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},read:async(w,criteria,cursor)=>{calls.push({w,criteria,cursor});return{items:[{id:cursor?'second':'first'}],count:2,nextCursor:cursor?null:'scoped-next'};}});
  await tasks.open('w');await tasks.more();assert.deepEqual(calls.map(v=>v.criteria),[{view:'soon',query:''},{view:'soon',query:''}]);assert.equal(calls[1].cursor,'scoped-next');
  tasks.update({view:'all'},false);await new Promise(r=>setImmediate(r));assert.equal(calls.at(-1).criteria.view,'all');assert.equal(JSON.parse(stored.get('gigi:gigs:w')).criteria.query,'Gigs only');tasks.cancel();
});
test('planned dates are labelled accurately and unknown statuses are retained',()=>{
  assert.equal(taskDateLabel({date:'2026-11-05',dateSource:'planned',status:'Waiting'},'2026-11-06'),'Planned · Nov 5');
  assert.match(taskDateLabel({date:'2026-11-05',dateSource:'due',status:'Waiting'},'2026-11-06'),/overdue/);
  const html=tasksView({criteria:{view:'upcoming',query:''},result:{items:[{id:'one',title:'<script>',status:'Custom status',date:null}],count:1,today:'2026-11-06'}});
  assert.match(html,/Custom status/);assert.match(html,/No date/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
});
