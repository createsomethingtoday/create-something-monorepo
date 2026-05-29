import {
  appendBlockChildren,
  archiveBlock,
  createPage,
  findDataSourceIdByTitle,
  findUserIdByEmail,
  getFirstDataSourceIdForDatabase,
  listAllBlockChildren,
  queryAllPages,
  retrieveDataSourceSchema,
  retrievePage,
  updatePage,
  uploadFileToNotion,
} from './notion.js';
import type {
  DataSourceSchema,
  Env,
  NotionBlock,
  NotionPage,
  NotionWebhookPayload,
  SyncConfig,
  SyncResult,
  Workspace,
} from './types.js';

const DEFAULT_BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_ID = 'fda87fb8-b156-820b-9542-8774717a42f6';
const DEFAULT_BLONDISH_SOURCE_DATA_SOURCE_TITLE = 'Support Tickets [OS]';
const DEFAULT_HALFDOZEN_TARGET_DATA_SOURCE_TITLE = 'Tickets [HD]';

const OWNER_EMAIL = 'fillip@halfdozen.co';
const OWNER_LABEL = 'FG (fillip@halfdozen.co)';
const CLIENT_LABEL = 'BLOND:ISH / Abracadabra';
const SOURCE_LABEL = 'Portal / Tag';
const DEFAULT_HD_STATUS = 'Not Started';
const TARGET_EXT_PAGE_ID_PROPERTIES = ['Ext Page ID', 'External Page ID'];
const FILE_UPLOAD_TARGET_WORKSPACE: Workspace = 'halfdozen';

const HD_TO_OS_STATUS: Record<string, string> = {
  Assigned: 'Under Review',
  'In Progress': 'In Progress',
  'Client Action': 'Action Required',
  Complete: 'Complete',
  Archive: 'Archive',
  Roadblock: 'Roadblock',
};

type WritableValue = string | Array<Record<string, unknown>>;
type SyncFile = {
  name: string;
  sourceType: 'file' | 'file_upload' | 'external';
  url?: string;
  fileUploadId?: string;
};
type WebhookRoute =
  | { kind: 'source'; pageIds?: string[] }
  | { kind: 'target'; pageIds?: string[] };

export async function preflight(env: Env, trigger: SyncResult['trigger'] = 'manual'): Promise<SyncResult> {
  const result = emptyResult('preflight', trigger);
  try {
    const config = await resolveSyncConfig(env);
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
      'External URL',
      'External Files & Media',
    ]);
    if (!targetExtPageIdProperty(config.targetSchema)) targetMissing.push('Ext Page ID or External Page ID');
    for (const field of sourceMissing) result.errors.push({ scope: 'source_schema', message: `Missing source property: ${field}` });
    for (const field of targetMissing) result.errors.push({ scope: 'target_schema', message: `Missing target property: ${field}` });

    result.ok = result.errors.length === 0;
    result.source_data_source_id = config.sourceDataSourceId;
    result.target_data_source_id = config.targetDataSourceId;
    result.details = {
      source_status_property: config.sourceStatusProperty,
      target_ext_page_id_property: targetExtPageIdProperty(config.targetSchema),
      target_client_property_present: Boolean(config.targetSchema.Client),
      source_properties: Object.keys(config.sourceSchema).sort(),
      target_properties: Object.keys(config.targetSchema).sort(),
    };
    return result;
  } catch (error) {
    result.errors.push({ scope: 'preflight', message: errorMessage(error) });
    return result;
  }
}

