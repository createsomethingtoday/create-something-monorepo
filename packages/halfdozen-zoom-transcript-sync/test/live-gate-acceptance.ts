// Explicit single synthetic child fixture approval required. Not a default test.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { planTranscript, blockText, decodeOriginal, type Block } from '../src/indexed-transcript.ts';
import { writeInlineTranscript, inlineBlocks, InlineContinuation } from '../src/inline-transcript.ts';
import { parseTranscript } from '../src/zoom.ts';
import { claimIngestion, selectRendition } from '../src/ingestion-state.ts';
import { Gate, gateCreationProperties, gateToken, propertyText } from '../src/readiness-gate.ts';
import { initSchema } from '../src/db.ts';
const fixtureId='c0391b40-a330-4c10-8cc4-3f3e65b6127f';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const packageRoot=fileURLToPath(new URL('../',import.meta.url));
const stateDir=`${root}/.cache/zoom-native-gate`, stateFile=`${stateDir}/receipt.json`;
assert.equal(process.argv[2],'--approved-native-gate');
const phase=process.argv[3]; assert.ok(['prepare','finish','stale','clear'].includes(phase));
mkdirSync(stateDir,{recursive:true});
let receipt:any=existsSync(stateFile)?JSON.parse(readFileSync(stateFile,'utf8')):{runId:crypto.randomUUID(),pageId:null,stats:{pageCreates:0,mutations:0,apiReads:0},requestReceipts:[],phases:[],losses:[],status:'prepared'};
if (receipt.fixtureId) assert.equal(receipt.fixtureId, fixtureId);
else { assert.equal(receipt.pageId, null); receipt.fixtureId = fixtureId; }
assert.match(receipt.runId, /^[a-f0-9-]{36}$/);
function save(){writeFileSync(stateFile,JSON.stringify(receipt,null,2)+'\n');}
if(receipt.phases.includes(phase)){console.log(JSON.stringify({phase,status:'already_done_no_writes',pageUrl:receipt.pageUrl}));process.exit(0);}
const allowedIds = new Set<string>(receipt.pageId ? [receipt.pageId] : []);
let lastCall = 0;
async function api(path: string, method = 'GET', body?: unknown): Promise<any> {
  const blockId = path.match(/^v1\/blocks\/([^/?]+)\/children/)?.[1];
  // Every mutation is either the single reserved fixture create or an append to its owned block tree.
  if (method === 'POST') {
    assert.equal(path, 'v1/pages'); assert.equal(receipt.pageId, null); assert.equal(receipt.stats.pageCreates, 0);
    assert.equal((body as any)?.parent?.database_id, fixtureId);
    receipt.stats.pageCreates++; save(); // Durable reservation before send. Never repeat an unknown creation.
  } else if (method === 'PATCH') {
    const id = path.match(/^v1\/(?:blocks|pages|databases)\/([^/?]+)/)?.[1];
    assert.ok(id && allowedIds.has(id), 'Mutation must belong to the single owned page tree');
    assert.ok(receipt.stats.mutations < 1200, 'Fixture mutation cap');
    receipt.stats.mutations++;
  } else {
    assert.equal(method, 'GET');
    const id = path.match(/^v1\/(?:blocks|pages|databases)\/([^/?]+)/)?.[1];
    assert.ok(id && (allowedIds.has(id) || id === fixtureId), 'Read outside fixture');
    receipt.stats.apiReads++;
  }
  const delay = 400 - (Date.now() - lastCall); if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay)); lastCall = Date.now();
  const args = ['api', path, '--method', method, '--notion-version', '2022-06-28'];
  if (body !== undefined) args.push('--data', '@-');
  const result: any = await new Promise((resolve, reject) => {
    const child = spawn('/opt/homebrew/bin/ntn', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = ''; const timer = setTimeout(() => child.kill('SIGTERM'), 25000);
    child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); if (code !== 0) reject(new Error(`Notion CLI ${method} failed (${code}): ${stderr.slice(0, 350)}`));
      else { try { resolve(JSON.parse(stdout)); } catch { reject(new Error('Unexpected CLI response format; stop and reconcile')); } } });
    child.stdin.end(body === undefined ? undefined : JSON.stringify(body));
  });
  receipt.requestReceipts.push({ method, path, requestId: result.request_id ?? null, at: new Date().toISOString() }); save();
  if (typeof result.id === 'string' && method === 'POST') allowedIds.add(result.id);
  if (blockId) for (const child of result.results ?? []) if (typeof child.id === 'string') allowedIds.add(child.id);
  return result;
}
async function list(parent: string): Promise<Block[]> {
  assert.ok(allowedIds.has(parent)); const blocks: Block[] = []; let cursor: string | undefined;
  do {
    const suffix = cursor ? `?start_cursor=${encodeURIComponent(cursor)}&page_size=100` : '?page_size=100';
    const page = await api(`v1/blocks/${parent}/children${suffix}`);
    blocks.push(...page.results);
    if (page.has_more) assert.ok(page.next_cursor && page.next_cursor !== cursor, 'Incomplete pagination');
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

function synthetic(){return '\uFEFFWEBVTT\r\n\r\n'+Array.from({length:120},(_,i)=>`${i+1}\r\n00:${String(Math.floor(i/60)).padStart(2,'0')}:${String(i%60).padStart(2,'0')}.123 --> 01:00:00.999\r\nFillip Gutman: GATE-CUE-${String(i).padStart(4,'0')} ${i===0?'FIRST-SENTINEL-ORCHID':i===60?'MIDDLE-SENTINEL-CEDAR':i===119?'FINAL-SENTINEL-OTTER':''}. ${'Synthetic transcript retrieval sample. No task or real meeting. '.repeat(11)}\r\n\r\n`).join('');}
let inject:'append'|'update'|null=null;
const transport={list,async append(parent:string,blocks:Block[],after?:string){await api(`v1/blocks/${parent}/children`,'PATCH',{children:blocks,...(after?{after}:{})});if(inject==='append'&&after){inject=null;receipt.losses.push('committed-visible-append');save();throw Error('Synthetic hidden committed response');}},async get(id:string){return api(`v1/blocks/${id}`);},async update(id:string,block:Block){await api(`v1/blocks/${id}`,'PATCH',{[block.type]:block[block.type]});if(inject==='update'&&block.type==='paragraph'){inject=null;receipt.losses.push('committed-visible-update');save();throw Error('Synthetic hidden committed response');}},async archive(id:string){await api(`v1/blocks/${id}`,'PATCH',{archived:true});}};
let mf:any;
try{
 const parent=await api(`v1/databases/${fixtureId}`);assert.equal(parent.parent.page_id.replace(/-/g,''),'402019187ac5818ba035fcb4d41bbc0d');
 const raw=synthetic(), parsed=parseTranscript(raw,'vtt'), plan=await planTranscript(parsed);
 if(!receipt.pageId){assert.equal(phase,'prepare');const page=await api('v1/pages','POST',{parent:{database_id:fixtureId},properties:{Item:{title:[{text:{content:'SYNTHETIC native readiness and full retrieval acceptance'}}]},Type:{select:{name:'Meeting'}},Categorized:{checkbox:false},Reviewed:{checkbox:true},Team:{people:[{id:'23ed872b-594c-8174-ad69-0002f60c7685'}]},'Page Notes':{rich_text:[{text:{content:'Human-owned synthetic note. Preserve this.'}}]},'Attendees / Source Notes':{rich_text:[{text:{content:'Fillip Gutman. Synthetic fixture only.'}}]},...gateCreationProperties(plan.version)}});receipt.pageId=page.id;receipt.pageUrl=page.url;receipt.originalToken=gateToken(plan.version,1);save();console.log(JSON.stringify({phase:'created',pageUrl:page.url}));}
 const require=createRequire(realpathSync(`${packageRoot}/node_modules/wrangler/package.json`));const {Miniflare}=require('miniflare');
 mf=new Miniflare({modules:true,compatibilityDate:'2026-03-10',d1Databases:{DB:'inline-live-journal'},d1Persist:`${stateDir}/d1`,script:'export default {fetch(){return new Response("journal")}}',outboundService:()=>{throw Error('No Worker outbound permitted');}});
 const db=await mf.getD1Database('DB');await initSchema(db);const key=`inline-synthetic:${receipt.runId}`;await selectRendition(db,key,receipt.runId);
 // A stored receipt is not authority to mutate a page in another database.
 const owned = await api(`v1/pages/${receipt.pageId}`);
 assert.equal(owned.parent.database_id.replace(/-/g,''), fixtureId.replace(/-/g,''));
 assert.equal(owned.archived, false); assert.equal(owned.in_trash, false);
 // Rebuild allowed IDs only after checking the exact page's parent.
 async function tree(id:string){for(const b of await list(id))if(b.has_children)await tree(b.id);}await tree(receipt.pageId);
 const pageTransport={async getPage(id:string){return api(`v1/pages/${id}`);},async updatePage(id:string,properties:any){return api(`v1/pages/${id}`,'PATCH',{properties});}};
 async function run(raw:string,publish=true){const parsed=parseTranscript(raw,'vtt'),plan=await planTranscript(parsed);for(let attempt=0;attempt<100;attempt++){const lease=await claimIngestion(db,key,receipt.runId);try{await lease.begin(plan.version);const gate=new Gate(db,pageTransport,lease,receipt.pageId);const index=await writeInlineTranscript(db,transport,lease,receipt.pageId,parsed,plan,undefined,async(v,g,w)=>gate.prepare(gateToken(v,g),w));await lease.ready(plan.version,receipt.pageId,index);if(publish){const projection=await db.prepare('SELECT generation,phase FROM transcript_inline_projection WHERE page_id = ?').bind(receipt.pageId).first();await gate.publish(gateToken(plan.version,projection.generation),index,async()=>{await lease.assertOwner();const state=await db.prepare('SELECT ready_version FROM transcript_ingestion WHERE meeting_key = ?').bind(key).first();assert.equal(state.ready_version,plan.version);assert.equal(projection.phase,'complete');});}return {parsed,plan,index};}catch(e){if(!(e instanceof InlineContinuation))throw e;}finally{await lease.release();}}throw Error('Continuation cap');}
 async function verify(raw:string){const parsed=parseTranscript(raw,'vtt'),plan=await planTranscript(parsed),rows=await list(receipt.pageId),wanted=inlineBlocks(parsed);assert.equal(rows.length,wanted.length+2);assert.equal(blockText(rows[0]),'📝 FULL TRANSCRIPT');assert.equal(blockText(rows.at(-1)),'Source archive');assert.deepEqual(rows.slice(1,-1).map(b=>[b.type,blockText(b)]),wanted.map(b=>[b.type,blockText(b)]));const archive=await list(rows.at(-1)!.id);let encoded='',canonical='';const versionBlocks=archive.filter(b=>blockText(b).includes(`| ${plan.version} |`));for(const artifact of plan.artifacts){const matched=versionBlocks.filter(b=>blockText(b).includes(`| ${artifact.key} |`));assert.equal(matched.length,1);const text=(await list(matched[0].id)).map(blockText).join('');assert.equal(text,artifact.chunks.join(''));if(artifact.key.startsWith('original:'))encoded+=text;else canonical+=(canonical?'\n':'')+text;}assert.equal(decodeOriginal(encoded),raw);assert.equal(canonical,plan.canonical);const state=await db.prepare('SELECT ready_version FROM transcript_ingestion WHERE meeting_key = ?').bind(key).first();assert.equal(state.ready_version,plan.version);return {version:plan.version,cues:plan.blockCount,rootBlocks:rows.length,archiveArtifacts:archive.length,exact:true,rootIds:rows.map(b=>b.id)};}
 if(phase==='prepare'){
   inject='append'; let lost=false; try{await run(raw,false);}catch(e){assert.match(String(e),/Synthetic hidden committed response/);lost=true;}assert.ok(lost,'Must pause at a known committed partial append');
   const page=await pageTransport.getPage(receipt.pageId);assert.equal(propertyText(page.properties['Transcript Ready Version']),'');assert.equal(page.properties.Categorized.checkbox,false);const state=await db.prepare('SELECT ready_version FROM transcript_ingestion WHERE meeting_key = ?').bind(key).first();assert.equal(state.ready_version,null);receipt.partialAt=new Date().toISOString();
 }else if(phase==='finish'){
   assert.ok(receipt.phases.includes('prepare'));assert.ok(Date.now()-Date.parse(receipt.partialAt)>=90_000,'Observe incomplete fixture for at least 90 seconds');
   const before=await pageTransport.getPage(receipt.pageId);assert.equal(before.properties.Categorized.checkbox,false,'Unexpected early native completion; stop');assert.equal(propertyText(before.properties['Categorized Transcript Version']),'');
   await run(raw);receipt.integrity=await verify(raw);const mutations=receipt.stats.mutations;await run(raw);assert.equal(receipt.stats.mutations,mutations);receipt.repeatMutations=0;
 }else if(phase==='stale'){
   const page=await pageTransport.getPage(receipt.pageId);assert.equal(page.properties.Categorized.checkbox,true,'First native run has not completed');assert.equal(propertyText(page.properties['Categorized Transcript Version']),receipt.originalToken);
   receipt.successProperties=page.properties;save();const lease=await claimIngestion(db,key,receipt.runId);try{const gate=new Gate(db,pageTransport,lease,receipt.pageId);await gate.prepare(gateToken('b'.repeat(64),2),true);await pageTransport.updatePage(receipt.pageId,{'Transcript Ready Version':{rich_text:[{text:{content:receipt.originalToken}}]},'Transcript Retrieval Index':page.properties['Transcript Retrieval Index']});}finally{await lease.release();}
 }else{
   const page=await pageTransport.getPage(receipt.pageId);assert.equal(page.properties.Categorized.checkbox,true);assert.equal(propertyText(page.properties['Categorized Transcript Version']),receipt.originalToken);assert.equal(page.properties.Reviewed.checkbox,true);assert.deepEqual(page.properties.Team.people.map((x:any)=>x.id),receipt.successProperties.Team.people.map((x:any)=>x.id));assert.equal(propertyText(page.properties['Page Notes']),propertyText(receipt.successProperties['Page Notes']));
   const lease=await claimIngestion(db,key,receipt.runId);try{await new Gate(db,pageTransport,lease,receipt.pageId).invalidate();await lease.invalidateReady();}finally{await lease.release();}
 }
 receipt.phases.push(phase);receipt.status=phase;receipt.scope='Actual indexed/inline and gate cores, live Notion via existing CLI, local D1; native agent acceptance observed separately.';receipt.disposition='Retained isolated synthetic fixture; no permanent deletion';save();console.log(JSON.stringify({phase,pageUrl:receipt.pageUrl,stats:receipt.stats,integrity:receipt.integrity?{cues:receipt.integrity.cues,exact:receipt.integrity.exact}:null}));
}catch(e){receipt.status='blocked';receipt.error=String(e).slice(0,350);save();console.error(JSON.stringify({status:'blocked',error:receipt.error,pageUrl:receipt.pageUrl}));process.exitCode=1;}finally{if(mf)await mf.dispose();}
