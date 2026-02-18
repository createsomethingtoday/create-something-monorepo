import {
  AIRTABLE_BASE_ID_DEFAULT,
  assertAllowedTableId,
  getWritableFieldIds,
  TABLE_IDS,
  type AllowedTableId,
  type TableScope,
} from './schema.js';

export type AirtableRecord = {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
};

export type AirtableListResponse = {
  records: AirtableRecord[];
  offset?: string;
};

export type AirtableRequestError = {
  type?: string;
  message?: string;
};

export class AirtableClientError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'AirtableClientError';
    this.status = status;
    this.details = details;
  }
}

export type SingleCollaboratorInput =
  | string
  | {
      id?: string;
      email?: string;
    };

export type AirtableClientConfig = {
  apiKey: string;
  baseId?: string;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
  sleepMs?: (ms: number) => Promise<void>;
};

export type ListRecordsOptions = {
  fieldIds?: string[];
  pageSize?: number;
  offset?: string;
  sort?: Array<{ fieldId: string; direction?: 'asc' | 'desc' }>;
  filterByFormula?: string;
  maxRecords?: number;
};

const DEFAULT_MAX_RETRIES = 4;

export function shouldRetryStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toTableId(scope: TableScope): AllowedTableId {
  return TABLE_IDS[scope];
}

function buildQueryParams(options: ListRecordsOptions): URLSearchParams {
  const params = new URLSearchParams();
  params.set('returnFieldsByFieldId', 'true');

  if (options.pageSize) params.set('pageSize', String(options.pageSize));
  if (options.offset) params.set('offset', options.offset);
  if (options.maxRecords) params.set('maxRecords', String(options.maxRecords));
  if (options.filterByFormula) params.set('filterByFormula', options.filterByFormula);

  for (const fieldId of options.fieldIds ?? []) {
    params.append('fields[]', fieldId);
  }

  (options.sort ?? []).forEach((sortOption, index) => {
    params.set(`sort[${index}][field]`, sortOption.fieldId);
    if (sortOption.direction) {
      params.set(`sort[${index}][direction]`, sortOption.direction);
    }
  });

  return params;
}

export function toAttachmentPayload(urls: string[]): Array<{ url: string }> {
  const payload = urls
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((url) => {
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('Attachment URL must use http/https');
        }
      } catch (error) {
        throw new Error(`Invalid attachment URL: ${(error as Error).message}`);
      }
      return { url };
    });

  return payload;
}

export function toSingleCollaboratorPayload(input: SingleCollaboratorInput): { id?: string; email?: string } {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      throw new Error('Collaborator email cannot be empty.');
    }
    return { email: trimmed };
  }

  const id = input.id?.trim();
  const email = input.email?.trim();

  if (!id && !email) {
    throw new Error('Collaborator payload must include id or email.');
  }

  return {
    ...(id ? { id } : {}),
    ...(email ? { email } : {}),
  };
}

export function ensureWritableFields(scope: TableScope, fields: Record<string, unknown>): void {
  const writable = getWritableFieldIds(scope);

  for (const fieldId of Object.keys(fields)) {
    if (!writable.has(fieldId)) {
      throw new Error(`Field ${fieldId} is not writable on ${scope}.`);
    }
  }
}

export class AirtableClient {
  private readonly apiKey: string;
  private readonly baseId: string;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleepMs: (ms: number) => Promise<void>;

  constructor(config: AirtableClientConfig) {
    if (!config.apiKey?.trim()) {
      throw new Error('AIRTABLE_API_KEY is required.');
    }

    this.apiKey = config.apiKey;
    this.baseId = config.baseId?.trim() || AIRTABLE_BASE_ID_DEFAULT;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.sleepMs = config.sleepMs ?? defaultSleep;
  }

  private buildTableUrl(tableId: AllowedTableId): string {
    assertAllowedTableId(tableId);
    return `https://api.airtable.com/v0/${this.baseId}/${encodeURIComponent(tableId)}`;
  }

  private async request<T>(
    method: 'GET' | 'PATCH',
    tableId: AllowedTableId,
    pathSuffix = '',
    query?: URLSearchParams,
    body?: unknown,
  ): Promise<T> {
    assertAllowedTableId(tableId);

    const tableUrl = this.buildTableUrl(tableId);
    const recordUrl = pathSuffix ? `${tableUrl}/${encodeURIComponent(pathSuffix)}` : tableUrl;
    const hasQuery = query && [...query.keys()].length > 0;
    const url = hasQuery ? `${recordUrl}?${query.toString()}` : recordUrl;

    let attempt = 0;

    while (true) {
      const response = await this.fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      let details: AirtableRequestError | string | null = null;
      try {
        details = (await response.json()) as AirtableRequestError;
      } catch {
        details = await response.text();
      }

      if (shouldRetryStatus(response.status) && attempt < this.maxRetries) {
        const backoffMs = Math.min(250 * 2 ** attempt + Math.floor(Math.random() * 100), 4000);
        attempt += 1;
        await this.sleepMs(backoffMs);
        continue;
      }

      const message =
        typeof details === 'string'
          ? details
          : details?.message || `Airtable request failed with status ${response.status}`;

      throw new AirtableClientError(message, response.status, details);
    }
  }

  async ping(): Promise<{ ok: boolean; baseId: string }> {
    await this.listRecords('assets', { pageSize: 1, fieldIds: [] });
    return { ok: true, baseId: this.baseId };
  }

  async listRecords(scope: TableScope, options: ListRecordsOptions = {}): Promise<AirtableListResponse> {
    const tableId = toTableId(scope);
    const params = buildQueryParams(options);
    return this.request<AirtableListResponse>('GET', tableId, '', params);
  }

  async listAllRecords(scope: TableScope, options: Omit<ListRecordsOptions, 'offset'> = {}): Promise<AirtableRecord[]> {
    const results: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      const response = await this.listRecords(scope, {
        ...options,
        offset,
      });
      results.push(...response.records);
      offset = response.offset;
    } while (offset);

    return results;
  }

  async getRecord(scope: TableScope, recordId: string, fieldIds: string[] = []): Promise<AirtableRecord> {
    const tableId = toTableId(scope);
    const params = new URLSearchParams();
    params.set('returnFieldsByFieldId', 'true');
    for (const fieldId of fieldIds) {
      params.append('fields[]', fieldId);
    }

    return this.request<AirtableRecord>('GET', tableId, recordId, params);
  }

  async updateRecord(
    scope: TableScope,
    recordId: string,
    fields: Record<string, unknown>,
    typecast = true,
  ): Promise<AirtableRecord> {
    if (Object.keys(fields).length === 0) {
      throw new Error('No fields provided for update.');
    }

    ensureWritableFields(scope, fields);

    const tableId = toTableId(scope);
    const query = new URLSearchParams();
    query.set('returnFieldsByFieldId', 'true');
    const body = {
      fields,
      typecast,
    };

    return this.request<AirtableRecord>('PATCH', tableId, recordId, query, body);
  }

  async findAssetByAppId(appId: string, fieldIds: string[] = []): Promise<AirtableRecord | null> {
    const normalized = appId.trim();
    if (!normalized) return null;

    const assets = await this.listAllRecords('assets', {
      fieldIds,
      pageSize: 100,
    });

    for (const asset of assets) {
      const value = asset.fields['fldxFrPOO2xtLk93e'];
      if (typeof value === 'string' && value === normalized) return asset;
      if (Array.isArray(value) && value.some((entry) => typeof entry === 'string' && entry === normalized)) {
        return asset;
      }
    }

    return null;
  }
}
