import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { artifactMarker, blockText, planTranscript, textBlock, writeIndexedTranscript, type Block } from '../src/indexed-transcript.ts';
import { parseTranscript } from '../src/zoom.ts';

function syntheticOriginal() {
  return '\uFEFFWEBVTT\r\n\r\n' + Array.from({ length: 170 }, (_, i) =>
    `${i + 1}\r\n00:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}.123 --> 01:59:59.999\r\nSpeaker: ${i} 同じ 😀 e\u0301 ${'repeat '.repeat(10)}\r\n\r\n`).join('');
}
const digest = (domain: string, raw: string, canonical: string) => createHash('sha256').update(JSON.stringify([domain, raw, canonical])).digest('hex');

test('independent v2: ASCII base64 originals reconstruct exact BOM, CRLF and Unicode bytes with explicit v2 identity', async () => {
  const raw = syntheticOriginal();
  const parsed = parseTranscript(raw, 'vtt');
  const plan = await planTranscript(parsed);
  const originals = plan.artifacts.filter(a => a.key.startsWith('original:'));
  assert.ok(originals.length > 1, 'Fixture must cross original artifact boundaries');
  const encoded = originals.flatMap(a => a.chunks).join('');
  assert.match(encoded, /^[A-Za-z0-9+/]+={0,2}$/);
  assert.equal(encoded, Buffer.from(raw, 'utf8').toString('base64'));
  assert.deepEqual(Buffer.from(encoded, 'base64'), Buffer.from(raw, 'utf8'));
  assert.equal(Buffer.from(encoded, 'base64').toString('utf8'), raw);
  assert.equal(plan.artifacts.filter(a => a.key.startsWith('part:')).map(a => a.chunks.join('')).join('\n'), parsed.plainText);
  assert.equal(plan.version, digest('indexed-transcript-v2', raw, parsed.plainText));
  assert.notEqual(plan.version, digest('indexed-transcript-v1', raw, parsed.plainText));
  assert.ok(plan.artifacts.every(a => artifactMarker(plan.version, a).startsWith('Zoom indexed v2 | ')));
});

test('independent v2: provider CR/BOM normalization, lost response and prior v1 artifact do not change the original or duplicate writes', async () => {
  const raw = syntheticOriginal();
  const parsed = parseTranscript(raw, 'vtt');
  const plan = await planTranscript(parsed);
  const oldVersion = digest('indexed-transcript-v1', raw, parsed.plainText);
  const oldMarker = textBlock(`Zoom indexed v1 | ${oldVersion} | original:1 | Original 1/1`, 'toggle');
  oldMarker.id = 'old-v1';
  const nodes = new Map<string, Block[]>([['parent', [oldMarker]], ['old-v1', [textBlock(raw.replace(/^\uFEFF/, '').replace(/\r/g, ''))]]]);
  const reserved = new Set<string>();
  let sends = 0;
  let loseResponse = true;
  const normalize = (block: Block): Block => {
    for (const rich of block[block.type]?.rich_text ?? []) {
      const content = rich.text.content.replace(/^\uFEFF/, '').replace(/\r/g, '');
      rich.text.content = content;
      rich.plain_text = content;
    }
    return block;
  };
  const transport = {
    async list(parent: string) { return structuredClone(nodes.get(parent) ?? []); },
    async append(parent: string, blocks: Block[]) {
      for (const block of structuredClone(blocks)) {
        block.id = `v2-${++sends}`;
        nodes.set(block.id, block.toggle.children.map(normalize));
        delete block.toggle.children;
        normalize(block);
        nodes.get(parent)!.push(block);
      }
      if (sends === 2 && loseResponse) throw new Error('synthetic response lost after commit');
    },
  };
  const journal = { async assertOwner() {}, async reserve(key: string) {
    if (reserved.has(key)) return false;
    reserved.add(key); return true;
  } };
  await assert.rejects(writeIndexedTranscript(transport, journal, 'parent', plan), /response lost after commit/);
  assert.ok(!nodes.get('parent')!.some(b => blockText(b).includes(`| ${plan.version} | index |`)), 'Partial write has no v2 index');
  loseResponse = false;
  const index = await writeIndexedTranscript(transport, journal, 'parent', plan);
  const current = nodes.get('parent')!.filter(b => blockText(b).startsWith(`Zoom indexed v2 | ${plan.version} | `));
  assert.equal(current.length, plan.artifacts.length + 1);
  assert.equal(new Set(current.map(blockText)).size, current.length);
  const persistedOriginal = plan.artifacts.filter(a => a.key.startsWith('original:')).map(a => {
    const stored = current.find(b => blockText(b) === artifactMarker(plan.version, a))!;
    return nodes.get(stored.id)!.map(blockText).join('');
  }).join('');
  assert.deepEqual(Buffer.from(persistedOriginal, 'base64'), Buffer.from(raw, 'utf8'));
  const indexText = nodes.get(index)!.map(blockText).join('');
  assert.match(indexText, /base64/i, 'Encoding is discoverable from persisted index');
  assert.match(indexText, /v2/, 'Format is discoverable from persisted index');
  const before = sends;
  assert.equal(await writeIndexedTranscript(transport, journal, 'parent', plan), index);
  assert.equal(sends, before);
  assert.equal(nodes.get('old-v1')!.map(blockText).join(''), raw.replace(/^\uFEFF/, '').replace(/\r/g, ''));
});
