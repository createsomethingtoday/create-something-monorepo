import type { ParsedTranscript } from './types';

// Product budgets, not Notion guarantees. Each artifact is a single bounded write.
export const PART_CHAR_BUDGET = 6000;
export const TRANSCRIPT_FORMAT = 'indexed-transcript-v2';
const MAX_ARTIFACTS = 800;
export type Block = Record<string, any>;
export interface Artifact { key: string; title: string; chunks: string[] }
export interface TranscriptPlan {
  version: string;
  format?: string;
  canonical: string;
  original: string;
  blockCount: number;
  artifacts: Artifact[];
}

export async function hashText(text: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

// Notion normalizes CRLF and a leading BOM in rich text. Preserve source bytes
// with an ASCII representation; canonical parts remain readable transcript text.
export function encodeOriginal(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 8192) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  }
  return btoa(chunks.join(''));
}

export function decodeOriginal(encoded: string): string {
  const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  if (encodeOriginal(text) !== encoded) throw new Error('Noncanonical original encoding');
  return text;
}

// Slice without trimming, whitespace normalization, or splitting surrogate pairs.
export function exactChunks(text: string, size = 1800): string[] {
  const chunks: string[] = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + size, text.length);
    if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1]!)) end--;
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

export async function planTranscript(parsed: ParsedTranscript, format = TRANSCRIPT_FORMAT): Promise<TranscriptPlan> {
  if (!parsed.rawText || !parsed.segments.length) throw new Error('Empty or unsupported transcript');
  const timestamped = parsed.rawText.includes('-->');
  if (timestamped) {
    const sourceBlocks = parsed.rawText.replace(/\r/g, '').split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
    if (sourceBlocks.some((block, i) => !block.includes('-->') &&
      !(i === 0 && block.startsWith('WEBVTT')) && !/^(NOTE|STYLE|REGION)(?:\s|$)/.test(block))) {
      throw new Error('Unparsed VTT content; readiness withheld');
    }
    const cues = sourceBlocks.filter(block => block.includes('-->'));
    if (cues.length !== parsed.segments.length || cues.some(cue =>
      (cue.match(/-->/g) ?? []).length !== 1 ||
      !cue.split('\n').some(line => /^(?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3}\s+-->\s+(?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3}(?:\s.*)?$/.test(line.trim())))) {
      throw new Error('Unsupported or incomplete VTT cues');
    }
  }
  // Existing parser canonicalizes cue formatting. Keep every cue, including repeated text.
  const blocks = timestamped
    ? parsed.segments.map(segment => `${segment.timestamp}\n${segment.text}`)
    : [parsed.plainText];
  const canonical = blocks.join('\n');
  if (canonical !== parsed.plainText) throw new Error('Canonical reconstruction mismatch');
  // An oversized timestamp block is rejected rather than split or silently truncated.
  if (blocks.some(block => block.length > PART_CHAR_BUDGET)) throw new Error('Timestamp block exceeds part budget');
  const parts: Array<{ text: string; first: number; last: number }> = [];
  for (let i = 0; i < blocks.length; i++) {
    const last = parts.at(-1);
    if (last && last.text.length + 1 + blocks[i]!.length <= PART_CHAR_BUDGET) {
      last.text += `\n${blocks[i]}`;
      last.last = i;
    } else parts.push({ text: blocks[i]!, first: i, last: i });
  }
  if (parts.map(part => part.text).join('\n') !== canonical) throw new Error('Part reconstruction mismatch');
  const version = await hashText(JSON.stringify([format, parsed.rawText, canonical]));
  const artifacts: Artifact[] = [];
  const encodedOriginal = encodeOriginal(parsed.rawText);
  if (decodeOriginal(encodedOriginal) !== parsed.rawText) throw new Error('Original is not valid UTF-8 text');
  const originals = exactChunks(encodedOriginal, PART_CHAR_BUDGET);
  originals.forEach((text, i) => artifacts.push({
    key: `original:${i + 1}`, title: `Original UTF-8 base64 ${i + 1}/${originals.length}`, chunks: exactChunks(text),
  }));
  parts.forEach((part, i) => artifacts.push({
    key: `part:${i + 1}`,
    title: `Part ${String(i + 1).padStart(4, '0')}/${parts.length} | blocks ${part.first + 1}-${part.last + 1} | ${parsed.segments[part.first]?.timestamp ?? 'text'}-${parsed.segments[part.last]?.timestamp ?? 'text'}`,
    chunks: exactChunks(part.text),
  }));
  if (artifacts.length > MAX_ARTIFACTS) throw new Error('Transcript exceeds artifact budget');
  return { version, format, canonical, original: parsed.rawText, blockCount: blocks.length, artifacts };
}

