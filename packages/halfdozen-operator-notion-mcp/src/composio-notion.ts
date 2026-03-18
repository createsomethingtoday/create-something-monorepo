import { ComposioClient, type ComposioToolDef } from '@create-something/composio-bridge';

export type PinnedNotionAction =
  | 'search'
  | 'list_databases'
  | 'get_database'
  | 'query_database'
  | 'get_page'
  | 'list_block_children'
  | 'create_page'
  | 'update_page'
  | 'append_blocks'
  | 'archive_page'
  | 'bulk_update'
  | 'bulk_archive';

const ACTION_MATCHERS: Record<PinnedNotionAction, string[][]> = {
  search: [['search']],
  list_databases: [['list', 'database'], ['list', 'data', 'source']],
  get_database: [['retrieve', 'database'], ['get', 'database'], ['retrieve', 'data', 'source']],
  query_database: [['query', 'database'], ['query', 'data', 'source']],
  get_page: [['retrieve', 'page'], ['get', 'page']],
  list_block_children: [['block', 'children'], ['list', 'block']],
  create_page: [['create', 'page']],
  update_page: [['update', 'page']],
  append_blocks: [['append', 'block'], ['append', 'children']],
  archive_page: [['archive', 'page']],
  bulk_update: [['update', 'page']],
  bulk_archive: [['archive', 'page']],
};

const ACTION_SLUG_PREFERENCES: Record<PinnedNotionAction, string[]> = {
  search: ['NOTION_SEARCH_NOTION_PAGE', 'NOTION_SEARCH'],
  list_databases: ['NOTION_SEARCH_NOTION_PAGE', 'NOTION_LIST_DATABASES', 'NOTION_FETCH_DATA'],
  get_database: ['NOTION_FETCH_DATABASE', 'NOTION_GET_DATABASE', 'NOTION_RETRIEVE_DATABASE'],
  query_database: ['NOTION_QUERY_DATABASE', 'NOTION_QUERY_DATABASE_WITH_FILTER', 'NOTION_QUERY_DATA_SOURCE'],
  get_page: ['NOTION_RETRIEVE_PAGE', 'NOTION_GET_PAGE'],
  list_block_children: ['NOTION_FETCH_BLOCK_CONTENTS', 'NOTION_LIST_BLOCK_CHILDREN'],
  create_page: ['NOTION_CREATE_NOTION_PAGE', 'NOTION_CREATE_PAGE'],
  update_page: ['NOTION_UPDATE_PAGE'],
  append_blocks: ['NOTION_APPEND_BLOCK_CHILDREN', 'NOTION_APPEND_BLOCKS'],
  archive_page: ['NOTION_ARCHIVE_NOTION_PAGE', 'NOTION_ARCHIVE_PAGE'],
  bulk_update: ['NOTION_UPDATE_PAGE'],
  bulk_archive: ['NOTION_ARCHIVE_NOTION_PAGE', 'NOTION_ARCHIVE_PAGE'],
};

export interface ResolvedNotionRoute {
  action: PinnedNotionAction;
  slug: string;
  name: string;
  parameters: ComposioToolDef['parameters'];
}

export interface ComposioNotionClientLike {
  getTools(
    toolkits: string[],
    options?: { important?: boolean; limit?: number },
  ): Promise<ComposioToolDef[]>;
  executeTool(
    toolSlug: string,
    params: Record<string, unknown>,
    userId?: string,
  ): Promise<Record<string, unknown>>;
}

export const SUPPORTED_SYNC_FIELD_TYPES = [
  'title',
  'rich_text',
  'number',
  'select',
  'multi_select',
  'date',
  'checkbox',
  'url',
  'email',
  'phone_number',
  'status',
] as const;

export type SupportedSyncFieldType = (typeof SUPPORTED_SYNC_FIELD_TYPES)[number];

export interface NotionDataSourceSummary {
  id: string;
  title: string;
  url?: string;
}

export interface NotionPropertySchema {
  id: string;
  name: string;
  type: string;
  supported: boolean;
}

export interface NotionDataSourceSchema {
  dataSourceId: string;
  title: string;
  properties: Record<string, NotionPropertySchema>;
}

