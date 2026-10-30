import assert from 'node:assert/strict';import test from 'node:test';import {DatabaseSync} from 'node:sqlite';
import {publicationPlan} from '../src/publication-plan.ts';
import {PAGE_FORMAT,LEGACY_PAGE_FORMAT} from '../src/page-transcript.ts';
import {planTranscript,blockText} from '../src/indexed-transcript.ts';import {parseTranscript} from '../src/zoom.ts';
import {initSchema,discoverTranscript,getLedgerByDedupKey,markLedgerSynced} from '../src/db.ts';import {selectRendition,meetingKey,claimIngestion} from '../src/ingestion-state.ts';
import {ingestionTestExports} from '../src/index.ts';import {InlineContinuation} from '../src/inline-transcript.ts';import {syncTranscriptToNotion,publishNotionReadiness} from '../src/notion.ts';
import {ProviderSimulator,syntheticVtt} from './runtime-support.mjs';import type {Env,TranscriptCandidate,LedgerRow} from '../src/types.ts';
function database(){const sql=new DatabaseSync(':memory:');const db={prepare(query:string){let args:any[]=[];const s={bind(...values:any[]){args=values;return s;},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};},async first(){return sql.prepare(query).get(...args)??null;},async all(){return {results:sql.prepare(query).all(...args)};}};return s;}} as unknown as D1Database;return {db,sql};}
function candidate(key='new',start='2026-10-26T22:01:00.000Z'):TranscriptCandidate{return {dedupKey:key+'::primary',canonicalMeetingKey:'zoom-meeting-uuid:'+key,meetingId:'1',meetingUuid:key,meetingTitle:'Synthetic '+key,meetingDate:start.slice(0,10),startTime:start,sourceUrl:'https://synthetic.invalid/#occurrence='+key,originalSourceUrl:null,transcriptDownloadUrl:'https://synthetic.invalid/transcript/'+key,transcriptFileId:'primary',transcriptFileType:'TRANSCRIPT',transcriptFileExtension:'vtt',hostId:null};}
async function intake(db:D1Database,c:TranscriptCandidate,first='2026-10-26T22:02:00.000Z'){await discoverTranscript(db,c);await db.prepare('UPDATE transcript_sync_ledger SET first_seen_at = ? WHERE dedup_key = ?').bind(first,c.dedupKey).run();return (await getLedgerByDedupKey(db,c.dedupKey))!;}
const envBase={INDEXED_INGESTION_NOT_BEFORE:'2026-10-23T00:00:00.000Z',NOTION_DATABASE_ID:'synthetic-database',NOTION_API_KEY:'fake',ZOOM_ACCESS_TOKEN:'fake',NOTION_TRANSCRIPT_GATE_ENABLED:'true'};

async function scenario(old=false){
 const {db,sql}=database();await initSchema(db);const c=candidate(old?'existing':'new',old?'2026-10-26T21:00:00.000Z':undefined);await intake(db,c,old?'2026-10-26T21:01:00.000Z':undefined);await selectRendition(db,meetingKey(c),c.dedupKey);
 const provider=new ProviderSimulator();provider.addRecording(old?'existing':'new',c.startTime,syntheticVtt(120));let childCreates=0,loseChild=false;
 provider.onPageCreate=async(page:any)=>{page.object='page';page.parent={database_id:'synthetic-database'};page.created_time='2026-10-26T22:03:00.000Z';};
 const saved=globalThis.fetch;globalThis.fetch=async(input,init)=>{const request=new Request(input,init);if(request.method==='POST'&&new URL(request.url).pathname==='/v1/pages'){const b=await request.clone().json();if(b.parent.page_id){childCreates++;provider.mutations++;const id=provider.id();const page={object:'page',id,url:`https://www.notion.so/${id}`,parent:b.parent,properties:b.properties,created_time:'2026-10-26T22:03:00.000Z'};provider.pages.set(id,page);provider.blocks.set(id,provider.richBlocks(b.children));provider.blocks.get(b.parent.page_id).push({id,type:'child_page',child_page:{title:b.properties.title.title[0].text.content}});if(loseChild){loseChild=false;throw Error('Synthetic committed child response lost');}return Response.json(page);}}
 return provider.handle(request);};
 const env={...envBase,DB:db} as Env,payload={...c,rolloutCutoff:envBase.INDEXED_INGESTION_NOT_BEFORE,replay:false,runId:null};
 const deliver=async(replay=false)=>{for(let i=0;i<30;i++){try{return await ingestionTestExports.processTranscriptMessage(env,{...payload,replay,startTime:'2099-01-01T00:00:00.000Z'});}catch(e){if(!(e instanceof InlineContinuation))throw e;}}throw Error('continuation cap');};
 return {db,sql,c,provider,env,deliver,get childCreates(){return childCreates;},loseNextChild(){loseChild=true;},close(){globalThis.fetch=saved;sql.close();}};
}

