/**
 * Half Dozen YouTube Sync - MCP Worker
 * 
 * Cloudflare Worker with Streamable HTTP transport for remote MCP access.
 * Exposes API-only tools (no browser automation — that stays in stdio server).
 * Uses direct fetch for Notion API (Workers-compatible, no SDK).
 * 
 * Tools available:
 * - extract_transcript: Get transcript from YouTube video (API-only)
 * - sync_to_notion: Sync video data to Notion database
 * - get_database_schema: Get Notion database properties
 * - search: ChatGPT connector (search synced videos in Notion)
 * - fetch: ChatGPT connector (get full video details from Notion)
 * 
 * Resources:
 * - youtube://video/{id}/transcript: Video transcript by ID
 * - youtube://status: Server status
 * 
 * Prompts:
 * - sync_playlist: Guided playlist sync workflow
 * - transcript_analysis: Analyze video transcript
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { z } from 'zod';

// =============================================================================
// Types
// =============================================================================

interface Env {
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;
  MCP_OBJECT: DurableObjectNamespace;
}

// =============================================================================
// Constants
// =============================================================================

const SERVER_NAME = 'half-dozen-youtube-sync';
const SERVER_VERSION = '1.1.0';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

/** Maximum characters per rich text chunk (Notion limit: 2000, with buffer) */
const CHUNK_SIZE = 1900;

/** Maximum blocks per Notion append request */
const MAX_BLOCKS_PER_REQUEST = 100;

// =============================================================================
// YouTube Transcript API (direct fetch, no npm dependency)
// =============================================================================

/**
 * Extract transcript from YouTube video using YouTube's internal API.
 * Works in Cloudflare Workers — pure fetch, no Node.js dependencies.
 */
async function fetchYouTubeTranscript(videoId: string): Promise<{
  transcript: string;
  segments: Array<{ text: string; start: number; duration: number }>;
} | null> {
  try {
    // Fetch the video page to get caption tracks
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!pageResponse.ok) return null;

    const pageHtml = await pageResponse.text();

    // Extract caption track URL from ytInitialPlayerResponse
    const captionMatch = pageHtml.match(/"captionTracks":\s*(\[.*?\])/);
    if (!captionMatch) return null;

    let captionTracks: Array<{ baseUrl: string; languageCode: string; kind?: string }>;
    try {
      captionTracks = JSON.parse(captionMatch[1]);
    } catch {
      return null;
    }

    if (!captionTracks || captionTracks.length === 0) return null;

    // Prefer English, then any manual caption, then auto-generated
    const track =
      captionTracks.find(t => t.languageCode === 'en' && t.kind !== 'asr') ||
      captionTracks.find(t => t.languageCode === 'en') ||
      captionTracks.find(t => t.kind !== 'asr') ||
      captionTracks[0];

    // Fetch the transcript XML
    const transcriptUrl = track.baseUrl.replace(/&amp;/g, '&');
    const transcriptResponse = await fetch(transcriptUrl);
    if (!transcriptResponse.ok) return null;

    const transcriptXml = await transcriptResponse.text();

    // Parse XML transcript
    const segments: Array<{ text: string; start: number; duration: number }> = [];
    const segmentRegex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>(.*?)<\/text>/g;
    let match;

    while ((match = segmentRegex.exec(transcriptXml)) !== null) {
      const text = match[3]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]*>/g, '')
        .trim();

      if (text) {
        segments.push({
          text,
          start: parseFloat(match[1]),
          duration: parseFloat(match[2]),
        });
      }
    }

    if (segments.length === 0) return null;

    const transcript = segments.map(s => s.text).join(' ');
    return { transcript, segments };
  } catch {
    return null;
  }
}

