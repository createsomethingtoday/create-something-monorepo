import type { Client } from '@notionhq/client';

export const DEFAULT_BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_ID = 'fda87fb8-b156-820b-9542-8774717a42f6';
export const DEFAULT_BLONDISH_DELIVERY_MIRROR_DATA_SOURCE_ID = '561b555e-b8d7-4516-b374-31a253f88c29';
export const DEFAULT_BLONDISH_SOURCE_DATA_SOURCE_TITLE = 'Support Tickets [OS]';
export const DEFAULT_HALFDOZEN_TARGET_DATA_SOURCE_TITLE = 'Tickets [HD]';
export const DEFAULT_BLONDISH_DELIVERY_MIRROR_DATA_SOURCE_TITLE = 'BLOND:ISH Support Tickets [HD Delivery]';

const OWNER_EMAIL = 'fillip@halfdozen.co';
const OWNER_LABEL = 'FG (fillip@halfdozen.co)';
const CLIENT_LABEL = 'BLOND:ISH / Abracadabra';
const SOURCE_LABEL = 'Portal / Tag';
const DEFAULT_HD_STATUS = 'Not Started';

const HD_TO_OS_STATUS: Record<string, string> = {
  Assigned: 'Under Review',
  'In Progress': 'In Progress',
  'Client Action': 'Action Required',
  Complete: 'Complete',
  Archive: 'Archive',
  Roadblock: 'Roadblock',
};

export interface BlondishTicketSyncEnv {
  NOTION_CREATE_SOMETHING_API_KEY?: string;
  BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_ID?: string;
  BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_TITLE?: string;
  BLONDISH_HD_TICKETS_DATABASE_ID?: string;
  BLONDISH_HD_TICKETS_DATA_SOURCE_ID?: string;
  BLONDISH_HD_TICKETS_DATA_SOURCE_TITLE?: string;
  BLONDISH_DELIVERY_MIRROR_DATA_SOURCE_ID?: string;
  BLONDISH_DELIVERY_MIRROR_DATA_SOURCE_TITLE?: string;
  BLONDISH_DELIVERY_REVERSE_SYNC_DRY_RUN?: string;
  BLONDISH_OS_STATUS_PROPERTY?: string;
}

export interface BlondishTicketSyncClients {
  halfdozen: Client | null;
  client: Client | null;
  createSomething?: Client | null;
}

export interface BlondishTicketSyncResult {
  ok: boolean;
  action: 'preflight' | 'create_from_client' | 'status_to_client' | 'delivery_mirror_status_to_client';
  source_data_source_id?: string;
  target_data_source_id?: string;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ scope: string; message: string; page_id?: string; ext_page_id?: string }>;
  details?: Record<string, unknown>;
}

type NotionPage = {
  id: string;
  url?: string;
  archived?: boolean;
  last_edited_time?: string;
  properties?: Record<string, NotionProperty>;
};

type NotionProperty = Record<string, unknown> & { type?: string };
type SchemaProperty = { id?: string; type?: string; name?: string };
type DataSourceSchema = Record<string, SchemaProperty>;

interface SyncConfig {
  sourceDataSourceId: string;
  targetDataSourceId: string;
  sourceSchema: DataSourceSchema;
  targetSchema: DataSourceSchema;
  sourceStatusProperty: string;
}

interface DeliveryMirrorStatusSyncConfig {
  sourceDataSourceId: string;
  mirrorDataSourceId: string;
  sourceSchema: DataSourceSchema;
  mirrorSchema: DataSourceSchema;
  sourceStatusProperty: string;
}