export async function syncSourceTicketsToHalfDozen(
  env: Env,
  options: { sourcePageIds?: string[]; trigger?: SyncResult['trigger'] } = {},
): Promise<SyncResult> {
  const result = emptyResult('source_to_hd', options.trigger ?? 'manual');
  let externalReferenceUpdates = 0;
  let titleRepairs = 0;
  let propertyRepairs = 0;
  let bodyRepairs = 0;
  try {
    const config = await resolveSyncConfig(env);
    result.source_data_source_id = config.sourceDataSourceId;
    result.target_data_source_id = config.targetDataSourceId;

    const [sourcePages, targetPages] = await Promise.all([
      resolveSourcePages(env, config.sourceDataSourceId, options.sourcePageIds),
      queryAllPages(env, 'halfdozen', config.targetDataSourceId),
    ]);
    const targetByExtPageId = new Map<string, NotionPage>();
    const targetExtPageId = requiredTargetExtPageIdProperty(config.targetSchema);
    for (const page of targetPages) {
      const extPageId = readText(page, targetExtPageId);
      if (extPageId) targetByExtPageId.set(extPageId, page);
    }

    const ownerUserId = await findUserIdByEmail(env, 'halfdozen', OWNER_EMAIL);
    for (const sourcePage of sourcePages) {
      try {
        if (!isPageInDataSource(sourcePage, config.sourceDataSourceId)) {
          result.skipped += 1;
          continue;
        }

        const extPageId = readText(sourcePage, 'Page ID');
        if (!extPageId) {
          result.errors.push({ scope: 'source_page', message: 'Source ticket is missing Page ID.', page_id: sourcePage.id });
          continue;
        }

        const existingTargetPage = targetByExtPageId.get(extPageId);
        if (existingTargetPage) {
          const externalPatch = await buildExistingTargetPatch(env, config.targetSchema, sourcePage, existingTargetPage, ownerUserId);
          if (Object.keys(externalPatch).length > 0) {
            await updatePage(env, 'halfdozen', existingTargetPage.id, externalPatch);
            result.updated += 1;
            if (externalPatch.Ticket) titleRepairs += 1;
            propertyRepairs += Object.keys(externalPatch).filter((propertyName) => propertyName !== 'Ticket').length;
            if (externalPatch['External URL'] || externalPatch['External Files & Media']) externalReferenceUpdates += 1;
          }
          const bodyUpdated = await syncTargetPageBody(env, sourcePage, existingTargetPage.id);
          if (bodyUpdated) bodyRepairs += 1;
          if (Object.keys(externalPatch).length > 0 || bodyUpdated) result.updated += bodyUpdated && Object.keys(externalPatch).length === 0 ? 1 : 0;
          else result.skipped += 1;
          continue;
        }

        const latestSourcePage = await retrievePage(env, 'blondish', sourcePage.id);
        const properties = await buildTargetCreateProperties(env, config.targetSchema, latestSourcePage, ownerUserId);
        const children = buildTicketBody(latestSourcePage);
        const created = await createPage(env, config.targetDataSourceId, properties, children);

        const confirmationPatch = await buildExistingTargetPatch(env, config.targetSchema, latestSourcePage, created, ownerUserId);
        if (Object.keys(confirmationPatch).length > 0) {
          await updatePage(env, 'halfdozen', created.id, confirmationPatch);
          if (confirmationPatch.Ticket) titleRepairs += 1;
          propertyRepairs += Object.keys(confirmationPatch).filter((propertyName) => propertyName !== 'Ticket').length;
          if (confirmationPatch['External URL'] || confirmationPatch['External Files & Media']) externalReferenceUpdates += 1;
        }

        result.created += 1;
        targetByExtPageId.set(extPageId, created);
      } catch (error) {
        result.errors.push({
          scope: 'source_to_hd_page',
          message: errorMessage(error),
          page_id: sourcePage.id,
          ext_page_id: readText(sourcePage, 'Page ID') || undefined,
        });
      }
    }

    result.ok = result.errors.length === 0;
    result.details = {
      source_rows_checked: sourcePages.length,
      target_rows_checked: targetPages.length,
      external_reference_updates: externalReferenceUpdates,
      title_repairs: titleRepairs,
      property_repairs: propertyRepairs,
      body_repairs: bodyRepairs,
    };
    return result;
  } catch (error) {
    result.errors.push({ scope: 'source_to_hd', message: errorMessage(error) });
    return result;
  }
}

