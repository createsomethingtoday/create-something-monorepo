/**
 * DM Drive sync tools and helpers.
 *
 * Drive calls are Composio-backed. Notion writes are direct via NOTION_API_KEY.
 */

import type { Client } from '@notionhq/client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  googleDriveListFilesSchema,
  googleDriveSyncFileToNotionSchema,
  googleDriveSyncRecentToNotionSchema,
} from '../schemas.js';
import type {
  GoogleDriveListFilesInput,
  GoogleDriveSyncFileToNotionInput,
  GoogleDriveSyncRecentToNotionInput,
} from './types.js';
import {
  getIndexedSyncRecord,
  getSyncCheckpoint,
  setSyncCheckpoint,
  upsertIndexedSyncRecord,
  type D1Database,
} from '../lib/drive-sync-state.js';

type JsonRecord = Record<string, unknown>;

export interface ComposioToolDefLike {
  slug: string;
}

export interface DriveComposioClient {
  getTools(toolkits: string[]): Promise<ComposioToolDefLike[]>;
  hasActiveConnection(userId: string, toolkit: string): Promise<boolean>;
  executeTool(
    toolSlug: string,
    params: Record<string, unknown>,
    userId?: string
  ): Promise<Record<string, unknown>>;
}

export interface DriveActionSlugs {
  listFiles: string;
  getMetadata: string;
  parseFile: string;
}

export interface DriveActionSlugOverrides {
  listFiles?: string;
  getMetadata?: string;
  parseFile?: string;
}

export interface DriveSyncDeps {
  composioClient: DriveComposioClient;
  notionClient: Client;
  driveSyncDb: D1Database;
  entityId: string;
  targetDataSourceId: string;
  actionSlugs: DriveActionSlugs;
  defaultRecentLimit: number;
  initialLookbackDays: number;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
  webViewLink: string | null;
}

interface RecentSyncOptions {
  limit?: number;
  sinceIso?: string;
  withContent?: boolean;
  metadataOnly?: boolean;
  lookbackDays?: number;
}

const DRIVE_TOOLKIT = 'GOOGLEDRIVE';
const DEFAULT_LIST_FILES_TOOL_SLUG = 'GOOGLEDRIVE_LIST_FILES';
const DEFAULT_GET_METADATA_TOOL_SLUG = 'GOOGLEDRIVE_GET_FILE_METADATA';
const DEFAULT_PARSE_FILE_TOOL_SLUG = 'GOOGLEDRIVE_PARSE_FILE';

const REQUIRED_NOTION_PROPERTIES: Record<string, string> = {
  Name: 'title',
  'Drive File ID': 'rich_text',
  'Account ID': 'rich_text',
  'Web View Link': 'url',
  'MIME Type': 'rich_text',
  'Modified Time': 'date',
  'Last Synced At': 'date',
  'Sync Status': 'select',
};

const SUPPORTED_TEXT_MIME_TYPES = new Set([
  'application/vnd.google-apps.document',
  'application/json',
  'application/csv',
  'text/csv',
  'text/markdown',
]);

const SCHEMA_CACHE_TTL_MS = 5 * 60_000;
const CONTENT_BLOCK_CHUNK_SIZE = 1800;

