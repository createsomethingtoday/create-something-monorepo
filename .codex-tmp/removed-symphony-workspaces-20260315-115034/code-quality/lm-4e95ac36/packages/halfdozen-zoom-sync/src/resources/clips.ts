/**
 * Clips Resources — clips://library, clips://clip/{id}
 * Three-Tier Framework: Database tier (MCP Resources)
 *
 * Exposes synced clips as read-only resources. Data comes from
 * the D1 clips_cache table and the Notion database.
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { D1Database } from '../lib/db.js';
import { listCachedClips } from '../lib/db.js';
import { notionFetch, type NotionConfig } from '../lib/notion.js';

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerClipsResources(
  server: McpServer,
  getDb: () => D1Database,
  notionConfig: NotionConfig,
): void {
  // --- clips://library (static resource) ------------------------------------
  server.resource(
    'library',
    'clips://library',
    {
      description: 'List of synced Zoom clips (from D1 cache)',
      mimeType: 'application/json',
    },
    async (uri: URL) => {
      const db = getDb();
      const clips = await listCachedClips(db, 50);

      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({
            count: clips.length,
            clips: clips.map((c) => ({
              url: c.zoom_url,
              title: c.title,
              speaker: c.speaker,
              created_at: c.created_at,
              notion_page_id: c.notion_page_id,
              synced_at: c.synced_at,
            })),
          }, null, 2),
        }],
      };
    },
  );

  // --- clips://clip/{id} (template resource) --------------------------------
  server.resource(
    'clip',
    new ResourceTemplate('clips://clip/{id}', { list: undefined }),
    {
      description: 'Individual clip metadata and transcript from Notion',
      mimeType: 'application/json',
    },
    async (uri: URL, variables: Record<string, string | string[]>) => {
      const pageId = typeof variables.id === 'string' ? variables.id : variables.id?.[0];
      if (!pageId) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'Missing clip ID parameter' }),
          }],
        };
      }

      try {
        // Fetch page from Notion
        const page = await notionFetch(
          notionConfig.apiKey,
          `/pages/${pageId}`,
        ) as {
          id: string;
          properties: Record<string, any>;
        };

        // Fetch page blocks (for transcript)
        const blocks = await notionFetch(
          notionConfig.apiKey,
          `/blocks/${pageId}/children`,
        ) as {
          results: Array<{
            type: string;
            toggle?: {
              rich_text: Array<{ plain_text: string }>;
              children?: Array<{
                type: string;
                paragraph?: { rich_text: Array<{ plain_text: string }> };
              }>;
            };
          }>;
        };

        // Extract transcript from toggle blocks
        let transcript = '';
        for (const block of blocks.results) {
          if (block.type === 'toggle' && block.toggle) {
            const toggleTitle = block.toggle.rich_text
              .map((rt) => rt.plain_text)
              .join('');
            if (toggleTitle.includes('Transcript') && block.toggle.children) {
              transcript = block.toggle.children
                .filter((child) => child.type === 'paragraph' && child.paragraph)
                .map((child) =>
                  child.paragraph!.rich_text.map((rt) => rt.plain_text).join(''),
                )
                .join('\n');
            }
          }
        }

        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({
              id: page.id,
              title:
                page.properties.Item?.title?.[0]?.plain_text || 'Untitled',
              url: page.properties['Source URL']?.url || '',
              speaker:
                page.properties.Attendees?.rich_text?.[0]?.plain_text || '',
              date: page.properties.Date?.date?.start || '',
              status: page.properties.Status?.select?.name || '',
              transcript: transcript || null,
              notion_url: `https://notion.so/${page.id.replace(/-/g, '')}`,
            }, null, 2),
          }],
        };
      } catch (e) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: String(e) }),
          }],
        };
      }
    },
  );
}
