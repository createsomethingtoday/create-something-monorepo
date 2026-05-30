import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { buildSegmentSummary, segmentsToTimestampedTranscript } from './transcript.js';
import { buildDefaultTranscriptHeaderLines, buildTranscriptBodyText } from './transcript-page.js';
import { appErrorResult, appToolResult, fetchToolResult, searchToolResult } from './result.js';
import { NotionSyncServiceError } from './notion.js';
import { TranscriptExtractionError } from './transcript-service.js';
import type { RuntimeDependencies, TranscriptRecord } from './types.js';

const propertyMappingSchema = z
  .object({
    title: z.string().optional(),
    url: z.string().optional(),
    videoId: z.string().optional(),
    channelName: z.string().optional(),
    publishedAt: z.string().optional(),
    dateAddedToPlaylist: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    language: z.string().optional(),
    type: z.string().optional(),
    source: z.string().optional(),
    pageStatus: z.string().optional(),
    notes: z.string().optional(),
    playlistId: z.string().optional(),
    playlistTitle: z.string().optional(),
    extractionMethod: z.string().optional(),
    transcriptStatus: z.string().optional(),
    syncedAt: z.string().optional()
  })
  .partial();

const writeConfirmationSchema = z
  .boolean()
  .optional()
  .describe(
    'Must be true only after the user explicitly confirms the Notion write in the conversation.'
  );

function buildVisibleToolContent(
  resultType: string,
  narration: string,
  data: Record<string, unknown>
): string {
  return JSON.stringify({
    resultType,
    summary: narration,
    ...data
  });
}

function writeConfirmationRequired(toolName: string, intendedAction: string) {
  return appErrorResult(
    'WRITE_CONFIRMATION_REQUIRED',
    'Notion writes require explicit user confirmation before this tool can run. Ask the user to confirm the specific write, then call this tool with confirmed=true only after that confirmation.',
    {
      details: {
        toolName,
        intendedAction,
        requiredInput: {
          confirmed: true
        }
      }
    }
  );
}

function buildTranscriptPayload(
  record: TranscriptRecord,
  includeTimestamps: boolean
): Record<string, unknown> {
  return {
    videoId: record.videoId,
    url: record.url,
    title: record.title,
    channelName: record.channelName,
    publishedAt: record.publishedAt,
    thumbnailUrl: record.thumbnailUrl,
    language: record.language,
    extractionMethod: record.extractionMethod,
    warnings: record.warnings,
    sourceDiagnostics: record.sourceDiagnostics,
    transcript: record.transcript,
    ...(includeTimestamps
      ? {
          transcriptWithTimestamps: segmentsToTimestampedTranscript(record.segments)
        }
      : {}),
    segments: record.segments,
    segmentSummary: buildSegmentSummary(record.segments)
  };
}

function buildUnavailableRecord(
  source: {
    pageTitle?: string;
    videoId: string;
    videoUrl: string;
  },
  error: TranscriptExtractionError
): TranscriptRecord {
  return {
    videoId: source.videoId,
    url: source.videoUrl,
    title: source.pageTitle ?? source.videoUrl,
    transcript: '',
    segments: [],
    extractionMethod: 'unavailable',
    language: undefined,
    warnings: [error.message],
    sourceDiagnostics: (error.diagnostics as TranscriptRecord['sourceDiagnostics']) ?? {
      attempts: []
    },
    captionsSource: 'none'
  };
}

function toToolError(error: unknown) {
  if (error instanceof TranscriptExtractionError) {
    return appErrorResult(error.code, error.message, {
      details: error.diagnostics,
      warnings: error.warnings,
      sourceDiagnostics: error.diagnostics
    });
  }

  if (error instanceof NotionSyncServiceError) {
    return appErrorResult(error.code, error.message, {
      details: error.details
    });
  }

  if (error instanceof Error) {
    return appErrorResult('UNEXPECTED_ERROR', error.message);
  }

  return appErrorResult('UNKNOWN_ERROR', String(error));
}