export async function syncHalfDozenStatusToSource(
  env: Env,
  options: { targetPageIds?: string[]; trigger?: SyncResult['trigger'] } = {},
): Promise<SyncResult> {
  const result = emptyResult('hd_status_to_source', options.trigger ?? 'manual');
  try {
    const config = await resolveSyncConfig(env);
    result.source_data_source_id = config.sourceDataSourceId;
    result.target_data_source_id = config.targetDataSourceId;

    const [sourcePages, targetPages] = await Promise.all([
      queryAllPages(env, 'blondish', config.sourceDataSourceId),
      resolveTargetPages(env, config.targetDataSourceId, options.targetPageIds),
    ]);
    const targetExtPageId = requiredTargetExtPageIdProperty(config.targetSchema);
    const sourceByExtPageId = new Map<string, NotionPage>();
    for (const page of sourcePages) {
      const pageId = readText(page, 'Page ID');
      if (pageId) sourceByExtPageId.set(pageId, page);
    }

    for (const targetPage of targetPages) {
      try {
        if (!isPageInDataSource(targetPage, config.targetDataSourceId)) {
          result.skipped += 1;
          continue;
        }

        const extPageId = readText(targetPage, targetExtPageId);
        if (!extPageId) {
          result.skipped += 1;
          continue;
        }
        const hdStatus = readText(targetPage, 'Status');
        const mappedStatus = mapHdStatusToOsStatus(hdStatus);
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

        await updatePage(env, 'blondish', sourcePage.id, {
          [config.sourceStatusProperty]: writableValue(
            config.sourceSchema[config.sourceStatusProperty]?.type ?? 'status',
            mappedStatus,
          ),
        });
        result.updated += 1;
      } catch (error) {
        result.errors.push({
          scope: 'status_update',
          message: errorMessage(error),
          page_id: targetPage.id,
          ext_page_id: readText(targetPage, targetExtPageId) || undefined,
        });
      }
    }

    result.ok = result.errors.length === 0;
    result.details = {
      target_rows_checked: targetPages.length,
      source_rows_checked: sourcePages.length,
      source_status_property: config.sourceStatusProperty,
    };
    return result;
  } catch (error) {
    result.errors.push({ scope: 'hd_status_to_source', message: errorMessage(error) });
    return result;
  }
}

export async function syncFromWebhook(env: Env, payload: NotionWebhookPayload): Promise<SyncResult> {
  const config = await resolveSyncConfig(env);
  const route = await resolveWebhookRoute(env, config, payload);
  if (route?.kind === 'source') {
    return syncSourceTicketsToHalfDozen(env, { sourcePageIds: route.pageIds, trigger: 'webhook' });
  }

  if (route?.kind === 'target') {
    return syncHalfDozenStatusToSource(env, { targetPageIds: route.pageIds, trigger: 'webhook' });
  }

  return {
    ...emptyResult('webhook', 'webhook'),
    ok: true,
    skipped: 1,
    source_data_source_id: config.sourceDataSourceId,
    target_data_source_id: config.targetDataSourceId,
    details: {
      reason: 'Webhook event did not target the configured source or target data source.',
      event_type: payload.type ?? null,
      entity_type: payload.entity?.type ?? null,
      entity_id: payload.entity?.id ?? null,
    },
  };
}

async function resolveWebhookRoute(env: Env, config: SyncConfig, payload: NotionWebhookPayload): Promise<WebhookRoute | null> {
  if (payload.entity?.type === 'data_source' && typeof payload.entity.id === 'string') {
    if (payload.type !== 'data_source.content_updated') return null;
    if (payload.entity.id === config.sourceDataSourceId) return { kind: 'source' };
    if (payload.entity.id === config.targetDataSourceId) return { kind: 'target' };
    return null;
  }

  const pageIds = extractWebhookPageIds(payload);
  const pageId = pageIds[0];
  if (!pageId) return null;

  const sourcePage = await retrieveVisiblePage(env, 'blondish', pageId);
  if (sourcePage && pageParentMatchesDataSource(sourcePage, config.sourceDataSourceId)) {
    return { kind: 'source', pageIds: [pageId] };
  }

  const targetPage = await retrieveVisiblePage(env, 'halfdozen', pageId);
  if (targetPage && pageParentMatchesDataSource(targetPage, config.targetDataSourceId)) {
    return { kind: 'target', pageIds: [pageId] };
  }

  return null;
}

