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
 *   POST /api/checkLibraryname   — Check if a library name is taken
 *   POST /api/checkLibraryuser   — Check Library creator permission
 *   POST /api/checkLibraryemail  — Email-based creator lookup for Library intake
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
  AIRTABLE_LIBRARY_USERS_TABLE_ID?: string;
  AIRTABLE_LIBRARY_USERS_VIEW_ID?: string;
  AIRTABLE_LIBRARY_USER_EMAIL_FIELDS?: string;
  AIRTABLE_LIBRARY_PERMISSION_TABLE_ID?: string;
  AIRTABLE_LIBRARY_PERMISSION_VIEW_ID?: string;
  AIRTABLE_LIBRARY_PERMISSION_EMAIL_FIELDS?: string;
  AIRTABLE_LIBRARY_PERMISSION_FIELD?: string;
  AIRTABLE_LIBRARY_PERMISSION_ALLOWED_VALUES?: string;
  AIRTABLE_LIBRARY_ASSET_TYPE?: string;
  WHITELISTED_CREATORS?: string;
  ALLOWED_ORIGINS: string;
}

type AirtableRecord = { id: string; fields: Record<string, unknown> };

const DEFAULT_CREATORS_TABLE_ID = 'tbljt0plqxdMARZXb';
const DEFAULT_BANNED_INSTANCES_TABLE_ID = 'tblEaBjs3Y6f4YmlR';
const DEFAULT_LIBRARY_USERS_TABLE_ID = 'tbldQNGszIyOjt9a1';
const DEFAULT_LIBRARY_ASSET_TYPE = 'Library📚';
const DEFAULT_LIBRARY_PERMISSION_FIELD = '⚙️Can submit Libraries?';
const DEFAULT_LIBRARY_PERMISSION_ALLOWED_VALUES = ['1', 'true', 'yes', 'approved', 'allowed'];
const BAN_STATUS_FIELD_ID = 'fldIvMlWqF6LZeLeW';
const DEFAULT_WHITELISTED_CREATORS = ['hello@zealousweb.com'] as const;
const ASSET_CREATOR_EMAIL_FIELDS = [
  '🎨📧 Creator Email',
  '🎨📧 Creator WF Account Email',
  '📧Emails (from 🎨Creator)'
] as const;
const CREATOR_RECORD_EMAIL_FIELDS = ['📧Email', '📧WF Account Email', '📧Emails'] as const;
const DEFAULT_LIBRARY_USER_EMAIL_FIELDS = ['fldFNavkQ2JJ6Kxt2'] as const;
const DEFAULT_LIBRARY_PERMISSION_EMAIL_FIELDS = ['fldhvneqrRuoF5grB'] as const;
const CREATOR_ELIGIBILITY_FIELDS = [
  'Name',
  ...CREATOR_RECORD_EMAIL_FIELDS,
  '❌Banned Instance',
  '#️⃣👛Templates Published',
  '#️⃣👛Templates Submitted',
  '#️⃣👛Templates Delisted',
  '#️⃣Submission cap count'
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error.trim();
  if (
    typeof error === 'object' &&
    error &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message.trim();
  }

  return '';
}

