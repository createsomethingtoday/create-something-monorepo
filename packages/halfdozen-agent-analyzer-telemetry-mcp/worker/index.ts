import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { initLogger, type Logger, type Span } from 'braintrust';
import { z } from 'zod';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  DB: D1Database;
  MCP_API_KEY?: string;
  OPERATOR_API_TOKEN?: string;
  BRAINTRUST_API_KEY?: string;
  BRAINTRUST_PROJECT_NAME?: string;
  BRAINTRUST_PROJECT_ID?: string;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
}

interface TelemetryEventRow {
  event_id: string;
  run_id: string;
  event_type: string;
  event_status: string;
  agent_page_url: string;
  agent_name: string | null;
  eval_case_id: string | null;
  test_report_url: string | null;
  target_url: string | null;
  summary: string;
  details_json: string;
  source: string;
  created_at: string;
}

const SERVER_NAME = 'halfdozen-agent-analyzer-telemetry';
const SERVER_VERSION = '1.0.0';
const DEFAULT_BRAINTRUST_PROJECT_NAME = 'Half Dozen Native Notion Agents';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, content-type, mcp-protocol-version, mcp-session-id',
  'Access-Control-Expose-Headers': 'mcp-session-id',
  'Access-Control-Max-Age': '86400'
};

const statusSchema = z.enum(['pass', 'fail', 'blocked', 'success', 'error', 'skipped', 'pending']);
const outcomeSchema = z.enum(['pass', 'fail', 'blocked']);
const cleanupStatusSchema = z.enum([
  'success',
  'failed',
  'partial',
  'not_required',
  'pending',
  'skipped'
]);
const scoreCategorySchema = z.enum([
  'instruction_completeness',
  'reference_awareness',
  'runtime_feasibility',
  'mutation_safety',
  'evidence_quality',
  'human_testing_readiness',
  'runtime_telemetry_quality',
  'overall',
  'custom'
]);

const baseEventSchema = {
  run_id: z.string().min(8).describe('Evaluation run id returned by start_eval_run.'),
  agent_page_url: z.string().min(1).describe('URL of the evaluated AI Agents [HD] source page.'),
  agent_name: z.string().optional().describe('Human-readable agent name.'),
  eval_case_id: z.string().optional().describe('Optional reusable eval case id.'),
  test_report_url: z
    .string()
    .optional()
    .describe('URL of the Test Reports [OS] page when available.'),
  target_url: z
    .string()
    .optional()
    .describe('URL of the database/page/trace/record checked by this event.'),
  summary: z.string().min(1).max(2000).describe('Concise evidence summary for this event.'),
  details_json: z
    .string()
    .max(12000)
    .optional()
    .describe(
      'Optional JSON object or array string with structured details. Do not include secrets.'
    ),
  source: z.string().optional().describe('Telemetry source label. Defaults to agent-analyzer.')
};

