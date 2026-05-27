import type { AutomationEvent, Schedule, Worker } from '@notionhq/workers';
import * as Builder from '@notionhq/workers/builder';
import * as Schema from '@notionhq/workers/schema';
import { j } from '@notionhq/workers/schema-builder';

const BLONDISH_SOURCE_DATA_SOURCE_ID = 'fda87fb8-b156-820b-9542-8774717a42f6';
const BLONDISH_SOURCE_STATUS_PROPERTY = 'Status';
const BLONDISH_API_VERSION = '2025-09-03';

const MIRROR_SYNC_KEY = 'blondishDeliveryTicketsSync';
const STATUS_PUSH_AUTOMATION_KEY = 'pushBlondishDeliveryTicketStatus';
const STATUS_PUSH_TOOL_KEY = 'pushBlondishDeliveryTicketStatusForPage';

const HD_STATUS_TO_BLONDISH_STATUS: Record<string, string> = {
  Assigned: 'Under Review',
  'In Progress': 'In Progress',
  'Client Action': 'Action Required',
  Complete: 'Complete',
  Archive: 'Archive',
  Roadblock: 'Roadblock'
};

type SyncState = {
  seenKeys?: string[];
};

type NotionPage = {
  id: string;
  url?: string;
  archived?: boolean;
  last_edited_time?: string;
  properties?: Record<string, NotionProperty>;
};

type NotionProperty = Record<string, unknown> & { type?: string };

type NotionListResponse<T> = {
  results?: T[];
  has_more?: boolean;
  next_cursor?: string | null;
};

type StatusPushResult = {
  pushed: boolean;
  skipped: boolean;
  reason: string | null;
  extPageId: string | null;
  hdStatus: string | null;
  blondishStatus: string | null;
  sourcePageId: string | null;
  dryRun: boolean;
};

type MirrorStatusValues = {
  extPageId: string | null;
  hdStatus: string | null;
};

