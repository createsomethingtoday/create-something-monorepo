import test from 'node:test';
import assert from 'node:assert/strict';
import { OnboardingQuest } from './quest.mjs';

const storage = () => {
  const items = new Map();
  return { items, getItem:key=>items.get(key)??null, setItem:(key,value)=>items.set(key,value), removeItem:key=>items.delete(key) };
};
function fixture() {
  const records=new Map(), saves=[], links=[];
  const bridge={records,saves,links,failSave:false,failLink:false,readError:null,
    async saveRecord(wid,entity,input){
      saves.push({wid,entity,...structuredClone(input)});
      const record={id:input.id,workspaceId:wid,entity,title:input.title,fields:input.fields,source:{kind:'manual'},relations:[]};
      records.set(`${entity}:${input.id}`,record);
      if(this.failSave){this.failSave=false;throw new Error('Receipt unavailable');}
      return structuredClone(record);
    },
    async getRecord(wid,entity,id){
      if(this.readError)throw new Error(this.readError);
      const record=records.get(`${entity}:${id}`);
      if(!record||record.workspaceId!==wid)throw new Error('record not found');
      return structuredClone(record);
    },
    async linkRecords(wid,fromEntity,fromId,toEntity,toId,role){
      const relation={fromEntity,fromId,toEntity,toId,role};links.push(relation);
      if(this.failLink){this.failLink=false;throw new Error('Link unavailable');}
      records.get(`${fromEntity}:${fromId}`).relations=[relation];
      return {workspaceId:wid,...relation,linked:true};
    }
  };
  return bridge;
}
const ready = q => {
  q.start();
  const profile={id:'profile',workspaceId:q.workspaceId,entity:'profile',title:'Danny',fields:{Currency:'USD'},source:{kind:'manual'},relations:[]};
  q.bridge.records.set('profile:profile',profile);
  q.profileReady(profile);
};

test('the first mission needs only a name and does not guess a money currency',async()=>{
  const b=fixture(),q=new OnboardingQuest(b,'workspace',{storage:storage()});q.start();
  await q.saveProfile('Danny');
  assert.deepEqual(b.saves[0].fields,{});
  assert.equal(q.state.phase,1);
});

test('missions save real records and verify the exact crew relationship',async()=>{
  const b=fixture(), s=storage(), q=new OnboardingQuest(b,'workspace',{storage:s});
  assert.equal(await q.restore(),null);
  ready(q);await q.saveGig(' Friday at The Echo ');await q.savePerson(' Alex ');
  assert.equal(q.state.phase,3);assert.equal(q.state.gig.title,'Friday at The Echo');
  assert.equal(q.state.person.title,'Alex');assert.equal(q.state.crewLinked,true);
  assert.equal(b.saves.length,2);assert.equal(b.links[0].role,'Contacts');
  assert.equal(b.links[0].fromId,q.state.gig.id);assert.equal(b.links[0].toId,q.state.person.id);
  assert.equal(q.open,true);q.finish();assert.equal(q.open,false);
});

test('person drafts and skips never fabricate a contact or completed link',async()=>{
  const b=fixture(),q=new OnboardingQuest(b,'workspace',{storage:storage()});ready(q);
  await q.saveGig('First gig');q.draft({title:'Alex'});q.skipPerson();
  assert.equal(q.state.phase,3);assert.equal(q.state.skipped,true);assert.equal(q.state.crewLinked,false);
  assert.equal(q.state.person,null);assert.equal(q.state.drafts.person.title,'Alex');assert.equal(b.saves.length,1);
});

test('restart restores record readbacks and pause/resume without replaying mutations',async()=>{
  const b=fixture(),s=storage(),q=new OnboardingQuest(b,'workspace',{storage:s});ready(q);
  await q.saveGig('First gig');q.draft({title:'Alex'});q.pause();
  const restored=new OnboardingQuest(b,'workspace',{storage:s});await restored.restore();
  assert.equal(restored.state.mode,'paused');assert.equal(restored.state.gig.title,'First gig');
  assert.equal(restored.state.drafts.person.title,'Alex');assert.equal(b.saves.length,1);
  restored.resume();await restored.savePerson('Alex');restored.finish();
  const finished=new OnboardingQuest(b,'workspace',{storage:s});await finished.restore();
  assert.equal(finished.state.mode,'finished');assert.equal(finished.open,false);assert.equal(finished.state.crewLinked,true);
  assert.equal(b.saves.length,2);assert.equal(b.links.length,1);
});

test('a saved person survives link failure and retry performs only the link',async()=>{
  const b=fixture(),s=storage(),q=new OnboardingQuest(b,'workspace',{storage:s});ready(q);
  await q.saveGig('First gig');b.failLink=true;
  await assert.rejects(q.savePerson('Alex'),/Link/);
  assert.equal(q.state.phase,2);assert.equal(q.state.person.title,'Alex');assert.equal(q.state.crewLinked,false);
  const restored=new OnboardingQuest(b,'workspace',{storage:s});await restored.restore();
  await restored.retryLink();assert.equal(restored.state.crewLinked,true);assert.equal(restored.state.phase,3);
  assert.equal(b.saves.length,2);assert.equal(b.links.length,2);
});

