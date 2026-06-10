/**
 * Check Asset Name Worker
 *
 * Replaces check-asset-name.vercel.app with a Cloudflare Worker.
 * Provides name validation and creator lookup APIs for:
 * - Template submission form (client-side)
 * - Site analyzer MCP (server-side)
 * - Dashboard (server-side)
 *
 * Routes:
 *   POST /api/checkTemplatename  — Check if a template name is taken
 *   POST /api/checkTemplateuser  — Get creator submission stats
 *   POST /api/checkTemplateemail — Email-based creator lookup
 *   GET  /                       — Health/info
 */

interface Env {
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  AIRTABLE_TABLE_ID?: string;
  AIRTABLE_VIEW_ID?: string;
  AIRTABLE_ASSETS_TABLE_ID?: string;
  AIRTABLE_ASSETS_VIEW_ID?: string;
  AIRTABLE_CREATORS_TABLE_ID?: string;
  AIRTABLE_CREATORS_VIEW_ID?: string;
  AIRTABLE_BANNED_INSTANCES_TABLE_ID?: string;
  WHITELISTED_CREATORS?: string;
  ALLOWED_ORIGINS: string;
}

type AirtableRecord = { id: string; fields: Record<string, unknown> };

const DEFAULT_CREATORS_TABLE_ID = 'tbljt0plqxdMARZXb';
const DEFAULT_BANNED_INSTANCES_TABLE_ID = 'tblEaBjs3Y6f4YmlR';
const BAN_STATUS_FIELD_ID = 'fldIvMlWqF6LZeLeW';
const DEFAULT_WHITELISTED_CREATORS = ['hello@zealousweb.com'] as const;
const ASSET_CREATOR_EMAIL_FIELDS = [
  '🎨📧 Creator Email',
  '🎨📧 Creator WF Account Email',
  '📧Emails (from 🎨Creator)'
] as const;
const CREATOR_RECORD_EMAIL_FIELDS = ['📧Email', '📧WF Account Email', '📧Emails'] as const;
const CREATOR_ELIGIBILITY_FIELDS = [
  'Name',
  ...CREATOR_RECORD_EMAIL_FIELDS,
  '❌Banned Instance'
] as const;
const BANNED_INSTANCE_FIELDS = [
  'Name',
  'Reason',
  'Ban Status',
  'Start Date',
  'End Date',
  'Creator',
  BAN_STATUS_FIELD_ID
] as const;
const SUBMISSION_LIMIT = 6;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const EMAIL_TOKEN_BOUNDARY = '[^a-z0-9._%+@-]';
const ACTIVE_REVIEW_STATUS_PATTERN =
  /\b(ready|review|submitted|submission|changes requested|response|revision|qa)\b/i;
const REJECTED_STATUS_PATTERN = /\b(rejected|declined|not approved)\b/i;
const PUBLISHED_STATUS_PATTERN = /\bpublished\b/i;
const NOT_PUBLISHED_STATUS_PATTERN = /\b(not published|unpublished)\b/i;
const DELISTED_STATUS_PATTERN = /\bdelisted\b/i;
const CLOSED_STATUS_PATTERN = /\b(archived|abandoned|withdrawn|cancelled|canceled)\b/i;

// =============================================================================
// CORS
// =============================================================================

function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim());

  // Also allow the worker's own domain and localhost for dev
  const isAllowed =
    allowed.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowed[0] || '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function json(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

// =============================================================================
// Airtable Client
// =============================================================================

async function airtableQuery(
  env: Env,
  options: {
    tableId: string;
    formula: string;
    fields?: string[];
    viewId?: string;
    maxRecords?: number;
  }
): Promise<AirtableRecord[]> {
  const params = new URLSearchParams();
  params.set('filterByFormula', options.formula);
  if (options.viewId) {
    params.set('view', options.viewId);
  }
  if (options.maxRecords) {
    params.set('maxRecords', String(options.maxRecords));
  }
  if (options.fields) {
    for (const field of options.fields) params.append('fields[]', field);
  }

  const url = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${options.tableId}?${params.toString()}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` }
  });

  if (!response.ok) {
    throw new Error(`Airtable returned ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { records: AirtableRecord[] };
  return data.records;
}

