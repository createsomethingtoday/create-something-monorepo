// Explicitly approved, one-page provider test. Never included in the default test suite.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { planTranscript, writeIndexedTranscript, blockText, hashText, decodeOriginal, TRANSCRIPT_FORMAT, type Block } from '../src/indexed-transcript.ts';
import { parseTranscript } from '../src/zoom.ts';
import { claimIngestion, selectRendition } from '../src/ingestion-state.ts';
import { initSchema } from '../src/db.ts';

const databaseId = '8f646f93-fdc8-4b43-8ad8-93125c38f8e0';
const workspaceId = 'a20b7e9b-3cbe-401e-8c63-0417697a9666';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const stateDir = `${root}/.cache/zoom-single-live-fixture`;
const stateFile = `${stateDir}/receipt.json`;
const publicFile = `${packageRoot}/live-notion-acceptance.json`;
assert.equal(process.argv[2], '--approved-single-fixture', 'Explicit single synthetic fixture approval flag required');
mkdirSync(stateDir, { recursive: true });
let receipt: any = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : {
  runId: `zoom-synthetic-${crypto.randomUUID()}`, databaseId, workspaceId, startedAt: new Date().toISOString(),
  status: 'prepared', pageId: null, pageUrl: null, requestReceipts: [], phases: [],
  stats: { apiReads: 0, pageCreates: 0, appendRequests: 0 },
  scope: { provider: 'Live Notion via existing ntn CLI session', engine: 'actual planTranscript/writeIndexedTranscript/IngestionLease',
    source: '24 generated synthetic VTT cues, no Zoom call', database: 'isolated existing synthetic database',
    journal: 'local Miniflare D1 only', hubValidated: false, workerDeployed: false, productionCutoffSelected: false },
};
function save() { writeFileSync(stateFile, JSON.stringify(receipt, null, 2) + '\n'); writeFileSync(publicFile, JSON.stringify(receipt, null, 2) + '\n'); }
if (receipt.status === 'passed') { console.log(JSON.stringify({ status: 'already_completed_no_new_writes', pageUrl: receipt.pageUrl, phases: receipt.phases })); process.exit(0); }
const allowedIds = new Set<string>(receipt.pageId ? [receipt.pageId] : []);
let lastCall = 0;
async function api(path: string, method = 'GET', body?: unknown): Promise<any> {
  const blockId = path.match(/^v1\/blocks\/([^/?]+)\/children/)?.[1];
  // Every mutation is either the single reserved fixture create or an append to its owned block tree.
  if (method === 'POST') {
    assert.equal(path, 'v1/pages'); assert.equal(receipt.pageId, null); assert.equal(receipt.stats.pageCreates, 0);
    assert.equal((body as any)?.parent?.database_id, databaseId); assert.equal((body as any)?.properties?.Synthetic?.checkbox, true);
    receipt.stats.pageCreates++; save(); // Durable reservation before send. Never repeat an unknown creation.
  } else if (method === 'PATCH') {
    assert.ok(blockId && allowedIds.has(blockId), 'Append target must belong to the one fixture');
    receipt.stats.appendRequests++;
  } else {
    assert.equal(method, 'GET');
    assert.ok(path === `v1/databases/${databaseId}` || (blockId && allowedIds.has(blockId)), 'Read must be exact approved parent or owned fixture block');
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
function synthetic(version: number): string {
  return '\uFEFFWEBVTT\r\n\r\n' + Array.from({ length: 24 }, (_, i) =>
    `${i + 1}\r\n00:00:${String(i).padStart(2, '0')}.123 --> 00:01:00.999\r\n<v Synthetic Speaker>Block ${i}: ${'Generated provider acceptance text. No real meeting, private data, or task. '.repeat(4)}🦊${version === 2 && i === 23 ? ' Synthetic correction for version two.' : ''}\r\n\r\n`).join('');
}
let injected = receipt.phases.some((phase: any) => phase.name === 'simulated-response-loss' && phase.formatVersion === TRANSCRIPT_FORMAT);
const transport = {
  list,
  async append(parent: string, blocks: Block[]) {
    // Capture success but deliberately hide one receipt from the core, never from the operator audit.
    await api(`v1/blocks/${parent}/children`, 'PATCH', { children: blocks });
    if (!injected) {
      injected = true; receipt.phases.push({ name: 'simulated-response-loss', formatVersion: TRANSCRIPT_FORMAT, liveAppendCommitted: true,
        limit: 'Adapter deliberately hid one successful response; no genuine provider failure induced' }); save();
      throw new Error('Synthetic lost response after successful live append');
    }
  },
};
let mf: any;
try {
  const parent = await api(`v1/databases/${databaseId}`);
  const expected = ['Name', 'Synthetic', 'Run ID', 'Source ID', 'Delivery State'];
  assert.ok(expected.every(name => parent.properties?.[name]), 'Expected existing synthetic schema required');
  if (!receipt.pageId) {
    const page = await api('v1/pages', 'POST', { parent: { database_id: databaseId }, properties: {
      Name: { title: [{ text: { content: `SYNTHETIC Zoom indexed transcript acceptance — ${receipt.runId}` } }] },
      Synthetic: { checkbox: true }, 'Run ID': { rich_text: [{ text: { content: receipt.runId } }] },
      'Source ID': { rich_text: [{ text: { content: 'generated-text-only-no-zoom-recording' } }] },
      'Delivery State': { rich_text: [{ text: { content: 'isolated provider acceptance fixture; not a meeting or task' } }] },
    } });
    assert.equal(page.parent?.database_id?.replace(/-/g, ''), databaseId.replace(/-/g, ''));
    receipt.pageId = page.id; receipt.pageUrl = page.url; receipt.createdTime = page.created_time;
    receipt.status = 'fixture_created'; allowedIds.add(page.id); save();
    console.log(JSON.stringify({ phase: 'fixture_created', pageUrl: receipt.pageUrl }));
  }
  const require = createRequire(realpathSync(`${packageRoot}/node_modules/wrangler/package.json`));
  const { Miniflare } = require('miniflare');
  mf = new Miniflare({ modules: true, compatibilityDate: '2026-03-10', d1Databases: { DB: 'single-synthetic-journal' },
    d1Persist: `${stateDir}/d1`, script: 'export default {fetch(){return new Response("local journal only")}}',
    outboundService: () => { throw new Error('No Worker outbound network allowed in acceptance journal'); } });
  const db = await mf.getD1Database('DB'); await initSchema(db);
  const key = `single-synthetic:${receipt.runId}`; await selectRendition(db, key, receipt.runId);
  async function writeVersion(version: number) {
    const plan = await planTranscript(parseTranscript(synthetic(version), 'vtt'));
    const lease = await claimIngestion(db, key, receipt.runId);
    try {
      assert.equal((await db.prepare('SELECT ready_version FROM transcript_ingestion WHERE meeting_key = ?').bind(key).first())?.ready_version, null);
      await lease.begin(plan.version);
      const indexId = await writeIndexedTranscript(transport, lease, receipt.pageId, plan);
      await lease.ready(plan.version, receipt.pageId, indexId);
      return { plan, indexId };
    } finally { await lease.release(); }
  }
  if (!injected) {
    await assert.rejects(writeVersion(1), /Synthetic lost response/);
    assert.equal((await db.prepare('SELECT ready_version FROM transcript_ingestion WHERE meeting_key = ?').bind(key).first())?.ready_version, null);
    receipt.phases.push({ name: 'partial_write_not_ready', passed: true }); save();
    console.log(JSON.stringify({ phase: 'partial_write_not_ready', passed: true }));
  }
  async function verify(plan: any, indexId: string) {
    const parentBlocks = await list(receipt.pageId); const versionBlocks = parentBlocks.filter(block => blockText(block).includes(`| ${plan.version} |`));
    assert.equal(versionBlocks.length, plan.artifacts.length + 1);
    const original: string[] = [], canonical: string[] = []; const linkedIds: string[] = [];
    for (const artifact of plan.artifacts) {
      const matches = versionBlocks.filter(block => blockText(block).includes(`| ${artifact.key} |`)); assert.equal(matches.length, 1);
      const block = matches[0]; linkedIds.push(block.id);
      const children = await list(block.id); assert.equal(children.length, artifact.chunks.length);
      assert.ok(children.every((child, i) => child.type === 'paragraph' && blockText(child) === artifact.chunks[i]));
      (artifact.key.startsWith('original:') ? original : canonical).push(children.map(blockText).join(''));
    }
    assert.equal(decodeOriginal(original.join('')), plan.original); assert.equal(canonical.join('\n'), plan.canonical);
    assert.equal(await hashText(JSON.stringify([TRANSCRIPT_FORMAT, decodeOriginal(original.join('')), canonical.join('\n')])), plan.version);
    const indexText = (await list(indexId)).map(blockText).join('');
    const indexLinks = [...indexText.matchAll(/https:\/\/www\.notion\.so\/[a-f0-9]+#([a-f0-9]{32})/g)].map(match => match[1]);
    assert.deepEqual(indexLinks, linkedIds.map(id => id.replace(/-/g, ''))); assert.ok(indexText.includes(`Canonical timestamp blocks: ${plan.blockCount}`));
    const state = await db.prepare('SELECT version, ready_version, index_block_id FROM transcript_ingestion WHERE meeting_key = ?').bind(key).first();
    assert.equal(state?.ready_version, plan.version); assert.equal(state?.index_block_id, indexId);
    return { version: plan.version, timestampBlocks: plan.blockCount, originalCharacters: plan.original.length, canonicalCharacters: plan.canonical.length,
      originalChunks: plan.artifacts.filter((a: any) => a.key.startsWith('original:')).length,
      numberedParts: plan.artifacts.filter((a: any) => a.key.startsWith('part:')).length, indexLinks: indexLinks.length,
      exactReconstruction: true, completeIndex: true, indexId };
  }
  const first = await writeVersion(1); receipt.phases.push({ name: 'reconciled_version_one', ...await verify(first.plan, first.indexId) }); save();
  console.log(JSON.stringify({ phase: 'reconciled_version_one', passed: true }));
  const appendCount = receipt.stats.appendRequests;
  await writeVersion(1); assert.equal(receipt.stats.appendRequests, appendCount);
  receipt.phases.push({ name: 'repeated_run_idempotent', passed: true, newAppendRequests: 0 }); save();
  console.log(JSON.stringify({ phase: 'repeated_run_idempotent', passed: true }));
  const second = await writeVersion(2); assert.notEqual(first.plan.version, second.plan.version);
  const secondReceipt = await verify(second.plan, second.indexId);
  // Verify old original, parts and index still reconstruct after the correction.
  const after = await list(receipt.pageId); assert.equal(after.filter(block => blockText(block).includes(`| ${first.plan.version} |`)).length, first.plan.artifacts.length + 1);
  receipt.phases.push({ name: 'version_two_invalidated_and_verified', ...secondReceipt, priorVersionArtifactsPreserved: true });
  receipt.totalTopLevelArtifacts = after.length; receipt.totalParagraphBlocks = 0;
  for (const block of after) receipt.totalParagraphBlocks += (await list(block.id)).length;
  receipt.lastError = null; receipt.formatVersion = TRANSCRIPT_FORMAT; receipt.status = 'passed'; receipt.completedAt = new Date().toISOString();
  receipt.disposition = 'Retained in synthetic test database; no archive or permanent deletion'; save();
  console.log(JSON.stringify({ status: receipt.status, pageUrl: receipt.pageUrl, totalTopLevelArtifacts: receipt.totalTopLevelArtifacts,
    totalParagraphBlocks: receipt.totalParagraphBlocks, phases: receipt.phases, stats: receipt.stats }));
} catch (error) {
  receipt.status = 'blocked'; receipt.lastError = String((error as Error).message).slice(0, 500); save();
  console.error(JSON.stringify({ status: 'blocked', pageUrl: receipt.pageUrl, error: receipt.lastError, noAutomaticRetry: true })); process.exitCode = 1;
} finally { if (mf) await mf.dispose(); }
