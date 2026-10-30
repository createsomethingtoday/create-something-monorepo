import assert from 'node:assert/strict';
import test from 'node:test';
import { planTranscript, blockText, decodeOriginal, type Block } from '../src/indexed-transcript.ts';
import { PAGE_FORMAT, LEGACY_PAGE_FORMAT, writePageTranscript } from '../src/page-transcript.ts';
import { parseTranscript } from '../src/zoom.ts';
function fixture() {
  const rows = new Map<string, Block[]>([['meeting', []]]), pages = new Map<string, Block>(), keys = new Set<string>();
  let sends = 0, loss: 'before' | 'after' | null = null;
  const transport = {
    async list(id: string) { return structuredClone(rows.get(id) ?? []); },
    async getPage(id: string) { return structuredClone(pages.get(id)!); },
    async createChildPage(parent: string, title: string, children: Block[]) {
      sends++; if (loss === 'before') throw Error('unknown absent');
      const id = String(sends).padStart(32, '0'), page = { object: 'page', id, url: `https://www.notion.so/Returned-title-${id}`, parent: { page_id: parent }, properties: { title: { title: [{ text: { content: title } }] } } };
      pages.set(id, page); rows.set(id, structuredClone(children)); rows.get(parent)!.push({ type: 'child_page', id, child_page: { title } });
      if (loss === 'after') throw Error('lost committed'); return page;
    },
    async append(id: string, blocks: Block[]) { sends++; rows.get(id)!.push(...structuredClone(blocks)); },
  };
  const journal = { async assertOwner() {}, async reserve(k: string) { if (keys.has(k)) return false; keys.add(k); return true; } };
  return { transport, journal, rows, pages, get sends() { return sends; }, set loss(v: typeof loss) { loss = v; } };
}
const raw = '\uFEFFWEBVTT\r\n\r\n' + Array.from({ length: 627 }, (_, i) => `${i+1}\r\n00:${String(Math.floor(i/60)).padStart(2,'0')}:${String(i%60).padStart(2,'0')}.000 --> 01:00:00.000\r\nSpeaker: cue ${i} ${'exact 🦊 '.repeat(10)}\r\n\r\n`).join('');
test('compact native page index uses native child-page navigation and reconstructs all 627 cues exactly; repeat has no mutations', async () => {
  const parsed = parseTranscript(raw, 'vtt'), old = await planTranscript(parsed), plan = await planTranscript(parsed, PAGE_FORMAT), f = fixture();
  assert.notEqual(plan.version, old.version); assert.equal(plan.canonical, old.canonical);
  assert.equal(decodeOriginal(plan.artifacts.filter(a=>a.key.startsWith('original:')).flatMap(a=>a.chunks).join('')), raw);
  const r = await writePageTranscript(f.transport, f.journal, 'meeting', plan), index = (await f.transport.list(r.id)).filter(b=>b.type==='paragraph').map(blockText).join('');
  assert.match(index, /Canonical timestamp blocks: 627/); assert.ok(!index.includes('#'));
  const parts = (await f.transport.list(r.id)).filter(b=>b.type==='child_page');
  assert.equal(parts.length, plan.artifacts.filter(a=>a.key.startsWith('part:')).length);
  const actual = [];
  for (const part of parts) { const page = await f.transport.getPage(part.id); assert.ok(!index.includes(page.url)); assert.ok(page.url.endsWith(part.id)); const text=(await f.transport.list(part.id)).map(blockText).join(''); assert.ok(text.length<=6000); actual.push(text); }
  assert.equal(actual.join('\n'), plan.canonical); const sends=f.sends;
  await writePageTranscript(f.transport, f.journal, 'meeting', plan); assert.equal(f.sends,sends);
  f.rows.get(parts.at(-1)!.id)![0]!.paragraph.rich_text[0].text.content += ' changed';
  await assert.rejects(writePageTranscript(f.transport,f.journal,'meeting',plan),/reconstruction/); assert.equal(f.sends,sends);
});
test('committed unknown create reconciles; absent unknown create is never resent', async () => {
  const plan=await planTranscript(parseTranscript(raw,'vtt'),PAGE_FORMAT);
  for (const loss of ['before','after'] as const) {
    const f=fixture(); f.loss=loss; await assert.rejects(writePageTranscript(f.transport,f.journal,'meeting',plan)); f.loss=null;
    if(loss==='before') { await assert.rejects(writePageTranscript(f.transport,f.journal,'meeting',plan),/requires reconciliation/); assert.equal(f.sends,1); }
    else { await writePageTranscript(f.transport,f.journal,'meeting',plan); assert.equal(f.rows.get('meeting')!.length,1); }
  }
});
test('native index body contains exactly one navigable reference per part ID', async()=>{
 const plan=await planTranscript(parseTranscript(raw,'vtt'),PAGE_FORMAT),f=fixture();const root=await writePageTranscript(f.transport,f.journal,'meeting',plan);const rows=await f.transport.list(root.id);
 // Mirrors the observed native fetch rendering: child_page creates a page URL
 // automatically, while paragraph text is emitted verbatim in the same body.
 const body=rows.map(b=>b.type==='child_page'?`<page url="https://app.notion.com/p/${b.id}">${b.child_page.title}</page>`:blockText(b)).join('\n');
 for(const part of rows.filter(b=>b.type==='child_page'))assert.equal(body.split(part.id).length-1,1,`part ${part.id} must occur once`);
 assert.match(body,/Canonical timestamp blocks: 627/);
});


test('legacy v1 index stays immutable while a distinct v2 index omits duplicate URL references',async()=>{
 const parsed=parseTranscript(raw,'vtt'),legacy=await planTranscript(parsed,LEGACY_PAGE_FORMAT),next=await planTranscript(parsed,PAGE_FORMAT),f=fixture();
 const old=await writePageTranscript(f.transport,f.journal,'meeting',legacy);const snapshot=structuredClone([...f.rows.entries()]);const nextRoot=await writePageTranscript(f.transport,f.journal,'meeting',next);
 assert.notEqual(next.version,legacy.version);assert.notEqual(nextRoot.id,old.id);
 for(const [id,rows] of snapshot)if(id!=='meeting')assert.deepEqual(f.rows.get(id),rows);
 const before=f.sends;await writePageTranscript(f.transport,f.journal,'meeting',legacy);await writePageTranscript(f.transport,f.journal,'meeting',next);assert.equal(f.sends,before);
 const oldBody=(await f.transport.list(old.id)).filter(b=>b.type==='paragraph').map(blockText).join('');assert.match(oldBody,/https:\/\//);
 const nextBody=(await f.transport.list(nextRoot.id)).filter(b=>b.type==='paragraph').map(blockText).join('');assert.ok(!nextBody.includes('https://'));assert.match(nextBody,/Canonical parts:/);
});
