import {
  DEFAULT_REVIEWER_EXCEPTIONS_BASE_ID,
  DEFAULT_REVIEWER_EXCEPTIONS_TABLE_ID,
  REVIEWER_EXCEPTION_FIELD_NAMES,
  type DifyKnowledgeRecord,
  type ReviewerException,
  type ReviewerExceptionCreateInput,
  type ReviewerExceptionQuery,
  type ReviewerExceptionUpdateInput,
  type ReviewerExceptionWriteInput,
} from './schema.js';

type FetchFn = typeof fetch;
type SleepFn = (ms: number) => Promise<void>;

interface AirtableRecord {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
}

interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

export interface AirtableClientOptions {
  apiKey: string;
  baseId?: string;
  tableId?: string;
  fetchFn?: FetchFn;
  sleepFn?: SleepFn;
  maxRetries?: number;
}

export class AirtableClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'AirtableClientError';
  }
}

const defaultSleep: SleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') return normalizeString(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = firstString(item);
      if (normalized) return normalized;
    }
  }
  return undefined;
}

function stringList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const values = value.map((item) => firstString(item)).filter((item): item is string => Boolean(item));
    return values.length > 0 ? values : undefined;
  }
  const single = firstString(value);
  return single ? [single] : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

function buildAndFormula(clauses: string[]): string | undefined {
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return `AND(${clauses.join(', ')})`;
}

function buildSearchFormula(search: string): string | undefined {
  const terms = search
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .slice(0, 6);
  if (terms.length === 0) return undefined;

  const fields = REVIEWER_EXCEPTION_FIELD_NAMES;
  const searchableFields = [fields.title, fields.guidance, fields.scope, fields.sourceRecordId, fields.retrievalText];
  const termClauses = terms.map((term) => {
    const escaped = escapeFormulaValue(term.toLowerCase());
    const fieldClauses = searchableFields.map((field) => `FIND('${escaped}', LOWER({${field}} & ''))`);
    return `OR(${fieldClauses.join(', ')})`;
  });
  return buildAndFormula(termClauses);
}

function buildReviewerExceptionFilter(query: ReviewerExceptionQuery): string | undefined {
  const clauses: string[] = [];
  const fields = REVIEWER_EXCEPTION_FIELD_NAMES;

  if (query.knowledgeStatus) clauses.push(`{${fields.knowledgeStatus}} = '${escapeFormulaValue(query.knowledgeStatus)}'`);
  if (query.scope) clauses.push(`{${fields.scope}} = '${escapeFormulaValue(query.scope)}'`);
  if (typeof query.includeInDifyRetrieval === 'boolean') {
    clauses.push(query.includeInDifyRetrieval ? `{${fields.includeInDifyRetrieval}} = TRUE()` : `NOT({${fields.includeInDifyRetrieval}})`);
  }

  const searchFormula = query.search ? buildSearchFormula(query.search) : undefined;
  if (searchFormula) clauses.push(searchFormula);

  return buildAndFormula(clauses);
}

function buildReviewerExceptionFields(input: ReviewerExceptionWriteInput): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const names = REVIEWER_EXCEPTION_FIELD_NAMES;

  function setString(fieldName: string, value: string | undefined | null) {
    if (value === null) {
      fields[fieldName] = null;
      return;
    }
    const normalized = normalizeString(value);
    if (normalized !== undefined) fields[fieldName] = normalized;
  }

  function setList(fieldName: string, value: string[] | undefined) {
    const normalized = value?.map((item) => item.trim()).filter(Boolean);
    if (normalized && normalized.length > 0) fields[fieldName] = [...new Set(normalized)];
  }

  setString(names.title, input.title);
  setString(names.guidance, input.guidance);
  setString(names.reviewerOwner, input.reviewer_owner);
  setString(names.workflowStatus, input.workflow_status);
  setString(names.knowledgeStatus, input.knowledge_status);
  setString(names.scope, input.scope);
  setString(names.sourceType, input.source_type);
  setString(names.sourceUrl, input.source_url);
  setString(names.sourceRecordId, input.source_record_id);
  setString(names.reviewDecisionImpact, input.review_decision_impact);
  setList(names.appliesTo, input.applies_to);
  setString(names.effectiveDate, input.effective_date);
  setString(names.expiresAt, input.expires_at);
  setString(names.confidence, input.confidence);
  if (typeof input.include_in_dify_retrieval === 'boolean') {
    fields[names.includeInDifyRetrieval] = input.include_in_dify_retrieval;
  }
  setList(names.canonicalPromotionTarget, input.canonical_promotion_target);
  setString(names.promotionNotes, input.promotion_notes);
  setString(names.retrievalText, input.retrieval_text);
  setString(names.lastReviewedAt, input.last_reviewed_at);

  return fields;
}

