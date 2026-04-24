import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { buildSegmentSummary } from './transcript.js';
import { buildCanonicalVideoUrl } from './youtube.js';
import type { RuntimeDependencies } from './types.js';

export function registerResources(server: McpServer, deps: RuntimeDependencies): void {
  server.resource(
    'youtube-status',
    'youtube://status',
    {
      description: 'Current server configuration and capability status for transcript extraction and Notion sync.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const playlist = await deps.playlistService.getStatus();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                server: deps.serverInfo,
                transcript: deps.transcriptService.getStatus(),
                notion: deps.notionService.getStatus(),
                playlist,
                resources: ['youtube://status', 'youtube://video/{id}/transcript'],
                tools: [
                  'extract_transcript',
                  'sync_video_to_notion',
                  'list_playlist_items',
                  'sync_playlist_to_notion',
                  'get_playlist_sync_status',
                  'get_database_schema',
                  'search',
                  'fetch',
                ],
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.resource(
    'youtube-video-transcript',
    'youtube://video/{id}/transcript',
    {
      description: 'Extract and return the normalized transcript for one YouTube video ID.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const videoId = uri.pathname.split('/').filter(Boolean)[0];

      try {
        const record = await deps.transcriptService.extract({
          videoUrl: buildCanonicalVideoUrl(videoId),
        });

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  ...record,
                  segmentSummary: buildSegmentSummary(record.segments),
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
            },
          ],
        };
      }
    },
  );
}
