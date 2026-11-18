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

test('partial matching source retains omitted excerpt as historical evidence',()=>{
 const source={kind:'import',provider:'gmail',connectedAccountId:'acct',externalId:'row',preview:{snippet:'Saved excerpt'}};
 const result=reconcileSourceReadback({id:'money',entity:'finances',source},{id:'money',entity:'finances',source:{kind:'import',provider:'gmail',connectedAccountId:'acct',externalId:'row'}});
 assert.deepEqual(result.record.source.preview,source.preview);assert.equal(result.status,'retained');
});
test('changed source identity never receives old metadata',()=>{
 const source={kind:'import',provider:'gmail',connectedAccountId:'acct',externalId:'row',preview:{snippet:'Old'}};
 for(const changed of [{provider:'statement'},{connectedAccountId:'new-account'},{externalId:'new-row'}]){
 const current={...changed};const result=reconcileSourceReadback({id:'money',source},{id:'money',source:current});
 assert.deepEqual(result.record.source,current);assert.notEqual(result.status,'retained');
 }
 assert.throws(()=>reconcileSourceReadback({id:'same',entity:'notes',source},{id:'same',entity:'finances'}));
});

test('explicit source clearing does not resurrect historical evidence',()=>{
 const previous={id:'money',source:{kind:'import',externalId:'old',preview:{snippet:'old'}}};
 assert.equal(reconcileSourceReadback(previous,{id:'money',source:null}).record.source,null);
 const result=reconcileSourceReadback(previous,{id:'money',source:{...previous.source,preview:null}});
 assert.equal(result.record.source.preview,null);assert.equal(result.status,'read');
});
