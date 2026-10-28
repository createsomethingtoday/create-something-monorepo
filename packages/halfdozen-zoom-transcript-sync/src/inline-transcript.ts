import { blockText, decodeOriginal, exactChunks, hashText, planTranscript, textBlock, writeIndexedTranscript, type Block, type TranscriptPlan, type WriteJournal } from './indexed-transcript';
import { parseTranscript } from './zoom';
import type { ParsedTranscript } from './types';

const BATCH_BLOCKS = 80;
export class InlineContinuation extends Error { constructor() { super('Inline projection checkpoint; continue in another queue delivery'); } }
export const INLINE_SCHEMA = `CREATE TABLE IF NOT EXISTS transcript_inline_projection (
  page_id TEXT PRIMARY KEY, version TEXT NOT NULL, generation INTEGER NOT NULL,
  phase TEXT NOT NULL, manifest TEXT
)`;
interface Slot { id: string; hash: string }
interface Manifest {
  heading: string; archive: string; slots: Slot[]; finishing?: boolean;
  pending?: { key: string; after: string; known: string[]; hashes: string[] };
}
interface State { version: string; generation: number; phase: string; manifest: Manifest | null }
export interface InlineTransport {
  list(parent: string): Promise<Block[]>;
  append(parent: string, blocks: Block[], after?: string): Promise<void>;
  get(id: string): Promise<Block>;
  update(id: string, block: Block): Promise<void>;
  archive(id: string): Promise<void>;
}
export function inlineBlocks(parsed: ParsedTranscript): Block[] {
  // A cue always occupies two stable slots. Rich-text chunks do not introduce
  // extra paragraph blocks when a correction makes a cue longer.
  const segments = parsed.rawText.includes('-->') ? parsed.segments : [{ timestamp: 'Transcript text', text: parsed.plainText }];
  return segments.flatMap(segment => [
    textBlock(segment.timestamp || 'Transcript', 'heading_3'),
    { object: 'block', type: 'paragraph', paragraph: { rich_text: exactChunks(segment.text).map(content => ({ type: 'text', text: { content } })) } },
  ]);
}
function same(block: Block, expected: Block): boolean {
  return block.type === expected.type && !block.has_children && blockText(block) === blockText(expected);
}
async function fingerprint(block: Block): Promise<string> { return hashText(JSON.stringify([block.type, blockText(block)])); }

