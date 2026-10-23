// Local validation only. Every provider request is intercepted; no production bindings.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { realpathSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(realpathSync(`${packageRoot}/node_modules/wrangler/package.json`));
const { Miniflare, Response: RuntimeResponse } = require('miniflare');
const { build } = require('esbuild');
const Respond = RuntimeResponse ?? Response;
export const runtimeVersions = {
  wrangler: require('wrangler/package.json').version,
  miniflare: JSON.parse(readFileSync(require.resolve('miniflare/package.json'))).version,
};
export const blockText = block => (block[block.type]?.rich_text ?? []).map(item => item.plain_text ?? item.text?.content ?? '').join('');
export function syntheticVtt(count, suffix = '') {
  return '\uFEFFWEBVTT\r\n\r\n' + Array.from({ length: count }, (_, i) => {
    const stamp = `00:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`;
    return `${i + 1}\r\n${stamp}.123 --> 01:59:59.999\r\n<v Speaker>Block ${i}: ${'synthetic 🦊 text '.repeat(6)}${suffix}\r\n\r\n`;
  }).join('');
}
export class ProviderSimulator {
  records = new Map(); recordings = new Map(); pages = new Map(); blocks = new Map(); queued = [];
  requests = []; deniedNetwork = []; mutations = 0; appends = 0; sequence = 0;
  failAppendAt = Infinity; failBeforeCommit = false; onAppend = null; onSourceRead = null;
  sourceReads = 0;
  id() { return `00000000-0000-4000-8000-${String(++this.sequence).padStart(12, '0')}`; }
  addRecording(id, start, raw, alternate = false) {
    const meeting = { id: String(this.recordings.size + 1), uuid: id, topic: `Synthetic ${id}`, start_time: start,
      recording_files: [{ id: `${id}-primary`, file_type: 'TRANSCRIPT', file_extension: 'vtt', status: 'completed',
        download_url: `https://synthetic.invalid/transcript/${id}` }] };
    if (alternate) meeting.recording_files.push({ id: `${id}-cc`, file_type: 'CC', file_extension: 'vtt', status: 'completed',
      download_url: `https://synthetic.invalid/transcript/${id}/cc` });
    this.recordings.set(id, { meeting, raw }); return meeting;
  }
  richBlocks(blocks) {
    return blocks.map(input => {
      const block = structuredClone(input); block.id ??= this.id();
      for (const rich of block[block.type]?.rich_text ?? []) {
        assert.ok(rich.text.content.length <= 2000, 'simulated Notion rich-text limit');
        rich.plain_text = rich.text.content;
      }
      const children = block[block.type]?.children ?? [];
      assert.ok(children.length <= 100, 'simulated Notion children limit');
      delete block[block.type]?.children;
      block.has_children = children.length > 0;
      this.blocks.set(block.id, this.richBlocks(children)); this.records.set(block.id, block); return block;
    });
  }
  matches(page, filter) {
    if (filter.and) return filter.and.every(item => this.matches(page, item));
    const property = page.properties[filter.property];
    if (filter.url) return property?.url === filter.url.equals;
    if (filter.title) return (property?.title ?? []).map(item => item.plain_text ?? item.text?.content ?? '').join('') === filter.title.equals;
    if (filter.date) return property?.date?.start === filter.date.equals;
    throw new Error('Unsupported synthetic query filter');
  }
  handle = async request => {
    const url = new URL(request.url); const method = request.method; this.requests.push([method, url.href]);
    if (url.hostname === 'simulator.invalid' && url.pathname === '/queue') {
      this.queued.push(...await request.json()); return Respond.json({ ok: true });
    }
    if (url.hostname === 'api.zoom.us' && url.pathname.startsWith('/v2/')) {
      assert.equal(method, 'GET'); return Respond.json({ meetings: [...this.recordings.values()].map(item => item.meeting) });
    }
    if (url.hostname === 'synthetic.invalid' && url.pathname.startsWith('/transcript/')) {
      this.sourceReads++; if (this.onSourceRead) await this.onSourceRead(url, this.sourceReads);
      const id = url.pathname.split('/')[2]; const file = this.recordings.get(id);
      assert.ok(file, 'synthetic source must exist');
      return new Respond(url.pathname.endsWith('/cc') ? 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nWRONG ALTERNATE\n' : file.raw);
    }
    if (url.hostname !== 'api.notion.com') {
      this.deniedNetwork.push(url.href); throw new Error('Real network is forbidden by local runtime harness');
    }
    const body = method === 'POST' || method === 'PATCH' ? await request.json() : null;
    if (url.pathname.endsWith('/query')) {
      return Respond.json({ results: [...this.pages.values()].filter(page => this.matches(page, body.filter)), has_more: false });
    }
    if (url.pathname === '/v1/pages' && method === 'POST') {
      this.mutations++; const id = this.id();
      const page = { id, url: `https://www.notion.so/${id}`, created_time: new Date().toISOString(), properties: body.properties };
      for (const property of Object.values(page.properties)) {
        if (property.title) property.title = property.title.map(item => ({ ...item, plain_text: item.text.content }));
      }
      this.pages.set(id, page); this.blocks.set(id, []); return Respond.json(page);
    }
    const pageMatch = url.pathname.match(/^\/v1\/pages\/([^/]+)$/);
    if (pageMatch) {
      const page = this.pages.get(pageMatch[1]); assert.ok(page, 'synthetic page exists');
      if (method === 'PATCH') { this.mutations++; page.properties = body.properties;
        for (const property of Object.values(page.properties)) if (property.title) property.title.forEach(item => { item.plain_text = item.text.content; }); }
      return Respond.json(page);
    }
    const exactBlock = url.pathname.match(/^\/v1\/blocks\/([^/]+)$/);
    if (exactBlock) {
      const block = this.records.get(exactBlock[1]); assert.ok(block);
      if (method === 'PATCH') {
        this.mutations++;
        if (body.archived) { block.archived = true; for (const nodes of this.blocks.values()) { const at = nodes.findIndex(b => b.id === block.id); if (at >= 0) nodes.splice(at, 1); } }
        else block[block.type] = body[block.type];
      }
      return Respond.json(block);
    }
    const blockMatch = url.pathname.match(/^\/v1\/blocks\/([^/]+)\/children$/);
    if (blockMatch) {
      const id = blockMatch[1]; assert.ok(this.blocks.has(id), 'synthetic block exists');
      if (method === 'PATCH') {
        this.appends++; assert.ok(body.children.length <= 100);
        assert.ok(Buffer.byteLength(JSON.stringify(body)) <= 500_000, 'synthetic request byte budget');
        if (this.appends === this.failAppendAt && this.failBeforeCommit) return new Respond('Synthetic uncertain outcome', { status: 503 });
        this.mutations++; const nodes = this.blocks.get(id); const added = this.richBlocks(body.children);
        if (body.after) { const at = nodes.findIndex(b => b.id === body.after); assert.ok(at >= 0); nodes.splice(at + 1, 0, ...added); } else nodes.push(...added);
        if (this.onAppend) await this.onAppend(id, body.children);
        if (this.appends === this.failAppendAt) return new Respond('Synthetic response lost after commit', { status: 503 });
        return Respond.json({ results: [] });
      }
      assert.equal(method, 'GET'); const start = Number(url.searchParams.get('start_cursor') ?? 0);
      const all = this.blocks.get(id); const end = start + 100;
      return Respond.json({ results: all.slice(start, end), has_more: end < all.length, next_cursor: end < all.length ? String(end) : null });
    }
    throw new Error(`Unimplemented synthetic Notion route ${method} ${url.pathname}`);
  };
}

export async function startRuntime(simulator = new ProviderSimulator()) {
  const bundle = await build({ entryPoints: [`${packageRoot}/src/index.ts`], bundle: true, write: false, format: 'esm', target: 'es2022' });
  // Synthetic relative cutoff only. This is not a proposed production configuration.
  const cutoff = new Date(Date.now() - 60 * 60_000).toISOString();
  const compatibilityDate = readFileSync(`${packageRoot}/wrangler.toml`, 'utf8').match(/compatibility_date = "([^"]+)"/)[1];
  const mf = new Miniflare({ workers: [
    { name: 'ingestion-under-test', modules: true, script: bundle.outputFiles[0].text,
      compatibilityDate, compatibilityFlags: ['nodejs_compat'], d1Databases: { DB: 'synthetic-only-database' },
      queueProducers: { SYNC_QUEUE: 'synthetic-sync' }, outboundService: simulator.handle,
      bindings: { INDEXED_INGESTION_NOT_BEFORE: cutoff, SYNC_API_KEY: 'synthetic-key', ZOOM_ACCESS_TOKEN: 'synthetic-key',
        NOTION_API_KEY: 'synthetic-key', NOTION_DATABASE_ID: 'synthetic-database' } },
    { name: 'queue-capture', modules: true, compatibilityDate, outboundService: simulator.handle,
      queueConsumers: { 'synthetic-sync': { maxBatchSize: 1, maxBatchTimeout: 0 } },
      script: `export default { async queue(batch) { await fetch('https://simulator.invalid/queue', {method:'POST',body:JSON.stringify(batch.messages.map(m => m.body))}); }, fetch(){return new Response('Synthetic queue capture')} }` },
  ] });
  const worker = await mf.getWorker('ingestion-under-test'); const db = await mf.getD1Database('DB', 'ingestion-under-test');
  const state = async key => db.prepare('SELECT * FROM transcript_ingestion WHERE meeting_key = ?').bind(key).first();
  const delivery = async (message, attempts = 1) => {
    let current = message;
    for (let pass = 0; pass < 1000; pass++) {
      const result = await worker.queue('synthetic-sync', [{ id: simulator.id(), timestamp: new Date(), attempts, body: current }]);
      if (result.retryMessages.length) return result;
      let next;
      for(let wait = 0; wait < 100; wait++) {
        const at = simulator.queued.findIndex(item => item.dedupKey === current.dedupKey && item.inlineContinuation === (current.inlineContinuation ?? 0) + 1);
        if (at >= 0) { next = simulator.queued.splice(at, 1)[0]; break; }
        if (wait > 0 && (await state(JSON.stringify([current.canonicalMeetingKey,current.meetingDate])))?.ready_version) break;
        if (wait > 2 && !current.inlineContinuation && simulator.deniedNetwork.length) break;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      if (!next) return result;
      current = next; attempts = 1;
    }
    throw Error('Synthetic continuation driver exceeded budget');
  };
  const cron = async () => worker.scheduled({ cron: '0 * * * *' });
  await cron();
  return { mf, worker, db, cutoff, simulator, state, delivery, cron, dispose: () => mf.dispose() };
}

// Test-only consumer for the proposed contract. No production downstream is connected.
export async function retrieveVerified(runtime, key, { betweenReads } = {}) {
  const before = await runtime.state(key);
  assert.ok(before?.version && before.ready_version === before.version && before.page_id && before.index_block_id && before.verified_at, 'Ready snapshot required');
  const listPersisted = async id => {
    const blocks = []; let cursor;
    do {
      const url = new URL(`https://api.notion.com/v1/blocks/${id}/children`);
      if (cursor) url.searchParams.set('start_cursor', cursor);
      const response = await runtime.simulator.handle(new Request(url));
      assert.equal(response.status, 200, 'Synthetic retrieval GET must succeed');
      const page = await response.json(); blocks.push(...page.results);
      if (page.has_more) assert.ok(page.next_cursor && page.next_cursor !== cursor, 'Complete pagination required');
      cursor = page.has_more ? page.next_cursor : undefined;
    } while (cursor);
    return blocks;
  };
  const indexBlocks = await listPersisted(before.index_block_id);
  assert.ok(indexBlocks, 'Exact index required');
  const index = indexBlocks.map(blockText).join('');
  assert.ok(index.startsWith(`Version: ${before.version}\n`), 'Index version must match D1');
  const ids = [...index.matchAll(/https:\/\/www\.notion\.so\/[a-f0-9]+#([a-f0-9]{32})/g)].map(match => match[1]);
  const toId = id => `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
  const visible = await listPersisted(before.page_id);
  assert.equal(blockText(visible[0]), '📝 FULL TRANSCRIPT');
  assert.equal(blockText(visible.at(-1)), 'Source archive');
  assert.equal(visible.filter(b => blockText(b) === '📝 FULL TRANSCRIPT').length, 1);
  const parent = await listPersisted(visible.at(-1).id); const originals = [], parts = [];
  const expectedBlocks = Number(index.match(/Canonical timestamp blocks: (\d+)/)?.[1]);
  const selected = [];
  let lastBlock = 0;
  for (const compact of ids) {
    const id = toId(compact); assert.ok(!selected.includes(id), 'Duplicate index link'); selected.push(id);
    const found = parent.filter(block => block.id === id); assert.equal(found.length, 1, 'Indexed artifact must exist exactly once');
    const marker = blockText(found[0]); assert.ok(marker.startsWith(`Zoom indexed v2 | ${before.version} | `), 'Artifact version must match');
    assert.equal(parent.filter(block => blockText(block) === marker).length, 1, 'Duplicate artifact marker');
    const children = await listPersisted(id); assert.ok(children?.length, 'Artifact children required');
    assert.ok(children.every(child => child.type === 'paragraph' && !child.has_children), 'Only exact text children are supported');
    const text = children.map(blockText).join('');
    if (marker.includes('| original:')) originals.push(text);
    else if (marker.includes('| part:')) {
      const ordinal = Number(marker.match(/\| part:(\d+)/)?.[1]); assert.equal(ordinal, parts.length + 1, 'Contiguous part order required');
      const range = marker.match(/blocks (\d+)-(\d+)/); assert.ok(range, 'Part range required');
      assert.equal(Number(range[1]), lastBlock + 1, 'No missing or duplicated ranges'); lastBlock = Number(range[2]);
      assert.ok(text.length <= 6000, 'Part is bounded'); parts.push(text);
    } else assert.fail('Unexpected indexed artifact');
  }
  assert.ok(originals.length && parts.length, 'Original and canonical artifacts required');
  assert.equal(lastBlock, expectedBlocks, 'Complete timestamp-block range required');
  const original = Buffer.from(originals.join(''), 'base64').toString('utf8'); const canonical = parts.join('\n');
  const inline = visible.slice(1, -1);
  assert.equal(inline.length % 2, 0);
  const visibleText = [];
  for (let i = 0; i < inline.length; i += 2) {
    assert.equal(inline[i].type, 'heading_3'); assert.equal(inline[i + 1].type, 'paragraph');
    assert.ok(!inline[i].has_children && !inline[i + 1].has_children);
    visibleText.push(`${blockText(inline[i])}\n${blockText(inline[i + 1])}`);
  }
  assert.equal(visibleText.join('\n'), canonical, 'Visible transcript must reconstruct canonical text');
  const version = createHash('sha256').update(JSON.stringify(['indexed-transcript-v2', original, canonical])).digest('hex');
  assert.equal(version, before.version, 'Reconstructed content must match version');
  if (betweenReads) await betweenReads();
  const after = await runtime.state(key);
  for (const field of ['version', 'ready_version', 'selected_key', 'page_id', 'index_block_id']) assert.equal(after?.[field], before[field], `Snapshot changed: ${field}`);
  assert.ok(after?.ready_version, 'Readiness cleared during retrieval');
  return { original, canonical, version, parts: parts.length, blocks: expectedBlocks };
}
