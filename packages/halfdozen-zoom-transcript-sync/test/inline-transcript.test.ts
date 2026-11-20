import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { INLINE_SCHEMA, InlineContinuation, writeInlineTranscript, inlineBlocks, type InlineTransport } from '../src/inline-transcript.ts';
import { blockText, planTranscript, type Block, type WriteJournal } from '../src/indexed-transcript.ts';
import { parseTranscript } from '../src/zoom.ts';
function db() {
 const sql = new DatabaseSync(':memory:'); sql.exec(INLINE_SCHEMA);
 return { prepare(query: string) { let args: any[]=[]; const s={bind(...a:any[]){args=a;return s;},async first(){return sql.prepare(query).get(...args)??null;},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes)}};}};return s;} } as unknown as D1Database;
}
function raw(n: number, suffix='') { return 'WEBVTT\n\n'+Array.from({length:n},(_,i)=>`${i+1}\n00:${String(Math.floor(i/60)).padStart(2,'0')}:${String(i%60).padStart(2,'0')}.000 --> 02:59:59.000\nRepeated text ${i%3} ${suffix}\n\n`).join(''); }
class Provider implements InlineTransport {
 children=new Map<string,Block[]>([['page',[]]]); records=new Map<string,Block>(); sequence=0; sends=0; getReads=0;
 failAt=Infinity; before=false; kinds:string[]=[];
 async mutate(kind:string, fn:()=>void){this.sends++;this.kinds.push(kind);if(this.sends===this.failAt&&this.before)throw Error('unknown before commit');fn();if(this.sends===this.failAt)throw Error('lost response');}
 list=async(id:string)=>structuredClone(this.children.get(id)??[]);
 get=async(id:string)=>{this.getReads++;return structuredClone(this.records.get(id)!);};
 materialize=(input:Block):Block=>{const b=structuredClone(input);b.id=`id-${++this.sequence}`;const kids=b[b.type].children??[];delete b[b.type].children;b.has_children=kids.length>0;this.records.set(b.id,b);this.children.set(b.id,kids.map(this.materialize));return b;};
 append=async(parent:string,blocks:Block[],after?:string)=>{assert.ok(Buffer.byteLength(JSON.stringify({children:blocks,...(after?{after}:{})}))<=400000);return this.mutate('append',()=>{const nodes=this.children.get(parent)!;let at=after?nodes.findIndex(b=>b.id===after)+1:nodes.length;if(after)assert.ok(at>0);nodes.splice(at,0,...blocks.map(this.materialize));});};
 update=async(id:string,block:Block)=>this.mutate('update',()=>{const b=this.records.get(id)!;assert.equal(b.type,block.type);b[b.type]=structuredClone(block[block.type]);});
 archive=async(id:string)=>this.mutate('archive',()=>{this.records.get(id)!.archived=true;for(const nodes of this.children.values()){const at=nodes.findIndex(b=>b.id===id);if(at>=0)nodes.splice(at,1);}});
}
function journal():WriteJournal {const sent=new Set<string>();return {async assertOwner(){},async reserve(k){if(sent.has(k))return false;sent.add(k);return true;}};}
async function write(store:D1Database,p:Provider,j:WriteJournal,text:string,ext='vtt') {const parsed=parseTranscript(text,ext);const plan = await planTranscript(parsed); for (let i=0;i<1000;i++) { try { return await writeInlineTranscript(store,p,j,'page',parsed,plan); } catch(error) { if (!(error instanceof InlineContinuation)) throw error; } } throw Error('Continuation budget');}
function check(p:Provider,text:string,ext='vtt') {const roots=p.children.get('page')!;const expected=inlineBlocks(parseTranscript(text,ext));assert.equal(roots.length,expected.length+2);assert.equal(blockText(roots[0]!), '📝 FULL TRANSCRIPT');assert.equal(blockText(roots.at(-1)!), 'Source archive');assert.equal(roots.filter(b=>blockText(b)==='📝 FULL TRANSCRIPT').length,1);assert.deepEqual(roots.slice(1,-1).map(b=>[b.type,blockText(b)]),expected.map(b=>[b.type,blockText(b)]));assert.ok(roots.slice(0,-1).every(b=>b.type!=='toggle'));}
test('inline long transcript is readable in one section, archive secondary; unchanged retry sends zero writes',async()=>{const s=db(),p=new Provider(),j=journal(),text=raw(978);await write(s,p,j,text);check(p,text);assert.equal(p.children.get('page')!.length,1958);const before=p.sends;await write(s,p,j,text);assert.equal(p.sends,before);});
test('inline source correction grows, shrinks and restores A without duplicate sections',async()=>{const s=db(),p=new Provider(),j=journal();for(const text of [raw(20),raw(80,'x'.repeat(2000)),raw(3),raw(20)]){await write(s,p,j,text);check(p,text);}});
test('plain text preserves paragraph spacing without invented timestamps',async()=>{const s=db(),p=new Provider(),j=journal();await write(s,p,j,'first paragraph\n\nsecond paragraph','txt');check(p,'first paragraph\n\nsecond paragraph','txt');});
test('lost responses at every initial mutation reconcile without second sends',async()=>{const probe=new Provider();await write(db(),probe,journal(),raw(85));for(let at=1;at<=probe.sends;at++){const s=db(),p=new Provider(),j=journal();p.failAt=at;await assert.rejects(write(s,p,j,raw(85)),/lost response/);const sends=p.sends;p.failAt=Infinity;await write(s,p,j,raw(85));check(p,raw(85));assert.equal(p.sends,probe.sends,`send count at ${at}, interrupted at ${sends}`);}});
test('lost response at every correction mutation, including surplus archive, reconciles',async()=>{for(const next of [raw(80,'corrected'),raw(3)]){const probe=new Provider();const ps=db(),pj=journal();await write(ps,probe,pj,raw(20));const base=probe.sends;await write(ps,probe,pj,next);for(let at=base+1;at<=probe.sends;at++){const s=db(),p=new Provider(),j=journal();await write(s,p,j,raw(20));p.failAt=at;await assert.rejects(write(s,p,j,next),/lost response/);p.failAt=Infinity;await write(s,p,j,next);check(p,next);assert.equal(p.sends,probe.sends,`correction send count ${at}`);}}});
test('unknown absent initial write blocks retries and any later source version',async()=>{const s=db(),p=new Provider(),j=journal();p.failAt=1;p.before=true;await assert.rejects(write(s,p,j,raw(20)));const count=p.sends;p.failAt=Infinity;await assert.rejects(write(s,p,j,raw(20)),/Uncertain/);await assert.rejects(write(s,p,j,raw(21)),/unresolved/);assert.equal(p.sends,count);});
test('existing untracked page is never converted automatically',async()=>{const s=db(),p=new Provider();p.children.get('page')!.push(p.materialize({type:'paragraph',paragraph:{rich_text:[{text:{content:'Existing operator content'}}]}}));await assert.rejects(write(s,p,journal(),raw(20)),/explicit inline migration/);assert.equal(p.sends,0);});

