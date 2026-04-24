import { describe, expect, it } from 'vitest';
import type { Client } from '@notionhq/client';

import {
  NotionTranscriptSyncService,
  findExistingPageMatch,
  pageHasTranscriptSection,
  resolvePropertyMapping,
} from './notion.js';
import { buildCanonicalVideoUrl } from './youtube.js';
import type { TranscriptRecord } from './types.js';

const VIDEO_ID = 'ZDv4iYaLbpI';
const DATA_SOURCE_ID = 'ds_youtube_videos';

type FakePropertyValue = Record<string, unknown>;
type FakePage = {
  id: string;
  url: string;
  properties: Record<string, FakePropertyValue>;
};
type FakeBlock = {
  id: string;
  type: string;
  has_children?: boolean;
  [key: string]: unknown;
};

function createRecord(
  overrides: Partial<TranscriptRecord> = {},
  segmentCount = 120,
): TranscriptRecord {
  const segments = Array.from({ length: segmentCount }, (_, index) => ({
    text: `Segment ${index + 1} explains the MCP flow and keeps enough content to require chunking.`,
    startSeconds: index * 15,
    endSeconds: index * 15 + 15,
  }));

  return {
    videoId: VIDEO_ID,
    url: buildCanonicalVideoUrl(VIDEO_ID),
    title: 'Transcript Sync Test',
    channelName: 'CREATE SOMETHING',
    publishedAt: '2026-04-20',
    thumbnailUrl: `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`,
    transcript: segments.map((segment) => segment.text).join(' '),
    segments,
    extractionMethod: 'browser',
    language: 'en',
    warnings: [],
    sourceDiagnostics: {
      attempts: [],
    },
    ...overrides,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function richText(content: string): FakePropertyValue {
  return {
    type: 'rich_text',
    rich_text: [{ plain_text: content, text: { content } }],
  };
}

function createFakeNotionClient() {
  const schema = {
    Title: { id: 'title', type: 'title' },
    'YouTube URL': { id: 'url', type: 'url' },
    'Video ID': { id: 'video-id', type: 'rich_text' },
    Channel: { id: 'channel', type: 'rich_text' },
    'Published At': { id: 'published-at', type: 'date' },
    Language: { id: 'language', type: 'rich_text' },
    'Extraction Method': { id: 'method', type: 'select' },
    'Transcript Status': { id: 'status', type: 'status' },
    'Synced At': { id: 'synced-at', type: 'date' },
  };

  let pageCounter = 0;
  let blockCounter = 0;
  const pages = new Map<string, FakePage>();
  const blocksByParent = new Map<string, FakeBlock[]>();

  function hydrateProperties(
    input: Record<string, FakePropertyValue>,
  ): Record<string, FakePropertyValue> {
    return Object.fromEntries(
      Object.entries(input).map(([name, value]) => [
        name,
        {
          type: schema[name as keyof typeof schema]?.type ?? 'unknown',
          ...clone(value),
        },
      ]),
    );
  }

  function normalizeBlocks(input: Array<Record<string, unknown>>): FakeBlock[] {
    return input.map((block) => {
      const normalized = clone(block);
      const id = `block_${++blockCounter}`;
      const nestedChildren =
        normalized.type === 'toggle' &&
        typeof normalized.toggle === 'object' &&
        normalized.toggle !== null &&
        Array.isArray((normalized.toggle as { children?: Array<Record<string, unknown>> }).children)
          ? (normalized.toggle as { children: Array<Record<string, unknown>> }).children
          : [];

      if (
        normalized.type === 'toggle' &&
        typeof normalized.toggle === 'object' &&
        normalized.toggle !== null &&
        'children' in normalized.toggle
      ) {
        delete (normalized.toggle as { children?: Array<Record<string, unknown>> }).children;
      }

      const fakeBlock: FakeBlock = {
        ...normalized,
        id,
        type: String(normalized.type),
        has_children: nestedChildren.length > 0,
      };

      if (nestedChildren.length > 0) {
        blocksByParent.set(id, normalizeBlocks(nestedChildren));
      }

      return fakeBlock;
    });
  }

  const client = {
    dataSources: {
      retrieve: async ({ data_source_id }: { data_source_id: string }) => ({
        id: data_source_id,
        title: [{ plain_text: 'YouTube Videos' }],
        properties: clone(schema),
      }),
      query: async () => ({
        results: clone([...pages.values()]),
        has_more: false,
        next_cursor: null,
      }),
    },
    databases: {
      retrieve: async ({ database_id }: { database_id: string }) => ({
        id: database_id,
        title: [{ plain_text: 'YouTube Videos' }],
        data_sources: [{ id: DATA_SOURCE_ID }],
      }),
    },
    pages: {
      create: async ({ properties }: { properties: Record<string, FakePropertyValue> }) => {
        const id = `page_${++pageCounter}`;
        const page: FakePage = {
          id,
          url: `https://notion.so/${id}`,
          properties: hydrateProperties(properties),
        };
        pages.set(id, page);
        blocksByParent.set(id, []);
        return clone(page);
      },
      update: async ({
        page_id,
        properties,
      }: {
        page_id: string;
        properties: Record<string, FakePropertyValue>;
      }) => {
        const existing = pages.get(page_id);
        if (!existing) {
          throw new Error(`Unknown page ${page_id}`);
        }

        existing.properties = {
          ...existing.properties,
          ...hydrateProperties(properties),
        };

        return clone(existing);
      },
      retrieve: async ({ page_id }: { page_id: string }) => {
        const page = pages.get(page_id);
        if (!page) {
          throw new Error(`Unknown page ${page_id}`);
        }
        return clone(page);
      },
    },
    blocks: {
      children: {
        list: async ({ block_id }: { block_id: string }) => ({
          results: clone(blocksByParent.get(block_id) ?? []),
          has_more: false,
          next_cursor: null,
        }),
        append: async ({
          block_id,
          children,
        }: {
          block_id: string;
          children: Array<Record<string, unknown>>;
        }) => {
          const normalized = normalizeBlocks(children);
          const current = blocksByParent.get(block_id) ?? [];
          current.push(...normalized);
          blocksByParent.set(block_id, current);
          return {
            results: clone(normalized),
          };
        },
      },
    },
  };

  return {
    client: client as unknown as Client,
    state: {
      schema,
      pages,
      blocksByParent,
    },
  };
}

function paragraphText(block: FakeBlock): string {
  const paragraph = block.paragraph as { rich_text?: Array<{ text?: { content?: string } }> } | undefined;
  return paragraph?.rich_text?.[0]?.text?.content ?? '';
}

describe('Notion helpers', () => {
  it('infers sensible default property mappings from the schema', () => {
    const { mapping, warnings } = resolvePropertyMapping({
      Title: { id: 'title', name: 'Title', type: 'title' },
      'YouTube URL': { id: 'url', name: 'YouTube URL', type: 'url' },
      'Video ID': { id: 'video-id', name: 'Video ID', type: 'rich_text' },
      Channel: { id: 'channel', name: 'Channel', type: 'rich_text' },
    });

    expect(mapping).toEqual({
      title: 'Title',
      url: 'YouTube URL',
      videoId: 'Video ID',
      channelName: 'Channel',
    });
    expect(warnings).toEqual([]);
  });

  it('matches existing pages by canonical URL before video ID', () => {
    const mapping = {
      title: 'Title',
      url: 'YouTube URL',
      videoId: 'Video ID',
    };
    const match = findExistingPageMatch(
      [
        {
          id: 'page_1',
          properties: {
            'YouTube URL': { type: 'url', url: buildCanonicalVideoUrl(VIDEO_ID) },
            'Video ID': richText(VIDEO_ID),
          },
        },
      ],
      mapping,
      {
        url: buildCanonicalVideoUrl(VIDEO_ID),
        videoId: VIDEO_ID,
      },
    );

    expect(match).toMatchObject({
      matchedOn: 'url',
      page: {
        id: 'page_1',
      },
    });
  });

  it('detects an existing transcript section from top-level blocks', () => {
    expect(
      pageHasTranscriptSection([
        {
          id: 'block_1',
          type: 'toggle',
          toggle: {
            rich_text: [{ plain_text: 'Transcript', text: { content: 'Transcript' } }],
          },
        },
      ]),
    ).toBe(true);
  });
});

describe('NotionTranscriptSyncService', () => {
  it('creates a page, appends chunked transcript blocks, then updates without duplication', async () => {
    const { client, state } = createFakeNotionClient();
    const service = new NotionTranscriptSyncService({
      client,
      defaultDatabaseId: DATA_SOURCE_ID,
    });
    const created = await service.syncTranscript(createRecord(), {
      includeTimestamps: true,
    });

    expect(created).toMatchObject({
      databaseId: DATA_SOURCE_ID,
      dataSourceId: DATA_SOURCE_ID,
      action: 'created',
      transcriptAction: 'appended',
    });
    expect(state.pages.size).toBe(1);

    const pageId = created.pageId;
    const topLevelBlocks = state.blocksByParent.get(pageId) ?? [];
    expect(topLevelBlocks).toHaveLength(1);
    expect(topLevelBlocks[0]?.type).toBe('toggle');

    const toggleChildren = state.blocksByParent.get(topLevelBlocks[0]!.id) ?? [];
    expect(toggleChildren.length).toBeGreaterThan(1);
    expect(toggleChildren.every((block) => paragraphText(block).length <= 1_900)).toBe(true);
    expect(toggleChildren[0] && paragraphText(toggleChildren[0]).startsWith('[00:00]')).toBe(true);

    const updated = await service.syncTranscript(
      createRecord({
        title: 'Transcript Sync Test Updated',
      }),
      {
        includeTimestamps: true,
      },
    );

    expect(updated).toMatchObject({
      action: 'updated',
      transcriptAction: 'skipped_existing',
      matchedOn: 'url',
    });
    expect(state.pages.size).toBe(1);
    expect(state.blocksByParent.get(pageId)).toHaveLength(1);

    const searchResults = await service.searchDocuments(VIDEO_ID);
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0]).toMatchObject({
      id: pageId,
      title: 'Transcript Sync Test Updated',
      url: buildCanonicalVideoUrl(VIDEO_ID),
      metadata: {
        videoId: VIDEO_ID,
      },
    });
    expect(searchResults[0]?.text).toContain('[00:00] Segment 1 explains the MCP flow');

    const fetched = await service.fetchDocument(pageId);
    expect(fetched.id).toBe(pageId);
    expect(fetched.url).toBe(buildCanonicalVideoUrl(VIDEO_ID));
    expect(fetched.text).toContain('Transcript Sync Test Updated');
    expect(fetched.text).toContain('[00:00]');
    expect(fetched.text).not.toContain('\n\nTranscript\n\nTranscript');
    expect(fetched.metadata).toMatchObject({
      videoId: VIDEO_ID,
      channelName: 'CREATE SOMETHING',
      notionUrl: `https://notion.so/${pageId}`,
    });
  });
});