function mapReviewerExceptionRecord(record: AirtableRecord): ReviewerException {
  const fields = record.fields;
  return {
    exceptionId: record.id,
    title: firstString(fields[REVIEWER_EXCEPTION_FIELD_NAMES.title]) ?? '',
    guidance: firstString(fields[REVIEWER_EXCEPTION_FIELD_NAMES.guidance]),
    reviewerOwner: firstString(fields[REVIEWER_EXCEPTION_FIELD_NAMES.reviewerOwner]),
    workflowStatus: firstString(fields[REVIEWER_EXCEPTION_FIELD_NAMES.workflowStatus]),
    knowledgeStatus: firstString(fields[REVIEWER_EXCEPTION_FIELD_NAMES.knowledgeStatus]),
    scope: firstString(fields[REVIEWER_EXCEPTION_FIELD_NAMES.scope]),
    sourceType: firstString(fields[REVIEWER_EXCEPTION_FIELD_NAMES.sourceType]),
    sourceUrl: firstString(fields[REVIEWER_EXCEPTION_FIELD_NAMES.sourceUrl]),
    sourceRecordId: firstString(fields[REVIEWER_EXCEPTION_FIELD_NAMES.sourceRecordId]),
    reviewDecisionImpact: firstString(fields[REVIEWER_EXCEPTION_FIELD_NAMES.reviewDecisionImpact]),
    appliesTo: stringList(fields[REVIEWER_EXCEPTION_FIELD_NAMES.appliesTo]),
    effectiveDate: firstString(fields[REVIEWER_EXCEPTION_FIELD_NAMES.effectiveDate]),
    expiresAt: firstString(fields[REVIEWER_EXCEPTION_FIELD_NAMES.expiresAt]),
    confidence: firstString(fields[REVIEWER_EXCEPTION_FIELD_NAMES.confidence]),
    includeInDifyRetrieval: booleanValue(fields[REVIEWER_EXCEPTION_FIELD_NAMES.includeInDifyRetrieval]),
    canonicalPromotionTarget: stringList(fields[REVIEWER_EXCEPTION_FIELD_NAMES.canonicalPromotionTarget]),
    promotionNotes: firstString(fields[REVIEWER_EXCEPTION_FIELD_NAMES.promotionNotes]),
    retrievalText: firstString(fields[REVIEWER_EXCEPTION_FIELD_NAMES.retrievalText]),
    lastReviewedAt: firstString(fields[REVIEWER_EXCEPTION_FIELD_NAMES.lastReviewedAt]),
    createdTime: record.createdTime,
  };
}