async function retrieveVisiblePage(env: Env, workspace: Workspace, pageId: string): Promise<NotionPage | null> {
  try {
    const page = await retrievePage(env, workspace, pageId);
    return page.archived ? null : page;
  } catch (error) {
    const message = errorMessage(error);
    if (/Notion .* API (400|403|404):/.test(message)) return null;
    throw error;
  }
}

export async function fullReconcile(env: Env, trigger: SyncResult['trigger'] = 'manual'): Promise<SyncResult> {
  const forward = env.FORWARD_SYNC_ON_SCHEDULE === 'true' || trigger !== 'scheduled'
    ? await syncSourceTicketsToHalfDozen(env, { trigger })
    : null;
  const reverse = await syncHalfDozenStatusToSource(env, { trigger });

  return {
    ok: Boolean((forward?.ok ?? true) && reverse.ok),
    action: 'full_reconcile',
    trigger,
    source_data_source_id: reverse.source_data_source_id ?? forward?.source_data_source_id,
    target_data_source_id: reverse.target_data_source_id ?? forward?.target_data_source_id,
    created: forward?.created ?? 0,
    updated: (forward?.updated ?? 0) + reverse.updated,
    skipped: (forward?.skipped ?? 0) + reverse.skipped,
    errors: [...(forward?.errors ?? []), ...reverse.errors],
    details: { forward, reverse },
  };
}

export function extractWebhookPageIds(payload: NotionWebhookPayload): string[] {
  const ids = new Set<string>();

  if (payload.entity?.type === 'page' && typeof payload.entity.id === 'string') {
    ids.add(payload.entity.id);
  }
  for (const block of payload.data?.updated_blocks ?? []) {
    if ((!block.type || block.type === 'page' || block.type === 'child_page') && typeof block.id === 'string') ids.add(block.id);
  }
  return Array.from(ids);
}

export function mapHdStatusToOsStatus(value: string): string | null {
  return HD_TO_OS_STATUS[value] ?? null;
}

export function buildTicketTitle(ticket: string): string {
  return ticket.trim() || 'BLONDISH support ticket';
}

async function resolveSyncConfig(env: Env): Promise<SyncConfig> {
  const sourceDataSourceId =
    env.BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_ID?.trim() ||
    await findDataSourceIdByTitle(env, 'blondish', env.BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_TITLE?.trim() || DEFAULT_BLONDISH_SOURCE_DATA_SOURCE_TITLE) ||
    DEFAULT_BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_ID;

  const targetTitle = env.HALFDOZEN_TICKETS_DATA_SOURCE_TITLE?.trim() || DEFAULT_HALFDOZEN_TARGET_DATA_SOURCE_TITLE;
  const targetDataSourceId =
    env.HALFDOZEN_TICKETS_DATA_SOURCE_ID?.trim() ||
    await getFirstDataSourceIdForDatabase(env, 'halfdozen', env.HALFDOZEN_TICKETS_DATABASE_ID?.trim()) ||
    await findDataSourceIdByTitle(env, 'halfdozen', targetTitle);

  if (!targetDataSourceId) {
    throw new Error(`Could not find Half Dozen target data source "${targetTitle}". Set HALFDOZEN_TICKETS_DATA_SOURCE_ID or share the database with the runtime token.`);
  }

  const [sourceSchema, targetSchema] = await Promise.all([
    retrieveDataSourceSchema(env, 'blondish', sourceDataSourceId),
    retrieveDataSourceSchema(env, 'halfdozen', targetDataSourceId),
  ]);
  const configuredStatus = env.BLONDISH_OS_STATUS_PROPERTY?.trim();
  const sourceStatusProperty = configuredStatus && sourceSchema[configuredStatus]
    ? configuredStatus
    : sourceSchema['OS Status']
      ? 'OS Status'
      : 'Status';

  return { sourceDataSourceId, targetDataSourceId, sourceSchema, targetSchema, sourceStatusProperty };
}

