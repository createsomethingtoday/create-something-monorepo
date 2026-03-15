/**
 * Notion Client for Half Dozen YouTube Sync
 * 
 * Handles syncing YouTube video data to Notion database.
 * Optimized for batch deduplication and transcript handling.
 * 
 * Database Schema (Half Dozen Internal LLM):
 * - Item: title (video title)
 * - Source URL: url (YouTube URL, used for dedup)
 * - Date: date (video publish date or sync date)
 * - Status: select (Active)
 * - Source: select (Internal)
 * - Type: select (Video)
 * - Transcript: toggle block in page body
 */

import { Client } from '@notionhq/client';
import type {
  VideoData,
  NotionPropertyMapping,
  NotionSelectDefaults,
  NotionSyncResult,
  BatchSyncResult,
  NotionPage,
  NotionQueryResponse,
  NotionDatabaseResponse,
  NotionBlocksAppendResponse
} from '../types.js';
import {
  NOTION_CHUNK_SIZE,
  NOTION_MAX_BLOCKS_PER_REQUEST,
  NOTION_RATE_LIMIT_DELAY,
  NOTION_DEFAULT_DATABASE_ID
} from '../config.js';
import { withNotionRetry } from '../utils/retry.js';

// =============================================================================
// Default Property Mapping (Half Dozen database schema)
// =============================================================================

const DEFAULT_PROPERTY_MAPPING: NotionPropertyMapping = {
  title: 'Item',              // Title property (video title)
  url: 'Source URL',          // URL property (for dedup)
  date: 'Date',               // Date property
  status: 'Status',           // Select: Active
  source: 'Source',           // Select: Internal
  type: 'Type',               // Select: Video
  // Not in HD schema - keep for flexibility
  description: undefined,
  transcript: undefined,
  duration: undefined,
  channelName: undefined,
  thumbnailUrl: undefined,
  publishedAt: undefined,
  scrapedAt: undefined
};

const DEFAULT_SELECT_VALUES: NotionSelectDefaults = {
  status: 'Active',
  source: 'Internal',
  type: 'Video'
};

// =============================================================================
// Transcript Chunking Helper
// =============================================================================

/**
 * Chunk transcript text at sentence boundaries, respecting the 2000 char limit.
 */
export function chunkTranscript(text: string, maxLength: number = NOTION_CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    const splitIndex = findSentenceBoundary(remaining, maxLength);
    chunks.push(remaining.substring(0, splitIndex).trim());
    remaining = remaining.substring(splitIndex).trim();
  }

  return chunks;
}

function findSentenceBoundary(text: string, maxLength: number): number {
  const sentenceEnders = ['. ', '? ', '! ', '.\n', '?\n', '!\n'];
  
  for (const ender of sentenceEnders) {
    const index = text.lastIndexOf(ender, maxLength);
    if (index > maxLength * 0.5) {
      return index + ender.length;
    }
  }

  const newlineIndex = text.lastIndexOf('\n', maxLength);
  if (newlineIndex > maxLength * 0.5) {
    return newlineIndex + 1;
  }

  const spaceIndex = text.lastIndexOf(' ', maxLength);
  if (spaceIndex > maxLength * 0.3) {
    return spaceIndex + 1;
  }

  return maxLength;
}

// =============================================================================
// Notion Client Wrapper
// =============================================================================

export class YouTubeNotionClient {
  private client: Client;
  private defaultDatabaseId?: string;
  private propertyMapping: NotionPropertyMapping;
  private selectDefaults: NotionSelectDefaults;

