import assert from 'node:assert/strict';
import test from 'node:test';
import { downloadTranscript, parseTranscript } from '../src/zoom.ts';
import { blockText, planTranscript, writeIndexedTranscript, type Block } from '../src/indexed-transcript.ts';
import { decodeOriginal } from '../src/indexed-transcript.ts';
import type { Env, TranscriptCandidate } from '../src/types.ts';

const source = { transcriptDownloadUrl: 'https://synthetic.invalid/transcript' } as TranscriptCandidate;
const env = { ZOOM_ACCESS_TOKEN: 'synthetic-token' } as Env;

test('independent adversarial: streamed BOM, split UTF-8 and CRLF survive original artifact reconstruction', async () => {
  const raw = '\uFEFFWEBVTT\r\n\r\n' + Array.from({ length: 90 }, (_, i) =>
    `${i + 1}\r\n00:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}.123 --> 01:59:59.999\r\nSpeaker: 同じ 😀 e\u0301 repeated text ${i % 2}\r\n\r\n`).join('');
  const encoded = new TextEncoder().encode(raw);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    assert.equal(String(input), source.transcriptDownloadUrl);
    let cursor = 0;
    return new Response(new ReadableStream({ pull(controller) {
      if (cursor === encoded.length) { controller.close(); return; }
      // One byte per pull deliberately splits the BOM and every multibyte scalar.
      controller.enqueue(encoded.slice(cursor, ++cursor));
    } }));
  };
  try {
    const downloaded = await downloadTranscript(env, source);
    assert.equal(downloaded, raw);
    const parsed = parseTranscript(downloaded, 'vtt');
    const plan = await planTranscript(parsed);
    assert.equal(plan.blockCount, 90);
    assert.equal(decodeOriginal(plan.artifacts.filter(a => a.key.startsWith('original:')).flatMap(a => a.chunks).join('')), raw);
    assert.equal(plan.artifacts.filter(a => a.key.startsWith('part:')).map(a => a.chunks.join('')).join('\n'), parsed.plainText);
    assert.deepEqual(new TextEncoder().encode(plan.original), encoded);
  } finally { globalThis.fetch = originalFetch; }
});

test('independent adversarial: malformed UTF-8 fails closed and cancels its source stream', async () => {
  const originalFetch = globalThis.fetch;
  let cancelled = false;
  globalThis.fetch = async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array([0x57, 0x45, 0xff])); },
    cancel() { cancelled = true; },
  }));
  try {
    await assert.rejects(downloadTranscript(env, source), /encoded data|encoding|UTF-8/i);
    assert.equal(cancelled, true);
  } finally { globalThis.fetch = originalFetch; }
});

test('independent adversarial: oversized streamed download cancels without producing a plan', async () => {
  const originalFetch = globalThis.fetch;
  let cancelled = false;
  globalThis.fetch = async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(4 * 1024 * 1024 + 1)); },
    cancel() { cancelled = true; },
  }));
  try {
    await assert.rejects(downloadTranscript(env, source), /4 MiB ingestion budget/);
    assert.equal(cancelled, true);
  } finally { globalThis.fetch = originalFetch; }
});

test('independent adversarial: same-size original or canonical corruption cannot reuse readiness receipts', async () => {
  const raw = 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nSynthetic repeated speech\n\n00:00:01.000 --> 00:00:02.000\nSynthetic repeated speech\n';
  const plan = await planTranscript(parseTranscript(raw, 'vtt'));
  for (const prefix of ['original:', 'part:']) {
    const nodes = new Map<string, Block[]>([['parent', []]]);
    const reserved = new Set<string>();
    let sends = 0;
    const transport = {
      async list(parent: string) { return structuredClone(nodes.get(parent) ?? []); },
      async append(parent: string, blocks: Block[]) {
        for (const block of structuredClone(blocks)) {
          block.id = `synthetic-block-${++sends}`;
          nodes.set(block.id, block.toggle.children);
          delete block.toggle.children;
          nodes.get(parent)!.push(block);
        }
      },
    };
    const journal = { async assertOwner() {}, async reserve(key: string) {
      if (reserved.has(key)) return false;
      reserved.add(key); return true;
    } };
    await writeIndexedTranscript(transport, journal, 'parent', plan);
    const artifact = nodes.get('parent')!.find(block => blockText(block).includes(`| ${prefix}`))!;
    const child = nodes.get(artifact.id)![0]!;
    const before = blockText(child);
    child.paragraph.rich_text[0].text.content = prefix === 'original:'
      ? (before[0] === 'A' ? 'B' : 'A') + before.slice(1)
      : before.replace('Synthetic', 'Corrupted');
    assert.equal(blockText(child).length, before.length);
    assert.notEqual(blockText(child), before, 'Mutation must change persisted content');
    const beforeSends = sends;
    await assert.rejects(writeIndexedTranscript(transport, journal, 'parent', plan), /Incomplete or changed artifact/);
    assert.equal(sends, beforeSends);
  }
});
