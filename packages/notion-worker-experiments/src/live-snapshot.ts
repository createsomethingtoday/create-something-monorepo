import { Client } from '@notionhq/client';
import { readFile, writeFile } from 'node:fs/promises';

import type {
  AgencyOpsFinding,
  AgencyOpsSnapshot,
  LinearIssueSnapshot,
  NotionDeliverableSnapshot,
  NotionEngagementSnapshot,
  NotionTaskSnapshot
} from './reconciliation.js';

export type AgencyOpsDatabaseIds = {
  deliverables: string;
  engagements: string;
  tasks: string;
};

type CreatePageParameters = Parameters<Client['pages']['create']>[0];

export const DEFAULT_AGENCY_OPS_DATABASE_IDS: AgencyOpsDatabaseIds = {
  tasks: 'b8adfc95-d7df-4543-8062-6e4adafb5bfb',
  deliverables: 'edce1303-8c32-4995-ade9-05c45494ad82',
  engagements: '6300d744-49d8-41c8-bbbd-cb78d7bfaab5'
};

const LINEAR_API_URL = 'https://api.linear.app/graphql';
const LINEAR_ISSUES_QUERY = `
  query AgencyOpsReconciliationLinearIssues($first: Int!, $after: String, $filter: IssueFilter) {
    issues(first: $first, after: $after, orderBy: updatedAt, filter: $filter) {
      nodes {
        id
        identifier
        title
        priority
        url
        createdAt
        updatedAt
        state { name type }
        project { name }
        labels { nodes { name } }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export type LiveSnapshotOptions = {
  notionToken?: string;
  linearApiKey?: string;
  linearApiUrl?: string;
  linearTeamKey?: string;
  linearPageSize?: number;
  databaseIds?: Partial<AgencyOpsDatabaseIds>;
};

export type SuggestionWriteOptions = {
  notionToken?: string;
  tasksDatabaseId?: string;
  ownerUserId?: string | null;
  workstreamId?: string | null;
  maxSuggestions?: number;
};

export type SuggestionWriteResult = {
  created: number;
  skipped: number;
  actions: string[];
};

type QueryDatabaseResult = {
  results?: unknown[];
  has_more?: boolean;
  next_cursor?: string | null;
};

type NotionPage = {
  id?: string;
  properties?: Record<string, unknown>;
};

type LinearIssueNode = {
  id?: string;
  identifier: string;
  title: string;
  url: string;
  updatedAt?: string | null;
  state?: {
    name?: string | null;
    type?: string | null;
  } | null;
  project?: {
    name?: string | null;
  } | null;
  labels?: {
    nodes?: Array<{ name?: string | null }>;
  } | null;
};

type LinearIssuesResponse = {
  issues: {
    nodes: LinearIssueNode[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
};

type LinearGraphqlPayload<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

export async function loadAgencyOpsLiveSnapshot(
  options: LiveSnapshotOptions = {}
): Promise<AgencyOpsSnapshot> {
  const notionToken = options.notionToken ?? readRequiredEnv('NOTION_API_TOKEN');
  const linearApiKey = options.linearApiKey ?? readRequiredEnv('LINEAR_API_KEY');
  const databaseIds = {
    ...DEFAULT_AGENCY_OPS_DATABASE_IDS,
    ...definedValues(options.databaseIds)
  };
  const notion = new Client({ auth: notionToken });

  const [notionTasks, deliverables, engagements, linearIssues] = await Promise.all([
    fetchNotionTasks(notion, databaseIds.tasks),
    fetchNotionDeliverables(notion, databaseIds.deliverables),
    fetchNotionEngagements(notion, databaseIds.engagements),
    fetchLinearIssues({
      apiKey: linearApiKey,
      apiUrl: options.linearApiUrl,
      pageSize: options.linearPageSize,
      teamKey: options.linearTeamKey
    })
  ]);

  return {
    linearIssues,
    notionTasks,
    deliverables,
    engagements
  };
}

export async function writeSnapshot(path: string, snapshot: AgencyOpsSnapshot): Promise<void> {
  await writeFile(path, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
}

export async function loadSnapshotFile(path: string): Promise<AgencyOpsSnapshot> {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw) as AgencyOpsSnapshot;
}

export async function createAgencyOpsSuggestionTasks(
  findings: AgencyOpsFinding[],
  options: SuggestionWriteOptions = {}
): Promise<SuggestionWriteResult> {
  const notionToken = options.notionToken ?? readRequiredEnv('NOTION_API_TOKEN');
  const tasksDatabaseId = options.tasksDatabaseId ?? DEFAULT_AGENCY_OPS_DATABASE_IDS.tasks;
  const maxSuggestions = options.maxSuggestions ?? 10;
  const notion = new Client({ auth: notionToken });
  const actions: string[] = [];
  let created = 0;
  let skipped = 0;

  for (const finding of findings.slice(0, maxSuggestions)) {
    const action = buildSuggestionAction(finding);
    const exists = await taskActionExists(notion, tasksDatabaseId, action);
    if (exists) {
      skipped += 1;
      actions.push(action);
      continue;
    }

    await notion.pages.create({
      parent: { database_id: tasksDatabaseId },
      properties: buildSuggestionProperties(finding, action, options) as CreatePageParameters['properties'],
      children: [
        paragraphBlock(finding.detail),
        paragraphBlock(`Suggested action: ${finding.suggestedAction}`),
        paragraphBlock(`References: ${finding.references.filter(Boolean).join(', ') || 'None'}`)
      ]
    });

    created += 1;
    actions.push(action);
  }

  return { actions, created, skipped };
}

async function fetchNotionTasks(
  notion: Client,
  databaseId: string
): Promise<NotionTaskSnapshot[]> {
  const rows = await queryAllDatabaseRows(notion, databaseId);
  return rows.map((page) => {
    const properties = page.properties ?? {};
    return {
      action: readTitle(properties.Action),
      status: readNamedValue(properties.Status),
      source: readNamedValue(properties.Source),
      linearIssueUrl: readUrl(properties['Linear issue URL']),
      reviewed: readCheckbox(properties.Reviewed)
    };
  });
}

async function fetchNotionDeliverables(
  notion: Client,
  databaseId: string
): Promise<NotionDeliverableSnapshot[]> {
  const rows = await queryAllDatabaseRows(notion, databaseId);
  return rows.map((page) => {
    const properties = page.properties ?? {};
    return {
      evidenceCount: readRelationCount(properties.Evidence),
      name: readTitle(properties.Deliverable),
      owner: readPeopleNames(properties.Owner),
      status: readNamedValue(properties.Status)
    };
  });
}

async function fetchNotionEngagements(
  notion: Client,
  databaseId: string
): Promise<NotionEngagementSnapshot[]> {
  const rows = await queryAllDatabaseRows(notion, databaseId);
  return rows.map((page) => {
    const properties = page.properties ?? {};
    return {
      lastPmReview: readDateStart(properties['Last PM review']),
      name: readTitle(properties.Name),
      status: readNamedValue(properties.Status),
      taskCount: readRelationCount(properties['Tasks / Actions'])
    };
  });
}

async function queryAllDatabaseRows(notion: Client, databaseId: string): Promise<NotionPage[]> {
  const rows: NotionPage[] = [];
  let startCursor: string | undefined;

  do {
    const response = (await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
      start_cursor: startCursor
    })) as QueryDatabaseResult;

    rows.push(...((response.results ?? []) as NotionPage[]));
    startCursor = response.next_cursor ?? undefined;
    if (!response.has_more) break;
  } while (startCursor);

  return rows;
}

async function fetchLinearIssues(options: {
  apiKey: string;
  apiUrl?: string;
  pageSize?: number;
  teamKey?: string;
}): Promise<LinearIssueSnapshot[]> {
  const issues: LinearIssueSnapshot[] = [];
  const first = clampPageSize(options.pageSize ?? readNumberEnv('LINEAR_SYNC_PAGE_SIZE') ?? 100);
  const filter = options.teamKey ?? readOptionalEnv('LINEAR_TEAM_KEY') ?? 'CRE';
  let after: string | null = null;

  do {
    const payload: LinearIssuesResponse = await linearGraphql<LinearIssuesResponse>({
      apiKey: options.apiKey,
      apiUrl: options.apiUrl ?? readOptionalEnv('LINEAR_API_URL') ?? LINEAR_API_URL,
      query: LINEAR_ISSUES_QUERY,
      variables: {
        after,
        filter: filter ? { team: { key: { eq: filter } } } : undefined,
        first
      }
    });

    issues.push(...payload.issues.nodes.map(mapLinearIssue));
    after = payload.issues.pageInfo.hasNextPage ? payload.issues.pageInfo.endCursor : null;
  } while (after);

  return issues;
}

async function linearGraphql<T>(options: {
  apiKey: string;
  apiUrl: string;
  query: string;
  variables: Record<string, unknown>;
}): Promise<T> {
  const response = await fetch(options.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: options.apiKey
    },
    body: JSON.stringify({ query: options.query, variables: options.variables })
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

function mapLinearIssue(issue: LinearIssueNode): LinearIssueSnapshot {
  return {
    id: issue.id,
    identifier: issue.identifier,
    labels:
      issue.labels?.nodes
        ?.map((label) => label.name)
        .filter((label): label is string => Boolean(label)) ?? [],
    project: issue.project?.name ?? null,
    status: issue.state?.name ?? '',
    statusType: issue.state?.type ?? '',
    title: issue.title,
    updated: issue.updatedAt ?? null,
    url: issue.url
  };
}

async function taskActionExists(
  notion: Client,
  databaseId: string,
  action: string
): Promise<boolean> {
  const response = (await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'Action',
      title: {
        equals: action
      }
    },
    page_size: 1
  })) as QueryDatabaseResult;

  return Boolean(response.results?.length);
}

function buildSuggestionAction(finding: AgencyOpsFinding): string {
  const title = `Review: ${finding.title}`;
  return title.length <= 180 ? title : `${title.slice(0, 177)}...`;
}

function buildSuggestionProperties(
  finding: AgencyOpsFinding,
  action: string,
  options: SuggestionWriteOptions
) {
  const linearUrl = finding.references.find((reference) => reference.includes('linear.app'));
  return {
    Action: titleProperty(action),
    'Agent suggestion': { checkbox: true },
    'Due date': {
      date: {
        start: new Date().toISOString().slice(0, 10)
      }
    },
    ...(linearUrl ? { 'Linear issue URL': { url: linearUrl } } : {}),
    'Next action': richTextProperty(finding.suggestedAction),
    ...(options.ownerUserId ? { Owner: { people: [{ id: options.ownerUserId }] } } : {}),
    Priority: { select: { name: finding.severity === 'warning' ? 'P1' : 'P2' } },
    Reviewed: { checkbox: false },
    Source: { select: { name: 'Agent' } },
    Status: { select: { name: 'Review' } },
    ...(options.workstreamId ? { Workstream: { relation: [{ id: options.workstreamId }] } } : {})
  };
}

function readTitle(property: unknown): string {
  const record = asRecord(property);
  return richTextToPlain(record.title);
}

function readNamedValue(property: unknown): string {
  const record = asRecord(property);
  return readString(asRecord(record.select), 'name') ?? readString(asRecord(record.status), 'name') ?? '';
}

function readUrl(property: unknown): string | null {
  return readString(property, 'url');
}

function readCheckbox(property: unknown): boolean {
  const value = asRecord(property).checkbox;
  return typeof value === 'boolean' ? value : false;
}

function readDateStart(property: unknown): string | null {
  return readString(asRecord(asRecord(property).date), 'start');
}

function readRelationCount(property: unknown): number {
  const relation = asRecord(property).relation;
  return Array.isArray(relation) ? relation.length : 0;
}

function readPeopleNames(property: unknown): string | null {
  const people = asRecord(property).people;
  if (!Array.isArray(people)) return null;
  const names = people
    .map((person) => readString(person, 'name'))
    .filter((name): name is string => Boolean(name));
  return names.length ? names.join(', ') : null;
}

function titleProperty(value: string) {
  return {
    title: [
      {
        text: { content: value },
        type: 'text'
      }
    ]
  };
}

function richTextProperty(value: string) {
  return {
    rich_text: [
      {
        text: { content: value.slice(0, 1900) },
        type: 'text'
      }
    ]
  };
}

function paragraphBlock(content: string) {
  return {
    object: 'block' as const,
    paragraph: {
      rich_text: [
        {
          text: { content: content.slice(0, 1900) },
          type: 'text' as const
        }
      ]
    },
    type: 'paragraph' as const
  };
}

function richTextToPlain(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value
    .map((item) => readString(item, 'plain_text') ?? '')
    .join('')
    .trim();
}

function readRequiredEnv(key: string): string {
  const value = readOptionalEnv(key);
  if (!value) {
    throw new Error(`${key} is required. Pull it from Infisical or set it in the shell.`);
  }
  return value;
}

function readOptionalEnv(key: string): string | null {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

function readNumberEnv(key: string): number | null {
  const value = readOptionalEnv(key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampPageSize(value: number): number {
  return Math.min(Math.max(Math.trunc(value), 1), 250);
}

function readString(source: unknown, key: string): string | null {
  const value = asRecord(source)[key];
  return typeof value === 'string' ? value : null;
}

function asRecord(source: unknown): Record<string, unknown> {
  return typeof source === 'object' && source !== null && !Array.isArray(source)
    ? (source as Record<string, unknown>)
    : {};
}

function definedValues<T extends Record<string, string>>(
  source: Partial<T> | undefined
): Partial<T> {
  if (!source) return {};
  return Object.fromEntries(
    Object.entries(source).filter((entry): entry is [keyof T & string, string] =>
      typeof entry[1] === 'string'
    )
  ) as Partial<T>;
}
