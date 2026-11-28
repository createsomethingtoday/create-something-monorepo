import type { Chunk } from './types.js';

export const DEFAULT_CHUNK_MAX_CHARS = 1200;

/**
 * Sections of an API endpoint page that are left out. Measured on the v2
 * reference (2026-11-27): Errors, Examples and Types are 88% of the text and
 * repeat on every endpoint (the shared error enum, SDK samples in each
 * language, generated type names).
 */
const ENDPOINT_SKIPPED_SECTIONS = new Set(['errors', 'examples', 'types']);
const ENDPOINT_LINE = /^(GET|POST|PUT|PATCH|DELETE)\s+https?:\/\/\S+/;
const HEADING = /^(#{1,4})\s+(.+?)\s*#*\s*$/;
const FENCE = /^\s*(```|~~~)/;

interface Section {
  path: string[];
  anchor: string | null;
  lines: string[];
}

/** Heading text as a reader sees it: no emphasis marks, code ticks or link syntax. */
export function cleanHeading(raw: string): string {
  return raw
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** URL fragment for a heading, in the form the docs site links use (`#scopes-and-least-privilege`). */
export function headingAnchor(heading: string): string {
  return cleanHeading(heading)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

function cleanText(lines: string[]): string {
  return lines
    .filter((line) => line.trim() !== '\\')
    .join('\n')
    .replace(/&#x20;/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Blocks separated by blank lines; a code fence is one block. */
function splitBlocks(text: string): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  let inFence = false;
  for (const line of text.split('\n')) {
    if (FENCE.test(line)) inFence = !inFence;
    if (!inFence && line.trim() === '') {
      if (current.length > 0) blocks.push(current.join('\n'));
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current.join('\n'));
  return blocks;
}

function packPieces(pieces: string[], separator: string, maxChars: number): string[] {
  const packed: string[] = [];
  let current = '';
  for (const piece of pieces) {
    if (current && current.length + separator.length + piece.length > maxChars) {
      packed.push(current);
      current = piece;
    } else {
      current = current ? `${current}${separator}${piece}` : piece;
    }
  }
  if (current) packed.push(current);
  return packed;
}

function splitLongText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const pieces: string[] = [];
  for (const block of splitBlocks(text)) {
    if (block.length <= maxChars) {
      pieces.push(block);
      continue;
    }
    // A long list, table or code fence: cut at line ends, then inside a line as the last resort.
    const lines = block.split('\n').flatMap((line) => {
      if (line.length <= maxChars) return [line];
      const parts: string[] = [];
      for (let start = 0; start < line.length; start += maxChars) parts.push(line.slice(start, start + maxChars));
      return parts;
    });
    pieces.push(...packPieces(lines, '\n', maxChars));
  }
  return packPieces(pieces, '\n\n', maxChars);
}

/**
 * Split a page body into passages. Each passage is the text under one heading
 * (H1-H4), cut at paragraph or line ends when it is longer than `maxChars`.
 * The text is not rewritten, so a passage can be quoted as the docs state it.
 */
export function chunkPage(body: string, maxChars = DEFAULT_CHUNK_MAX_CHARS): { title: string; chunks: Chunk[] } {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const isEndpointPage = lines.slice(0, 40).some((line) => ENDPOINT_LINE.test(line));

  const sections: Section[] = [];
  const stack: Array<{ level: number; text: string }> = [];
  let current: Section = { path: [], anchor: null, lines: [] };
  let title = '';
  let inFence = false;
  let skipBelowLevel: number | null = null;

  for (const line of lines) {
    if (FENCE.test(line)) inFence = !inFence;
    const heading = inFence ? null : HEADING.exec(line);
    if (!heading) {
      if (skipBelowLevel === null) current.lines.push(line);
      continue;
    }

    const level = heading[1].length;
    const text = cleanHeading(heading[2]);
    if (skipBelowLevel !== null && level > skipBelowLevel) continue;
    skipBelowLevel = null;
    if (current.lines.length > 0) sections.push(current);

    while (stack.length > 0 && stack[stack.length - 1].level >= level) stack.pop();
    stack.push({ level, text });
    if (level === 1 && !title) title = text;

    if (isEndpointPage && level === 2 && ENDPOINT_SKIPPED_SECTIONS.has(text.toLowerCase())) {
      skipBelowLevel = level;
      current = { path: [], anchor: null, lines: [] };
      continue;
    }
    current = {
      path: stack.map((entry) => entry.text),
      anchor: level === 1 ? null : headingAnchor(heading[2]),
      lines: [],
    };
  }
  if (current.lines.length > 0) sections.push(current);

  const chunks: Chunk[] = [];
  for (const section of sections) {
    const text = cleanText(section.lines);
    if (!text) continue;
    const headingPath = section.path.join(' > ') || title;
    for (const part of splitLongText(text, maxChars)) {
      chunks.push({ ordinal: chunks.length, headingPath, anchor: section.anchor, text: part });
    }
  }
  return { title, chunks };
}
