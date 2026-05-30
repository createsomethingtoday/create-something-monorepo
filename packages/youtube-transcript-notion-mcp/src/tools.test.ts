import { describe, expect, it } from 'vitest';

import { registerTools } from './tools.js';
import { TranscriptExtractionError } from './transcript-service.js';
import { buildCanonicalVideoUrl } from './youtube.js';
import type { RuntimeDependencies, TranscriptRecord } from './types.js';

const VIDEO_ID = 'ZDv4iYaLbpI';

type ToolHandler = (input: Record<string, unknown>) => Promise<Record<string, unknown>>;

class FakeServer {
  readonly definitions = new Map<string, Record<string, unknown>>();
  readonly handlers = new Map<string, ToolHandler>();

  registerTool(name: string, definition: Record<string, unknown>, handler: ToolHandler): void {
    this.definitions.set(name, definition);
    this.handlers.set(name, handler);
  }
}

function createRecord(): TranscriptRecord {
  return {
    videoId: VIDEO_ID,
    url: buildCanonicalVideoUrl(VIDEO_ID),
    title: 'Tool Wrapper Test',
    channelName: 'CREATE SOMETHING',
    publishedAt: '2026-04-20',
    thumbnailUrl: `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`,
    transcript: 'First segment Second segment',
    segments: [
      { text: 'First segment', startSeconds: 0, endSeconds: 15 },
      { text: 'Second segment', startSeconds: 15, endSeconds: 30 }
    ],
    extractionMethod: 'browser',
    language: 'en',
    warnings: ['Direct extraction failed: Direct transcript extraction failed with status 400.'],
    sourceDiagnostics: {
      attempts: [
        { provider: 'direct', ok: false, code: 'FAILED_PRECONDITION' },
        { provider: 'browser', ok: true }
      ]
    }
  };
}

function createDeps(): RuntimeDependencies {
  return {
    transcriptService: {
      extract: async () => createRecord(),
      getStatus: () => ({ providers: {} })
    },
    notionService: {
      isConfigured: () => true,
      getStatus: () => ({ configured: true }),
      getDatabaseSchema: async () => ({
        databaseId: 'db_1',
        dataSourceId: 'ds_1',
        title: 'Videos',
        properties: {
          Title: { name: 'Title', type: 'title' }
        }
      }),
      resolvePageVideoSource: async (pageId) => ({
        pageId,
        pageUrl: `https://notion.so/${pageId}`,
        title: 'Tool Wrapper Test',
        videoUrl: buildCanonicalVideoUrl(VIDEO_ID),
        videoId: VIDEO_ID,
        source: 'property',
        sourceProperty: 'Source URL',
        warnings: [],
        propertyMapping: {
          title: 'Title',
          url: 'Source URL'
        }
      }),
      syncTranscript: async () => ({
        databaseId: 'db_1',
        dataSourceId: 'ds_1',
        pageId: 'page_1',
        pageUrl: 'https://notion.so/page_1',
        action: 'created',
        transcriptAction: 'appended',
        warnings: [],
        propertyMapping: {
          title: 'Title'
        }
      }),
      syncTranscriptToPage: async (pageId) => ({
        pageId,
        pageUrl: `https://notion.so/${pageId}`,
        action: 'updated',
        transcriptAction: 'appended',
        warnings: [],
        propertyMapping: {
          title: 'Title',
          url: 'Source URL'
        }
      }),
      searchDocuments: async () => [
        {
          id: 'page_1',
          title: 'Tool Wrapper Test',
          text: 'CREATE SOMETHING • browser',
          url: buildCanonicalVideoUrl(VIDEO_ID),
          metadata: {
            videoId: VIDEO_ID
          }
        }
      ],
      fetchDocument: async () => ({
        id: 'page_1',
        title: 'Tool Wrapper Test',
        text: 'Tool Wrapper Test\n\nhttps://www.youtube.com/watch?v=ZDv4iYaLbpI',
        url: buildCanonicalVideoUrl(VIDEO_ID),
        metadata: {
          videoId: VIDEO_ID
        }
      })
    },
    playlistService: {
      listItems: async () => ({
        playlistId: 'PL123',
        playlistUrl: 'https://www.youtube.com/playlist?list=PL123',
        playlistTitle: 'Playlist Test',
        items: [],
        limit: 10
      }),
      syncPlaylist: async () => ({
        playlistId: 'PL123',
        playlistUrl: 'https://www.youtube.com/playlist?list=PL123',
        playlistTitle: 'Playlist Test',
        databaseId: 'db_1',
        dryRun: false,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        cutoffApplied: false,
        processedCount: 0,
        state: {
          playlistId: 'PL123',
          recentItemKeys: [],
          recentVideoIds: []
        },
        items: []
      }),
      getStatus: async () => ({
        configured: true
      })
    },
    serverInfo: {
      name: 'youtube-transcript-notion-mcp',
      version: '1.0.0',
      displayName: 'YouTube Transcript + Notion MCP',
      description: 'Test server',
      defaultLanguage: 'en',
      security: {
        bearerProtectionEnabled: true,
        unauthenticatedBillableTranscriptAccess: false,
        unauthenticatedNotionAccess: false,
        recommendations: []
      },
      configWarnings: []
    }
  };
}

