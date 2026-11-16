import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync,writeFileSync} from 'node:fs';import {patch,MODEL} from './patch-deployed-model.mjs';
const before=readFileSync('.model-fix-evidence/plagiarism-agent.before.js','utf8');const after=readFileSync('.model-fix-evidence/plagiarism-agent.after.js','utf8');
function fn(name){const start=after.indexOf('async function '+name+'(')>=0?after.indexOf('async function '+name+'('):after.indexOf('function '+name+'(');const end=after.indexOf('\n__name('+name+',',start);assert.ok(start>=0&&end>start);return after.slice(start,end);}
test('plagiarism exact reversible patch',()=>assert.equal(patch('plagiarism-agent',before),after));
for(const structured of [true,false])test('plagiarism exact tier1 function '+(structured?'object':'string'),async()=>{
 const context=vm.createContext({console:{log(){}},runMinHashPreScreening:async()=>({cssSimilarity:0.01,classOverlap:0.01,propertySimilarity:0.01,similarCount:0,verdict:'low_similarity'}),getVisionAnalysis:async()=>null});
 vm.runInContext(fn('extractJSON')+'\n'+fn('runTier1Screening'),context);
 let rows=0,queued=0;
 const value={decision:'obvious_not',reasoning:'Unrelated synthetic pages.'};
 const env={SCREENSHOTS:{head:async()=>({})},AI:{run:async(model,input)=>{assert.equal(model,MODEL);if(structured)writeFileSync('.model-fix-evidence/plagiarism-prompt.json',JSON.stringify({model,input}));return{response:structured?value:JSON.stringify(value)}}},DB:{prepare:()=>({bind:(decision,reason,id)=>{assert.equal(decision,'obvious_not');assert.equal(id,'synthetic-only');return{run:async()=>{rows++}}}})},CASE_QUEUE:{send:async v=>{assert.equal(v.tier,2);queued++}}};
 await context.runTier1Screening({id:'synthetic-only',reporterEmail:'synthetic@example.invalid',originalUrl:'https://original.example.invalid',allegedCopyUrl:'https://copy.example.invalid',complaintText:'Synthetic fixture: pages have unrelated layout and content.'},env);
 assert.equal(rows,1);assert.equal(queued,1);
});
