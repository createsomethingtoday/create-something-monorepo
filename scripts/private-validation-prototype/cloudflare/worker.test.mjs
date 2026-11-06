import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
// Exercise the real coordinator methods; replace only Cloudflare's runtime imports.
const source = (await readFile(new URL('./worker.mjs', import.meta.url), 'utf8'))
  .replace("import { DurableObject } from 'cloudflare:workers';", 'class DurableObject {}')
  .replace("import { Sandbox, getSandbox } from '@cloudflare/sandbox';", 'class Sandbox {}')
  .replace("'./policy.mjs'", JSON.stringify(new URL('./policy.mjs', import.meta.url).href));
const { Coordinator } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('cleanup retains capacity while dispatch could still start a container', async () => {
  const coordinator = new Coordinator();
  let ledger = {issued:1,active:'run-test',runs:{'run-test':{startedAt:Date.now(),dispatchPending:true,cleanupAttempts:0}}};
  let alarm;
  const tx = {get:async()=>structuredClone(ledger),put:async(_,v)=>{ledger=v;},setAlarm:async v=>{alarm=v;},deleteAlarm:async()=>{alarm=null;}};
  coordinator.ctx={storage:{transaction:async fn=>fn(tx)}};
  coordinator.sandbox=()=>({destroy:async()=>{},getState:async()=>({status:'stopped'})});
  await coordinator.cleanup('run-test','deadline-reaper');
  assert.equal(ledger.active,'run-test');
  assert.equal(ledger.runs['run-test'].status,'quarantined');
  assert.ok(alarm);
  ledger.runs['run-test'].dispatchPending=false;
  await coordinator.cleanup('run-test','operator-reconcile');
  assert.equal(ledger.active,null);
  assert.equal(ledger.runs['run-test'].status,'cleaned');
  assert.equal(alarm,null);
});