function getHandler(server: FakeServer, name: string): ToolHandler {
  const handler = server.handlers.get(name);
  if (!handler) {
    throw new Error(`Missing handler ${name}`);
  }
  return handler;
}

describe('tool registration', () => {
  it('registers the expected tool surface with read-only hints', () => {
    const server = new FakeServer();
    registerTools(server as never, createDeps());

    const extractDefinition = server.definitions.get('extract_transcript');
    const enrichDefinition = server.definitions.get('enrich_notion_page');
    const syncDefinition = server.definitions.get('sync_video_to_notion');
    const schemaDefinition = server.definitions.get('get_database_schema');
    const searchDefinition = server.definitions.get('search');
    const fetchDefinition = server.definitions.get('fetch');

    expect(extractDefinition?.annotations).toMatchObject({ readOnlyHint: true });
    expect(enrichDefinition?.annotations).toMatchObject({ readOnlyHint: false });
    expect(syncDefinition?.annotations).toMatchObject({ readOnlyHint: false });
    expect(schemaDefinition?.annotations).toMatchObject({ readOnlyHint: true });
    expect(searchDefinition?.annotations).toMatchObject({ readOnlyHint: true });
    expect(fetchDefinition?.annotations).toMatchObject({ readOnlyHint: true });
    expect(extractDefinition?.description).toContain('Supadata first');
    expect(server.definitions.has('list_playlist_items')).toBe(false);
    expect(server.definitions.has('sync_playlist_to_notion')).toBe(false);
    expect(server.definitions.has('get_playlist_sync_status')).toBe(false);
    expect(Object.keys((enrichDefinition?.inputSchema as Record<string, unknown>) ?? {})).toContain(
      'confirmed'
    );
    expect(Object.keys((syncDefinition?.inputSchema as Record<string, unknown>) ?? {})).toContain(
      'confirmed'
    );
    expect(Object.keys((searchDefinition?.inputSchema as Record<string, unknown>) ?? {})).toEqual([
      'query'
    ]);
    expect(Object.keys((fetchDefinition?.inputSchema as Record<string, unknown>) ?? {})).toEqual([
      'id'
    ]);
  });

  it('returns Apps SDK shaped structured content for transcript extraction', async () => {
    const server = new FakeServer();
    registerTools(server as never, createDeps());

    const result = await getHandler(
      server,
      'extract_transcript'
    )({
      videoUrl: buildCanonicalVideoUrl(VIDEO_ID),
      includeTimestamps: true
    });
    const structuredContent = result.structuredContent as Record<string, unknown>;

    expect(structuredContent).toMatchObject({
      videoId: VIDEO_ID,
      extractionMethod: 'browser',
      warnings: ['Direct extraction failed: Direct transcript extraction failed with status 400.'],
      segmentSummary: {
        count: 2
      }
    });
    expect(structuredContent.transcriptWithTimestamps).toBe(
      '[00:00] First segment\n[00:15] Second segment'
    );
    const visibleContent = JSON.parse((result.content as Array<{ text: string }>)[0]!.text);
    expect(visibleContent).toMatchObject({
      resultType: 'youtube_transcript',
      title: 'Tool Wrapper Test',
      extractionMethod: 'browser',
      transcript: 'First segment Second segment',
      transcriptWithTimestamps: '[00:00] First segment\n[00:15] Second segment',
      segmentSummary: {
        count: 2
      },
      segments: [
        { text: 'First segment', startSeconds: 0, endSeconds: 15 },
        { text: 'Second segment', startSeconds: 15, endSeconds: 30 }
      ]
    });
  });

  it('updates an existing Notion page from its stored YouTube URL', async () => {
    const server = new FakeServer();
    registerTools(server as never, createDeps());

    const result = await getHandler(
      server,
      'enrich_notion_page'
    )({
      pageId: 'page_42',
      includeTimestamps: true,
      confirmed: true
    });
    const structuredContent = result.structuredContent as Record<string, any>;

    expect(structuredContent.source).toMatchObject({
      pageId: 'page_42',
      videoId: VIDEO_ID,
      source: 'property',
      sourceProperty: 'Source URL'
    });
    expect(structuredContent.video).toMatchObject({
      videoId: VIDEO_ID,
      extractionMethod: 'browser'
    });
    expect(structuredContent.notion).toMatchObject({
      pageId: 'page_42',
      action: 'updated',
      transcriptAction: 'appended'
    });
    const visibleContent = JSON.parse((result.content as Array<{ text: string }>)[0]!.text);
    expect(visibleContent).toMatchObject({
      resultType: 'notion_page_enrichment',
      video: {
        videoId: VIDEO_ID,
        title: 'Tool Wrapper Test'
      },
      notion: {
        pageId: 'page_42',
        action: 'updated',
        transcriptAction: 'appended'
      }
    });
  });

  it('rejects Notion write tools unless confirmation is explicitly passed', async () => {
    const server = new FakeServer();
    const deps = createDeps();
    let syncCalled = false;
    let enrichCalled = false;
    deps.notionService.syncTranscript = async () => {
      syncCalled = true;
      return {
        databaseId: 'db_1',
        dataSourceId: 'ds_1',
        pageId: 'page_1',
        action: 'created',
        transcriptAction: 'appended',
        warnings: [],
        propertyMapping: {
          title: 'Title'
        }
      };
    };
    deps.notionService.resolvePageVideoSource = async () => {
      enrichCalled = true;
      throw new Error('resolvePageVideoSource should not run without confirmation.');
    };
    registerTools(server as never, deps);

    const syncResult = await getHandler(
      server,
      'sync_video_to_notion'
    )({
      videoUrl: buildCanonicalVideoUrl(VIDEO_ID)
    });
    const enrichResult = await getHandler(
      server,
      'enrich_notion_page'
    )({
      pageId: 'page_42'
    });

    expect(syncResult).toMatchObject({
      isError: true,
      structuredContent: {
        error: {
          code: 'WRITE_CONFIRMATION_REQUIRED'
        }
      }
    });
    expect(enrichResult).toMatchObject({
      isError: true,
      structuredContent: {
        error: {
          code: 'WRITE_CONFIRMATION_REQUIRED'
        }
      }
    });
    expect(syncCalled).toBe(false);
    expect(enrichCalled).toBe(false);
  });

  it('returns Dify-visible schema JSON for database inspection', async () => {
    const server = new FakeServer();
    registerTools(server as never, createDeps());

    const result = await getHandler(server, 'get_database_schema')({});
    const structuredContent = result.structuredContent as Record<string, any>;
    const visibleContent = JSON.parse((result.content as Array<{ text: string }>)[0]!.text);

    expect(structuredContent.properties.Title).toMatchObject({
      name: 'Title',
      type: 'title'
    });
    expect(visibleContent).toMatchObject({
      resultType: 'notion_database_schema',
      databaseId: 'db_1',
      dataSourceId: 'ds_1',
      properties: {
        Title: {
          name: 'Title',
          type: 'title'
        }
      }
    });
  });

  it('includes transcript diagnostics inside the Apps SDK error payload', async () => {
    const server = new FakeServer();
    const deps = createDeps();
    deps.transcriptService.extract = async () => {
      throw new TranscriptExtractionError(
        'TRANSCRIPT_PANEL_UNAVAILABLE',
        'Could not find a transcript control on the YouTube watch page.',
        {
          attempts: [
            {
              provider: 'direct',
              ok: false,
              code: 'FAILED_PRECONDITION'
            },
            {
              provider: 'browser',
              ok: false,
              code: 'TRANSCRIPT_PANEL_UNAVAILABLE'
            }
          ],
          browserErrorDetails: {
            strategy: 'description-panel'
          }
        },
        ['Direct extraction failed: Direct transcript extraction failed with status 400.']
      );
    };
    registerTools(server as never, deps);

    const result = await getHandler(
      server,
      'extract_transcript'
    )({
      videoUrl: buildCanonicalVideoUrl(VIDEO_ID)
    });

    expect(result).toMatchObject({
      isError: true,
      structuredContent: {
        error: {
          code: 'TRANSCRIPT_PANEL_UNAVAILABLE',
          message: 'Could not find a transcript control on the YouTube watch page.',
          details: {
            attempts: [
              {
                provider: 'direct',
                ok: false,
                code: 'FAILED_PRECONDITION'
              },
              {
                provider: 'browser',
                ok: false,
                code: 'TRANSCRIPT_PANEL_UNAVAILABLE'
              }
            ],
            browserErrorDetails: {
              strategy: 'description-panel'
            }
          }
        },
        warnings: [
          'Direct extraction failed: Direct transcript extraction failed with status 400.'
        ],
        sourceDiagnostics: {
          attempts: [
            {
              provider: 'direct',
              ok: false,
              code: 'FAILED_PRECONDITION'
            },
            {
              provider: 'browser',
              ok: false,
              code: 'TRANSCRIPT_PANEL_UNAVAILABLE'
            }
          ],
          browserErrorDetails: {
            strategy: 'description-panel'
          }
        }
      }
    });
  });

  it('returns the exact JSON wrappers for search and fetch', async () => {
    const server = new FakeServer();
    registerTools(server as never, createDeps());

    const searchResult = await getHandler(server, 'search')({ query: VIDEO_ID });
    expect(searchResult).not.toHaveProperty('structuredContent');
    expect(searchResult).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            results: [
              {
                id: 'page_1',
                title: 'Tool Wrapper Test',
                text: 'CREATE SOMETHING • browser',
                url: buildCanonicalVideoUrl(VIDEO_ID),
                metadata: {
                  videoId: VIDEO_ID
                }
              }
            ]
          })
        }
      ]
    });

    const fetchResult = await getHandler(server, 'fetch')({ id: 'page_1' });
    expect(fetchResult).not.toHaveProperty('structuredContent');
    expect(fetchResult).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            id: 'page_1',
            title: 'Tool Wrapper Test',
            text: 'Tool Wrapper Test\n\nhttps://www.youtube.com/watch?v=ZDv4iYaLbpI',
            url: buildCanonicalVideoUrl(VIDEO_ID),
            metadata: {
              videoId: VIDEO_ID
            }
          })
        }
      ]
    });
  });

  it('maps extraction errors into structured tool errors', async () => {
    const server = new FakeServer();
    const deps = createDeps();
    deps.transcriptService.extract = async () => {
      throw new TranscriptExtractionError(
        'FAILED_PRECONDITION',
        'YouTube blocked the direct transcript request.',
        {
          attempts: []
        },
        ['Direct extraction failed: YouTube blocked the direct transcript request.']
      );
    };

    registerTools(server as never, deps);

    const result = await getHandler(
      server,
      'extract_transcript'
    )({
      videoUrl: buildCanonicalVideoUrl(VIDEO_ID)
    });

    expect(result).toMatchObject({
      isError: true,
      structuredContent: {
        error: {
          code: 'FAILED_PRECONDITION',
          message: 'YouTube blocked the direct transcript request.'
        },
        warnings: ['Direct extraction failed: YouTube blocked the direct transcript request.']
      },
      content: [
        {
          type: 'text',
          text: 'YouTube blocked the direct transcript request.'
        }
      ]
    });
  });
});
