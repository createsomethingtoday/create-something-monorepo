/**
 * Notion Client for Zoom Clips Sync
 * 
 * Handles syncing extracted Zoom Clips data to a Notion database.
 * Uses the official Notion API client with configurable property mapping.
 * 
 * Transcript Handling:
 * - Transcripts are added to the page body (not as a property)
 * - Uses a collapsible Toggle block containing chunked paragraphs
 * - Each paragraph respects the 2000 character limit
 * - Splits at sentence boundaries for readability
 */

import { Client } from '@notionhq/client';
import type {
  ClipData,
  NotionPropertyMapping,
  NotionSelectDefaults,
  NotionSyncResult,
  BatchSyncResult
} from '../types.js';

// =============================================================================
// Constants
// =============================================================================

/** Maximum characters per rich text object (Notion API limit) */
const MAX_RICH_TEXT_LENGTH = 2000;

/** Buffer for safe chunking (leave room for sentence completion) */
const CHUNK_SIZE = 1900;

/** Maximum blocks per append request (Notion API limit) */
const MAX_BLOCKS_PER_REQUEST = 100;

// =============================================================================
// Default Property Mapping
// =============================================================================

const DEFAULT_PROPERTY_MAPPING: NotionPropertyMapping = {
  title: 'Name',           // Title property
  url: 'URL',              // URL property
  description: 'Description',
  transcript: 'Transcript', // Not used as property anymore, but kept for backwards compat
  duration: 'Duration',
  speaker: 'Speaker',
  thumbnailUrl: 'Thumbnail',
  videoUrl: 'Video URL',
  scrapedAt: 'Scraped At'
};

// =============================================================================
// Transcript Chunking Helper
// =============================================================================

/**
 * Chunk transcript text at sentence boundaries, respecting the 2000 char limit.
 * 
 * Algorithm:
 * 1. If remaining text <= maxLength, return as single chunk
 * 2. Find sentence boundary (. ? ! or newline) near maxLength
 * 3. If no good boundary found, fall back to word boundary
 * 4. If no word boundary, hard cut at maxLength
 * 
 * @param text - The full transcript text
 * @param maxLength - Maximum characters per chunk (default: 1900)
 * @returns Array of text chunks, each <= maxLength
 */
export function chunkTranscript(text: string, maxLength: number = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    // If remaining fits in one chunk, we're done
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Find best split point near maxLength
    let splitIndex = findSentenceBoundary(remaining, maxLength);

    // Extract chunk and continue with remainder
    chunks.push(remaining.substring(0, splitIndex).trim());
    remaining = remaining.substring(splitIndex).trim();
  }

  return chunks;
}

/**
 * Find the best sentence boundary for splitting text.
 * Prioritizes: period > question mark > exclamation > newline > space > hard cut
 */
function findSentenceBoundary(text: string, maxLength: number): number {
  // Try sentence-ending punctuation first
  const sentenceEnders = ['. ', '? ', '! ', '.\n', '?\n', '!\n'];
  
  for (const ender of sentenceEnders) {
    const index = text.lastIndexOf(ender, maxLength);
    // Accept if boundary is in the latter half of the chunk
    if (index > maxLength * 0.5) {
      return index + ender.length;
    }
  }

  // Try newline
  const newlineIndex = text.lastIndexOf('\n', maxLength);
  if (newlineIndex > maxLength * 0.5) {
    return newlineIndex + 1;
  }

  // Fall back to word boundary
  const spaceIndex = text.lastIndexOf(' ', maxLength);
  if (spaceIndex > maxLength * 0.3) {
    return spaceIndex + 1;
  }

  // Hard cut as last resort
  return maxLength;
}

// =============================================================================
// Notion Client Wrapper
// =============================================================================

