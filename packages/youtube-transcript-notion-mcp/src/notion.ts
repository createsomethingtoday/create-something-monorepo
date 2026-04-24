import { APIResponseError, Client } from '@notionhq/client';

import { NOTION_BLOCK_BATCH_LIMIT } from './config.js';
import { buildCanonicalVideoUrl, extractVideoId } from './youtube.js';
import { chunkTranscript, segmentsToTimestampedTranscript } from './transcript.js';
import type {
  FetchDocumentResult,
  NotionDatabaseProperty,
  NotionDatabaseSchema,
  NotionPropertyMapping,
  NotionService,
  NotionSyncResult,
  ResolvedNotionPropertyMapping,
  SearchResultItem,
  SyncTranscriptToNotionOptions,
  TranscriptRecord,
} from './types.js';

type NotionPageLike = {
  id: string;
  url?: string;
  properties: Record<string, any>;
};

type NotionBlockLike = {
  id: string;
  type: string;
  has_children?: boolean;
  [key: string]: any;
};

type DataSourceQueryFilter = NonNullable<
  Parameters<Client['dataSources']['query']>[0]['filter']
>;

const workerFetch: typeof fetch = (input, init) => globalThis.fetch(input, init);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;

const PROPERTY_NAME_CANDIDATES: Record<keyof NotionPropertyMapping, string[]> = {
  title: ['Title', 'Name', 'Item'],
  url: ['YouTube URL', 'Source URL', 'URL', 'Video URL'],
  videoId: ['Video ID', 'YouTube Video ID', 'YouTube ID'],
  channelName: ['Channel', 'Channel Name'],
  publishedAt: ['Published At', 'Published'],
  dateAddedToPlaylist: ['Date Added To Playlist', 'Date Added', 'Date'],
  thumbnailUrl: ['Thumbnail URL', 'Thumbnail'],
  language: ['Language'],
  type: ['Type'],
  source: ['Source'],
  pageStatus: ['Status'],
  notes: ['Notes'],
  playlistId: ['Playlist ID', 'YouTube Playlist ID'],
  playlistTitle: ['Playlist Title', 'Playlist'],
  extractionMethod: ['Extraction Method', 'Transcript Source'],
  transcriptStatus: ['Transcript Status'],
  syncedAt: ['Synced At', 'Last Synced', 'Updated At'],
};

export class NotionSyncServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'NotionSyncServiceError';
  }
}