export class AgentAnalyzerTelemetryMCP extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

  async init() {
    const db = this.env.DB;
    const braintrust = createBraintrustEmitter(this.env);

    this.server.tool(
      'start_eval_run',
      'Start an append-only AGENT ANALYZER telemetry run and return a run id. Call this once before recording checks.',
      {
        agent_page_url: z
          .string()
          .min(1)
          .describe('URL of the evaluated AI Agents [HD] source page.'),
        agent_name: z.string().optional().describe('Human-readable agent name.'),
        eval_case_id: z.string().optional().describe('Optional reusable eval case id.'),
        trigger_context: z
          .string()
          .max(2000)
          .optional()
          .describe(
            'Why the evaluation started, for example @mention, Status=Updating, or manual rerun.'
          ),
        summary: z.string().max(2000).optional().describe('Short start summary.'),
        details_json: z
          .string()
          .max(12000)
          .optional()
          .describe(
            'Optional JSON object or array string with structured start details. Do not include secrets.'
          )
      },
      async (input) => {
        const runId = createRunId();
        const result = await insertEvent(
          db,
          {
            runId,
            eventType: 'run_started',
            eventStatus: 'pending',
            agentPageUrl: input.agent_page_url,
            agentName: input.agent_name,
            evalCaseId: input.eval_case_id,
            summary:
              input.summary ??
              `Started AGENT ANALYZER eval run for ${input.agent_name ?? input.agent_page_url}.`,
            detailsJson: mergeDetails(input.details_json, {
              trigger_context: input.trigger_context ?? null
            }),
            source: 'agent-analyzer'
          },
          braintrust
        );

        return jsonToolResponse({
          ok: true,
          run_id: runId,
          event: result,
          next_step:
            'Record schema, permission, write, Langfuse, score, cleanup, and finish events for this run.'
        });
      }
    );

    this.server.tool(
      'record_schema_check',
      'Append evidence for a Notion database/page/property/status/relation schema check.',
      {
        ...baseEventSchema,
        status: statusSchema.describe('Result of the schema check.'),
        database: z.string().optional().describe('Database or page name checked.'),
        property: z
          .string()
          .optional()
          .describe('Property, status option, relation, or view checked.')
      },
      async (input) =>
        recordTypedEvent(db, braintrust, 'schema_check', input.status, input, {
          database: input.database ?? null,
          property: input.property ?? null
        })
    );

    this.server.tool(
      'record_permission_check',
      'Append evidence for Notion or external-tool access and permission feasibility.',
      {
        ...baseEventSchema,
        status: statusSchema.describe('Result of the permission check.'),
        resource: z.string().optional().describe('Resource whose access was checked.'),
        permission: z
          .string()
          .optional()
          .describe('Read, write, comment, create, update, archive, or tool permission checked.')
      },
      async (input) =>
        recordTypedEvent(db, braintrust, 'permission_check', input.status, input, {
          resource: input.resource ?? null,
          permission: input.permission ?? null
        })
    );

    this.server.tool(
      'record_write_test',
      'Append evidence for a reversible runtime or write-feasibility test.',
      {
        ...baseEventSchema,
        status: statusSchema.describe('Result of the write test.'),
        mutation_type: z
          .enum(['create', 'update', 'comment', 'archive', 'restore', 'formatting', 'other'])
          .describe('Smallest mutation type used to prove feasibility.'),
        pre_state_captured: z
          .boolean()
          .describe('Whether exact pre-test state was captured before mutation.'),
        verified: z
          .boolean()
          .describe('Whether the mutation was observed and verified after execution.'),
        cleanup_required: z.boolean().describe('Whether the test required cleanup or reversion.'),
        cleanup_status: cleanupStatusSchema.describe(
          'Cleanup/reversion state after the write test.'
        )
      },
      async (input) =>
        recordTypedEvent(db, braintrust, 'write_test', input.status, input, {
          mutation_type: input.mutation_type,
          pre_state_captured: input.pre_state_captured,
          verified: input.verified,
          cleanup_required: input.cleanup_required,
          cleanup_status: input.cleanup_status
        })
    );

    this.server.tool(
      'record_cleanup_result',
      'Append cleanup or recovery evidence for fixture records and production write tests.',
      {
        ...baseEventSchema,
        cleanup_status: cleanupStatusSchema.describe('Final cleanup/reversion status.'),
        records_touched: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe('Number of records/pages touched by cleanup.'),
        recovery_required: z
          .boolean()
          .optional()
          .describe('Whether human recovery is still required.')
      },
      async (input) =>
        recordTypedEvent(
          db,
          braintrust,
          'cleanup_result',
          input.cleanup_status === 'success' || input.cleanup_status === 'not_required'
            ? 'success'
            : 'blocked',
          input,
          {
            cleanup_status: input.cleanup_status,
            records_touched: input.records_touched ?? null,
            recovery_required: input.recovery_required ?? false
          }
        )
    );

    this.server.tool(
      'record_langfuse_evidence',
      'Append Langfuse runtime evidence reviewed for the eval run.',
      {
        ...baseEventSchema,
        status: statusSchema.describe('Result of Langfuse evidence review.'),
        trace_ids: z.string().optional().describe('Comma-separated trace ids reviewed, or "none".'),
        scores_found: z
          .string()
          .optional()
          .describe('Score names and values found, or "No Langfuse scores found".'),
        dataset_refs: z
          .string()
          .optional()
          .describe('Dataset, dataset run, or dataset item identifiers used, or "Not used".'),
        annotation_queue_refs: z
          .string()
          .optional()
          .describe('Annotation queue item identifiers used, or "Not used".'),
        telemetry_completeness: z
          .string()
          .max(2000)
          .describe('Whether model, tokens, cost, trace metadata, and attribution were complete.')
      },
      async (input) =>
        recordTypedEvent(db, braintrust, 'langfuse_evidence', input.status, input, {
          trace_ids: input.trace_ids ?? null,
          scores_found: input.scores_found ?? null,
          dataset_refs: input.dataset_refs ?? null,
          annotation_queue_refs: input.annotation_queue_refs ?? null,
          telemetry_completeness: input.telemetry_completeness
        })
    );

    this.server.tool(
      'record_braintrust_evidence',
      'Append Braintrust runtime evidence reviewed for the eval run, including traces, experiments, datasets, scores, and permalinks.',
      {
        ...baseEventSchema,
        status: statusSchema.describe('Result of Braintrust evidence review.'),
        trace_ids: z
          .string()
          .optional()
          .describe('Comma-separated Braintrust trace/span ids reviewed, or "none".'),
        experiment_refs: z
          .string()
          .optional()
          .describe('Braintrust experiment names, ids, or URLs used, or "Not used".'),
        dataset_refs: z
          .string()
          .optional()
          .describe(
            'Braintrust dataset, dataset run, or dataset item identifiers used, or "Not used".'
          ),
        score_refs: z
          .string()
          .optional()
          .describe('Braintrust score names and values found, or "No Braintrust scores found".'),
        log_refs: z
          .string()
          .optional()
          .describe(
            'Braintrust project log identifiers or SQL/filter references used, or "Not used".'
          ),
        permalink: z
          .string()
          .optional()
          .describe(
            'Braintrust permalink for the most relevant trace, log, experiment, or dataset.'
          ),
        telemetry_completeness: z
          .string()
          .max(2000)
          .describe('Whether model, tokens, cost, trace metadata, and attribution were complete.')
      },
      async (input) =>
        recordTypedEvent(db, braintrust, 'braintrust_evidence', input.status, input, {
          trace_ids: input.trace_ids ?? null,
          experiment_refs: input.experiment_refs ?? null,
          dataset_refs: input.dataset_refs ?? null,
          score_refs: input.score_refs ?? null,
          log_refs: input.log_refs ?? null,
          permalink: input.permalink ?? null,
          telemetry_completeness: input.telemetry_completeness
        })
    );

    this.server.tool(
      'record_score',
      'Append one 0-100 score for an eval category. Call once per category, including overall.',
      {
        ...baseEventSchema,
        category: scoreCategorySchema.describe('Evaluation score category.'),
        score: z.number().min(0).max(100).describe('0-100 score.'),
        rationale: z.string().max(2000).optional().describe('Brief score rationale.')
      },
      async (input) =>
        recordTypedEvent(db, braintrust, 'score_recorded', 'success', input, {
          category: input.category,
          score: input.score,
          rationale: input.rationale ?? null
        })
    );

    this.server.tool(
      'finish_eval_run',
      'Finish an AGENT ANALYZER telemetry run by appending the final pass/fail/blocked outcome.',
      {
        ...baseEventSchema,
        outcome: outcomeSchema.describe('Final eval outcome.'),
        overall_score: z
          .number()
          .min(0)
          .max(100)
          .optional()
          .describe('Overall 0-100 score written to Test Reports [OS].'),
        final_agent_status: z
          .string()
          .optional()
          .describe('Final AI Agents [HD] status, for example Testing, Building, or Roadblock.'),
        human_review_task_url: z
          .string()
          .optional()
          .describe('Tasks [HD] handoff URL when created.'),
        cleanup_status: cleanupStatusSchema.describe('Final cleanup/reversion status.')
      },
      async (input) =>
        recordTypedEvent(db, braintrust, 'run_finished', input.outcome, input, {
          outcome: input.outcome,
          overall_score: input.overall_score ?? null,
          final_agent_status: input.final_agent_status ?? null,
          human_review_task_url: input.human_review_task_url ?? null,
          cleanup_status: input.cleanup_status
        })
    );

    this.server.tool(
      'get_eval_run',
      'Read recent append-only events for one AGENT ANALYZER telemetry run.',
      {
        run_id: z.string().min(8).describe('Evaluation run id.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe('Maximum events to return. Default 100.')
      },
      async ({ run_id, limit = 100 }) => {
        const rows = await db
          .prepare(
            `SELECT event_id, run_id, event_type, event_status, agent_page_url, agent_name,
                    eval_case_id, test_report_url, target_url, summary, details_json, source, created_at
               FROM agent_analyzer_telemetry_events
              WHERE run_id = ?
              ORDER BY created_at ASC, id ASC
              LIMIT ?`
          )
          .bind(run_id, limit)
          .all<TelemetryEventRow>();

        return jsonToolResponse({
          ok: true,
          run_id,
          count: rows.results.length,
          latest_outcome: deriveLatestOutcome(rows.results),
          events: rows.results.map(formatEventRow)
        });
      }
    );

    this.server.tool(
      'list_recent_eval_runs',
      'List recent AGENT ANALYZER telemetry runs for verification and debugging.',
      {
        agent_page_url: z
          .string()
          .optional()
          .describe('Filter by evaluated AI Agents [HD] page URL.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe('Maximum runs to return. Default 20.')
      },
      async ({ agent_page_url, limit = 20 }) => {
        const params: unknown[] = [];
        let where = '';
        if (agent_page_url) {
          where = 'WHERE agent_page_url = ?';
          params.push(agent_page_url);
        }
        params.push(limit);

        const rows = await bindStatement(
          db.prepare(
            `SELECT run_id,
                    MAX(created_at) AS latest_event_at,
                    MIN(created_at) AS first_event_at,
                    MAX(agent_page_url) AS agent_page_url,
                    MAX(agent_name) AS agent_name,
                    MAX(eval_case_id) AS eval_case_id,
                    COUNT(*) AS event_count
               FROM agent_analyzer_telemetry_events
               ${where}
              GROUP BY run_id
              ORDER BY latest_event_at DESC
              LIMIT ?`
          ),
          params
        ).all<{
          run_id: string;
          latest_event_at: string;
          first_event_at: string;
          agent_page_url: string;
          agent_name: string | null;
          eval_case_id: string | null;
          event_count: number;
        }>();

        return jsonToolResponse({
          ok: true,
          count: rows.results.length,
          runs: rows.results
        });
      }
    );
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      const schema = await checkSchema(env.DB);
      return jsonResponse({
        ok: schema.ok,
        worker: 'halfdozen-agent-analyzer-telemetry-mcp',
        name: SERVER_NAME,
        version: SERVER_VERSION,
        mode: 'append_only_agent_eval_telemetry',
        endpoints: {
          mcp: '/mcp',
          sse: '/sse',
          health: '/health'
        },
        auth: {
          bearer_required: true,
          mcp_api_key_configured: Boolean(env.MCP_API_KEY?.trim()),
          operator_api_token_configured: Boolean(env.OPERATOR_API_TOKEN?.trim())
        },
        braintrust: {
          enabled: Boolean(env.BRAINTRUST_API_KEY?.trim()),
          project_name: resolveBraintrustProjectName(env),
          project_id_configured: Boolean(env.BRAINTRUST_PROJECT_ID?.trim())
        },
        d1: {
          binding: 'DB',
          agent_analyzer_telemetry_events: schema
        },
        tools: [
          'start_eval_run',
          'record_schema_check',
          'record_permission_check',
          'record_write_test',
          'record_cleanup_result',
          'record_langfuse_evidence',
          'record_braintrust_evidence',
          'record_score',
          'finish_eval_run',
          'get_eval_run',
          'list_recent_eval_runs'
        ],
        rollback:
          'Redeploy the previous Worker version from Cloudflare Workers deploy history. The D1 migration is additive.'
      });
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      if (!isAuthorized(request, env)) return unauthorized();
      return AgentAnalyzerTelemetryMCP.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      if (!isAuthorized(request, env)) return unauthorized();
      return AgentAnalyzerTelemetryMCP.serve('/sse').fetch(request, env, ctx);
    }

    return jsonResponse({ ok: false, error: 'Not found', mcp_endpoint: '/mcp' }, { status: 404 });
  }
};

