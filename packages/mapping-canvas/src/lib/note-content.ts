export const NOTE_BLOCK_TYPES = ['paragraph', 'heading1', 'heading2', 'heading3', 'bullet', 'numbered', 'quote'] as const;
export type NoteBlockType = typeof NOTE_BLOCK_TYPES[number];
export type NoteRun = { text: string; bold?: true; italic?: true; underline?: true; code?: true; link?: string };
export type NoteBlock = { type: NoteBlockType; runs: NoteRun[] };
export type NoteContent = { blocks: NoteBlock[] };
export type NoteLayoutSegment = { text: string; run: Omit<NoteRun, 'text'>; x: number; width: number };
export type NoteLayoutLine = { type: NoteBlockType; size: number; height: number; segments: NoteLayoutSegment[] };

const encoder = new TextEncoder();
const runKeys = new Set(['text', 'bold', 'italic', 'underline', 'code', 'link']);
const unsafeLinkCharacter = /[\u0000-\u0020\u007f-\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/;
const safeLink = (value: string) => {
  if (encoder.encode(value).length > 2048 || unsafeLinkCharacter.test(value)) return false;
  if (value.startsWith('https://')) return value.slice(8).split(/[/?#]/, 1)[0].length > 0;
  return value.startsWith('mailto:') && value.slice(7).length > 0;
};

export function normalizeNoteContent(value: unknown): NoteContent | null {
  if (!value || typeof value !== 'object' || Object.keys(value).some((key) => key !== 'blocks')) return null;
  const blocks = (value as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks) || blocks.length < 1 || blocks.length > 100) return null;
  let runs = 0, bytes = 0;
  for (const block of blocks) {
    if (!block || typeof block !== 'object' || Object.keys(block).some((key) => key !== 'type' && key !== 'runs')) return null;
    const candidate = block as { type?: unknown; runs?: unknown };
    if (!NOTE_BLOCK_TYPES.includes(candidate.type as NoteBlockType) || !Array.isArray(candidate.runs) || candidate.runs.length < 1 || candidate.runs.length > 100) return null;
    for (const run of candidate.runs) {
      if (!run || typeof run !== 'object' || Object.keys(run).some((key) => !runKeys.has(key))) return null;
      const item = run as Record<string, unknown>;
      if (typeof item.text !== 'string' || item.text.length < 1 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(item.text)) return null;
      for (const mark of ['bold', 'italic', 'underline', 'code']) if (item[mark] !== undefined && item[mark] !== true) return null;
      if (item.link !== undefined && (typeof item.link !== 'string' || !safeLink(item.link))) return null;
      runs += 1; bytes += encoder.encode(item.text).length;
      if (runs > 500 || bytes > 32_000) return null;
    }
  }
  return structuredClone(value) as NoteContent;
}

export function noteContentText(content: NoteContent): string {
  let numbered = 0;
  return content.blocks.map((block) => {
    const text = block.runs.map((run) => run.text).join('');
    if (block.type === 'bullet') return `• ${text}`;
    if (block.type === 'numbered') return `${++numbered}. ${text}`;
    if (block.type === 'quote') return `“${text}”`;
    return text;
  }).join('\n');
}

export const plainNoteContent = (text: string): NoteContent => ({ blocks: [{ type: 'paragraph', runs: [{ text: text || ' ' }] }] });

const blockSize = (type: NoteBlockType) => type === 'heading1' ? 22 : type === 'heading2' ? 19 : type === 'heading3' ? 17 : 16;

export function layoutNoteContent(content: NoteContent, maxWidth: number, measure: (text: string, run: Omit<NoteRun, 'text'>, type: NoteBlockType, size: number) => number): NoteLayoutLine[] {
  const lines: NoteLayoutLine[] = [];
  let numbered = 0;
  for (const block of content.blocks) {
    const size = blockSize(block.type), height = size * 1.45;
    const prefix = block.type === 'bullet' ? '• ' : block.type === 'numbered' ? `${++numbered}. ` : block.type === 'quote' ? '“' : '';
    const suffix = block.type === 'quote' ? '”' : '';
    const items = [
      ...(prefix ? [{ text: prefix, run: {} as Omit<NoteRun, 'text'> }] : []),
      ...block.runs.flatMap(({ text, ...run }) => text.split(/(\s+)/).filter(Boolean).map((part) => ({ text: part, run }))),
      ...(suffix ? [{ text: suffix, run: {} as Omit<NoteRun, 'text'> }] : [])
    ];
    let segments: NoteLayoutSegment[] = [], x = 0;
    const flush = () => { if (segments.length) lines.push({ type: block.type, size, height, segments }); segments = []; x = 0; };
    for (const item of items) {
      if (!segments.length && /^\s+$/.test(item.text)) continue;
      const width = measure(item.text, item.run, block.type, size);
      if (/^\s+$/.test(item.text) && x + width > maxWidth) { flush(); continue; }
      if (segments.length && x + width > maxWidth && !/^\s+$/.test(item.text)) flush();
      if (width <= maxWidth || /^\s+$/.test(item.text)) { segments.push({ ...item, x, width }); x += width; continue; }
      let fragment = '';
      for (const character of item.text) {
        const next = fragment + character, nextWidth = measure(next, item.run, block.type, size);
        if (fragment && nextWidth > maxWidth) { const fragmentWidth = measure(fragment, item.run, block.type, size); segments.push({ text: fragment, run: item.run, x, width: fragmentWidth }); flush(); fragment = character; }
        else fragment = next;
      }
      if (fragment) { const fragmentWidth = measure(fragment, item.run, block.type, size); segments.push({ text: fragment, run: item.run, x, width: fragmentWidth }); x += fragmentWidth; }
    }
    flush();
  }
  return lines;
}