export async function preflightBlondishTicketSync(
  clients: BlondishTicketSyncClients,
  env: BlondishTicketSyncEnv,
): Promise<BlondishTicketSyncResult> {
  const result = emptyResult('preflight');
  try {
    const config = await resolveSyncConfig(clients, env);
    const sourceMissing = missingProperties(config.sourceSchema, [
      'Ticket',
      'Details',
      'Created By',
      'Page ID',
      'URL',
      'Files & Media',
      config.sourceStatusProperty,
    ]);
    const targetMissing = missingProperties(config.targetSchema, [
      'Ticket',
      'Status',
      'Source',
      'Owner',
      'Client',
      'Ext Page ID',
      'External URL',
      'External Files & Media',
    ]);
    for (const field of sourceMissing) {
      result.errors.push({ scope: 'source_schema', message: `Missing source property: ${field}` });
    }
    for (const field of targetMissing) {
      result.errors.push({ scope: 'target_schema', message: `Missing target property: ${field}` });
    }
    result.ok = result.errors.length === 0;
    result.source_data_source_id = config.sourceDataSourceId;
    result.target_data_source_id = config.targetDataSourceId;
    result.details = {
      source_status_property: config.sourceStatusProperty,
      source_properties: Object.keys(config.sourceSchema).sort(),
      target_properties: Object.keys(config.targetSchema).sort(),
    };
    return result;
  } catch (error) {
    result.errors.push({ scope: 'preflight', message: errorMessage(error) });
    return result;
  }
}

export async function syncBlondishTicketCreateOnly(
  clients: BlondishTicketSyncClients,
  env: BlondishTicketSyncEnv,
  options: { sourcePageId?: string | null } = {},
): Promise<BlondishTicketSyncResult> {
  const result = emptyResult('create_from_client');
  try {
    const config = await resolveSyncConfig(clients, env);
    result.source_data_source_id = config.sourceDataSourceId;
    result.target_data_source_id = config.targetDataSourceId;

    const sourcePages = await resolveSourcePages(clients.client as Client, config.sourceDataSourceId, options.sourcePageId ?? null);
    const targetPages = await queryAllPages(clients.halfdozen as Client, config.targetDataSourceId);
    const targetByExtPageId = new Map<string, NotionPage>();
    for (const page of targetPages) {
      const extPageId = readText(page, 'Ext Page ID');
      if (extPageId) targetByExtPageId.set(extPageId, page);
    }

    const ownerUserId = await findUserIdByEmail(clients.halfdozen as Client, OWNER_EMAIL);

    for (const sourcePage of sourcePages) {
      try {
        const extPageId = readText(sourcePage, 'Page ID');
        if (!extPageId) {
          result.errors.push({ scope: 'source_page', message: 'Source ticket is missing Page ID.', page_id: sourcePage.id });
          continue;
        }
        if (targetByExtPageId.has(extPageId)) {
          result.skipped += 1;
          continue;
        }

        const properties = buildTargetCreateProperties(config.targetSchema, sourcePage, ownerUserId);
        const children = buildTicketBody(sourcePage);
        const created = await (clients.halfdozen as Client).pages.create({
          parent: { data_source_id: config.targetDataSourceId },
          properties: properties as never,
          children: children as never,
        } as never) as NotionPage;

        result.created += 1;
        if (created?.id) targetByExtPageId.set(extPageId, created);
      } catch (error) {
        result.errors.push({
          scope: 'create_target_ticket',
          message: errorMessage(error),
          page_id: sourcePage.id,
          ext_page_id: readText(sourcePage, 'Page ID') || undefined,
        });
      }
    }

    result.ok = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push({ scope: 'create_from_client', message: errorMessage(error) });
    return result;
  }
}

