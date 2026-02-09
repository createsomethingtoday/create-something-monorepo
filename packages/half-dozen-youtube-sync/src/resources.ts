/**
 * YouTube Sync MCP — Resource Registration
 * Three-Tier Framework: Database tier (MCP Resources)
 *
 * Resources expose read-only state to the model via application-controlled
 * access. Provides server status and video transcript data.
 *
 * Resources:
 *   youtube://status                        — Server metrics and active sessions
 *   youtube://video/{videoId}/transcript     — Transcript for a specific video (template)
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { SERVER_NAME, SERVER_VERSION } from './config.js';
import { getYouTubeProvider } from './providers/steel.js';
import { extractTranscript } from './youtube/transcript.js';

// =============================================================================
// Registration
// =============================================================================

/**
 * Register all MCP resources on the server.
 *
 * @param server - The MCP server instance
 */
export function registerResources(server: McpServer): void {
  // Static resource: server status
  server.resource(
    'server-status',
    'youtube://status',
    {
      description: 'Current server status, active sessions, and metrics',
      mimeType: 'application/json',
    },
    async (uri) => {
      const provider = getYouTubeProvider();
      const status = {
        server: { name: SERVER_NAME, version: SERVER_VERSION },
        metrics: provider.getMetrics(),
        activeSessions: provider.listActiveSessions().map(s => ({
          id: s.id,
          status: s.status,
          currentUrl: s.currentUrl,
        })),
      };

      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(status, null, 2),
        }],
      };
    },
  );

  // Template resource: video transcript
  server.resource(
    'video-transcript',
    'youtube://video/{videoId}/transcript',
    {
      description: 'Extract transcript from a YouTube video by video ID',
      mimeType: 'text/plain',
    },
    async (uri) => {
      // Extract videoId from the URI path
      const videoId = uri.pathname.split('/')[1];

      if (!videoId) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'text/plain',
            text: 'Invalid video ID',
          }],
        };
      }

      const result = await extractTranscript(videoId);

      return {
        contents: [{
          uri: uri.href,
          mimeType: 'text/plain',
          text: result?.transcript || `Transcript not available for video ${videoId}`,
        }],
      };
    },
  );
}
