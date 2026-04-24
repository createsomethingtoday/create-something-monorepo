import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { buildSegmentSummary, segmentsToTimestampedTranscript } from './transcript.js';
import { appErrorResult, appToolResult, fetchToolResult, searchToolResult } from './result.js';
import { NotionSyncServiceError } from './notion.js';
import { PlaylistSyncServiceError } from './playlist-service.js';
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
    syncedAt: z.string().optional(),
  })
  .partial();

function buildTranscriptPayload(
  record: TranscriptRecord,
  includeTimestamps: boolean,
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
          transcriptWithTimestamps: segmentsToTimestampedTranscript(record.segments),
        }
      : {}),
    segments: record.segments,
    segmentSummary: buildSegmentSummary(record.segments),
  };
}

function toToolError(error: unknown) {
  if (error instanceof TranscriptExtractionError) {
    return appErrorResult(error.code, error.message, {
      details: error.diagnostics,
      warnings: error.warnings,
      sourceDiagnostics: error.diagnostics,
    });
  }

  if (error instanceof NotionSyncServiceError) {
    return appErrorResult(error.code, error.message, {
      details: error.details,
    });
  }

  if (error instanceof PlaylistSyncServiceError) {
    return appErrorResult(error.code, error.message, {
      details: error.details,
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
        'Extract a transcript from a YouTube watch URL. Tries a direct transcript path first and falls back to Steel browser automation if needed.',
      inputSchema: {
        videoUrl: z.string().describe('YouTube video URL or video ID'),
        language: z.string().optional().describe('Preferred transcript language, defaults to the configured server language'),
        includeTimestamps: z
          .boolean()
          .optional()
          .describe('Include a timestamped transcript string alongside the normalized transcript output'),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ videoUrl, language, includeTimestamps = false }) => {
      try {
        const record = await deps.transcriptService.extract({
          videoUrl,
          language,
          includeTimestamps,
        });

        return appToolResult(
          buildTranscriptPayload(record, includeTimestamps),
          `Extracted ${record.segments.length} transcript segments for "${record.title}" using ${record.extractionMethod}.`,
        );
      } catch (error) {
        return toToolError(error);
      }
    },
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
      },
      annotations: {
        readOnlyHint: false,
      },
    },
    async ({ videoUrl, databaseId, propertyMapping, includeTimestamps = false }) => {
      try {
        const record = await deps.transcriptService.extract({ videoUrl });
        const syncResult = await deps.notionService.syncTranscript(record, {
          databaseId,
          propertyMapping,
          includeTimestamps,
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
              sourceDiagnostics: record.sourceDiagnostics,
            },
            notion: syncResult,
          },
          `${syncResult.action === 'created' ? 'Created' : 'Updated'} Notion page ${
            syncResult.pageId
          } for "${record.title}".`,
        );
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    'list_playlist_items',
    {
      title: 'List YouTube playlist items',
      description:
        'List recent items from a YouTube playlist using the YouTube Data API, including the exact date each video was added to the playlist.',
      inputSchema: {
        playlistId: z.string().describe('YouTube playlist URL or playlist ID'),
        limit: z.number().int().positive().max(200).optional(),
        pageToken: z.string().optional(),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ playlistId, limit, pageToken }) => {
      try {
        const result = await deps.playlistService.listItems({
          playlistId,
          limit,
          pageToken,
        });

        return appToolResult(
          result as unknown as Record<string, unknown>,
          `Loaded ${result.items.length} playlist item${
            result.items.length === 1 ? '' : 's'
          } from ${result.playlistTitle ?? result.playlistId}.`,
        );
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    'sync_playlist_to_notion',
    {
      title: 'Sync a YouTube playlist to Notion',
      description:
        'Poll a playlist, detect new items using durable playlist sync state, extract transcripts per video, and upsert the results into Notion.',
      inputSchema: {
        playlistId: z
          .string()
          .optional()
          .describe('Optional YouTube playlist URL or playlist ID. Defaults to the configured playlist.'),
        databaseId: z
          .string()
          .optional()
          .describe('Optional override for the target Notion database/data source ID'),
        propertyMapping: propertyMappingSchema
          .optional()
          .describe('Optional Notion property mapping override for this call'),
        includeTimestamps: z
          .boolean()
          .optional()
          .describe('Write transcript body text with timestamp labels when a transcript is available'),
        maxItems: z
          .number()
          .int()
          .positive()
          .max(200)
          .optional()
          .describe('Maximum number of newly-detected playlist items to process in this run'),
        maxScanItems: z
          .number()
          .int()
          .positive()
          .max(200)
          .optional()
          .describe('Maximum number of recent playlist items to inspect before filtering for new entries'),
        dryRun: z
          .boolean()
          .optional()
          .describe('Inspect what would be processed without extracting transcripts or writing to Notion'),
        sinceCursor: z
          .string()
          .optional()
          .describe('Optional ISO date/datetime lower bound for manual replay or backfill'),
      },
      annotations: {
        readOnlyHint: false,
      },
    },
    async ({
      playlistId,
      databaseId,
      propertyMapping,
      includeTimestamps = false,
      maxItems,
      maxScanItems,
      dryRun = false,
      sinceCursor,
    }) => {
      try {
        const result = await deps.playlistService.syncPlaylist({
          playlistId,
          databaseId,
          propertyMapping,
          includeTimestamps,
          maxItems,
          maxScanItems,
          dryRun,
          sinceCursor,
        });

        return appToolResult(
          result as unknown as Record<string, unknown>,
          `Playlist sync for ${result.playlistTitle ?? result.playlistId} finished: ${result.created} created, ${result.updated} updated, ${result.failed} failed.`,
        );
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    'get_playlist_sync_status',
    {
      title: 'Inspect playlist sync status',
      description:
        'Return the configured playlist defaults and the durable sync state snapshot for a playlist.',
      inputSchema: {
        playlistId: z
          .string()
          .optional()
          .describe('Optional playlist URL or playlist ID. Defaults to the configured playlist.'),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ playlistId }) => {
      try {
        const status = await deps.playlistService.getStatus(playlistId);
        return appToolResult(
          status,
          'Loaded playlist sync status.',
        );
      } catch (error) {
        return toToolError(error);
      }
    },
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
          .describe('Optional override for the default Notion database/data source ID'),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ databaseId }) => {
      try {
        const schema = await deps.notionService.getDatabaseSchema(databaseId);
        return appToolResult(
          {
            databaseId: schema.databaseId,
            dataSourceId: schema.dataSourceId,
            title: schema.title,
            properties: schema.properties,
          },
          `Loaded schema for Notion data source ${schema.dataSourceId}.`,
        );
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    'search',
    {
      title: 'Search synced transcript records',
      inputSchema: {
        query: z.string(),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ query }) => {
      try {
        const results = await deps.notionService.searchDocuments(query);
        return searchToolResult(results);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    'fetch',
    {
      title: 'Fetch a synced transcript record',
      inputSchema: {
        id: z.string(),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ id }) => {
      try {
        const document = await deps.notionService.fetchDocument(id);
        return fetchToolResult(document);
      } catch (error) {
        return toToolError(error);
      }
    },
  );
}
