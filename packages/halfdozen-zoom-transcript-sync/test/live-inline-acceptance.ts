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
import { initSchema } from '../src/db.ts';
const fixtureId='40201918-7ac5-818b-a035-fcb4d41bbc0d';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const packageRoot=fileURLToPath(new URL('../',import.meta.url));
const stateDir=`${root}/.cache/zoom-inline-live-fixture`, stateFile=`${stateDir}/receipt.json`;
assert.equal(process.argv[2],'--approved-single-child');
mkdirSync(stateDir,{recursive:true});
let receipt:any=existsSync(stateFile)?JSON.parse(readFileSync(stateFile,'utf8')):{runId:crypto.randomUUID(),pageId:null,stats:{pageCreates:0,mutations:0,apiReads:0},requestReceipts:[],phases:[],losses:[],status:'prepared'};
function save(){writeFileSync(stateFile,JSON.stringify(receipt,null,2)+'\n');}
if(receipt.status==='passed'){console.log(JSON.stringify({status:'already_passed_no_writes',pageUrl:receipt.pageUrl}));process.exit(0);}
const allowedIds = new Set<string>(receipt.pageId ? [receipt.pageId] : []);
let lastCall = 0;
async function api(path: string, method = 'GET', body?: unknown): Promise<any> {
  const blockId = path.match(/^v1\/blocks\/([^/?]+)\/children/)?.[1];
  // Every mutation is either the single reserved fixture create or an append to its owned block tree.
  if (method === 'POST') {
    assert.equal(path, 'v1/pages'); assert.equal(receipt.pageId, null); assert.equal(receipt.stats.pageCreates, 0);
    assert.equal((body as any)?.parent?.page_id, fixtureId);
    receipt.stats.pageCreates++; save(); // Durable reservation before send. Never repeat an unknown creation.
  } else if (method === 'PATCH') {
    const id = path.match(/^v1\/blocks\/([^/?]+)/)?.[1];
    assert.ok(id && allowedIds.has(id), 'Mutation must belong to the single owned page tree');
    assert.ok(receipt.stats.mutations < 1200, 'Fixture mutation cap');
    receipt.stats.mutations++;
  } else {
    assert.equal(method, 'GET');
    const id = path.match(/^v1\/(?:blocks|pages)\/([^/?]+)/)?.[1];
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

function synthetic(n:number,version:string){return '\uFEFFWEBVTT\r\n\r\n'+Array.from({length:n},(_,i)=>`${i+1}\r\n00:${String(Math.floor(i/60)).padStart(2,'0')}:${String(i%60).padStart(2,'0')}.123 --> 01:00:00.999\r\nSynthetic cue ${i}. ${version}. Unicode 🦊. No meeting or task.\r\n\r\n`).join('');}
let inject:'append'|'update'|null=null;
const transport={list,async append(parent:string,blocks:Block[],after?:string){await api(`v1/blocks/${parent}/children`,'PATCH',{children:blocks,...(after?{after}:{})});if(inject==='append'&&after){inject=null;receipt.losses.push('committed-visible-append');save();throw Error('Synthetic hidden committed response');}},async get(id:string){return api(`v1/blocks/${id}`);},async update(id:string,block:Block){await api(`v1/blocks/${id}`,'PATCH',{[block.type]:block[block.type]});if(inject==='update'&&block.type==='paragraph'){inject=null;receipt.losses.push('committed-visible-update');save();throw Error('Synthetic hidden committed response');}},async archive(id:string){await api(`v1/blocks/${id}`,'PATCH',{archived:true});}};
let mf:any;
try{
 const parent=await api(`v1/pages/${fixtureId}`);assert.equal(parent.properties.Synthetic.checkbox,true);assert.equal(parent.parent.database_id.replace(/-/g,''),'8f646f93fdc84b438ad893125c38f8e0');
 if(!receipt.pageId){const page=await api('v1/pages','POST',{parent:{page_id:fixtureId},properties:{title:{title:[{text:{content:'SYNTHETIC inline transcript acceptance'}}]}}});receipt.pageId=page.id;receipt.pageUrl=page.url;save();console.log(JSON.stringify({phase:'created',pageUrl:page.url}));}
 const require=createRequire(realpathSync(`${packageRoot}/node_modules/wrangler/package.json`));const {Miniflare}=require('miniflare');
 mf=new Miniflare({modules:true,compatibilityDate:'2026-03-10',d1Databases:{DB:'inline-live-journal'},d1Persist:`${stateDir}/d1`,script:'export default {fetch(){return new Response("journal")}}',outboundService:()=>{throw Error('No Worker outbound permitted');}});
 const db=await mf.getD1Database('DB');await initSchema(db);const key=`inline-synthetic:${receipt.runId}`;await selectRendition(db,key,receipt.runId);
 // Rebuild allowed IDs from the owned page after process restart.
 async function tree(id:string){for(const b of await list(id))if(b.has_children)await tree(b.id);}await tree(receipt.pageId);
 async function run(raw:string){const parsed=parseTranscript(raw,'vtt'),plan=await planTranscript(parsed);for(let attempt=0;attempt<100;attempt++){const lease=await claimIngestion(db,key,receipt.runId);try{await lease.begin(plan.version);const index=await writeInlineTranscript(db,transport,lease,receipt.pageId,parsed,plan);await lease.ready(plan.version,receipt.pageId,index);return {parsed,plan,index};}catch(e){if(!(e instanceof InlineContinuation))throw e;}finally{await lease.release();}}throw Error('Continuation cap');}
 async function verify(raw:string){const parsed=parseTranscript(raw,'vtt'),plan=await planTranscript(parsed),rows=await list(receipt.pageId),wanted=inlineBlocks(parsed);assert.equal(rows.length,wanted.length+2);assert.equal(blockText(rows[0]),'📝 FULL TRANSCRIPT');assert.equal(blockText(rows.at(-1)),'Source archive');assert.deepEqual(rows.slice(1,-1).map(b=>[b.type,blockText(b)]),wanted.map(b=>[b.type,blockText(b)]));const archive=await list(rows.at(-1)!.id);let encoded='',canonical='';const versionBlocks=archive.filter(b=>blockText(b).includes(`| ${plan.version} |`));for(const artifact of plan.artifacts){const matched=versionBlocks.filter(b=>blockText(b).includes(`| ${artifact.key} |`));assert.equal(matched.length,1);const text=(await list(matched[0].id)).map(blockText).join('');assert.equal(text,artifact.chunks.join(''));if(artifact.key.startsWith('original:'))encoded+=text;else canonical+=(canonical?'\n':'')+text;}assert.equal(decodeOriginal(encoded),raw);assert.equal(canonical,plan.canonical);const state=await db.prepare('SELECT ready_version FROM transcript_ingestion WHERE meeting_key = ?').bind(key).first();assert.equal(state.ready_version,plan.version);return {version:plan.version,cues:plan.blockCount,rootBlocks:rows.length,archiveArtifacts:archive.length,exact:true,rootIds:rows.map(b=>b.id)};}
 const a=synthetic(120,'A'),b=synthetic(18,'B');
 for(const phase of [{name:'A',raw:a,loss:'append'},{name:'B',raw:b,loss:'update'},{name:'A-restored',raw:a,loss:null}] as const){if(receipt.phases.some((p:any)=>p.name===phase.name))continue;inject=phase.loss;try{await run(phase.raw);}catch(e){assert.match(String(e),/Synthetic hidden committed response/);const state=await db.prepare('SELECT ready_version FROM transcript_ingestion WHERE meeting_key = ?').bind(key).first();assert.equal(state.ready_version,null);await run(phase.raw);}const verified=await verify(phase.raw);const before=receipt.stats.mutations;await run(phase.raw);assert.equal(receipt.stats.mutations,before);receipt.phases.push({name:phase.name,...verified,repeatMutations:0});save();console.log(JSON.stringify({phase:phase.name,cues:verified.cues,exact:true,repeatMutations:0}));}
 assert.deepEqual(receipt.losses,['committed-visible-append','committed-visible-update']);receipt.status='passed';receipt.completedAt=new Date().toISOString();receipt.scope='Actual inline core, live Notion via existing CLI, local D1. No deployed credential or downstream agent acceptance.';receipt.disposition='Retained synthetic child; no permanent deletion';save();console.log(JSON.stringify({status:'passed',pageUrl:receipt.pageUrl,stats:receipt.stats}));
}catch(e){receipt.status='blocked';receipt.error=String(e).slice(0,350);save();console.error(JSON.stringify({status:'blocked',error:receipt.error,pageUrl:receipt.pageUrl}));process.exitCode=1;}finally{if(mf)await mf.dispose();}