export function registerTools(server: McpServer, deps: RuntimeDependencies): void {
  server.registerTool(
    'extract_transcript',
    {
      title: 'Extract YouTube transcript',
      description:
        'Extract a transcript from a YouTube watch URL. Uses Supadata first when configured, then falls back to the direct and Steel browser extraction chain if needed.',
      inputSchema: {
        videoUrl: z.string().describe('YouTube video URL or video ID'),
        language: z
          .string()
          .optional()
          .describe('Preferred transcript language, defaults to the configured server language'),
        includeTimestamps: z
          .boolean()
          .optional()
          .describe(
            'Include a timestamped transcript string alongside the normalized transcript output'
          )
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ videoUrl, language, includeTimestamps = false }) => {
      try {
        const record = await deps.transcriptService.extract({
          videoUrl,
          language,
          includeTimestamps
        });

        return appToolResult(
          buildTranscriptPayload(record, includeTimestamps),
          `Extracted ${record.segments.length} transcript segments for "${record.title}" using ${record.extractionMethod}.`,
          undefined,
          {
            visibleContent: buildVisibleToolContent(
              'youtube_transcript',
              `Extracted ${record.segments.length} transcript segments for "${record.title}" using ${record.extractionMethod}.`,
              buildTranscriptPayload(record, includeTimestamps)
            )
          }
        );
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    'enrich_notion_page',
    {
      title: 'Enrich a Notion page from its YouTube URL',
      description:
        'Read a YouTube URL or video ID from an existing Notion page, extract transcript and metadata, and update that same page in place.',
      inputSchema: {
        pageId: z.string().describe('The target Notion page ID to enrich'),
        videoUrl: z
          .string()
          .optional()
          .describe(
            'Optional YouTube URL or video ID override. If omitted, the tool reads the video reference from the page.'
          ),
        propertyMapping: propertyMappingSchema
          .optional()
          .describe(
            'Optional Notion property mapping override for locating the source URL and writing metadata'
          ),
        includeTimestamps: z
          .boolean()
          .optional()
          .describe(
            'Write the transcript body with timestamp labels when a transcript is available'
          ),
        confirmed: writeConfirmationSchema
      },
      annotations: {
        readOnlyHint: false
      }
    },
    async ({ pageId, videoUrl, propertyMapping, includeTimestamps = false, confirmed = false }) => {
      try {
        if (confirmed !== true) {
          return writeConfirmationRequired(
            'enrich_notion_page',
            `Update Notion page ${pageId} from its YouTube video reference.`
          );
        }

        const source = await deps.notionService.resolvePageVideoSource(pageId, {
          propertyMapping,
          videoUrl
        });

        let record: TranscriptRecord;
        try {
          record = await deps.transcriptService.extract({
            videoUrl: source.videoUrl
          });
        } catch (error) {
          if (!(error instanceof TranscriptExtractionError)) {
            throw error;
          }
          record = buildUnavailableRecord(
            {
              pageTitle: source.title,
              videoId: source.videoId,
              videoUrl: source.videoUrl
            },
            error
          );
        }

        const transcriptBodyText = record.transcript.trim()
          ? undefined
          : buildTranscriptBodyText(record, record.warnings[0]);
        const syncResult = await deps.notionService.syncTranscriptToPage(pageId, record, {
          propertyMapping,
          includeTimestamps: includeTimestamps && Boolean(record.transcript.trim()),
          replaceExistingTranscript: true,
          transcriptHeaderLines: buildDefaultTranscriptHeaderLines(record),
          transcriptBodyText
        });

        return appToolResult(
          {
            source: {
              pageId: source.pageId,
              pageUrl: source.pageUrl,
              pageTitle: source.title,
              videoUrl: source.videoUrl,
              videoId: source.videoId,
              source: source.source,
              sourceProperty: source.sourceProperty,
              warnings: source.warnings
            },
            video: {
              videoId: record.videoId,
              url: record.url,
              title: record.title,
              extractionMethod: record.extractionMethod,
              language: record.language,
              warnings: record.warnings,
              sourceDiagnostics: record.sourceDiagnostics
            },
            notion: syncResult
          },
          `Updated Notion page ${syncResult.pageId} from YouTube video "${record.title}".`,
          undefined,
          {
            visibleContent: buildVisibleToolContent(
              'notion_page_enrichment',
              `Updated Notion page ${syncResult.pageId} from YouTube video "${record.title}".`,
              {
                source: {
                  pageId: source.pageId,
                  pageUrl: source.pageUrl,
                  pageTitle: source.title,
                  videoUrl: source.videoUrl,
                  videoId: source.videoId,
                  source: source.source,
                  sourceProperty: source.sourceProperty,
                  warnings: source.warnings
                },
                video: {
                  videoId: record.videoId,
                  url: record.url,
                  title: record.title,
                  extractionMethod: record.extractionMethod,
                  language: record.language,
                  warnings: record.warnings
                },
                notion: syncResult
              }
            )
          }
        );
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    'sync_video_to_notion',
    {
      title: 'Sync a YouTube video to Notion',
      description:
        'Extract one YouTube transcript, deduplicate it against the target Notion database/data source, and create or update the corresponding page.',
      inputSchema: {
        videoUrl: z.string().describe('YouTube video URL or video ID'),
        databaseId: z
          .string()
          .optional()
          .describe('Optional override for the default Notion database/data source ID'),
        propertyMapping: propertyMappingSchema
          .optional()
          .describe('Optional Notion property mapping override for this call'),
        includeTimestamps: z
          .boolean()
          .optional()
          .describe('Append the transcript body to Notion with timestamp labels'),
        confirmed: writeConfirmationSchema
      },
      annotations: {
        readOnlyHint: false
      }
    },
    async ({
      videoUrl,
      databaseId,
      propertyMapping,
      includeTimestamps = false,
      confirmed = false
    }) => {
      try {
        if (confirmed !== true) {
          return writeConfirmationRequired(
            'sync_video_to_notion',
            `Create or update a Notion transcript record for ${videoUrl}.`
          );
        }

        const record = await deps.transcriptService.extract({ videoUrl });
        const syncResult = await deps.notionService.syncTranscript(record, {
          databaseId,
          propertyMapping,
          includeTimestamps
        });

        return appToolResult(
          {
            video: {
              videoId: record.videoId,
              url: record.url,
              title: record.title,
              extractionMethod: record.extractionMethod,
              language: record.language,
              warnings: record.warnings,
              sourceDiagnostics: record.sourceDiagnostics
            },
            notion: syncResult
          },
          `${syncResult.action === 'created' ? 'Created' : 'Updated'} Notion page ${
            syncResult.pageId
          } for "${record.title}".`,
          undefined,
          {
            visibleContent: buildVisibleToolContent(
              'notion_video_sync',
              `${syncResult.action === 'created' ? 'Created' : 'Updated'} Notion page ${
                syncResult.pageId
              } for "${record.title}".`,
              {
                video: {
                  videoId: record.videoId,
                  url: record.url,
                  title: record.title,
                  extractionMethod: record.extractionMethod,
                  language: record.language,
                  warnings: record.warnings
                },
                notion: syncResult
              }
            )
          }
        );
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    'get_database_schema',
    {
      title: 'Inspect Notion database schema',
      description:
        'Retrieve the current Notion data source schema so property mapping can be verified before syncing a transcript.',
      inputSchema: {
        databaseId: z
          .string()
          .optional()
          .describe('Optional override for the default Notion database/data source ID')
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ databaseId }) => {
      try {
        const schema = await deps.notionService.getDatabaseSchema(databaseId);
        const schemaPayload = {
          databaseId: schema.databaseId,
          dataSourceId: schema.dataSourceId,
          title: schema.title,
          properties: schema.properties
        };

        return appToolResult(
          schemaPayload,
          `Loaded schema for Notion data source ${schema.dataSourceId}.`,
          undefined,
          {
            visibleContent: buildVisibleToolContent(
              'notion_database_schema',
              `Loaded schema for Notion data source ${schema.dataSourceId}.`,
              schemaPayload
            )
          }
        );
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    'search',
    {
      title: 'Search synced transcript records',
      inputSchema: {
        query: z.string()
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ query }) => {
      try {
        const results = await deps.notionService.searchDocuments(query);
        return searchToolResult(results);
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    'fetch',
    {
      title: 'Fetch a synced transcript record',
      inputSchema: {
        id: z.string()
      },
      annotations: {
        readOnlyHint: true
      }
    },
    async ({ id }) => {
      try {
        const document = await deps.notionService.fetchDocument(id);
        return fetchToolResult(document);
      } catch (error) {
        return toToolError(error);
      }
    }
  );
}