test('actual new-meeting writer creates native child pages; partial retry, zero-write repeat and source generation gates remain',async()=>{
 const f=await scenario();try{
 f.loseNextChild();await assert.rejects(f.deliver(),/committed child response lost/);assert.equal(f.sql.prepare('SELECT ready_version FROM transcript_ingestion').get()!.ready_version,null);
 await f.deliver();const state=f.sql.prepare('SELECT * FROM transcript_ingestion').get() as any;const parsed=parseTranscript(f.provider.recordings.get('new').raw,'vtt');assert.equal(state.version,(await planTranscript(parsed,PAGE_FORMAT)).version);assert.equal(state.ready_version,state.version);
 const root=f.provider.pages.get(state.page_id);assert.ok(root.properties['Transcript Retrieval Index'].url.endsWith(state.index_block_id));assert.equal(f.provider.pages.get(state.index_block_id).object,'page');const children=f.provider.blocks.get(state.index_block_id).filter((b:any)=>b.type==='child_page');assert.ok(children.length>1);const canonical=children.map((p:any)=>f.provider.blocks.get(p.id).map(blockText).join('')).join('\n');assert.equal(canonical,parsed.plainText);
 assert.equal(f.provider.blocks.get(state.page_id).filter((b:any)=>b.type==='child_page').length,1,'lost root response reconciles without duplicates');
 const mutations=f.provider.mutations;await f.deliver(true);assert.equal(f.provider.mutations,mutations);
 f.provider.recordings.get('new').raw=syntheticVtt(120,'corrected');await f.deliver();const newer=f.sql.prepare('SELECT * FROM transcript_ingestion').get() as any;assert.notEqual(newer.version,state.version);assert.equal(f.sql.prepare('SELECT generation FROM transcript_inline_projection').get()!.generation,2);assert.equal(newer.ready_version,newer.version);
 f.provider.recordings.get('new').raw='WEBVTT\n\n';await assert.rejects(f.deliver(),/Empty/);assert.equal(f.sql.prepare('SELECT ready_version FROM transcript_ingestion').get()!.ready_version,null);assert.equal(root.properties['Transcript Ready Version'].rich_text.length,0);
 }finally{f.close();}
});


test('publication default preserves unchanged persisted formats and selects readable pages for fresh source or explicit rerun without a date fence',async()=>{
 const parsed=parseTranscript(syntheticVtt(5),'vtt');const current=await planTranscript(parsed,PAGE_FORMAT);
 assert.equal((await publicationPlan(parsed,null,false)).version,current.version);
 for(const format of ['indexed-transcript-v2',LEGACY_PAGE_FORMAT,PAGE_FORMAT]){
  const prior=await planTranscript(parsed,format);
  for(const phase of ['writing','complete'])assert.equal((await publicationPlan(parsed,{version:prior.version,phase},false)).version,prior.version);
  assert.equal((await publicationPlan(parsed,{version:prior.version,phase:'complete'},true)).version,current.version);
  assert.equal((await publicationPlan(parseTranscript(syntheticVtt(5,'correction'),'vtt'),{version:prior.version,phase:'complete'},false)).format,PAGE_FORMAT);
 }
 await assert.rejects(publicationPlan(parsed,{version:current.version,phase:'unknown'},false),/Unknown/);
});

test('unchanged scheduled legacy check makes no Notion writes; valid explicit rerun upgrades only its selected meeting, with no duplicate retry writes',async()=>{
 const f=await scenario(true);try{
  const parsed=parseTranscript(f.provider.recordings.get('existing').raw,'vtt'),old=await planTranscript(parsed);const lease=await claimIngestion(f.db,meetingKey(f.c),f.c.dedupKey);
  try{await lease.begin(old.version);const write=await syncTranscriptToNotion(f.env,f.c,parsed,old,lease);await lease.ready(old.version,write.pageId,write.indexBlockId!);await publishNotionReadiness(f.env,write,lease);await markLedgerSynced(f.db,f.c.dedupKey,write.pageId,write.pageUrl,old.version);}finally{await lease.release();}
  const before=f.provider.mutations,snapshot=structuredClone([...f.provider.blocks]);await f.deliver(false);assert.equal(f.provider.mutations,before);assert.equal(f.childCreates,0);assert.deepEqual([...f.provider.blocks],snapshot);
  await f.deliver(true);const state=f.sql.prepare('SELECT * FROM transcript_ingestion').get() as any;assert.equal(state.version,(await planTranscript(parsed,PAGE_FORMAT)).version);assert.equal(state.ready_version,state.version);assert.equal(f.sql.prepare('SELECT generation FROM transcript_inline_projection').get()!.generation,2);assert.ok(f.childCreates>1);
  const count=f.provider.mutations;await f.deliver(false);await f.deliver(true);assert.equal(f.provider.mutations,count);
 }finally{f.close();}
});