export interface NotionPageSnapshot {
  id: string;
  archived: boolean;
  lastEditedTime: string | null;
  properties: Record<string, unknown>;
  raw: Record<string, unknown>;
}

export type ComparableDateValue = {
  start: string | null;
  end: string | null;
  time_zone: string | null;
};

export type ComparablePropertyValue = string | number | boolean | string[] | ComparableDateValue | null;

export class ComposioNotionDispatcher {
  private readonly client: ComposioNotionClientLike;
  private routesPromise: Promise<Map<PinnedNotionAction, ResolvedNotionRoute>> | null = null;

  constructor(apiKey: string, client?: ComposioNotionClientLike) {
    this.client = client ?? new ComposioClient({ apiKey });
  }

  async execute(action: PinnedNotionAction, args: Record<string, unknown>, userId: string): Promise<Record<string, unknown>> {
    const routes = await this.getRoutes();
    const route = routes.get(action);
    if (!route) {
      throw new Error(`No Composio Notion route found for action "${action}".`);
    }

    if (action === 'bulk_update') {
      return this.executeBulkUpdate(args, userId, route);
    }
    if (action === 'bulk_archive') {
      return this.executeBulkArchive(args, userId, route);
    }

    const forwardedArgs = adaptArgsForRoute(action, route, args);
    return this.client.executeTool(route.slug, forwardedArgs, userId);
  }

  async getRoutes(): Promise<Map<PinnedNotionAction, ResolvedNotionRoute>> {
    if (!this.routesPromise) {
      this.routesPromise = this.buildRoutes();
    }
    return this.routesPromise;
  }

  async listDataSources(
    userId: string,
    options?: { page_size?: number; start_cursor?: string },
  ): Promise<{ data_sources: NotionDataSourceSummary[]; has_more: boolean; next_cursor: string | null }> {
    const payload = await this.execute('list_databases', options ?? {}, userId);
    return normalizeListDataSourcesPayload(payload);
  }

  async getDataSourceSchema(userId: string, dataSourceId: string): Promise<NotionDataSourceSchema> {
    const payload = await this.execute('get_database', { data_source_id: dataSourceId }, userId);
    return normalizeDataSourceSchemaPayload(payload, dataSourceId);
  }

  async queryDataSourcePages(
    userId: string,
    dataSourceId: string,
    options?: { filter?: unknown; sorts?: unknown; page_size?: number; start_cursor?: string },
  ): Promise<{ results: NotionPageSnapshot[]; has_more: boolean; next_cursor: string | null }> {
    const payload = await this.execute(
      'query_database',
      {
        data_source_id: dataSourceId,
        filter: options?.filter,
        sorts: options?.sorts,
        page_size: options?.page_size,
        start_cursor: options?.start_cursor,
      },
      userId,
    );
    const normalized = unwrapPayload(payload);
    const results = asObjectArray(normalized.results).map(normalizePageSnapshot);
    return {
      results,
      has_more: typeof normalized.has_more === 'boolean' ? normalized.has_more : false,
      next_cursor: typeof normalized.next_cursor === 'string' ? normalized.next_cursor : null,
    };
  }

  async getPage(userId: string, pageId: string): Promise<NotionPageSnapshot> {
    const payload = await this.execute('get_page', { page_id: pageId }, userId);
    return normalizePageSnapshot(payload);
  }

  async createPage(
    userId: string,
    dataSourceId: string,
    properties: Record<string, unknown>,
  ): Promise<{ id: string; archived: boolean; page?: NotionPageSnapshot }> {
    const payload = await this.execute('create_page', { data_source_id: dataSourceId, properties }, userId);
    const normalized = unwrapPayload(payload);
    const page = isNotionPageObject(normalized) ? normalizePageSnapshot(normalized) : undefined;
    const id = page?.id ?? readString(normalized, ['id', 'page_id']);
    if (!id) throw new Error('Notion create_page response did not include a page id.');
    return { id, archived: page?.archived ?? false, ...(page ? { page } : {}) };
  }

