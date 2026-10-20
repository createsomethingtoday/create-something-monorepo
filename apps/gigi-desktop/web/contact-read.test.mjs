import test from 'node:test';
import assert from 'node:assert/strict';
import {createContactRead} from './contact-read.mjs';
function fixture(){let n=0;const timers=new Map();return {timers,reader:createContactRead({schedule(fn){timers.set(++n,fn);return n;},clear(id){timers.delete(id);}})};}
test('timeout settles UI wait, removes timer, and consumes late native rejection',async()=>{
 const {reader,timers}=fixture();let fail;const result=reader.read(()=>new Promise((_,reject)=>fail=reject));await Promise.resolve();const rejected=assert.rejects(result,{code:'contact_read_timeout'});timers.values().next().value();await rejected;assert.equal(timers.size,0);fail(Error('late native failure'));await Promise.resolve();
});
test('superseding and navigation cancel only the wait, preserve latest success, and clear timers',async()=>{
 const {reader,timers}=fixture();let finish;const first=reader.read(()=>new Promise(resolve=>finish=resolve));await Promise.resolve();const superseded=assert.rejects(first,{code:'contact_read_superseded'});const second=reader.read(()=>42);await superseded;assert.equal(await second,42);finish('old');assert.equal(timers.size,0);
 const pending=reader.read(()=>new Promise(()=>{}));const cancelled=assert.rejects(pending,{code:'contact_read_superseded'});reader.cancel();await cancelled;assert.equal(timers.size,0);
});
test('success and native rejection both clean up the deadline',async()=>{
 const {reader,timers}=fixture();assert.deepEqual(await reader.read(()=>({items:[]})),{items:[]});assert.equal(timers.size,0);await assert.rejects(reader.read(()=>{throw Error('database locked')}),/database locked/);assert.equal(timers.size,0);
});