export function artifactMarker(version: string, artifact: Artifact): string {
  return `Zoom indexed v2 | ${version} | ${artifact.key} | ${artifact.title}`;
}

export function textBlock(text: string, type = 'paragraph'): Block {
  return { object: 'block', type, [type]: { rich_text: [{ type: 'text', text: { content: text } }] } };
}

export function blockText(block: Block): string {
  return (block[block.type]?.rich_text ?? []).map((entry: Block) => entry.plain_text ?? entry.text?.content ?? '').join('');
}

export interface ArtifactTransport {
  list(parent: string): Promise<Block[]>;
  append(parent: string, blocks: Block[], after?: string): Promise<void>;
}
export interface WriteJournal {
  // Atomic insert. A key is never sent twice, even across expired leases.
  reserve(key: string): Promise<boolean>;
  assertOwner(): Promise<void>;
  projectionFence?(): { key: string; selected: string; owner: string };
}

export async function ensureArtifact(
  transport: ArtifactTransport, journal: WriteJournal, parent: string, version: string, artifact: Artifact,
): Promise<string> {
  const marker = artifactMarker(version, artifact);
  const find = async (): Promise<string | null> => {
    const matches = (await transport.list(parent)).filter(block => blockText(block) === marker);
    if (matches.length > 1) throw new Error(`Duplicate artifact: ${artifact.key}`);
    if (!matches.length) return null;
    const match = matches[0]!;
    if (typeof match.id !== 'string' || match.type !== 'toggle') throw new Error('Invalid artifact receipt');
    const children = await transport.list(match.id);
    if (children.length !== artifact.chunks.length || children.some((block, i) =>
      block.type !== 'paragraph' || block.has_children === true || blockText(block) !== artifact.chunks[i])) {
      throw new Error(`Incomplete or changed artifact: ${artifact.key}`);
    }
    return match.id;
  };
  await journal.assertOwner();
  const existing = await find();
  if (existing) return existing;
  if (!await journal.reserve(`${parent}:${version}:${artifact.key}`)) {
    // A previous call may still complete. Absence is not proof that retry is safe.
    const reconciled = await find();
    if (reconciled) return reconciled;
    throw new Error(`Uncertain Notion write requires reconciliation: ${artifact.key}`);
  }
  await journal.assertOwner();
  const block = textBlock(marker, 'toggle');
  block.toggle.children = artifact.chunks.map(chunk => textBlock(chunk));
  await transport.append(parent, [block]);
  await journal.assertOwner();
  const id = await find();
  if (!id) throw new Error(`Missing artifact after append: ${artifact.key}`);
  return id;
}

export async function writeIndexedTranscript(
  transport: ArtifactTransport, journal: WriteJournal, parent: string, plan: TranscriptPlan, linkPage = parent,
): Promise<string> {
  const receipts: Array<{ artifact: Artifact; id: string }> = [];
  for (const artifact of plan.artifacts) {
    receipts.push({ artifact, id: await ensureArtifact(transport, journal, parent, plan.version, artifact) });
  }
  // Read back all parts together. Count/order and exact strings catch gaps and duplicates.
  const reconstructed: string[] = [];
  const originals: string[] = [];
  for (const { artifact, id } of receipts) {
    const children = await transport.list(id);
    if (children.length !== artifact.chunks.length || children.some((child, i) =>
      child.type !== 'paragraph' || child.has_children === true || blockText(child) !== artifact.chunks[i])) {
      throw new Error(`Artifact changed during verification: ${artifact.key}`);
    }
    const text = children.map(blockText).join('');
    (artifact.key.startsWith('part:') ? reconstructed : originals).push(text);
  }
  if (reconstructed.join('\n') !== plan.canonical || decodeOriginal(originals.join('')) !== plan.original) {
    throw new Error('Read-back reconstruction mismatch');
  }
  const indexText = [
    `Version: ${plan.version}`,
    `Format: ${plan.format ?? TRANSCRIPT_FORMAT}; original encoding: UTF-8 base64`,
    `Canonical timestamp blocks: ${plan.blockCount}`,
    ...receipts.map(({ artifact, id }) => `${artifact.title}\nhttps://www.notion.so/${linkPage.replace(/-/g, '')}#${id.replace(/-/g, '')}`),
  ].join('\n');
  const index: Artifact = { key: 'index', title: 'Ordered transcript index', chunks: exactChunks(indexText) };
  if (index.chunks.length > 90) throw new Error('Index exceeds block budget');
  return ensureArtifact(transport, journal, parent, plan.version, index);
}