/**
 * Extract video ID from various YouTube URL formats.
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  // If it's already just a video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

  return null;
}

// =============================================================================
// Notion API helpers (direct fetch, no SDK)
// =============================================================================

async function notionFetch(env: Env, path: string, method: string = 'GET', body?: unknown) {
  const response = await fetch(`${NOTION_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error (${response.status}): ${error}`);
  }

  return response.json();
}

async function notionQueryDatabase(
  env: Env,
  databaseId: string,
  filter: unknown,
  pageSize: number = 10
) {
  return notionFetch(env, `/databases/${databaseId}/query`, 'POST', {
    filter,
    page_size: pageSize,
  }) as Promise<{
    results: Array<{
      id: string;
      url?: string;
      properties: Record<string, {
        type: string;
        title?: Array<{ plain_text: string }>;
        url?: string | null;
        rich_text?: Array<{ plain_text: string }>;
        select?: { name: string } | null;
        date?: { start: string } | null;
        [key: string]: unknown;
      }>;
    }>;
  }>;
}

async function notionCreatePage(env: Env, databaseId: string, properties: Record<string, unknown>) {
  return notionFetch(env, '/pages', 'POST', {
    parent: { database_id: databaseId },
    properties,
  }) as Promise<{ id: string; url?: string }>;
}

async function notionAppendBlocks(env: Env, blockId: string, children: unknown[]) {
  return notionFetch(env, `/blocks/${blockId}/children`, 'PATCH', { children }) as Promise<{
    results: Array<{ id: string }>;
  }>;
}

// =============================================================================
// Text chunking (Notion API limits)
// =============================================================================

function chunkText(text: string, maxLength: number = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    const sentenceEnd = remaining.lastIndexOf('. ', maxLength);
    const splitAt = sentenceEnd > maxLength * 0.5 ? sentenceEnd + 2 : maxLength;

    chunks.push(remaining.substring(0, splitAt).trim());
    remaining = remaining.substring(splitAt).trim();
  }

  return chunks;
}

function buildTranscriptBlocks(transcript: string, title: string = 'Transcript'): {
  toggleBlock: unknown;
  overflowBatches: unknown[][];
} {
  const chunks = chunkText(transcript);

  if (chunks.length === 0) {
    return {
      toggleBlock: {
        type: 'toggle',
        toggle: {
          rich_text: [{ type: 'text', text: { content: title } }],
          children: [{ type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: '(empty)' } }] } }],
        },
      },
      overflowBatches: [],
    };
  }

  const paragraphs = chunks.map(chunk => ({
    type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content: chunk } }] },
  }));

  const firstBatchSize = Math.min(paragraphs.length, MAX_BLOCKS_PER_REQUEST - 1);
  const firstBatch = paragraphs.slice(0, firstBatchSize);

  const toggleBlock = {
    type: 'toggle',
    toggle: {
      rich_text: [{ type: 'text', text: { content: title } }],
      children: firstBatch,
    },
  };

  const overflowBatches: unknown[][] = [];
  for (let i = firstBatchSize; i < paragraphs.length; i += MAX_BLOCKS_PER_REQUEST) {
    overflowBatches.push(paragraphs.slice(i, i + MAX_BLOCKS_PER_REQUEST));
  }

  return { toggleBlock, overflowBatches };
}

// =============================================================================
// MCP Agent
// =============================================================================

export class YouTubeSyncMCP extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    icons: [{
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjMDAwMDAwIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCw0KSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbD0ibm9uZSI+PHBvbHlnb24gcG9pbnRzPSI2IDMgMjAgMTIgNiAyMSA2IDMiLz48L2c+PC9zdmc+',
      mimeType: 'image/svg+xml',
      sizes: ['any'],
    }],
  });

  async init() {
    // =========================================================================
    // Resources
    // =========================================================================

    this.server.resource(
      'server-status',
      'youtube://status',
      { description: 'Server status and configuration', mimeType: 'application/json' },
      async () => ({
        contents: [{
          uri: 'youtube://status',
          mimeType: 'application/json',
          text: JSON.stringify({
            server: { name: SERVER_NAME, version: SERVER_VERSION },
            capabilities: ['transcript_extraction', 'notion_sync', 'chatgpt_connector'],
            transport: 'http',
          }, null, 2),
        }],
      })
    );

    // =========================================================================
    // Prompts
    // =========================================================================

    this.server.prompt(
      'sync_playlist',
      {
        playlistUrl: z.string().describe('YouTube playlist URL to sync'),
        databaseId: z.string().optional().describe('Notion database ID'),
      },
      ({ playlistUrl, databaseId }) => ({
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `I want to sync a YouTube playlist to Notion.\n\nPlaylist URL: ${playlistUrl}\nDatabase ID: ${databaseId || 'default'}\n\nPlease:\n1. Extract transcripts for each video using extract_transcript\n2. Sync each video to Notion using sync_to_notion\n3. Report results: videos found, transcripts available, sync status`,
          },
        }],
      })
    );

    this.server.prompt(
      'transcript_analysis',
      {
        videoUrl: z.string().describe('YouTube video URL to analyze'),
      },
      ({ videoUrl }) => ({
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please analyze the transcript of this YouTube video: ${videoUrl}\n\nSteps:\n1. Use extract_transcript to get the transcript\n2. Provide: Summary, Key Themes, Key Quotes, Action Items, Related Topics`,
          },
        }],
      })
    );

    // =========================================================================
    // Tool: Extract Transcript
    // =========================================================================

    this.server.tool(
      'extract_transcript',
      {
        videoUrl: z.string().describe('YouTube video URL or video ID'),
      },
      async ({ videoUrl }) => {
        try {
          const videoId = extractVideoId(videoUrl);
          if (!videoId) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: `Invalid YouTube URL: ${videoUrl}` }) }] };
          }

          const result = await fetchYouTubeTranscript(videoId);
          if (!result) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  videoId,
                  error: 'Transcript not available. Video may not have captions enabled.',
                }),
              }],
            };
          }

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                videoId,
                transcript: result.transcript,
                segmentCount: result.segments.length,
                characterCount: result.transcript.length,
                method: 'api',
              }, null, 2),
            }],
          };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // =========================================================================
    // Tool: Sync to Notion
    // =========================================================================

    this.server.tool(
      'sync_to_notion',
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
        databaseId: z.string().optional().describe('Notion database ID (defaults to configured database)'),
      },
      async ({ videos, databaseId }) => {
        try {
          const dbId = databaseId || this.env.NOTION_DATABASE_ID;
          if (!dbId) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'No database ID provided' }) }] };
          }

          // Batch check for duplicates
          const urls = videos.map(v => v.url);
          const existingUrls = new Set<string>();

          if (urls.length > 0) {
            const filter = urls.length === 1
              ? { property: 'Source URL', url: { equals: urls[0] } }
              : { or: urls.map(u => ({ property: 'Source URL', url: { equals: u } })) };

            try {
              const existing = await notionQueryDatabase(this.env, dbId, filter, 100);
              for (const page of existing.results) {
                const urlProp = page.properties['Source URL'];
                if (urlProp?.url) existingUrls.add(urlProp.url as string);
              }
            } catch {
              // Continue without dedup if check fails
            }
          }

          let successful = 0;
          let skipped = 0;
          let failed = 0;
          const results: Array<{ title: string; status: string; pageId?: string; error?: string }> = [];

          for (const video of videos) {
            if (existingUrls.has(video.url)) {
              skipped++;
              results.push({ title: video.title, status: 'skipped' });
              continue;
            }

            try {
              // Create page
              const properties: Record<string, unknown> = {
                Item: { title: [{ text: { content: video.title } }] },
                'Source URL': { url: video.url },
                Status: { select: { name: 'Active' } },
                Source: { select: { name: 'Internal' } },
                Type: { select: { name: 'Video' } },
                Date: { date: { start: new Date().toISOString().split('T')[0] } },
              };

              const page = await notionCreatePage(this.env, dbId, properties);

              // Append metadata
              const metaParts: string[] = [];
              if (video.channelName) metaParts.push(`Channel: ${video.channelName}`);
              if (video.duration) metaParts.push(`Duration: ${video.duration}`);
              if (video.publishedAt) metaParts.push(`Published: ${video.publishedAt}`);

              const metaBlocks: unknown[] = [
                { type: 'bookmark', bookmark: { url: video.url } },
              ];

              if (metaParts.length > 0) {
                metaBlocks.push({
                  type: 'callout',
                  callout: {
                    icon: { emoji: 'ℹ️' },
                    rich_text: [{ type: 'text', text: { content: metaParts.join('\n') } }],
                  },
                });
              }

              metaBlocks.push({ type: 'divider', divider: {} });

              await notionAppendBlocks(this.env, page.id, metaBlocks);

              // Append transcript
              if (video.transcript) {
                const { toggleBlock, overflowBatches } = buildTranscriptBlocks(video.transcript, 'Transcript');
                const appendResult = await notionAppendBlocks(this.env, page.id, [toggleBlock]);

                for (const batch of overflowBatches) {
                  const toggleId = appendResult.results[0].id;
                  await notionAppendBlocks(this.env, toggleId, batch);
                }
              }

              successful++;
              results.push({ title: video.title, status: 'synced', pageId: page.id });

              // Rate limit
              await new Promise(r => setTimeout(r, 350));
            } catch (error) {
              failed++;
              results.push({ title: video.title, status: 'failed', error: String(error) });
            }
          }

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                total: videos.length,
                successful,
                skipped,
                failed,
                results,
              }, null, 2),
            }],
          };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // =========================================================================
    // Tool: Get Database Schema
    // =========================================================================

    this.server.tool(
      'get_database_schema',
      {
        databaseId: z.string().optional().describe('Notion database ID (defaults to configured database)'),
      },
      async ({ databaseId }) => {
        try {
          const dbId = databaseId || this.env.NOTION_DATABASE_ID;
          if (!dbId) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'No database ID provided' }) }] };
          }

          const response = await notionFetch(this.env, `/databases/${dbId}`) as {
            id: string;
            title: Array<{ plain_text: string }>;
            properties: Record<string, { type: string }>;
          };

          const properties: Record<string, { type: string; name: string }> = {};
          for (const [name, prop] of Object.entries(response.properties)) {
            properties[name] = { type: prop.type, name };
          }

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                id: response.id,
                title: response.title?.[0]?.plain_text || 'Untitled',
                properties,
              }, null, 2),
            }],
          };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // =========================================================================
    // ChatGPT Connector: Search
    // =========================================================================

    this.server.tool(
      'search',
      {
        query: z.string().describe('Search query for synced videos in Notion'),
      },
      async ({ query }) => {
        try {
          const dbId = this.env.NOTION_DATABASE_ID;
          if (!dbId) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'No database ID configured' }) }] };
          }

          // Search by title
          const response = await notionQueryDatabase(this.env, dbId, {
            property: 'Item',
            title: { contains: query },
          }, 10);

          const results = response.results.map(page => {
            const title = page.properties['Item']?.title?.[0]?.plain_text || 'Untitled';
            const url = page.properties['Source URL']?.url || '';
            return {
              id: page.id,
              title,
              url: url || `https://notion.so/${page.id.replace(/-/g, '')}`,
            };
          });

          return { content: [{ type: 'text', text: JSON.stringify({ results }, null, 2) }] };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // =========================================================================
    // ChatGPT Connector: Fetch
    // =========================================================================

    this.server.tool(
      'fetch',
      {
        id: z.string().describe('Notion page ID (from search results)'),
      },
      async ({ id }) => {
        try {
          const page = await notionFetch(this.env, `/pages/${id}`) as {
            id: string;
            url?: string;
            properties: Record<string, {
              type: string;
              title?: Array<{ plain_text: string }>;
              url?: string | null;
              select?: { name: string } | null;
              date?: { start: string } | null;
              [key: string]: unknown;
            }>;
          };

          const title = page.properties['Item']?.title?.[0]?.plain_text || 'Untitled';
          const sourceUrl = page.properties['Source URL']?.url || '';
          const status = page.properties['Status']?.select?.name || '';
          const type = page.properties['Type']?.select?.name || '';
          const date = page.properties['Date']?.date?.start || '';

          // Get page content (transcript blocks)
          const blocks = await notionFetch(this.env, `/blocks/${id}/children`) as {
            results: Array<{
              type: string;
              toggle?: { rich_text: Array<{ plain_text: string }> };
              paragraph?: { rich_text: Array<{ plain_text: string }> };
              callout?: { rich_text: Array<{ plain_text: string }> };
            }>;
          };

          let transcript = '';
          let metadata = '';

          for (const block of blocks.results) {
            if (block.type === 'callout' && block.callout?.rich_text) {
              metadata = block.callout.rich_text.map(t => t.plain_text).join('');
            }
            if (block.type === 'toggle' && block.toggle?.rich_text) {
              // Get toggle children (transcript paragraphs)
              try {
                const children = await notionFetch(this.env, `/blocks/${(block as { id: string }).id}/children`) as {
                  results: Array<{ paragraph?: { rich_text: Array<{ plain_text: string }> } }>;
                };
                transcript = children.results
                  .map(c => c.paragraph?.rich_text?.map(t => t.plain_text).join('') || '')
                  .filter(Boolean)
                  .join(' ');
              } catch {
                // Toggle may not have children
              }
            }
          }

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                id: page.id,
                title,
                text: `Title: ${title}\nSource: ${sourceUrl}\nStatus: ${status}\nType: ${type}\nDate: ${date}\n${metadata ? `\nMetadata:\n${metadata}` : ''}${transcript ? `\n\nTranscript:\n${transcript}` : ''}`,
                url: sourceUrl || page.url || `https://notion.so/${page.id.replace(/-/g, '')}`,
                metadata: { title, sourceUrl, status, type, date },
              }, null, 2),
            }],
          };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );
  }
}

// =============================================================================
// Worker entry point
// =============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return YouTubeSyncMCP.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return YouTubeSyncMCP.serve('/sse').fetch(request, env, ctx);
    }

    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        features: ['transcript_extraction', 'notion_sync', 'chatgpt_connector'],
        endpoints: {
          mcp: '/mcp',
          sse: '/sse',
        },
        tools: [
          'extract_transcript',
          'sync_to_notion',
          'get_database_schema',
          'search',
          'fetch',
        ],
        resources: ['youtube://status'],
        prompts: ['sync_playlist', 'transcript_analysis'],
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
