/**
 * YouTube Sync MCP — Prompt Registration
 * Three-Tier Framework: Judgment tier (MCP Prompts)
 *
 * Prompts provide user-controlled judgment templates that guide the model's
 * reasoning about YouTube sync workflows. Each prompt encodes policy about
 * how the model should orchestrate tools and interpret results.
 *
 * Prompts:
 *   sync_playlist        — Guided workflow for syncing a playlist to Notion
 *   transcript_analysis  — Analyze a video transcript for themes and insights
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// =============================================================================
// Registration
// =============================================================================

/**
 * Register all MCP prompts on the server.
 *
 * @param server - The MCP server instance
 */
export function registerPrompts(server: McpServer): void {
  server.prompt(
    'sync_playlist',
    'Guided workflow for syncing a YouTube playlist to Notion. Walks through extraction, transcript retrieval, and sync.',
    {
      playlistUrl: z.string().describe('YouTube playlist URL to sync'),
      databaseId: z.string().optional().describe('Notion database ID (optional, uses default if not provided)'),
    },
    async ({ playlistUrl, databaseId }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `I want to sync a YouTube playlist to Notion.

Playlist URL: ${playlistUrl}
Database ID: ${databaseId || 'your-database-id'}

Please follow this workflow:

1. First, use the sync_playlist tool to extract all videos, get their transcripts, and sync to Notion.
2. Report the results: how many videos were found, how many had transcripts, how many were synced vs skipped (duplicates).
3. If any videos failed, explain what went wrong and suggest fixes.
4. Provide a summary of the synced content (video titles, channels, transcript availability).

Use the databaseId "${databaseId || 'your-database-id'}" for the Notion sync.`,
        },
      }],
    }),
  );

  server.prompt(
    'transcript_analysis',
    'Analyze a YouTube video transcript for key themes, summaries, and actionable insights.',
    {
      videoUrl: z.string().describe('YouTube video URL to analyze'),
    },
    async ({ videoUrl }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Please analyze the transcript of this YouTube video: ${videoUrl}

Steps:
1. Use the extract_transcript tool to get the transcript.
2. Provide the following analysis:
   - **Summary**: A 2-3 sentence overview of the video content
   - **Key Themes**: The main topics discussed (bulleted list)
   - **Key Quotes**: Notable or important statements (with approximate timestamps if available)
   - **Action Items**: Any actionable takeaways or recommendations mentioned
   - **Related Topics**: Suggestions for follow-up research based on the content

Format the analysis clearly with headers and bullet points.`,
        },
      }],
    }),
  );
}
