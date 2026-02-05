#!/usr/bin/env node

// Load environment variables from .env file
import 'dotenv/config';

/**
 * Zoom Clips MCP Server
 * 
 * MCP server for scraping Zoom Clips with human-in-the-loop browser sessions,
 * syncing extracted data (title, description, transcript, duration, speaker)
 * to a Notion database.
 * 
 * Architecture:
 * - Database Layer: Notion (target), Zoom Clips (source)
 * - Automation Layer: MCP tools, Steel.dev browser, human-in-the-loop sessions
 * - Intelligence Layer: Langfuse observability, session recordings
 * 
 * Human-in-the-Loop Workflow:
 * 1. Agent creates Steel session → returns Live View URL
 * 2. Human opens Live View, navigates to transcript (auth/CAPTCHA if needed)
 * 3. Human signals ready → Agent extracts data
 * 4. Agent syncs to Notion
 * 5. Session recording saved for audit trail
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { getZoomClipsProvider, resetProvider } from './providers/steel.js';
import { getNotionClient, resetNotionClient } from './notion/client.js';
import { isZoomClipsUrl, diagnoseUI, formatUIReport, UI_LOCATIONS } from './extractors/zoom-clip.js';
import {
  initZoomClipsObservability,
  createSessionTrace,
  createExtractionSpan,
  createNotionSyncSpan,
  recordSessionRecording,
  shutdownObservability
} from './observability.js';
import type {
  CreateSessionInput,
  SessionStatusInput,
  CloseSessionInput,
  ScrapeClipInput,
  NavigateInput,
  SyncToNotionInput,
  ScrapeAndSyncInput,
  ClipData
} from './types.js';
import {
  CreateSessionInputSchema,
  SessionStatusInputSchema,
  CloseSessionInputSchema,
  NavigateInputSchema,
  ScrapeClipInputSchema,
  SyncToNotionInputSchema,
  ScrapeAndSyncInputSchema,
  DiagnoseUIInputSchema,
  GetDatabaseSchemaInputSchema
} from './schemas.js';

// =============================================================================
// Initialization
// =============================================================================

initZoomClipsObservability();

// =============================================================================
// Tool Handlers - Session Management (Human-in-the-Loop)
// =============================================================================

async function createSession(input: CreateSessionInput) {
  const provider = getZoomClipsProvider();
  
  const trace = createSessionTrace({
    tool: 'create_session',
    url: input.url
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
        'Open the Live View URL in your browser to see the Zoom Clips page.',
        'Navigate to the transcript tab if needed.',
        'Expand the full transcript if it is collapsed.',
        'Authenticate if prompted.',
        'When ready, call session_status to signal readiness, then scrape_clip to extract.'
      ]
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    trace.end({ success: false, error: message });
    throw error;
  }
}

async function getSessionStatus(input: SessionStatusInput) {
  const provider = getZoomClipsProvider();
  return provider.getSessionStatus(input.sessionId);
}

async function markReady(input: SessionStatusInput) {
  const provider = getZoomClipsProvider();
  const success = provider.markSessionReady(input.sessionId);
  
  if (!success) {
    throw new Error(`Session ${input.sessionId} not found`);
  }

  return { 
    sessionId: input.sessionId, 
    status: 'ready',
    message: 'Session marked ready. Call scrape_clip to extract data.'
  };
}

async function navigate(input: NavigateInput) {
  const provider = getZoomClipsProvider();
  
  // Validate URL
  if (!isZoomClipsUrl(input.url)) {
    return {
      success: false,
      error: `Invalid Zoom Clips URL. Expected format: https://zoom.us/clips/share/<id>`,
      currentUrl: undefined
    };
  }

  return provider.navigate(input.sessionId, input.url);
}

async function closeSession(input: CloseSessionInput) {
  const provider = getZoomClipsProvider();
  
  const trace = createSessionTrace({
    tool: 'close_session',
    sessionId: input.sessionId
  });

  try {
    const recording = await provider.closeSession(input.sessionId);

    // Log recording to observability
    if (recording.recordingUrl) {
      recordSessionRecording(trace, {
        sessionId: input.sessionId,
        recordingUrl: recording.recordingUrl,
        durationMs: recording.durationMs,
        clipCount: recording.clipCount
      });
    }

    trace.end({ success: true });

    return {
      sessionId: input.sessionId,
      status: 'closed',
      recording: {
        url: recording.recordingUrl,
        durationMs: recording.durationMs,
        clipCount: recording.clipCount
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

async function scrapeClip(input: ScrapeClipInput) {
  const provider = getZoomClipsProvider();
  
  const trace = createSessionTrace({
    tool: 'scrape_clip',
    sessionId: input.sessionId
  });

  const span = createExtractionSpan(trace, input.sessionId);

  try {
    const clip = await provider.extractClip(input.sessionId);

    span.end({
      success: true,
      hasTranscript: !!clip.transcript,
      transcriptLength: clip.transcript?.length
    });

    trace.end({ success: true });

    return {
      success: true,
      clip,
      warnings: !clip.transcript 
        ? ['No transcript found. Human may need to expand transcript panel.']
        : undefined
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    span.end({ success: false, error: message });
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
    databaseId: input.databaseId
  });

  const span = createNotionSyncSpan(trace, input.databaseId);

  try {
    const result = await notionClient.syncClips(
      input.clips,
      {
        databaseId: input.databaseId,
        customMapping: input.propertyMapping,
        skipDuplicates: true  // Optimized batch dedup
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

async function scrapeAndSync(input: ScrapeAndSyncInput) {
  const provider = getZoomClipsProvider();
  const notionClient = getNotionClient();

  const trace = createSessionTrace({
    tool: 'scrape_and_sync',
    databaseId: input.databaseId,
    urlCount: input.urls.length
  });

  try {
    // Create a session for batch processing
    const firstUrl = input.urls[0];
    const session = await provider.createSession(firstUrl);

    const clips: ClipData[] = [];
    const errors: Array<{ url: string; error: string }> = [];

    // Return session info for human-in-the-loop
    return {
      sessionId: session.id,
      liveViewUrl: session.liveViewUrl,
      totalUrls: input.urls.length,
      databaseId: input.databaseId,
      workflow: [
        `Session created with ${input.urls.length} URLs to process.`,
        `Open Live View: ${session.liveViewUrl}`,
        'For each clip:',
        '  1. Navigate to transcript and expand if needed',
        '  2. Call mark_ready to signal ready',
        '  3. Call scrape_clip to extract',
        '  4. Call navigate to go to next URL',
        'When all clips extracted, call sync_to_notion with the clips array.',
        'Finally, call close_session to save recording.'
      ],
      urls: input.urls
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    trace.end({ success: false, error: message });
    throw error;
  }
}

// =============================================================================
// Tool Handlers - Utility
// =============================================================================

async function getProviderStatus() {
  const provider = getZoomClipsProvider();
  return {
    metrics: provider.getMetrics(),
    activeSessions: provider.listActiveSessions()
  };
}

async function getDatabaseSchema(input: { databaseId: string }) {
  const notionClient = getNotionClient();
  return notionClient.getDatabaseSchema(input.databaseId);
}

async function runDiagnoseUI(input: { sessionId: string }) {
  const provider = getZoomClipsProvider();
  const status = await provider.getSessionStatus(input.sessionId);
  
  if (!status || !status.currentUrl) {
    throw new Error(`Session ${input.sessionId} not found or has no current URL`);
  }
  
  // Get the page from the session
  const session = await provider.getSession(input.sessionId);
  if (!session || !session.page) {
    throw new Error(`Session ${input.sessionId} does not have an active page`);
  }
  
  const report = await diagnoseUI(session.page, status.currentUrl);
  
  return {
    report,
    formattedReport: formatUIReport(report),
    knownLocations: UI_LOCATIONS
  };
}

async function getUILocations() {
  return {
    locations: UI_LOCATIONS,
    description: 'Known UI element selectors for Zoom Clips pages. Update extractors/zoom-clip.ts UI_LOCATIONS based on diagnostic findings.'
  };
}

// =============================================================================
// MCP Server Setup
// =============================================================================

const server = new Server(
  {
    name: 'zoom-clips-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // =========================================================================
    // Session Management (Human-in-the-Loop)
    // =========================================================================
    {
      name: 'create_session',
      description: 'Create a Steel browser session with live view for human-in-the-loop interaction. Returns a Live View URL where human can see and interact with the browser (expand transcript, authenticate, etc.).',
      inputSchema: {
        type: 'object',
        properties: {
          url: { 
            type: 'string', 
            description: 'Initial Zoom Clips URL to navigate to (optional)' 
          },
          timeout: { 
            type: 'number', 
            description: 'Session timeout in ms (default: 24 hours)' 
          }
        }
      }
    },
    {
      name: 'session_status',
      description: 'Get the current status of a browser session, including current URL and time remaining.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session ID returned by create_session' }
        },
        required: ['sessionId']
      }
    },
    {
      name: 'mark_ready',
      description: 'Mark a session as ready for extraction. Call this after human has navigated to and expanded the transcript.',
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
      description: 'Navigate the session browser to a new Zoom Clips URL.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session ID' },
          url: { type: 'string', description: 'Zoom Clips URL to navigate to' }
        },
        required: ['sessionId', 'url']
      }
    },
    {
      name: 'close_session',
      description: 'Close a browser session and save the recording for audit trail. Returns recording URL.',
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
      name: 'scrape_clip',
      description: 'Extract clip data (title, description, transcript, duration, speaker) from the current page in the session. Call after human has expanded the transcript.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session ID with page ready for extraction' }
        },
        required: ['sessionId']
      }
    },

    // =========================================================================
    // Notion Sync
    // =========================================================================
    {
      name: 'sync_to_notion',
      description: 'Sync extracted clip data to a Notion database. Creates a new page for each clip.',
      inputSchema: {
        type: 'object',
        properties: {
          clips: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                transcript: { type: 'string' },
                duration: { type: 'string' },
                speaker: { type: 'string' },
                thumbnailUrl: { type: 'string' },
                videoUrl: { type: 'string' },
                scrapedAt: { type: 'string' }
              },
              required: ['url', 'title']
            },
            description: 'Array of extracted clip data'
          },
          databaseId: { type: 'string', description: 'Notion database ID to sync to' },
          propertyMapping: {
            type: 'object',
            description: 'Optional custom mapping of clip fields to Notion property names',
            properties: {
              title: { type: 'string' },
              url: { type: 'string' },
              description: { type: 'string' },
              transcript: { type: 'string' },
              duration: { type: 'string' },
              speaker: { type: 'string' },
              thumbnailUrl: { type: 'string' },
              videoUrl: { type: 'string' },
              scrapedAt: { type: 'string' }
            }
          }
        },
        required: ['clips', 'databaseId']
      }
    },

    // =========================================================================
    // Combined Workflow
    // =========================================================================
    {
      name: 'scrape_and_sync',
      description: 'Start a batch workflow to scrape multiple Zoom Clips URLs and sync to Notion. Creates a session and returns workflow instructions for human-in-the-loop processing.',
      inputSchema: {
        type: 'object',
        properties: {
          urls: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of Zoom Clips URLs to process'
          },
          databaseId: { type: 'string', description: 'Notion database ID to sync to' },
          propertyMapping: {
            type: 'object',
            description: 'Optional custom mapping of clip fields to Notion property names'
          }
        },
        required: ['urls', 'databaseId']
      }
    },

    // =========================================================================
    // Utility
    // =========================================================================
    {
      name: 'get_provider_status',
      description: 'Get Steel browser provider status and metrics (sessions created, clips extracted, etc.).',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'get_database_schema',
      description: 'Get Notion database schema to help with property mapping configuration.',
      inputSchema: {
        type: 'object',
        properties: {
          databaseId: { type: 'string', description: 'Notion database ID' }
        },
        required: ['databaseId']
      }
    },

    // =========================================================================
    // UI Diagnostics
    // =========================================================================
    {
      name: 'diagnose_ui',
      description: 'Run UI diagnostics on the current page to discover element locations. Returns detailed report of what was found and where, plus recommendations for human operator. Use this to build up knowledge of where transcript and other elements are located.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session ID with page to diagnose' }
        },
        required: ['sessionId']
      }
    },
    {
      name: 'get_ui_locations',
      description: 'Get the known UI element locations registry. This contains all documented selectors for Zoom Clips page elements based on previous diagnostics.',
      inputSchema: { type: 'object', properties: {} }
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
        result = await createSession(CreateSessionInputSchema.parse(safeArgs));
        break;
      case 'session_status':
        result = await getSessionStatus(SessionStatusInputSchema.parse(safeArgs));
        break;
      case 'mark_ready':
        result = await markReady(SessionStatusInputSchema.parse(safeArgs));
        break;
      case 'navigate':
        result = await navigate(NavigateInputSchema.parse(safeArgs));
        break;
      case 'close_session':
        result = await closeSession(CloseSessionInputSchema.parse(safeArgs));
        break;

      // Extraction
      case 'scrape_clip':
        result = await scrapeClip(ScrapeClipInputSchema.parse(safeArgs));
        break;

      // Notion Sync
      case 'sync_to_notion':
        result = await syncToNotion(SyncToNotionInputSchema.parse(safeArgs));
        break;
      case 'scrape_and_sync':
        result = await scrapeAndSync(ScrapeAndSyncInputSchema.parse(safeArgs));
        break;

      // Utility
      case 'get_provider_status':
        result = await getProviderStatus();
        break;
      case 'get_database_schema':
        result = await getDatabaseSchema(GetDatabaseSchemaInputSchema.parse(safeArgs));
        break;

      // UI Diagnostics
      case 'diagnose_ui':
        result = await runDiagnoseUI(DiagnoseUIInputSchema.parse(safeArgs));
        break;
      case 'get_ui_locations':
        result = await getUILocations();
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

console.error('Zoom Clips MCP server running on stdio');
console.error('Human-in-the-Loop workflow: create_session → [human expands transcript] → scrape_clip → sync_to_notion');
