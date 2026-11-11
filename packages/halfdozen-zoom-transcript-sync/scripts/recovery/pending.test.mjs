import test from 'node:test';
import assert from 'node:assert/strict';
import {runPendingRecovery} from './pending.mjs';

test('lost response never permits a second dispatch', async () => {
  const {makeFixture} = await import('./test-fixture.mjs');
  const f = makeFixture();
  f.adapter.append = async () => { f.sends++; throw Error('lost response'); };
  assert.equal((await runPendingRecovery(f)).status, 'unknown');
  assert.equal((await runPendingRecovery(f)).status, 'held-existing-attempt');
  assert.equal(f.sends, 1);
});
for (const kind of ['human-edit', 'source-mismatch', 'ownership', 'non-409']) {
  test(`refuses ${kind} before dispatch`, async () => {
    const {makeFixture} = await import('./test-fixture.mjs');
    const f = makeFixture();
    if (kind === 'human-edit') f.adapter.getPage = async () => ({id:f.profile.pageId, properties:{Reviewed:{checkbox:true}}});
    if (kind === 'source-mismatch') f.raw = 'changed';
    if (kind === 'ownership') f.adapter.guard = async () => { throw Error('owner changed'); };
    if (kind === 'non-409') f.evidence.provider.status = 500;
    await assert.rejects(runPendingRecovery(f));
    assert.equal(f.sends, 0);
  });
}
test('exact append yields positive receipt without checkpoint or old-journal mutation', async () => {
  const {makeFixture} = await import('./test-fixture.mjs');
  const f = makeFixture();
  const result = await runPendingRecovery(f);
  assert.equal(result.status, 'verified');
  assert.equal(result.receipt.ids.length, 80);
  assert.equal(f.sends, 1);
});
test('generated edited metadata may advance while human properties stay frozen', async()=>{
  const {makeFixture}=await import('./test-fixture.mjs');const f=makeFixture();
  const original=f.adapter.getPage;const before=await original();
  before.properties['Last Updated']={id:'edited',type:'last_edited_time',last_edited_time:'before'};
  before.properties['Last Updated By']={id:'editor',type:'last_edited_by',last_edited_by:{id:'human'}};
  f.profile.properties=JSON.stringify(before.properties);
  f.adapter.getPage=async()=>{const p=structuredClone(await original());if(f.sends){p.properties['Last Updated'].last_edited_time='after';p.properties['Last Updated By'].last_edited_by={id:'integration'};}return p;};
  assert.equal((await runPendingRecovery(f)).status,'verified');
});
test('settlement resolves positive unknown receipt without a second append',async()=>{
  const {makeFixture}=await import('./test-fixture.mjs');const f=makeFixture();
  const append=f.adapter.append;f.adapter.append=async(...args)=>{await append(...args);throw Error('lost response');};
  assert.equal((await runPendingRecovery(f)).status,'unknown');
  f.adapter.append=async()=>{throw Error('settlement must never call append');};
  assert.equal((await runPendingRecovery({...f,settleOnly:true})).status,'verified');
  assert.equal(f.sends,1);
});
test('settlement refuses absent unknown attempt and never dispatches',async()=>{
  const {makeFixture}=await import('./test-fixture.mjs');const f=makeFixture();
  f.adapter.append=async()=>{f.sends++;throw Error('lost response');};
  assert.equal((await runPendingRecovery(f)).status,'unknown');
  await assert.rejects(runPendingRecovery({...f,settleOnly:true}),/exact positive readback/);
  assert.equal(f.sends,1);
});
test('generated metadata exception cannot hide property type or human edits',async()=>{
  const {makeFixture}=await import('./test-fixture.mjs');const f=makeFixture();
  const original=f.adapter.getPage;const before=await original();
  before.properties['Last Updated']={id:'edited',type:'last_edited_time',last_edited_time:'before'};
  f.profile.properties=JSON.stringify(before.properties);
  f.adapter.getPage=async()=>{const p=structuredClone(await original());p.properties['Last Updated']={id:'edited',type:'rich_text',rich_text:[]};return p;};
  await assert.rejects(runPendingRecovery(f),/Human\/source fields changed/);assert.equal(f.sends,0);
});