async function airtableGetRecord(
  env: Env,
  options: {
    tableId: string;
    recordId: string;
    fields?: string[];
  }
): Promise<AirtableRecord> {
  const params = new URLSearchParams();
  if (options.fields) {
    for (const field of options.fields) params.append('fields[]', field);
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const url = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${options.tableId}/${options.recordId}${suffix}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` }
  });

  if (!response.ok) {
    throw new Error(`Airtable returned ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as AirtableRecord;
}

function getAssetsTableId(env: Env): string {
  return env.AIRTABLE_ASSETS_TABLE_ID || env.AIRTABLE_TABLE_ID || 'tblRwzpWoLgE9MrUm';
}

function getAssetsViewId(env: Env): string | undefined {
  return env.AIRTABLE_ASSETS_VIEW_ID || env.AIRTABLE_VIEW_ID;
}

function getCreatorsTableId(env: Env): string {
  return env.AIRTABLE_CREATORS_TABLE_ID || DEFAULT_CREATORS_TABLE_ID;
}

function getCreatorsViewId(env: Env): string | undefined {
  return env.AIRTABLE_CREATORS_VIEW_ID;
}

function getBannedInstancesTableId(env: Env): string {
  return env.AIRTABLE_BANNED_INSTANCES_TABLE_ID || DEFAULT_BANNED_INSTANCES_TABLE_ID;
}

function escapeAirtableString(input: string): string {
  return input.replace(/'/g, "''");
}

function escapeRegexLiteral(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildEmailMatchFormula(email: string, fields: readonly string[]): string {
  const normalizedEmail = email.trim().toLowerCase();
  const escapedEmail = escapeRegexLiteral(normalizedEmail);
  const exactEmailPattern = `(^|${EMAIL_TOKEN_BOUNDARY})${escapedEmail}($|${EMAIL_TOKEN_BOUNDARY})`;
  const airtablePattern = escapeAirtableString(exactEmailPattern);
  const clauses = fields.map(
    (field) => `REGEX_MATCH(LOWER({${field}} & ''), '${airtablePattern}')`
  );

  return `OR(${clauses.join(', ')})`;
}

function buildAssetCreatorEmailFormula(email: string): string {
  return `AND(${buildEmailMatchFormula(email, ASSET_CREATOR_EMAIL_FIELDS)}, {🆎Type} = 'Template🏗️')`;
}

function buildCreatorRecordEmailFormula(email: string): string {
  return buildEmailMatchFormula(email, CREATOR_RECORD_EMAIL_FIELDS);
}

function firstString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const next = firstString(item);
      if (next) return next;
    }
  }
  return '';
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => firstString(item)).filter(Boolean);
}

function getWhitelistedCreators(env: Env): Set<string> {
  const fromEnv = (env.WHITELISTED_CREATORS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return new Set([...DEFAULT_WHITELISTED_CREATORS.map((email) => email.toLowerCase()), ...fromEnv]);
}

async function getActiveBan(env: Env, bannedInstanceIds: string[]): Promise<AirtableRecord | null> {
  for (const recordId of bannedInstanceIds) {
    try {
      const record = await airtableGetRecord(env, {
        tableId: getBannedInstancesTableId(env),
        recordId,
        fields: [...BANNED_INSTANCE_FIELDS]
      });
      const status =
        firstString(record.fields[BAN_STATUS_FIELD_ID]) || firstString(record.fields['Ban Status']);

      if (status === 'Active') {
        return record;
      }
    } catch (error) {
      console.error('[checkTemplateuser] failed to fetch banned instance', recordId, error);
    }
  }

  return null;
}

function normalizeMarketplaceStatus(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(' ');
  }

  return typeof value === 'string' ? value : String(value || '');
}

function isPublishedMarketplaceStatus(status: unknown): boolean {
  const normalized = normalizeMarketplaceStatus(status);
  return (
    PUBLISHED_STATUS_PATTERN.test(normalized) && !NOT_PUBLISHED_STATUS_PATTERN.test(normalized)
  );
}

function isRejectedMarketplaceStatus(status: unknown): boolean {
  return REJECTED_STATUS_PATTERN.test(normalizeMarketplaceStatus(status));
}

