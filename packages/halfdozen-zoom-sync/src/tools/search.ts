/**
 * Search Tools — search_clips
 * Three-Tier Framework: Automation tier (MCP Tools)
 *
 * Searches synced clips in Notion by title, speaker, or date range.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { searchClips, type NotionConfig } from '../lib/notion.js';

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerSearchTools(
  server: McpServer,
  notionConfig: NotionConfig,
): void {
  server.tool(
    'search_clips',
    {
      title: z.string().optional().describe('Search by clip title (partial match)'),
      speaker: z
        .string()
        .optional()
        .describe('Search by speaker name (partial match)'),
      date_from: z
        .string()
        .optional()
        .describe('Filter clips on or after this date (YYYY-MM-DD)'),
      date_to: z
        .string()
        .optional()
        .describe('Filter clips on or before this date (YYYY-MM-DD)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum results to return (default: 20)'),
    },
    async ({ title, speaker, date_from, date_to, limit }) => {
      try {
        const results = await searchClips(notionConfig, {
          title,
          speaker,
          dateFrom: date_from,
          dateTo: date_to,
          limit,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(
              {
                count: results.length,
                clips: results.map((clip) => ({
                  id: clip.id,
                  title: clip.title,
                  speaker: clip.speaker,
                  date: clip.date,
                  url: clip.url,
                  notion_url: `https://notion.so/${clip.id.replace(/-/g, '')}`,
                })),
              },
              null,
              2,
            ),
          }],
        };
      } catch (e) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: String(e) }),
          }],
        };
      }
    },
  );
}
