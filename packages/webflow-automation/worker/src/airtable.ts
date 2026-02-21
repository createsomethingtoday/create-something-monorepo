import { createHash } from 'node:crypto';

import {
  AIRTABLE_FIELDS,
  DEFAULT_OUTBOUND_STATUS,
  DEFAULT_WORKFLOW_STATE,
  asWorkflowState,
  errorMessage,
  isAllowedTransition,
  type AirtableConfig,
  type AirtableRecord,
  type IngestRequest,
  type OutboundStatus,
  type ParseResult,
  type TransitionRequest,
  type TransitionResult,
  type UpsertIngestResult,
  type WorkerEnv,
  type WorkflowState
} from './types.js';
import { withRetry } from './retry.js';

const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0';

interface AirtableListResponse {
  records: AirtableRecord[];
}

interface IngestMeta {
  ingestRevision: number;
  normalizedFingerprint?: string;
}

export interface OutboundPayload {
  event_type: 'partner_onboarding_completed';
  message_key: string;
  slack: {
    channel_id: string;
    thread_ts: string;
    message_ts: string;
  };
  workspace: {
    id?: string;
    name?: string;
  };
  partner: {
    agency_name?: string;
    contact_name?: string;
    contact_email?: string;
  };
  result: {
    status: string;
    notes: string;
    response_text: string;
    response_payload: Record<string, unknown>;
  };
}

export class AirtableHttpError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`Airtable API error (${status}): ${body}`);
    this.name = 'AirtableHttpError';
    this.status = status;
    this.body = body;
  }
}

export function getAirtableConfig(env: WorkerEnv): AirtableConfig {
  const apiKey = env.AIRTABLE_API_KEY?.trim();
  const baseId = env.AIRTABLE_BASE_ID?.trim();
  const tableName = env.AIRTABLE_ONBOARDING_TABLE?.trim() || 'Partner Onboarding Ops';

  if (!apiKey) {
    throw new Error('AIRTABLE_API_KEY is not configured.');
  }
  if (!baseId) {
    throw new Error('AIRTABLE_BASE_ID is not configured.');
  }

  return { apiKey, baseId, tableName };
}

export function buildMessageKey(channelId: string, messageTs: string): string {
  return `${channelId}:${messageTs}`;
}

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "''");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`);

  return `{${entries.join(',')}}`;
}

export function createNormalizedFingerprint(input: IngestRequest, parseResult: ParseResult): string {
  const payload = {
    source: input.source,
    channel_id: input.channel_id,
    message_ts: input.message_ts,
    thread_ts: input.thread_ts,
    raw_text: input.raw_text.trim(),
    parsed_fields: parseResult.fields,
    parse_status: parseResult.parseStatus,
    parsed_key_values: parseResult.parsedKeyValues
  };

  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

async function airtableRequest<T>(
  config: AirtableConfig,
  path: string,
  init: RequestInit,
  query?: URLSearchParams
): Promise<T> {
  const encodedTable = encodeURIComponent(config.tableName);
  const url = new URL(`${AIRTABLE_API_ROOT}/${config.baseId}/${encodedTable}${path}`);

  if (query) {
    for (const [key, value] of query.entries()) {
      url.searchParams.append(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new AirtableHttpError(response.status, await response.text());
  }

  return (await response.json()) as T;
}

export async function getRecordByMessageKey(
  config: AirtableConfig,
  messageKey: string
): Promise<AirtableRecord | null> {
  const query = new URLSearchParams();
  query.set('maxRecords', '1');
  query.set(
    'filterByFormula',
    `{${AIRTABLE_FIELDS.MESSAGE_KEY}} = '${escapeFormulaValue(messageKey)}'`
  );

  const response = await airtableRequest<AirtableListResponse>(config, '', { method: 'GET' }, query);
  return response.records[0] ?? null;
}

export async function getRecordById(config: AirtableConfig, recordId: string): Promise<AirtableRecord> {
  return airtableRequest<AirtableRecord>(config, `/${recordId}`, { method: 'GET' });
}

async function createRecord(
  config: AirtableConfig,
  fields: Record<string, unknown>
): Promise<AirtableRecord> {
  return airtableRequest<AirtableRecord>(
    config,
    '',
    {
      method: 'POST',
      body: JSON.stringify({ fields })
    }
  );
}

async function updateRecord(
  config: AirtableConfig,
  recordId: string,
  fields: Record<string, unknown>
): Promise<AirtableRecord> {
  return airtableRequest<AirtableRecord>(
    config,
    `/${recordId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ fields })
    }
  );
}

