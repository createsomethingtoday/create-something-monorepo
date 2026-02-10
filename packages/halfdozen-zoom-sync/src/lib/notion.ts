/**
 * Notion API Helpers
 *
 * Direct fetch wrappers for Notion API — no SDK required.
 * Pattern lifted from halfdozen-gmail-sync/worker/index.ts.
 *
 * Works in both Cloudflare Workers and Node.js environments.
 */

import { chunkText, MAX_BLOCKS_PER_REQUEST } from './text.js';
import { parseRelativeDate } from './text.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotionConfig {
  apiKey: string;
  databaseId: string;
}

export interface ClipData {
  url: string;
  title: string;
  speaker?: string;
  createdAt?: string;
  transcript?: string;
  summary?: string;
}

export interface SyncStats {
  synced: number;
  skipped: number;
  failed: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

/** Notion property mapping (matches the existing database schema) */
const PROPERTY_MAP = {
  title: 'Item',
  url: 'Source URL',
  speaker: 'Attendees',
  date: 'Date',
  status: 'Status',
  source: 'Source',
  type: 'Type',
} as const;

const SELECT_DEFAULTS = {
  status: 'Active',
  source: 'Zoom',
  type: 'Clip',
} as const;

// ---------------------------------------------------------------------------
// Core API helpers
// ---------------------------------------------------------------------------

export async function notionFetch(
  apiKey: string,
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<unknown> {
  const response = await fetch(`${NOTION_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error (${response.status}): ${error}`);
  }

  return response.json();
}

export async function notionQueryDatabase(
  apiKey: string,
  databaseId: string,
  filter: unknown,
  pageSize = 10,
): Promise<{ results: Array<{ id: string; properties: Record<string, any> }> }> {
  return notionFetch(apiKey, `/databases/${databaseId}/query`, 'POST', {
    filter,
    page_size: pageSize,
  }) as Promise<{ results: Array<{ id: string; properties: Record<string, any> }> }>;
}

export async function notionCreatePage(
  apiKey: string,
  databaseId: string,
  properties: Record<string, unknown>,
): Promise<{ id: string }> {
  return notionFetch(apiKey, '/pages', 'POST', {
    parent: { database_id: databaseId },
    properties,
  }) as Promise<{ id: string }>;
}

export async function notionAppendBlocks(
  apiKey: string,
  blockId: string,
  children: unknown[],
): Promise<{ results: Array<{ id: string }> }> {
  return notionFetch(apiKey, `/blocks/${blockId}/children`, 'PATCH', {
    children,
  }) as Promise<{ results: Array<{ id: string }> }>;
}

// ---------------------------------------------------------------------------
// Clip sync operations
// ---------------------------------------------------------------------------

/**
 * Check which clip URLs already exist in the Notion database.
 * Queries in batches of 10 (Notion OR filter limit).
 */
export async function findExistingClipUrls(
  config: NotionConfig,
  urls: string[],
): Promise<Set<string>> {
  const existing = new Set<string>();

  for (let i = 0; i < urls.length; i += 10) {
    const batch = urls.slice(i, i + 10);
    const filterConditions = batch.map((url) => ({
      property: PROPERTY_MAP.url,
      url: { equals: url },
    }));

    try {
      const response = await notionQueryDatabase(
        config.apiKey,
        config.databaseId,
        { or: filterConditions },
      );

      for (const result of response.results) {
        const urlProp = result.properties[PROPERTY_MAP.url];
        if (urlProp?.url) {
          existing.add(urlProp.url);
        }
      }
    } catch (e) {
      console.error(`Dedup query failed: ${e}`);
    }
  }

  return existing;
}

/**
 * Create a Notion page for a clip and append transcript as toggle block.
 */
export async function syncClipToNotion(
  config: NotionConfig,
  clip: ClipData,
): Promise<string> {
  // Build properties
  const properties: Record<string, unknown> = {
    [PROPERTY_MAP.title]: {
      title: [{ text: { content: clip.title.substring(0, 2000) } }],
    },
    [PROPERTY_MAP.url]: {
      url: clip.url,
    },
  };

  // Speaker
  if (clip.speaker) {
    properties[PROPERTY_MAP.speaker] = {
      rich_text: [{ text: { content: clip.speaker.substring(0, 2000) } }],
    };
  }

  // Date
  if (clip.createdAt) {
    const dateVal = parseRelativeDate(clip.createdAt);
    if (dateVal) {
      properties[PROPERTY_MAP.date] = {
        date: { start: dateVal },
      };
    }
  }

  // Select defaults (Status, Source, Type)
  for (const [key, value] of Object.entries(SELECT_DEFAULTS)) {
    const propName = PROPERTY_MAP[key as keyof typeof PROPERTY_MAP];
    if (propName) {
      properties[propName] = { select: { name: value } };
    }
  }

  // Create page
  const page = await notionCreatePage(config.apiKey, config.databaseId, properties);

  // Add transcript as toggle block
  if (clip.transcript) {
    const chunks = chunkText(clip.transcript);
    const paragraphs = chunks.map((chunk) => ({
      object: 'block' as const,
      type: 'paragraph' as const,
      paragraph: {
        rich_text: [{ type: 'text' as const, text: { content: chunk } }],
      },
    }));

    // First batch goes inside the toggle (max 100 blocks per Notion limit)
    const firstBatchSize = Math.min(paragraphs.length, MAX_BLOCKS_PER_REQUEST - 1);
    const firstBatch = paragraphs.slice(0, firstBatchSize);

    const toggleBlock = {
      object: 'block' as const,
      type: 'toggle' as const,
      toggle: {
        rich_text: [{ type: 'text' as const, text: { content: 'Transcript' } }],
        children: firstBatch,
      },
    };

    const appendResult = await notionAppendBlocks(config.apiKey, page.id, [toggleBlock]);

    // Append overflow batches to the toggle block
    if (paragraphs.length > firstBatchSize) {
      const toggleId = appendResult.results[0].id;
      for (let i = firstBatchSize; i < paragraphs.length; i += MAX_BLOCKS_PER_REQUEST) {
        const batch = paragraphs.slice(i, i + MAX_BLOCKS_PER_REQUEST);
        await notionAppendBlocks(config.apiKey, toggleId, batch);
      }
    }
  }

  return page.id;
}

/**
 * Sync a batch of clips to Notion with deduplication.
 */
export async function syncClipsToNotion(
  config: NotionConfig,
  clips: ClipData[],
): Promise<SyncStats> {
  const stats: SyncStats = { synced: 0, skipped: 0, failed: 0 };

  // Batch deduplication
  const urls = clips.map((c) => c.url);
  const existingUrls = await findExistingClipUrls(config, urls);

  for (const clip of clips) {
    if (existingUrls.has(clip.url)) {
      stats.skipped++;
      continue;
    }

    try {
      await syncClipToNotion(config, clip);
      stats.synced++;
    } catch (e) {
      console.error(`Failed to sync clip "${clip.title}": ${e}`);
      stats.failed++;
    }
  }

  return stats;
}

/**
 * Search clips in Notion by title, speaker, or date range.
 */
export async function searchClips(
  config: NotionConfig,
  options: {
    title?: string;
    speaker?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  },
): Promise<Array<{ id: string; title: string; url: string; speaker: string; date: string }>> {
  const filters: unknown[] = [];

  // Always filter by source = Zoom
  filters.push({
    property: PROPERTY_MAP.source,
    select: { equals: SELECT_DEFAULTS.source },
  });

  if (options.title) {
    filters.push({
      property: PROPERTY_MAP.title,
      title: { contains: options.title },
    });
  }

  if (options.speaker) {
    filters.push({
      property: PROPERTY_MAP.speaker,
      rich_text: { contains: options.speaker },
    });
  }

  if (options.dateFrom) {
    filters.push({
      property: PROPERTY_MAP.date,
      date: { on_or_after: options.dateFrom },
    });
  }

  if (options.dateTo) {
    filters.push({
      property: PROPERTY_MAP.date,
      date: { on_or_before: options.dateTo },
    });
  }

  const filter = filters.length === 1 ? filters[0] : { and: filters };

  const response = await notionQueryDatabase(
    config.apiKey,
    config.databaseId,
    filter,
    options.limit ?? 20,
  );

  return response.results.map((page) => ({
    id: page.id,
    title:
      page.properties[PROPERTY_MAP.title]?.title?.[0]?.plain_text || 'Untitled',
    url: page.properties[PROPERTY_MAP.url]?.url || '',
    speaker:
      page.properties[PROPERTY_MAP.speaker]?.rich_text?.[0]?.plain_text || '',
    date: page.properties[PROPERTY_MAP.date]?.date?.start || '',
  }));
}
