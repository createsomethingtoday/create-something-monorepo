/**
 * Notion API service — handles all Notion API interactions.
 *
 * Three-Tier Framework alignment:
 *   - Database tier: Notion is an external Database — state that exists
 *   - Touchpoint: The Notion API is a cross-cutting interaction surface
 *
 * Supports multiple tokens for cross-workspace operations.
 * Token is passed per-call (already context-scoped by design).
 *
 * Includes exponential backoff retry for transient failures (429, 5xx).
 */

import { Client, APIResponseError } from "@notionhq/client";
import {
  NOTION_RATE_LIMIT_MS,
  DEFAULT_SYNC_BATCH_SIZE,
} from "../constants.js";
import type {
  NotionPage,
  NotionDatabaseQueryResponse,
  NotionPropertyValue,
} from "../types.js";

// ─── Retry Configuration ────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

/**
 * Retry a Notion API call with exponential backoff.
 * Retries on:
 *   - 429 (Rate Limited) — uses Retry-After header if available
 *   - 5xx (Server Error) — transient failures
 *   - Network errors (fetch failures)
 */
async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on non-retryable errors
      if (!isRetryable(error)) {
        throw lastError;
      }

      if (attempt === MAX_RETRIES) {
        throw new Error(
          `${label} failed after ${MAX_RETRIES + 1} attempts: ${lastError.message}`
        );
      }

      // Calculate delay with exponential backoff + jitter
      let delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);

      // Use Retry-After header if available (429 responses)
      if (error instanceof APIResponseError && error.status === 429) {
        const retryAfter = getRetryAfterMs(error);
        if (retryAfter) delay = retryAfter;
      }

      // Add jitter (±25%)
      delay = delay * (0.75 + Math.random() * 0.5);

      console.warn(
        `[notion] ${label} attempt ${attempt + 1}/${MAX_RETRIES + 1} failed, retrying in ${Math.round(delay)}ms: ${lastError.message}`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // TypeScript needs this, though it's unreachable
  throw lastError;
}

/**
 * Check if an error is retryable.
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof APIResponseError) {
    // 429: Rate limited — always retry
    if (error.status === 429) return true;
    // 5xx: Server errors — retry
    if (error.status >= 500) return true;
    // 409: Conflict — retry (eventual consistency)
    if (error.status === 409) return true;
    // Other 4xx: Don't retry (client error)
    return false;
  }

  // Network errors (fetch failures) — retry
  if (error instanceof TypeError && error.message.includes('fetch')) return true;

  return false;
}

/**
 * Extract Retry-After delay from a 429 response.
 */
function getRetryAfterMs(error: APIResponseError): number | null {
  // The Notion SDK wraps the response — try to extract Retry-After from headers
  // The SDK doesn't expose headers directly, so we use a reasonable default
  // for 429s: 1 second (Notion's typical rate limit window)
  if (error.status === 429) {
    return 1000;
  }
  return null;
}

// ─── Rate Limiter ───────────────────────────────────────────────────

// Rate limiter: simple token bucket for ~3 req/s
let lastRequestTime = 0;

async function rateLimitWait(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < NOTION_RATE_LIMIT_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, NOTION_RATE_LIMIT_MS - elapsed)
    );
  }
  lastRequestTime = Date.now();
}

// ─── Client Factory ─────────────────────────────────────────────────

function createNotionClient(token: string): Client {
  return new Client({ auth: token });
}

// ─── Database Operations ────────────────────────────────────────────

/**
 * Query all pages from a Notion database, with optional filter.
 * Handles pagination automatically. Each page request is retried on failure.
 */
export async function queryAllPages(
  token: string,
  databaseId: string,
  filter?: Record<string, unknown>
): Promise<NotionPage[]> {
  const client = createNotionClient(token);
  const allPages: NotionPage[] = [];
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
    await rateLimitWait();

    // v5 SDK: databases.query moved to dataSources.query
    const queryParams: Record<string, unknown> = {
      data_source_id: databaseId,
      page_size: DEFAULT_SYNC_BATCH_SIZE,
    };

    if (filter) queryParams.filter = filter;
    if (startCursor) queryParams.start_cursor = startCursor;

    const response = await withRetry(
      async () =>
        (await client.dataSources.query(
          queryParams as Parameters<typeof client.dataSources.query>[0]
        )) as unknown as NotionDatabaseQueryResponse,
      `queryAllPages(${databaseId})`
    );

    allPages.push(...response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor ?? undefined;
  }

  return allPages;
}

/**
 * Query pages from master DB filtered by a specific client.
 */