function extractIngestMeta(record: AirtableRecord): IngestMeta {
  const rawPayloadField = record.fields[AIRTABLE_FIELDS.RAW_PAYLOAD_JSON];
  if (typeof rawPayloadField !== 'string' || !rawPayloadField.trim()) {
    return { ingestRevision: 0 };
  }

  try {
    const parsed = JSON.parse(rawPayloadField) as {
      _meta?: { ingest_revision?: unknown; normalized_fingerprint?: unknown };
    };
    const revision = parsed._meta?.ingest_revision;
    const fingerprint = parsed._meta?.normalized_fingerprint;

    return {
      ingestRevision: typeof revision === 'number' ? revision : 0,
      normalizedFingerprint: typeof fingerprint === 'string' ? fingerprint : undefined
    };
  } catch {
    return { ingestRevision: 0 };
  }
}

function buildPayloadJson(
  input: IngestRequest,
  parseResult: ParseResult,
  fingerprint: string,
  revision: number
): string {
  const mergedPayload = {
    ...(input.raw_payload ?? {}),
    _meta: {
      source: input.source,
      parse_status: parseResult.parseStatus,
      parse_warnings: parseResult.warnings,
      parsed_key_values: parseResult.parsedKeyValues,
      normalized_fingerprint: fingerprint,
      ingest_revision: revision,
      ingested_at: new Date().toISOString()
    }
  };

  return JSON.stringify(mergedPayload, null, 2);
}

function buildMappedFields(
  input: IngestRequest,
  parseResult: ParseResult,
  payloadJson: string
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    [AIRTABLE_FIELDS.MESSAGE_KEY]: buildMessageKey(input.channel_id, input.message_ts),
    [AIRTABLE_FIELDS.SLACK_CHANNEL_ID]: input.channel_id,
    [AIRTABLE_FIELDS.SLACK_MESSAGE_TS]: input.message_ts,
    [AIRTABLE_FIELDS.SLACK_THREAD_TS]: input.thread_ts,
    [AIRTABLE_FIELDS.RAW_MESSAGE_TEXT]: input.raw_text,
    [AIRTABLE_FIELDS.RAW_PAYLOAD_JSON]: payloadJson,
    [AIRTABLE_FIELDS.PARSE_STATUS]: parseResult.parseStatus
  };

  if (input.slack_permalink) {
    fields[AIRTABLE_FIELDS.SLACK_PERMALINK] = input.slack_permalink;
  }

  const mapped = parseResult.fields;

  if (mapped.agencyName !== undefined) fields[AIRTABLE_FIELDS.AGENCY_NAME] = mapped.agencyName;
  if (mapped.contactName !== undefined) fields[AIRTABLE_FIELDS.CONTACT_NAME] = mapped.contactName;
  if (mapped.contactEmail !== undefined) fields[AIRTABLE_FIELDS.CONTACT_EMAIL] = mapped.contactEmail;
  if (mapped.partnerType !== undefined) fields[AIRTABLE_FIELDS.PARTNER_TYPE] = mapped.partnerType;
  if (mapped.accelerationRequested !== undefined) {
    fields[AIRTABLE_FIELDS.ACCELERATION_REQUESTED] = mapped.accelerationRequested;
  }
  if (mapped.partnerPoints !== undefined) fields[AIRTABLE_FIELDS.PARTNER_POINTS] = mapped.partnerPoints;
  if (mapped.enterpriseDistinction !== undefined) {
    fields[AIRTABLE_FIELDS.ENTERPRISE_DISTINCTION] = mapped.enterpriseDistinction;
  }
  if (mapped.connectWithAllish !== undefined) {
    fields[AIRTABLE_FIELDS.CONNECT_WITH_ALLISH] = mapped.connectWithAllish;
  }
  if (mapped.workspaceName !== undefined) fields[AIRTABLE_FIELDS.WORKSPACE_NAME] = mapped.workspaceName;
  if (mapped.workspaceId !== undefined) fields[AIRTABLE_FIELDS.WORKSPACE_ID] = mapped.workspaceId;
  if (mapped.submitterName !== undefined) fields[AIRTABLE_FIELDS.SUBMITTER_NAME] = mapped.submitterName;
  if (mapped.additionalInfo !== undefined) fields[AIRTABLE_FIELDS.ADDITIONAL_INFO] = mapped.additionalInfo;

  return fields;
}