export function registerBlondishDeliveryTickets(worker: Worker): void {
  const deliveryTicketsDatabase = worker.database('blondishDeliveryTickets', {
    type: 'managed',
    initialTitle: 'BLOND:ISH Support Tickets [HD Delivery]',
    primaryKeyProperty: 'Ext Page ID',
    schema: {
      properties: {
        Ticket: Schema.title(),
        'Ext Page ID': Schema.richText(),
        'External URL': Schema.url(),
        'External Files & Media': Schema.richText(),
        'BLOND:ISH Status': Schema.select([
          { name: 'Submitted', color: 'gray' },
          { name: 'Under Review', color: 'yellow' },
          { name: 'In Progress', color: 'blue' },
          { name: 'Action Required', color: 'orange' },
          { name: 'Complete', color: 'green' },
          { name: 'Archive', color: 'default' },
          { name: 'Roadblock', color: 'red' }
        ]),
        'HD Status': Schema.select([
          { name: 'Not Started', color: 'gray' },
          { name: 'Assigned', color: 'yellow' },
          { name: 'In Progress', color: 'blue' },
          { name: 'Client Action', color: 'orange' },
          { name: 'Complete', color: 'green' },
          { name: 'Archive', color: 'default' },
          { name: 'Roadblock', color: 'red' }
        ]),
        Client: Schema.richText(),
        Source: Schema.richText(),
        Details: Schema.richText(),
        'Created By': Schema.richText(),
        'Source Last Edited': Schema.date(),
        'Sync Notes': Schema.richText()
      }
    }
  });

  worker.sync(MIRROR_SYNC_KEY, {
    database: deliveryTicketsDatabase,
    mode: 'replace',
    schedule: readSyncSchedule(),
    execute: async (state: SyncState | undefined) => {
      const sourcePages = await queryBlondishTickets();
      const previousSeenKeys = new Set(state?.seenKeys ?? []);
      const currentSeenKeys = new Set<string>();

      return {
        changes: sourcePages.map((page) => {
          const extPageId = readText(page, 'Page ID') || page.id;
          currentSeenKeys.add(extPageId);
          const properties = buildMirrorProperties(page, !previousSeenKeys.has(extPageId));
          return {
            type: 'upsert' as const,
            key: extPageId,
            upstreamUpdatedAt: page.last_edited_time,
            properties: properties as never,
            pageContentMarkdown: buildPageContentMarkdown(page)
          };
        }),
        hasMore: false,
        nextState: { seenKeys: Array.from(currentSeenKeys).sort() }
      };
    }
  });

  if (shouldRegisterAutomationCapability()) {
    worker.automation(STATUS_PUSH_AUTOMATION_KEY, {
      title: 'Push BLOND:ISH Ticket Status',
      description:
        'Pushes the current HD Status from a BLOND:ISH Support Tickets [HD Delivery] row back to the matching BLOND:ISH Support Tickets [OS] row. Configure this only on the delivery-ticket mirror and trigger it when HD Status changes.',
      execute: async (event) => {
        await pushStatusFromAutomationEvent(event, false);
      }
    });
  }

  worker.tool(STATUS_PUSH_TOOL_KEY, {
    title: 'Push BLOND:ISH Ticket Status For Page',
    description:
      'Push one mirrored BLOND:ISH delivery-ticket status back to BLOND:ISH. Use dryRun=true first; set dryRun=false only after checking the mapped status.',
    schema: j.object({
      pageId: j.string().nullable().describe('The mirrored CREATE SOMETHING delivery-ticket page ID. Use null when passing extPageId and hdStatus directly.'),
      extPageId: j.string().nullable().describe('External ticket ID, for example ST-ISH-24. Use with hdStatus when pageId is not available.'),
      hdStatus: j.string().nullable().describe('HD Status value to push. Use with extPageId when pageId is not available.'),
      dryRun: j.boolean().describe('When true, report the update that would happen without writing to BLOND:ISH.')
    }),
    outputSchema: j.object({
      pushed: j.boolean().describe('Whether the BLOND:ISH row was updated.'),
      skipped: j.boolean().describe('Whether the push was intentionally skipped.'),
      reason: j.string().describe('Skip reason or null.').nullable(),
      extPageId: j.string().describe('External ticket ID, for example ST-ISH-24.').nullable(),
      hdStatus: j.string().describe('HD Status from the mirror row.').nullable(),
      blondishStatus: j.string().describe('Mapped BLOND:ISH status.').nullable(),
      sourcePageId: j.string().describe('Matched BLOND:ISH source page UUID.').nullable(),
      dryRun: j.boolean().describe('Whether this was a dry run.')
    }),
    execute: async ({ pageId, extPageId, hdStatus, dryRun }, { notion }) => {
      if (extPageId && hdStatus) {
        return pushStatusFromMirrorValues({ extPageId, hdStatus }, dryRun);
      }
      if (!pageId) {
        return pushStatusSkip({ extPageId: null, hdStatus: null }, 'Provide pageId or extPageId + hdStatus.', dryRun);
      }
      const page = await notion.pages.retrieve({ page_id: pageId }) as NotionPage;
      return pushStatusFromMirrorPage(page, dryRun);
    }
  });
}

async function pushStatusFromAutomationEvent(event: AutomationEvent, dryRun: boolean): Promise<StatusPushResult> {
  if (!event.pageData) {
    return {
      pushed: false,
      skipped: true,
      reason: 'Automation did not provide pageData.',
      extPageId: null,
      hdStatus: null,
      blondishStatus: null,
      sourcePageId: null,
      dryRun
    };
  }
  return pushStatusFromMirrorPage(event.pageData as NotionPage, dryRun);
}

async function pushStatusFromMirrorPage(page: NotionPage, dryRun: boolean): Promise<StatusPushResult> {
  return pushStatusFromMirrorValues(
    {
      extPageId: readText(page, 'Ext Page ID') || null,
      hdStatus: readText(page, 'HD Status') || null
    },
    dryRun
  );
}