function isDelistedMarketplaceStatus(status: unknown): boolean {
  return DELISTED_STATUS_PATTERN.test(normalizeMarketplaceStatus(status));
}

function isClosedMarketplaceStatus(status: unknown): boolean {
  return CLOSED_STATUS_PATTERN.test(normalizeMarketplaceStatus(status));
}

function isTerminalMarketplaceStatus(status: unknown): boolean {
  return (
    isPublishedMarketplaceStatus(status) ||
    isRejectedMarketplaceStatus(status) ||
    isDelistedMarketplaceStatus(status) ||
    isClosedMarketplaceStatus(status)
  );
}

function isActiveReviewMarketplaceStatus(status: unknown): boolean {
  const normalized = normalizeMarketplaceStatus(status);
  return !isTerminalMarketplaceStatus(normalized) && ACTIVE_REVIEW_STATUS_PATTERN.test(normalized);
}

export interface TemplateSubmissionStats {
  submittedTemplates: number;
  assetsSubmitted30: number;
  publishedTemplates: number;
  rejectedTemplates: number;
  delistedTemplates: number;
  activeReviews: number;
}

export function summarizeTemplateSubmissionRecords(
  records: AirtableRecord[],
  now = Date.now()
): TemplateSubmissionStats {
  let assetsSubmitted30 = 0;
  let publishedTemplates = 0;
  let rejectedTemplates = 0;
  let delistedTemplates = 0;
  let activeReviews = 0;

  for (const record of records) {
    const status = record.fields['🚀Marketplace Status'];
    if (isPublishedMarketplaceStatus(status)) publishedTemplates++;
    if (isRejectedMarketplaceStatus(status)) rejectedTemplates++;
    if (isDelistedMarketplaceStatus(status)) delistedTemplates++;
    if (isActiveReviewMarketplaceStatus(status)) activeReviews++;

    const submitted = record.fields['📅Submitted Date'] as string;
    const submittedAt = submitted ? new Date(submitted).getTime() : Number.NaN;
    if (Number.isFinite(submittedAt) && now - submittedAt < THIRTY_DAYS_MS) {
      assetsSubmitted30++;
    }
  }

  return {
    submittedTemplates: records.length,
    assetsSubmitted30,
    publishedTemplates,
    rejectedTemplates,
    delistedTemplates,
    activeReviews
  };
}

export const workerTestExports = {
  buildEmailMatchFormula,
  isActiveReviewMarketplaceStatus,
  isRejectedMarketplaceStatus,
  summarizeTemplateSubmissionRecords
};

// =============================================================================
// Name exceptions (ported from Vercel function)
// =============================================================================

const NAME_EXCEPTIONS = new Set(['orizon', 'cycle', 'noda', 'sana', 'noday studio']);
const AGENT_OBFUSCATION_PATTERN =
  /(^|[^a-z0-9])(?:a|@|4)[^a-z0-9]*(?:g|9|6)[^a-z0-9]*(?:e|3)[^a-z0-9]*n[^a-z0-9]*(?:t|7|\+)/i;
const CAMEL_CASE_AGENT_PATTERN = /[a-z0-9](?:Agent|Agents|Agentic)(?:\b|[A-Z0-9])/;
const BLOCKED_AGENT_TERM = 'agent';

function normalizeSearchGamingName(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[96]/g, 'g')
    .replace(/3/g, 'e')
    .replace(/[7+]/g, 't');
}

function containsBlockedAgentTerm(value: string): boolean {
  const normalized = normalizeSearchGamingName(value);
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);

  if (
    tokens.some((token) => token === BLOCKED_AGENT_TERM || token.startsWith(BLOCKED_AGENT_TERM))
  ) {
    return true;
  }

  return AGENT_OBFUSCATION_PATTERN.test(normalized) || CAMEL_CASE_AGENT_PATTERN.test(value);
}

// =============================================================================
// Route Handlers
// =============================================================================

