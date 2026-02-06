#!/usr/bin/env node

// Load environment variables from .env file
import 'dotenv/config';

/**
 * Half Dozen YouTube Sync MCP Server
 * 
 * MCP server for extracting YouTube playlist transcripts and syncing to Notion.
 * Designed for the Half Dozen client workflow.
 * 
 * Architecture:
 * - Database Layer: Notion (target), YouTube (source)
 * - Automation Layer: MCP tools, Steel.dev browser, youtube-transcript API
 * - Judgment Layer: Langfuse observability, MCP prompts
 * 
 * MCP Primitives:
 * - Resources: youtube://video/{id} (transcript data)
 * - Tools: 11 tools for extraction, sync, and session management
 * - Prompts: sync_playlist, transcript_analysis
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { SERVER_NAME, SERVER_VERSION } from './config.js';
import { getYouTubeProvider, resetProvider } from './providers/steel.js';
import { getNotionClient, resetNotionClient } from './notion/client.js';
import { extractPlaylistId, isPlaylistUrl, isVideoUrl, extractVideoId } from './youtube/playlist.js';
import { extractTranscript } from './youtube/transcript.js';
import { sendSyncNotification, sendFailureNotification } from './notifications.js';
import {
  initYouTubeSyncObservability,
  createSessionTrace,
  createPlaylistExtractionSpan,
  createTranscriptExtractionSpan,
  createNotionSyncSpan,
  recordSessionRecording,
  shutdownObservability
} from './observability.js';
import type {
  CreateSessionInput,
  SessionStatusInput,
  CloseSessionInput,
  ScrapePlaylistInput,
  ScrapeVideoInput,
  NavigateInput,
  SyncToNotionInput,
  SyncPlaylistInput,
  VideoData
} from './types.js';

// =============================================================================
// Initialization
// =============================================================================

initYouTubeSyncObservability();

// =============================================================================
// Tool Handlers - Session Management
// =============================================================================

async function createSession(input: CreateSessionInput) {
  const provider = getYouTubeProvider();
  
  const trace = createSessionTrace({
    tool: 'create_session',
    playlistUrl: input.url
  });

  try {
    const session = await provider.createSession(input.url, input.timeout);

    trace.end({
      success: true,
      sessionId: session.id
    });

    return {
      sessionId: session.id,
      liveViewUrl: session.liveViewUrl,
      expiresAt: session.expiresAt,
      currentUrl: session.currentUrl,
      instructions: [
        'Session created for YouTube extraction.',
        'Use scrape_playlist to extract videos from a playlist URL.',
        'Use scrape_video to extract transcript from a single video.',
        'Use sync_to_notion to save extracted videos to Notion.',
        'Use sync_playlist to do all three in one call.'
      ]
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    trace.end({ success: false, error: message });
    throw error;
  }
}

async function getSessionStatus(input: SessionStatusInput) {
  const provider = getYouTubeProvider();
  return provider.getSessionStatus(input.sessionId);
}

async function navigate(input: NavigateInput) {
  const provider = getYouTubeProvider();
  return provider.navigate(input.sessionId, input.url);
}

async function closeSession(input: CloseSessionInput) {
  const provider = getYouTubeProvider();
  
  const trace = createSessionTrace({
    tool: 'close_session',
    sessionId: input.sessionId
  });

  try {
    const recording = await provider.closeSession(input.sessionId);

    if (recording.recordingUrl) {
      recordSessionRecording(trace, {
        sessionId: input.sessionId,
        recordingUrl: recording.recordingUrl,
        durationMs: recording.durationMs,
        videoCount: recording.videoCount
      });
    }

    trace.end({ success: true });

    return {
      sessionId: input.sessionId,
      status: 'closed',
      recording: {
        url: recording.recordingUrl,
        durationMs: recording.durationMs,
        videoCount: recording.videoCount
      }
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    trace.end({ success: false, error: message });
    throw error;
  }
}

// =============================================================================
// Tool Handlers - Extraction
// =============================================================================

async function scrapePlaylist(input: ScrapePlaylistInput) {
  const provider = getYouTubeProvider();
  
  const trace = createSessionTrace({
    tool: 'scrape_playlist',
    playlistUrl: input.playlistUrl
  });

  const span = createPlaylistExtractionSpan(trace, input.playlistUrl);

  try {
    // Create session if not provided
    let sessionId = input.sessionId;
    if (!sessionId) {
      const session = await provider.createSession(input.playlistUrl);
      sessionId = session.id;
    }

    const playlist = await provider.extractPlaylist(sessionId, input.playlistUrl, input.limit);

    span.end({
      success: true,
      videoCount: playlist.videos.length
    });

    trace.end({ success: true });

    return {
      success: true,
      sessionId,
      playlist: {
        id: playlist.playlistId,
        title: playlist.title,
        url: playlist.url,
        channelName: playlist.channelName,
        videoCount: playlist.videoCount
      },
      videos: playlist.videos,
      message: `Found ${playlist.videos.length} videos in playlist "${playlist.title}"`
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    span.end({ success: false, error: message });
    trace.end({ success: false, error: message });
    throw error;
  }
}

async function scrapeVideo(input: ScrapeVideoInput) {
  const provider = getYouTubeProvider();
  
  const trace = createSessionTrace({
    tool: 'scrape_video',
    sessionId: input.sessionId,
    videoUrl: input.videoUrl
  });

  try {
    const session = await provider.getSession(input.sessionId);
    if (!session) {
      throw new Error(`Session ${input.sessionId} not found`);
    }

    const videoUrl = input.videoUrl || session.session.currentUrl;
    if (!videoUrl) {
      throw new Error('No video URL provided and no current URL in session');
    }

    const span = createTranscriptExtractionSpan(trace, videoUrl);

    const video = await provider.extractVideo(input.sessionId, videoUrl);

    span.end({
      success: true,
      hasTranscript: !!video.transcript,
      transcriptLength: video.transcript?.length
    });

    trace.end({ success: true });

    return {
      success: true,
      video,
      warnings: !video.transcript 
        ? ['No transcript available for this video.']
        : undefined
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    trace.end({ success: false, error: message });
    throw error;
  }
}

// =============================================================================
// Tool Handlers - Notion Sync
// =============================================================================

async function syncToNotion(input: SyncToNotionInput) {
  const notionClient = getNotionClient();
  
  const trace = createSessionTrace({
    tool: 'sync_to_notion',
    databaseId: input.databaseId,
    videoCount: input.videos.length
  });

  const span = createNotionSyncSpan(trace, input.databaseId);

  try {
    const result = await notionClient.syncVideos(
      input.videos,
      {
        databaseId: input.databaseId,
        customMapping: input.propertyMapping,
        skipDuplicates: true
      }
    );

    span.end({
      success: result.failed === 0,
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      skipped: result.skipped
    });

    trace.end({ success: result.failed === 0 });

    return result;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    span.end({ success: false, error: message });
    trace.end({ success: false, error: message });
    throw error;
  }
}

async function syncPlaylist(input: SyncPlaylistInput) {
  const provider = getYouTubeProvider();
  const notionClient = getNotionClient();

  const trace = createSessionTrace({
    tool: 'sync_playlist',
    playlistUrl: input.playlistUrl,
    databaseId: input.databaseId
  });

  try {
    // Create session for extraction
    const session = await provider.createSession(input.playlistUrl);

    // Extract playlist and all video transcripts
    const { playlist, videos, errors } = await provider.extractPlaylistVideos(
      session.id,
      input.playlistUrl,
      input.limit
    );

    console.error(`Extracted ${videos.length} videos from playlist "${playlist.title}"`);
    if (errors.length > 0) {
      console.error(`${errors.length} videos failed to extract`);
    }

    // Sync to Notion
    const syncResult = await notionClient.syncVideos(
      videos,
      {
        databaseId: input.databaseId,
        customMapping: input.propertyMapping,
        skipDuplicates: true
      }
    );

    // Close session
    const recording = await provider.closeSession(session.id);

    trace.end({ success: true });

    const resultData = {
      success: true,
      playlist: {
        id: playlist.playlistId,
        title: playlist.title,
        videoCount: playlist.videoCount
      },
      extraction: {
        total: playlist.videos.length,
        extracted: videos.length,
        withTranscript: videos.filter(v => v.transcript).length,
        errors: errors.length
      },
      sync: {
        total: syncResult.total,
        successful: syncResult.successful,
        skipped: syncResult.skipped,
        failed: syncResult.failed
      },
      session: {
        id: session.id,
        durationMs: recording.durationMs,
        recordingUrl: recording.recordingUrl
      }
    };

    // Send email notification (fire-and-forget, don't block return)
    sendSyncNotification({
      playlist: {
        title: playlist.title,
        videoCount: playlist.videoCount,
        url: input.playlistUrl
      },
      extraction: resultData.extraction,
      sync: resultData.sync,
      session: {
        durationMs: recording.durationMs,
        recordingUrl: recording.recordingUrl
      },
      databaseId: input.databaseId
    }).catch(err => console.error('Email notification failed:', err));

    return resultData;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    trace.end({ success: false, error: message });

    // Send failure notification (fire-and-forget)
    sendFailureNotification({
      tool: 'sync_playlist',
      error: message,
      context: { playlistUrl: input.playlistUrl }
    }).catch(err => console.error('Failure email notification failed:', err));

    throw error;
  }
}

// =============================================================================
// Tool Handlers - Utility
// =============================================================================

async function getProviderStatus() {
  const provider = getYouTubeProvider();
  return {
    metrics: provider.getMetrics(),
    activeSessions: provider.listActiveSessions()
  };
}

async function getDatabaseSchema(input: { databaseId: string }) {
  const notionClient = getNotionClient();
  return notionClient.getDatabaseSchema(input.databaseId);
}

async function extractTranscriptOnly(input: { videoUrl: string }) {
  // Use transcript API directly (no browser needed)
  const result = await extractTranscript(input.videoUrl);
  
  if (!result) {
    return {
      success: false,
      error: 'Transcript not available for this video'
    };
  }

  return {
    success: true,
    transcript: result.transcript,
    segmentCount: result.segments.length,
    method: result.method
  };
}

// =============================================================================
// MCP Server Setup
// =============================================================================

const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  }
);

// =============================================================================
// MCP Resources
// =============================================================================

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
  resourceTemplates: [
    {
      uriTemplate: 'youtube://video/{videoId}/transcript',
      name: 'YouTube Video Transcript',
      description: 'Extract transcript from a YouTube video by video ID',
      mimeType: 'text/plain'
    }
  ]
}));

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'youtube://status',
      name: 'Server Status',
      description: 'Current server status, active sessions, and metrics',
      mimeType: 'application/json'
    }
  ]
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  // Static resource: server status
  if (uri === 'youtube://status') {
    const provider = getYouTubeProvider();
    const status = {
      server: { name: SERVER_NAME, version: SERVER_VERSION },
      metrics: provider.getMetrics(),
      activeSessions: provider.listActiveSessions().map(s => ({
        id: s.id,
        status: s.status,
        currentUrl: s.currentUrl
      }))
    };

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(status, null, 2)
      }]
    };
  }

  // Template resource: video transcript
  const videoMatch = uri.match(/^youtube:\/\/video\/([a-zA-Z0-9_-]+)\/transcript$/);
  if (videoMatch) {
    const videoId = videoMatch[1];
    const result = await extractTranscript(videoId);

    if (!result) {
      return {
        contents: [{
          uri,
          mimeType: 'text/plain',
          text: `Transcript not available for video ${videoId}`
        }]
      };
    }

    return {
      contents: [{
        uri,
        mimeType: 'text/plain',
        text: result.transcript
      }]
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// =============================================================================
// MCP Prompts
// =============================================================================

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: 'sync_playlist',
      description: 'Guided workflow for syncing a YouTube playlist to Notion. Walks through extraction, transcript retrieval, and sync.',
      arguments: [
        {
          name: 'playlistUrl',
          description: 'YouTube playlist URL to sync',
          required: true
        },
        {
          name: 'databaseId',
          description: 'Notion database ID (optional, uses default if not provided)',
          required: false
        }
      ]
    },
    {
      name: 'transcript_analysis',
      description: 'Analyze a YouTube video transcript for key themes, summaries, and actionable insights.',
      arguments: [
        {
          name: 'videoUrl',
          description: 'YouTube video URL to analyze',
          required: true
        }
      ]
    }
  ]
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'sync_playlist') {
    const playlistUrl = args?.playlistUrl || '<PLAYLIST_URL>';
    const databaseId = args?.databaseId || 'your-database-id';

    return {
      description: 'Sync a YouTube playlist to Notion',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `I want to sync a YouTube playlist to Notion.

Playlist URL: ${playlistUrl}
Database ID: ${databaseId}

Please follow this workflow:

1. First, use the sync_playlist tool to extract all videos, get their transcripts, and sync to Notion.
2. Report the results: how many videos were found, how many had transcripts, how many were synced vs skipped (duplicates).
3. If any videos failed, explain what went wrong and suggest fixes.
4. Provide a summary of the synced content (video titles, channels, transcript availability).

Use the databaseId "${databaseId}" for the Notion sync.`
          }
        }
      ]
    };
  }

  if (name === 'transcript_analysis') {
    const videoUrl = args?.videoUrl || '<VIDEO_URL>';

    return {
      description: 'Analyze a YouTube video transcript',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please analyze the transcript of this YouTube video: ${videoUrl}

Steps:
1. Use the extract_transcript tool to get the transcript.
2. Provide the following analysis:
   - **Summary**: A 2-3 sentence overview of the video content
   - **Key Themes**: The main topics discussed (bulleted list)
   - **Key Quotes**: Notable or important statements (with approximate timestamps if available)
   - **Action Items**: Any actionable takeaways or recommendations mentioned
   - **Related Topics**: Suggestions for follow-up research based on the content

Format the analysis clearly with headers and bullet points.`
          }
        }
      ]
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});

// =============================================================================
// MCP Tools
// =============================================================================

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // =========================================================================
    // Session Management
    // =========================================================================
    {
      name: 'create_session',
      description: 'Create a Steel browser session for YouTube extraction. Optional for most operations (sync_playlist auto-creates one).',
      inputSchema: {
        type: 'object',
        properties: {
          url: { 
            type: 'string', 
            description: 'Initial YouTube URL to navigate to (optional)' 
          },
          timeout: { 
            type: 'number', 
            description: 'Session timeout in ms (default: 1 hour)' 
          }
        }
      }
    },
    {
      name: 'session_status',
      description: 'Get the current status of a browser session.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session ID' }
        },
        required: ['sessionId']
      }
    },
    {
      name: 'navigate',
      description: 'Navigate the session browser to a new URL.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session ID' },
          url: { type: 'string', description: 'URL to navigate to' }
        },
        required: ['sessionId', 'url']
      }
    },
    {
      name: 'close_session',
      description: 'Close a browser session and get recording URL.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session ID to close' }
        },
        required: ['sessionId']
      }
    },

    // =========================================================================
    // Extraction
    // =========================================================================
    {
      name: 'scrape_playlist',
      description: 'Extract video list from a YouTube playlist. Returns video IDs, titles, and metadata.',
      inputSchema: {
        type: 'object',
        properties: {
          playlistUrl: { 
            type: 'string', 
            description: 'YouTube playlist URL (e.g., https://youtube.com/playlist?list=...)' 
          },
          sessionId: { 
            type: 'string', 
            description: 'Optional session ID (creates new if not provided)' 
          },
          limit: { 
            type: 'number', 
            description: 'Max videos to extract (default: all)' 
          }
        },
        required: ['playlistUrl']
      }
    },
    {
      name: 'scrape_video',
      description: 'Extract video data including transcript from a YouTube video.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session ID' },
          videoUrl: { type: 'string', description: 'YouTube video URL (optional, uses current page if not provided)' }
        },
        required: ['sessionId']
      }
    },
    {
      name: 'extract_transcript',
      description: 'Extract transcript from a YouTube video using the API (no browser needed). Fast and preferred for single videos.',
      inputSchema: {
        type: 'object',
        properties: {
          videoUrl: { type: 'string', description: 'YouTube video URL' }
        },
        required: ['videoUrl']
      }
    },

    // =========================================================================
    // Notion Sync
    // =========================================================================
    {
      name: 'sync_to_notion',
      description: 'Sync extracted video data to Notion database. Creates pages with Status=Active, Type=Video, Source=Internal.',
      inputSchema: {
        type: 'object',
        properties: {
          videos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                videoId: { type: 'string' },
                url: { type: 'string' },
                title: { type: 'string' },
                transcript: { type: 'string' },
                channelName: { type: 'string' },
                duration: { type: 'string' },
                publishedAt: { type: 'string' }
              },
              required: ['url', 'title']
            },
            description: 'Array of video data to sync'
          },
          databaseId: { type: 'string', description: 'Notion database ID' },
          propertyMapping: {
            type: 'object',
            description: 'Optional custom mapping of video fields to Notion property names'
          }
        },
        required: ['videos', 'databaseId']
      }
    },
    {
      name: 'sync_playlist',
      description: 'Full workflow: Extract playlist, get transcripts, sync to Notion. This is the main tool for the Half Dozen workflow.',
      inputSchema: {
        type: 'object',
        properties: {
          playlistUrl: { 
            type: 'string', 
            description: 'YouTube playlist URL' 
          },
          databaseId: { 
            type: 'string', 
            description: 'Notion database ID (defaults to Half Dozen Internal LLM)' 
          },
          limit: { 
            type: 'number', 
            description: 'Max videos to process (default: all)' 
          },
          propertyMapping: {
            type: 'object',
            description: 'Optional custom mapping of video fields to Notion property names'
          }
        },
        required: ['playlistUrl', 'databaseId']
      }
    },

    // =========================================================================
    // Utility
    // =========================================================================
    {
      name: 'get_provider_status',
      description: 'Get Steel browser provider status and metrics.',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'get_database_schema',
      description: 'Get Notion database schema for property mapping.',
      inputSchema: {
        type: 'object',
        properties: {
          databaseId: { type: 'string', description: 'Notion database ID' }
        },
        required: ['databaseId']
      }
    }
  ]
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const safeArgs = (args || {}) as Record<string, unknown>;

  try {
    let result: unknown;

    switch (name) {
      // Session Management
      case 'create_session':
        result = await createSession(safeArgs as unknown as CreateSessionInput);
        break;
      case 'session_status':
        result = await getSessionStatus(safeArgs as unknown as SessionStatusInput);
        break;
      case 'navigate':
        result = await navigate(safeArgs as unknown as NavigateInput);
        break;
      case 'close_session':
        result = await closeSession(safeArgs as unknown as CloseSessionInput);
        break;

      // Extraction
      case 'scrape_playlist':
        result = await scrapePlaylist(safeArgs as unknown as ScrapePlaylistInput);
        break;
      case 'scrape_video':
        result = await scrapeVideo(safeArgs as unknown as ScrapeVideoInput);
        break;
      case 'extract_transcript':
        result = await extractTranscriptOnly(safeArgs as { videoUrl: string });
        break;

      // Notion Sync
      case 'sync_to_notion':
        result = await syncToNotion(safeArgs as unknown as SyncToNotionInput);
        break;
      case 'sync_playlist':
        result = await syncPlaylist(safeArgs as unknown as SyncPlaylistInput);
        break;

      // Utility
      case 'get_provider_status':
        result = await getProviderStatus();
        break;
      case 'get_database_schema':
        result = await getDatabaseSchema(safeArgs as { databaseId: string });
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: errorMessage, tool: name, arguments: safeArgs }, null, 2)
      }],
      isError: true
    };
  }
});

// =============================================================================
// Server Lifecycle
// =============================================================================

async function shutdown() {
  resetProvider();
  resetNotionClient();
  await shutdownObservability();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
const transport = new StdioServerTransport();
server.connect(transport);

console.error(`${SERVER_NAME} v${SERVER_VERSION} MCP server running on stdio`);
console.error('Primitives: Tools (11) + Resources (1 static, 1 template) + Prompts (2)');
console.error('Main workflow: sync_playlist -> extracts videos -> gets transcripts -> syncs to Notion');