async function pushStatusFromMirrorValues(values: MirrorStatusValues, dryRun: boolean): Promise<StatusPushResult> {
  if (!isStatusPushEnabled() && !dryRun) {
    return pushStatusSkip(values, 'BLONDISH_DELIVERY_STATUS_PUSH_ENABLED is not true.', dryRun);
  }

  const extPageId = values.extPageId?.trim() ?? '';
  if (!extPageId) return pushStatusSkip(values, 'Missing Ext Page ID.', dryRun);

  const hdStatus = values.hdStatus?.trim() ?? '';
  const mappedStatus = HD_STATUS_TO_BLONDISH_STATUS[hdStatus];
  if (!mappedStatus) return pushStatusSkip(values, `HD Status "${hdStatus || 'blank'}" is not mapped.`, dryRun);

  const sourcePage = await findBlondishTicketByExtPageId(extPageId);
  if (!sourcePage) return pushStatusSkip(values, `No BLOND:ISH source ticket matched ${extPageId}.`, dryRun);

  const statusProperty = readOptionalEnv('BLONDISH_OS_STATUS_PROPERTY') ?? BLONDISH_SOURCE_STATUS_PROPERTY;
  const currentStatus = readText(sourcePage, statusProperty);
  if (currentStatus === mappedStatus) {
    return {
      pushed: false,
      skipped: true,
      reason: 'Mapped status already matches BLOND:ISH.',
      extPageId,
      hdStatus,
      blondishStatus: mappedStatus,
      sourcePageId: sourcePage.id,
      dryRun
    };
  }

  if (!dryRun) {
    await notionApi(`/pages/${sourcePage.id}`, {
      method: 'PATCH',
      body: {
        properties: {
          [statusProperty]: { status: { name: mappedStatus } }
        }
      }
    });
  }

  return {
    pushed: !dryRun,
    skipped: false,
    reason: dryRun ? 'Dry run only.' : null,
    extPageId,
    hdStatus,
    blondishStatus: mappedStatus,
    sourcePageId: sourcePage.id,
    dryRun
  };
}

function pushStatusSkip(values: MirrorStatusValues, reason: string, dryRun: boolean): StatusPushResult {
  const hdStatus = values.hdStatus?.trim() || null;
  const mappedStatus = hdStatus ? HD_STATUS_TO_BLONDISH_STATUS[hdStatus] ?? null : null;
  return {
    pushed: false,
    skipped: true,
    reason,
    extPageId: values.extPageId?.trim() || null,
    hdStatus,
    blondishStatus: mappedStatus,
    sourcePageId: null,
    dryRun
  };
}

async function queryBlondishTickets(): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let startCursor: string | null = null;
  const dataSourceId = readOptionalEnv('BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_ID') ?? BLONDISH_SOURCE_DATA_SOURCE_ID;
  do {
    const response: NotionListResponse<NotionPage> = await notionApi<NotionListResponse<NotionPage>>(
      `/data_sources/${dataSourceId}/query`,
      {
        method: 'POST',
        body: {
          page_size: 100,
          ...(startCursor ? { start_cursor: startCursor } : {})
        }
      }
    );
    pages.push(...(response.results ?? []).filter((page: NotionPage) => !page.archived));
    startCursor = response.has_more ? response.next_cursor ?? null : null;
  } while (startCursor);
  return pages;
}

async function findBlondishTicketByExtPageId(extPageId: string): Promise<NotionPage | null> {
  const pages = await queryBlondishTickets();
  return pages.find((page) => readText(page, 'Page ID') === extPageId) ?? null;
}

async function notionApi<T = Record<string, unknown>>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = readRequiredEnv('BLONDISH_NOTION_API_TOKEN');
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method: options.method ?? 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'notion-version': BLONDISH_API_VERSION
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });

  const text = await response.text();
  const parsed = text ? JSON.parse(text) as T & { message?: string } : {} as T;
  if (!response.ok) {
    throw new Error(parsed && typeof parsed === 'object' && 'message' in parsed ? String(parsed.message) : text);
  }
  return parsed;
}

