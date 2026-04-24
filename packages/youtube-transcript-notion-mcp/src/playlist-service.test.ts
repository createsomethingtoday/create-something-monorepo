import { describe, expect, it, vi } from 'vitest';

import { InMemoryPlaylistStateStore } from './playlist-state.js';
import { YouTubePlaylistSyncService } from './playlist-service.js';
import { TranscriptExtractionError } from './transcript-service.js';
import type {
  NotionService,
  TranscriptRecord,
  TranscriptService,
} from './types.js';

const PLAYLIST_ID = 'PLlu6DY1uonzYTiwLRBUj5OZBXUa6n4mCz';
const VIDEO_ID = 'ZDv4iYaLbpI';

function createTranscriptRecord(
  overrides: Partial<TranscriptRecord> = {},
): TranscriptRecord {
  return {
    videoId: VIDEO_ID,
    url: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    title: 'Stop Wasting Money on AI APIs',
    channelName: 'Cloudflare Developers',
    publishedAt: '2026-04-23T08:41:34Z',
    thumbnailUrl: `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`,
    transcript: 'First sentence. Second sentence.',
    segments: [
      {
        text: 'First sentence.',
        startSeconds: 0,
        endSeconds: 3,
      },
      {
        text: 'Second sentence.',
        startSeconds: 3,
        endSeconds: 6,
      },
    ],
    extractionMethod: 'supadata',
    language: 'en',
    warnings: [],
    sourceDiagnostics: {
      attempts: [],
      transcriptMode: 'native',
    },
    ...overrides,
  };
}

function createTranscriptService(
  extractImpl: TranscriptService['extract'],
): TranscriptService {
  return {
    extract: extractImpl,
    getStatus: () => ({
      configured: true,
    }),
  };
}

function createNotionService(
  syncImpl: NotionService['syncTranscript'],
): NotionService {
  return {
    isConfigured: () => true,
    getStatus: () => ({
      configured: true,
    }),
    getDatabaseSchema: vi.fn(),
    resolvePageVideoSource: vi.fn(),
    syncTranscript: syncImpl,
    syncTranscriptToPage: vi.fn(),
    searchDocuments: vi.fn(),
    fetchDocument: vi.fn(),
  };
}

function createYouTubeDataFetchMock(items: Array<Record<string, unknown>>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/playlists?')) {
      return new Response(
        JSON.stringify({
          items: [
            {
              snippet: {
                title: 'YouTube Transcripting',
              },
            },
          ],
        }),
        { status: 200 },
      );
    }

    if (url.includes('/playlistItems?')) {
      return new Response(
        JSON.stringify({
          items,
        }),
        { status: 200 },
      );
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  });
}