const schemaValidationCache = new Map<string, number>();

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function oneOfString(record: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function normalizeSlug(slug: string): string {
  return slug.trim().toUpperCase();
}

function normalizeDriveFile(value: JsonRecord): DriveFile | null {
  const id = oneOfString(value, ['id', 'fileId', 'file_id']);
  if (!id) return null;

  return {
    id,
    name: oneOfString(value, ['name', 'title']) ?? id,
    mimeType: oneOfString(value, ['mimeType', 'mime_type', 'mime']) ?? 'application/octet-stream',
    modifiedTime: oneOfString(value, [
      'modifiedTime',
      'modified_time',
      'modifiedAt',
      'updatedAt',
      'updated_at',
      'lastModified',
    ]),
    webViewLink: oneOfString(value, ['webViewLink', 'web_view_link', 'alternateLink', 'url', 'link']),
  };
}

function extractDriveFilesFromUnknown(raw: unknown): DriveFile[] {
  const out = new Map<string, DriveFile>();
  const queue: unknown[] = [raw];

  while (queue.length > 0) {
    const value = queue.shift();
    if (Array.isArray(value)) {
      queue.push(...value);
      continue;
    }
    if (!isRecord(value)) continue;

    const file = normalizeDriveFile(value);
    if (file && !out.has(file.id)) {
      out.set(file.id, file);
    }

    for (const nested of Object.values(value)) {
      if (nested && typeof nested === 'object') {
        queue.push(nested);
      }
    }
  }

  return Array.from(out.values());
}

function findNextPageToken(raw: unknown): string | null {
  const queue: unknown[] = [raw];
  while (queue.length > 0) {
    const value = queue.shift();
    if (Array.isArray(value)) {
      queue.push(...value);
      continue;
    }
    if (!isRecord(value)) continue;

    const token = oneOfString(value, ['nextPageToken', 'next_page_token', 'pageToken', 'nextToken']);
    if (token) return token;

    for (const nested of Object.values(value)) {
      if (nested && typeof nested === 'object') {
        queue.push(nested);
      }
    }
  }
  return null;
}

async function executeWithArgumentVariants(
  composioClient: DriveComposioClient,
  toolSlug: string,
  entityId: string,
  variants: Array<Record<string, unknown>>
): Promise<{ result: Record<string, unknown>; argsUsed: Record<string, unknown> }> {
  const errors: string[] = [];
  for (const args of variants) {
    try {
      const result = await composioClient.executeTool(toolSlug, args, entityId);
      return { result, argsUsed: args };
    } catch (error) {
      errors.push(`${JSON.stringify(args)} => ${String(error)}`);
    }
  }

  throw new Error(
    `All parameter variants failed for ${toolSlug}. Tried ${variants.length} variant(s). ${errors.join(' | ')}`
  );
}

function computeDriveQuerySince(sinceIso: string): string {
  return `modifiedTime > '${sinceIso}'`;
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 25;
  if (limit < 1) return 1;
  if (limit > 100) return 100;
  return Math.floor(limit);
}

function computeLookbackIso(days: number): string {
  const lookbackMs = Math.max(days, 1) * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - lookbackMs).toISOString();
}

function supportsContentExtraction(mimeType: string): boolean {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized.startsWith('text/')) return true;
  return SUPPORTED_TEXT_MIME_TYPES.has(normalized);
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();
  while (remaining.length > CONTENT_BLOCK_CHUNK_SIZE) {
    let split = remaining.lastIndexOf('\n', CONTENT_BLOCK_CHUNK_SIZE);
    if (split < CONTENT_BLOCK_CHUNK_SIZE * 0.6) {
      split = remaining.lastIndexOf(' ', CONTENT_BLOCK_CHUNK_SIZE);
    }
    if (split < CONTENT_BLOCK_CHUNK_SIZE * 0.6) split = CONTENT_BLOCK_CHUNK_SIZE;
    chunks.push(remaining.slice(0, split).trim());
    remaining = remaining.slice(split).trim();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

function extractTextFromUnknown(raw: unknown): string | null {
  const candidates: Array<{ score: number; text: string }> = [];
  const queue: Array<{ value: unknown; path: string[] }> = [{ value: raw, path: [] }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const { value, path } = current;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) continue;
      const pathLower = path.join('.').toLowerCase();
      let score = 0;
      if (pathLower.includes('content')) score += 4;
      if (pathLower.includes('text')) score += 3;
      if (pathLower.includes('markdown')) score += 3;
      if (pathLower.includes('parsed')) score += 2;
      if (trimmed.length > 100) score += 1;
      candidates.push({ score, text: trimmed });
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => queue.push({ value: item, path: [...path, String(index)] }));
      continue;
    }

    if (!isRecord(value)) continue;
    for (const [key, nested] of Object.entries(value)) {
      if (nested && typeof nested === 'object') {
        queue.push({ value: nested, path: [...path, key] });
      } else if (typeof nested === 'string') {
        queue.push({ value: nested, path: [...path, key] });
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score || b.text.length - a.text.length);
  return candidates[0].text;
}

