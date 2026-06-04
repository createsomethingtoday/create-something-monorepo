import type { DataSourceSchema, Env, NotionBlock, NotionPage, Workspace } from './types.js';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2026-03-11';

type NotionListResponse<T> = {
  results?: T[];
  has_more?: boolean;
  next_cursor?: string | null;
};

type FileUploadResponse = {
  id?: string;
  upload_url?: string;
  status?: string;
  message?: string;
};

export async function notionFetch<T>(
  env: Env,
  workspace: Workspace,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = workspace === 'blondish' ? env.BLONDISH_NOTION_API_KEY : env.HALFDOZEN_NOTION_API_KEY;
  if (!token?.trim()) {
    throw new Error(`${workspace === 'blondish' ? 'BLONDISH_NOTION_API_KEY' : 'HALFDOZEN_NOTION_API_KEY'} is not configured.`);
  }

  const response = await fetch(`${NOTION_API}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'notion-version': NOTION_VERSION,
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });

  const text = await response.text();
  const parsed = text ? JSON.parse(text) as T & { message?: string } : {} as T;
  if (!response.ok) {
    const message = parsed && typeof parsed === 'object' && 'message' in parsed ? String(parsed.message) : text;
    throw new Error(`Notion ${workspace} API ${response.status}: ${message}`);
  }
  return parsed;
}

export async function retrievePage(env: Env, workspace: Workspace, pageId: string): Promise<NotionPage> {
  return notionFetch<NotionPage>(env, workspace, `/pages/${pageId}`);
}

export async function retrieveDataSourceSchema(env: Env, workspace: Workspace, dataSourceId: string): Promise<DataSourceSchema> {
  const dataSource = await notionFetch<{ properties?: DataSourceSchema }>(env, workspace, `/data_sources/${dataSourceId}`);
  return dataSource.properties ?? {};
}

export async function queryAllPages(env: Env, workspace: Workspace, dataSourceId: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let startCursor: string | null = null;
  do {
    const response: NotionListResponse<NotionPage> = await notionFetch<NotionListResponse<NotionPage>>(env, workspace, `/data_sources/${dataSourceId}/query`, {
      method: 'POST',
      body: {
        page_size: 100,
        ...(startCursor ? { start_cursor: startCursor } : {}),
      },
    });
    pages.push(...(response.results ?? []).filter((page) => !isTrashed(page)));
    startCursor = response.has_more ? response.next_cursor ?? null : null;
  } while (startCursor);
  return pages;
}

export async function createPage(
  env: Env,
  dataSourceId: string,
  properties: Record<string, unknown>,
  children: Array<Record<string, unknown>>,
): Promise<NotionPage> {
  return notionFetch<NotionPage>(env, 'halfdozen', '/pages', {
    method: 'POST',
    body: {
      parent: { data_source_id: dataSourceId },
      properties,
      children,
    },
  });
}

export async function updatePage(
  env: Env,
  workspace: Workspace,
  pageId: string,
  properties: Record<string, unknown>,
): Promise<NotionPage> {
  return notionFetch<NotionPage>(env, workspace, `/pages/${pageId}`, {
    method: 'PATCH',
    body: { properties },
  });
}

export async function appendBlockChildren(
  env: Env,
  workspace: Workspace,
  blockId: string,
  children: Array<Record<string, unknown>>,
): Promise<void> {
  if (children.length === 0) return;
  await notionFetch<Record<string, unknown>>(env, workspace, `/blocks/${blockId}/children`, {
    method: 'PATCH',
    body: { children },
  });
}

export async function deleteBlock(env: Env, workspace: Workspace, blockId: string): Promise<void> {
  await notionFetch<Record<string, unknown>>(env, workspace, `/blocks/${blockId}`, {
    method: 'DELETE',
  });
}

export async function listAllBlockChildren(env: Env, workspace: Workspace, blockId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let startCursor: string | null = null;
  do {
    const params = new URLSearchParams({ page_size: '100' });
    if (startCursor) params.set('start_cursor', startCursor);
    const response = await notionFetch<NotionListResponse<NotionBlock>>(env, workspace, `/blocks/${blockId}/children?${params.toString()}`);
    blocks.push(...(response.results ?? []).filter((block) => !isTrashed(block)));
    startCursor = response.has_more ? response.next_cursor ?? null : null;
  } while (startCursor);
  return blocks;
}

export async function uploadFileToNotion(
  env: Env,
  workspace: Workspace,
  source: { name: string; url: string },
): Promise<string> {
  const created = await notionFetch<FileUploadResponse>(env, workspace, '/file_uploads', {
    method: 'POST',
    body: {},
  });
  if (!created.id || !created.upload_url) {
    throw new Error('Notion file upload did not return an id and upload_url.');
  }

  const fileResponse = await fetch(source.url);
  if (!fileResponse.ok) {
    throw new Error(`Could not download source attachment "${source.name}": ${fileResponse.status}`);
  }

  const form = new FormData();
  form.append('file', new Blob([await fileResponse.arrayBuffer()], {
    type: fileResponse.headers.get('content-type') || 'application/octet-stream',
  }), source.name);

  const token = workspace === 'blondish' ? env.BLONDISH_NOTION_API_KEY : env.HALFDOZEN_NOTION_API_KEY;
  if (!token?.trim()) {
    throw new Error(`${workspace === 'blondish' ? 'BLONDISH_NOTION_API_KEY' : 'HALFDOZEN_NOTION_API_KEY'} is not configured.`);
  }

  const uploadedResponse = await fetch(created.upload_url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'notion-version': NOTION_VERSION,
    },
    body: form,
  });
  const text = await uploadedResponse.text();
  const uploaded = text ? JSON.parse(text) as FileUploadResponse : {};
  if (!uploadedResponse.ok) {
    throw new Error(`Notion file upload failed: ${uploaded.message ?? text}`);
  }
  if (uploaded.status !== 'uploaded') {
    throw new Error(`Notion file upload did not complete. Status: ${uploaded.status ?? 'unknown'}`);
  }
  return created.id;
}

export async function findUserIdByEmail(env: Env, workspace: Workspace, email: string): Promise<string | null> {
  let startCursor: string | undefined;
  do {
    const params = new URLSearchParams({ page_size: '100' });
    if (startCursor) params.set('start_cursor', startCursor);
    const response = await notionFetch<NotionListResponse<Record<string, unknown>>>(env, workspace, `/users?${params.toString()}`);
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

export async function findDataSourceIdByTitle(env: Env, workspace: Workspace, title: string): Promise<string | null> {
  const response = await notionFetch<NotionListResponse<Record<string, unknown>>>(env, workspace, '/search', {
    method: 'POST',
    body: {
      query: title,
      filter: { property: 'object', value: 'data_source' },
      page_size: 100,
    },
  });
  for (const item of response.results ?? []) {
    if (readDataSourceTitle(item) === title && typeof item.id === 'string') return item.id;
  }
  return null;
}

export async function getFirstDataSourceIdForDatabase(env: Env, workspace: Workspace, databaseId?: string): Promise<string | null> {
  if (!databaseId) return null;
  const database = await notionFetch<{ data_sources?: Array<{ id?: string }> }>(env, workspace, `/databases/${databaseId}`);
  return database.data_sources?.find((dataSource) => typeof dataSource.id === 'string')?.id ?? null;
}

function readDataSourceTitle(item: Record<string, unknown>): string {
  return Array.isArray(item.title) ? item.title.map((entry) => isRecord(entry) && typeof entry.plain_text === 'string' ? entry.plain_text : '').join('').trim() : '';
}

function isTrashed(value: { archived?: boolean; in_trash?: boolean }): boolean {
  return value.archived === true || value.in_trash === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