describe('YouTubePlaylistSyncService', () => {
  it('lists playlist items with exact playlist-added timestamps', async () => {
    const fetchMock = createYouTubeDataFetchMock([
      {
        snippet: {
          title: 'Stop Wasting Money on AI APIs',
          publishedAt: '2026-04-24T00:00:00Z',
          position: 0,
          videoOwnerChannelTitle: 'Cloudflare Developers',
          resourceId: {
            videoId: VIDEO_ID,
          },
          thumbnails: {
            high: {
              url: `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`,
            },
          },
        },
        contentDetails: {
          videoPublishedAt: '2026-04-23T08:41:34Z',
        },
      },
    ]);

    const service = new YouTubePlaylistSyncService(
      {
        apiKey: 'yt_api_key',
        stateStore: new InMemoryPlaylistStateStore(),
        transcriptService: createTranscriptService(async () => createTranscriptRecord()),
        notionService: createNotionService(async () => {
          throw new Error('not used');
        }),
      },
      fetchMock as unknown as typeof fetch,
    );

    const result = await service.listItems({
      playlistId: PLAYLIST_ID,
      limit: 5,
    });

    expect(result).toMatchObject({
      playlistId: PLAYLIST_ID,
      playlistTitle: 'YouTube Transcripting',
      items: [
        {
          videoId: VIDEO_ID,
          dateAddedToPlaylist: '2026-04-24T00:00:00Z',
          channelName: 'Cloudflare Developers',
        },
      ],
    });
  });

  it('limits the first run to the most recent N items and marks older backlog as seen', async () => {
    const firstVideoId = 'aaaaaaaaaaa';
    const secondVideoId = 'bbbbbbbbbbb';
    const fetchMock = createYouTubeDataFetchMock([
      {
        snippet: {
          title: 'Newest video',
          publishedAt: '2026-04-24T10:00:00Z',
          position: 0,
          videoOwnerChannelTitle: 'CREATE SOMETHING',
          resourceId: {
            videoId: firstVideoId,
          },
        },
      },
      {
        snippet: {
          title: 'Older backlog video',
          publishedAt: '2026-04-23T10:00:00Z',
          position: 1,
          videoOwnerChannelTitle: 'CREATE SOMETHING',
          resourceId: {
            videoId: secondVideoId,
          },
        },
      },
    ]);

    const notionSync = vi.fn(async (record: TranscriptRecord) => ({
      databaseId: 'db',
      dataSourceId: 'ds',
      pageId: `page-${record.videoId}`,
      action: 'created' as const,
      transcriptAction: 'appended' as const,
      warnings: [],
      propertyMapping: {
        title: 'Title',
      },
    }));

    const transcriptService = createTranscriptService(async ({ videoUrl }) =>
      createTranscriptRecord({
        videoId: videoUrl.slice(-11),
        url: videoUrl,
        title: videoUrl.includes(firstVideoId) ? 'Newest video' : 'Older backlog video',
      }),
    );

    const stateStore = new InMemoryPlaylistStateStore();
    const service = new YouTubePlaylistSyncService(
      {
        apiKey: 'yt_api_key',
        defaultDatabaseId: 'db',
        maxScanItems: 10,
        maxSyncItems: 1,
        stateStore,
        transcriptService,
        notionService: createNotionService(notionSync),
      },
      fetchMock as unknown as typeof fetch,
    );

    const result = await service.syncPlaylist({
      playlistId: PLAYLIST_ID,
      maxItems: 1,
      maxScanItems: 10,
    });

    expect(result).toMatchObject({
      created: 1,
      updated: 0,
      cutoffApplied: true,
      processedCount: 1,
      items: [
        {
          videoId: firstVideoId,
          action: 'created',
        },
      ],
    });
    expect(notionSync).toHaveBeenCalledTimes(1);

    const state = await stateStore.getState(PLAYLIST_ID);
    expect(state.recentVideoIds).toEqual([firstVideoId]);
    expect(state.recentItemKeys).toContain(`${firstVideoId}:2026-04-24T10:00:00Z`);
    expect(state.recentItemKeys).toContain(`${secondVideoId}:2026-04-23T10:00:00Z`);
  });

  it('creates a Notion row with an unavailable transcript note when extraction fails', async () => {
    const notionSync = vi.fn(async (_record: TranscriptRecord, options) => ({
      databaseId: 'db',
      dataSourceId: 'ds',
      pageId: 'page_unavailable',
      action: 'created' as const,
      transcriptAction: 'appended' as const,
      warnings: [],
      propertyMapping: {
        title: 'Title',
      },
      pageUrl: 'https://notion.so/page_unavailable',
      matchedOn: undefined,
    }));

    const transcriptService = createTranscriptService(async () => {
      throw new TranscriptExtractionError(
        'EMPTY_TRANSCRIPT',
        'No transcript was available.',
        {
          attempts: [],
        },
      );
    });

    const service = new YouTubePlaylistSyncService(
      {
        apiKey: 'yt_api_key',
        defaultDatabaseId: 'db',
        stateStore: new InMemoryPlaylistStateStore(),
        transcriptService,
        notionService: createNotionService(notionSync),
      },
      createYouTubeDataFetchMock([
        {
          snippet: {
            title: 'No captions video',
            publishedAt: '2026-04-24T12:00:00Z',
            position: 0,
            videoOwnerChannelTitle: 'CREATE SOMETHING',
            resourceId: {
              videoId: VIDEO_ID,
            },
          },
        },
      ]) as unknown as typeof fetch,
    );

    const result = await service.syncPlaylist({
      playlistId: PLAYLIST_ID,
    });

    expect(result).toMatchObject({
      created: 1,
      failed: 0,
      items: [
        {
          videoId: VIDEO_ID,
          transcriptStatus: 'unavailable',
          extractionMethod: 'unavailable',
          action: 'created',
        },
      ],
    });
    expect(notionSync).toHaveBeenCalledTimes(1);
    const notionCall = notionSync.mock.calls[0];
    expect(notionCall?.[0]).toMatchObject({
      extractionMethod: 'unavailable',
      dateAddedToPlaylist: '2026-04-24T12:00:00Z',
      playlistTitle: 'YouTube Transcripting',
    });
    expect(notionCall?.[1]).toMatchObject({
      replaceExistingTranscript: true,
      transcriptBodyText: 'Transcript unavailable: No transcript was available.',
    });
    expect(notionCall?.[1]?.transcriptHeaderLines).toContain(
      'Captions source: none',
    );
  });
});
