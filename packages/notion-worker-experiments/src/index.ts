import { Worker } from '@notionhq/workers';
import * as Builder from '@notionhq/workers/builder';
import * as Schema from '@notionhq/workers/schema';
import { j } from '@notionhq/workers/schema-builder';
import { registerBlondishDeliveryTickets } from './blondish-delivery-tickets.js';

const worker = new Worker();

const exportedWorker = worker as typeof worker & { default: typeof worker };
exportedWorker.default = worker;

export default exportedWorker;

const linearApiPacer = worker.pacer('linearApi', {
  allowedRequests: 1,
  intervalMs: 1000
});

registerBlondishDeliveryTickets(worker);

const linearIssuesDatabase = worker.database('linearIssues', {
  type: 'managed',
  initialTitle: 'Linear Issues',
  primaryKeyProperty: 'Issue ID',
  schema: {
    properties: {
      Name: Schema.title(),
      'Issue ID': Schema.richText(),
      Identifier: Schema.richText(),
      URL: Schema.url(),
      Status: Schema.richText(),
      'Status Type': Schema.richText(),
      Priority: Schema.number(),
      'Priority Label': Schema.richText(),
      Assignee: Schema.richText(),
      Project: Schema.richText(),
      Team: Schema.richText(),
      Labels: Schema.richText(),
      Branch: Schema.richText(),
      Created: Schema.date(),
      Updated: Schema.date(),
      'Description Preview': Schema.richText()
    }
  }
});

worker.sync('linearIssuesSync', {
  database: linearIssuesDatabase,
  mode: 'replace',
  schedule: '30m',
  execute: async (state: LinearIssuesSyncState | undefined) => {
    await linearApiPacer.wait();

    const page = await fetchLinearIssues({
      after: state?.after ?? null,
      first: readLinearPageSize(),
      teamKey: readOptionalEnv('LINEAR_TEAM_KEY') ?? 'CRE'
    });

    const endCursor = page.pageInfo.endCursor ?? null;
    if (page.pageInfo.hasNextPage && !endCursor) {
      throw new Error('Linear pagination reported hasNextPage=true without an endCursor.');
    }

    return {
      changes: page.nodes.map((issue) => ({
        type: 'upsert' as const,
        key: issue.id,
        upstreamUpdatedAt: issue.updatedAt,
        properties: {
          Name: Builder.title(issue.title || issue.identifier || issue.id),
          'Issue ID': Builder.richText(issue.id),
          Identifier: Builder.richText(issue.identifier),
          URL: textValue(issue.url, Builder.url),
          Status: Builder.richText(issue.state?.name ?? ''),
          'Status Type': Builder.richText(issue.state?.type ?? ''),
          Priority: numberValue(issue.priority),
          'Priority Label': Builder.richText(priorityLabel(issue.priority)),
          Assignee: Builder.richText(issue.assignee?.name ?? ''),
          Project: Builder.richText(issue.project?.name ?? ''),
          Team: Builder.richText(issue.team ? `${issue.team.key} - ${issue.team.name}` : ''),
          Labels: Builder.richText(issue.labels.nodes.map((label) => label.name).join(', ')),
          Branch: Builder.richText(issue.branchName ?? ''),
          Created: dateTimeValue(issue.createdAt),
          Updated: dateTimeValue(issue.updatedAt),
          'Description Preview': Builder.richText(truncateText(issue.description ?? '', 1800))
        }
      })),
      hasMore: page.pageInfo.hasNextPage,
      nextState: page.pageInfo.hasNextPage ? { after: endCursor } : undefined
    };
  }
});

const plainTextSchema = j.object({
  text: j.string().describe('Plain text extracted from a Notion block.'),
  type: j.string().describe('The Notion block type that produced the text.')
});