export async function syncBlondishTicketStatusToClient(
  clients: BlondishTicketSyncClients,
  env: BlondishTicketSyncEnv,
): Promise<BlondishTicketSyncResult> {
  const result = emptyResult('status_to_client');
  try {
    const config = await resolveSyncConfig(clients, env);
    result.source_data_source_id = config.sourceDataSourceId;
    result.target_data_source_id = config.targetDataSourceId;

    const [sourcePages, targetPages] = await Promise.all([
      queryAllPages(clients.client as Client, config.sourceDataSourceId),
      queryAllPages(clients.halfdozen as Client, config.targetDataSourceId),
    ]);
    const sourceByExtPageId = new Map<string, NotionPage>();
    for (const page of sourcePages) {
      const pageId = readText(page, 'Page ID');
      if (pageId) sourceByExtPageId.set(pageId, page);
    }

    for (const targetPage of targetPages) {
      try {
        const extPageId = readText(targetPage, 'Ext Page ID');
        if (!extPageId) {
          result.skipped += 1;
          continue;
        }
        const hdStatus = readText(targetPage, 'Status');
        const mappedStatus = HD_TO_OS_STATUS[hdStatus];
        if (!mappedStatus) {
          result.skipped += 1;
          continue;
        }
        const sourcePage = sourceByExtPageId.get(extPageId);
        if (!sourcePage) {
          result.skipped += 1;
          continue;
        }
        const currentStatus = readText(sourcePage, config.sourceStatusProperty);
        if (currentStatus === mappedStatus) {
          result.skipped += 1;
          continue;
        }

        await (clients.client as Client).pages.update({
          page_id: sourcePage.id,
          properties: {
            [config.sourceStatusProperty]: writableValue(
              config.sourceSchema[config.sourceStatusProperty]?.type ?? 'status',
              mappedStatus,
            ),
          } as never,
        } as never);
        result.updated += 1;
      } catch (error) {
        result.errors.push({
          scope: 'status_update',
          message: errorMessage(error),
          page_id: targetPage.id,
          ext_page_id: readText(targetPage, 'Ext Page ID') || undefined,
        });
      }
    }

    result.ok = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push({ scope: 'status_to_client', message: errorMessage(error) });
    return result;
  }
}

export async function syncBlondishDeliveryMirrorStatusToClient(
  clients: BlondishTicketSyncClients,
  env: BlondishTicketSyncEnv,
  options: { dryRun?: boolean } = {},
): Promise<BlondishTicketSyncResult> {
  const result = emptyResult('delivery_mirror_status_to_client');
  try {
    const config = await resolveDeliveryMirrorStatusSyncConfig(clients, env);
    const dryRun = options.dryRun ?? env.BLONDISH_DELIVERY_REVERSE_SYNC_DRY_RUN !== 'false';
    let wouldUpdate = 0;
    result.source_data_source_id = config.sourceDataSourceId;
    result.target_data_source_id = config.mirrorDataSourceId;

    const [sourcePages, mirrorPages] = await Promise.all([
      queryAllPages(clients.client as Client, config.sourceDataSourceId),
      queryAllPages(clients.createSomething as Client, config.mirrorDataSourceId),
    ]);
    const sourceByExtPageId = new Map<string, NotionPage>();
    for (const page of sourcePages) {
      const pageId = readText(page, 'Page ID');
      if (pageId) sourceByExtPageId.set(pageId, page);
    }

    for (const mirrorPage of mirrorPages) {
      try {
        const extPageId = readText(mirrorPage, 'Ext Page ID');
        if (!extPageId) {
          result.skipped += 1;
          continue;
        }
        const hdStatus = readText(mirrorPage, 'HD Status');
        const mappedStatus = HD_TO_OS_STATUS[hdStatus];
        if (!mappedStatus) {
          result.skipped += 1;
          continue;
        }
        const sourcePage = sourceByExtPageId.get(extPageId);
        if (!sourcePage) {
          result.skipped += 1;
          continue;
        }
        const currentStatus = readText(sourcePage, config.sourceStatusProperty);
        if (currentStatus === mappedStatus) {
          result.skipped += 1;
          continue;
        }

        wouldUpdate += 1;
        if (dryRun) continue;

        await (clients.client as Client).pages.update({
          page_id: sourcePage.id,
          properties: {
            [config.sourceStatusProperty]: writableValue(
              config.sourceSchema[config.sourceStatusProperty]?.type ?? 'status',
              mappedStatus,
            ),
          } as never,
        } as never);
        result.updated += 1;
      } catch (error) {
        result.errors.push({
          scope: 'delivery_mirror_status_update',
          message: errorMessage(error),
          page_id: mirrorPage.id,
          ext_page_id: readText(mirrorPage, 'Ext Page ID') || undefined,
        });
      }
    }

    result.ok = result.errors.length === 0;
    result.details = {
      dry_run: dryRun,
      mirror_rows_checked: mirrorPages.length,
      source_rows_checked: sourcePages.length,
      would_update: wouldUpdate,
      source_status_property: config.sourceStatusProperty,
    };
    return result;
  } catch (error) {
    result.errors.push({ scope: 'delivery_mirror_status_to_client', message: errorMessage(error) });
    return result;
  }
}

