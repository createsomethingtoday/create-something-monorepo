export type ParseStatus = 'parsed' | 'partial' | 'failed';

export type WorkflowState = 'Queue' | 'In-Progress' | 'Blocked' | 'Done';

export type OutboundStatus = 'ready' | 'sent' | 'failed';

export type CodexActionResult = 'success' | 'blocked' | 'failed';

export interface IngestRequest {
  source: string;
  channel_id: string;
  message_ts: string;
  thread_ts: string;
  raw_text: string;
  raw_payload?: Record<string, unknown>;
  slack_permalink?: string;
}

export interface ParsedOnboardingFields {
  agencyName?: string;
  contactName?: string;
  contactEmail?: string;
  partnerType?: string;
  accelerationRequested?: boolean;
  partnerPoints?: number;
  enterpriseDistinction?: string;
  connectWithAllish?: boolean;
  workspaceName?: string;
  workspaceId?: string;
  submitterName?: string;
  additionalInfo?: string;
}

export interface ParseResult {
  parseStatus: ParseStatus;
  warnings: string[];
  fields: ParsedOnboardingFields;
  parsedKeyValues: Record<string, string>;
}

export interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: string;
}

export interface UpsertIngestResult {
  recordId: string;
  parseStatus: ParseStatus;
  action: 'created' | 'updated' | 'noop';
  revision: number;
}

export interface WorkerEnv {
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  AIRTABLE_ONBOARDING_TABLE?: string;
}

export interface AirtableConfig {
  apiKey: string;
  baseId: string;
  tableName: string;
}

export interface TransitionRequest {
  record_id?: string;
  message_key?: string;
  to_state: WorkflowState;
  codex_action_notes?: string;
  codex_action_result?: CodexActionResult;
  codex_performed_by?: string;
  response_text?: string;
  response_payload?: Record<string, unknown>;
}

export interface TransitionResult {
  ok: boolean;
  recordId: string;
  fromState: WorkflowState | '';
  toState: WorkflowState;
  reason?: string;
}

export const AIRTABLE_FIELDS = {
  MESSAGE_KEY: 'Message Key',
  SLACK_CHANNEL_ID: 'Slack Channel ID',
  SLACK_MESSAGE_TS: 'Slack Message TS',
  SLACK_THREAD_TS: 'Slack Thread TS',
  SLACK_PERMALINK: 'Slack Permalink',
  RAW_MESSAGE_TEXT: 'Raw Message Text',
  RAW_PAYLOAD_JSON: 'Raw Payload JSON',
  PARSE_STATUS: 'Parse Status',
  WORKFLOW_STATE: 'Workflow State',
  RETRY_COUNT: 'Retry Count',
  DEAD_LETTER: 'Dead Letter',
  LAST_ERROR: 'Last Error',
  AGENCY_NAME: 'Agency Name',
  CONTACT_NAME: 'Contact Name',
  CONTACT_EMAIL: 'Contact Email',
  PARTNER_TYPE: 'Partner Type',
  ACCELERATION_REQUESTED: 'Acceleration Requested',
  PARTNER_POINTS: 'Partner Points',
  ENTERPRISE_DISTINCTION: 'Enterprise Distinction',
  CONNECT_WITH_ALLISH: 'Connect With Allish',
  WORKSPACE_NAME: 'Workspace Name',
  WORKSPACE_ID: 'Workspace ID',
  SUBMITTER_NAME: 'Submitter Name',
  ADDITIONAL_INFO: 'Additional Info',
  CODEX_ACTION_NOTES: 'Codex Action Notes',
  CODEX_ACTION_RESULT: 'Codex Action Result',
  CODEX_PERFORMED_BY: 'Codex Performed By',
  CODEX_PERFORMED_AT: 'Codex Performed At',
  RESPONSE_TEXT: 'Response Text',
  RESPONSE_PAYLOAD_JSON: 'Response Payload JSON',
  OUTBOUND_STATUS: 'Outbound Status',
  OUTBOUND_ATTEMPTS: 'Outbound Attempts',
  OUTBOUND_LAST_ERROR: 'Outbound Last Error',
  OUTBOUND_SENT_AT: 'Outbound Sent At',
  OUTBOUND_MESSAGE_TS: 'Outbound Message TS'
} as const;

export const DEFAULT_WORKFLOW_STATE: WorkflowState = 'Queue';
export const DEFAULT_OUTBOUND_STATUS: OutboundStatus = 'ready';

export const ALLOWED_STATE_TRANSITIONS: Record<WorkflowState | '', WorkflowState[]> = {
  '': ['Queue'],
  Queue: ['In-Progress'],
  'In-Progress': ['Done', 'Blocked'],
  Blocked: ['In-Progress'],
  Done: []
};

export function isAllowedTransition(from: WorkflowState | '', to: WorkflowState): boolean {
  const allowed = ALLOWED_STATE_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export function asWorkflowState(value: unknown): WorkflowState | '' {
  if (typeof value !== 'string') return '';
  if (value === 'Queue' || value === 'In-Progress' || value === 'Blocked' || value === 'Done') {
    return value;
  }
  return '';
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}
