/**
 * Zod Schemas for MCP Tool Input Validation
 *
 * Validates tool arguments at the dispatch boundary before unsafe type casts.
 * Provides clear validation errors instead of cryptic failures deep in handlers.
 */

import { z } from 'zod';

// =============================================================================
// Session Management Schemas
// =============================================================================

export const CreateSessionInputSchema = z.object({
  url: z.string().url().optional(),
  timeout: z.number().positive().optional()
});

export const SessionStatusInputSchema = z.object({
  sessionId: z.string().min(1)
});

export const CloseSessionInputSchema = z.object({
  sessionId: z.string().min(1)
});

export const NavigateInputSchema = z.object({
  sessionId: z.string().min(1),
  url: z.string().url()
});

// =============================================================================
// Extraction Schemas
// =============================================================================

export const ScrapeClipInputSchema = z.object({
  sessionId: z.string().min(1)
});

// =============================================================================
// Notion Sync Schemas
// =============================================================================

const ClipDataSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  transcript: z.string().optional(),
  duration: z.string().optional(),
  durationSeconds: z.number().optional(),
  speaker: z.string().optional(),
  createdAt: z.string().optional(),
  scrapedAt: z.string(),
  extractionMethod: z.enum(['steel', 'api']),
  sessionId: z.string().optional()
});

const NotionPropertyMappingSchema = z.object({
  title: z.string().min(1),
  url: z.string().optional(),
  description: z.string().optional(),
  transcript: z.string().optional(),
  duration: z.string().optional(),
  speaker: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  scrapedAt: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  type: z.string().optional(),
  date: z.string().optional()
}).partial();

export const SyncToNotionInputSchema = z.object({
  clips: z.array(ClipDataSchema).min(1),
  databaseId: z.string().min(1),
  propertyMapping: NotionPropertyMappingSchema.optional()
});

export const ScrapeAndSyncInputSchema = z.object({
  urls: z.array(z.string().url()).min(1),
  databaseId: z.string().min(1),
  propertyMapping: NotionPropertyMappingSchema.optional()
});

// =============================================================================
// Utility Schemas
// =============================================================================

export const DiagnoseUIInputSchema = z.object({
  sessionId: z.string().min(1)
});

export const GetDatabaseSchemaInputSchema = z.object({
  databaseId: z.string().min(1)
});

// =============================================================================
// Type Exports (for type inference)
// =============================================================================

export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>;
export type SessionStatusInput = z.infer<typeof SessionStatusInputSchema>;
export type CloseSessionInput = z.infer<typeof CloseSessionInputSchema>;
export type NavigateInput = z.infer<typeof NavigateInputSchema>;
export type ScrapeClipInput = z.infer<typeof ScrapeClipInputSchema>;
export type SyncToNotionInput = z.infer<typeof SyncToNotionInputSchema>;
export type ScrapeAndSyncInput = z.infer<typeof ScrapeAndSyncInputSchema>;
export type DiagnoseUIInput = z.infer<typeof DiagnoseUIInputSchema>;
export type GetDatabaseSchemaInput = z.infer<typeof GetDatabaseSchemaInputSchema>;