export function extractSourcePageIdFromWebhook(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const candidates = [
    record.page_id,
    record.pageId,
    record.source_page_id,
    record.sourcePageId,
    nested(record, ['page', 'id']),
    nested(record, ['data', 'id']),
    nested(record, ['entity', 'id']),
    nested(record, ['properties', 'Page ID']),
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

export function buildConciseTicketSummary(ticket: string, details: string): string {
  const titleWords = words(ticket);
  const detailWords = words(details);
  const combined = [...titleWords.slice(0, 3), ...detailWords].slice(0, 6);
  if (combined.length > 0) return combined.join(' ');
  return 'BLONDISH support ticket';
}

export function readText(page: NotionPage, propertyName: string): string {
  const property = page.properties?.[propertyName];
  if (!property) return '';
  switch (property.type) {
    case 'title':
      return richTextToPlain(property.title);
    case 'rich_text':
      return richTextToPlain(property.rich_text);
    case 'url':
      return typeof property.url === 'string' ? property.url : '';
    case 'status':
      return optionName(property.status);
    case 'select':
      return optionName(property.select);
    case 'multi_select':
      return Array.isArray(property.multi_select) ? property.multi_select.map(optionName).filter(Boolean).join(', ') : '';
    case 'unique_id': {
      const unique = isRecord(property.unique_id) ? property.unique_id : {};
      const number = typeof unique.number === 'number' ? String(unique.number) : '';
      const prefix = typeof unique.prefix === 'string' ? unique.prefix : '';
      if (!number) return '';
      return prefix ? `${prefix}-${number}` : number;
    }
    case 'created_by':
    case 'people': {
      const user = property.type === 'created_by' ? property.created_by : Array.isArray(property.people) ? property.people[0] : null;
      return userLabel(user);
    }
    case 'files':
      return Array.isArray(property.files) ? property.files.map((file) => readString(file, 'name')).filter(Boolean).join(', ') : '';
    default:
      return '';
  }
}

async function resolveSyncConfig(clients: BlondishTicketSyncClients, env: BlondishTicketSyncEnv): Promise<SyncConfig> {
  if (!clients.client) throw new Error('NOTION_CLIENT_API_KEY is not set for BLOND:ISH workspace.');
  if (!clients.halfdozen) throw new Error('NOTION_API_KEY is not set for Half Dozen workspace.');

  const sourceDataSourceId =
    env.BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_ID?.trim() ||
    await findDataSourceIdByTitle(
      clients.client,
      env.BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_TITLE?.trim() || DEFAULT_BLONDISH_SOURCE_DATA_SOURCE_TITLE,
    ) ||
    DEFAULT_BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_ID;
  const targetTitle = env.BLONDISH_HD_TICKETS_DATA_SOURCE_TITLE?.trim() || DEFAULT_HALFDOZEN_TARGET_DATA_SOURCE_TITLE;
  const targetDataSourceId =
    env.BLONDISH_HD_TICKETS_DATA_SOURCE_ID?.trim() ||
    await getFirstDataSourceIdForDatabase(clients.halfdozen, env.BLONDISH_HD_TICKETS_DATABASE_ID?.trim()) ||
    await findDataSourceIdByTitle(clients.halfdozen, targetTitle);

  if (!targetDataSourceId) {
    throw new Error(
      `Could not find Half Dozen target data source "${targetTitle}". Share the Tickets [HD] data source with the HD Client MCP integration or set BLONDISH_HD_TICKETS_DATA_SOURCE_ID.`,
    );
  }

  const [sourceSchema, targetSchema] = await Promise.all([
    retrieveSchema(clients.client, sourceDataSourceId),
    retrieveSchema(clients.halfdozen, targetDataSourceId),
  ]);
  const configuredStatus = env.BLONDISH_OS_STATUS_PROPERTY?.trim();
  const sourceStatusProperty = configuredStatus && sourceSchema[configuredStatus]
    ? configuredStatus
    : sourceSchema['OS Status']
      ? 'OS Status'
      : 'Status';

  return { sourceDataSourceId, targetDataSourceId, sourceSchema, targetSchema, sourceStatusProperty };
}

async function resolveDeliveryMirrorStatusSyncConfig(
  clients: BlondishTicketSyncClients,
  env: BlondishTicketSyncEnv,
): Promise<DeliveryMirrorStatusSyncConfig> {
  if (!clients.client) throw new Error('NOTION_CLIENT_API_KEY is not set for BLOND:ISH workspace.');
  if (!clients.createSomething) throw new Error('NOTION_CREATE_SOMETHING_API_KEY is not set for CREATE SOMETHING workspace.');

  const sourceDataSourceId =
    env.BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_ID?.trim() ||
    await findDataSourceIdByTitle(
      clients.client,
      env.BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_TITLE?.trim() || DEFAULT_BLONDISH_SOURCE_DATA_SOURCE_TITLE,
    ) ||
    DEFAULT_BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_ID;
  const mirrorTitle = env.BLONDISH_DELIVERY_MIRROR_DATA_SOURCE_TITLE?.trim() || DEFAULT_BLONDISH_DELIVERY_MIRROR_DATA_SOURCE_TITLE;
  const mirrorDataSourceId =
    env.BLONDISH_DELIVERY_MIRROR_DATA_SOURCE_ID?.trim() ||
    await findDataSourceIdByTitle(clients.createSomething, mirrorTitle) ||
    DEFAULT_BLONDISH_DELIVERY_MIRROR_DATA_SOURCE_ID;

  const [sourceSchema, mirrorSchema] = await Promise.all([
    retrieveSchema(clients.client, sourceDataSourceId),
    retrieveSchema(clients.createSomething, mirrorDataSourceId),
  ]);
  const configuredStatus = env.BLONDISH_OS_STATUS_PROPERTY?.trim();
  const sourceStatusProperty = configuredStatus && sourceSchema[configuredStatus]
    ? configuredStatus
    : sourceSchema['OS Status']
      ? 'OS Status'
      : 'Status';

  const sourceMissing = missingProperties(sourceSchema, ['Page ID', sourceStatusProperty]);
  const mirrorMissing = missingProperties(mirrorSchema, ['Ext Page ID', 'HD Status']);
  if (sourceMissing.length > 0) throw new Error(`Missing BLOND:ISH source properties: ${sourceMissing.join(', ')}`);
  if (mirrorMissing.length > 0) throw new Error(`Missing CREATE SOMETHING mirror properties: ${mirrorMissing.join(', ')}`);

  return { sourceDataSourceId, mirrorDataSourceId, sourceSchema, mirrorSchema, sourceStatusProperty };
}

async function getFirstDataSourceIdForDatabase(client: Client, databaseId?: string | null): Promise<string | null> {
  if (!databaseId) return null;
  const database = await client.databases.retrieve({ database_id: databaseId } as never) as {
    data_sources?: Array<{ id?: string; name?: string }>;
  };
  return database.data_sources?.find((dataSource) => typeof dataSource.id === 'string')?.id ?? null;
}

async function retrieveSchema(client: Client, dataSourceId: string): Promise<DataSourceSchema> {
  const dataSource = await client.dataSources.retrieve({ data_source_id: dataSourceId } as never) as { properties?: DataSourceSchema };
  return dataSource.properties ?? {};
}

async function findDataSourceIdByTitle(client: Client, title: string): Promise<string | null> {
  const response = await client.search({
    query: title,
    filter: { property: 'object', value: 'data_source' },
    page_size: 100,
  } as never) as { results?: Array<Record<string, unknown>> };

  for (const item of response.results ?? []) {
    if (readDataSourceTitle(item) === title && typeof item.id === 'string') return item.id;
  }
  return null;
}

async function queryAllPages(client: Client, dataSourceId: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let startCursor: string | null = null;
  do {
    const response = await client.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      ...(startCursor ? { start_cursor: startCursor } : {}),
    } as never) as { results?: NotionPage[]; has_more?: boolean; next_cursor?: string | null };
    pages.push(...(response.results ?? []).filter((page) => !page.archived));
    startCursor = response.has_more ? response.next_cursor ?? null : null;
  } while (startCursor);
  return pages;
}