async function handleCheckTemplatename(
  body: { templatename?: string },
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { templatename } = body;

  if (!templatename || typeof templatename !== 'string') {
    return json({ message: 'templatename is required' }, 400, corsHeaders);
  }

  if (containsBlockedAgentTerm(templatename)) {
    return json(
      {
        message:
          'Template names containing "agent" or lookalike spellings are not allowed. Please use alternative naming.'
      },
      400,
      corsHeaders
    );
  }

  // AI restriction (allow "Air" but block "AI")
  const aiPattern = /\bAI\b|\bai\b/i;
  const airPattern = /\bAir\b|\bair\b/i;
  if (aiPattern.test(templatename)) {
    const isAirOnly =
      airPattern.test(templatename) &&
      !templatename.toLowerCase().includes('ai ') &&
      !templatename.toLowerCase().includes(' ai');
    if (!isAirOnly) {
      return json(
        {
          message: 'Template names containing "AI" are not allowed. Please use alternative naming.'
        },
        400,
        corsHeaders
      );
    }
  }

  // Hardcoded exceptions
  if (NAME_EXCEPTIONS.has(templatename.toLowerCase())) {
    return json({ taken: false }, 200, corsHeaders);
  }

  // Special "relay" logic — allow up to 2
  if (templatename.toLowerCase().includes('relay')) {
    const formula = `AND(FIND(LOWER('relay'), LOWER({Name})) > 0, NOT(FIND(LOWER('archived'), LOWER({Name})) > 0))`;
    const records = await airtableQuery(env, {
      tableId: getAssetsTableId(env),
      viewId: getAssetsViewId(env),
      formula,
      fields: ['Name']
    });
    if (records.length < 2) {
      return json({ taken: false }, 200, corsHeaders);
    }
  }

  // Airtable substring search (case-insensitive, exclude archived)
  const formula = `AND(FIND(LOWER('${templatename.replace(/'/g, "\\'")}'), LOWER({Name})) > 0, NOT(FIND(LOWER('archived'), LOWER({Name})) > 0))`;
  const records = await airtableQuery(env, {
    tableId: getAssetsTableId(env),
    viewId: getAssetsViewId(env),
    formula,
    fields: ['Name', '🚀Marketplace Status']
  });

  return json({ taken: records.length > 0 }, 200, corsHeaders);
}