const summarizePageTool = worker.tool('summarizePage', {
  title: 'Summarize Page',
  description:
    'Read a Notion page and return a compact preview of its title, URL, last edited time, and first content blocks. Use when the user asks a Custom Agent to inspect page context without making changes.',
  schema: j.object({
    pageId: j.string().describe('The Notion page ID to inspect.'),
    maxBlocks: j
      .integer()
      .describe('Maximum number of child blocks to include. Use null for the default of 5.')
      .nullable()
  }),
  outputSchema: j.object({
    pageId: j.string().describe('The page ID that was inspected.'),
    title: j.string().describe('Best-effort page title.'),
    url: j.string().describe('The Notion page URL, or null if unavailable.').nullable(),
    lastEditedTime: j
      .string()
      .describe('The Notion last edited timestamp, or null if unavailable.')
      .nullable(),
    blocks: j.array(plainTextSchema).describe('Plain-text preview of page child blocks.')
  }),
  execute: async ({ pageId, maxBlocks }, { notion }) => {
    const page = await notion.pages.retrieve({ page_id: pageId });
    const blockLimit = clampBlockLimit(maxBlocks ?? 5);
    const children = await notion.blocks.children.list({
      block_id: pageId,
      page_size: blockLimit
    });

    return {
      pageId,
      title: extractPageTitle(page),
      url: readString(page, 'url'),
      lastEditedTime: readString(page, 'last_edited_time'),
      blocks: children.results.map((block) => ({
        type: readString(block, 'type') ?? 'unknown',
        text: extractBlockText(block)
      }))
    };
  }
});

markReadOnly(summarizePageTool);

worker.tool('appendPolicyNote', {
  title: 'Append Policy Note',
  description:
    'Append a short policy or handoff note to a Notion page after the user explicitly asks to write that note. This tool changes page content and should not be used for read-only inspection.',
  schema: j.object({
    pageId: j.string().describe('The Notion page ID that should receive the note.'),
    heading: j.string().describe('Short heading for the note.'),
    note: j.string().describe('Plain-text note body to append.'),
    sourceUrl: j
      .string()
      .describe(
        'Optional source URL to include below the note. Use null when there is no source URL.'
      )
      .nullable()
  }),
  outputSchema: j.object({
    appended: j.boolean().describe('Whether the note append call succeeded.'),
    pageId: j.string().describe('The page ID that received the note.'),
    blockCount: j.integer().describe('Number of blocks requested in the append operation.')
  }),
  execute: async ({ pageId, heading, note, sourceUrl }, { notion }) => {
    const children = [
      paragraphBlock(`Policy note: ${heading}`),
      paragraphBlock(note),
      ...(sourceUrl ? [paragraphBlock(`Source: ${sourceUrl}`)] : [])
    ];

    await notion.blocks.children.append({
      block_id: pageId,
      children
    });

    return {
      appended: true,
      pageId,
      blockCount: children.length
    };
  }
});

function markReadOnly(capability: { config: object }): void {
  const config = capability.config as Record<string, unknown>;
  config.hints = { readOnlyHint: true };
}