test('an uncertain save reconciles the stable record before retrying, including after restart',async()=>{
  const b=fixture(),s=storage(),q=new OnboardingQuest(b,'workspace',{storage:s});ready(q);
  b.failSave=true;await assert.rejects(q.saveGig('First gig'),/Receipt/);
  const stored=JSON.parse([...s.items.values()][0]);
  assert.equal(stored.pending.gig.id,b.saves[0].id);
  const restored=new OnboardingQuest(b,'workspace',{storage:s});await restored.restore();
  await restored.saveGig('First gig');assert.equal(restored.state.gig.id,b.saves[0].id);
  assert.equal(b.saves.length,1);
});

test('profile save validates currency and avoids duplicates after an uncertain receipt',async()=>{
  const b=fixture(),s=storage(),q=new OnboardingQuest(b,'workspace',{storage:s});q.start();
  await assert.rejects(q.saveProfile('Danny','AUD'),/currency/i);assert.equal(b.saves.length,0);
  b.failSave=true;await assert.rejects(q.saveProfile('Danny','USD'),/Receipt/);
  const restored=new OnboardingQuest(b,'workspace',{storage:s});await restored.restore();
  const profile=await restored.saveProfile('Danny','USD');
  assert.equal(profile.fields.Currency,'USD');assert.equal(restored.state.phase,1);assert.equal(restored.state.profileName,'Danny');
  assert.equal(b.saves.length,1);
});

test('missing saved records repair progress without creating replacements',async()=>{
  const b=fixture(),s=storage(),q=new OnboardingQuest(b,'workspace',{storage:s});ready(q);
  await q.saveGig('First gig');await q.savePerson('Alex');
  b.records.delete(`gigs:${q.state.gig.id}`);
  const restored=new OnboardingQuest(b,'workspace',{storage:s});await restored.restore();
  assert.equal(restored.state.phase,1);assert.equal(restored.state.gig,null);assert.equal(restored.state.crewLinked,false);
  assert.equal(b.saves.length,2);assert.equal(b.links.length,1);
});

test('missing relationship resets only crew progress and a finished tutorial stays closed',async()=>{
  const b=fixture(),s=storage(),q=new OnboardingQuest(b,'workspace',{storage:s});ready(q);
  await q.saveGig('First gig');await q.savePerson('Alex');q.finish();
  b.records.get(`gigs:${q.state.gig.id}`).relations=[];
  const restored=new OnboardingQuest(b,'workspace',{storage:s});await restored.restore();
  assert.equal(restored.state.phase,2);assert.equal(restored.state.crewLinked,false);
  assert.equal(restored.state.person.title,'Alex');assert.equal(restored.state.mode,'finished');assert.equal(restored.open,false);
  assert.equal(b.saves.length,2);assert.equal(b.links.length,1);
});

test('pending original input prevents an uncertain save being overwritten with a changed draft',async()=>{
  const b=fixture(),s=storage(),q=new OnboardingQuest(b,'workspace',{storage:s});ready(q);
  b.failSave=true;await assert.rejects(q.saveGig('Original title'),/Receipt/);
  await assert.rejects(q.saveGig('Changed title'),/previous save|original/i);
  assert.equal(b.saves.length,1);await q.saveGig('Original title');assert.equal(q.state.gig.title,'Original title');
});

test('unknown readback failure retains references and never silently recreates records',async()=>{
  const b=fixture(),s=storage(),q=new OnboardingQuest(b,'workspace',{storage:s});ready(q);await q.saveGig('First gig');
  const before=[...s.items.values()][0];b.readError='Database temporarily unavailable';
  const restored=new OnboardingQuest(b,'workspace',{storage:s});
  await assert.rejects(restored.restore(),/check|retry|unavailable/i);
  assert.equal([...s.items.values()][0],before);await assert.rejects(restored.saveGig('Replacement'),/check|retry|unavailable/i);
  assert.equal(b.saves.length,1);
});

test('corrupt, oversized, foreign-workspace and unavailable storage do not block local use',async()=>{
  const b=fixture(),s=storage(),q=new OnboardingQuest(b,'workspace',{storage:s});ready(q);
  const key=[...s.items.keys()][0];
  for(const value of ['{broken','x'.repeat(20000),JSON.stringify({version:1,workspaceId:'other'})]){
    s.items.set(key,value);const restored=new OnboardingQuest(b,'workspace',{storage:s});
    assert.equal(await restored.restore(),null);assert.equal(restored.warning,true);
  }
  const noStorage=new OnboardingQuest(b,'workspace',{storage:{getItem(){throw Error('denied');},setItem(){throw Error('denied');}}});
  await noStorage.restore();ready(noStorage);await noStorage.saveGig('Local gig');assert.equal(noStorage.state.phase,2);assert.equal(noStorage.warning,true);
});
