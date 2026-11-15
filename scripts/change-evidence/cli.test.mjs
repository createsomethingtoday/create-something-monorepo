import {test} from 'node:test';import assert from 'node:assert/strict';import {initialize,validate} from './cli.mjs';import {spawnSync} from 'node:child_process';
const valid=()=>({...initialize(),owner:'engineering',scope:'CLI',acceptance:['validates'],policy:['policy.git-light-agent-delivery.v1'],allowedActions:['local edits'],sourceRevision:'a'.repeat(40),followUp:['review']});
test('local evidence is valid without claiming release',()=>assert.deepEqual(validate(valid()),[]));
test('empty draft and malformed shapes fail closed',()=>{for(const x of [null,[],{},initialize()])assert.ok(validate(x).length)});
test('release cannot inherit local success',()=>{const r=valid();r.stage='released';assert.ok(validate(r).some(x=>x.includes('authorization')));assert.ok(validate(r).some(x=>x.includes('independent')))});
test('passed gate needs evidence',()=>{const r=valid();r.gates.functional.status='passed';assert.ok(validate(r).length)});
test('unavailable differs from zero',()=>{const r=valid();r.metrics=[{name:'cost',period:'baseline',unit:'USD',sampleSize:0,value:null,source:'pending',reason:'not collected'}];assert.deepEqual(validate(r),[]);delete r.metrics[0].reason;assert.ok(validate(r).length)});
test('CLI rejects unknown command and invalid JSON',()=>{const p=spawnSync(process.execPath,['scripts/change-evidence/cli.mjs','execute','package.json']);assert.equal(p.status,1);const q=spawnSync(process.execPath,['scripts/change-evidence/cli.mjs','validate','scripts/change-evidence/cli.mjs']);assert.equal(q.status,1)});