  async updatePage(
    userId: string,
    pageId: string,
    properties: Record<string, unknown>,
  ): Promise<{ id: string; archived: boolean; page?: NotionPageSnapshot }> {
    const payload = await this.execute('update_page', { page_id: pageId, properties }, userId);
    const normalized = unwrapPayload(payload);
    const page = isNotionPageObject(normalized) ? normalizePageSnapshot(normalized) : undefined;
    const id = page?.id ?? readString(normalized, ['id', 'page_id']) ?? pageId;
    return { id, archived: page?.archived ?? false, ...(page ? { page } : {}) };
  }

  async archivePage(userId: string, pageId: string): Promise<{ id: string; archived: true; page?: NotionPageSnapshot }> {
    const payload = await this.execute('archive_page', { page_id: pageId }, userId);
    const normalized = unwrapPayload(payload);
    const page = isNotionPageObject(normalized) ? normalizePageSnapshot(normalized) : undefined;
    const id = page?.id ?? readString(normalized, ['id', 'page_id']) ?? pageId;
    return { id, archived: true, ...(page ? { page } : {}) };
  }

  private async buildRoutes(): Promise<Map<PinnedNotionAction, ResolvedNotionRoute>> {
    const tools = await this.client.getTools(['notion'], { important: false, limit: 200 });
    const routes = new Map<PinnedNotionAction, ResolvedNotionRoute>();

    for (const action of Object.keys(ACTION_MATCHERS) as PinnedNotionAction[]) {
      const route = resolveRouteForAction(action, tools);
      if (route) {
        routes.set(action, route);
      }
    }

    return routes;
  }

