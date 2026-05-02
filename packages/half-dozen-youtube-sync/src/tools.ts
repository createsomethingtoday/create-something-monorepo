/**
 * YouTube Sync MCP — Tool Registration
 * Three-Tier Framework: Automation tier (MCP Tools)
 *
 * Tools expose model-controlled operations — session management, playlist
 * extraction, transcript retrieval, Notion sync, and the full pipeline.
 *
 * 11 tools total:
 *   Session:    create_session, session_status, navigate, close_session
 *   Extraction: scrape_playlist, scrape_video, extract_transcript
 *   Sync:       sync_to_notion, sync_playlist
 *   Utility:    get_provider_status, get_database_schema
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { getYouTubeProvider } from './providers/steel.js';
import { getNotionClient } from './notion/client.js';
import { extractTranscript } from './youtube/transcript.js';
import { sendSyncNotification, sendFailureNotification } from './notifications.js';
import {
  createSessionTrace,
  createPlaylistExtractionSpan,
  createTranscriptExtractionSpan,
  createNotionSyncSpan,
  recordSessionRecording,
} from './observability.js';

// =============================================================================
// Helpers
// =============================================================================

function jsonContent(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function errorContent(message: string, tool: string, args?: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: message, tool, arguments: args }, null, 2) }],
    isError: true as const,
  };
}

// =============================================================================
// Registration
// =============================================================================

/**
 * Register all MCP tools on the server.
 *
 * @param server - The MCP server instance (McpServer from the SDK)
 */