function tokenizeForKnowledge(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function scoreReviewerException(exception: ReviewerException, query: string): number {
  const queryTokens = new Set(tokenizeForKnowledge(query));
  if (queryTokens.size === 0) return 1;

  const searchable = [
    exception.title,
    exception.guidance,
    exception.scope,
    exception.reviewDecisionImpact,
    exception.appliesTo?.join(' '),
    exception.retrievalText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let matches = 0;
  for (const token of queryTokens) {
    if (searchable.includes(token)) matches += 1;
  }

  return Math.max(0.01, Math.min(1, matches / queryTokens.size));
}

function isReviewerExceptionRetrievable(exception: ReviewerException, now = new Date()): boolean {
  if (!exception.includeInDifyRetrieval) return false;
  if (exception.knowledgeStatus !== 'Approved' && exception.knowledgeStatus !== 'Active') return false;
  if (!exception.expiresAt) return true;

  const expiresAt = new Date(exception.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) return true;
  expiresAt.setUTCHours(23, 59, 59, 999);
  return expiresAt.getTime() >= now.getTime();
}

function reviewerExceptionContent(exception: ReviewerException): string {
  const explicit = normalizeString(exception.retrievalText);
  if (explicit) return explicit;

  const lines = [
    `Reviewer exception: ${exception.title}`,
    exception.guidance ? `Guidance: ${exception.guidance}` : undefined,
    exception.scope ? `Scope: ${exception.scope}` : undefined,
    exception.appliesTo?.length ? `Applies to: ${exception.appliesTo.join(', ')}` : undefined,
    exception.reviewDecisionImpact ? `Decision impact: ${exception.reviewDecisionImpact}` : undefined,
    exception.expiresAt ? `Expires: ${exception.expiresAt}` : undefined,
  ].filter(Boolean);

  return lines.join('\n');
}

function reviewerExceptionMetadata(exception: ReviewerException): Record<string, unknown> {
  return {
    airtable_record_id: exception.exceptionId,
    source: 'airtable_reviewer_exceptions',
    knowledge_status: exception.knowledgeStatus ?? null,
    scope: exception.scope ?? null,
    applies_to: exception.appliesTo ?? [],
    confidence: exception.confidence ?? null,
    source_type: exception.sourceType ?? null,
    source_url: exception.sourceUrl ?? null,
    source_record_id: exception.sourceRecordId ?? null,
    expires_at: exception.expiresAt ?? null,
  };
}

export class AirtableClient {
  private readonly apiKey: string;
  private readonly baseId: string;
  private readonly tableId: string;
  private readonly fetchFn: FetchFn;
  private readonly sleepFn: SleepFn;
  private readonly maxRetries: number;

  constructor(options: AirtableClientOptions) {
    this.apiKey = options.apiKey;
    this.baseId = options.baseId ?? DEFAULT_REVIEWER_EXCEPTIONS_BASE_ID;
    this.tableId = options.tableId ?? DEFAULT_REVIEWER_EXCEPTIONS_TABLE_ID;
    this.fetchFn = options.fetchFn ?? fetch;
    this.sleepFn = options.sleepFn ?? defaultSleep;
    this.maxRetries = options.maxRetries ?? 3;
  }

  private async requestJson<T>(path: string, init: RequestInit, params?: URLSearchParams): Promise<T> {
    const url = new URL(`https://api.airtable.com/v0/${encodeURIComponent(this.baseId)}${path}`);
    if (params) {
      for (const [key, value] of params.entries()) url.searchParams.append(key, value);
    }

    let attempt = 0;
    while (true) {
      const response = await this.fetchFn(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        },
      });

      if (response.ok) return (await response.json()) as T;

      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < this.maxRetries) {
        attempt += 1;
        await this.sleepFn(250 * attempt);
        continue;
      }

      const text = await response.text().catch(() => '');
      throw new AirtableClientError('AIRTABLE_REQUEST_FAILED', `Airtable request failed (${response.status}): ${text}`, response.status);
    }
  }

  private async listReviewerExceptionRecords(query: ReviewerExceptionQuery): Promise<AirtableRecord[]> {
    const all: AirtableRecord[] = [];
    let offset: string | undefined;

    while (true) {
      const params = new URLSearchParams();
      params.set('pageSize', String(Math.min(query.limit ?? 100, 100)));
      params.set('sort[0][field]', REVIEWER_EXCEPTION_FIELD_NAMES.title);
      params.set('sort[0][direction]', 'asc');
      for (const fieldName of Object.values(REVIEWER_EXCEPTION_FIELD_NAMES)) {
        params.append('fields[]', fieldName);
      }
      const filterByFormula = buildReviewerExceptionFilter(query);
      if (filterByFormula) params.set('filterByFormula', filterByFormula);
      if (offset) params.set('offset', offset);

      const data = await this.requestJson<AirtableListResponse>(`/${encodeURIComponent(this.tableId)}`, { method: 'GET' }, params);

      all.push(...data.records);
      if (query.limit && all.length >= query.limit) return all.slice(0, query.limit);
      if (!data.offset) return all;
      offset = data.offset;
    }
  }

  private async createReviewerExceptionRecord(fields: Record<string, unknown>): Promise<AirtableRecord> {
    const params = new URLSearchParams();
    params.set('typecast', 'true');
    const payload = JSON.stringify({ records: [{ fields }] });
    const data = await this.requestJson<AirtableListResponse>(`/${encodeURIComponent(this.tableId)}`, { method: 'POST', body: payload }, params);
    const record = data.records[0];
    if (!record) throw new AirtableClientError('AIRTABLE_EMPTY_CREATE', 'Airtable create returned no reviewer exception.');
    return record;
  }

  private async updateReviewerExceptionRecord(recordId: string, fields: Record<string, unknown>): Promise<AirtableRecord> {
    if (Object.keys(fields).length === 0) {
      throw new AirtableClientError('AIRTABLE_EMPTY_UPDATE', 'No reviewer exception fields were provided for update.', 400);
    }

    const params = new URLSearchParams();
    params.set('typecast', 'true');
    const payload = JSON.stringify({ fields });
    return this.requestJson<AirtableRecord>(`/${encodeURIComponent(this.tableId)}/${encodeURIComponent(recordId)}`, { method: 'PATCH', body: payload }, params);
  }

  async healthCheck(): Promise<{
    ok: boolean;
    baseId: string;
    tableId: string;
    sampleRecordsRead: number;
  }> {
    const records = await this.listReviewerExceptionRecords({ limit: 1 });
    return {
      ok: true,
      baseId: this.baseId,
      tableId: this.tableId,
      sampleRecordsRead: records.length,
    };
  }

  async createReviewerException(input: ReviewerExceptionCreateInput): Promise<ReviewerException> {
    const fields = buildReviewerExceptionFields({
      ...input,
      knowledge_status: input.knowledge_status ?? (input.include_in_dify_retrieval ? 'Active' : 'Proposed'),
      confidence: input.confidence ?? 'Medium',
      last_reviewed_at: input.last_reviewed_at ?? (input.include_in_dify_retrieval ? new Date().toISOString() : undefined),
    });

    return mapReviewerExceptionRecord(await this.createReviewerExceptionRecord(fields));
  }

  async updateReviewerException(input: ReviewerExceptionUpdateInput): Promise<ReviewerException> {
    const { exceptionId, ...rest } = input;
    const fields = buildReviewerExceptionFields({
      ...rest,
      last_reviewed_at: rest.last_reviewed_at ?? (rest.include_in_dify_retrieval ? new Date().toISOString() : undefined),
    });
    return mapReviewerExceptionRecord(await this.updateReviewerExceptionRecord(exceptionId, fields));
  }

  async listReviewerExceptions(query: ReviewerExceptionQuery = {}): Promise<ReviewerException[]> {
    const limit = query.limit ?? 100;
    const records = await this.listReviewerExceptionRecords({ ...query, limit });
    return records.map((record) => mapReviewerExceptionRecord(record));
  }

  async retrieveReviewerExceptionKnowledge(args: {
    query: string;
    topK?: number;
    scoreThreshold?: number;
  }): Promise<DifyKnowledgeRecord[]> {
    const topK = Math.min(Math.max(args.topK ?? 3, 1), 20);
    const scoreThreshold = args.scoreThreshold ?? 0;
    const records = await this.listReviewerExceptionRecords({
      limit: 100,
      includeInDifyRetrieval: true,
    });

    return records
      .map((record) => mapReviewerExceptionRecord(record))
      .filter((exception) => isReviewerExceptionRetrievable(exception))
      .map((exception) => ({
        content: reviewerExceptionContent(exception),
        score: scoreReviewerException(exception, args.query),
        title: exception.title,
        metadata: reviewerExceptionMetadata(exception),
      }))
      .filter((record) => record.score >= scoreThreshold)
      .sort((left, right) => right.score - left.score)
      .slice(0, topK);
  }
}
