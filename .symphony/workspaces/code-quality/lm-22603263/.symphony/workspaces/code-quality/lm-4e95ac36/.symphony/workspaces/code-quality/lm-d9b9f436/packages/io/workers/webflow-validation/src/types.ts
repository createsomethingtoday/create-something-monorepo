/**
 * Webflow Validation Worker Types
 *
 * Canon: Types declare intent; implementation follows.
 */

export interface Env {
  // Environment variables
  ENVIRONMENT: string;
  AIRTABLE_BASE_ID: string;
  ALLOWED_ORIGINS: string;

  // Secrets (set via wrangler secret put)
  AIRTABLE_API_KEY: string;
  WEBFLOW_WEBHOOK_SECRET: string;
}

// ===== Airtable Types =====

export interface AirtableRecord<T = Record<string, unknown>> {
  id: string;
  createdTime: string;
  fields: T;
}

export interface AirtableResponse<T = Record<string, unknown>> {
  records: AirtableRecord<T>[];
  offset?: string;
}

// ===== Template User Fields =====

export interface TemplateUserFields {
  // Email list field
  [key: string]: unknown;
  '#️⃣👛Templates Published'?: number;
  '#️⃣👛Templates Rejected'?: number;
  '#️⃣👛Templates Submitted'?: number;
  '#️⃣👛Templates Delisted'?: number;
  '#️⃣Submission cap count'?: number;
  '❌Banned Instance'?: string[];  // Linked record IDs
}

export interface BannedInstanceFields {
  'Name'?: string;
  'Reason'?: string;
  'Ban Status'?: string;
  'Start Date'?: string;
  'End Date'?: string;
  'Creator'?: string;
  'fldIvMlWqF6LZeLeW'?: string;  // Ban Status by field ID
}

// ===== Library User Fields =====

export interface LibraryUserFields {
  [key: string]: unknown;
  '⚙️Can submit Libraries?'?: number;
}

// ===== API Response Types =====

export interface TemplateUserResponse {
  userExists: boolean;
  message?: string;
  hasError?: boolean;
  isBanned?: boolean;
  banDetails?: {
    reason: string;
    startDate: string;
    endDate: string;
    creator: string;
    status: string;
  };
  publishedTemplates?: number;
  submittedTemplates?: number;
  isWhitelisted?: boolean;
  assetsSubmitted30?: number;
}

export interface TemplateNameResponse {
  taken: boolean;
  message?: string;
}

export interface LibraryUserResponse {
  userExists: boolean;
  canSubmitLibraries: boolean;
}

export interface ClientIdResponse {
  clientIdExists: boolean;
}

export interface EmailValidationResponse {
  valid: boolean;
  message?: string;
}

export interface WebhookProxyResponse {
  message: string;
  airtableStatus?: number;
  webhook?: string;
  error?: string;
}

// ===== Request Body Types =====

export interface EmailRequest {
  email: string;
}

export interface TemplateNameRequest {
  templatename: string;
}

export interface LibraryNameRequest {
  libraryname: string;
}

export interface ClientIdRequest {
  clientId: string;
}

// ===== Airtable Table IDs =====

export const TABLES = {
  TEMPLATE_USERS: 'tbljt0plqxdMARZXb',
  TEMPLATES: 'tblRwzpWoLgE9MrUm',
  BANNED_INSTANCES: 'tblEaBjs3Y6f4YmlR',
  LIBRARY_USERS: 'tbldQNGszIyOjt9a1',
} as const;

// ===== Field IDs =====

export const FIELDS = {
  // Template Users table
  TEMPLATE_USER_EMAILS: 'fldhvneqrRuoF5grB',

  // Library Users table
  LIBRARY_USER_EMAIL: 'fldFNavkQ2JJ6Kxt2',
  LIBRARY_USER_EMAILS_LIST: 'fldhvneqrRuoF5grB',

  // Templates table
  CLIENT_ID: 'fldtwvVVlTeDRlTYV',

  // Ban Status field ID
  BAN_STATUS_FIELD_ID: 'fldIvMlWqF6LZeLeW',
} as const;

// ===== Whitelisted Users =====

export const WHITELISTED_CREATORS = [
  'hello@zealousweb.com',
] as const;

// ===== Webhook Routes =====

export const WEBHOOK_ROUTES = {
  default: 'https://hooks.airtable.com/workflows/v1/genericWebhook/appMoIgXMTTTNIc3p/wflB6noIRsOtUoOGb/wtrVWT2OVm8z1gqIz',
} as const;