async function ensureTargetSchema(
  notionClient: Client,
  dataSourceId: string
): Promise<void> {
  const now = Date.now();
  const cachedAt = schemaValidationCache.get(dataSourceId);
  if (cachedAt && now - cachedAt < SCHEMA_CACHE_TTL_MS) {
    return;
  }

  const dataSource = await notionClient.dataSources.retrieve({ data_source_id: dataSourceId });
  const missing: string[] = [];
  const wrongType: string[] = [];

  for (const [propertyName, expectedType] of Object.entries(REQUIRED_NOTION_PROPERTIES)) {
    const property = dataSource.properties[propertyName] as { type?: string } | undefined;
    if (!property) {
      missing.push(propertyName);
      continue;
    }
    if (property.type !== expectedType) {
      wrongType.push(`${propertyName} (expected ${expectedType}, got ${String(property.type)})`);
    }
  }

  if (missing.length > 0 || wrongType.length > 0) {
    const details = [
      missing.length > 0 ? `Missing: ${missing.join(', ')}` : null,
      wrongType.length > 0 ? `Type mismatches: ${wrongType.join('; ')}` : null,
    ]
      .filter(Boolean)
      .join(' | ');
    throw new Error(`Target data source schema does not match canonical Drive sync schema. ${details}`);
  }

  schemaValidationCache.set(dataSourceId, now);
}

async function listDriveFilesRaw(
  composioClient: DriveComposioClient,
  actionSlug: string,
  entityId: string,
  params: { query?: string; pageSize: number; pageToken?: string }
): Promise<{ files: DriveFile[]; nextPageToken: string | null; argsUsed: Record<string, unknown> }> {
  const variants: Array<Record<string, unknown>> = [
    {
      q: params.query,
      pageSize: params.pageSize,
      pageToken: params.pageToken,
      fields: 'nextPageToken, files(id,name,mimeType,modifiedTime,webViewLink)',
    },
    {
      query: params.query,
      page_size: params.pageSize,
      page_token: params.pageToken,
    },
    {
      q: params.query,
      limit: params.pageSize,
      page_token: params.pageToken,
    },
    {
      page_size: params.pageSize,
      page_token: params.pageToken,
    },
  ];

  const { result, argsUsed } = await executeWithArgumentVariants(
    composioClient,
    actionSlug,
    entityId,
    variants
  );
  return {
    files: extractDriveFilesFromUnknown(result),
    nextPageToken: findNextPageToken(result),
    argsUsed,
  };
}

async function getDriveFileMetadata(
  deps: DriveSyncDeps,
  fileId: string
): Promise<DriveFile> {
  const variants: Array<Record<string, unknown>> = [
    { file_id: fileId },
    { fileId },
    { id: fileId },
  ];
  const { result } = await executeWithArgumentVariants(
    deps.composioClient,
    deps.actionSlugs.getMetadata,
    deps.entityId,
    variants
  );
  const files = extractDriveFilesFromUnknown(result);
  const exact = files.find((file) => file.id === fileId);
  const picked = exact ?? files[0];
  if (!picked) {
    throw new Error(`Could not parse Drive file metadata for file_id "${fileId}".`);
  }
  return picked;
}