export async function queryClientPages(
  token: string,
  databaseId: string,
  filterProperty: string,
  filterValue: string
): Promise<NotionPage[]> {
  // Build a Notion filter for select/multi-select/rich_text matching
  const filter = {
    or: [
      {
        property: filterProperty,
        select: { equals: filterValue },
      },
      {
        property: filterProperty,
        rich_text: { equals: filterValue },
      },
    ],
  };

  return queryAllPages(token, databaseId, filter);
}

/**
 * Get a single page by ID.
 */
export async function getPage(
  token: string,
  pageId: string
): Promise<NotionPage> {
  const client = createNotionClient(token);
  await rateLimitWait();
  return withRetry(
    async () => {
      const page = await client.pages.retrieve({ page_id: pageId });
      return page as unknown as NotionPage;
    },
    `getPage(${pageId})`
  );
}

/**
 * Create a page in a database with given properties.
 */
export async function createPage(
  token: string,
  databaseId: string,
  properties: Record<string, unknown>
): Promise<NotionPage> {
  const client = createNotionClient(token);
  await rateLimitWait();

  return withRetry(
    async () => {
      const page = await client.pages.create({
        parent: { database_id: databaseId },
        properties: properties as Parameters<
          typeof client.pages.create
        >[0]["properties"],
      });
      return page as unknown as NotionPage;
    },
    `createPage(${databaseId})`
  );
}

/**
 * Update a page's properties.
 */
export async function updatePage(
  token: string,
  pageId: string,
  properties: Record<string, unknown>
): Promise<NotionPage> {
  const client = createNotionClient(token);
  await rateLimitWait();

  return withRetry(
    async () => {
      const page = await client.pages.update({
        page_id: pageId,
        properties: properties as Parameters<
          typeof client.pages.update
        >[0]["properties"],
      });
      return page as unknown as NotionPage;
    },
    `updatePage(${pageId})`
  );
}

/**
 * Get database schema (property definitions).
 */
export async function getDatabaseSchema(
  token: string,
  databaseId: string
): Promise<Record<string, NotionPropertyValue>> {
  const client = createNotionClient(token);
  await rateLimitWait();

  return withRetry(
    async () => {
      const db = await client.databases.retrieve({ database_id: databaseId });
      return (db as unknown as { properties: Record<string, NotionPropertyValue> })
        .properties;
    },
    `getDatabaseSchema(${databaseId})`
  );
}

// ─── Property Extraction Helpers ────────────────────────────────────

/**
 * Extract a comparable value from a Notion property for sync comparison.
 */
export function extractPropertyValue(prop: NotionPropertyValue): unknown {
  switch (prop.type) {
    case "title": {
      const titleArr = prop.title as Array<{ plain_text: string }>;
      return titleArr?.map((t) => t.plain_text).join("") ?? "";
    }
    case "rich_text": {
      const rtArr = prop.rich_text as Array<{ plain_text: string }>;
      return rtArr?.map((t) => t.plain_text).join("") ?? "";
    }
    case "number":
      return prop.number;
    case "select": {
      const sel = prop.select as { name: string } | null;
      return sel?.name ?? null;
    }
    case "multi_select": {
      const ms = prop.multi_select as Array<{ name: string }>;
      return ms?.map((s) => s.name) ?? [];
    }
    case "date": {
      const d = prop.date as { start: string; end?: string } | null;
      return d ? { start: d.start, end: d.end } : null;
    }
    case "checkbox":
      return prop.checkbox;
    case "url":
      return prop.url;
    case "email":
      return prop.email;
    case "phone_number":
      return prop.phone_number;
    case "status": {
      const st = prop.status as { name: string } | null;
      return st?.name ?? null;
    }
    default:
      return null;
  }
}

/**
 * Build a Notion property update payload from a source property.
 */
export function buildPropertyPayload(
  prop: NotionPropertyValue
): Record<string, unknown> | null {
  switch (prop.type) {
    case "title":
      return { title: prop.title };
    case "rich_text":
      return { rich_text: prop.rich_text };
    case "number":
      return { number: prop.number };
    case "select":
      return { select: prop.select };
    case "multi_select":
      return { multi_select: prop.multi_select };
    case "date":
      return { date: prop.date };
    case "checkbox":
      return { checkbox: prop.checkbox };
    case "url":
      return { url: prop.url };
    case "email":
      return { email: prop.email };
    case "phone_number":
      return { phone_number: prop.phone_number };
    case "status":
      return { status: prop.status };
    default:
      // Relations, rollups, formulas, etc. are not directly syncable
      return null;
  }
}
