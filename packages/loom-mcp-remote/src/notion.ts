import type { NotionRuntimeConfig, TaskRow } from './types.js';
import { parseJsonArray } from './utils.js';

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

export interface NotionSyncOptions {
  dry_run?: boolean;
  force?: boolean;
  status?: TaskRow['status'];
  since?: string;
}

export interface NotionSyncResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  dry_run: boolean;
}

interface NotionPage {
  id: string;
  last_edited_time: string;
}

async function notionRequest(
  token: string,
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH';
    body?: unknown;
  } = {},
): Promise<any> {
  const response = await fetch(`${NOTION_API_BASE}${endpoint}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Notion API ${response.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

export async function createDatabase(token: string, parentPageId: string): Promise<string> {
  const result = await notionRequest(token, '/databases', {
    method: 'POST',
    body: {
      parent: { page_id: parentPageId },
      icon: { emoji: '🧵' },
      title: [{ text: { content: 'Loom Work Log' } }],
      properties: {
        Title: { title: {} },
        'Loom ID': { rich_text: {} },
        Description: { rich_text: {} },
        Status: {
          select: {
            options: [
              { name: 'ready', color: 'blue' },
              { name: 'claimed', color: 'yellow' },
              { name: 'blocked', color: 'red' },
              { name: 'done', color: 'green' },
              { name: 'cancelled', color: 'gray' },
            ],
          },
        },
        Priority: {
          select: {
            options: [
              { name: 'critical', color: 'red' },
              { name: 'high', color: 'orange' },
              { name: 'normal', color: 'blue' },
              { name: 'low', color: 'gray' },
            ],
          },
        },
        Type: {
          select: {
            options: [
              { name: 'feature', color: 'purple' },
              { name: 'bug', color: 'red' },
              { name: 'task', color: 'blue' },
              { name: 'epic', color: 'pink' },
              { name: 'chore', color: 'gray' },
            ],
          },
        },
        Labels: { multi_select: {} },
        Agent: { select: {} },
        Repository: { select: {} },
        Created: { date: {} },
        Updated: { date: {} },
        Completed: { date: {} },
        'Duration (hrs)': { number: {} },
        'Cost (USD)': { number: {} },
      },
    },
  });

  const databaseId = result?.id;
  if (typeof databaseId !== 'string' || databaseId.length === 0) {
    throw new Error('Notion create_database response did not include an id');
  }
  return databaseId;
}

async function queryPages(token: string, databaseId: string): Promise<Map<string, NotionPage>> {
  const pages = new Map<string, NotionPage>();
  let cursor: string | undefined;

  for (;;) {
    const result = await notionRequest(token, `/databases/${databaseId}/query`, {
      method: 'POST',
      body: cursor ? { page_size: 100, start_cursor: cursor } : { page_size: 100 },
    });

    for (const page of result?.results ?? []) {
      const loomId = page?.properties?.['Loom ID']?.rich_text?.[0]?.plain_text;
      if (typeof loomId === 'string' && loomId.length > 0) {
        pages.set(loomId, {
          id: page.id,
          last_edited_time: page.last_edited_time,
        });
      }
    }

    if (!result?.has_more || typeof result?.next_cursor !== 'string') {
      break;
    }
    cursor = result.next_cursor;
  }

  return pages;
}

function taskToProperties(task: TaskRow): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    Title: {
      title: [{ text: { content: task.title } }],
    },
    'Loom ID': {
      rich_text: [{ text: { content: task.id } }],
    },
    Status: {
      select: { name: task.status },
    },
    Priority: {
      select: { name: task.priority },
    },
    Type: {
      select: { name: task.issue_type },
    },
    Created: {
      date: { start: task.created_at },
    },
    Updated: {
      date: { start: task.updated_at },
    },
  };

  if (task.description) {
    properties.Description = {
      rich_text: [{ text: { content: task.description.length > 2000 ? `${task.description.slice(0, 1997)}...` : task.description } }],
    };
  }

  const labels = parseJsonArray(task.labels_json);
  if (labels.length > 0) {
    properties.Labels = {
      multi_select: labels.map((label) => ({ name: label })),
    };
  }

  if (task.agent) {
    properties.Agent = {
      select: { name: task.agent },
    };
  }

  if (task.repo) {
    properties.Repository = {
      select: { name: task.repo },
    };
  }

  if (task.status === 'done') {
    properties.Completed = {
      date: { start: task.updated_at },
    };
  }

  if (typeof task.actual_cost_usd === 'number') {
    properties['Cost (USD)'] = {
      number: task.actual_cost_usd,
    };
  }

  return properties;
}

async function createPage(token: string, databaseId: string, task: TaskRow): Promise<void> {
  await notionRequest(token, '/pages', {
    method: 'POST',
    body: {
      parent: { database_id: databaseId },
      properties: taskToProperties(task),
    },
  });
}

async function updatePage(token: string, pageId: string, task: TaskRow): Promise<void> {
  await notionRequest(token, `/pages/${pageId}`, {
    method: 'PATCH',
    body: {
      properties: taskToProperties(task),
    },
  });
}

export async function syncTasksToNotion(
  token: string,
  databaseId: string,
  tasks: TaskRow[],
  options: NotionSyncOptions = {},
): Promise<NotionSyncResult> {
  const filtered = tasks.filter((task) => {
    if (options.status && task.status !== options.status) return false;
    if (options.since && Date.parse(task.updated_at) < Date.parse(options.since)) return false;
    return true;
  });

  const result: NotionSyncResult = {
    total: filtered.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    dry_run: Boolean(options.dry_run),
  };

  const existing = await queryPages(token, databaseId);

  for (const task of filtered) {
    const existingPage = existing.get(task.id);
    if (!existingPage) {
      if (options.dry_run) {
        result.created += 1;
        continue;
      }
      try {
        await createPage(token, databaseId, task);
        result.created += 1;
      } catch (error) {
        result.errors.push(`${task.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
      continue;
    }

    const needsUpdate = Boolean(options.force) || Date.parse(task.updated_at) > Date.parse(existingPage.last_edited_time);
    if (!needsUpdate) {
      result.skipped += 1;
      continue;
    }

    if (options.dry_run) {
      result.updated += 1;
      continue;
    }

    try {
      await updatePage(token, existingPage.id, task);
      result.updated += 1;
    } catch (error) {
      result.errors.push(`${task.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return result;
}

export function notionStatus(config: NotionRuntimeConfig | null, hasToken: boolean): Record<string, unknown> {
  return {
    configured: hasToken && Boolean(config?.databaseId),
    database_id: config?.databaseId ?? null,
    has_token: hasToken,
    last_sync_at: config?.lastSyncAt ?? null,
    last_sync_summary: config?.lastSyncSummary ?? null,
  };
}