function parseWarningsAsError(warnings: string[]): string | null {
  if (warnings.length === 0) return null;
  return warnings.join(' | ');
}

export async function upsertIngestRecord(
  config: AirtableConfig,
  input: IngestRequest,
  parseResult: ParseResult
): Promise<UpsertIngestResult> {
  const messageKey = buildMessageKey(input.channel_id, input.message_ts);
  const fingerprint = createNormalizedFingerprint(input, parseResult);

  const existing = await withRetry('airtable.findByMessageKey', () =>
    getRecordByMessageKey(config, messageKey)
  );

  if (existing) {
    const meta = extractIngestMeta(existing);
    if (meta.normalizedFingerprint && meta.normalizedFingerprint === fingerprint) {
      return {
        recordId: existing.id,
        parseStatus: parseResult.parseStatus,
        action: 'noop',
        revision: meta.ingestRevision || 1
      };
    }

    const revision = (meta.ingestRevision || 0) + 1;
    const payloadJson = buildPayloadJson(input, parseResult, fingerprint, revision);
    const updateFields = {
      ...buildMappedFields(input, parseResult, payloadJson),
      [AIRTABLE_FIELDS.LAST_ERROR]: parseWarningsAsError(parseResult.warnings)
    };

    const updated = await withRetry('airtable.updateRecord', () =>
      updateRecord(config, existing.id, updateFields)
    );

    return {
      recordId: updated.id,
      parseStatus: parseResult.parseStatus,
      action: 'updated',
      revision
    };
  }

  const revision = 1;
  const payloadJson = buildPayloadJson(input, parseResult, fingerprint, revision);
  const createFields = {
    ...buildMappedFields(input, parseResult, payloadJson),
    [AIRTABLE_FIELDS.WORKFLOW_STATE]: DEFAULT_WORKFLOW_STATE,
    [AIRTABLE_FIELDS.RETRY_COUNT]: 0,
    [AIRTABLE_FIELDS.DEAD_LETTER]: false,
    [AIRTABLE_FIELDS.LAST_ERROR]: parseWarningsAsError(parseResult.warnings),
    [AIRTABLE_FIELDS.OUTBOUND_STATUS]: DEFAULT_OUTBOUND_STATUS,
    [AIRTABLE_FIELDS.OUTBOUND_ATTEMPTS]: 0
  };

  const created = await withRetry('airtable.createRecord', () => createRecord(config, createFields));

  return {
    recordId: created.id,
    parseStatus: parseResult.parseStatus,
    action: 'created',
    revision
  };
}