function buildNotionProperties(file: DriveFile, entityId: string): Record<string, unknown> {
  const nowIso = new Date().toISOString();
  return {
    Name: {
      title: [{ type: 'text', text: { content: file.name || file.id } }],
    },
    'Drive File ID': {
      rich_text: [{ type: 'text', text: { content: file.id } }],
    },
    'Account ID': {
      rich_text: [{ type: 'text', text: { content: entityId } }],
    },
    'Web View Link': {
      url: file.webViewLink ?? null,
    },
    'MIME Type': {
      rich_text: [{ type: 'text', text: { content: file.mimeType } }],
    },
    'Modified Time': {
      date: { start: file.modifiedTime ?? nowIso },
    },
    'Last Synced At': {
      date: { start: nowIso },
    },
    'Sync Status': {
      select: { name: 'Synced' },
    },
  };
}

async function parseDriveFileContent(
  deps: DriveSyncDeps,
  fileId: string
): Promise<string | null> {
  const variants: Array<Record<string, unknown>> = [
    { file_id: fileId },
    { fileId },
    { id: fileId },
  ];

  const { result } = await executeWithArgumentVariants(
    deps.composioClient,
    deps.actionSlugs.parseFile,
    deps.entityId,
    variants
  );

  return extractTextFromUnknown(result);
}

async function appendContentToNotionPage(
  notionClient: Client,
  pageId: string,
  file: DriveFile,
  content: string
): Promise<void> {
  const chunks = chunkText(content);
  if (chunks.length === 0) return;

  const children: Array<Record<string, unknown>> = [
    {
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: `Drive content snapshot (${new Date().toISOString()})` } }],
      },
    },
    {
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: `Source file: ${file.name} (${file.id})`,
              ...(file.webViewLink ? { link: { url: file.webViewLink } } : {}),
            },
          },
        ],
      },
    },
  ];

  for (const chunk of chunks) {
    children.push({
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: chunk } }],
      },
    });
  }

  await notionClient.blocks.children.append({
    block_id: pageId,
    children: children as Parameters<Client['blocks']['children']['append']>[0]['children'],
  });
}

export async function syncDriveFileToNotion(
  deps: DriveSyncDeps,
  input: { fileId: string; withContent: boolean }
): Promise<{
  file: DriveFile;
  notionPageId: string;
  created: boolean;
  warnings: string[];
  contentAppended: boolean;
}> {
  await ensureTargetSchema(deps.notionClient, deps.targetDataSourceId);

  const file = await getDriveFileMetadata(deps, input.fileId);
  const warnings: string[] = [];

  const properties = buildNotionProperties(file, deps.entityId);
  const existing = await getIndexedSyncRecord(deps.driveSyncDb, deps.entityId, file.id);
  let notionPageId = existing?.notion_page_id ?? '';
  let created = false;

  if (existing?.notion_page_id) {
    try {
      await deps.notionClient.pages.update({
        page_id: existing.notion_page_id,
        properties: properties as Parameters<Client['pages']['update']>[0]['properties'],
      });
      notionPageId = existing.notion_page_id;
    } catch (error) {
      warnings.push(
        `Existing page ${existing.notion_page_id} update failed; creating a replacement page. ${String(error)}`
      );
      const page = await deps.notionClient.pages.create({
        parent: { data_source_id: deps.targetDataSourceId },
        properties,
      } as Parameters<Client['pages']['create']>[0]);
      notionPageId = page.id;
      created = true;
    }
  } else {
    const page = await deps.notionClient.pages.create({
      parent: { data_source_id: deps.targetDataSourceId },
      properties,
    } as Parameters<Client['pages']['create']>[0]);
    notionPageId = page.id;
    created = true;
  }

  let contentAppended = false;
  if (input.withContent) {
    if (!supportsContentExtraction(file.mimeType)) {
      warnings.push(
        `Content extraction skipped for MIME type "${file.mimeType}". Metadata synced successfully.`
      );
    } else {
      const text = await parseDriveFileContent(deps, file.id);
      if (!text) {
        warnings.push('Content extraction returned no text. Metadata synced successfully.');
      } else {
        await appendContentToNotionPage(deps.notionClient, notionPageId, file, text);
        contentAppended = true;
      }
    }
  }

  await upsertIndexedSyncRecord(deps.driveSyncDb, {
    entityId: deps.entityId,
    fileId: file.id,
    notionPageId,
    lastSeenModifiedTime: file.modifiedTime,
    lastSyncStatus: warnings.length > 0 ? 'synced_with_warning' : 'synced',
  });

  return {
    file,
    notionPageId,
    created,
    warnings,
    contentAppended,
  };
}

