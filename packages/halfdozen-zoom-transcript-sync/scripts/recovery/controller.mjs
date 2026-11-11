import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {WEEKLY,sha,inspectPending,validateEvidence,runPendingRecovery} from './pending.mjs';
import {createLiveAdapter} from './live-adapter.mjs';

const [mode,directory,plannerPath,evidencePath]=process.argv.slice(2);
assert.ok(['prepare','inspect','admit','apply','release'].includes(mode),'prepare|inspect|admit|apply|release capture-directory planner-module terminal-evidence-json');
const dir=resolve(directory),read=name=>JSON.parse(readFileSync(`${dir}/${name}`,'utf8'));
const save=(name,data)=>writeFileSync(`${dir}/${name}`,JSON.stringify(data,null,2),{flag:'wx',mode:0o600});
const planner=await import(pathToFileURL(resolve(plannerPath)).href);
const evidence=JSON.parse(readFileSync(resolve(evidencePath),'utf8'));
if(mode==='prepare') {
  const projection=read('projection.json'), m=JSON.parse(projection.manifest), lists=read('all-lists.json'), page=read('metadata-before.json'), ingestion=read('ingestion.json')[0], schema=read('schema.json');
  assert.deepEqual(read('metadata-after.json').properties,page.properties);
  for(const key of ['owner','expires_at','ready_version','index_block_id','verified_at']) assert.equal(ingestion[key],null);
  const original=lists[m.archive].filter(b=>planner.blockText(b).startsWith(`Zoom indexed v2 | ${WEEKLY.version} | original:`)).sort((a,b)=>Number(planner.blockText(a).match(/original:(\d+)/)[1])-Number(planner.blockText(b).match(/original:(\d+)/)[1]));
  assert.equal(original.length,23);
  const encoded=original.map(b=>lists[b.id].map(planner.blockText).join('')).join('');
  const bytes=Buffer.from(encoded,'base64'); assert.equal(bytes.toString('base64'),encoded);
  const raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  const meta=blocks=>blocks.map(b=>({id:b.id,type:b.type,text:b.type==='child_page'?b.child_page.title:planner.blockText(b),has_children:b.has_children,archived:b.archived??false,in_trash:b.in_trash??false}));
  const profile={...WEEKLY,archiveId:m.archive,manifest:projection.manifest,manifestSha256:sha(projection.manifest),properties:JSON.stringify(page.properties),sourceBytes:bytes.length,sourceSha256:sha(bytes),meetingKey:ingestion.meeting_key,selectedKey:ingestion.selected_key,owner:randomUUID(),deadline:Date.now()+900000,expiresAt:new Date(Date.now()+1200000).toISOString(),archiveMetadata:meta(lists[m.archive]),readerMetadata:meta(lists[m.readerIndexes[0]]),schemaSha256:sha(JSON.stringify(schema)),evidenceSha256:sha(JSON.stringify(evidence)),historicalScriptVersion:evidence.event.scriptVersion};
  profile.journal=read('journal-full.json').sort((a,b)=>a.operation_key<b.operation_key?-1:a.operation_key>b.operation_key?1:0);
  validateEvidence(profile,evidence);
  const captured={getPage:async()=>page,listBlockChildren:async id=>({results:lists[id],has_more:false,next_cursor:null})};
  const result=await inspectPending({profile,raw,planner,adapter:captured}); assert.equal(result.status,'absent');
  mkdirSync(`${dir}/recovery`,{mode:0o700});
  writeFileSync(`${dir}/recovery/source.vtt`,bytes,{flag:'wx',mode:0o600});
  save('recovery/profile.json',profile);
  console.log(JSON.stringify({status:'prepared-offline',sourceSha256:profile.sourceSha256,sourceBytes:bytes.length,existing:800,pending:80}));
} else {
  const profile=read('recovery/profile.json'),raw=readFileSync(`${dir}/recovery/source.vtt`,'utf8'),credentials=await import(pathToFileURL(`${dir}/live-adapters.mjs`).href);
  const adapter=createLiveAdapter({...credentials,profile,schema:read('schema.json')});
  const input={profile,raw,planner,evidence,adapter}; validateEvidence(profile,evidence);
  if(mode==='inspect') {await adapter.preflight();const result=await inspectPending(input);await adapter.preflight(); console.log(JSON.stringify({status:result.status,ids:result.ids}));}
  if(mode==='admit') {assert.ok(process.argv.includes('--execute-authorized'),'Explicit execution flag required');await adapter.preflight();assert.equal((await inspectPending(input)).status,'absent');await adapter.admit();save('recovery/admitted.json',{owner:profile.owner,at:new Date().toISOString()});console.log('admitted');}
  if(mode==='apply') {assert.ok(process.argv.includes('--execute-authorized'),'Explicit execution flag required');const result=await runPendingRecovery(input);save('recovery/result.json',result);console.log(JSON.stringify(result));}
  if(mode==='release') {
    assert.ok(process.argv.includes('--execute-authorized'),'Explicit execution flag required');
    const expected=read('recovery/result.json'); assert.equal(expected.status,'verified');
    await adapter.guard();const result=await inspectPending(input);assert.equal(result.status,'present-exact');assert.deepEqual(result.ids,expected.receipt.ids);
    const key=`${profile.archiveId}:${profile.version}:repair-inline:${sha(profile.oldKey)}`,attempt=await adapter.getAttempt(key);
    assert.equal(attempt.status,'verified');assert.deepEqual(JSON.parse(attempt.receipt).ids,result.ids);
    await adapter.release(); save('recovery/released.json',{status:'released-for-native-adoption',ids:result.ids,readyPublished:false});console.log('released-for-native-adoption');
  }
}