function getTemplateNameAvailabilityFailureMessage(error: unknown): string {
  const normalized = getErrorMessage(error).toLowerCase();

  if (
    /runtime env not available|not configured|missing env|missing required environment/.test(
      normalized
    )
  ) {
    return 'Template name availability could not be checked because this form is not connected to the marketplace name database. The name has not been cleared yet; please try again later.';
  }

  if (
    /not authorized|unauthorized|forbidden|missing scopes?|access token|authentication|permission|401|403/.test(
      normalized
    )
  ) {
    return 'Template name availability could not be checked because the marketplace name lookup is not authorized. The name has not been cleared yet; please try again later or contact the Marketplace team if this continues.';
  }

  if (/rate limit|too many requests|429/.test(normalized)) {
    return 'Template name availability is rate limited right now. Wait a minute, then run Check name again.';
  }

  if (
    /not found|unknown field|invalid field|invalid table|table .*not|field .*not|404/.test(
      normalized
    )
  ) {
    return 'Template name availability could not be checked because the marketplace name database configuration needs attention. The name has not been cleared yet; please try again later.';
  }

  if (/timeout|timed out|abort/.test(normalized)) {
    return 'Template name availability timed out. The name has not been cleared yet; please run Check name again in a few minutes.';
  }

  if (
    /fetch failed|network|enotfound|econnreset|request failed with status 5\d\d|invalid response|temporarily unavailable/.test(
      normalized
    )
  ) {
    return 'Template name availability could not be checked because the marketplace name service did not respond. The name has not been cleared yet; please run Check name again in a few minutes.';
  }

  return 'Template name availability could not be checked right now. The name has not been cleared yet; please run Check name again in a few minutes.';
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
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
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
    if (offset) {
      params.set('offset', offset);
    }

    const url = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${options.tableId}?${params.toString()}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` }
    });

    if (!response.ok) {
      throw new Error(`Airtable returned ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as {
      records: AirtableRecord[];
      offset?: string;
    };
    records.push(...data.records);
    offset = data.offset;
  } while (offset && (!options.maxRecords || records.length < options.maxRecords));

  return options.maxRecords ? records.slice(0, options.maxRecords) : records;
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

function getLibraryUsersTableId(env: Env): string {
  return env.AIRTABLE_LIBRARY_USERS_TABLE_ID || DEFAULT_LIBRARY_USERS_TABLE_ID;
}

function getLibraryUsersViewId(env: Env): string | undefined {
  return env.AIRTABLE_LIBRARY_USERS_VIEW_ID || getCreatorsViewId(env);
}