export async function markDeadLetter(
  config: AirtableConfig,
  input: IngestRequest,
  reason: string,
  parseStatus: ParseResult['parseStatus']
): Promise<void> {
  const messageKey = buildMessageKey(input.channel_id, input.message_ts);
  const deadLetterFields: Record<string, unknown> = {
    [AIRTABLE_FIELDS.MESSAGE_KEY]: messageKey,
    [AIRTABLE_FIELDS.SLACK_CHANNEL_ID]: input.channel_id,
    [AIRTABLE_FIELDS.SLACK_MESSAGE_TS]: input.message_ts,
    [AIRTABLE_FIELDS.SLACK_THREAD_TS]: input.thread_ts,
    [AIRTABLE_FIELDS.RAW_MESSAGE_TEXT]: input.raw_text,
    [AIRTABLE_FIELDS.PARSE_STATUS]: parseStatus,
    [AIRTABLE_FIELDS.RETRY_COUNT]: 3,
    [AIRTABLE_FIELDS.DEAD_LETTER]: true,
    [AIRTABLE_FIELDS.LAST_ERROR]: reason,
    [AIRTABLE_FIELDS.WORKFLOW_STATE]: 'Blocked'
  };

  try {
    const existing = await getRecordByMessageKey(config, messageKey);
    if (existing) {
      await updateRecord(config, existing.id, deadLetterFields);
      return;
    }

    await createRecord(config, {
      ...deadLetterFields,
      [AIRTABLE_FIELDS.OUTBOUND_STATUS]: (existingStateToOutbound('Blocked') as OutboundStatus)
    });
  } catch (error) {
    console.error('Failed to mark dead-letter record:', errorMessage(error));
  }
}

function existingStateToOutbound(state: WorkflowState): OutboundStatus {
  if (state === 'Done') return 'ready';
  return 'failed';
}

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildOutboundPayload(record: AirtableRecord): OutboundPayload | null {
  const workflowState = asWorkflowState(record.fields[AIRTABLE_FIELDS.WORKFLOW_STATE]);
  const outboundStatus = trimString(record.fields[AIRTABLE_FIELDS.OUTBOUND_STATUS]);
  const responseText = trimString(record.fields[AIRTABLE_FIELDS.RESPONSE_TEXT]);

  if (workflowState !== 'Done' || outboundStatus !== 'ready' || !responseText) {
    return null;
  }

  const responsePayloadRaw = record.fields[AIRTABLE_FIELDS.RESPONSE_PAYLOAD_JSON];
  let responsePayload: Record<string, unknown> = {};
  if (typeof responsePayloadRaw === 'string' && responsePayloadRaw.trim()) {
    try {
      responsePayload = JSON.parse(responsePayloadRaw) as Record<string, unknown>;
    } catch {
      responsePayload = { raw: responsePayloadRaw };
    }
  }

  return {
    event_type: 'partner_onboarding_completed',
    message_key: trimString(record.fields[AIRTABLE_FIELDS.MESSAGE_KEY]),
    slack: {
      channel_id: trimString(record.fields[AIRTABLE_FIELDS.SLACK_CHANNEL_ID]),
      thread_ts: trimString(record.fields[AIRTABLE_FIELDS.SLACK_THREAD_TS]),
      message_ts: trimString(record.fields[AIRTABLE_FIELDS.SLACK_MESSAGE_TS])
    },
    workspace: {
      id: trimString(record.fields[AIRTABLE_FIELDS.WORKSPACE_ID]) || undefined,
      name: trimString(record.fields[AIRTABLE_FIELDS.WORKSPACE_NAME]) || undefined
    },
    partner: {
      agency_name: trimString(record.fields[AIRTABLE_FIELDS.AGENCY_NAME]) || undefined,
      contact_name: trimString(record.fields[AIRTABLE_FIELDS.CONTACT_NAME]) || undefined,
      contact_email: trimString(record.fields[AIRTABLE_FIELDS.CONTACT_EMAIL]) || undefined
    },
    result: {
      status:
        trimString(record.fields[AIRTABLE_FIELDS.CODEX_ACTION_RESULT]) ||
        trimString(record.fields[AIRTABLE_FIELDS.WORKFLOW_STATE]),
      notes: trimString(record.fields[AIRTABLE_FIELDS.CODEX_ACTION_NOTES]),
      response_text: responseText,
      response_payload: responsePayload
    }
  };
}