export async function syncRecentDriveFiles(
  deps: DriveSyncDeps,
  options: RecentSyncOptions
): Promise<{
  entityId: string;
  sinceIso: string;
  checkpointUpdated: boolean;
  filesConsidered: number;
  filesSynced: number;
  filesFailed: number;
  failures: Array<{ file_id: string; error: string }>;
  warnings: Array<{ file_id: string; warning: string }>;
}> {
  await ensureTargetSchema(deps.notionClient, deps.targetDataSourceId);

  const limit = clampLimit(options.limit ?? deps.defaultRecentLimit);
  const checkpoint = options.sinceIso
    ? options.sinceIso
    : (await getSyncCheckpoint(deps.driveSyncDb, deps.entityId)) ??
      computeLookbackIso(options.lookbackDays ?? deps.initialLookbackDays);

  const query = computeDriveQuerySince(checkpoint);
  const listed = await listDriveFilesRaw(deps.composioClient, deps.actionSlugs.listFiles, deps.entityId, {
    query,
    pageSize: limit,
  });

  const files = listed.files.slice(0, limit);
  const failures: Array<{ file_id: string; error: string }> = [];
  const warnings: Array<{ file_id: string; warning: string }> = [];
  let filesSynced = 0;

  for (const file of files) {
    try {
      const result = await syncDriveFileToNotion(deps, {
        fileId: file.id,
        withContent: options.metadataOnly ? false : Boolean(options.withContent),
      });
      filesSynced += 1;
      for (const warning of result.warnings) {
        warnings.push({ file_id: file.id, warning });
      }
    } catch (error) {
      failures.push({ file_id: file.id, error: String(error) });
    }
  }

  const shouldUpdateCheckpoint = !options.sinceIso;
  let checkpointUpdated = false;
  if (shouldUpdateCheckpoint && failures.length === 0) {
    await setSyncCheckpoint(deps.driveSyncDb, deps.entityId, new Date().toISOString());
    checkpointUpdated = true;
  }

  return {
    entityId: deps.entityId,
    sinceIso: checkpoint,
    checkpointUpdated,
    filesConsidered: files.length,
    filesSynced,
    filesFailed: failures.length,
    failures,
    warnings,
  };
}

