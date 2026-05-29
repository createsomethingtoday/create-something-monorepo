import type { Env, NotionPageSummary, NotionWriteResult, ParsedTranscript, TranscriptCandidate } from './types';

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const MAX_RICH_TEXT_CONTENT = 1900;
const MAX_BLOCKS_PER_REQUEST = 100;
const DEFAULT_STATUS = 'Active';
const DEFAULT_SOURCE = 'Internal';
const DEFAULT_TYPE = 'Meeting';
const DEFAULT_ATTENDEES_PROPERTY = 'Attendees';

type BlockObject = Record<string, unknown>;
type PageObject = Record<string, any>;

interface QueryResult {
  results: PageObject[];
  has_more?: boolean;
  next_cursor?: string | null;
}

interface BlockListResult {
  results: BlockObject[];
  has_more?: boolean;
  next_cursor?: string | null;
}

interface HubRpcPayload {
  result?: HubToolResult;
  error?: unknown;
}

interface HubToolResult {
  isError?: boolean;
  content?: Array<{ type?: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
}

interface NotionTransport {
  queryDatabase(filter: unknown, pageSize: number): Promise<QueryResult>;
  getPage(pageId: string): Promise<PageObject>;
  createPage(properties: Record<string, unknown>): Promise<PageObject>;
  updatePage(pageId: string, properties: Record<string, unknown>): Promise<PageObject>;
  appendBlocks(blockId: string, children: BlockObject[]): Promise<void>;
  listBlockChildren(blockId: string, startCursor?: string): Promise<BlockListResult>;
}

export async function syncTranscriptToNotion(
  env: Env,
  candidate: TranscriptCandidate,
  parsedTranscript: ParsedTranscript,
  transcriptHash: string,
  existingPageHint?: { pageId: string; pageUrl: string | null } | null,
): Promise<NotionWriteResult> {
  const notion = createNotionTransport(env);
  const existing = await resolveExistingMeetingPage(notion, candidate, existingPageHint);
  const properties = buildPageProperties(env, candidate, parsedTranscript);
  const transcriptBlocks = buildTranscriptBlocks(parsedTranscript);

  if (!existing) {
    const page = await notion.createPage(properties);
    if (!page || typeof page.id !== 'string') {
      throw new Error(`Unexpected create_page response: ${safeJson(page)}`);
    }
    if (transcriptBlocks.length > 0) {
      await appendBatchedBlocks(notion, page.id, transcriptBlocks);
    }
    return {
      pageId: page.id,
      pageUrl: page.url ?? notionUrl(page.id),
      action: 'created',
    };
  }

  await notion.updatePage(existing.id, properties);
  const existingBodyText = await getAllBlockText(notion, existing.id);
  const existingNormalized = normalizeComparableText(existingBodyText);
  const transcriptNormalized = normalizeComparableText(parsedTranscript.plainText);

  if (transcriptNormalized.length > 120 && existingNormalized.includes(transcriptNormalized.slice(0, Math.min(400, transcriptNormalized.length)))) {
    return {
      pageId: existing.id,
      pageUrl: existing.url,
      action: 'skipped',
      reason: `Transcript hash ${transcriptHash} already present in page body`,
    };
  }

  if (transcriptBlocks.length > 0) {
    await appendBatchedBlocks(notion, existing.id, transcriptBlocks);
  }

  return {
    pageId: existing.id,
    pageUrl: existing.url,
    action: 'updated',
  };
}

async function resolveExistingMeetingPage(
  notion: NotionTransport,
  candidate: TranscriptCandidate,
  existingPageHint?: { pageId: string; pageUrl: string | null } | null,
): Promise<NotionPageSummary | null> {
  if (existingPageHint) {
    const hintedPage = toPageSummary(await notion.getPage(existingPageHint.pageId));
    if (isMatchingMeetingPageHint(hintedPage, candidate)) {
      return {
        ...hintedPage,
        url: existingPageHint.pageUrl ?? hintedPage.url,
      };
    }

    console.warn(
      `Ignoring stale Notion page hint ${existingPageHint.pageId} for ${candidate.meetingTitle} on ${candidate.meetingDate}; ` +
      `hint resolved to ${hintedPage.title} on ${hintedPage.date ?? 'unknown date'}.`,
    );
  }

  return findExistingMeetingPage(notion, candidate);
}

function createNotionTransport(env: Env): NotionTransport {
  const mode = resolveWriteMode(env);
  if (mode === 'hub') {
    return new HubNotionTransport(env);
  }
  return new DirectNotionTransport(env);
}

async function findExistingMeetingPage(
  notion: NotionTransport,
  candidate: TranscriptCandidate,
): Promise<NotionPageSummary | null> {
  if (candidate.sourceUrl) {
    const directUrlMatch = await notion.queryDatabase(
      {
        property: 'Source URL',
        url: { equals: candidate.sourceUrl },
      },
      5,
    );

    const matched = pickSourceUrlMatch(directUrlMatch.results, candidate);
    if (matched) return matched;
  }

  const titleDateMatch = await notion.queryDatabase(
    {
      and: [
        {
          property: 'Item',
          title: { equals: candidate.meetingTitle },
        },
        {
          property: 'Date',
          date: { equals: candidate.meetingDate },
        },
      ],
    },
    10,
  );

  return pickTitleDateMatch(titleDateMatch.results, candidate);
}

function pickSourceUrlMatch(pages: PageObject[], candidate: TranscriptCandidate): NotionPageSummary | null {
  if (!candidate.sourceUrl) return null;

  for (const page of pages) {
    const summary = toPageSummary(page);
    if (summary.sourceUrl === candidate.sourceUrl && summary.date === candidate.meetingDate) {
      return summary;
    }
  }

  return null;
}

function pickTitleDateMatch(pages: PageObject[], candidate: TranscriptCandidate): NotionPageSummary | null {
  const matchingPages = pages
    .map((page) => toPageSummary(page))
    .filter((summary) => summary.title === candidate.meetingTitle && summary.date === candidate.meetingDate);

  if (!matchingPages.length) {
    return null;
  }

  const exactSourceUrl = candidate.sourceUrl
    ? matchingPages.find((summary) => summary.sourceUrl === candidate.sourceUrl) ?? null
    : null;
  if (exactSourceUrl) {
    return exactSourceUrl;
  }

  const emptySourceUrl = matchingPages.find((summary) => !summary.sourceUrl);
  if (emptySourceUrl) {
    return emptySourceUrl;
  }

  if (hasOccurrenceFragment(candidate.sourceUrl)) {
    return null;
  }

  return matchingPages.find((summary) => summary.sourceUrl?.includes('/recording/management/detail?meeting_id=')) ?? null;
}

function isMatchingMeetingPageHint(summary: NotionPageSummary, candidate: TranscriptCandidate): boolean {
  return summary.title === candidate.meetingTitle && summary.date === candidate.meetingDate;
}

function hasOccurrenceFragment(sourceUrl: string | null): boolean {
  return sourceUrl?.includes('#occurrence=') ?? false;
}

function buildPageProperties(
  env: Env,
  candidate: TranscriptCandidate,
  parsedTranscript: ParsedTranscript,
): Record<string, unknown> {
  const attendees = parsedTranscript.speakers.join(', ');
  const attendeesProperty = env.NOTION_ATTENDEES_PROPERTY?.trim() || DEFAULT_ATTENDEES_PROPERTY;

  const properties: Record<string, unknown> = {
    Item: {
      title: [
        {
          text: {
            content: truncate(candidate.meetingTitle, MAX_RICH_TEXT_CONTENT),
          },
        },
      ],
    },
    Date: {
      date: {
        start: candidate.meetingDate,
      },
    },
    Status: {
      select: {
        name: env.NOTION_DEFAULT_STATUS?.trim() || DEFAULT_STATUS,
      },
    },
    Source: {
      select: {
        name: env.NOTION_DEFAULT_SOURCE?.trim() || DEFAULT_SOURCE,
      },
    },
    Type: {
      select: {
        name: env.NOTION_DEFAULT_TYPE?.trim() || DEFAULT_TYPE,
      },
    },
  };

  if (candidate.sourceUrl) {
    properties['Source URL'] = { url: candidate.sourceUrl };
  }

  if (attendees) {
    properties[attendeesProperty] = {
      rich_text: [
        {
          text: {
            content: truncate(attendees, MAX_RICH_TEXT_CONTENT),
          },
        },
      ],
    };
  }

  return properties;
}

function buildTranscriptBlocks(parsedTranscript: ParsedTranscript): BlockObject[] {
  if (!parsedTranscript.plainText.trim()) {
    return [];
  }

  const blocks: BlockObject[] = [
    {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [
          {
            type: 'text',
            text: { content: '📝 FULL TRANSCRIPT' },
          },
        ],
      },
    },
  ];