async function resolveSourcePages(env: Env, dataSourceId: string, sourcePageIds?: string[]): Promise<NotionPage[]> {
  const ids = sourcePageIds?.map((id) => id.trim()).filter(Boolean);
  if (!ids || ids.length === 0) return queryAllPages(env, 'blondish', dataSourceId);

  const allPagesByExtId = new Map<string, NotionPage>();
  const directPages: NotionPage[] = [];
  const extIds: string[] = [];
  for (const id of ids) {
    if (looksLikeNotionPageId(id)) {
      const page = await retrievePage(env, 'blondish', id);
      if (!page.archived) directPages.push(page);
    } else {
      extIds.push(id);
    }
  }
  if (extIds.length > 0) {
    for (const page of await queryAllPages(env, 'blondish', dataSourceId)) {
      const extPageId = readText(page, 'Page ID');
      if (extPageId) allPagesByExtId.set(extPageId, page);
    }
  }
  return [...directPages, ...extIds.flatMap((id) => allPagesByExtId.get(id) ?? [])];
}

async function resolveTargetPages(env: Env, dataSourceId: string, targetPageIds?: string[]): Promise<NotionPage[]> {
  const ids = targetPageIds?.map((id) => id.trim()).filter(Boolean);
  if (!ids || ids.length === 0) return queryAllPages(env, 'halfdozen', dataSourceId);
  const pages = await Promise.all(ids.map((id) => retrievePage(env, 'halfdozen', id)));
  return pages.filter((page) => !page.archived);
}

async function buildTargetCreateProperties(
  env: Env,
  targetSchema: DataSourceSchema,
  sourcePage: NotionPage,
  ownerUserId: string | null,
): Promise<Record<string, unknown>> {
  if (targetSchema.Owner?.type === 'people' && !ownerUserId) {
    throw new Error(`Could not find target Owner user ${OWNER_EMAIL}.`);
  }

  const properties: Record<string, unknown> = {};
  const sourceFiles = readFiles(sourcePage, 'Files & Media');
  const ticket = readText(sourcePage, 'Ticket');
  const externalUrl = readExternalUrl(sourcePage);

  writeRequired(properties, targetSchema, 'Ticket', buildTicketTitle(ticket));
  writeRequired(properties, targetSchema, 'Status', DEFAULT_HD_STATUS);
  writeRequired(properties, targetSchema, 'Source', SOURCE_LABEL);
  writeRequired(properties, targetSchema, 'Owner', OWNER_LABEL, ownerUserId);
  if (targetSchema.Client) writeRequired(properties, targetSchema, 'Client', CLIENT_LABEL);
  writeRequired(properties, targetSchema, requiredTargetExtPageIdProperty(targetSchema), readText(sourcePage, 'Page ID'));
  if (externalUrl) writeRequired(properties, targetSchema, 'External URL', externalUrl);
  if (sourceFiles.length > 0) {
    writeRequired(properties, targetSchema, 'External Files & Media', await buildWritableFiles(env, sourceFiles));
  }
  return properties;
}

