import { artifactMarker, blockText, exactChunks, textBlock, type Artifact, type Block, type TranscriptPlan, type WriteJournal } from './indexed-transcript';

export const LEGACY_PAGE_FORMAT = 'indexed-transcript-pages-v1';
export const PAGE_FORMAT = 'indexed-transcript-pages-v2';
export function isPageFormat(format: string | undefined): boolean { return format === PAGE_FORMAT || format === LEGACY_PAGE_FORMAT; }
export interface PageTransport {
  list(id: string): Promise<Block[]>;
  append(id: string, blocks: Block[]): Promise<void>;
  createChildPage(parent: string, title: string, children: Block[]): Promise<Block>;
  getPage(id: string): Promise<Block>;
}
export interface PageReceipt { id: string; url: string }
function receipt(page: Block, parent: string): PageReceipt {
  if (page.object !== 'page' || typeof page.id !== 'string' || page.archived || page.in_trash
    || page.parent?.page_id?.replace(/-/g, '') !== parent.replace(/-/g, '')) throw Error('Invalid child page receipt');
  const url = new URL(page.url);
  if (!['www.notion.so', 'notion.so', 'app.notion.com'].includes(url.hostname) || url.protocol !== 'https:' || url.hash
    || !url.pathname.replace(/-/g, '').endsWith(page.id.replace(/-/g, ''))) throw Error('Invalid direct page URL');
  return { id: page.id, url: page.url };
}
async function child(t: PageTransport, j: WriteJournal, parent: string, title: string, chunks: string[], container = false): Promise<PageReceipt> {
  const find = async () => {
    const matches = (await t.list(parent)).filter(b => b.type === 'child_page' && b.child_page.title === title);
    if (matches.length > 1) throw Error('Duplicate transcript child page');
    if (!matches.length) return null;
    const page = await t.getPage(matches[0]!.id), r = receipt(page, parent);
    const actualTitle = (page.properties?.title?.title ?? []).map((x: Block) => x.plain_text ?? x.text?.content ?? '').join('');
    if (actualTitle !== title) throw Error('Transcript page title changed');
    if (!container) await verify(t, r.id, chunks);
    return r;
  };
  await j.assertOwner();
  const existing = await find(); if (existing) return existing;
  if (!await j.reserve(`page-artifact:${parent}:${title}`)) {
    const reconciled = await find(); if (reconciled) return reconciled;
    throw Error('Uncertain transcript page creation requires reconciliation');
  }
  await j.assertOwner();
  const created = receipt(await t.createChildPage(parent, title, chunks.map(c => textBlock(c))), parent);
  await j.assertOwner();
  const found = await find();
  if (!found || found.id !== created.id || found.url !== created.url) throw Error('Missing transcript child page after create');
  return found;
}
async function verify(t: PageTransport, id: string, chunks: string[]) {
  const rows = await t.list(id);
  if (rows.length !== chunks.length || rows.some((b, i) => b.type !== 'paragraph' || b.has_children || blockText(b) !== chunks[i])) throw Error('Transcript page reconstruction mismatch');
}
// Pages-v2 metadata is fully determined before any provider I/O. Legacy v1
// additionally embeds returned URLs: preflight its known metadata here and
// recheck the exact URL-bearing text once those immutable receipts are known.
export function pageIndexText(plan: TranscriptPlan, urls?: string[]): string {
  const parts = plan.artifacts.filter(a => a.key.startsWith('part:'));
  if (!parts.length || parts.map(a => a.chunks.join('')).join('\n') !== plan.canonical) throw Error('Incomplete canonical page plan');
  const text = [
    `Version: ${plan.version}`, `Format: ${plan.format}`, `Canonical timestamp blocks: ${plan.blockCount}`,
    ...(plan.format === LEGACY_PAGE_FORMAT
      ? parts.map((artifact, i) => `${artifact.title}\n${urls?.[i] ?? ''}`)
      : [`Canonical parts: ${parts.length}`, ...parts.map(artifact => artifact.title)]),
  ].join('\n');
  if (text.length > 6000) throw Error('Page index exceeds compact retrieval budget');
  return text;
}
// Additive reading projection. Original byte archive and canonical toggle artifacts
// are verified separately by the existing writer and never deleted here.
export async function writePageTranscript(t: PageTransport, j: WriteJournal, meeting: string, plan: TranscriptPlan): Promise<PageReceipt> {
  if (!isPageFormat(plan.format)) throw Error('Page projection requires a distinct representation version');
  const preparedIndex = pageIndexText(plan);
  const root = await child(t, j, meeting, `Transcript Retrieval Index | ${plan.format} | ${plan.version}`, [], true);
  const parts: Array<{ artifact: Artifact; page: PageReceipt }> = [];
  for (const artifact of plan.artifacts.filter(a => a.key.startsWith('part:'))) {
    parts.push({ artifact, page: await child(t, j, root.id, artifactMarker(plan.version, artifact), artifact.chunks) });
  }
  const chunks = exactChunks(plan.format === LEGACY_PAGE_FORMAT
    ? pageIndexText(plan, parts.map(({ page }) => page.url))
    : preparedIndex);
  const validate = async () => {
    const rows = await t.list(root.id), pages = rows.filter(b => b.type === 'child_page'), body = rows.filter(b => b.type !== 'child_page');
    if (JSON.stringify(pages.map(b => b.id)) !== JSON.stringify(parts.map(p => p.page.id))) throw Error('Transcript page index ownership mismatch');
    if (!body.length) return false;
    if (body.length !== chunks.length || body.some((b, i) => b.type !== 'paragraph' || b.has_children || blockText(b) !== chunks[i])) throw Error('Transcript page index changed');
    return true;
  };
  if (!await validate()) {
    if (!await j.reserve(`page-index:${root.id}:${plan.version}`)) {
      if (!await validate()) throw Error('Uncertain page index append requires reconciliation');
    } else {
      await j.assertOwner(); await t.append(root.id, chunks.map(c => textBlock(c))); await j.assertOwner();
      if (!await validate()) throw Error('Missing transcript page index');
    }
  }
  // Re-read every page after the index is complete, not merely its planned text.
  const reconstructed = [];
  for (const { artifact, page } of parts) { await verify(t, page.id, artifact.chunks); reconstructed.push((await t.list(page.id)).map(blockText).join('')); }
  if (reconstructed.join('\n') !== plan.canonical) throw Error('Canonical child pages changed during verification');
  await j.assertOwner(); return root;
}
