import assert from 'node:assert/strict';
import {test} from 'node:test';
import {reconcileSourceReadback} from './source-readback.mjs';
test('source detail omission retains prior metadata with explicit retained status',()=>{
 const source={kind:'imported',provider:'statement',externalId:'synthetic'};
 const result=reconcileSourceReadback({id:'money',source},{id:'money',fields:{Amount:100}});
 assert.deepEqual(result.record.source,source);assert.equal(result.status,'retained');
 assert.throws(()=>reconcileSourceReadback({id:'money',source},{id:'other'}));
 const fresh={id:'money',source:{...source,observedAt:'2026-11-15'}};
 assert.equal(reconcileSourceReadback({id:'money',source},fresh).status,'read');
});
import {recordedMoneyKind} from './source-readback.mjs';
test('money classification requires explicit retained metadata, never title or amount guesses',()=>{
 for(const title of ['Refund','Transfer from savings','Payment received'])assert.equal(recordedMoneyKind({title,fields:{Amount:-100,Direction:'Income'}}),'Unknown');
 for(const value of ['Payment','Transfer','Refund'])assert.equal(recordedMoneyKind({source:{preview:{transactionKind:value}}}),value);
 assert.equal(recordedMoneyKind({source:{preview:{transactionKind:'income'}}}),'Unknown');
});
