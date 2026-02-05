/**
 * Shared configuration for Zoom Clips sync
 *
 * Centralizes Notion property mappings and defaults
 * to avoid duplication across CLI scripts.
 */

import type { NotionPropertyMapping, NotionSelectDefaults } from './types.js';

// =============================================================================
// Notion Configuration
// =============================================================================

/**
 * Default Notion database ID for sync operations.
 * Can be overridden via environment variable or CLI args.
 */
export const DEFAULT_DATABASE_ID = process.env.NOTION_DATABASE_ID || '27a019187ac580b797fec563c98afbbc';  // Internal LLM [HD]

/**
 * Property mapping for Notion database.
 * Maps ClipData fields to Notion property names.
 *
 * Properties set to `undefined` are excluded from sync.
 */
export const NOTION_PROPERTY_MAPPING: NotionPropertyMapping = {
  title: 'Item',
  url: 'Source URL',
  speaker: 'Attendees',
  date: 'Date',
  status: 'Status',
  source: 'Source',
  type: 'Type',
  // Disable properties that don't exist in database
  description: undefined,
  duration: undefined,
  thumbnailUrl: undefined,
  videoUrl: undefined,
  scrapedAt: undefined,
  transcript: undefined,  // Transcript goes in page body, not as property
};

/**
 * Default values for select properties.
 * Applied when creating new Notion pages.
 */
export const NOTION_SELECT_DEFAULTS: NotionSelectDefaults = {
  status: 'Active',
  source: 'Zoom',
  type: 'Clip'
};