function configuredList(value: string | undefined, fallback: readonly string[]): string[] {
  const configured = (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return configured.length > 0 ? configured : [...fallback];
}

function getLibraryUserEmailFields(env: Env): string[] {
  return configuredList(env.AIRTABLE_LIBRARY_USER_EMAIL_FIELDS, DEFAULT_LIBRARY_USER_EMAIL_FIELDS);
}

function getLibraryPermissionTableId(env: Env): string {
  if (env.AIRTABLE_LIBRARY_PERMISSION_TABLE_ID) return env.AIRTABLE_LIBRARY_PERMISSION_TABLE_ID;
  return env.AIRTABLE_LIBRARY_USERS_TABLE_ID ? getLibraryUsersTableId(env) : getCreatorsTableId(env);
}

function getLibraryPermissionViewId(env: Env): string | undefined {
  return env.AIRTABLE_LIBRARY_PERMISSION_VIEW_ID || getCreatorsViewId(env);
}

function getLibraryPermissionEmailFields(env: Env): string[] {
  return configuredList(
    env.AIRTABLE_LIBRARY_PERMISSION_EMAIL_FIELDS,
    env.AIRTABLE_LIBRARY_USERS_TABLE_ID
      ? getLibraryUserEmailFields(env)
      : DEFAULT_LIBRARY_PERMISSION_EMAIL_FIELDS
  );
}

function getLibraryPermissionField(env: Env): string {
  return env.AIRTABLE_LIBRARY_PERMISSION_FIELD || DEFAULT_LIBRARY_PERMISSION_FIELD;
}

function getLibraryPermissionAllowedValues(env: Env): Set<string> {
  return new Set(
    configuredList(
      env.AIRTABLE_LIBRARY_PERMISSION_ALLOWED_VALUES,
      DEFAULT_LIBRARY_PERMISSION_ALLOWED_VALUES
    ).map((value) => value.toLowerCase())
  );
}

function getLibraryAssetType(env: Env): string {
  return env.AIRTABLE_LIBRARY_ASSET_TYPE || DEFAULT_LIBRARY_ASSET_TYPE;
}

function escapeAirtableString(input: string): string {
  return input.replace(/'/g, "\\'");
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

function buildLibraryUserEmailFormula(email: string, env: Env): string {
  return buildEmailMatchFormula(email, getLibraryUserEmailFields(env));
}

function buildLibraryPermissionEmailFormula(email: string, env: Env): string {
  return buildEmailMatchFormula(email, getLibraryPermissionEmailFields(env));
}

function buildAssetTypeFormula(assetType: string): string {
  const escaped = escapeAirtableString(assetType);
  return `OR({🆎Type} = '${escaped}', {⚙️🆎Type (Text)} = '${escaped}')`;
}

function buildNameAvailabilityFormula(name: string, assetType?: string): string {
  const escapedName = escapeAirtableString(name);
  const base = `FIND(LOWER('${escapedName}'), LOWER({Name})) > 0`;
  const notArchived = `NOT(FIND(LOWER('archived'), LOWER({Name})) > 0)`;
  const clauses = [base, notArchived];
  if (assetType) clauses.push(buildAssetTypeFormula(assetType));
  return `AND(${clauses.join(', ')})`;
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

function firstFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = firstFiniteNumber(item);
      if (parsed !== undefined) return parsed;
    }
  }
  return undefined;
}

function hasAllowedPermission(value: unknown, allowedValues: Set<string>): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return allowedValues.has(value.trim().toLowerCase());
  if (Array.isArray(value)) return value.some((item) => hasAllowedPermission(item, allowedValues));
  return false;
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
  buildAssetTypeFormula,
  buildEmailMatchFormula,
  buildNameAvailabilityFormula,
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
    return json({ message: 'Template name is required.' }, 400, corsHeaders);
  }

  if (containsBlockedAgentTerm(templatename)) {
    return json(
      {
        message:
          'Template names containing "agent" or lookalike spellings are not allowed. Use a name that describes the template itself.'
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
          message:
            'Template names cannot include the standalone term "AI". Use a name that describes the template itself.'
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
  const formula = buildNameAvailabilityFormula(templatename);
  const records = await airtableQuery(env, {
    tableId: getAssetsTableId(env),
    viewId: getAssetsViewId(env),
    formula,
    fields: ['Name', '🚀Marketplace Status']
  });

  return json({ taken: records.length > 0 }, 200, corsHeaders);
}

async function handleCheckLibraryname(
  body: { libraryname?: string },
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { libraryname } = body;

  if (!libraryname || typeof libraryname !== 'string') {
    return json({ message: 'Library name is required.' }, 400, corsHeaders);
  }

  const formula = buildNameAvailabilityFormula(libraryname, getLibraryAssetType(env));
  const records = await airtableQuery(env, {
    tableId: getAssetsTableId(env),
    viewId: getAssetsViewId(env),
    formula,
    fields: ['Name', '🚀Marketplace Status', '🆎Type', '⚙️🆎Type (Text)'],
    maxRecords: 1
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
    formula: assetFormula,
    fields: ['Name', '🚀Marketplace Status', '📅Submitted Date']
  });

  const assetStats = summarizeTemplateSubmissionRecords(records);
  const assetsSubmitted30 = Math.max(
    assetStats.assetsSubmitted30,
    firstFiniteNumber(creatorFields['#️⃣Submission cap count']) ?? 0
  );
  const publishedTemplates = Math.max(
    assetStats.publishedTemplates,
    firstFiniteNumber(creatorFields['#️⃣👛Templates Published']) ?? 0
  );
  const delistedTemplates = Math.max(
    assetStats.delistedTemplates,
    firstFiniteNumber(creatorFields['#️⃣👛Templates Delisted']) ?? 0
  );
  const submittedTemplates = Math.max(
    assetStats.submittedTemplates,
    firstFiniteNumber(creatorFields['#️⃣👛Templates Submitted']) ?? 0
  );
  const { activeReviews } = assetStats;

  const isWhitelisted = getWhitelistedCreators(env).has(normalizedEmail);
  let hasError = false;
  let message = `${assetsSubmitted30} out of ${SUBMISSION_LIMIT} templates submitted in the past 30 days. Total submitted: ${submittedTemplates}. You can have 1 template submitted for review at a time.`;

  if (assetsSubmitted30 >= SUBMISSION_LIMIT) {
    hasError = true;
    message = `You have reached your submission limit of ${SUBMISSION_LIMIT} templates for the past 30 days. Total submitted: ${submittedTemplates}. Please wait to submit new templates.`;
  } else if (publishedTemplates + delistedTemplates >= 5 || isWhitelisted) {
    message = `${assetsSubmitted30} out of ${SUBMISSION_LIMIT} templates submitted in the past 30 days. Total submitted: ${submittedTemplates}. You can have unlimited concurrent submissions for review.`;
  } else {
    if (activeReviews >= 1) {
      hasError = true;
      message = `${assetsSubmitted30} out of ${SUBMISSION_LIMIT} templates submitted in the past 30 days. Total submitted: ${submittedTemplates}. You already have an active review in progress. Please wait for the review to complete before submitting another template.`;
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

async function handleCheckLibraryemail(
  body: { email?: string },
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  return handleCheckTemplateemail(body, env, corsHeaders);
}

async function handleCheckLibraryuser(
  body: { email?: string },
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { email } = body;

  if (!email || typeof email !== 'string') {
    return json(
      {
        userExists: false,
        canSubmitLibraries: false,
        hasError: true,
        message: 'Email is required'
      },
      400,
      corsHeaders
    );
  }

  const [userRecords, permissionRecords] = await Promise.all([
    airtableQuery(env, {
      tableId: getLibraryUsersTableId(env),
      viewId: getLibraryUsersViewId(env),
      formula: buildLibraryUserEmailFormula(email, env),
      maxRecords: 1
    }),
    airtableQuery(env, {
      tableId: getLibraryPermissionTableId(env),
      viewId: getLibraryPermissionViewId(env),
      formula: buildLibraryPermissionEmailFormula(email, env),
      maxRecords: 1
    })
  ]);

  const userRecord = userRecords[0];
  const permissionRecord = permissionRecords[0];
  const userExists = Boolean(userRecord);
  const canSubmitLibraries = permissionRecord
    ? hasAllowedPermission(
        permissionRecord.fields[getLibraryPermissionField(env)],
        getLibraryPermissionAllowedValues(env)
      )
    : false;

  return json(
    {
      userExists,
      canSubmitLibraries,
      hasError: !canSubmitLibraries,
      message: canSubmitLibraries
        ? 'Creator can submit Libraries.'
        : userExists
          ? 'Creator is not approved to submit Libraries.'
          : 'User not found in our system.'
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
            { path: '/api/checkTemplateemail', method: 'POST' },
            { path: '/api/checkLibraryname', method: 'POST' },
            { path: '/api/checkLibraryuser', method: 'POST' },
            { path: '/api/checkLibraryemail', method: 'POST' }
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
        case '/api/checkLibraryname':
          return await handleCheckLibraryname(body as { libraryname?: string }, env, corsHeaders);
        case '/api/checkLibraryuser':
          return await handleCheckLibraryuser(body as { email?: string }, env, corsHeaders);
        case '/api/checkLibraryemail':
          return await handleCheckLibraryemail(body as { email?: string }, env, corsHeaders);
        default:
          return json({ error: `Not found: ${path}` }, 404, corsHeaders);
      }
    } catch (error) {
      console.error(`[${path}]`, error);
      if (path === '/api/checkTemplatename') {
        return json(
          {
            message: getTemplateNameAvailabilityFailureMessage(error)
          },
          503,
          corsHeaders
        );
      }

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