const LINEAR_API_URL = 'https://api.linear.app/graphql';
const LINEAR_ISSUES_QUERY = `
  query NotionWorkerLinearIssues($first: Int!, $after: String, $filter: IssueFilter) {
    issues(first: $first, after: $after, orderBy: updatedAt, filter: $filter) {
      nodes {
        id
        identifier
        title
        description
        priority
        branchName
        url
        createdAt
        updatedAt
        state { name type }
        assignee { name }
        project { name }
        team { key name }
        labels { nodes { name } }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

type LinearIssuesSyncState = {
  after: string | null;
};

type LinearIssue = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: number;
  branchName: string | null;
  url: string;
  createdAt: string;
  updatedAt: string;
  state: {
    name: string;
    type: string;
  } | null;
  assignee: {
    name: string;
  } | null;
  project: {
    name: string;
  } | null;
  team: {
    key: string;
    name: string;
  } | null;
  labels: {
    nodes: Array<{ name: string }>;
  };
};

type LinearIssuesConnection = {
  nodes: LinearIssue[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
};

type LinearIssuesResponse = {
  issues: LinearIssuesConnection;
};

type LinearGraphqlPayload<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

async function fetchLinearIssues(options: {
  after: string | null;
  first: number;
  teamKey: string;
}): Promise<LinearIssuesConnection> {
  const filter = options.teamKey ? { team: { key: { eq: options.teamKey } } } : undefined;
  const data = await linearGraphql<LinearIssuesResponse>(LINEAR_ISSUES_QUERY, {
    after: options.after,
    filter,
    first: options.first
  });

  return data.issues;
}

async function linearGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = readOptionalEnv('LINEAR_API_KEY');
  if (!token) {
    throw new Error('LINEAR_API_KEY is required for linearIssuesSync.');
  }

  const response = await fetch(readOptionalEnv('LINEAR_API_URL') ?? LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token
    },
    body: JSON.stringify({ query, variables })
  });

  const payload = (await response.json()) as LinearGraphqlPayload<T>;
  if (!response.ok || payload.errors?.length || !payload.data) {
    const messages = payload.errors
      ?.map((error) => error.message)
      .filter((message): message is string => Boolean(message))
      .join('; ');
    throw new Error(
      `Linear GraphQL request failed with HTTP ${response.status}${messages ? `: ${messages}` : ''}`
    );
  }

  return payload.data;
}

function readOptionalEnv(key: string): string | null {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

function readLinearPageSize(): number {
  const value = Number(readOptionalEnv('LINEAR_SYNC_PAGE_SIZE') ?? 100);
  if (!Number.isFinite(value)) return 100;
  return Math.min(Math.max(Math.trunc(value), 1), 250);
}

function textValue(
  value: string | null | undefined,
  builder: (value: string) => ReturnType<typeof Builder.richText>
) {
  return value ? builder(value) : [];
}

function numberValue(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? Builder.number(value) : [];
}

function dateTimeValue(value: string | null | undefined) {
  return value && !Number.isNaN(Date.parse(value)) ? Builder.dateTime(value) : [];
}

function priorityLabel(priority: number | null | undefined): string {
  switch (priority) {
    case 1:
      return 'Urgent';
    case 2:
      return 'High';
    case 3:
      return 'Medium';
    case 4:
      return 'Low';
    case 0:
      return 'No priority';
    default:
      return '';
  }
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function clampBlockLimit(value: number): number {
  if (!Number.isFinite(value)) return 5;
  return Math.min(Math.max(Math.trunc(value), 1), 25);
}

function extractPageTitle(page: unknown): string {
  const properties = readRecord(page, 'properties');
  if (!properties) return 'Untitled';

  for (const property of Object.values(properties)) {
    const value = property as Record<string, unknown>;
    if (value.type !== 'title') continue;
    const title = richTextToPlain(value.title);
    if (title) return title;
  }

  return 'Untitled';
}

function extractBlockText(block: unknown): string {
  const record = asRecord(block);
  const type = readString(record, 'type');
  if (!type) return '';

  const payload = readRecord(record, type);
  if (!payload) return '';

  return (
    richTextToPlain(payload.rich_text) ||
    richTextToPlain(payload.title) ||
    richTextToPlain(payload.caption) ||
    readString(payload, 'plain_text') ||
    ''
  );
}

function richTextToPlain(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value
    .map((item) => {
      if (!isRecord(item)) return '';
      return readString(item, 'plain_text') ?? '';
    })
    .join('')
    .trim();
}

function paragraphBlock(content: string) {
  return {
    object: 'block' as const,
    type: 'paragraph' as const,
    paragraph: {
      rich_text: [
        {
          type: 'text' as const,
          text: { content }
        }
      ]
    }
  };
}

function readRecord(source: unknown, key: string): Record<string, unknown> | null {
  const record = asRecord(source);
  const value = record[key];
  return isRecord(value) ? value : null;
}

function readString(source: unknown, key: string): string | null {
  const record = asRecord(source);
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function asRecord(source: unknown): Record<string, unknown> {
  return isRecord(source) ? source : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