test('a newer source reconciles the committed prior projection from its exact preserved source',async()=>{
 const s=db(),p=new Provider(),j=journal();await write(s,p,j,raw(20));
 const probe=new Provider();const ps=db(),pj=journal();await write(ps,probe,pj,raw(20));const base=probe.sends;await write(ps,probe,pj,raw(20,'B'));
 const updateAt=probe.kinds.findIndex((kind,i)=>i>=base&&kind==='update')+1;
 p.failAt=updateAt;await assert.rejects(write(s,p,j,raw(20,'B')),/lost response/);
 p.failAt=Infinity;await write(s,p,j,raw(25,'C'));check(p,raw(25,'C'));
});
test('unchanged long projection uses paginated root snapshots instead of per-slot GETs',async()=>{
 const s=db(),p=new Provider(),j=journal();const text=raw(978);await write(s,p,j,text);const before=p.getReads;
 await write(s,p,j,text);assert.equal(p.getReads,before);
});

test('Unicode-heavy inline batches obey a byte budget as well as a block count',async()=>{const s=db(),p=new Provider(),j=journal();const text=raw(50,'🦊'.repeat(2500));await write(s,p,j,text);check(p,text);});
test('headerless VTT pending correction can reconcile before a newer source',async()=>{
 const a=raw(20).replace(/^WEBVTT\n\n/,''),b=raw(20,'B').replace(/^WEBVTT\n\n/,''),c=raw(25,'C');
 const s=db(),p=new Provider(),j=journal();await write(s,p,j,a);const probe=new Provider(),ps=db(),pj=journal();await write(ps,probe,pj,a);const base=probe.sends;await write(ps,probe,pj,b);p.failAt=probe.kinds.findIndex((kind,i)=>i>=base&&kind==='update')+1;
 await assert.rejects(write(s,p,j,b),/lost response/);p.failAt=Infinity;await write(s,p,j,c);check(p,c);
});