  if (parsedTranscript.segments.length > 0) {
    for (const segment of parsedTranscript.segments) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [
            {
              type: 'text',
              text: { content: segment.timestamp },
            },
          ],
        },
      });

      for (const chunk of chunkText(segment.text)) {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content: chunk },
              },
            ],
          },
        });
      }
    }

    return blocks;
  }

  for (const chunk of chunkText(parsedTranscript.plainText)) {
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: { content: chunk },
          },
        ],
      },
    });
  }

  return blocks;
}

async function appendBatchedBlocks(notion: NotionTransport, pageId: string, blocks: BlockObject[]): Promise<void> {
  for (let cursor = 0; cursor < blocks.length; cursor += MAX_BLOCKS_PER_REQUEST) {
    const batch = blocks.slice(cursor, cursor + MAX_BLOCKS_PER_REQUEST);
    await notion.appendBlocks(pageId, batch);
  }
}

async function getAllBlockText(notion: NotionTransport, blockId: string): Promise<string> {
  const parts: string[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.listBlockChildren(blockId, cursor);
    for (const block of response.results) {
      const text = extractBlockText(block);
      if (text) parts.push(text);

      if (block.has_children === true && typeof block.id === 'string') {
        const childText = await getAllBlockText(notion, block.id);
        if (childText) parts.push(childText);
      }
    }
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return parts.join('\n');
}

function extractBlockText(block: BlockObject): string {
  const type = typeof block.type === 'string' ? block.type : '';
  const typed = block[type] as { rich_text?: Array<{ plain_text?: string; text?: { content?: string } }> } | undefined;
  const richText = Array.isArray(typed?.rich_text) ? typed.rich_text : [];
  return richText
    .map((entry) => entry.plain_text ?? entry.text?.content ?? '')
    .join('')
    .trim();
}

function toPageSummary(page: PageObject): NotionPageSummary {
  const title = page.properties?.Item?.title?.[0]?.plain_text
    ?? page.properties?.title?.title?.[0]?.plain_text
    ?? 'Untitled';

  return {
    id: page.id,
    url: page.url ?? notionUrl(page.id),
    title,
    sourceUrl: page.properties?.['Source URL']?.url ?? null,
    date: page.properties?.Date?.date?.start?.slice?.(0, 10) ?? null,
  };
}

export const notionTestExports = {
  hasOccurrenceFragment,
  isMatchingMeetingPageHint,
  pickSourceUrlMatch,
  pickTitleDateMatch,
};

function resolveWriteMode(env: Env): 'api' | 'hub' {
  const configured = env.NOTION_WRITE_MODE?.trim();
  if (configured === 'api' || configured === 'hub') {
    return configured;
  }

  if (env.NOTION_HUB_URL?.trim() && env.NOTION_HUB_API_TOKEN?.trim() && env.NOTION_HUB_PROXY_TOOL?.trim()) {
    return 'hub';
  }

  return 'api';
}

function chunkText(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let remaining = normalized;

  while (remaining.length > MAX_RICH_TEXT_CONTENT) {
    let splitAt = remaining.lastIndexOf('. ', MAX_RICH_TEXT_CONTENT);
    if (splitAt < MAX_RICH_TEXT_CONTENT * 0.5) {
      splitAt = remaining.lastIndexOf(' ', MAX_RICH_TEXT_CONTENT);
    }
    if (splitAt < MAX_RICH_TEXT_CONTENT * 0.25) {
      splitAt = MAX_RICH_TEXT_CONTENT;
    }

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function normalizeComparableText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function notionUrl(pageId: string): string {
  return `https://www.notion.so/${pageId.replace(/-/g, '')}`;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function extractUnknownPropertyName(message: string): string | null {
  const match = message.match(/"message":"(.+?) is not a property that exists\."/);
  return match?.[1] ?? null;
}

function omitProperty(properties: Record<string, unknown>, propertyName: string): Record<string, unknown> {
  const next = { ...properties };
  delete next[propertyName];
  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractHubText(result: HubToolResult | undefined): string | null {
  if (!result?.content || !Array.isArray(result.content)) {
    return null;
  }

  const parts = result.content
    .map((entry) => (typeof entry?.text === 'string' ? entry.text.trim() : ''))
    .filter(Boolean);

  return parts.length ? parts.join('\n') : null;
}

function unwrapHubPayload(value: Record<string, unknown>): Record<string, unknown> {
  const nestedData = isRecord(value.data) ? value.data : null;
  if (nestedData && isRecord(nestedData.data)) {
    return nestedData.data;
  }
  if (nestedData) {
    return nestedData;
  }
  return value;
}

function formatHubToolError(action: string, result: HubToolResult): string {
  const text = extractHubText(result) ?? `Hub proxy call "${action}" failed without a text payload.`;
  if (!isRecord(result.structuredContent) || Object.keys(result.structuredContent).length === 0) {
    return `Hub proxy call "${action}" failed: ${text}`;
  }
  return `Hub proxy call "${action}" failed: ${text} (${safeJson(result.structuredContent)})`;
}

function isHubVisibilityError(message: string, proxyToolName: string): boolean {
  return message.includes(`Proxy tool "${proxyToolName}" is unknown or not visible for this session.`);
}

class DirectNotionTransport implements NotionTransport {
  private readonly apiKey: string;
  private readonly databaseId: string;
  private readonly optionalPropertyFallbacks: Set<string>;

  constructor(env: Env) {
    if (!env.NOTION_API_KEY?.trim()) {
      throw new Error('NOTION_API_KEY is required when NOTION_WRITE_MODE=api.');
    }
    this.apiKey = env.NOTION_API_KEY.trim();
    this.databaseId = env.NOTION_DATABASE_ID.trim();
    this.optionalPropertyFallbacks = new Set(
      [DEFAULT_ATTENDEES_PROPERTY, env.NOTION_ATTENDEES_PROPERTY?.trim()]
        .filter((value): value is string => Boolean(value)),
    );
  }

  async queryDatabase(filter: unknown, pageSize: number): Promise<QueryResult> {
    return this.request<QueryResult>(`/databases/${this.databaseId}/query`, 'POST', {
      filter,
      page_size: pageSize,
    });
  }

  getPage(pageId: string): Promise<PageObject> {
    return this.request<PageObject>(`/pages/${pageId}`);
  }

  async createPage(properties: Record<string, unknown>): Promise<PageObject> {
    return this.requestWithOptionalPropertyFallback<PageObject>(
      '/pages',
      'POST',
      properties,
      (nextProperties) => ({
        parent: { database_id: this.databaseId },
        properties: nextProperties,
      }),
    );
  }

  async updatePage(pageId: string, properties: Record<string, unknown>): Promise<PageObject> {
    return this.requestWithOptionalPropertyFallback<PageObject>(
      `/pages/${pageId}`,
      'PATCH',
      properties,
      (nextProperties) => ({ properties: nextProperties }),
    );
  }

  async appendBlocks(blockId: string, children: BlockObject[]): Promise<void> {
    await this.request(`/blocks/${blockId}/children`, 'PATCH', { children });
  }

  async listBlockChildren(blockId: string, startCursor?: string): Promise<BlockListResult> {
    const url = new URL(`${NOTION_API_BASE}/blocks/${blockId}/children`);
    url.searchParams.set('page_size', '100');
    if (startCursor) url.searchParams.set('start_cursor', startCursor);
    return this.requestWithUrl<BlockListResult>(url.toString(), 'GET');
  }

  private async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    return this.requestWithUrl<T>(`${NOTION_API_BASE}${path}`, method, body);
  }

  private async requestWithOptionalPropertyFallback<T>(
    path: string,
    method: string,
    properties: Record<string, unknown>,
    buildBody: (properties: Record<string, unknown>) => unknown,
  ): Promise<T> {
    let nextProperties = properties;
    const skippedProperties = new Set<string>();

    while (true) {
      try {
        return await this.request<T>(path, method, buildBody(nextProperties));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const unknownProperty = extractUnknownPropertyName(message);
        if (
          !unknownProperty
          || skippedProperties.has(unknownProperty)
          || !(unknownProperty in nextProperties)
          || !this.optionalPropertyFallbacks.has(unknownProperty)
        ) {
          throw error;
        }

        console.warn(`Skipping unknown Notion property "${unknownProperty}" on ${method} ${path}`);
        nextProperties = omitProperty(nextProperties, unknownProperty);
        skippedProperties.add(unknownProperty);
      }
    }
  }

  private async requestWithUrl<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`Notion API error (${response.status}) on ${url}: ${payload}`);
    }

    return response.json<T>();
  }
}

class HubNotionTransport implements NotionTransport {
  private readonly hubUrl: string;
  private readonly hubToken: string;
  private readonly proxyToolName: string;
  private readonly databaseId: string;

  constructor(env: Env) {
    if (!env.NOTION_HUB_URL?.trim() || !env.NOTION_HUB_API_TOKEN?.trim() || !env.NOTION_HUB_PROXY_TOOL?.trim()) {
      throw new Error('Hub-backed Notion writes require NOTION_HUB_URL, NOTION_HUB_API_TOKEN, and NOTION_HUB_PROXY_TOOL.');
    }

    this.hubUrl = env.NOTION_HUB_URL.trim();
    this.hubToken = env.NOTION_HUB_API_TOKEN.trim();
    this.proxyToolName = env.NOTION_HUB_PROXY_TOOL.trim();
    this.databaseId = env.NOTION_DATABASE_ID.trim();
  }

  async queryDatabase(filter: unknown, pageSize: number): Promise<QueryResult> {
    const data = await this.call<QueryResult>('query_database', {
      database_id: this.databaseId,
      filter,
      page_size: pageSize,
    });
    return {
      results: Array.isArray(data.results) ? data.results : [],
      has_more: Boolean(data.has_more),
      next_cursor: typeof data.next_cursor === 'string' ? data.next_cursor : null,
    };
  }

  getPage(pageId: string): Promise<PageObject> {
    return this.call<PageObject>('get_page', {
      page_id: pageId,
    });
  }

  createPage(properties: Record<string, unknown>): Promise<PageObject> {
    return this.call<PageObject>('create_page', {
      database_id: this.databaseId,
      properties: toComposioPropertyList(properties),
    });
  }

  updatePage(pageId: string, properties: Record<string, unknown>): Promise<PageObject> {
    return this.call<PageObject>('update_page', {
      page_id: pageId,
      properties,
    });
  }

  async appendBlocks(blockId: string, children: BlockObject[]): Promise<void> {
    await this.call('append_blocks', {
      block_id: blockId,
      children,
    });
  }

  async listBlockChildren(blockId: string, startCursor?: string): Promise<BlockListResult> {
    const data = await this.call<BlockListResult>('list_block_children', {
      block_id: blockId,
      page_size: 100,
      ...(startCursor ? { start_cursor: startCursor } : {}),
    });
    return {
      results: Array.isArray(data.results) ? data.results : [],
      has_more: Boolean(data.has_more),
      next_cursor: typeof data.next_cursor === 'string' ? data.next_cursor : null,
    };
  }

  private async call<T>(action: string, args: Record<string, unknown>): Promise<T> {
    try {
      return await this.callViaHubTool<T>('hub_execute_proxy_tool', {
        proxyToolName: this.proxyToolName,
        args: {
          action,
          args,
        },
      }, action);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isHubVisibilityError(message, this.proxyToolName)) {
        throw error;
      }

      return this.callViaHubTool<T>(this.proxyToolName, {
        action,
        args,
      }, action);
    }
  }

  private async callViaHubTool<T>(
    toolName: string,
    toolArgs: Record<string, unknown>,
    action: string,
  ): Promise<T> {
    const response = await fetch(this.hubUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.hubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: toolArgs,
        },
      }),
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`Hub Notion request failed (${response.status}): ${payload}`);
    }

    const payload = await response.json<HubRpcPayload>();
    if (payload.error) {
      throw new Error(`Hub RPC error: ${JSON.stringify(payload.error)}`);
    }

    const result = payload.result;
    if (!result) {
      throw new Error(`Hub response for action "${action}" did not contain a result.`);
    }

    if (result.isError) {
      throw new Error(formatHubToolError(action, result));
    }

    if (isRecord(result.structuredContent)) {
      return unwrapHubPayload(result.structuredContent) as T;
    }

    const text = extractHubText(result);
    if (!text) {
      throw new Error(`Hub response for action "${action}" did not contain a JSON payload.`);
    }

    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (!isRecord(parsed)) {
        throw new Error(`Hub response for action "${action}" was JSON but not an object.`);
      }
      return unwrapHubPayload(parsed) as T;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Hub response for action "${action}" was not JSON: ${text} (${reason})`);
    }
  }
}

function toComposioPropertyList(properties: Record<string, unknown>): Array<{ name: string; type: string; value: string }> {
  const rows: Array<{ name: string; type: string; value: string }> = [];

  for (const [name, property] of Object.entries(properties)) {
    if (!property || typeof property !== 'object') continue;

    const typed = property as Record<string, any>;
    if (Array.isArray(typed.title)) {
      const value = typed.title.map((entry) => entry?.text?.content ?? entry?.plain_text ?? '').join('').trim();
      if (value) rows.push({ name, type: 'title', value });
      continue;
    }

    if (typed.date?.start) {
      rows.push({ name, type: 'date', value: String(typed.date.start) });
      continue;
    }

    if (typed.select?.name) {
      rows.push({ name, type: 'select', value: String(typed.select.name) });
      continue;
    }

    if (typeof typed.url === 'string' && typed.url.trim()) {
      rows.push({ name, type: 'url', value: typed.url.trim() });
      continue;
    }

    if (Array.isArray(typed.rich_text)) {
      const value = typed.rich_text.map((entry) => entry?.text?.content ?? entry?.plain_text ?? '').join('').trim();
      if (value) rows.push({ name, type: 'rich_text', value });
    }
  }

  return rows;
}