async function resolveSourcePages(client: Client, dataSourceId: string, sourcePageId: string | null): Promise<NotionPage[]> {
  if (!sourcePageId) return queryAllPages(client, dataSourceId);
  if (looksLikeNotionPageId(sourcePageId)) {
    const page = await client.pages.retrieve({ page_id: sourcePageId } as never) as NotionPage;
    return page.archived ? [] : [page];
  }
  const pages = await queryAllPages(client, dataSourceId);
  return pages.filter((page) => readText(page, 'Page ID') === sourcePageId);
}

function buildTargetCreateProperties(
  targetSchema: DataSourceSchema,
  sourcePage: NotionPage,
  ownerUserId: string | null,
): Record<string, unknown> {
  if (targetSchema.Owner?.type === 'people' && !ownerUserId) {
    throw new Error(`Could not find target Owner user ${OWNER_EMAIL}.`);
  }

  const properties: Record<string, unknown> = {};
  const sourceFiles = readFiles(sourcePage, 'Files & Media');
  const ticket = readText(sourcePage, 'Ticket');
  const details = readText(sourcePage, 'Details');
  const externalUrl = readText(sourcePage, 'URL') || sourcePage.url || '';

  writeRequired(properties, targetSchema, 'Ticket', buildConciseTicketSummary(ticket, details));
  writeRequired(properties, targetSchema, 'Status', DEFAULT_HD_STATUS);
  writeRequired(properties, targetSchema, 'Source', SOURCE_LABEL);
  writeRequired(properties, targetSchema, 'Owner', OWNER_LABEL, ownerUserId);
  writeRequired(properties, targetSchema, 'Client', CLIENT_LABEL);
  writeRequired(properties, targetSchema, 'Ext Page ID', readText(sourcePage, 'Page ID'));
  if (externalUrl) writeRequired(properties, targetSchema, 'External URL', externalUrl);
  if (sourceFiles.length > 0) writeRequired(properties, targetSchema, 'External Files & Media', sourceFiles);
  return properties;
}

