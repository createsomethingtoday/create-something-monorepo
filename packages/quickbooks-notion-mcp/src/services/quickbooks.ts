import { QBO_API_BASE, QBO_SANDBOX_API_BASE } from "../constants.js";
import type { QBOQueryResponse } from "../types.js";
import type { TokenProvider } from "./auth.js";

/**
 * QuickBooks Online API client.
 * Read-only: only GET and query operations.
 * 
 * Uses TokenProvider for automatic token refresh (SDK Auth Pattern).
 */
export class QuickBooksClient {
  private readonly baseUrl: string;
  private readonly tokenProvider: TokenProvider;
  private realmId: string;

  constructor(
    tokenProvider: TokenProvider,
    realmId: string,
    sandbox: boolean
  ) {
    this.tokenProvider = tokenProvider;
    this.realmId = realmId;
    this.baseUrl = sandbox ? QBO_SANDBOX_API_BASE : QBO_API_BASE;
  }

  private get companyUrl(): string {
    return `${this.baseUrl}/${this.realmId}`;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const accessToken = await this.tokenProvider.getAccessToken();
    return {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  /**
   * Execute a raw QuickBooks query (SELECT only).
   */
  async query<T = Record<string, unknown>>(
    sql: string
  ): Promise<QBOQueryResponse<T>> {
    const trimmed = sql.trim().toUpperCase();
    if (!trimmed.startsWith("SELECT")) {
      throw new Error(
        "Only SELECT queries are allowed. This is a read-only MCP server."
      );
    }

    const url = `${this.companyUrl}/query?query=${encodeURIComponent(sql)}`;
    const headers = await this.getHeaders();
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new QBOApiError(response.status, errorBody);
    }

    return (await response.json()) as QBOQueryResponse<T>;
  }

  /**
   * Get a single entity by ID.
   */
  async getById<T = Record<string, unknown>>(
    entity: string,
    id: string
  ): Promise<T> {
    const url = `${this.companyUrl}/${entity.toLowerCase()}/${id}`;
    const headers = await this.getHeaders();
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new QBOApiError(response.status, errorBody);
    }

    const json = (await response.json()) as Record<string, T>;
    return json[entity] as T;
  }

  /**
   * List entities with pagination.
   */
  async list<T = Record<string, unknown>>(
    entity: string,
    options: {
      where?: string;
      orderBy?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ items: T[]; totalCount: number }> {
    const { where, orderBy, limit = 20, offset = 0 } = options;
    const startPosition = offset + 1;

    let sql = `SELECT * FROM ${entity}`;
    if (where) sql += ` WHERE ${where}`;
    if (orderBy) sql += ` ORDERBY ${orderBy}`;
    sql += ` STARTPOSITION ${startPosition} MAXRESULTS ${limit}`;

    const result = await this.query<T>(sql);
    const queryResponse = result.QueryResponse;
    const items = (queryResponse[entity] as T[] | undefined) ?? [];

    let totalCount = queryResponse.totalCount ?? items.length;
    if (queryResponse.totalCount === undefined) {
      try {
        let countSql = `SELECT COUNT(*) FROM ${entity}`;
        if (where) countSql += ` WHERE ${where}`;
        const countResult = await this.query(countSql);
        totalCount = countResult.QueryResponse.totalCount ?? items.length;
      } catch {
        totalCount = items.length;
      }
    }

    return { items, totalCount };
  }

  /**
   * Get company info (special endpoint).
   */
  async getCompanyInfo<T = Record<string, unknown>>(): Promise<T> {
    const url = `${this.companyUrl}/companyinfo/${this.realmId}`;
    const headers = await this.getHeaders();
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new QBOApiError(response.status, errorBody);
    }

    const json = (await response.json()) as Record<string, T>;
    return json["CompanyInfo"] as T;
  }

  /**
   * Run a PnL, Balance Sheet, or other report.
   */
  async getReport(
    reportName: string,
    params: Record<string, string> = {}
  ): Promise<Record<string, unknown>> {
    const searchParams = new URLSearchParams(params);
    const url = `${this.companyUrl}/reports/${reportName}?${searchParams.toString()}`;
    const headers = await this.getHeaders();
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new QBOApiError(response.status, errorBody);
    }

    return (await response.json()) as Record<string, unknown>;
  }
}

export class QBOApiError extends Error {
  public readonly status: number;
  public readonly body: string;

  constructor(status: number, body: string) {
    let message = `QuickBooks API error (${status})`;
    try {
      const parsed = JSON.parse(body);
      const fault = parsed?.Fault;
      if (fault?.Error?.[0]?.Detail) {
        message += `: ${fault.Error[0].Detail}`;
      } else if (fault?.Error?.[0]?.Message) {
        message += `: ${fault.Error[0].Message}`;
      }
    } catch {
      message += `: ${body.slice(0, 200)}`;
    }

    if (status === 401) {
      message +=
        "\n\nSuggestion: Your access token may be expired. The token should auto-refresh, but if this persists, run `pnpm auth` to re-authorize.";
    } else if (status === 403) {
      message +=
        "\n\nSuggestion: Your app may not have the required scopes. Ensure 'com.intuit.quickbooks.accounting' scope is granted.";
    } else if (status === 429) {
      message +=
        "\n\nSuggestion: Rate limit exceeded. Wait a moment and retry. QBO allows ~500 requests/minute.";
    }

    super(message);
    this.name = "QBOApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Create a QuickBooks client from a TokenProvider.
 * The TokenProvider handles OAuth token refresh automatically.
 */
export function createQBOClient(
  tokenProvider: TokenProvider,
  realmId: string,
  sandbox: boolean
): QuickBooksClient {
  return new QuickBooksClient(tokenProvider, realmId, sandbox);
}
