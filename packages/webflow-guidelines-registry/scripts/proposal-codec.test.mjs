import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'src', 'proposal-codec.js'), 'utf8');
const ctx = vm.createContext({ TextEncoder, TextDecoder, btoa, atob });
vm.runInContext(`${src}\nthis.ProposalCodec = ProposalCodec;`, ctx);
const Codec = ctx.ProposalCodec;
// Objects built inside the VM realm have foreign prototypes; compare by value.
const plain = (v) => JSON.parse(JSON.stringify(v));

const bigSection = `### Submission artifacts\n\n${'Keep your production bundle and your private review files separate. '.repeat(140)}\n\n| Upload | Where |\n| --- | --- |\n| a | b |\n`;
const payload = {
  type: 'wfgr-proposal',
  v: 1,
  app: 'test',
  by: 'pablo@example.test',
  at: '2026-09-23T19:00:00.000Z',
  baseVersion: 8,
  baseSource: '112cc9d20136941632126772de0e85abd4e74292',
  summary: '1 section change: Submission artifacts (`state` and — dashes)',
  note: 'Devs ship maps in bundles; see ```code``` fences and ünïcödé ✓',
  sections: [{ id: 'submitting-your-app/submission-artifacts', page: 'submitting-your-app', heading: 'Submission artifacts', raw: bigSection, rationale: 'thread p1790174468748479' }],
};
const intro = ['📝 Guidelines proposal — x', 'by pablo · base v8 · Fern 112cc9d2', `• Submission artifacts — ${'long rationale '.repeat(200)}`];

test('a real-size proposal splits into replies that each fit the 2000-char cap', () => {
  const { rootText, chunks, envelope } = Codec.encodeProposal(payload, { intro });
  assert.ok(rootText.length <= Codec.COMMENT_MAX, `root ${rootText.length}`);
  assert.ok(chunks.length >= 3, `expected several chunks, got ${chunks.length}`);
  for (const c of chunks) assert.ok(c.length <= Codec.COMMENT_MAX, `chunk ${c.length}`);
  assert.equal(envelope.chunks, chunks.length);
  assert.equal(envelope.v, 2);
  assert.ok(!rootText.includes('```code```'), 'backticks in note are neutralised so the fence parses');
  assert.equal(Codec.parseEnvelope(rootText).id, envelope.id);
});

test('replies reassemble to the exact payload, in any order', () => {
  const { rootText, chunks } = Codec.encodeProposal(payload, { intro });
  const shuffled = [...chunks].reverse();
  const a = Codec.assemble(rootText, ['a human reply that is not a chunk', ...shuffled]);
  assert.equal(a.complete, true);
  assert.equal(a.legacy, false);
  assert.deepEqual(plain(a.payload), payload);
});

test('a missing part yields an incomplete proposal with the envelope summary, never null', () => {
  const { rootText, chunks } = Codec.encodeProposal(payload, { intro });
  const a = Codec.assemble(rootText, chunks.slice(1));
  assert.equal(a.complete, false);
  assert.equal(a.have, chunks.length - 1);
  assert.equal(a.need, chunks.length);
  assert.equal(a.payload.summary, payload.summary.replace(/`/g, "'"));
  assert.equal(a.payload.sections[0].id, payload.sections[0].id);
  assert.equal(a.payload.sections[0].raw, undefined);
});

test('a corrupted part is reported as corrupt, not thrown', () => {
  const { rootText, chunks } = Codec.encodeProposal(payload, { intro });
  const bad = chunks.map((c, i) => (i === 0 ? `${c.split('\n')[0]}\n!!!notbase64!!!` : c));
  const a = Codec.assemble(rootText, bad);
  assert.equal(a.complete, false);
  assert.equal(a.corrupt, true);
});

test('chunks from a different proposal in the same thread are ignored', () => {
  const one = Codec.encodeProposal(payload, { intro });
  const two = Codec.encodeProposal({ ...payload, at: '2026-09-23T19:05:00.000Z', summary: 'other' }, { intro });
  const a = Codec.assemble(one.rootText, [...two.chunks, ...one.chunks]);
  assert.equal(a.complete, true);
  assert.equal(a.payload.summary, payload.summary);
});

test('v1 root comments (payload inline) still parse as legacy proposals, even with fences inside', () => {
  const root = ['📝 Guidelines proposal — legacy', '```json', JSON.stringify(payload), '```'].join('\n');
  const a = Codec.assemble(root, []);
  assert.equal(a.legacy, true);
  assert.equal(a.complete, true);
  assert.equal(a.payload.sections.length, 1);
});

test('non-proposal threads return null', () => {
  assert.equal(Codec.assemble('just a comment', []), null);
  assert.equal(Codec.assemble('```json\n{"type":"other"}\n```', []), null);
});

test('a tiny proposal still fits in one reply and round-trips', () => {
  const small = { ...payload, sections: [{ id: 'x/y', heading: 'Y', registry: { confidence: 'confirmed' } }] };
  const { chunks, rootText } = Codec.encodeProposal(small, { intro: ['hi'] });
  assert.equal(chunks.length, 1);
  assert.deepEqual(plain(Codec.assemble(rootText, chunks).payload), small);
});

test('mismatched payload content fails closed despite valid chunk header', () => {
 const small={...payload,sections:[{id:'x',raw:'original'}]};
 const encoded=Codec.encodeProposal(small);
 const altered={...small,sections:[{id:'x',raw:'replaced'}]};
 const replies=[encoded.chunks[0].split('\n')[0]+'\n'+Codec.encode(JSON.stringify(altered))];
 assert.equal(Codec.assemble(encoded.rootText,replies).complete,false);
});