export async function writeInlineTranscript(
  db: D1Database, transport: InlineTransport, journal: WriteJournal, page: string,
  parsed: ParsedTranscript, plan: TranscriptPlan, budget = { changes: 0, appendedBatches: 0 },
  beforeWrite?: (version: string, generation: number, writing: boolean) => Promise<void>,
): Promise<string> {
  const desired = inlineBlocks(parsed);
  if (!desired.length || desired.length > 20000) throw new Error('Inline block budget exceeded or empty transcript');
  const checkpoint = () => { if (budget.changes >= 40 || budget.appendedBatches >= 4) throw new InlineContinuation(); };
  await journal.assertOwner();
  const load = async (): Promise<State | null> => {
    const row = await db.prepare('SELECT * FROM transcript_inline_projection WHERE page_id = ?').bind(page)
      .first<{version: string; generation: number; phase: string; manifest: string | null}>();
    return row ? { ...row, manifest: row.manifest ? JSON.parse(row.manifest) : null } : null;
  };
  const fence = journal.projectionFence?.();
  const condition = fence ? ' AND EXISTS (SELECT 1 FROM transcript_ingestion WHERE meeting_key = ? AND selected_key = ? AND owner = ? AND expires_at > ?)' : '';
  const fencedRun = (sql: string, values: unknown[]) => db.prepare(sql + condition).bind(...values,
    ...(fence ? [fence.key, fence.selected, fence.owner, new Date().toISOString()] : [])).run();
  let state = await load();
  if (!state) {
    // The caller must authorize page provenance. Existing body content still
    // requires an explicit migration, never implicit replacement.
    if ((await transport.list(page)).length) throw new Error('Existing page needs explicit inline migration');
    await fencedRun("INSERT OR IGNORE INTO transcript_inline_projection SELECT ?, ?, 1, 'writing', NULL WHERE 1 = 1", [page, plan.version]);
    state = await load();
  }
  if (!state) throw new Error('Missing inline projection state');
  if (state.phase === 'writing' && state.version !== plan.version) {
    if (!state.manifest) throw new Error('Prior inline write is unresolved; source correction withheld');
    const archiveRows = (await transport.list(state.manifest.archive)).filter(block =>
      blockText(block).startsWith(`Zoom indexed v2 | ${state!.version} | original:`));
    archiveRows.sort((a, b) => Number(blockText(a).match(/original:(\d+)/)?.[1]) - Number(blockText(b).match(/original:(\d+)/)?.[1]));
    const encoded = [];
    for (const block of archiveRows) encoded.push((await transport.list(block.id)).map(blockText).join(''));
    const original = decodeOriginal(encoded.join(''));
    const priorParsed = parseTranscript(original, original.includes('-->') ? 'vtt' : 'txt');
    const priorPlan = await planTranscript(priorParsed);
    if (priorPlan.version !== state.version) throw new Error('Prior inline write is unresolved; source archive incomplete');
    // Reconcile the persisted prior intent without downloading or publishing it
    // as current. An absent uncertain mutation still blocks the new version.
    await writeInlineTranscript(db, transport, journal, page, priorParsed, priorPlan, budget, beforeWrite);
    state = (await load())!;
  }
  if (state.version !== plan.version) {
    const nextManifest = state.manifest ? { ...state.manifest, finishing: false } : null;
    const changed = await fencedRun("UPDATE transcript_inline_projection SET version = ?, generation = generation + 1, phase = 'writing', manifest = ? WHERE page_id = ? AND phase = 'complete' AND version = ?", [plan.version, JSON.stringify(nextManifest), page, state.version]);
    if (changed.meta.changes !== 1) throw new Error('Inline projection changed concurrently');
    state = (await load())!;
  }
  const generation = state.generation;
  await beforeWrite?.(state.version, generation, state.phase === 'writing');
  const save = async () => {
    await journal.assertOwner();
    const changed = await fencedRun('UPDATE transcript_inline_projection SET manifest = ? WHERE page_id = ? AND version = ? AND generation = ?', [JSON.stringify(state!.manifest), page, plan.version, generation]);
    if (changed.meta.changes !== 1) throw new Error('Inline projection ownership changed');
  };
  if (!state.manifest) {
    const shell = [textBlock('📝 FULL TRANSCRIPT (updating)', 'heading_3'), textBlock('Source archive', 'toggle')];
    const existing = await transport.list(page);
    const shellMatches = (rows: Block[]) => rows.length === 2 && rows.every((b, i) => b.type === shell[i]!.type && blockText(b) === blockText(shell[i]!));
    if (!shellMatches(existing)) {
      if (existing.length) throw new Error('Unexpected page content during inline initialization');
      if (!await journal.reserve(`inline:${page}:shell`)) throw new Error('Uncertain inline shell requires reconciliation');
      await journal.assertOwner(); await transport.append(page, shell);
    }
    const rows = await transport.list(page);
    if (!shellMatches(rows)) throw new Error('Incomplete inline shell');
    state.manifest = { heading: rows[0]!.id, archive: rows[1]!.id, slots: [] }; await save();
  }
  const manifest = state.manifest;
  async function heading(label: string, key: string) {
    const current = await transport.get(manifest.heading);
    if (same(current, textBlock(label, 'heading_3'))) return;
    if (!['📝 FULL TRANSCRIPT', '📝 FULL TRANSCRIPT (updating)'].includes(blockText(current))) throw new Error('Inline heading was edited');
    checkpoint();
    if (!await journal.reserve(`inline:${page}:${generation}:heading:${key}`)) throw new Error('Uncertain inline heading requires reconciliation');
    await journal.assertOwner(); await transport.update(manifest.heading, textBlock(label, 'heading_3')); budget.changes++;
    await journal.assertOwner();
    if (!same(await transport.get(manifest.heading), textBlock(label, 'heading_3'))) throw new Error('Inline heading readback mismatch');
  }
  // Immutable originals, canonical parts and verification index are secondary
  // children of the one archive toggle, never the visible reading path.
  const index = await writeIndexedTranscript(transport, journal, manifest.archive, plan, page);
  if (state.phase === 'writing' && !manifest.finishing) await heading('📝 FULL TRANSCRIPT (updating)', 'updating');
  const assertRoot = async (allowPending = false) => {
    const rows = await transport.list(page);
    const ids = [manifest.heading, ...manifest.slots.map(slot => slot.id), manifest.archive];
    const remaining = rows.filter(row => !ids.includes(row.id));
    if (!allowPending && (remaining.length || JSON.stringify(rows.map(row => row.id)) !== JSON.stringify(ids))) throw new Error('Inline root order or ownership mismatch');
    const headingText = blockText(rows.find(row => row.id === manifest.heading) ?? {});
    if (!['📝 FULL TRANSCRIPT', '📝 FULL TRANSCRIPT (updating)'].includes(headingText)
      || (state!.phase === 'complete' && headingText !== '📝 FULL TRANSCRIPT')
      || blockText(rows.find(row => row.id === manifest.archive) ?? {}) !== 'Source archive') throw new Error('Inline shell was changed');
    return rows;
  };
  // A pending append records the known IDs before send. Repeated cue text can
  // never be mistaken for a new receipt merely because it matches the payload.
  if (manifest.pending) {
    const pending = manifest.pending;
    const rows = await transport.list(page);
    const newRows = rows.filter(row => !pending.known.includes(row.id));
    if (!newRows.length) {
      checkpoint();
      if (!await journal.reserve(pending.key)) throw new Error('Uncertain inline append requires reconciliation');
      const batch = desired.slice(manifest.slots.length, manifest.slots.length + pending.hashes.length);
      if (JSON.stringify(await Promise.all(batch.map(fingerprint))) !== JSON.stringify(pending.hashes)) throw new Error('Pending source intent differs');
      await journal.assertOwner(); await transport.append(page, batch, pending.after); budget.appendedBatches++; await journal.assertOwner();
    }
    await reconcileAppend();
  }
  // A recoverable archive may have committed before the caller lost its response
  // or saved the shorter manifest. Reconcile owned surplus IDs first.
  while (manifest.slots.length > desired.length && (await transport.get(manifest.slots.at(-1)!.id)).archived) {
    manifest.slots.pop(); await save();
  }
  const snapshot = await assertRoot();
  const common = Math.min(manifest.slots.length, desired.length);
  for (let i = 0; i < common; i++) {
    const slot = manifest.slots[i]!; const target = desired[i]!; const current = snapshot.find(block => block.id === slot.id)!;
    const targetHash = await fingerprint(target);
    if (same(current, target) && !current.archived) {
      if (slot.hash !== targetHash) { slot.hash = targetHash; await save(); }
      continue;
    }
    if (current.archived || await fingerprint(current) !== slot.hash || current.type !== target.type) throw new Error('Inline text was edited outside this projection');
    checkpoint();
    if (!await journal.reserve(`inline:${page}:${generation}:update:${i}:${targetHash}`)) throw new Error('Uncertain inline update requires reconciliation');
    await journal.assertOwner(); await transport.update(slot.id, target); budget.changes++; await journal.assertOwner();
    if (!same(await transport.get(slot.id), target)) throw new Error('Inline update readback mismatch');
    slot.hash = targetHash; await save();
  }
  while (manifest.slots.length > desired.length) {
    const slot = manifest.slots.at(-1)!; const current = await transport.get(slot.id);
    if (!current.archived) {
      if (await fingerprint(current) !== slot.hash) throw new Error('Surplus inline block was edited');
      checkpoint();
      if (!await journal.reserve(`inline:${page}:${generation}:archive:${slot.id}`)) throw new Error('Uncertain inline archive requires reconciliation');
      await journal.assertOwner(); await transport.archive(slot.id); budget.changes++; await journal.assertOwner();
      if (!(await transport.get(slot.id)).archived) throw new Error('Surplus block archive not verified');
    }
    manifest.slots.pop(); await save();
  }
  while (manifest.slots.length < desired.length) {
    checkpoint();
    const batch: Block[] = [];
    const anchor = manifest.slots.at(-1)?.id ?? manifest.heading;
    for (const block of desired.slice(manifest.slots.length, manifest.slots.length + BATCH_BLOCKS)) {
      const proposed = [...batch, block];
      if (new TextEncoder().encode(JSON.stringify({ children: proposed, after: anchor })).byteLength > 400000) break;
      batch.push(block);
    }
    if (!batch.length) throw new Error('Inline block exceeds request byte budget');
    const rows = await assertRoot();
    manifest.pending = { key: `inline:${page}:${generation}:append:${manifest.slots.length}`,
      after: manifest.slots.at(-1)?.id ?? manifest.heading, known: rows.map(row => row.id), hashes: await Promise.all(batch.map(fingerprint)) };
    await save();
    if (!await journal.reserve(manifest.pending.key)) { await reconcileAppend(); continue; }
    await journal.assertOwner(); await transport.append(page, batch, manifest.pending.after); budget.appendedBatches++; await journal.assertOwner();
    await reconcileAppend();
  }
  const rows = await assertRoot();
  if (rows.length !== desired.length + 2 || !desired.every((block, i) => same(rows[i + 1]!, block))) throw new Error('Inline full reconstruction mismatch');
  const reconstructed = !parsed.rawText.includes('-->') ? blockText(rows[2]!) : parsed.segments.map((segment, i) => `${segment.timestamp ? blockText(rows[i * 2 + 1]!) + '\n' : ''}${blockText(rows[i * 2 + 2]!)}`).join('\n');
  if (reconstructed !== plan.canonical) throw new Error('Inline canonical reconstruction mismatch');
  if (state.phase !== 'complete') {
    manifest.finishing = true; await save();
    await heading('📝 FULL TRANSCRIPT', 'complete');
  }
  await journal.assertOwner();
  const completed = await fencedRun("UPDATE transcript_inline_projection SET phase = 'complete' WHERE page_id = ? AND version = ? AND generation = ?", [page, plan.version, generation]);
  if (completed.meta.changes !== 1) throw new Error('Inline completion race');
  return index;

  async function reconcileAppend() {
    const pending = manifest.pending!; const rows = await assertRoot(true);
    const start = rows.findIndex(row => row.id === pending.after) + 1;
    const added = rows.slice(start, start + pending.hashes.length);
    if (!start || added.length !== pending.hashes.length || added.some(row => pending.known.includes(row.id))
      || JSON.stringify(await Promise.all(added.map(fingerprint))) !== JSON.stringify(pending.hashes)) throw new Error('Uncertain inline append requires reconciliation');
    for (let i = 0; i < added.length; i++) manifest.slots.push({ id: added[i]!.id, hash: pending.hashes[i]! });
    delete manifest.pending; await save();
  }
}