async function buildExistingTargetPatch(
  env: Env,
  targetSchema: DataSourceSchema,
  sourcePage: NotionPage,
  targetPage: NotionPage,
  ownerUserId: string | null,
): Promise<Record<string, unknown>> {
  if (targetSchema.Owner?.type === 'people' && !ownerUserId) {
    throw new Error(`Could not find target Owner user ${OWNER_EMAIL}.`);
  }

  const properties: Record<string, unknown> = {};
  const externalUrl = readExternalUrl(sourcePage);
  const sourceFiles = readFiles(sourcePage, 'Files & Media');
  const ticket = readText(sourcePage, 'Ticket');
  const desiredTitle = buildTicketTitle(ticket);
  const currentTitle = readText(targetPage, 'Ticket');
  const targetExtPageId = requiredTargetExtPageIdProperty(targetSchema);
  const extPageId = readText(sourcePage, 'Page ID');

  if (currentTitle !== desiredTitle) {
    writeRequired(properties, targetSchema, 'Ticket', desiredTitle);
  }

  if (readText(targetPage, 'Source') !== SOURCE_LABEL) {
    writeRequired(properties, targetSchema, 'Source', SOURCE_LABEL);
  }

  if (targetSchema.Owner && readText(targetPage, 'Owner') !== OWNER_LABEL) {
    writeRequired(properties, targetSchema, 'Owner', OWNER_LABEL, ownerUserId);
  }

  if (targetSchema.Client && readText(targetPage, 'Client') !== CLIENT_LABEL) {
    writeRequired(properties, targetSchema, 'Client', CLIENT_LABEL);
  }

  if (extPageId && readText(targetPage, targetExtPageId) !== extPageId) {
    writeRequired(properties, targetSchema, targetExtPageId, extPageId);
  }

  if (externalUrl && readText(targetPage, 'External URL') !== externalUrl) {
    writeRequired(properties, targetSchema, 'External URL', externalUrl);
  }

  if (sourceFiles.length > 0 && !externalFilesMatch(targetPage, targetSchema['External Files & Media']?.type, sourceFiles)) {
    writeRequired(properties, targetSchema, 'External Files & Media', await buildWritableFiles(env, sourceFiles));
  }

  return properties;
}

async function syncTargetPageBody(env: Env, sourcePage: NotionPage, targetPageId: string): Promise<boolean> {
  const desiredChildren = buildTicketBody(sourcePage);
  const desiredTexts = desiredChildren.map(blockPlainText).filter(Boolean);
  const existingBlocks = await listAllBlockChildren(env, 'halfdozen', targetPageId);
  const existingTexts = existingBlocks.map(blockPlainText).filter(Boolean);
  if (stringArraysEqual(existingTexts, desiredTexts)) return false;

  for (const block of existingBlocks) {
    await archiveBlock(env, 'halfdozen', block.id);
  }
  await appendBlockChildren(env, 'halfdozen', targetPageId, desiredChildren);
  return true;
}

async function buildWritableFiles(env: Env, sourceFiles: SyncFile[]): Promise<Array<Record<string, unknown>>> {
  const files: Array<Record<string, unknown>> = [];
  for (const file of sourceFiles) {
    if (file.sourceType === 'external' && file.url) {
      files.push({ name: file.name, type: 'external', external: { url: file.url } });
      continue;
    }

    if (file.url) {
      const fileUploadId = await uploadFileToNotion(env, FILE_UPLOAD_TARGET_WORKSPACE, {
        name: file.name,
        url: file.url,
      });
      files.push({ name: file.name, type: 'file_upload', file_upload: { id: fileUploadId } });
      continue;
    }

    throw new Error(`Source attachment "${file.name}" does not have a retrievable URL.`);
  }
  return files;
}

function writeRequired(
  properties: Record<string, unknown>,
  schema: DataSourceSchema,
  propertyName: string,
  value: WritableValue,
  userId?: string | null,
): void {
  const property = schema[propertyName];
  if (!property?.type) throw new Error(`Target property "${propertyName}" is missing.`);
  properties[propertyName] = writableValue(property.type, value, userId);
}

function targetExtPageIdProperty(targetSchema: DataSourceSchema): string | null {
  return TARGET_EXT_PAGE_ID_PROPERTIES.find((propertyName) => Boolean(targetSchema[propertyName])) ?? null;
}

function requiredTargetExtPageIdProperty(targetSchema: DataSourceSchema): string {
  const propertyName = targetExtPageIdProperty(targetSchema);
  if (!propertyName) throw new Error('Target property "Ext Page ID" or "External Page ID" is missing.');
  return propertyName;
}