test('partial inline content keeps the updating heading until exact reconstruction',async()=>{
 const s=db(),p=new Provider(),j=journal(),text=raw(201);
 const parsed=parseTranscript(text,'vtt'),plan=await planTranscript(parsed);
 const update=p.update;
 p.update=async(id,block)=>{
  if(blockText(block)==='📝 FULL TRANSCRIPT') {
   assert.deepEqual(p.children.get('page')!.slice(1,-1).map(b=>[b.type,blockText(b)]),inlineBlocks(parsed).map(b=>[b.type,blockText(b)]));
  }
  await update(id,block);
 };
 await assert.rejects(writeInlineTranscript(s,p,j,'page',parsed,plan),InlineContinuation);
 assert.equal(blockText(p.children.get('page')![0]!), '📝 FULL TRANSCRIPT (updating)');
 assert.ok(p.children.get('page')!.length<inlineBlocks(parsed).length+2);
 await write(s,p,j,text);check(p,text);
});

test('four-batch finalization checkpoint resumes without a heading deadlock',async()=>{
 const s=db(),p=new Provider(),j=journal(),text=raw(160),parsed=parseTranscript(text,'vtt'),plan=await planTranscript(parsed);
 await assert.rejects(writeInlineTranscript(s,p,j,'page',parsed,plan),InlineContinuation);
 const pending=await s.prepare('SELECT phase, manifest FROM transcript_inline_projection WHERE page_id = ?').bind('page').first<{phase:string;manifest:string}>();
 assert.equal(pending!.phase,'writing');assert.equal(JSON.parse(pending!.manifest).finishing,true);
 assert.equal(p.children.get('page')!.length,322);
 assert.equal(blockText(p.children.get('page')![0]!), '📝 FULL TRANSCRIPT (updating)');
 const sends=p.sends;await write(s,p,j,text);check(p,text);assert.equal(p.sends,sends+1);
 const before=p.sends;await write(s,p,j,text);assert.equal(p.sends,before);
});

test('committed final-heading response loss reconciles once and permits B then A generations',async()=>{
 const text=raw(2,'A'),probe=new Provider();await write(db(),probe,journal(),text);
 assert.equal(probe.kinds.at(-1),'update');
 const s=db(),p=new Provider(),j=journal();p.failAt=probe.sends;
 await assert.rejects(write(s,p,j,text),/lost response/);
 assert.equal(blockText(p.children.get('page')![0]!), '📝 FULL TRANSCRIPT');
 const sends=p.sends;p.failAt=Infinity;await write(s,p,j,text);check(p,text);assert.equal(p.sends,sends);
 await write(s,p,j,raw(3,'B'));await write(s,p,j,text);check(p,text);
 const row=await s.prepare('SELECT phase, generation FROM transcript_inline_projection WHERE page_id = ?').bind('page').first<{phase:string;generation:number}>();
 assert.equal(row!.phase,'complete');assert.equal(row!.generation,3);
});

test('absent uncertain final-heading update is never resent and blocks a newer generation',async()=>{
 const text=raw(2,'A'),probe=new Provider();await write(db(),probe,journal(),text);
 const s=db(),p=new Provider(),j=journal();p.failAt=probe.sends;p.before=true;
 await assert.rejects(write(s,p,j,text),/unknown before commit/);
 assert.equal(blockText(p.children.get('page')![0]!), '📝 FULL TRANSCRIPT (updating)');
 const sends=p.sends;p.failAt=Infinity;
 await assert.rejects(write(s,p,j,text),/Uncertain inline heading/);
 await assert.rejects(write(s,p,j,raw(3,'B')),/Uncertain inline heading/);
 assert.equal(p.sends,sends);
 const row=await s.prepare('SELECT phase, generation FROM transcript_inline_projection WHERE page_id = ?').bind('page').first<{phase:string;generation:number}>();
 assert.equal(row!.phase,'writing');assert.equal(row!.generation,1);
});