function createRunId(): string {
  return `agent-analyzer-${crypto.randomUUID()}`;
}

type BraintrustEmitter = (event: BraintrustTelemetryEvent) => Promise<void>;

interface BraintrustTelemetryEvent {
  eventId: string;
  runId: string;
  eventType: string;
  eventStatus: string;
  agentPageUrl: string;
  agentName: string | null;
  evalCaseId: string | null;
  testReportUrl: string | null;
  targetUrl: string | null;
  summary: string;
  details: unknown;
  source: string;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let braintrustLogger: Logger<any> | null = null;

function resolveBraintrustProjectName(env: { BRAINTRUST_PROJECT_NAME?: string }): string {
  const configured = env.BRAINTRUST_PROJECT_NAME?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_BRAINTRUST_PROJECT_NAME;
}

function createBraintrustEmitter(env: Env): BraintrustEmitter | undefined {
  const apiKey = env.BRAINTRUST_API_KEY?.trim();
  if (!apiKey) return undefined;

  try {
    if (!braintrustLogger) {
      const loggerConfig: Parameters<typeof initLogger>[0] = {
        apiKey,
        projectName: resolveBraintrustProjectName(env),
        asyncFlush: true,
        setCurrent: false
      };

      const projectId = env.BRAINTRUST_PROJECT_ID?.trim();
      if (projectId) {
        (loggerConfig as Record<string, unknown>).projectId = projectId;
      }

      braintrustLogger = initLogger(loggerConfig);
    }

    return async (event) => emitBraintrustEvent(braintrustLogger!, event);
  } catch (error) {
    console.warn(
      '[agent-analyzer-telemetry] Braintrust initialization failed:',
      error instanceof Error ? error.message : String(error)
    );
    return undefined;
  }
}

async function emitBraintrustEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger: Logger<any>,
  event: BraintrustTelemetryEvent
): Promise<void> {
  try {
    await logger.traced(
      (span: Span) => {
        span.log({
          input: sanitizeForBraintrust({
            event_type: event.eventType,
            event_status: event.eventStatus,
            summary: event.summary,
            details: event.details
          }),
          output: {
            event_id: event.eventId,
            run_id: event.runId,
            created_at: event.createdAt
          },
          tags: ['native-notion-agent', 'agent-analyzer', event.eventType, event.eventStatus],
          metadata: {
            server: SERVER_NAME,
            eventId: event.eventId,
            runId: event.runId,
            eventType: event.eventType,
            eventStatus: event.eventStatus,
            agentPageUrl: event.agentPageUrl,
            agentName: event.agentName,
            evalCaseId: event.evalCaseId,
            testReportUrl: event.testReportUrl,
            targetUrl: event.targetUrl,
            source: event.source
          }
        });
      },
      {
        name: `native-notion-agent:${event.eventType}`,
        type: 'tool'
      }
    );
    await logger.flush();
  } catch (error) {
    console.warn(
      '[agent-analyzer-telemetry] Braintrust event emit failed:',
      error instanceof Error ? error.message : String(error)
    );
  }
}