export function registerTools(server: McpServer): void {
  // =========================================================================
  // Session Management
  // =========================================================================

  server.tool(
    'create_session',
    'Create a Steel browser session for YouTube extraction. Optional for most operations (sync_playlist auto-creates one).',
    {
      url: z.string().optional().describe('Initial YouTube URL to navigate to'),
      timeout: z.number().optional().describe('Session timeout in ms (default: 1 hour)'),
    },
    async ({ url, timeout }) => {
      const provider = getYouTubeProvider();
      const trace = createSessionTrace({ tool: 'create_session', playlistUrl: url });

      try {
        const session = await provider.createSession(url, timeout);
        trace.end({ success: true, sessionId: session.id });

        return jsonContent({
          sessionId: session.id,
          liveViewUrl: session.liveViewUrl,
          expiresAt: session.expiresAt,
          currentUrl: session.currentUrl,
          instructions: [
            'Session created for YouTube extraction.',
            'Use scrape_playlist to extract videos from a playlist URL.',
            'Use scrape_video to extract transcript from a single video.',
            'Use sync_to_notion to save extracted videos to Notion.',
            'Use sync_playlist to do all three in one call.',
          ],
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        trace.end({ success: false, error: msg });
        return errorContent(msg, 'create_session');
      }
    },
  );

  server.tool(
    'session_status',
    'Get the current status of a browser session.',
    {
      sessionId: z.string().describe('Session ID'),
    },
    async ({ sessionId }) => {
      const provider = getYouTubeProvider();
      return jsonContent(await provider.getSessionStatus(sessionId));
    },
  );

  server.tool(
    'navigate',
    'Navigate the session browser to a new URL.',
    {
      sessionId: z.string().describe('Session ID'),
      url: z.string().describe('URL to navigate to'),
    },
    async ({ sessionId, url }) => {
      const provider = getYouTubeProvider();
      return jsonContent(await provider.navigate(sessionId, url));
    },
  );

  server.tool(
    'close_session',
    'Close a browser session and get recording URL.',
    {
      sessionId: z.string().describe('Session ID to close'),
    },
    async ({ sessionId }) => {
      const provider = getYouTubeProvider();
      const trace = createSessionTrace({ tool: 'close_session', sessionId });

      try {
        const recording = await provider.closeSession(sessionId);

        if (recording.recordingUrl) {
          recordSessionRecording(trace, {
            sessionId,
            recordingUrl: recording.recordingUrl,
            durationMs: recording.durationMs,
            videoCount: recording.videoCount,
          });
        }

        trace.end({ success: true });

        return jsonContent({
          sessionId,
          status: 'closed',
          recording: {
            url: recording.recordingUrl,
            durationMs: recording.durationMs,
            videoCount: recording.videoCount,
          },
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        trace.end({ success: false, error: msg });
        return errorContent(msg, 'close_session');
      }
    },
  );

  // =========================================================================
  // Extraction
  // =========================================================================

  server.tool(
    'scrape_playlist',
    'Extract video list from a YouTube playlist. Returns video IDs, titles, and metadata.',
    {
      playlistUrl: z.string().describe('YouTube playlist URL (e.g., https://youtube.com/playlist?list=...)'),
      sessionId: z.string().optional().describe('Optional session ID (creates new if not provided)'),
      limit: z.number().optional().describe('Max videos to extract (default: all)'),
    },
    async ({ playlistUrl, sessionId: inputSessionId, limit }) => {
      const provider = getYouTubeProvider();
      const trace = createSessionTrace({ tool: 'scrape_playlist', playlistUrl });
      const span = createPlaylistExtractionSpan(trace, playlistUrl);

      try {
        let sessionId = inputSessionId;
        if (!sessionId) {
          const session = await provider.createSession(playlistUrl);
          sessionId = session.id;
        }

        const playlist = await provider.extractPlaylist(sessionId, playlistUrl, limit);

        span.end({ success: true, videoCount: playlist.videos.length });
        trace.end({ success: true });

        return jsonContent({
          success: true,
          sessionId,
          playlist: {
            id: playlist.playlistId,
            title: playlist.title,
            url: playlist.url,
            channelName: playlist.channelName,
            videoCount: playlist.videoCount,
          },
          videos: playlist.videos,
          message: `Found ${playlist.videos.length} videos in playlist "${playlist.title}"`,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        span.end({ success: false, error: msg });
        trace.end({ success: false, error: msg });
        return errorContent(msg, 'scrape_playlist');
      }
    },
  );

  server.tool(
    'scrape_video',
    'Extract video data including transcript from a YouTube video.',
    {
      sessionId: z.string().describe('Session ID'),
      videoUrl: z.string().optional().describe('YouTube video URL (optional, uses current page if not provided)'),
    },
    async ({ sessionId, videoUrl }) => {
      const provider = getYouTubeProvider();
      const trace = createSessionTrace({ tool: 'scrape_video', sessionId, videoUrl });

      try {
        const session = await provider.getSession(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);

        const targetUrl = videoUrl || session.session.currentUrl;
        if (!targetUrl) throw new Error('No video URL provided and no current URL in session');

        const span = createTranscriptExtractionSpan(trace, targetUrl);
        const video = await provider.extractVideo(sessionId, targetUrl);

        span.end({ success: true, hasTranscript: !!video.transcript, transcriptLength: video.transcript?.length });
        trace.end({ success: true });

        return jsonContent({
          success: true,
          video,
          warnings: !video.transcript ? ['No transcript available for this video.'] : undefined,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        trace.end({ success: false, error: msg });
        return errorContent(msg, 'scrape_video');
      }
    },
  );

  server.tool(
    'extract_transcript',
    'Extract transcript from a YouTube video using server-side caption APIs. Use scrape_video for full metadata + transcript.',
    {
      videoUrl: z.string().describe('YouTube video URL'),
      sessionId: z.string().optional().describe('Deprecated compatibility field; no Steel session is required'),
    },
    async ({ videoUrl }) => {
      try {
        const result = await extractTranscript(videoUrl);

        if (!result) {
          return jsonContent({ success: false, error: 'Transcript not available for this video' });
        }

        return jsonContent({
          success: true,
          transcript: result.transcript,
          segmentCount: result.segments.length,
          method: result.method,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return errorContent(msg, 'extract_transcript');
      }
    },
  );

  // =========================================================================
  // Notion Sync
  // =========================================================================

  server.tool(
    'sync_to_notion',
    'Sync extracted video data to Notion database. Creates pages with Status=Active, Type=Video, Source=Internal.',
    {
      videos: z.array(z.object({
        videoId: z.string().optional(),
        url: z.string(),
        title: z.string(),
        transcript: z.string().optional(),
        channelName: z.string().optional(),
        duration: z.string().optional(),
        publishedAt: z.string().optional(),
      })).describe('Array of video data to sync'),
      databaseId: z.string().describe('Notion database ID'),
      propertyMapping: z.record(z.string()).optional().describe('Optional custom mapping of video fields to Notion property names'),
    },
    async ({ videos, databaseId, propertyMapping }) => {
      const notionClient = getNotionClient();
      const trace = createSessionTrace({ tool: 'sync_to_notion', databaseId, videoCount: videos.length });
      const span = createNotionSyncSpan(trace, databaseId);

      try {
        const result = await notionClient.syncVideos(
          videos.map(v => ({
            ...v,
            videoId: v.videoId || '',
            scrapedAt: new Date().toISOString(),
            extractionMethod: 'youtube-transcript-api' as const,
          })),
          { databaseId, customMapping: propertyMapping, skipDuplicates: true },
        );

        span.end({ success: result.failed === 0, total: result.total, successful: result.successful, failed: result.failed, skipped: result.skipped });
        trace.end({ success: result.failed === 0 });

        return jsonContent(result);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        span.end({ success: false, error: msg });
        trace.end({ success: false, error: msg });
        return errorContent(msg, 'sync_to_notion');
      }
    },
  );

  server.tool(
    'sync_playlist',
    'Full workflow: Extract playlist, get transcripts, sync to Notion. This is the main tool for the Half Dozen workflow.',
    {
      playlistUrl: z.string().describe('YouTube playlist URL'),
      databaseId: z.string().describe('Notion database ID (defaults to Half Dozen Internal LLM)'),
      limit: z.number().optional().describe('Max videos to process (default: all)'),
      propertyMapping: z.record(z.string()).optional().describe('Optional custom mapping of video fields to Notion property names'),
    },
    async ({ playlistUrl, databaseId, limit, propertyMapping }) => {
      const provider = getYouTubeProvider();
      const notionClient = getNotionClient();
      const trace = createSessionTrace({ tool: 'sync_playlist', playlistUrl, databaseId });

      try {
        const session = await provider.createSession(playlistUrl);

        const { playlist, videos, errors } = await provider.extractPlaylistVideos(
          session.id, playlistUrl, limit,
        );

        console.error(`Extracted ${videos.length} videos from playlist "${playlist.title}"`);
        if (errors.length > 0) console.error(`${errors.length} videos failed to extract`);

        const syncResult = await notionClient.syncVideos(
          videos,
          { databaseId, customMapping: propertyMapping, skipDuplicates: true },
        );

        const recording = await provider.closeSession(session.id);
        trace.end({ success: true });

        const resultData = {
          success: true,
          playlist: { id: playlist.playlistId, title: playlist.title, videoCount: playlist.videoCount },
          extraction: {
            total: playlist.videos.length,
            extracted: videos.length,
            withTranscript: videos.filter(v => v.transcript).length,
            errors: errors.length,
          },
          sync: { total: syncResult.total, successful: syncResult.successful, skipped: syncResult.skipped, failed: syncResult.failed },
          session: { id: session.id, durationMs: recording.durationMs, recordingUrl: recording.recordingUrl },
        };

        // Fire-and-forget email notification
        sendSyncNotification({
          playlist: { title: playlist.title, videoCount: playlist.videoCount, url: playlistUrl },
          extraction: resultData.extraction,
          sync: resultData.sync,
          session: { durationMs: recording.durationMs, recordingUrl: recording.recordingUrl },
          databaseId,
        }).catch(err => console.error('Email notification failed:', err));

        return jsonContent(resultData);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        trace.end({ success: false, error: msg });

        sendFailureNotification({
          tool: 'sync_playlist',
          error: msg,
          context: { playlistUrl },
        }).catch(err => console.error('Failure email notification failed:', err));

        return errorContent(msg, 'sync_playlist');
      }
    },
  );

  // =========================================================================
  // Utility
  // =========================================================================

  server.tool(
    'get_provider_status',
    'Get Steel browser provider status and metrics.',
    {},
    async () => {
      const provider = getYouTubeProvider();
      return jsonContent({
        metrics: provider.getMetrics(),
        activeSessions: provider.listActiveSessions(),
      });
    },
  );

  server.tool(
    'get_database_schema',
    'Get Notion database schema for property mapping.',
    {
      databaseId: z.string().describe('Notion database ID'),
    },
    async ({ databaseId }) => {
      const notionClient = getNotionClient();
      return jsonContent(await notionClient.getDatabaseSchema(databaseId));
    },
  );
}
