import { Worker } from '@notionhq/workers';
import { j } from '@notionhq/workers/schema-builder';

const worker = new Worker();

export default worker;

const plainTextSchema = j.object({
  text: j.string().describe('Plain text extracted from a Notion block.'),
  type: j.string().describe('The Notion block type that produced the text.')
});

const summarizePageTool = worker.tool('summarizePage', {
  title: 'Summarize Page',
  description:
    'Read a Notion page and return a compact preview of its title, URL, last edited time, and first content blocks. Use when the user asks a Custom Agent to inspect page context without making changes.',
  schema: j.object({
    pageId: j.string().describe('The Notion page ID to inspect.'),
    maxBlocks: j
      .integer()
      .describe('Maximum number of child blocks to include. Use null for the default of 5.')
      .nullable()
  }),
  outputSchema: j.object({
    pageId: j.string().describe('The page ID that was inspected.'),
    title: j.string().describe('Best-effort page title.'),
    url: j.string().describe('The Notion page URL, or null if unavailable.').nullable(),
    lastEditedTime: j
      .string()
      .describe('The Notion last edited timestamp, or null if unavailable.')
      .nullable(),
    blocks: j.array(plainTextSchema).describe('Plain-text preview of page child blocks.')
  }),
  execute: async ({ pageId, maxBlocks }, { notion }) => {
    const page = await notion.pages.retrieve({ page_id: pageId });
    const blockLimit = clampBlockLimit(maxBlocks ?? 5);
    const children = await notion.blocks.children.list({
      block_id: pageId,
      page_size: blockLimit
    });

    return {
      pageId,
      title: extractPageTitle(page),
      url: readString(page, 'url'),
      lastEditedTime: readString(page, 'last_edited_time'),
      blocks: children.results.map((block) => ({
        type: readString(block, 'type') ?? 'unknown',
        text: extractBlockText(block)
      }))
    };
  }
});

markReadOnly(summarizePageTool);

worker.tool('appendPolicyNote', {
  title: 'Append Policy Note',
  description:
    'Append a short policy or handoff note to a Notion page after the user explicitly asks to write that note. This tool changes page content and should not be used for read-only inspection.',
  schema: j.object({
    pageId: j.string().describe('The Notion page ID that should receive the note.'),
    heading: j.string().describe('Short heading for the note.'),
    note: j.string().describe('Plain-text note body to append.'),
    sourceUrl: j
      .string()
      .describe(
        'Optional source URL to include below the note. Use null when there is no source URL.'
      )
      .nullable()
  }),
  outputSchema: j.object({
    appended: j.boolean().describe('Whether the note append call succeeded.'),
    pageId: j.string().describe('The page ID that received the note.'),
    blockCount: j.integer().describe('Number of blocks requested in the append operation.')
  }),
  execute: async ({ pageId, heading, note, sourceUrl }, { notion }) => {
    const children = [
      paragraphBlock(`Policy note: ${heading}`),
      paragraphBlock(note),
      ...(sourceUrl ? [paragraphBlock(`Source: ${sourceUrl}`)] : [])
    ];

    await notion.blocks.children.append({
      block_id: pageId,
      children
    });

    return {
      appended: true,
      pageId,
      blockCount: children.length
    };
  }
});

function markReadOnly(capability: { config: object }): void {
  const config = capability.config as Record<string, unknown>;
  config.hints = { readOnlyHint: true };
}

function clampBlockLimit(value: number): number {
  if (!Number.isFinite(value)) return 5;
  return Math.min(Math.max(Math.trunc(value), 1), 25);
}

function extractPageTitle(page: unknown): string {
  const properties = readRecord(page, 'properties');
  if (!properties) return 'Untitled';

  for (const property of Object.values(properties)) {
    const value = property as Record<string, unknown>;
    if (value.type !== 'title') continue;
    const title = richTextToPlain(value.title);
    if (title) return title;
  }

  return 'Untitled';
}

function extractBlockText(block: unknown): string {
  const record = asRecord(block);
  const type = readString(record, 'type');
  if (!type) return '';

  const payload = readRecord(record, type);
  if (!payload) return '';

  return (
    richTextToPlain(payload.rich_text) ||
    richTextToPlain(payload.title) ||
    richTextToPlain(payload.caption) ||
    readString(payload, 'plain_text') ||
    ''
  );
}

function richTextToPlain(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value
    .map((item) => {
      if (!isRecord(item)) return '';
      return readString(item, 'plain_text') ?? '';
    })
    .join('')
    .trim();
}

function paragraphBlock(content: string) {
  return {
    object: 'block' as const,
    type: 'paragraph' as const,
    paragraph: {
      rich_text: [
        {
          type: 'text' as const,
          text: { content }
        }
      ]
    }
  };
}

function readRecord(source: unknown, key: string): Record<string, unknown> | null {
  const record = asRecord(source);
  const value = record[key];
  return isRecord(value) ? value : null;
}

function readString(source: unknown, key: string): string | null {
  const record = asRecord(source);
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function asRecord(source: unknown): Record<string, unknown> {
  return isRecord(source) ? source : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
