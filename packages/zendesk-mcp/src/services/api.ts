import type { TokenProvider } from '@create-something/mcp-core';

export type ZendeskAuthMode = 'api-token' | 'oauth' | 'password';

export interface ZendeskClientConfig {
  subdomain: string;
  tokenProvider: TokenProvider;
  authMode: ZendeskAuthMode;
  email?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export interface ZendeskTicketCommentBody {
  body: string;
  public: boolean;
}

export interface ZendeskTicketUpdate {
  comment?: ZendeskTicketCommentBody;
  status?: ZendeskTicketStatus;
  tags?: string[];
  additional_tags?: string[];
  remove_tags?: string[];
}

export type ZendeskTicketStatus = 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed';

export class ZendeskApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ZendeskApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ZendeskClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly config: ZendeskClientConfig) {
    const subdomain = config.subdomain.trim().replace(/^https?:\/\//, '').replace(/\.zendesk\.com\/?$/, '');
    if (!subdomain) {
      throw new ZendeskApiError(
        'ZENDESK_SUBDOMAIN_MISSING',
        'Configure ZENDESK_SUBDOMAIN or WEBFLOW_ZENDESK_SUBDOMAIN. For Webflow Zendesk this is usually "webflow".',
        500,
      );
    }
    if ((config.authMode === 'api-token' || config.authMode === 'password') && !config.email?.trim()) {
      throw new ZendeskApiError(
        'ZENDESK_EMAIL_MISSING',
        'Basic Zendesk auth requires ZENDESK_EMAIL or WEBFLOW_ZENDESK_EMAIL.',
        500,
      );
    }

    this.baseUrl = `https://${subdomain}.zendesk.com/api/v2`;
    this.fetchFn = config.fetchFn ?? ((input, init) => fetch(input, init));
    this.timeoutMs = config.timeoutMs ?? 20_000;
  }

  async healthCheck(): Promise<Record<string, unknown>> {
    const response = await this.get<{ user: { id: number; name?: string; email?: string; role?: string } }>('/users/me.json');
    return {
      ok: true,
      subdomain: this.subdomain,
      authMode: this.config.authMode,
      currentUser: {
        id: response.user.id,
        name: response.user.name ?? null,
        email: response.user.email ?? null,
        role: response.user.role ?? null,
      },
    };
  }

  get subdomain(): string {
    return new URL(this.baseUrl).hostname.replace(/\.zendesk\.com$/, '');
  }

  async searchTickets(params: {
    query?: string;
    status?: ZendeskTicketStatus;
    tags?: string[];
    requesterEmail?: string;
    assigneeId?: number;
    groupId?: number;
    organizationId?: number;
    createdAfter?: string;
    createdBefore?: string;
    sortBy?: 'updated_at' | 'created_at' | 'priority' | 'status';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
  }): Promise<Record<string, unknown>> {
    const searchParams = new URLSearchParams();
    searchParams.set('query', buildTicketSearchQuery(params));
    searchParams.set('per_page', String(clampLimit(params.limit, 25, 100)));
    if (params.sortBy) searchParams.set('sort_by', params.sortBy);
    if (params.sortOrder) searchParams.set('sort_order', params.sortOrder);
    return this.get(`/search.json?${searchParams.toString()}`);
  }

  async listActiveViews(params: { limit?: number } = {}): Promise<Record<string, unknown>> {
    const searchParams = new URLSearchParams();
    searchParams.set('per_page', String(clampLimit(params.limit, 100, 100)));
    return this.get(`/views/active.json?${searchParams.toString()}`);
  }

  async listViewTickets(viewId: number, params: { limit?: number } = {}): Promise<Record<string, unknown>> {
    const searchParams = new URLSearchParams();
    searchParams.set('per_page', String(clampLimit(params.limit, 50, 100)));
    return this.get(`/views/${viewId}/tickets.json?${searchParams.toString()}`);
  }

  async getTicket(ticketId: number): Promise<Record<string, unknown>> {
    return this.get(`/tickets/${ticketId}.json?include=users,groups,organizations`);
  }