function sanitizeForBraintrust(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[MaxDepth]';
  if (typeof value === 'string') return redactSecrets(value);
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((entry) => sanitizeForBraintrust(entry, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      sanitizeForBraintrust(entry, depth + 1)
    ])
  );
}

function redactSecrets(value: string): string {
  return value
    .replace(/\b(sk-[A-Za-z0-9_-]{12,})\b/g, '[REDACTED_SECRET]')
    .replace(/\b(app-[A-Za-z0-9_-]{12,})\b/g, '[REDACTED_SECRET]')
    .replace(/\b(secret_[A-Za-z0-9_-]{12,})\b/g, '[REDACTED_SECRET]')
    .replace(/\b(Bearer\s+)[A-Za-z0-9._-]{20,}\b/gi, '$1[REDACTED_SECRET]')
    .replace(
      /\b[A-Za-z0-9_-]{32,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g,
      '[REDACTED_SECRET]'
    );
}

function bindStatement(stmt: D1PreparedStatement, params: unknown[]): D1PreparedStatement {
  if (params.length === 0) return stmt;
  return stmt.bind(...params);
}

function parseDetailsJson(input?: string): unknown {
  if (!input?.trim()) return {};

  const parsed = JSON.parse(input);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('details_json must parse to a JSON object or array.');
  }
  return parsed;
}

