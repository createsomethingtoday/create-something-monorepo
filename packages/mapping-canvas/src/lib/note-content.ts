export const NOTE_BLOCK_TYPES = ['paragraph', 'heading1', 'heading2', 'heading3', 'bullet', 'numbered', 'quote'] as const;
export type NoteBlockType = typeof NOTE_BLOCK_TYPES[number];
export type NoteRun = { text: string; bold?: true; italic?: true; underline?: true; code?: true; link?: string };
export type NoteBlock = { type: NoteBlockType; runs: NoteRun[] };
export type NoteContent = { blocks: NoteBlock[] };

const encoder = new TextEncoder();
const runKeys = new Set(['text', 'bold', 'italic', 'underline', 'code', 'link']);
const safeLink = (value: string) => {
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'mailto:'; }
  catch { return false; }
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
      if (item.link !== undefined && (typeof item.link !== 'string' || item.link.length > 2048 || !safeLink(item.link))) return null;
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
