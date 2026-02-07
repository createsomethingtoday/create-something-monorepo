import { NOTION_API_BASE, NOTION_VERSION } from "../constants.js";
import type { NotionConfig, NotionPage } from "../types.js";

/**
 * Notion API client for syncing QuickBooks data into Notion databases.
 */
export class NotionClient {
  private readonly apiKey: string;

  constructor(config: NotionConfig) {
    this.apiKey = config.apiKey;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    };
  }

  /**
   * Query a Notion database with optional filter.
   */
  async queryDatabase(
    databaseId: string,
    filter?: Record<string, unknown>,
    sorts?: Array<Record<string, unknown>>,
    startCursor?: string,
    pageSize = 100
  ): Promise<{
    results: NotionPage[];
    has_more: boolean;
    next_cursor: string | null;
  }> {
    const body: Record<string, unknown> = { page_size: pageSize };
    if (filter) body.filter = filter;
    if (sorts) body.sorts = sorts;
    if (startCursor) body.start_cursor = startCursor;

    const response = await fetch(
      `${NOTION_API_BASE}/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new NotionApiError(response.status, errorBody);
    }

    const data = (await response.json()) as {
      results: NotionPage[];
      has_more: boolean;
      next_cursor: string | null;
    };
    return data;
  }

  /**
   * Create a page in a Notion database.
   */
  async createPage(
    databaseId: string,
    properties: Record<string, unknown>
  ): Promise<NotionPage> {
    const response = await fetch(`${NOTION_API_BASE}/pages`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new NotionApiError(response.status, errorBody);
    }

    return (await response.json()) as NotionPage;
  }

  /**
   * Update a Notion page's properties.
   */
  async updatePage(
    pageId: string,
    properties: Record<string, unknown>
  ): Promise<NotionPage> {
    const response = await fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new NotionApiError(response.status, errorBody);
    }

    return (await response.json()) as NotionPage;
  }

  /**
   * Retrieve database schema (properties).
   */
  async getDatabase(
    databaseId: string
  ): Promise<Record<string, unknown>> {
    const response = await fetch(
      `${NOTION_API_BASE}/databases/${databaseId}`,
      {
        method: "GET",
        headers: this.headers,
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new NotionApiError(response.status, errorBody);
    }

    return (await response.json()) as Record<string, unknown>;
  }

  /**
   * Search Notion workspace for databases or pages.
   */
  async search(
    query: string,
    filter?: { property: string; value: string }
  ): Promise<{ results: Array<Record<string, unknown>> }> {
    const body: Record<string, unknown> = { query };
    if (filter) body.filter = filter;

    const response = await fetch(`${NOTION_API_BASE}/search`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new NotionApiError(response.status, errorBody);
    }

    return (await response.json()) as {
      results: Array<Record<string, unknown>>;
    };
  }
}

export class NotionApiError extends Error {
  public readonly status: number;
  public readonly body: string;

  constructor(status: number, body: string) {
    let message = `Notion API error (${status})`;
    try {
      const parsed = JSON.parse(body);
      if (parsed?.message) {
        message += `: ${parsed.message}`;
      }
      if (parsed?.code) {
        message += ` [${parsed.code}]`;
      }
    } catch {
      message += `: ${body.slice(0, 200)}`;
    }

    if (status === 401) {
      message +=
        "\n\nSuggestion: Check your NOTION_API_KEY. Ensure the integration has access to the target databases.";
    } else if (status === 404) {
      message +=
        "\n\nSuggestion: The database or page was not found. Ensure the Notion integration is connected to the target database.";
    } else if (status === 429) {
      message +=
        "\n\nSuggestion: Rate limit exceeded. Notion allows ~3 requests/second. Wait and retry.";
    }

    super(message);
    this.name = "NotionApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Create a Notion client from environment variables.
 */
export function createNotionClientFromEnv(): NotionClient {
  const apiKey = process.env.NOTION_API_KEY;

  if (!apiKey) {
    throw new Error(
      "NOTION_API_KEY environment variable is required. " +
        "Create an integration at https://www.notion.so/my-integrations"
    );
  }

  return new NotionClient({ apiKey });
}

// ── Notion Property Builders ────────────────────────────────────────

export function notionTitle(text: string): Record<string, unknown> {
  return { title: [{ text: { content: text } }] };
}

export function notionRichText(text: string): Record<string, unknown> {
  return { rich_text: [{ text: { content: text.slice(0, 2000) } }] };
}

export function notionNumber(value: number): Record<string, unknown> {
  return { number: value };
}

export function notionDate(date: string): Record<string, unknown> {
  return { date: { start: date } };
}

export function notionCheckbox(checked: boolean): Record<string, unknown> {
  return { checkbox: checked };
}

export function notionSelect(name: string): Record<string, unknown> {
  return { select: { name } };
}

export function notionEmail(email: string): Record<string, unknown> {
  return { email };
}

export function notionPhone(phone: string): Record<string, unknown> {
  return { phone_number: phone };
}

export function notionUrl(url: string): Record<string, unknown> {
  return { url };
}