function writeRequired(
  properties: Record<string, unknown>,
  schema: DataSourceSchema,
  propertyName: string,
  value: string | Array<Record<string, unknown>>,
  userId?: string | null,
): void {
  const property = schema[propertyName];
  if (!property?.type) throw new Error(`Target property "${propertyName}" is missing.`);
  properties[propertyName] = writableValue(property.type, value, userId);
}

function writableValue(type: string, value: string | Array<Record<string, unknown>>, userId?: string | null): Record<string, unknown> {
  if (type === 'files') return { files: Array.isArray(value) ? value : [] };
  const text = Array.isArray(value) ? '' : value;
  switch (type) {
    case 'title':
      return { title: richText(text) };
    case 'rich_text':
      return { rich_text: richText(text) };
    case 'url':
      return { url: text || null };
    case 'status':
      return { status: text ? { name: text } : null };
    case 'select':
      return { select: text ? { name: text } : null };
    case 'multi_select':
      return { multi_select: text ? [{ name: text }] : [] };
    case 'people':
      return userId ? { people: [{ id: userId }] } : { people: [] };
    default:
      throw new Error(`Unsupported writable property type "${type}".`);
  }
}

function buildTicketBody(sourcePage: NotionPage): Array<Record<string, unknown>> {
  const createdBy = readText(sourcePage, 'Created By') || 'Unknown';
  const details = readText(sourcePage, 'Details');
  const children: Array<Record<string, unknown>> = [
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: 'Created By:' }, annotations: { bold: true } },
          { type: 'text', text: { content: ` ${createdBy}` } },
        ],
      },
    },
  ];
  for (const chunk of chunks(details || 'No details provided.', 1900)) {
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: chunk } }] },
    });
  }
  return children;
}

