/**
 * Abundance Staff MCP Worker
 *
 * Dify-facing MCP surface for Paylocity headcount/staff reference data.
 * This intentionally does not read from the jobs DB or concierge chat DB.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { z } from 'zod';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  DB: D1Database;
  MCP_API_KEY?: string;
  ALLOW_PII_LOOKUP?: string;
  DIFY_AGENT_NAME?: string;
}

interface CurrentHeadcountRow {
  staff_profile_id: string;
  paylocity_employee_id: string;
  display_name: string;
  role_bucket: string | null;
  active_status: string;
  position_code: string | null;
  position_description: string | null;
  department_code: string | null;
  department_description: string | null;
  program: string | null;
  cost_center1: string | null;
  cost_center2: string | null;
  location_description: string | null;
  work_state: string | null;
  employee_status_code: string | null;
  employment_type: string | null;
  company_name: string | null;
  supervisor_name: string | null;
  hire_date: string | null;
  source_file_name: string | null;
  imported_at: string | null;
  updated_at: string;
}

interface ContactPointRow {
  id: string;
  type: string;
  label: string | null;
  value: string;
  redacted_value: string | null;
  is_primary: number;
  verified_at: string | null;
  updated_at: string;
}

interface AddressRow {
  id: string;
  type: string;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  redacted_label: string | null;
  updated_at: string;
}

interface EnrichmentTaskRow {
  id: string;
  staff_profile_id: string | null;
  paylocity_employee_id: string | null;
  task_type: string;
  status: string;
  priority: number;
  requested_by: string | null;
  assigned_to: string | null;
  instructions: string | null;
  input_json: string | null;
  result_json: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

const SERVER_NAME = 'abundance-staff';
const SERVER_VERSION = '0.1.0';

const ACTIVE_STATUSES = ['active', 'inactive', 'unknown', 'all'] as const;
const ENRICHMENT_TASK_TYPES = [
  'credential_check',
  'contact_validation',
  'role_classification',
  'location_normalization',
  'outreach_readiness',
  'other'
] as const;
const ENRICHMENT_STATUSES = ['pending', 'in_progress', 'completed', 'failed', 'cancelled'] as const;

function textResult(payload: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    ...(isError ? { isError: true } : {})
  };
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, Accept');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  const apiKeyHeader = request.headers.get('X-API-Key');
  const params = new URL(request.url).searchParams;
  const tokenFromQuery =
    params.get('token') ?? params.get('api_key') ?? params.get('access_token') ?? params.get('key');

  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  return apiKeyHeader?.trim() || tokenFromQuery?.trim() || null;
}

async function digestToken(value: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

async function constantTimeTokenEqual(left: string, right: string): Promise<boolean> {
  const [leftDigest, rightDigest] = await Promise.all([digestToken(left), digestToken(right)]);
  let diff = leftDigest.length ^ rightDigest.length;

  for (let index = 0; index < Math.max(leftDigest.length, rightDigest.length); index += 1) {
    diff |= (leftDigest[index] ?? 0) ^ (rightDigest[index] ?? 0);
  }

  return diff === 0;
}

async function validateApiKey(request: Request, env: Env): Promise<Response | null> {
  if (!env.MCP_API_KEY) {
    return new Response(
      JSON.stringify({
        error: 'ServerMisconfigured',
        message: 'MCP_API_KEY is not configured for this deployment.'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }

  const provided = extractApiKey(request);
  if (!provided || !(await constantTimeTokenEqual(provided, env.MCP_API_KEY))) {
    return new Response(
      JSON.stringify({
        error: 'Unauthorized',
        message: 'Valid API key required. Use Authorization: Bearer <token>, X-API-Key, or ?token=.'
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }

  return null;
}

function isoNow(): string {
  return new Date().toISOString();
}

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  const candidate = value ?? fallback;
  if (!Number.isFinite(candidate)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(candidate)));
}

function makeLikeTerm(value: string): string {
  return `%${value.trim().toLowerCase()}%`;
}

function parseJsonRecord(value: string | null): Record<string, unknown> | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function stringifyJsonRecord(value: Record<string, unknown> | undefined): string | null {
  if (!value) return null;
  return JSON.stringify(value);
}

function actorFor(env: Env): string {
  return env.DIFY_AGENT_NAME || 'dify';
}

function requirePiiAccess(env: Env): ReturnType<typeof textResult> | null {
  if (env.ALLOW_PII_LOOKUP === 'true') return null;

  return textResult(
    {
      error: 'PiiAccessDisabled',
      message:
        'Contact/address values are disabled for this MCP deployment. Set ALLOW_PII_LOOKUP=true only for approved Dify agents.'
    },
    true
  );
}

async function recordAudit(
  db: D1Database,
  input: {
    toolName: string;
    actionType: 'read' | 'write';
    subjectType?: string;
    subjectId?: string;
    piiAccessed?: boolean;
    actor?: string;
    requestSource?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO staff_mcp_audit_events (
          id,
          tool_name,
          action_type,
          subject_type,
          subject_id,
          pii_accessed,
          actor,
          request_source,
          metadata_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      crypto.randomUUID(),
      input.toolName,
      input.actionType,
      input.subjectType ?? null,
      input.subjectId ?? null,
      input.piiAccessed ? 1 : 0,
      input.actor ?? null,
      input.requestSource ?? 'mcp',
      input.metadata ? JSON.stringify(input.metadata) : null
    )
    .run();
}

function buildCurrentFilterClauses(filters: {
  active_status?: (typeof ACTIVE_STATUSES)[number];
  role_bucket?: string;
  department?: string;
  location?: string;
  program?: string;
}): { clauses: string[]; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.active_status && filters.active_status !== 'all') {
    clauses.push('active_status = ?');
    params.push(filters.active_status);
  }

  if (filters.role_bucket) {
    clauses.push("LOWER(COALESCE(role_bucket, '')) LIKE ?");
    params.push(makeLikeTerm(filters.role_bucket));
  }

  if (filters.department) {
    clauses.push("LOWER(COALESCE(department_description, '')) LIKE ?");
    params.push(makeLikeTerm(filters.department));
  }

  if (filters.location) {
    clauses.push("LOWER(COALESCE(location_description, '')) LIKE ?");
    params.push(makeLikeTerm(filters.location));
  }

  if (filters.program) {
    clauses.push("LOWER(COALESCE(program, '')) LIKE ?");
    params.push(makeLikeTerm(filters.program));
  }

  return { clauses, params };
}

function whereSql(clauses: string[]): string {
  return clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '';
}

function shapeHeadcountRow(row: CurrentHeadcountRow): Record<string, unknown> {
  return {
    staff_profile_id: row.staff_profile_id,
    paylocity_employee_id: row.paylocity_employee_id,
    display_name: row.display_name,
    role_bucket: row.role_bucket,
    active_status: row.active_status,
    position: {
      code: row.position_code,
      description: row.position_description,
      employment_type: row.employment_type
    },
    department: {
      code: row.department_code,
      description: row.department_description,
      program: row.program,
      cost_center1: row.cost_center1,
      cost_center2: row.cost_center2
    },
    location: {
      description: row.location_description,
      state: row.work_state
    },
    company_name: row.company_name,
    supervisor_name: row.supervisor_name,
    hire_date: row.hire_date,
    source: {
      file_name: row.source_file_name,
      imported_at: row.imported_at,
      updated_at: row.updated_at
    }
  };
}

function shapeContactPoint(row: ContactPointRow): Record<string, unknown> {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    value: row.value,
    is_primary: row.is_primary === 1,
    verified_at: row.verified_at,
    updated_at: row.updated_at
  };
}

function shapeAddress(row: AddressRow): Record<string, unknown> {
  return {
    id: row.id,
    type: row.type,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    state: row.state,
    postal_code: row.postal_code,
    country: row.country,
    updated_at: row.updated_at
  };
}

function shapeEnrichmentTask(row: EnrichmentTaskRow): Record<string, unknown> {
  return {
    id: row.id,
    staff_profile_id: row.staff_profile_id,
    paylocity_employee_id: row.paylocity_employee_id,
    task_type: row.task_type,
    status: row.status,
    priority: row.priority,
    requested_by: row.requested_by,
    assigned_to: row.assigned_to,
    instructions: row.instructions,
    input: parseJsonRecord(row.input_json),
    result: parseJsonRecord(row.result_json),
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at
  };
}

export class AbundanceStaffMCP extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

  async init() {
    const db = this.env.DB;

    this.server.resource(
      'abundance-staff-stats',
      'abundance-staff://stats',
      {
        description: 'Aggregate counts and freshness for Paylocity staff/headcount records.',
        mimeType: 'application/json'
      },
      async () => {
        const totals = await db
          .prepare(
            `
              SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN active_status = 'active' THEN 1 ELSE 0 END) AS active_total,
                MAX(imported_at) AS latest_imported_at,
                MAX(updated_at) AS latest_updated_at
              FROM staff_headcount_current
            `
          )
          .first<{
            total: number;
            active_total: number;
            latest_imported_at: string | null;
            latest_updated_at: string | null;
          }>();

        const byRole = await db
          .prepare(
            `
              SELECT COALESCE(role_bucket, 'Unclassified') AS role_bucket, COUNT(*) AS count
              FROM staff_headcount_current
              GROUP BY COALESCE(role_bucket, 'Unclassified')
              ORDER BY count DESC, role_bucket ASC
            `
          )
          .all<{ role_bucket: string; count: number }>();

        const byDepartment = await db
          .prepare(
            `
              SELECT COALESCE(department_description, 'Unknown') AS department, COUNT(*) AS count
              FROM staff_headcount_current
              GROUP BY COALESCE(department_description, 'Unknown')
              ORDER BY count DESC, department ASC
              LIMIT 25
            `
          )
          .all<{ department: string; count: number }>();

        return {
          contents: [
            {
              uri: 'abundance-staff://stats',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  total: totals?.total ?? 0,
                  active_total: totals?.active_total ?? 0,
                  latest_imported_at: totals?.latest_imported_at ?? null,
                  latest_updated_at: totals?.latest_updated_at ?? null,
                  by_role: byRole.results,
                  by_department: byDepartment.results
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    this.server.resource(
      'abundance-staff-role-taxonomy',
      'abundance-staff://role-taxonomy',
      {
        description: 'Role bucket and Paylocity position summary for staff classification.',
        mimeType: 'application/json'
      },
      async () => {
        const rows = await db.prepare('SELECT * FROM staff_role_summary LIMIT 100').all<{
          role_bucket: string;
          position_description: string;
          staff_count: number;
          latest_imported_at: string | null;
        }>();

        return {
          contents: [
            {
              uri: 'abundance-staff://role-taxonomy',
              mimeType: 'application/json',
              text: JSON.stringify({ roles: rows.results }, null, 2)
            }
          ]
        };
      }
    );

    this.server.tool(
      'abundance_staff_summarize_headcount',
      'Summarize Paylocity staff/headcount counts with optional role, department, location, and program filters. Read-only.',
      {
        active_status: z
          .enum(ACTIVE_STATUSES)
          .optional()
          .describe('Default active. Use all to include inactive/unknown records.'),
        role_bucket: z
          .string()
          .optional()
          .describe('Case-insensitive role bucket filter, such as Nurse Practitioner.'),
        department: z
          .string()
          .optional()
          .describe('Case-insensitive department description filter.'),
        location: z.string().optional().describe('Case-insensitive work location filter.'),
        program: z.string().optional().describe('Case-insensitive program/cost center filter.')
      },
      async ({ active_status = 'active', role_bucket, department, location, program }) => {
        try {
          const filters = { active_status, role_bucket, department, location, program };
          const { clauses, params } = buildCurrentFilterClauses(filters);
          const suffix = whereSql(clauses);

          const totals = await db
            .prepare(
              `
                SELECT
                  COUNT(*) AS total,
                  MAX(imported_at) AS latest_imported_at,
                  MAX(updated_at) AS latest_updated_at
                FROM staff_headcount_current
                ${suffix}
              `
            )
            .bind(...params)
            .first<{
              total: number;
              latest_imported_at: string | null;
              latest_updated_at: string | null;
            }>();

          const byRole = await db
            .prepare(
              `
                SELECT COALESCE(role_bucket, 'Unclassified') AS role_bucket, COUNT(*) AS count
                FROM staff_headcount_current
                ${suffix}
                GROUP BY COALESCE(role_bucket, 'Unclassified')
                ORDER BY count DESC, role_bucket ASC
              `
            )
            .bind(...params)
            .all<{ role_bucket: string; count: number }>();

          const byDepartment = await db
            .prepare(
              `
                SELECT COALESCE(department_description, 'Unknown') AS department, COUNT(*) AS count
                FROM staff_headcount_current
                ${suffix}
                GROUP BY COALESCE(department_description, 'Unknown')
                ORDER BY count DESC, department ASC
                LIMIT 50
              `
            )
            .bind(...params)
            .all<{ department: string; count: number }>();

          const byLocation = await db
            .prepare(
              `
                SELECT COALESCE(location_description, 'Unknown') AS location, COUNT(*) AS count
                FROM staff_headcount_current
                ${suffix}
                GROUP BY COALESCE(location_description, 'Unknown')
                ORDER BY count DESC, location ASC
                LIMIT 50
              `
            )
            .bind(...params)
            .all<{ location: string; count: number }>();

          await recordAudit(db, {
            toolName: 'abundance_staff_summarize_headcount',
            actionType: 'read',
            actor: actorFor(this.env),
            metadata: { filters }
          });

          return textResult({
            filters,
            total: totals?.total ?? 0,
            latest_imported_at: totals?.latest_imported_at ?? null,
            latest_updated_at: totals?.latest_updated_at ?? null,
            by_role: byRole.results,
            by_department: byDepartment.results,
            by_location: byLocation.results
          });
        } catch (error) {
          return textResult({ error: String(error) }, true);
        }
      }
    );

    this.server.tool(
      'abundance_staff_search_profiles',
      'Search staff profiles and current Paylocity employment metadata. Does not return contact/address values.',
      {
        query: z
          .string()
          .optional()
          .describe(
            'Case-insensitive search over name, employee ID, position, department, and location.'
          ),
        active_status: z
          .enum(ACTIVE_STATUSES)
          .optional()
          .describe('Default active. Use all to include inactive/unknown records.'),
        role_bucket: z.string().optional(),
        department: z.string().optional(),
        location: z.string().optional(),
        program: z.string().optional(),
        limit: z.number().int().optional().describe('Default 20, max 100.'),
        offset: z.number().int().optional().describe('Default 0.')
      },
      async ({
        query,
        active_status = 'active',
        role_bucket,
        department,
        location,
        program,
        limit,
        offset
      }) => {
        try {
          const safeLimit = clampInt(limit, 20, 1, 100);
          const safeOffset = clampInt(offset, 0, 0, 50000);
          const filters = { active_status, role_bucket, department, location, program };
          const { clauses, params } = buildCurrentFilterClauses(filters);

          if (query?.trim()) {
            clauses.push(`
              (
                LOWER(display_name) LIKE ?
                OR LOWER(paylocity_employee_id) LIKE ?
                OR LOWER(COALESCE(position_description, '')) LIKE ?
                OR LOWER(COALESCE(department_description, '')) LIKE ?
                OR LOWER(COALESCE(location_description, '')) LIKE ?
              )
            `);
            const term = makeLikeTerm(query);
            params.push(term, term, term, term, term);
          }

          const rows = await db
            .prepare(
              `
                SELECT *
                FROM staff_headcount_current
                ${whereSql(clauses)}
                ORDER BY display_name ASC
                LIMIT ? OFFSET ?
              `
            )
            .bind(...params, safeLimit, safeOffset)
            .all<CurrentHeadcountRow>();

          await recordAudit(db, {
            toolName: 'abundance_staff_search_profiles',
            actionType: 'read',
            actor: actorFor(this.env),
            metadata: { query: query ?? null, filters, limit: safeLimit, offset: safeOffset }
          });

          return textResult({
            profiles: rows.results.map((row) => shapeHeadcountRow(row)),
            meta: {
              limit: safeLimit,
              offset: safeOffset,
              count: rows.results.length,
              contact_values_included: false
            }
          });
        } catch (error) {
          return textResult({ error: String(error) }, true);
        }
      }
    );

    this.server.tool(
      'abundance_staff_get_profile',
      'Get one staff profile by staff profile ID or Paylocity employee ID. Contact/address values are opt-in and deployment-gated.',
      {
        staff_profile_id: z.string().optional(),
        paylocity_employee_id: z.string().optional(),
        include_contact: z
          .boolean()
          .optional()
          .describe('Default false. Requires ALLOW_PII_LOOKUP=true.')
      },
      async ({ staff_profile_id, paylocity_employee_id, include_contact = false }) => {
        try {
          if (!staff_profile_id && !paylocity_employee_id) {
            return textResult(
              {
                error: 'MissingIdentifier',
                message: 'Provide staff_profile_id or paylocity_employee_id.'
              },
              true
            );
          }

          if (include_contact) {
            const piiError = requirePiiAccess(this.env);
            if (piiError) return piiError;
          }

          const row = staff_profile_id
            ? await db
                .prepare('SELECT * FROM staff_headcount_current WHERE staff_profile_id = ?')
                .bind(staff_profile_id)
                .first<CurrentHeadcountRow>()
            : await db
                .prepare('SELECT * FROM staff_headcount_current WHERE paylocity_employee_id = ?')
                .bind(paylocity_employee_id)
                .first<CurrentHeadcountRow>();

          if (!row) {
            return textResult(
              {
                error: 'ProfileNotFound',
                message: 'No staff profile matched the provided identifier.'
              },
              true
            );
          }

          const contactCounts = await db
            .prepare(
              `
                SELECT type, COUNT(*) AS count
                FROM staff_contact_points
                WHERE staff_profile_id = ?
                GROUP BY type
                ORDER BY type ASC
              `
            )
            .bind(row.staff_profile_id)
            .all<{ type: string; count: number }>();

          const addressCounts = await db
            .prepare(
              `
                SELECT type, COUNT(*) AS count
                FROM staff_addresses
                WHERE staff_profile_id = ?
                GROUP BY type
                ORDER BY type ASC
              `
            )
            .bind(row.staff_profile_id)
            .all<{ type: string; count: number }>();

          let contacts: Record<string, unknown>[] | null = null;
          let addresses: Record<string, unknown>[] | null = null;

          if (include_contact) {
            const contactRows = await db
              .prepare(
                `
                  SELECT id, type, label, value, redacted_value, is_primary, verified_at, updated_at
                  FROM staff_contact_points
                  WHERE staff_profile_id = ?
                  ORDER BY is_primary DESC, type ASC, updated_at DESC
                `
              )
              .bind(row.staff_profile_id)
              .all<ContactPointRow>();

            const addressRows = await db
              .prepare(
                `
                  SELECT id, type, line1, line2, city, state, postal_code, country, redacted_label, updated_at
                  FROM staff_addresses
                  WHERE staff_profile_id = ?
                  ORDER BY type ASC, updated_at DESC
                `
              )
              .bind(row.staff_profile_id)
              .all<AddressRow>();

            contacts = contactRows.results.map((contact) => shapeContactPoint(contact));
            addresses = addressRows.results.map((address) => shapeAddress(address));
          }

          await recordAudit(db, {
            toolName: 'abundance_staff_get_profile',
            actionType: 'read',
            subjectType: 'staff_profile',
            subjectId: row.staff_profile_id,
            piiAccessed: include_contact,
            actor: actorFor(this.env),
            metadata: { include_contact }
          });

          return textResult({
            profile: shapeHeadcountRow(row),
            contact_summary: {
              contact_counts: contactCounts.results,
              address_counts: addressCounts.results,
              values_included: include_contact
            },
            contacts,
            addresses
          });
        } catch (error) {
          return textResult({ error: String(error) }, true);
        }
      }
    );

    this.server.tool(
      'abundance_staff_queue_enrichment_task',
      'Create a Dify-agent enrichment task for a staff profile. Does not mutate canonical staff fields.',
      {
        staff_profile_id: z.string().optional(),
        paylocity_employee_id: z.string().optional(),
        task_type: z.enum(ENRICHMENT_TASK_TYPES),
        priority: z.number().int().optional().describe('1 highest, 5 lowest. Default 3.'),
        requested_by: z.string().optional().describe('Human or agent requesting the task.'),
        assigned_to: z
          .string()
          .optional()
          .describe('Optional assignee, such as a Dify workflow name.'),
        instructions: z.string().optional(),
        input: z.record(z.unknown()).optional()
      },
      async ({
        staff_profile_id,
        paylocity_employee_id,
        task_type,
        priority,
        requested_by,
        assigned_to,
        instructions,
        input
      }) => {
        try {
          let resolvedProfileId = staff_profile_id ?? null;
          let resolvedEmployeeId = paylocity_employee_id ?? null;

          if (!resolvedProfileId && resolvedEmployeeId) {
            const profile = await db
              .prepare(
                'SELECT staff_profile_id, paylocity_employee_id FROM staff_headcount_current WHERE paylocity_employee_id = ?'
              )
              .bind(resolvedEmployeeId)
              .first<{ staff_profile_id: string; paylocity_employee_id: string }>();
            resolvedProfileId = profile?.staff_profile_id ?? null;
          }

          if (resolvedProfileId && !resolvedEmployeeId) {
            const profile = await db
              .prepare(
                'SELECT staff_profile_id, paylocity_employee_id FROM staff_headcount_current WHERE staff_profile_id = ?'
              )
              .bind(resolvedProfileId)
              .first<{ staff_profile_id: string; paylocity_employee_id: string }>();
            resolvedEmployeeId = profile?.paylocity_employee_id ?? null;
          }

          const id = crypto.randomUUID();
          const now = isoNow();
          const safePriority = clampInt(priority, 3, 1, 5);

          await db
            .prepare(
              `
                INSERT INTO staff_enrichment_tasks (
                  id,
                  staff_profile_id,
                  paylocity_employee_id,
                  task_type,
                  status,
                  priority,
                  requested_by,
                  assigned_to,
                  instructions,
                  input_json,
                  created_at,
                  updated_at
                )
                VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
              `
            )
            .bind(
              id,
              resolvedProfileId,
              resolvedEmployeeId,
              task_type,
              safePriority,
              requested_by ?? actorFor(this.env),
              assigned_to ?? null,
              instructions ?? null,
              stringifyJsonRecord(input),
              now,
              now
            )
            .run();

          await recordAudit(db, {
            toolName: 'abundance_staff_queue_enrichment_task',
            actionType: 'write',
            subjectType: resolvedProfileId ? 'staff_profile' : 'enrichment_task',
            subjectId: resolvedProfileId ?? id,
            actor: actorFor(this.env),
            metadata: { task_id: id, task_type, priority: safePriority }
          });

          return textResult({
            task: {
              id,
              staff_profile_id: resolvedProfileId,
              paylocity_employee_id: resolvedEmployeeId,
              task_type,
              status: 'pending',
              priority: safePriority,
              requested_by: requested_by ?? actorFor(this.env),
              assigned_to: assigned_to ?? null,
              instructions: instructions ?? null,
              input: input ?? null,
              created_at: now,
              updated_at: now
            }
          });
        } catch (error) {
          return textResult({ error: String(error) }, true);
        }
      }
    );

    this.server.tool(
      'abundance_staff_list_enrichment_tasks',
      'List Dify-agent enrichment tasks. Read-only.',
      {
        status: z.enum(ENRICHMENT_STATUSES).optional(),
        staff_profile_id: z.string().optional(),
        paylocity_employee_id: z.string().optional(),
        limit: z.number().int().optional().describe('Default 20, max 100.'),
        offset: z.number().int().optional().describe('Default 0.')
      },
      async ({ status, staff_profile_id, paylocity_employee_id, limit, offset }) => {
        try {
          const safeLimit = clampInt(limit, 20, 1, 100);
          const safeOffset = clampInt(offset, 0, 0, 50000);
          const clauses: string[] = [];
          const params: unknown[] = [];

          if (status) {
            clauses.push('status = ?');
            params.push(status);
          }

          if (staff_profile_id) {
            clauses.push('staff_profile_id = ?');
            params.push(staff_profile_id);
          }

          if (paylocity_employee_id) {
            clauses.push('paylocity_employee_id = ?');
            params.push(paylocity_employee_id);
          }

          const rows = await db
            .prepare(
              `
                SELECT *
                FROM staff_enrichment_tasks
                ${whereSql(clauses)}
                ORDER BY priority ASC, created_at ASC
                LIMIT ? OFFSET ?
              `
            )
            .bind(...params, safeLimit, safeOffset)
            .all<EnrichmentTaskRow>();

          await recordAudit(db, {
            toolName: 'abundance_staff_list_enrichment_tasks',
            actionType: 'read',
            actor: actorFor(this.env),
            metadata: {
              status: status ?? null,
              staff_profile_id: staff_profile_id ?? null,
              paylocity_employee_id: paylocity_employee_id ?? null
            }
          });

          return textResult({
            tasks: rows.results.map((row) => shapeEnrichmentTask(row)),
            meta: {
              limit: safeLimit,
              offset: safeOffset,
              count: rows.results.length
            }
          });
        } catch (error) {
          return textResult({ error: String(error) }, true);
        }
      }
    );

    this.server.tool(
      'abundance_staff_record_enrichment_result',
      'Record a Dify-agent enrichment task result. This updates task state only, not canonical staff fields.',
      {
        task_id: z.string().min(1),
        status: z.enum(ENRICHMENT_STATUSES),
        result: z.record(z.unknown()).optional(),
        error_message: z.string().optional(),
        assigned_to: z.string().optional()
      },
      async ({ task_id, status, result, error_message, assigned_to }) => {
        try {
          const existing = await db
            .prepare('SELECT * FROM staff_enrichment_tasks WHERE id = ?')
            .bind(task_id)
            .first<EnrichmentTaskRow>();

          if (!existing) {
            return textResult(
              { error: 'TaskNotFound', message: `No enrichment task found for ${task_id}.` },
              true
            );
          }

          const now = isoNow();
          const completedAt = ['completed', 'failed', 'cancelled'].includes(status) ? now : null;

          await db
            .prepare(
              `
                UPDATE staff_enrichment_tasks
                SET
                  status = ?,
                  result_json = COALESCE(?, result_json),
                  error_message = COALESCE(?, error_message),
                  assigned_to = COALESCE(?, assigned_to),
                  updated_at = ?,
                  completed_at = CASE WHEN ? IS NULL THEN completed_at ELSE ? END
                WHERE id = ?
              `
            )
            .bind(
              status,
              stringifyJsonRecord(result),
              error_message ?? null,
              assigned_to ?? null,
              now,
              completedAt,
              completedAt,
              task_id
            )
            .run();

          const updated = await db
            .prepare('SELECT * FROM staff_enrichment_tasks WHERE id = ?')
            .bind(task_id)
            .first<EnrichmentTaskRow>();

          await recordAudit(db, {
            toolName: 'abundance_staff_record_enrichment_result',
            actionType: 'write',
            subjectType: 'enrichment_task',
            subjectId: task_id,
            actor: actorFor(this.env),
            metadata: { status }
          });

          return textResult({
            task: updated ? shapeEnrichmentTask(updated) : null
          });
        } catch (error) {
          return textResult({ error: String(error) }, true);
        }
      }
    );
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return withCors(
        new Response(null, {
          headers: {
            'Access-Control-Max-Age': '86400'
          }
        })
      );
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return withCors(
        new Response(
          JSON.stringify(
            {
              name: SERVER_NAME,
              version: SERVER_VERSION,
              status: 'healthy',
              endpoints: {
                mcp: '/mcp',
                sse: '/sse'
              },
              resources: ['abundance-staff://stats', 'abundance-staff://role-taxonomy'],
              tools: [
                'abundance_staff_summarize_headcount',
                'abundance_staff_search_profiles',
                'abundance_staff_get_profile',
                'abundance_staff_queue_enrichment_task',
                'abundance_staff_list_enrichment_tasks',
                'abundance_staff_record_enrichment_result'
              ],
              pii_lookup_enabled: env.ALLOW_PII_LOOKUP === 'true'
            },
            null,
            2
          ),
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
      );
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const authError = await validateApiKey(request, env);
      if (authError) return withCors(authError);

      const response = await AbundanceStaffMCP.serve('/mcp').fetch(request, env, ctx);
      return withCors(response);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const authError = await validateApiKey(request, env);
      if (authError) return withCors(authError);

      const response = await AbundanceStaffMCP.serve('/sse').fetch(request, env, ctx);
      return withCors(response);
    }

    return withCors(
      new Response('Not found. MCP endpoint is /mcp', {
        status: 404
      })
    );
  }
};
