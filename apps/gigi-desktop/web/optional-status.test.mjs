import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedStatusRead } from './optional-status.mjs';
test('an optional status timeout settles without accepting a late result',async()=>{
  let late; const keepingAlive=setTimeout(()=>{},100);
  try {
    const read=boundedStatusRead(()=>new Promise(resolve=>{late=resolve;}),5);
    await assert.rejects(read,/Status check timed out/);
    late({ready:true});
    await assert.rejects(read,/Status check timed out/);
    assert.deepEqual(await boundedStatusRead(()=>({ready:true}),5),{ready:true});
  } finally {clearTimeout(keepingAlive);}
});