function readFiles(page: NotionPage, propertyName: string): Array<Record<string, unknown>> {
  const property = page.properties?.[propertyName];
  if (!property || property.type !== 'files' || !Array.isArray(property.files)) return [];
  const files: Array<Record<string, unknown>> = [];
  for (const file of property.files) {
    if (!isRecord(file)) continue;
    const name = readString(file, 'name') || 'attachment';
    if (isRecord(file.external) && typeof file.external.url === 'string') {
      files.push({ name, type: 'external', external: { url: file.external.url } });
      continue;
    }
    if (isRecord(file.file) && typeof file.file.url === 'string') {
      files.push({ name, type: 'external', external: { url: file.file.url } });
    }
  }
  return files;
}

async function findUserIdByEmail(client: Client, email: string): Promise<string | null> {
  let startCursor: string | undefined;
  do {
    const response = await client.users.list({
      page_size: 100,
      ...(startCursor ? { start_cursor: startCursor } : {}),
    } as never) as { results?: Array<Record<string, unknown>>; has_more?: boolean; next_cursor?: string | null };
    for (const user of response.results ?? []) {
      const person = isRecord(user.person) ? user.person : {};
      if (typeof person.email === 'string' && person.email.toLowerCase() === email.toLowerCase()) {
        return typeof user.id === 'string' ? user.id : null;
      }
    }
    startCursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (startCursor);
  return null;
}

function missingProperties(schema: DataSourceSchema, names: string[]): string[] {
  return names.filter((name) => !schema[name]);
}

function emptyResult(action: BlondishTicketSyncResult['action']): BlondishTicketSyncResult {
  return {
    ok: false,
    action,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };
}

function readDataSourceTitle(item: Record<string, unknown>): string {
  return Array.isArray(item.title) ? richTextToPlain(item.title) : '';
}

function richTextToPlain(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value.map((entry) => readString(entry, 'plain_text')).join('').trim();
}

function richText(text: string): Array<Record<string, unknown>> {
  return chunks(text, 1900).map((content) => ({ type: 'text', text: { content } }));
}

function chunks(text: string, size: number): string[] {
  if (!text) return [];
  const output: string[] = [];
  for (let index = 0; index < text.length; index += size) output.push(text.slice(index, index + size));
  return output;
}

function words(text: string): string[] {
  return text
    .replace(/[\n\r\t]+/g, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/^[^\w]+|[^\w:.-]+$/g, ''))
    .filter(Boolean);
}

function optionName(value: unknown): string {
  return isRecord(value) && typeof value.name === 'string' ? value.name : '';
}

function userLabel(value: unknown): string {
  if (!isRecord(value)) return '';
  const name = readString(value, 'name');
  const person = isRecord(value.person) ? value.person : {};
  const email = readString(person, 'email');
  if (name && email) return `${name} (${email})`;
  return name || email;
}

function nested(record: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = record;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

function readString(record: unknown, key: string): string {
  return isRecord(record) && typeof record[key] === 'string' ? record[key] : '';
}

function looksLikeNotionPageId(value: string): boolean {
  const normalized = value.replace(/-/g, '');
  return /^[0-9a-f]{32}$/i.test(normalized);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