export class ZoomClipsNotionClient {
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
    this.defaultDatabaseId = options.defaultDatabaseId;
    this.propertyMapping = {
      ...DEFAULT_PROPERTY_MAPPING,
      ...options.propertyMapping
    };
    this.selectDefaults = options.selectDefaults || {};
  }

  /**
   * Build Notion properties object from ClipData
   */
  private buildProperties(
    clip: ClipData,
    mapping: NotionPropertyMapping,
    selectDefaults?: NotionSelectDefaults
  ): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const defaults = selectDefaults || this.selectDefaults;

    // Title (required)
    properties[mapping.title] = {
      title: [{ text: { content: clip.title } }]
    };

    // URL
    if (mapping.url && clip.url) {
      properties[mapping.url] = { url: clip.url };
    }

    // Description (rich text)
    if (mapping.description && clip.description) {
      properties[mapping.description] = {
        rich_text: [{ text: { content: this.truncateText(clip.description, MAX_RICH_TEXT_LENGTH) } }]
      };
    }

    // NOTE: Transcript is NOT added as a property anymore.
    // It's appended to the page body as a collapsible Toggle block
    // via appendTranscriptToPage() after page creation.

    // Duration
    if (mapping.duration && clip.duration) {
      properties[mapping.duration] = {
        rich_text: [{ text: { content: clip.duration } }]
      };
    }

    // Speaker
    if (mapping.speaker && clip.speaker) {
      properties[mapping.speaker] = {
        rich_text: [{ text: { content: clip.speaker } }]
      };
    }

    // Thumbnail URL
    if (mapping.thumbnailUrl && clip.thumbnailUrl) {
      properties[mapping.thumbnailUrl] = { url: clip.thumbnailUrl };
    }

    // Video URL
    if (mapping.videoUrl && clip.videoUrl) {
      properties[mapping.videoUrl] = { url: clip.videoUrl };
    }

    // Scraped At (date)
    if (mapping.scrapedAt && clip.scrapedAt) {
      properties[mapping.scrapedAt] = {
        date: { start: clip.scrapedAt }
      };
    }

    // Date property (clip created date, different from scrapedAt)
    if (mapping.date && clip.createdAt) {
      // Try to parse the createdAt string into ISO format
      const dateValue = this.parseDate(clip.createdAt);
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

    return properties;
  }

  /**
   * Parse various date formats into ISO date string
   */
  private parseDate(dateStr: string): string | null {
    // If already ISO format, return as-is
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.split('T')[0]; // Return just the date part
    }

    // Try to parse relative dates like "4 hours ago"
    const relativeMatch = dateStr.match(/(\d+)\s+(hour|minute|day|week|month)s?\s+ago/i);
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1], 10);
      const unit = relativeMatch[2].toLowerCase();
      const now = new Date();
      
      switch (unit) {
        case 'minute':
          now.setMinutes(now.getMinutes() - amount);
          break;
        case 'hour':
          now.setHours(now.getHours() - amount);
          break;
        case 'day':
          now.setDate(now.getDate() - amount);
          break;
        case 'week':
          now.setDate(now.getDate() - amount * 7);
          break;
        case 'month':
          now.setMonth(now.getMonth() - amount);
          break;
      }
      
      return now.toISOString().split('T')[0];
    }

    // Try native Date parsing as fallback
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      // Ignore parsing errors
    }

    return null;
  }

  /**
   * Truncate text to max length, preserving word boundaries
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > maxLength * 0.8 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...';
  }

  /**
   * Sync a single clip to Notion database.
   * 
   * Creates a page with properties, then appends:
   * 1. Video embed and metadata callout
   * 2. Transcript as a collapsible Toggle block
   */
  async syncClip(
    clip: ClipData,
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
      // 1. Create the page with properties (no transcript in properties)
      const response = await this.client.pages.create({
        parent: { database_id: dbId },
        properties: this.buildProperties(clip, mapping) as Parameters<typeof this.client.pages.create>[0]['properties']
      });

      const pageId = response.id;
      const pageUrl = (response as { url?: string }).url;

      // 2. Append metadata blocks (video embed, speaker info, etc.)
      await this.appendMetadataToPage(pageId, clip);
      await this.sleep(350); // Rate limit

      // 3. Append transcript as collapsible Toggle block
      if (clip.transcript) {
        const transcriptResult = await this.appendTranscriptToPage(
          pageId,
          clip.transcript,
          '📝 Transcript'
        );

        if (!transcriptResult.success) {
          // Page created but transcript append failed - still return success with warning
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
   * Sync multiple clips to Notion database (with rate limiting)
   * 
   * @param clips - Array of clips to sync
   * @param options - Sync options
   * @param options.databaseId - Optional database ID override
   * @param options.customMapping - Optional property mapping override
   * @param options.skipDuplicates - If true, check for existing clips first (default: true)
   */
  async syncClips(
    clips: ClipData[],
    options: {
      databaseId?: string;
      customMapping?: Partial<NotionPropertyMapping>;
      skipDuplicates?: boolean;
    } = {}
  ): Promise<BatchSyncResult & { skipped: number }> {
    const { databaseId, customMapping, skipDuplicates = true } = options;
    const results: NotionSyncResult[] = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    // Batch check for duplicates (single API call)
    let existingUrls = new Set<string>();
    if (skipDuplicates && clips.length > 0) {
      const urls = clips.map(c => c.url);
      existingUrls = await this.batchCheckExists(urls, databaseId);
      
      if (existingUrls.size > 0) {
        console.log(`📋 Found ${existingUrls.size} existing clip(s), will skip`);
      }
    }

    // Process sequentially with rate limiting to avoid Notion API limits
    for (const clip of clips) {
      // Skip if already exists
      if (existingUrls.has(clip.url)) {
        skipped++;
        results.push({
          success: true,
          error: 'Skipped: clip already exists'
        });
        continue;
      }

      const result = await this.syncClip(clip, databaseId, customMapping);
      results.push(result);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      // Rate limit: Notion allows ~3 requests/second
      await this.sleep(350);
    }

    return {
      total: clips.length,
      successful,
      failed,
      skipped,
      results
    };
  }

  /**
   * Check if a clip already exists in the database (by URL)
   */
  async clipExists(url: string, databaseId?: string): Promise<boolean> {
    const dbId = databaseId || this.defaultDatabaseId;
    
    if (!dbId) return false;

    try {
      const response = await this.client.databases.query({
        database_id: dbId,
        filter: {
          property: this.propertyMapping.url || 'URL',
          url: { equals: url }
        },
        page_size: 1
      });

      return response.results.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Batch check which URLs already exist in the database.
   * Optimized for checking multiple clips at once (3-5 clips/day use case).
   * 
   * Uses a single API call with OR filter instead of N separate calls.
   * 
   * @param urls - Array of clip URLs to check
   * @param databaseId - Optional database ID override
   * @returns Set of URLs that already exist
   */
  async batchCheckExists(urls: string[], databaseId?: string): Promise<Set<string>> {
    const dbId = databaseId || this.defaultDatabaseId;
    const existingUrls = new Set<string>();
    
    if (!dbId || urls.length === 0) return existingUrls;

    const urlProperty = this.propertyMapping.url || 'URL';

    try {
      // Build OR filter for all URLs
      // Notion API supports up to 100 filter conditions
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

      const response = await this.client.databases.query({
        database_id: dbId,
        filter: filter as Parameters<typeof this.client.databases.query>[0]['filter'],
        page_size: 100  // Max allowed, covers typical batch sizes
      });

      // Extract URLs from results
      for (const page of response.results) {
        const props = (page as { properties: Record<string, unknown> }).properties;
        const urlProp = props[urlProperty] as { url?: string } | undefined;
        if (urlProp?.url) {
          existingUrls.add(urlProp.url);
        }
      }

      return existingUrls;
    } catch {
      // Fallback: return empty set (will attempt to sync all)
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
      const response = await this.client.databases.retrieve({
        database_id: dbId
      });

      const properties: Record<string, { type: string; name: string }> = {};
      
      for (const [name, prop] of Object.entries((response as { properties: Record<string, { type: string }> }).properties)) {
        properties[name] = {
          type: prop.type,
          name
        };
      }

      return {
        id: response.id,
        title: ((response as { title?: Array<{ plain_text: string }> }).title?.[0]?.plain_text) || 'Untitled',
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
   * 
   * The transcript is chunked into paragraphs (max 1900 chars each) and placed
   * inside a Toggle block for clean presentation. Handles very long transcripts
   * by batching append requests (max 100 blocks per request).
   * 
   * @param pageId - The Notion page ID to append to
   * @param transcript - The full transcript text
   * @param title - Toggle block title (default: "📝 Transcript")
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
      const chunks = chunkTranscript(transcript, CHUNK_SIZE);

      // 2. Build paragraph blocks for each chunk
      const paragraphBlocks = chunks.map(chunk => ({
        type: 'paragraph' as const,
        paragraph: {
          rich_text: [{ type: 'text' as const, text: { content: chunk } }]
        }
      }));

      // 3. Create toggle block with first batch of children
      // Notion allows 2 levels of nesting in one request, and max 100 blocks
      // We use 99 to leave room for the toggle itself
      const firstBatchSize = Math.min(paragraphBlocks.length, MAX_BLOCKS_PER_REQUEST - 1);
      const firstBatch = paragraphBlocks.slice(0, firstBatchSize);

      const toggleBlock = {
        type: 'toggle' as const,
        toggle: {
          rich_text: [{ type: 'text' as const, text: { content: title } }],
          children: firstBatch
        }
      };

      // 4. Append toggle to page
      const response = await this.client.blocks.children.append({
        block_id: pageId,
        children: [toggleBlock]
      });

      // 5. If more chunks remain, append them in batches to the toggle
      if (paragraphBlocks.length > firstBatchSize) {
        const toggleId = response.results[0].id;
        
        for (let i = firstBatchSize; i < paragraphBlocks.length; i += MAX_BLOCKS_PER_REQUEST) {
          const batch = paragraphBlocks.slice(i, i + MAX_BLOCKS_PER_REQUEST);
          
          await this.client.blocks.children.append({
            block_id: toggleId,
            children: batch
          });

          // Rate limit between requests
          await this.sleep(350);
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
   * Append additional metadata blocks to page body.
   * Adds video embed, speaker info, and duration in a clean format.
   */
  async appendMetadataToPage(
    pageId: string,
    clip: ClipData
  ): Promise<{ success: boolean; error?: string }> {
    const blocks: Array<{
      type: 'callout' | 'video' | 'divider';
      callout?: { rich_text: Array<{ type: 'text'; text: { content: string } }>; icon?: { emoji: string } };
      video?: { type: 'external'; external: { url: string } };
      divider?: Record<string, never>;
    }> = [];

    // Add video embed if available
    if (clip.videoUrl) {
      blocks.push({
        type: 'video',
        video: {
          type: 'external',
          external: { url: clip.videoUrl }
        }
      });
    }

    // Add metadata callout
    const metaParts: string[] = [];
    if (clip.speaker) metaParts.push(`👤 Speaker: ${clip.speaker}`);
    if (clip.duration) metaParts.push(`⏱️ Duration: ${clip.duration}`);
    if (clip.createdAt) metaParts.push(`📅 Created: ${clip.createdAt}`);

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
      await this.client.blocks.children.append({
        block_id: pageId,
        children: blocks as Parameters<typeof this.client.blocks.children.append>[0]['children']
      });

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

let clientInstance: ZoomClipsNotionClient | null = null;

export function getNotionClient(options?: {
  apiKey?: string;
  defaultDatabaseId?: string;
  propertyMapping?: Partial<NotionPropertyMapping>;
}): ZoomClipsNotionClient {
  if (!clientInstance) {
    clientInstance = new ZoomClipsNotionClient(options);
  }
  return clientInstance;
}

export function resetNotionClient(): void {
  clientInstance = null;
}