function writableValue(type: string, value: WritableValue, userId?: string | null): Record<string, unknown> {
  if (type === 'files') return { files: Array.isArray(value) ? value : [] };
  const text = Array.isArray(value) ? filesToText(value) : value;
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

function blockPlainText(block: NotionBlock | Record<string, unknown>): string {
  const type = typeof block.type === 'string' ? block.type : '';
  const payload = isRecord(block[type]) ? block[type] : {};
  const richText = Array.isArray(payload.rich_text) ? payload.rich_text : [];
  return richText.map((entry) => readString(entry, 'plain_text') || readString(isRecord(entry) ? entry.text : null, 'content')).join('').trim();
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

function readFiles(page: NotionPage, propertyName: string): SyncFile[] {
  const property = page.properties?.[propertyName];
  if (!property || property.type !== 'files' || !Array.isArray(property.files)) return [];
  const files: SyncFile[] = [];
  for (const file of property.files) {
    if (!isRecord(file)) continue;
    const name = readString(file, 'name') || 'attachment';
    if (isRecord(file.file) && typeof file.file.url === 'string') {
      files.push({ name, sourceType: 'file', url: file.file.url });
      continue;
    }
    if (isRecord(file.file_upload) && typeof file.file_upload.id === 'string') {
      files.push({ name, sourceType: 'file_upload', fileUploadId: file.file_upload.id });
      continue;
    }
    if (isRecord(file.external) && typeof file.external.url === 'string') {
      files.push({ name, sourceType: 'external', url: file.external.url });
    }
  }
  return files;
}

function readExternalUrl(sourcePage: NotionPage): string {
  return readText(sourcePage, 'URL') || sourcePage.url || '';
}

function externalFilesMatch(targetPage: NotionPage, targetPropertyType: string | undefined, sourceFiles: SyncFile[]): boolean {
  if (targetPropertyType === 'files') {
    return fileMatchFingerprints(readFiles(targetPage, 'External Files & Media')).join('\n') === fileMatchFingerprints(sourceFiles).join('\n');
  }
  return readText(targetPage, 'External Files & Media') === filesToText(sourceFiles);
}

function fileMatchFingerprints(files: SyncFile[]): string[] {
  return files.map((file) => {
    if (file.sourceType !== 'external') return `${file.name}\tnotion-file`;
    return `${file.name}\texternal\t${normalizeFileUrl(file.url ?? '')}`;
  }).sort();
}

function filesToText(files: SyncFile[] | Array<Record<string, unknown>>): string {
  return files.map((file) => {
    const name = readString(file, 'name') || 'attachment';
    const url = readExternalFileUrl(file);
    return url ? `${name}: ${url}` : name;
  }).join('\n');
}

function readExternalFileUrl(file: unknown): string {
  if (!isRecord(file)) return '';
  if (typeof file.url === 'string') return file.url;
  if (isRecord(file.external) && typeof file.external.url === 'string') return file.external.url;
  if (isRecord(file.file) && typeof file.file.url === 'string') return file.file.url;
  return '';
}

export function normalizeFileUrl(value: string): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    const keysToDelete: string[] = [];
    url.searchParams.forEach((_paramValue, key) => {
      if (/^(x-amz-|x-id$|expires$|signature$|token$)/i.test(key)) keysToDelete.push(key);
    });
    for (const key of keysToDelete) url.searchParams.delete(key);
    return url.toString();
  } catch {
    return value;
  }
}

function isPageInDataSource(page: NotionPage, dataSourceId: string): boolean {
  const parentDataSourceId = page.parent?.data_source_id;
  return !parentDataSourceId || parentDataSourceId === dataSourceId;
}

function pageParentMatchesDataSource(page: NotionPage, dataSourceId: string): boolean {
  return page.parent?.data_source_id === dataSourceId;
}

function missingProperties(schema: DataSourceSchema, names: string[]): string[] {
  return names.filter((name) => !schema[name]);
}

function emptyResult(action: SyncResult['action'], trigger: SyncResult['trigger']): SyncResult {
  return { ok: false, action, trigger, created: 0, updated: 0, skipped: 0, errors: [] };
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

function stringArraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
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

function readString(record: unknown, key: string): string {
  return isRecord(record) && typeof record[key] === 'string' ? record[key] : '';
}

function looksLikeNotionPageId(value: string): boolean {
  return /^[0-9a-f]{32}$/i.test(value.replace(/-/g, ''));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