  constructor(options: {
    apiKey?: string;
    defaultDatabaseId?: string;
    propertyMapping?: Partial<NotionPropertyMapping>;
    selectDefaults?: NotionSelectDefaults;
  } = {}) {
    const apiKey = options.apiKey || process.env.NOTION_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        'Notion API key required. Set NOTION_API_KEY environment variable or pass apiKey to constructor.'
      );
    }

    this.client = new Client({ auth: apiKey });
    this.defaultDatabaseId = options.defaultDatabaseId || NOTION_DEFAULT_DATABASE_ID;
    this.propertyMapping = {
      ...DEFAULT_PROPERTY_MAPPING,
      ...options.propertyMapping
    };
    this.selectDefaults = {
      ...DEFAULT_SELECT_VALUES,
      ...options.selectDefaults
    };
  }

  /**
   * Build Notion properties object from VideoData
   */
  private buildProperties(
    video: VideoData,
    mapping: NotionPropertyMapping,
    selectDefaults?: NotionSelectDefaults
  ): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const defaults = selectDefaults || this.selectDefaults;

    // Title (required)
    properties[mapping.title] = {
      title: [{ text: { content: video.title } }]
    };

    // URL (for dedup)
    if (mapping.url) {
      properties[mapping.url] = { url: video.url };
    }

    // Date property - use publishedAt or scrapedAt
    if (mapping.date) {
      const dateValue = this.parseDate(video.publishedAt || video.scrapedAt);
      if (dateValue) {
        properties[mapping.date] = {
          date: { start: dateValue }
        };
      }
    }

    // Select properties with default values
    if (mapping.status && defaults.status) {
      properties[mapping.status] = {
        select: { name: defaults.status }
      };
    }

    if (mapping.source && defaults.source) {
      properties[mapping.source] = {
        select: { name: defaults.source }
      };
    }

    if (mapping.type && defaults.type) {
      properties[mapping.type] = {
        select: { name: defaults.type }
      };
    }

    // Optional properties (if they exist in the database)
    if (mapping.channelName && video.channelName) {
      properties[mapping.channelName] = {
        rich_text: [{ text: { content: video.channelName } }]
      };
    }

    if (mapping.duration && video.duration) {
      properties[mapping.duration] = {
        rich_text: [{ text: { content: video.duration } }]
      };
    }

    return properties;
  }

  /**
   * Parse various date formats into ISO date string
   */
  private parseDate(dateStr?: string): string | null {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    // If already ISO format, return as-is
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.split('T')[0];
    }

    // Try to parse YouTube date formats
    // "Jan 15, 2024" or "January 15, 2024"
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      // Ignore parsing errors
    }

    // Default to today's date
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Sync a single video to Notion database.
   */
  async syncVideo(
    video: VideoData,
    databaseId?: string,
    customMapping?: Partial<NotionPropertyMapping>
  ): Promise<NotionSyncResult> {
    const dbId = databaseId || this.defaultDatabaseId;
    
    if (!dbId) {
      return {
        success: false,
        error: 'No database ID provided. Pass databaseId or set defaultDatabaseId.'
      };
    }

    const mapping = customMapping 
      ? { ...this.propertyMapping, ...customMapping }
      : this.propertyMapping;

    try {
      // 1. Create the page with properties (with retry)
      const response = await withNotionRetry(() =>
        this.client.pages.create({
          parent: { database_id: dbId },
          properties: this.buildProperties(video, mapping) as Parameters<typeof this.client.pages.create>[0]['properties']
        })
      );

      const page = response as NotionPage;
      const pageId = page.id;
      const pageUrl = page.url;

      // 2. Append metadata blocks (with retry)
      await withNotionRetry(() => this.appendMetadataToPage(pageId, video));
      await this.sleep(NOTION_RATE_LIMIT_DELAY);

      // 3. Append transcript as collapsible Toggle block
      if (video.transcript) {
        const transcriptResult = await this.appendTranscriptToPage(
          pageId,
          video.transcript,
          '📝 Transcript'
        );

        if (!transcriptResult.success) {
          return {
            success: true,
            pageId,
            pageUrl,
            error: `Page created but transcript append failed: ${transcriptResult.error}`
          };
        }
      }

      return {
        success: true,
        pageId,
        pageUrl
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message
      };
    }
  }

  /**
   * Sync multiple videos to Notion database (with rate limiting)
   */
  async syncVideos(
    videos: VideoData[],
    options: {
      databaseId?: string;
      customMapping?: Partial<NotionPropertyMapping>;
      skipDuplicates?: boolean;
    } = {}
  ): Promise<BatchSyncResult> {
    const { databaseId, customMapping, skipDuplicates = true } = options;
    const results: NotionSyncResult[] = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    // Batch check for duplicates (single API call)
    let existingUrls = new Set<string>();
    if (skipDuplicates && videos.length > 0) {
      const urls = videos.map(v => v.url);
      existingUrls = await this.batchCheckExists(urls, databaseId);
      
      if (existingUrls.size > 0) {
        console.log(`Found ${existingUrls.size} existing video(s), will skip`);
      }
    }

    // Process sequentially with rate limiting
    for (const video of videos) {
      // Skip if already exists
      if (existingUrls.has(video.url)) {
        skipped++;
        results.push({
          success: true,
          error: 'Skipped: video already exists'
        });
        continue;
      }

      const result = await this.syncVideo(video, databaseId, customMapping);
      results.push(result);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      // Rate limit: Notion allows ~3 requests/second
      await this.sleep(NOTION_RATE_LIMIT_DELAY);
    }

    return {
      total: videos.length,
      successful,
      failed,
      skipped,
      results
    };
  }

  /**
   * Check if a video already exists in the database (by URL)
   */
  async videoExists(url: string, databaseId?: string): Promise<boolean> {
    const dbId = databaseId || this.defaultDatabaseId;
    
    if (!dbId) return false;

    try {
      const response = await withNotionRetry(() =>
        this.client.databases.query({
          database_id: dbId,
          filter: {
            property: this.propertyMapping.url || 'Source URL',
            url: { equals: url }
          },
          page_size: 1
        })
      ) as unknown as NotionQueryResponse;

      return response.results.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Batch check which URLs already exist in the database.
   */
  async batchCheckExists(urls: string[], databaseId?: string): Promise<Set<string>> {
    const dbId = databaseId || this.defaultDatabaseId;
    const existingUrls = new Set<string>();
    
    if (!dbId || urls.length === 0) return existingUrls;

    const urlProperty = this.propertyMapping.url || 'Source URL';

    try {
      // Build OR filter for all URLs
      const filter = urls.length === 1
        ? {
            property: urlProperty,
            url: { equals: urls[0] }
          }
        : {
            or: urls.map(url => ({
              property: urlProperty,
              url: { equals: url }
            }))
          };

      const response = await withNotionRetry(() =>
        this.client.databases.query({
          database_id: dbId,
          filter: filter as Parameters<typeof this.client.databases.query>[0]['filter'],
          page_size: 100
        })
      ) as unknown as NotionQueryResponse;

      // Extract URLs from results using typed properties
      for (const page of response.results) {
        const urlProp = page.properties[urlProperty];
        if (urlProp && urlProp.type === 'url') {
          const urlValue = (urlProp as { type: 'url'; url: string | null }).url;
          if (urlValue) {
            existingUrls.add(urlValue);
          }
        }
      }

      return existingUrls;
    } catch {
      return existingUrls;
    }
  }

  /**
   * Get database schema to validate property mapping
   */
  async getDatabaseSchema(databaseId?: string): Promise<{
    id: string;
    title: string;
    properties: Record<string, { type: string; name: string }>;
  } | null> {
    const dbId = databaseId || this.defaultDatabaseId;
    
    if (!dbId) return null;

    try {
      const response = await withNotionRetry(() =>
        this.client.databases.retrieve({ database_id: dbId })
      ) as unknown as NotionDatabaseResponse;

      const properties: Record<string, { type: string; name: string }> = {};
      
      for (const [name, prop] of Object.entries(response.properties)) {
        properties[name] = {
          type: prop.type,
          name
        };
      }

      return {
        id: response.id,
        title: response.title?.[0]?.plain_text || 'Untitled',
        properties
      };
    } catch {
      return null;
    }
  }

  /**
   * Sleep helper for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===========================================================================
  // Transcript Page Body Methods
  // ===========================================================================

  /**
   * Append transcript to page body as a collapsible Toggle block.
   */
  async appendTranscriptToPage(
    pageId: string,
    transcript: string,
    title: string = '📝 Transcript'
  ): Promise<{ success: boolean; blockCount: number; error?: string }> {
    if (!transcript || transcript.trim().length === 0) {
      return { success: true, blockCount: 0 };
    }

    try {
      // 1. Chunk transcript at sentence boundaries
      const chunks = chunkTranscript(transcript, NOTION_CHUNK_SIZE);

      // 2. Build paragraph blocks for each chunk
      const paragraphBlocks = chunks.map(chunk => ({
        type: 'paragraph' as const,
        paragraph: {
          rich_text: [{ type: 'text' as const, text: { content: chunk } }]
        }
      }));

      // 3. Create toggle block with first batch of children
      const firstBatchSize = Math.min(paragraphBlocks.length, NOTION_MAX_BLOCKS_PER_REQUEST - 1);
      const firstBatch = paragraphBlocks.slice(0, firstBatchSize);

      const toggleBlock = {
        type: 'toggle' as const,
        toggle: {
          rich_text: [{ type: 'text' as const, text: { content: title } }],
          children: firstBatch
        }
      };

      // 4. Append toggle to page (with retry)
      const response = await withNotionRetry(() =>
        this.client.blocks.children.append({
          block_id: pageId,
          children: [toggleBlock]
        })
      ) as unknown as NotionBlocksAppendResponse;

      // 5. If more chunks remain, append them in batches
      if (paragraphBlocks.length > firstBatchSize) {
        const toggleId = response.results[0].id;
        
        for (let i = firstBatchSize; i < paragraphBlocks.length; i += NOTION_MAX_BLOCKS_PER_REQUEST) {
          const batch = paragraphBlocks.slice(i, i + NOTION_MAX_BLOCKS_PER_REQUEST);
          
          await withNotionRetry(() =>
            this.client.blocks.children.append({
              block_id: toggleId,
              children: batch
            })
          );

          await this.sleep(NOTION_RATE_LIMIT_DELAY);
        }
      }

      return {
        success: true,
        blockCount: paragraphBlocks.length
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        blockCount: 0,
        error: message
      };
    }
  }

  /**
   * Append metadata blocks to page body.
   */
  async appendMetadataToPage(
    pageId: string,
    video: VideoData
  ): Promise<{ success: boolean; error?: string }> {
    const blocks: Array<{
      type: 'callout' | 'embed' | 'video' | 'divider' | 'bookmark';
      callout?: { rich_text: Array<{ type: 'text'; text: { content: string } }>; icon?: { emoji: string } };
      embed?: { url: string };
      video?: { type: 'external'; external: { url: string } };
      divider?: Record<string, never>;
      bookmark?: { url: string };
    }> = [];

    // Add YouTube video embed
    blocks.push({
      type: 'bookmark',
      bookmark: { url: video.url }
    });

    // Add metadata callout
    const metaParts: string[] = [];
    if (video.channelName) metaParts.push(`Channel: ${video.channelName}`);
    if (video.duration) metaParts.push(`Duration: ${video.duration}`);
    if (video.publishedAt) metaParts.push(`Published: ${video.publishedAt}`);
    if (video.playlistTitle) metaParts.push(`Playlist: ${video.playlistTitle}`);

    if (metaParts.length > 0) {
      blocks.push({
        type: 'callout',
        callout: {
          rich_text: [{ type: 'text', text: { content: metaParts.join('\n') } }],
          icon: { emoji: 'ℹ️' }
        }
      });
    }

    // Add divider before transcript
    blocks.push({ type: 'divider', divider: {} });

    if (blocks.length === 0) {
      return { success: true };
    }

    try {
      await withNotionRetry(() =>
        this.client.blocks.children.append({
          block_id: pageId,
          children: blocks as Parameters<typeof this.client.blocks.children.append>[0]['children']
        })
      );

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }
}

// =============================================================================
// Factory
// =============================================================================

let clientInstance: YouTubeNotionClient | null = null;

export function getNotionClient(options?: {
  apiKey?: string;
  defaultDatabaseId?: string;
  propertyMapping?: Partial<NotionPropertyMapping>;
}): YouTubeNotionClient {
  if (!clientInstance) {
    clientInstance = new YouTubeNotionClient(options);
  }
  return clientInstance;
}

export function resetNotionClient(): void {
  clientInstance = null;
}