async function resolveRecordForTransition(
  config: AirtableConfig,
  request: TransitionRequest
): Promise<AirtableRecord | null> {
  if (request.record_id) {
    return withRetry('airtable.getRecordById', () => getRecordById(config, request.record_id as string));
  }

  if (request.message_key) {
    return withRetry('airtable.getRecordByMessageKey', () =>
      getRecordByMessageKey(config, request.message_key as string)
    );
  }

  return null;
}

function buildTransitionErrorMessage(
  fromState: WorkflowState | '',
  toState: WorkflowState,
  reason: string
): string {
  return `[${new Date().toISOString()}] Transition rejected (${fromState || 'empty'} -> ${toState}): ${reason}`;
}

export async function transitionWorkflowState(
  config: AirtableConfig,
  request: TransitionRequest
): Promise<TransitionResult> {
  const record = await resolveRecordForTransition(config, request);
  if (!record) {
    return {
      ok: false,
      recordId: '',
      fromState: '',
      toState: request.to_state,
      reason: 'Record not found for transition request.'
    };
  }

  const fromState = asWorkflowState(record.fields[AIRTABLE_FIELDS.WORKFLOW_STATE]);
  const toState = request.to_state;

  if (!isAllowedTransition(fromState, toState)) {
    const reason = 'Invalid transition for current state map.';
    const message = buildTransitionErrorMessage(fromState, toState, reason);

    await withRetry('airtable.logTransitionFailure', () =>
      updateRecord(config, record.id, { [AIRTABLE_FIELDS.LAST_ERROR]: message })
    );

    return {
      ok: false,
      recordId: record.id,
      fromState,
      toState,
      reason: message
    };
  }

  const finalResponseText =
    request.response_text ?? trimString(record.fields[AIRTABLE_FIELDS.RESPONSE_TEXT]);

  if (toState === 'Done' && !finalResponseText) {
    const reason = 'Done transition requires non-empty Response Text.';
    const message = buildTransitionErrorMessage(fromState, toState, reason);

    await withRetry('airtable.logTransitionFailure', () =>
      updateRecord(config, record.id, { [AIRTABLE_FIELDS.LAST_ERROR]: message })
    );

    return {
      ok: false,
      recordId: record.id,
      fromState,
      toState,
      reason: message
    };
  }

  const fields: Record<string, unknown> = {
    [AIRTABLE_FIELDS.WORKFLOW_STATE]: toState,
    [AIRTABLE_FIELDS.LAST_ERROR]: null
  };

  if (request.codex_action_notes !== undefined) {
    fields[AIRTABLE_FIELDS.CODEX_ACTION_NOTES] = request.codex_action_notes;
  }
  if (request.codex_action_result !== undefined) {
    fields[AIRTABLE_FIELDS.CODEX_ACTION_RESULT] = request.codex_action_result;
  }
  if (request.codex_performed_by !== undefined) {
    fields[AIRTABLE_FIELDS.CODEX_PERFORMED_BY] = request.codex_performed_by;
  }
  if (
    request.codex_performed_by !== undefined ||
    request.codex_action_notes !== undefined ||
    request.codex_action_result !== undefined
  ) {
    fields[AIRTABLE_FIELDS.CODEX_PERFORMED_AT] = new Date().toISOString();
  }
  if (request.response_text !== undefined) {
    fields[AIRTABLE_FIELDS.RESPONSE_TEXT] = request.response_text;
  }
  if (request.response_payload !== undefined) {
    fields[AIRTABLE_FIELDS.RESPONSE_PAYLOAD_JSON] = JSON.stringify(request.response_payload, null, 2);
  }

  if (toState === 'Done') {
    fields[AIRTABLE_FIELDS.OUTBOUND_STATUS] = 'ready';
  }

  await withRetry('airtable.transitionUpdate', () => updateRecord(config, record.id, fields));

  return {
    ok: true,
    recordId: record.id,
    fromState,
    toState
  };
}