test('lost updating-heading response preserves the intermediate source for later correction',async()=>{
 const a=raw(2,'A'),b=raw(3,'B'),c=raw(4,'C');
 const probe=new Provider(),ps=db(),pj=journal();await write(ps,probe,pj,a);const base=probe.sends;await write(ps,probe,pj,b);
 const updatingAt=probe.kinds.findIndex((kind,i)=>i>=base&&kind==='update')+1;
 const s=db(),p=new Provider(),j=journal();await write(s,p,j,a);p.failAt=updatingAt;
 await assert.rejects(write(s,p,j,b),/lost response/);
 assert.equal(blockText(p.children.get('page')![0]!), '📝 FULL TRANSCRIPT (updating)');
 p.failAt=Infinity;await write(s,p,j,c);check(p,c);
});

test('resuming an unsent pending append consumes the shared batch budget',async()=>{
 const s=db(),p=new Provider(),base=journal(),text=raw(201),parsed=parseTranscript(text,'vtt'),plan=await planTranscript(parsed);
 let pause=true;
 const j:WriteJournal={assertOwner:()=>base.assertOwner(),async reserve(key){
  if(pause&&key.includes(':append:')){pause=false;throw new Error('pause before append reservation');}
  return base.reserve(key);
 }};
 await assert.rejects(writeInlineTranscript(s,p,j,'page',parsed,plan),/pause before append reservation/);
 const sends=p.sends,budget={changes:0,appendedBatches:3};
 await assert.rejects(writeInlineTranscript(s,p,j,'page',parsed,plan,budget),InlineContinuation);
 assert.equal(budget.appendedBatches,4);assert.equal(p.sends,sends+1);assert.equal(p.children.get('page')!.length,82);
 assert.equal(blockText(p.children.get('page')![0]!), '📝 FULL TRANSCRIPT (updating)');
 await write(s,p,j,text);check(p,text);
});

test('page representation advances generation, preserves v2 archive and inline body, and supports rollback without token reuse', async()=>{
 const {PAGE_FORMAT}=await import('../src/page-transcript.ts');
 class Pages extends Provider {
  pages=new Map<string,Block>();
  createChildPage=async(parent:string,title:string,children:Block[])=>{
   const id=String(++this.sequence).padStart(32,'0'),page={object:'page',id,url:`https://www.notion.so/Returned-${id}`,parent:{page_id:parent},properties:{title:{title:[{text:{content:title}}]}}};
   await this.mutate('create-page',()=>{this.pages.set(id,page);this.children.set(id,children.map(this.materialize));this.children.get(parent)!.push({id,type:'child_page',child_page:{title}});});return page;
  };
  getPage=async(id:string)=>structuredClone(this.pages.get(id)!);
 }
 const store=db(),p=new Pages(),j=journal(),text=raw(627),parsed=parseTranscript(text,'vtt');
 const old=await planTranscript(parsed),next=await planTranscript(parsed,PAGE_FORMAT);
 await write(store,p,j,text); const oldArchive=structuredClone(p.children.get(p.children.get('page')!.at(-1)!.id));
 const generation=async()=>await store.prepare('SELECT generation, version FROM transcript_inline_projection WHERE page_id = ?').bind('page').first<any>();
 assert.equal((await generation()).generation,1);
 let index='';for(let i=0;i<20;i++){try{index=await writeInlineTranscript(store,p,j,'page',parsed,next);break;}catch(e){if(!(e instanceof InlineContinuation))throw e;}}
 assert.ok(p.pages.has(index)); assert.equal((await generation()).generation,2);assert.equal((await generation()).version,next.version);
 const rows=p.children.get('page')!,archive=rows.find(b=>blockText(b)==='Source archive')!;
 assert.deepEqual(p.children.get(archive.id)!.slice(0,oldArchive!.length),oldArchive);
 assert.deepEqual(rows.filter(b=>b.type!=='child_page').slice(1,-1).map(b=>[b.type,blockText(b)]),inlineBlocks(parsed).map(b=>[b.type,blockText(b)]));
 const sends=p.sends; await writeInlineTranscript(store,p,j,'page',parsed,next);assert.equal(p.sends,sends);
 await writeInlineTranscript(store,p,j,'page',parsed,old);assert.equal((await generation()).generation,3);assert.equal((await generation()).version,old.version);assert.ok(p.pages.has(index));
});