function buildMirrorProperties(page: NotionPage, initializeHdStatus: boolean): Record<string, unknown> {
  const ticket = readText(page, 'Ticket');
  const details = readText(page, 'Details');
  const extPageId = readText(page, 'Page ID') || page.id;
  const externalUrl = readText(page, 'URL') || page.url || '';
  const files = readFiles(page, 'Files & Media');

  const properties: Record<string, unknown> = {
    Ticket: Builder.title(buildConciseTicketSummary(ticket, details)),
    'Ext Page ID': Builder.richText(extPageId),
    'External URL': externalUrl ? Builder.url(externalUrl) : [],
    'External Files & Media': Builder.richText(
      files.map((file) => file.url ? `${file.name}: ${file.url}` : `${file.name} (open source ticket)`).join('\n')
    ),
    'BLOND:ISH Status': Builder.select(readText(page, 'Status') || 'Submitted'),
    Client: Builder.richText('BLOND:ISH / Abracadabra'),
    Source: Builder.richText('BLOND:ISH Support Tickets [OS]'),
    Details: Builder.richText(truncateText(details, 1800)),
    'Created By': Builder.richText(readText(page, 'Created By') || 'Unknown'),
    'Source Last Edited': page.last_edited_time ? Builder.dateTime(page.last_edited_time) : [],
    'Sync Notes': Builder.richText('Synced from BLOND:ISH Support Tickets [OS]. Edit HD Status to push mapped progress back to BLOND:ISH.')
  };

  if (initializeHdStatus) {
    properties['HD Status'] = Builder.select('Not Started');
  }

  return properties;
}

function buildPageContentMarkdown(page: NotionPage): string {
  const createdBy = readText(page, 'Created By') || 'Unknown';
  const details = readText(page, 'Details') || 'No details provided.';
  return `**Created By:** ${createdBy}\n\n${details}`;
}

function buildConciseTicketSummary(ticket: string, details: string): string {
  const words = `${ticket} ${details}`
    .replace(/[\n\r\t]+/g, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/^[^\w]+|[^\w:.-]+$/g, ''))
    .filter(Boolean);
  return words.slice(0, 6).join(' ') || 'BLOND:ISH support ticket';
}

function readText(page: NotionPage, propertyName: string): string {
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
    default:
      return '';
  }
}

function readFiles(page: NotionPage, propertyName: string): Array<{ name: string; url?: string }> {
  const property = page.properties?.[propertyName];
  if (!property || property.type !== 'files' || !Array.isArray(property.files)) return [];
  return property.files.flatMap((file) => {
    if (!isRecord(file)) return [];
    const name = readString(file, 'name') || 'attachment';
    if (isRecord(file.external) && typeof file.external.url === 'string') return [{ name, url: file.external.url }];
    if (isRecord(file.file) && typeof file.file.url === 'string') return [{ name }];
    return [];
  });
}

function richTextToPlain(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value.map((entry) => readString(entry, 'plain_text')).join('').trim();
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

function truncateText(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function isStatusPushEnabled(): boolean {
  return readOptionalEnv('BLONDISH_DELIVERY_STATUS_PUSH_ENABLED') === 'true';
}

function shouldRegisterAutomationCapability(): boolean {
  return readOptionalEnv('NOTION_WORKER_AUTOMATIONS_ENABLED') === 'true';
}

function readSyncSchedule(): Schedule {
  const value = readOptionalEnv('BLONDISH_DELIVERY_TICKETS_SYNC_SCHEDULE') ?? '30m';
  if (value === 'continuous' || value === 'manual' || /^\d+[mhd]$/.test(value)) return value as Schedule;
  throw new Error(`Invalid BLONDISH_DELIVERY_TICKETS_SYNC_SCHEDULE: ${value}`);
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function readOptionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function readString(record: unknown, key: string): string {
  return isRecord(record) && typeof record[key] === 'string' ? record[key] : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