  async listTicketComments(ticketId: number, params: { includeUsers?: boolean } = {}): Promise<Record<string, unknown>> {
    const searchParams = new URLSearchParams();
    if (params.includeUsers ?? true) searchParams.set('include', 'users');
    const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : '';
    return this.get(`/tickets/${ticketId}/comments.json${suffix}`);
  }

  async getUser(params: { userId?: number; email?: string }): Promise<Record<string, unknown>> {
    if (params.userId) {
      return this.get(`/users/${params.userId}.json`);
    }
    if (params.email) {
      const searchParams = new URLSearchParams({ query: params.email });
      return this.get(`/users/search.json?${searchParams.toString()}`);
    }
    throw new ZendeskApiError('INVALID_USER_LOOKUP', 'Provide user_id or email.', 400);
  }

  async updateTicket(ticketId: number, update: ZendeskTicketUpdate): Promise<Record<string, unknown>> {
    return this.put(`/tickets/${ticketId}.json`, { ticket: update });
  }

  private async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  private async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  private async request<T>(method: 'GET' | 'PUT' | 'POST', path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(`${this.baseUrl}${path}`, {
        method,
        headers: await this.headers(),
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw await this.toError(response);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ZendeskApiError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ZendeskApiError('ZENDESK_TIMEOUT', `Zendesk request timed out after ${this.timeoutMs}ms.`, 504);
      }
      throw new ZendeskApiError(
        'ZENDESK_NETWORK_ERROR',
        error instanceof Error ? error.message : String(error),
        502,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async headers(): Promise<Record<string, string>> {
    const token = await this.config.tokenProvider.getAccessToken();
    const basicUsername = this.config.authMode === 'api-token' ? `${this.config.email}/token` : this.config.email;
    const authorization =
      this.config.authMode === 'oauth' ? `Bearer ${token}` : `Basic ${globalThis.btoa(`${basicUsername}:${token}`)}`;

    return {
      Authorization: authorization,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private async toError(response: Response): Promise<ZendeskApiError> {
    const retryAfter = response.headers.get('retry-after');
    const details = await safeReadResponse(response);
    const code = response.status === 429 ? 'ZENDESK_RATE_LIMITED' : `ZENDESK_HTTP_${response.status}`;
    const message =
      response.status === 401
        ? 'Zendesk rejected authentication. Verify the Webflow Zendesk email/token or OAuth token in Infisical.'
        : response.status === 403
          ? 'Zendesk accepted authentication but denied this operation. Verify agent permissions and token scopes.'
          : response.status === 429
            ? `Zendesk rate limit exceeded.${retryAfter ? ` Retry after ${retryAfter} seconds.` : ''}`
            : `Zendesk API request failed with ${response.status} ${response.statusText}.`;

    return new ZendeskApiError(code, message, response.status, details);
  }
}

export function buildTicketSearchQuery(params: {
  query?: string;
  status?: ZendeskTicketStatus;
  tags?: string[];
  requesterEmail?: string;
  assigneeId?: number;
  groupId?: number;
  organizationId?: number;
  createdAfter?: string;
  createdBefore?: string;
}): string {
  const parts = ['type:ticket'];
  if (params.query?.trim()) parts.push(params.query.trim());
  if (params.status) parts.push(`status:${params.status}`);
  for (const tag of params.tags ?? []) {
    const normalized = tag.trim();
    if (normalized) parts.push(`tags:${normalized}`);
  }
  if (params.requesterEmail?.trim()) parts.push(`requester:${params.requesterEmail.trim()}`);
  if (params.assigneeId) parts.push(`assignee:${params.assigneeId}`);
  if (params.groupId) parts.push(`group:${params.groupId}`);
  if (params.organizationId) parts.push(`organization:${params.organizationId}`);
  if (params.createdAfter) parts.push(`created>${params.createdAfter}`);
  if (params.createdBefore) parts.push(`created<${params.createdBefore}`);
  return parts.join(' ');
}

function clampLimit(value: number | undefined, fallback: number, max: number): number {
  if (!value) return fallback;
  return Math.min(Math.max(Math.trunc(value), 1), max);
}

async function safeReadResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text.slice(0, 2_000);
  }
}