export function registerDriveSyncTools(server: McpServer, deps: DriveSyncDeps): void {
  server.tool(
    'google_drive_list_files',
    'List/search files in DM shared Google Drive account.',
    googleDriveListFilesSchema.shape,
    async (params) => {
      const parsed = params as GoogleDriveListFilesInput;
      const result = await listDriveFilesRaw(
        deps.composioClient,
        deps.actionSlugs.listFiles,
        deps.entityId,
        {
          query: parsed.query,
          pageSize: clampLimit(parsed.page_size ?? deps.defaultRecentLimit),
          pageToken: parsed.page_token,
        }
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                entity_id: deps.entityId,
                files: result.files,
                count: result.files.length,
                next_page_token: result.nextPageToken,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'google_drive_sync_file_to_notion',
    'Sync one Google Drive file into DM Notion sync data source using upsert by account_id+file_id.',
    googleDriveSyncFileToNotionSchema.shape,
    async (params) => {
      const parsed = params as GoogleDriveSyncFileToNotionInput;
      const result = await syncDriveFileToNotion(deps, {
        fileId: parsed.file_id,
        withContent: Boolean(parsed.with_content),
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                entity_id: deps.entityId,
                file: result.file,
                notion_page_id: result.notionPageId,
                created: result.created,
                content_appended: result.contentAppended,
                warnings: result.warnings,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'google_drive_sync_recent_to_notion',
    'Incrementally sync recently modified Drive files into DM Notion sync data source.',
    googleDriveSyncRecentToNotionSchema.shape,
    async (params) => {
      const parsed = params as GoogleDriveSyncRecentToNotionInput;
      const summary = await syncRecentDriveFiles(deps, {
        limit: parsed.limit,
        sinceIso: parsed.since_iso,
        withContent: parsed.with_content,
        metadataOnly: false,
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }],
      };
    }
  );
}

function findFirstByCandidates(
  availableByNormalized: Map<string, string>,
  candidates: string[]
): string | null {
  for (const candidate of candidates) {
    const found = availableByNormalized.get(normalizeSlug(candidate));
    if (found) return found;
  }
  return null;
}

function findHeuristic(
  available: string[],
  includesAll: string[]
): string | null {
  const lowered = available.map((slug) => ({ slug, value: normalizeSlug(slug) }));
  const match = lowered.find((entry) => includesAll.every((needle) => entry.value.includes(needle)));
  return match?.slug ?? null;
}

export async function resolveDriveActionSlugs(
  composioClient: DriveComposioClient,
  overrides: DriveActionSlugOverrides
): Promise<DriveActionSlugs> {
  const tools = await composioClient.getTools([DRIVE_TOOLKIT]);
  const available = tools.map((tool) => tool.slug).filter((slug) => typeof slug === 'string' && slug.trim().length > 0);
  const availableByNormalized = new Map<string, string>();
  for (const slug of available) {
    availableByNormalized.set(normalizeSlug(slug), slug);
  }

  const resolve = (
    label: 'listFiles' | 'getMetadata' | 'parseFile',
    fallbackExact: string,
    candidates: string[],
    heuristicTokens: string[]
  ): string => {
    const override = overrides[label];
    if (override) {
      const normalized = normalizeSlug(override);
      const found = availableByNormalized.get(normalized);
      if (!found) {
        throw new Error(
          `Configured ${label} slug "${override}" is not available in GOOGLEDRIVE toolkit. Available: ${available.join(', ')}`
        );
      }
      return found;
    }

    const direct = availableByNormalized.get(normalizeSlug(fallbackExact));
    if (direct) return direct;

    const candidate = findFirstByCandidates(availableByNormalized, candidates);
    if (candidate) return candidate;

    const heuristic = findHeuristic(available, heuristicTokens);
    if (heuristic) return heuristic;

    throw new Error(
      `Could not resolve Drive action slug for ${label}. Expected one of: ${[fallbackExact, ...candidates].join(', ')}. Available: ${available.join(', ')}`
    );
  };

  return {
    listFiles: resolve(
      'listFiles',
      DEFAULT_LIST_FILES_TOOL_SLUG,
      ['GOOGLE_DRIVE_LIST_FILES', 'GOOGLEDRIVE_SEARCH_FILES', 'GOOGLEDRIVE_LIST'],
      ['FILE', 'LIST']
    ),
    getMetadata: resolve(
      'getMetadata',
      DEFAULT_GET_METADATA_TOOL_SLUG,
      ['GOOGLE_DRIVE_GET_FILE_METADATA', 'GOOGLEDRIVE_GET_FILE', 'GOOGLEDRIVE_GET_METADATA'],
      ['FILE', 'METADATA']
    ),
    parseFile: resolve(
      'parseFile',
      DEFAULT_PARSE_FILE_TOOL_SLUG,
      ['GOOGLE_DRIVE_PARSE_FILE', 'GOOGLEDRIVE_PARSE_DOCUMENT', 'GOOGLEDRIVE_PARSE'],
      ['PARSE', 'FILE']
    ),
  };
}