async function handleCheckTemplateuser(
  body: { email?: string },
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { email } = body;

  if (!email || typeof email !== 'string') {
    return json(
      { hasError: true, message: 'Email is required', assetsSubmitted30: 0 },
      400,
      corsHeaders
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const creatorFormula = buildCreatorRecordEmailFormula(normalizedEmail);
  const creatorRecords = await airtableQuery(env, {
    tableId: getCreatorsTableId(env),
    viewId: getCreatorsViewId(env),
    formula: creatorFormula,
    fields: [...CREATOR_ELIGIBILITY_FIELDS],
    maxRecords: 1
  });

  if (creatorRecords.length === 0) {
    return json(
      {
        userExists: false,
        hasError: true,
        message: 'User not found in our system.',
        assetsSubmitted30: 0
      },
      200,
      corsHeaders
    );
  }

  const creatorFields = creatorRecords[0].fields;
  const activeBan = await getActiveBan(env, stringArray(creatorFields['❌Banned Instance']));
  if (activeBan) {
    const banReason =
      firstString(activeBan.fields['Name']) ||
      firstString(activeBan.fields['Reason']) ||
      'No reason provided';
    const startDate = firstString(activeBan.fields['Start Date']) || 'Unknown date';
    const endDate = firstString(activeBan.fields['End Date']) || 'Not specified';
    const creator =
      firstString(activeBan.fields['Creator']) || firstString(creatorFields['Name']) || 'Unknown';

    let message = `Your account has been banned from submitting templates. Reason: ${banReason}.`;
    if (startDate !== 'Unknown date') {
      message += ` Ban started: ${startDate}.`;
    }
    if (endDate !== 'Not specified') {
      message += ` Ban ends: ${endDate}.`;
    }
    message += ' Please contact support for assistance.';

    return json(
      {
        userExists: true,
        isBanned: true,
        hasError: true,
        message,
        assetsSubmitted30: 0,
        publishedTemplates: 0,
        submittedTemplates: 0,
        activeReviews: 0,
        isWhitelisted: false,
        banDetails: {
          reason: banReason,
          startDate,
          endDate,
          creator,
          status: 'Active'
        }
      },
      200,
      corsHeaders
    );
  }

  const assetFormula = buildAssetCreatorEmailFormula(normalizedEmail);
  const records = await airtableQuery(env, {
    tableId: getAssetsTableId(env),
    viewId: getAssetsViewId(env),
    formula: assetFormula,
    fields: ['Name', '🚀Marketplace Status', '📅Submitted Date']
  });

  const {
    assetsSubmitted30,
    publishedTemplates,
    delistedTemplates,
    activeReviews,
    submittedTemplates
  } = summarizeTemplateSubmissionRecords(records);

  const isWhitelisted = getWhitelistedCreators(env).has(normalizedEmail);
  let hasError = false;
  let message = `${assetsSubmitted30} out of ${SUBMISSION_LIMIT} templates submitted this month. Total submitted: ${submittedTemplates}. You can have 1 template submitted for review at a time.`;

  if (assetsSubmitted30 >= SUBMISSION_LIMIT) {
    hasError = true;
    message = `You have reached your submission limit of ${SUBMISSION_LIMIT} templates for the past 30 days. Total submitted: ${submittedTemplates}. Please wait to submit new templates.`;
  } else if (publishedTemplates + delistedTemplates >= 5 || isWhitelisted) {
    message = `${assetsSubmitted30} out of ${SUBMISSION_LIMIT} templates submitted this month. Total submitted: ${submittedTemplates}. You can have unlimited concurrent submissions for review.`;
  } else {
    if (activeReviews >= 1) {
      hasError = true;
      message = `${assetsSubmitted30} out of ${SUBMISSION_LIMIT} templates submitted this month. Total submitted: ${submittedTemplates}. You already have an active review in progress. Please wait for the review to complete before submitting another template.`;
    }
  }

  return json(
    {
      userExists: true,
      message,
      assetsSubmitted30,
      publishedTemplates,
      submittedTemplates,
      activeReviews,
      isWhitelisted,
      hasError
    },
    200,
    corsHeaders
  );
}

async function handleCheckTemplateemail(
  body: { email?: string },
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { email } = body;

  if (!email || typeof email !== 'string') {
    return json({ message: 'email is required' }, 400, corsHeaders);
  }

  const formula = buildCreatorRecordEmailFormula(email);
  const records = await airtableQuery(env, {
    tableId: getCreatorsTableId(env),
    viewId: getCreatorsViewId(env),
    formula,
    fields: ['Name', ...CREATOR_RECORD_EMAIL_FIELDS],
    maxRecords: 1
  });
  const emailExists = records.length > 0;

  return json(
    {
      emailExists,
      message: emailExists ? 'This email is already in use.' : 'This email is available.'
    },
    200,
    corsHeaders
  );
}

// =============================================================================
// Worker Entry Point
// =============================================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = getCorsHeaders(request, env);

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Health
    if (path === '/' || path === '/health') {
      return json(
        {
          name: 'check-asset-name',
          version: '1.0.0',
          endpoints: [
            { path: '/api/checkTemplatename', method: 'POST' },
            { path: '/api/checkTemplateuser', method: 'POST' },
            { path: '/api/checkTemplateemail', method: 'POST' }
          ]
        },
        200,
        corsHeaders
      );
    }

    // Only POST for API routes
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ error: 'Invalid JSON' }, 400, corsHeaders);
    }

    try {
      switch (path) {
        case '/api/checkTemplatename':
          return await handleCheckTemplatename(body as { templatename?: string }, env, corsHeaders);
        case '/api/checkTemplateuser':
          return await handleCheckTemplateuser(body as { email?: string }, env, corsHeaders);
        case '/api/checkTemplateemail':
          return await handleCheckTemplateemail(body as { email?: string }, env, corsHeaders);
        default:
          return json({ error: `Not found: ${path}` }, 404, corsHeaders);
      }
    } catch (error) {
      console.error(`[${path}]`, error);
      return json(
        {
          error: error instanceof Error ? error.message : 'Internal error'
        },
        500,
        corsHeaders
      );
    }
  }
};