function isRetryable(error: unknown): boolean {
  if (error instanceof APIResponseError) {
    return error.status === 429 || error.status >= 500 || error.status === 409;
  }

  return error instanceof TypeError;
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === MAX_RETRIES) {
        throw error;
      }

      const jitter = 0.75 + Math.random() * 0.5;
      const delay = BASE_DELAY_MS * 2 ** attempt * jitter;
      console.warn(
        `[youtube-transcript-notion-mcp] ${label} failed on attempt ${
          attempt + 1
        }, retrying in ${Math.round(delay)}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

function normalizePropertyName(value: string): string {
  return value.trim().toLowerCase();
}

function schemaFromProperties(properties: Record<string, any>): Record<string, NotionDatabaseProperty> {
  return Object.fromEntries(
    Object.entries(properties).map(([name, property]) => [
      name,
      {
        id: property?.id,
        name,
        type: property?.type ?? 'unknown',
      },
    ]),
  );
}

function extractPlainText(value: any): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  switch (value.type) {
    case 'title':
      return Array.isArray(value.title)
        ? value.title.map((part: any) => part.plain_text ?? part.text?.content ?? '').join('')
        : undefined;
    case 'rich_text':
      return Array.isArray(value.rich_text)
        ? value.rich_text
            .map((part: any) => part.plain_text ?? part.text?.content ?? '')
            .join('')
        : undefined;
    case 'url':
      return value.url ?? undefined;
    case 'select':
      return value.select?.name ?? undefined;
    case 'status':
      return value.status?.name ?? undefined;
    case 'date':
      return value.date?.start ?? undefined;
    default:
      return undefined;
  }
}

function safeText(value: string, maxLength = 1900): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function canonicalUrlFromVideoId(value: string | undefined): string | undefined {
  const videoId = value ? extractVideoId(value) : null;
  return videoId ? buildCanonicalVideoUrl(videoId) : undefined;
}

function coerceDate(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString().slice(0, 10);
}

function buildPropertyPayload(
  property: NotionDatabaseProperty | undefined,
  value: unknown,
): Record<string, unknown> | null {
  if (!property || value === undefined || value === null) {
    return null;
  }

  switch (property.type) {
    case 'title':
      return {
        title: [{ text: { content: safeText(String(value)) } }],
      };
    case 'rich_text':
      return {
        rich_text: [{ text: { content: safeText(String(value)) } }],
      };
    case 'url':
      return {
        url: String(value),
      };
    case 'date': {
      const date = coerceDate(String(value));
      return date ? { date: { start: date } } : null;
    }
    case 'select':
      return {
        select: { name: String(value) },
      };
    case 'status':
      return {
        status: { name: String(value) },
      };
    case 'multi_select': {
      const values = Array.isArray(value) ? value : [value];
      return {
        multi_select: values
          .map((entry) => String(entry).trim())
          .filter(Boolean)
          .map((entry) => ({ name: entry })),
      };
    }
    case 'checkbox':
      return {
        checkbox: Boolean(value),
      };
    default:
      return null;
  }
}

function firstPropertyByCandidates(
  schema: Record<string, NotionDatabaseProperty>,
  candidates: string[],
): string | undefined {
  const normalizedCandidates = new Set(candidates.map(normalizePropertyName));
  return Object.keys(schema).find((name) =>
    normalizedCandidates.has(normalizePropertyName(name)),
  );
}

function firstPropertyByType(
  schema: Record<string, NotionDatabaseProperty>,
  type: string,
): string | undefined {
  return Object.keys(schema).find((name) => schema[name]?.type === type);
}

export function resolvePropertyMapping(
  schema: Record<string, NotionDatabaseProperty>,
  defaults: Partial<NotionPropertyMapping> = {},
  overrides: Partial<NotionPropertyMapping> = {},
): {
  mapping: ResolvedNotionPropertyMapping;
  warnings: string[];
} {
  const configured = { ...defaults, ...overrides };
  const warnings: string[] = [];

  const explicitTitle =
    configured.title && schema[configured.title] ? configured.title : undefined;
  if (configured.title && !schema[configured.title]) {
    warnings.push(`Configured title property "${configured.title}" was not found in the target schema.`);
  }

  const title =
    explicitTitle ??
    firstPropertyByType(schema, 'title') ??
    firstPropertyByCandidates(schema, PROPERTY_NAME_CANDIDATES.title);

  if (!title) {
    throw new NotionSyncServiceError(
      'NOTION_TITLE_PROPERTY_MISSING',
      'The target Notion schema has no usable title property.',
    );
  }

  const mapping: ResolvedNotionPropertyMapping = { title };

  for (const key of Object.keys(PROPERTY_NAME_CANDIDATES) as Array<
    keyof NotionPropertyMapping
  >) {
    if (key === 'title') {
      continue;
    }

    const explicit = configured[key];
    if (explicit) {
      if (schema[explicit]) {
        mapping[key] = explicit;
      } else {
        warnings.push(`Configured property "${explicit}" for "${key}" was not found in the target schema.`);
      }
      continue;
    }

    const inferred = firstPropertyByCandidates(schema, PROPERTY_NAME_CANDIDATES[key]);
    if (inferred) {
      mapping[key] = inferred;
    }
  }

  return { mapping, warnings };
}

export function findExistingPageMatch(
  pages: NotionPageLike[],
  mapping: ResolvedNotionPropertyMapping,
  record: Pick<TranscriptRecord, 'url' | 'videoId'>,
): { page: NotionPageLike; matchedOn: 'url' | 'videoId' } | null {
  if (mapping.url) {
    const matchedByUrl = pages.find(
      (page) => extractPlainText(page.properties[mapping.url!]) === record.url,
    );
    if (matchedByUrl) {
      return { page: matchedByUrl, matchedOn: 'url' };
    }
  }

  if (mapping.videoId) {
    const matchedByVideoId = pages.find(
      (page) => extractPlainText(page.properties[mapping.videoId!]) === record.videoId,
    );
    if (matchedByVideoId) {
      return { page: matchedByVideoId, matchedOn: 'videoId' };
    }
  }

  return null;
}

function buildTextFilter(
  propertyName: string,
  property: NotionDatabaseProperty | undefined,
  mode: 'equals' | 'contains',
  value: string,
): DataSourceQueryFilter | null {
  if (!property || !value.trim()) {
    return null;
  }

  switch (property.type) {
    case 'title':
      return mode === 'equals'
        ? { property: propertyName, title: { equals: value } }
        : { property: propertyName, title: { contains: value } };
    case 'rich_text':
      return mode === 'equals'
        ? { property: propertyName, rich_text: { equals: value } }
        : { property: propertyName, rich_text: { contains: value } };
    case 'url':
      return mode === 'equals'
        ? { property: propertyName, url: { equals: value } }
        : { property: propertyName, url: { contains: value } };
    default:
      return null;
  }
}

function buildPageProperties(
  schema: Record<string, NotionDatabaseProperty>,
  mapping: ResolvedNotionPropertyMapping,
  record: TranscriptRecord,
): { properties: Record<string, unknown>; warnings: string[] } {
  const warnings: string[] = [];
  const properties: Record<string, unknown> = {};

  const values: Record<keyof ResolvedNotionPropertyMapping, unknown> = {
    title: record.title,
    url: record.url,
    videoId: record.videoId,
    channelName: record.channelName,
    publishedAt: record.publishedAt,
    dateAddedToPlaylist: record.dateAddedToPlaylist,
    thumbnailUrl: record.thumbnailUrl,
    language: record.language,
    type: 'Video',
    source: 'External',
    pageStatus: 'Active',
    notes: record.channelName,
    playlistId: record.playlistId,
    playlistTitle: record.playlistTitle,
    extractionMethod: record.extractionMethod,
    transcriptStatus: record.transcript ? 'Available' : 'Unavailable',
    syncedAt: new Date().toISOString(),
  };

  for (const [key, propertyName] of Object.entries(mapping) as Array<
    [keyof ResolvedNotionPropertyMapping, string]
  >) {
    const value = values[key];
    if (!propertyName || value === undefined || value === null || value === '') {
      continue;
    }

    const payload = buildPropertyPayload(schema[propertyName], value);
    if (!payload) {
      warnings.push(
        `Skipped mapped property "${propertyName}" because schema type "${schema[propertyName]?.type}" is not supported for "${key}".`,
      );
      continue;
    }

    properties[propertyName] = payload;
  }

  return { properties, warnings };
}

function extractRichTextContent(block: NotionBlockLike): string {
  const value = block?.[block.type];
  const richText = value?.rich_text;
  if (Array.isArray(richText)) {
    return richText
      .map((part: any) => part.plain_text ?? part.text?.content ?? '')
      .join('')
      .trim();
  }

  if (block.type === 'bookmark') {
    return value?.url ?? '';
  }

  return '';
}

function normalizeBlockLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function extractMeaningfulBlockLines(blocks: NotionBlockLike[]): string[] {
  const lines = blocks
    .map((block) => normalizeBlockLine(extractRichTextContent(block)))
    .filter(Boolean);

  const filtered =
    lines.length > 1
      ? lines.filter((line) => normalizePropertyName(line) !== 'transcript')
      : lines;

  const deduped: string[] = [];
  for (const line of filtered) {
    if (deduped[deduped.length - 1] !== line) {
      deduped.push(line);
    }
  }

  return deduped;
}

function buildSearchPreview(lines: string[], query: string, maxLength = 240): string | undefined {
  if (lines.length === 0) {
    return undefined;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const matchedLine =
    lines.find((line) => line.toLowerCase().includes(normalizedQuery)) ?? lines[0];

  if (!normalizedQuery || matchedLine.length <= maxLength) {
    return matchedLine;
  }

  const matchIndex = matchedLine.toLowerCase().indexOf(normalizedQuery);
  if (matchIndex < 0) {
    return `${matchedLine.slice(0, maxLength - 1).trimEnd()}…`;
  }

  const preferredStart = Math.max(0, matchIndex - Math.floor(maxLength / 3));
  const start = Math.min(preferredStart, Math.max(0, matchedLine.length - maxLength));
  const end = Math.min(matchedLine.length, start + maxLength);

  return `${start > 0 ? '…' : ''}${matchedLine.slice(start, end).trim()}${
    end < matchedLine.length ? '…' : ''
  }`;
}

export function pageHasTranscriptSection(blocks: NotionBlockLike[]): boolean {
  return blocks.some((block) => {
    if (!['toggle', 'heading_1', 'heading_2', 'heading_3', 'callout'].includes(block.type)) {
      return false;
    }
    return normalizePropertyName(extractRichTextContent(block)).includes('transcript');
  });
}

function findTranscriptSectionBlock(blocks: NotionBlockLike[]): NotionBlockLike | undefined {
  return blocks.find((block) => {
    if (!['toggle', 'heading_1', 'heading_2', 'heading_3', 'callout'].includes(block.type)) {
      return false;
    }
    return normalizePropertyName(extractRichTextContent(block)).includes('transcript');
  });
}

async function listTopLevelBlocks(client: Client, blockId: string): Promise<NotionBlockLike[]> {
  const blocks: NotionBlockLike[] = [];
  let nextCursor: string | undefined;

  while (true) {
    const response = await withRetry(`blocks.children.list(${blockId})`, () =>
      client.blocks.children.list({
        block_id: blockId,
        ...(nextCursor ? { start_cursor: nextCursor } : {}),
      }),
    );

    blocks.push(...(response.results as NotionBlockLike[]));

    if (!response.has_more || !response.next_cursor) {
      break;
    }

    nextCursor = response.next_cursor;
  }

  return blocks;
}

async function listAllBlocks(client: Client, blockId: string): Promise<NotionBlockLike[]> {
  const topLevel = await listTopLevelBlocks(client, blockId);
  const nested = await Promise.all(
    topLevel
      .filter((block) => block.has_children)
      .map(async (block) => [block, ...(await listAllBlocks(client, block.id))]),
  );

  return [...topLevel, ...nested.flat()];
}

function buildRichTextBlock(
  type: 'paragraph' | 'heading_2',
  content: string,
): Record<string, unknown> {
  return {
    type,
    [type]: {
      rich_text: [{ type: 'text', text: { content: content.trim() } }],
    },
  };
}

function buildTranscriptBlocks(options: {
  text: string;
  headerLines?: string[];
}): {
  toggleBlock: Record<string, unknown>;
  remainderBlocks: Array<Record<string, unknown>>;
} {
  const headerBlocks = (options.headerLines ?? [])
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => buildRichTextBlock('paragraph', line));
  const transcriptHeading =
    headerBlocks.length > 0 ? [buildRichTextBlock('heading_2', 'Transcript')] : [];
  const paragraphBlocks = chunkTranscript(options.text).map((chunk) =>
    buildRichTextBlock('paragraph', chunk),
  );
  const childBlocks = [...headerBlocks, ...transcriptHeading, ...paragraphBlocks];

  const initialChildren = childBlocks.slice(0, NOTION_BLOCK_BATCH_LIMIT - 1);
  const remainderBlocks = childBlocks.slice(NOTION_BLOCK_BATCH_LIMIT - 1);

  return {
    toggleBlock: {
      type: 'toggle',
      toggle: {
        rich_text: [{ type: 'text', text: { content: 'Transcript' } }],
        children: initialChildren,
      },
    },
    remainderBlocks,
  };
}

async function deleteBlock(client: Client, blockId: string): Promise<void> {
  await withRetry(`blocks.delete(${blockId})`, () =>
    client.blocks.delete({
      block_id: blockId,
    }),
  );
}

function buildDocumentText(
  title: string,
  sourceUrl: string,
  metadata: Record<string, unknown>,
  blockText: string,
): string {
  const lines = [title];
  if (sourceUrl) {
    lines.push(sourceUrl);
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null || key === 'notionUrl') {
      continue;
    }
    lines.push(`${key}: ${String(value)}`);
  }

  if (blockText.trim()) {
    lines.push(blockText.trim());
  }

  return lines.join('\n\n');
}

export class NotionTranscriptSyncService implements NotionService {
  private readonly client: Client | null;

  constructor(
    private readonly options: {
      apiKey?: string;
      defaultDatabaseId?: string;
      defaultPropertyMapping?: Partial<NotionPropertyMapping>;
      client?: Client;
    },
  ) {
    this.client =
      options.client ??
      (options.apiKey ? new Client({ auth: options.apiKey, fetch: workerFetch }) : null);
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  getStatus(): Record<string, unknown> {
    return {
      configured: this.isConfigured(),
      defaultDatabaseId: this.options.defaultDatabaseId ?? null,
      defaultPropertyMappingKeys: Object.keys(this.options.defaultPropertyMapping ?? {}),
    };
  }

  private getClient(): Client {
    if (!this.client) {
      throw new NotionSyncServiceError(
        'NOTION_NOT_CONFIGURED',
        'Notion is not configured. Set NOTION_API_KEY to enable schema, sync, search, and fetch tools.',
      );
    }

    return this.client;
  }

  private async resolveSchema(databaseId?: string): Promise<NotionDatabaseSchema> {
    const client = this.getClient();
    const inputId = databaseId ?? this.options.defaultDatabaseId;
    if (!inputId) {
      throw new NotionSyncServiceError(
        'NOTION_DATABASE_REQUIRED',
        'No Notion database/data source ID was provided and no NOTION_DATABASE_ID default is configured.',
      );
    }

    try {
      const dataSource = await withRetry(`dataSources.retrieve(${inputId})`, () =>
        client.dataSources.retrieve({ data_source_id: inputId }),
      );
      return {
        databaseId: inputId,
        dataSourceId: dataSource.id,
        title: 'title' in dataSource ? dataSource.title : undefined,
        properties: schemaFromProperties(dataSource.properties),
      };
    } catch {
      const database = await withRetry(`databases.retrieve(${inputId})`, () =>
        client.databases.retrieve({ database_id: inputId }),
      );
      const dataSourceId =
        'data_sources' in database
          ? (database as { data_sources?: Array<{ id: string }> }).data_sources?.[0]?.id
          : undefined;

      if (!dataSourceId) {
        throw new NotionSyncServiceError(
          'NOTION_DATA_SOURCE_UNRESOLVED',
          'Could not resolve a data source ID from the provided Notion database.',
          { databaseId: inputId },
        );
      }

      const dataSource = await withRetry(`dataSources.retrieve(${dataSourceId})`, () =>
        client.dataSources.retrieve({ data_source_id: dataSourceId }),
      );

      return {
        databaseId: database.id,
        dataSourceId: dataSource.id,
        title: 'title' in database ? database.title : undefined,
        properties: schemaFromProperties(dataSource.properties),
      };
    }
  }

  async getDatabaseSchema(databaseId?: string): Promise<NotionDatabaseSchema> {
    return this.resolveSchema(databaseId);
  }

  private async findExistingPage(
    schema: NotionDatabaseSchema,
    mapping: ResolvedNotionPropertyMapping,
    record: TranscriptRecord,
  ): Promise<{ page: NotionPageLike; matchedOn: 'url' | 'videoId' } | null> {
    const client = this.getClient();
    const filters = [
      mapping.url
        ? buildTextFilter(mapping.url, schema.properties[mapping.url], 'equals', record.url)
        : null,
      mapping.videoId
        ? buildTextFilter(
            mapping.videoId,
            schema.properties[mapping.videoId],
            'equals',
            record.videoId,
          )
        : null,
    ].filter(Boolean) as DataSourceQueryFilter[];

    if (filters.length === 0) {
      throw new NotionSyncServiceError(
        'NOTION_DEDUP_MAPPING_REQUIRED',
        'Dedup requires at least one mapped URL or video ID property. Use get_database_schema to inspect the target and provide propertyMapping if needed.',
      );
    }

    const response = await withRetry(`dataSources.query(${schema.dataSourceId})`, () =>
      client.dataSources.query({
        data_source_id: schema.dataSourceId,
        page_size: 10,
        filter:
          filters.length === 1 ? filters[0] : ({ or: filters } as DataSourceQueryFilter),
      }),
    );

    return findExistingPageMatch(
      response.results as unknown as NotionPageLike[],
      mapping,
      record,
    );
  }

  async syncTranscript(
    record: TranscriptRecord,
    options: SyncTranscriptToNotionOptions,
  ): Promise<NotionSyncResult> {
    const client = this.getClient();
    const schema = await this.resolveSchema(options.databaseId);
    const resolved = resolvePropertyMapping(
      schema.properties,
      this.options.defaultPropertyMapping,
      options.propertyMapping,
    );
    const propertiesResult = buildPageProperties(schema.properties, resolved.mapping, record);
    const existing = await this.findExistingPage(schema, resolved.mapping, record);

    const page = existing
      ? await withRetry(`pages.update(${existing.page.id})`, () =>
          client.pages.update({
            page_id: existing.page.id,
            properties: propertiesResult.properties as Parameters<
              Client['pages']['update']
            >[0]['properties'],
          }),
        )
      : await withRetry(`pages.create(${schema.dataSourceId})`, () =>
          client.pages.create({
            parent: { data_source_id: schema.dataSourceId },
            properties: propertiesResult.properties as Parameters<
              Client['pages']['create']
            >[0]['properties'],
          }),
        );

    const pageId = page.id;
    const pageUrl = 'url' in page && typeof page.url === 'string' ? page.url : undefined;
    const warnings = [...resolved.warnings, ...propertiesResult.warnings];
    let transcriptAction: NotionSyncResult['transcriptAction'] = 'none';

    const transcriptText =
      options.transcriptBodyText ??
      (options.includeTimestamps
        ? segmentsToTimestampedTranscript(record.segments)
        : record.transcript);

    if (transcriptText.trim()) {
      const topLevelBlocks = await listTopLevelBlocks(client, pageId);
      const existingTranscriptBlock = findTranscriptSectionBlock(topLevelBlocks);
      if (existingTranscriptBlock && !options.replaceExistingTranscript) {
        transcriptAction = 'skipped_existing';
      } else {
        if (existingTranscriptBlock) {
          await deleteBlock(client, existingTranscriptBlock.id);
        }

        const { toggleBlock, remainderBlocks } = buildTranscriptBlocks({
          text: transcriptText,
          headerLines: options.transcriptHeaderLines,
        });
        const appendResult = await withRetry(`blocks.children.append(${pageId})`, () =>
          client.blocks.children.append({
            block_id: pageId,
            children: [toggleBlock] as Parameters<
              Client['blocks']['children']['append']
            >[0]['children'],
          }),
        );

        const toggleId = (appendResult.results[0] as { id: string }).id;
        for (let index = 0; index < remainderBlocks.length; index += NOTION_BLOCK_BATCH_LIMIT) {
          await withRetry(`blocks.children.append(${toggleId})`, () =>
            client.blocks.children.append({
              block_id: toggleId,
              children: remainderBlocks.slice(
                index,
                index + NOTION_BLOCK_BATCH_LIMIT,
              ) as Parameters<Client['blocks']['children']['append']>[0]['children'],
            }),
          );
        }
        transcriptAction = existingTranscriptBlock ? 'appended' : 'appended';
      }
    }

    return {
      databaseId: schema.databaseId,
      dataSourceId: schema.dataSourceId,
      pageId,
      pageUrl,
      action: existing ? 'updated' : 'created',
      transcriptAction,
      matchedOn: existing?.matchedOn,
      warnings,
      propertyMapping: resolved.mapping,
    };
  }

  async searchDocuments(query: string): Promise<SearchResultItem[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const client = this.getClient();
    const schema = await this.resolveSchema();
    const resolved = resolvePropertyMapping(schema.properties, this.options.defaultPropertyMapping);
    const possibleVideoId = extractVideoId(trimmed);
    const filters = [
      buildTextFilter(resolved.mapping.title, schema.properties[resolved.mapping.title], 'contains', trimmed),
      resolved.mapping.url
        ? buildTextFilter(
            resolved.mapping.url,
            schema.properties[resolved.mapping.url],
            'contains',
            possibleVideoId ? buildCanonicalVideoUrl(possibleVideoId) : trimmed,
          )
        : null,
      resolved.mapping.videoId
        ? buildTextFilter(
            resolved.mapping.videoId,
            schema.properties[resolved.mapping.videoId],
            'contains',
            possibleVideoId ?? trimmed,
          )
        : null,
    ].filter(Boolean) as DataSourceQueryFilter[];

    const response = await withRetry(`dataSources.query(${schema.dataSourceId})`, () =>
      client.dataSources.query({
        data_source_id: schema.dataSourceId,
        page_size: 10,
        filter:
          filters.length === 1 ? filters[0] : ({ or: filters } as DataSourceQueryFilter),
      }),
    );

    return Promise.all(
      (response.results as unknown as NotionPageLike[]).map(async (page) => {
        const title =
          extractPlainText(page.properties[resolved.mapping.title]) ?? 'Untitled transcript';
        const videoId = resolved.mapping.videoId
          ? extractPlainText(page.properties[resolved.mapping.videoId])
          : undefined;
        const channelName = resolved.mapping.channelName
          ? extractPlainText(page.properties[resolved.mapping.channelName])
          : undefined;
        const extractionMethod = resolved.mapping.extractionMethod
          ? extractPlainText(page.properties[resolved.mapping.extractionMethod])
          : undefined;
        const sourceUrl =
          (resolved.mapping.url
            ? extractPlainText(page.properties[resolved.mapping.url])
            : undefined) ??
          canonicalUrlFromVideoId(videoId) ??
          page.url ??
          '';
        const metadata = Object.fromEntries(
          Object.entries({
            videoId,
            channelName,
            extractionMethod,
          }).filter(([, value]) => value !== undefined && value !== null && value !== ''),
        );

        let text: string | undefined;
        try {
          const blockLines = extractMeaningfulBlockLines(await listAllBlocks(client, page.id));
          const metadataFallback =
            [channelName, extractionMethod].filter(Boolean).join(' • ') || undefined;
          text =
            buildSearchPreview(blockLines, trimmed) ?? metadataFallback;
        } catch {
          text = [channelName, extractionMethod].filter(Boolean).join(' • ') || undefined;
        }

        return {
          id: page.id,
          title,
          text,
          url: sourceUrl,
          ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
        };
      }),
    );
  }

  async fetchDocument(id: string): Promise<FetchDocumentResult> {
    const client = this.getClient();
    const page = (await withRetry(`pages.retrieve(${id})`, () =>
      client.pages.retrieve({ page_id: id }),
    )) as unknown as NotionPageLike;
    const schema = schemaFromProperties(page.properties);
    const resolved = resolvePropertyMapping(schema, this.options.defaultPropertyMapping);
    const allBlocks = await listAllBlocks(client, id);

    const title =
      extractPlainText(page.properties[resolved.mapping.title]) ?? 'Untitled transcript';
    const sourceUrl =
      (resolved.mapping.url
        ? extractPlainText(page.properties[resolved.mapping.url])
        : undefined) ??
      (resolved.mapping.videoId
        ? canonicalUrlFromVideoId(extractPlainText(page.properties[resolved.mapping.videoId]))
        : undefined) ??
      page.url ??
      '';
    const metadata: Record<string, unknown> = {
      videoId: resolved.mapping.videoId
        ? extractPlainText(page.properties[resolved.mapping.videoId])
        : undefined,
      channelName: resolved.mapping.channelName
        ? extractPlainText(page.properties[resolved.mapping.channelName])
        : undefined,
      publishedAt: resolved.mapping.publishedAt
        ? extractPlainText(page.properties[resolved.mapping.publishedAt])
        : undefined,
      thumbnailUrl: resolved.mapping.thumbnailUrl
        ? extractPlainText(page.properties[resolved.mapping.thumbnailUrl])
        : undefined,
      language: resolved.mapping.language
        ? extractPlainText(page.properties[resolved.mapping.language])
        : undefined,
      extractionMethod: resolved.mapping.extractionMethod
        ? extractPlainText(page.properties[resolved.mapping.extractionMethod])
        : undefined,
      notionUrl: page.url,
    };

    const blockText = extractMeaningfulBlockLines(allBlocks).join('\n').trim();

    return {
      id: page.id,
      title,
      url: sourceUrl,
      text: buildDocumentText(title, sourceUrl, metadata, blockText),
      metadata,
    };
  }
}