function mergeDetails(input: string | undefined, additions: Record<string, unknown>): string {
  const parsed = parseDetailsJson(input);
  const merged = Array.isArray(parsed)
    ? { values: parsed, ...additions }
    : { ...parsed, ...additions };
  return JSON.stringify(merged);
}

async function insertEvent(
  db: D1Database,
  input: {
    runId: string;
    eventType: string;
    eventStatus: string;
    agentPageUrl: string;
    agentName?: string;
    evalCaseId?: string;
    testReportUrl?: string;
    targetUrl?: string;
    summary: string;
    detailsJson?: string;
    source?: string;
  },
  braintrust?: BraintrustEmitter
): Promise<Record<string, unknown>> {
  const eventId = crypto.randomUUID();
  const parsedDetails = parseDetailsJson(input.detailsJson);
  const detailsJson = JSON.stringify(parsedDetails);
  const source = input.source?.trim() || 'agent-analyzer';

  await db
    .prepare(
      `INSERT INTO agent_analyzer_telemetry_events (
         event_id, run_id, event_type, event_status, agent_page_url, agent_name,
         eval_case_id, test_report_url, target_url, summary, details_json, source
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      eventId,
      input.runId,
      input.eventType,
      input.eventStatus,
      input.agentPageUrl,
      input.agentName ?? null,
      input.evalCaseId ?? null,
      input.testReportUrl ?? null,
      input.targetUrl ?? null,
      input.summary,
      detailsJson,
      source
    )
    .run();

  if (braintrust) {
    await braintrust({
      eventId,
      runId: input.runId,
      eventType: input.eventType,
      eventStatus: input.eventStatus,
      agentPageUrl: input.agentPageUrl,
      agentName: input.agentName ?? null,
      evalCaseId: input.evalCaseId ?? null,
      testReportUrl: input.testReportUrl ?? null,
      targetUrl: input.targetUrl ?? null,
      summary: input.summary,
      details: parsedDetails,
      source,
      createdAt: new Date().toISOString()
    });
  }

  return {
    event_id: eventId,
    run_id: input.runId,
    event_type: input.eventType,
    event_status: input.eventStatus,
    agent_page_url: input.agentPageUrl,
    target_url: input.targetUrl ?? null,
    source
  };
}

async function recordTypedEvent(
  db: D1Database,
  braintrust: BraintrustEmitter | undefined,
  eventType: string,
  eventStatus: string,
  input: z.infer<z.ZodObject<typeof baseEventSchema>> & Record<string, unknown>,
  detailAdditions: Record<string, unknown>
) {
  const result = await insertEvent(
    db,
    {
      runId: input.run_id,
      eventType,
      eventStatus,
      agentPageUrl: input.agent_page_url,
      agentName: input.agent_name,
      evalCaseId: input.eval_case_id,
      testReportUrl: input.test_report_url,
      targetUrl: input.target_url,
      summary: input.summary,
      detailsJson: mergeDetails(input.details_json, detailAdditions),
      source: input.source
    },
    braintrust
  );

  return jsonToolResponse({
    ok: true,
    event: result
  });
}

function formatEventRow(row: TelemetryEventRow): Record<string, unknown> {
  return {
    event_id: row.event_id,
    run_id: row.run_id,
    event_type: row.event_type,
    event_status: row.event_status,
    agent_page_url: row.agent_page_url,
    agent_name: row.agent_name,
    eval_case_id: row.eval_case_id,
    test_report_url: row.test_report_url,
    target_url: row.target_url,
    summary: row.summary,
    details: parseDetailsJson(row.details_json),
    source: row.source,
    created_at: row.created_at
  };
}

function deriveLatestOutcome(rows: TelemetryEventRow[]): Record<string, unknown> | null {
  const finished = [...rows].reverse().find((row) => row.event_type === 'run_finished');
  if (!finished) return null;
  return {
    outcome: finished.event_status,
    summary: finished.summary,
    test_report_url: finished.test_report_url,
    details: parseDetailsJson(finished.details_json),
    created_at: finished.created_at
  };
}

async function checkSchema(db: D1Database): Promise<Record<string, unknown>> {
  try {
    const row = await db
      .prepare(
        `SELECT name
           FROM sqlite_master
          WHERE type = 'table'
            AND name = 'agent_analyzer_telemetry_events'
          LIMIT 1`
      )
      .first<{ name: string }>();
    return {
      ok: Boolean(row),
      table_exists: Boolean(row)
    };
  } catch (error) {
    return {
      ok: false,
      table_exists: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function parseBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || null;
}

function isAuthorized(request: Request, env: Env): boolean {
  const token = parseBearerToken(request);
  if (!token) return false;

  const accepted = [env.MCP_API_KEY, env.OPERATOR_API_TOKEN]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return accepted.includes(token);
}

function unauthorized(): Response {
  return jsonResponse(
    { ok: false, error: 'Unauthorized' },
    {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer realm="agent-analyzer-telemetry-mcp"' }
    }
  );
}

function jsonToolResponse(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...(init?.headers ?? {})
    }
  });
}