  private async executeBulkUpdate(
    args: Record<string, unknown>,
    userId: string,
    route: ResolvedNotionRoute,
  ): Promise<Record<string, unknown>> {
    const pageIds = Array.isArray(args.page_ids) ? args.page_ids.filter((value): value is string => typeof value === 'string') : [];
    const properties = isPlainObject(args.properties) ? args.properties : {};
    const results: Array<{ id: string; success: boolean; error?: string }> = [];
    for (const pageId of pageIds) {
      try {
        await this.client.executeTool(route.slug, adaptArgsForRoute('update_page', route, { page_id: pageId, properties }), userId);
        results.push({ id: pageId, success: true });
      } catch (error) {
        results.push({ id: pageId, success: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return { results };
  }

  private async executeBulkArchive(
    args: Record<string, unknown>,
    userId: string,
    route: ResolvedNotionRoute,
  ): Promise<Record<string, unknown>> {
    const pageIds = Array.isArray(args.page_ids) ? args.page_ids.filter((value): value is string => typeof value === 'string') : [];
    const results: Array<{ id: string; success: boolean; error?: string }> = [];
    for (const pageId of pageIds) {
      try {
        await this.client.executeTool(route.slug, adaptArgsForRoute('archive_page', route, { page_id: pageId }), userId);
        results.push({ id: pageId, success: true });
      } catch (error) {
        results.push({ id: pageId, success: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return { results };
  }
}

export function resolveRouteForAction(action: PinnedNotionAction, tools: ComposioToolDef[]): ResolvedNotionRoute | null {
  const phrases = ACTION_MATCHERS[action];
  const preferredSlugs = ACTION_SLUG_PREFERENCES[action];
  let best: { tool: ComposioToolDef; score: number } | null = null;

  for (const tool of tools) {
    const haystack = `${tool.slug} ${tool.name} ${tool.description}`.toLowerCase();
    let score = 0;
    for (const phrase of phrases) {
      if (phrase.every((term) => haystack.includes(term))) {
        score = Math.max(score, phrase.length);
      }
    }

    if (action === 'append_blocks' && !hasParameter(tool.parameters, 'children')) continue;
    if ((action === 'update_page' || action === 'bulk_update') && !hasAnyParameter(tool.parameters, ['page_id', 'id'])) continue;
    if ((action === 'create_page') && !hasAnyParameter(tool.parameters, ['data_source_id', 'database_id', 'parent'])) continue;
    if (
      action === 'list_databases' &&
      hasAnyRequiredParameter(tool.parameters, ['parent_id', 'title', 'database_id', 'data_source_id'])
    ) {
      continue;
    }

    const preferenceIndex = preferredSlugs.indexOf(tool.slug);
    if (preferenceIndex >= 0) {
      score += (preferredSlugs.length - preferenceIndex) * 100;
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { tool, score };
    }
  }

  if (!best) return null;
  return {
    action,
    slug: best.tool.slug,
    name: best.tool.name,
    parameters: best.tool.parameters,
  };
}

function hasParameter(parameters: ComposioToolDef['parameters'], key: string): boolean {
  return Object.prototype.hasOwnProperty.call(parameters.properties ?? {}, key);
}

function hasAnyParameter(parameters: ComposioToolDef['parameters'], keys: string[]): boolean {
  return keys.some((key) => hasParameter(parameters, key));
}

function hasAnyRequiredParameter(parameters: ComposioToolDef['parameters'], keys: string[]): boolean {
  if (!Array.isArray(parameters.required)) return false;
  return parameters.required.some((key) => keys.includes(key));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is Record<string, unknown> => isPlainObject(entry));
}

function normalizeRichTextText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value
    .map((entry) => {
      if (!isPlainObject(entry)) return '';
      if (typeof entry.plain_text === 'string') return entry.plain_text;
      const text = entry.text;
      if (isPlainObject(text) && typeof text.content === 'string') return text.content;
      return '';
    })
    .join('');
}

function normalizeTitle(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return normalizeRichTextText(value);
  if (!isPlainObject(value)) return '';
  if (typeof value.name === 'string') return value.name;
  if (Array.isArray(value.title)) return normalizeRichTextText(value.title);
  if (Array.isArray(value.rich_text)) return normalizeRichTextText(value.rich_text);
  return '';
}

function readString(object: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = object[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

function unwrapPayload(value: Record<string, unknown>): Record<string, unknown> {
  let current: Record<string, unknown> = value;
  for (let i = 0; i < 4; i += 1) {
    const nested =
      (isPlainObject(current.data) && current.data) ||
      (isPlainObject(current.result) && current.result) ||
      (isPlainObject(current.response) && current.response) ||
      (isPlainObject(current.output) && current.output) ||
      null;
    if (!nested) break;
    current = nested;
  }
  if (isPlainObject(current.page)) return current.page;
  if (isPlainObject(current.item)) return current.item;
  return current;
}

function inferPropertyType(definition: Record<string, unknown>): string {
  if (typeof definition.type === 'string') return definition.type;
  for (const type of SUPPORTED_SYNC_FIELD_TYPES) {
    if (type in definition) return type;
  }
  const fallback = [
    'formula',
    'rollup',
    'relation',
    'files',
    'created_time',
    'created_by',
    'last_edited_time',
    'last_edited_by',
    'people',
    'unique_id',
    'button',
  ];
  for (const type of fallback) {
    if (type in definition) return type;
  }
  return 'unknown';
}

export function isSupportedSyncFieldType(type: string): type is SupportedSyncFieldType {
  return (SUPPORTED_SYNC_FIELD_TYPES as readonly string[]).includes(type);
}

export function normalizeListDataSourcesPayload(payload: Record<string, unknown>): {
  data_sources: NotionDataSourceSummary[];
  has_more: boolean;
  next_cursor: string | null;
} {
  const normalized = unwrapPayload(payload);
  const explicitDataSources = asObjectArray(normalized.data_sources);
  const fromExplicitList = explicitDataSources.length > 0;
  const candidateResults = fromExplicitList ? explicitDataSources : asObjectArray(normalized.results);

  const dataSources: NotionDataSourceSummary[] = candidateResults
    .filter((entry) => {
      if (fromExplicitList) return Boolean(readString(entry, ['id', 'data_source_id', 'database_id']));
      const objectType = entry.object;
      return objectType === 'data_source' || objectType === 'database';
    })
    .map((entry) => {
      const id = readString(entry, ['id', 'data_source_id', 'database_id']) ?? '';
      const title = normalizeTitle(entry.title);
      const url = typeof entry.url === 'string' ? entry.url : undefined;
      return { id, title, ...(url ? { url } : {}) };
    })
    .filter((entry) => entry.id.length > 0);

  return {
    data_sources: dataSources,
    has_more: typeof normalized.has_more === 'boolean' ? normalized.has_more : false,
    next_cursor: typeof normalized.next_cursor === 'string' ? normalized.next_cursor : null,
  };
}

export function normalizeDataSourceSchemaPayload(payload: Record<string, unknown>, requestedId?: string): NotionDataSourceSchema {
  const normalized = unwrapPayload(payload);
  const schemaRecord: Record<string, NotionPropertySchema> = {};
  const properties = isPlainObject(normalized.properties) ? normalized.properties : null;
  const schemaList = asObjectArray(normalized.schema);

  if (properties) {
    for (const [name, definition] of Object.entries(properties)) {
      if (!isPlainObject(definition)) continue;
      const type = inferPropertyType(definition);
      const id = readString(definition, ['id']) ?? name;
      schemaRecord[name] = { name, id, type, supported: isSupportedSyncFieldType(type) };
    }
  } else {
    for (const entry of schemaList) {
      const name = readString(entry, ['name']) ?? '';
      const type = readString(entry, ['type']) ?? 'unknown';
      const id = readString(entry, ['id']) ?? name;
      if (!name) continue;
      schemaRecord[name] = { name, id, type, supported: isSupportedSyncFieldType(type) };
    }
  }

  const dataSourceId = readString(normalized, ['data_source_id', 'database_id', 'id']) ?? requestedId ?? '';
  const title = normalizeTitle(normalized.title);
  return {
    dataSourceId,
    title,
    properties: schemaRecord,
  };
}

function isNotionPageObject(
  value: Record<string, unknown>,
): value is Record<string, unknown> & { id: string; properties: Record<string, unknown> } {
  return typeof value.id === 'string' && isPlainObject(value.properties);
}

export function normalizePageSnapshot(payload: Record<string, unknown>): NotionPageSnapshot {
  const normalized = unwrapPayload(payload);
  if (!isNotionPageObject(normalized)) {
    throw new Error('Notion page payload is missing required fields (id/properties).');
  }
  const archived = normalized.archived === true || normalized.in_trash === true;
  return {
    id: normalized.id,
    archived,
    lastEditedTime: readString(normalized, ['last_edited_time']),
    properties: isPlainObject(normalized.properties) ? normalized.properties : {},
    raw: normalized,
  };
}

const NOTION_RICH_TEXT_LIMIT = 2_000;

function chunkRichText(value: string): Array<{ type: 'text'; text: { content: string } }> {
  if (!value) return [];
  const chunks: Array<{ type: 'text'; text: { content: string } }> = [];
  for (let cursor = 0; cursor < value.length; cursor += NOTION_RICH_TEXT_LIMIT) {
    chunks.push({
      type: 'text',
      text: { content: value.slice(cursor, cursor + NOTION_RICH_TEXT_LIMIT) },
    });
  }
  return chunks;
}

function normalizeComparableDate(value: unknown): ComparableDateValue | null {
  if (typeof value === 'string') return { start: value, end: null, time_zone: null };
  if (!isPlainObject(value)) return null;
  const start = typeof value.start === 'string' ? value.start : null;
  if (!start) return null;
  return {
    start,
    end: typeof value.end === 'string' ? value.end : null,
    time_zone: typeof value.time_zone === 'string' ? value.time_zone : null,
  };
}

export function buildComparablePropertyValue(type: SupportedSyncFieldType, propertyValue: unknown): ComparablePropertyValue {
  const typedValue = isPlainObject(propertyValue) && type in propertyValue
    ? propertyValue[type as keyof typeof propertyValue]
    : propertyValue;

  switch (type) {
    case 'title':
    case 'rich_text': {
      const text = normalizeRichTextText(typedValue);
      return text.length > 0 ? text : null;
    }
    case 'number':
      return typeof typedValue === 'number' ? typedValue : null;
    case 'select':
    case 'status': {
      if (isPlainObject(typedValue) && typeof typedValue.name === 'string') return typedValue.name;
      return null;
    }
    case 'multi_select': {
      if (!Array.isArray(typedValue)) return [];
      const values = typedValue
        .map((entry) => (isPlainObject(entry) && typeof entry.name === 'string' ? entry.name : null))
        .filter((entry): entry is string => Boolean(entry))
        .sort((a, b) => a.localeCompare(b));
      return [...new Set(values)];
    }
    case 'date':
      return normalizeComparableDate(typedValue);
    case 'checkbox':
      return typeof typedValue === 'boolean' ? typedValue : false;
    case 'url':
    case 'email':
    case 'phone_number':
      return typeof typedValue === 'string' && typedValue.length > 0 ? typedValue : null;
    default:
      return null;
  }
}

export function buildWritablePropertyValue(type: SupportedSyncFieldType, comparableValue: ComparablePropertyValue): Record<string, unknown> {
  switch (type) {
    case 'title': {
      const text = typeof comparableValue === 'string' ? comparableValue : '';
      return { title: chunkRichText(text) };
    }
    case 'rich_text': {
      const text = typeof comparableValue === 'string' ? comparableValue : '';
      return { rich_text: chunkRichText(text) };
    }
    case 'number':
      return { number: typeof comparableValue === 'number' ? comparableValue : null };
    case 'select':
      return { select: typeof comparableValue === 'string' && comparableValue ? { name: comparableValue } : null };
    case 'status':
      return { status: typeof comparableValue === 'string' && comparableValue ? { name: comparableValue } : null };
    case 'multi_select': {
      const values = Array.isArray(comparableValue)
        ? comparableValue.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : [];
      return { multi_select: [...new Set(values.sort((a, b) => a.localeCompare(b)))].map((name) => ({ name })) };
    }
    case 'date': {
      const normalized = normalizeComparableDate(comparableValue);
      if (!normalized) return { date: null };
      return {
        date: {
          start: normalized.start,
          ...(normalized.end ? { end: normalized.end } : {}),
          ...(normalized.time_zone ? { time_zone: normalized.time_zone } : {}),
        },
      };
    }
    case 'checkbox':
      return { checkbox: comparableValue === true };
    case 'url':
      return { url: typeof comparableValue === 'string' ? comparableValue : null };
    case 'email':
      return { email: typeof comparableValue === 'string' ? comparableValue : null };
    case 'phone_number':
      return { phone_number: typeof comparableValue === 'string' ? comparableValue : null };
    default:
      return {};
  }
}

export function buildWritablePropertiesPayload(
  entries: Array<{ field: string; type: SupportedSyncFieldType; value: ComparablePropertyValue }>,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const entry of entries) {
    if (!entry.field) continue;
    output[entry.field] = buildWritablePropertyValue(entry.type, entry.value);
  }
  return output;
}

export function adaptArgsForRoute(
  action: PinnedNotionAction,
  route: ResolvedNotionRoute,
  rawArgs: Record<string, unknown>,
): Record<string, unknown> {
  const args = { ...rawArgs };
  delete args.workspace;
  delete args.entity_id;
  delete args.account_id;
  delete args.__dm_entity_id;

  const properties = route.parameters.properties ?? {};

  if ('database_id' in properties && 'data_source_id' in args && !('database_id' in args)) {
    args.database_id = args.data_source_id;
  }
  if ('data_source_id' in properties && 'database_id' in args && !('data_source_id' in args)) {
    args.data_source_id = args.database_id;
  }
  if ('block_id' in properties && 'page_id' in args && !('block_id' in args)) {
    args.block_id = args.page_id;
  }
  if ('page_id' in properties && 'block_id' in args && !('page_id' in args) && action === 'list_block_children') {
    args.page_id = args.block_id;
  }
  if ('query' in properties && typeof args.query !== 'string' && typeof args.search === 'string') {
    args.query = args.search;
  }
  if (action === 'list_databases') {
    if ('filter_property' in properties && typeof args.filter_property !== 'string') {
      args.filter_property = 'object';
    }
    if ('filter_value' in properties && typeof args.filter_value !== 'string') {
      args.filter_value = 'database';
    }
    if ('fetch_type' in properties && typeof args.fetch_type !== 'string') {
      args.fetch_type = 'database';
    }
  }
  if ('properties' in properties && isPlainObject(args.properties)) {
    args.properties = args.properties;
  }

  return args;
}
