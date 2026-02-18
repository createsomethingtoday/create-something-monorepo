/**
 * Interaction Atlas MCP Server — Cloudflare Worker entry point
 *
 * Multi-account: resolves AccountContext per-request from headers/session.
 * Uses handleRequest() which creates a scoped server per request.
 */

import { createServer } from '../src/server.js';
import { InteractionAtlasAuthProvider, type InteractionAtlasEnv } from '../src/auth.js';
import {
  getBuiltWorkflowTemplate,
  getWorkflowMermaid,
  listWorkflowSummaries,
  validateBuiltWorkflow,
} from '../src/workflows/index.js';
import { buildWorkflowTemplate } from '../src/workflows/build.js';
import { workflowTemplateToMermaid } from '../src/workflows/mermaid.js';

import { findMcpCatalogEntry, listMcpCatalog, resolveMcpHttpEndpointUrl } from '../src/mcps/catalog.js';
import { introspectMcpServer } from '../src/mcps/introspect.js';
import { mapMcpToWorkflowDefinition } from '../src/mcps/map.js';
import { evaluateJudgment } from '../src/judgment/evaluate.js';
import type { JudgmentEstimateScenario } from '../src/judgment/types.js';
import {
  activatePolicyVersion,
  getEstimateReportById,
  getPolicyVersionById,
  listPolicyVersions,
  resolveActivePolicy,
  saveEstimateReport,
  savePolicyVersion,
  type JudgmentPolicy,
} from '../src/storage/policies.js';
import type { AtlasEntityType } from '../src/storage/versions.js';
import {
  getActiveAutomationContract,
  listActiveAutomationContracts,
  listPendingApprovals,
} from '../src/storage/control-plane.js';

interface Env extends InteractionAtlasEnv {}

const server = createServer();
const authProvider = new InteractionAtlasAuthProvider();

function defaultEstimateScenarios(): JudgmentEstimateScenario[] {
  return [
    { id: 'scenario-read', toolName: 'workflow_get', hasWriteIntent: false, hasHumanReviewStep: true, introspectionOk: true },
    { id: 'scenario-write-no-human', toolName: 'workflow_map_from_tool_sequence', hasWriteIntent: true, hasHumanReviewStep: false, introspectionOk: true },
    { id: 'scenario-mcp-introspection-fail', toolName: 'mcp_map_to_workflow', hasWriteIntent: true, hasHumanReviewStep: true, introspectionOk: false },
  ];
}

function evaluatePolicyScenarios(
  accountId: string,
  readOnly: boolean,
  before: JudgmentPolicy,
  after: JudgmentPolicy,
  scenarios: JudgmentEstimateScenario[],
) {
  const init = { allow: 0, require_human_review: 0, block: 0 };
  const beforeCounts = { ...init };
  const afterCounts = { ...init };
  const details: Array<{ scenarioId: string; before: string; after: string }> = [];

  for (const s of scenarios) {
    const inpt = {
      toolName: s.toolName,
      accountId,
      readOnly,
      hasWriteIntent: s.hasWriteIntent,
      hasHumanReviewStep: s.hasHumanReviewStep,
      introspectionOk: s.introspectionOk,
    };
    const b = evaluateJudgment(inpt, before);
    const a = evaluateJudgment(inpt, after);
    beforeCounts[b.decision] += 1;
    afterCounts[a.decision] += 1;
    details.push({ scenarioId: s.id, before: b.decision, after: a.decision });
  }

  return {
    summary: {
      before: beforeCounts,
      after: afterCounts,
      delta: {
        allow: afterCounts.allow - beforeCounts.allow,
        require_human_review: afterCounts.require_human_review - beforeCounts.require_human_review,
        block: afterCounts.block - beforeCounts.block,
      },
      scenarioCount: scenarios.length,
    },
    details,
  };
}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    function esc(s: string): string {
      return s
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    async function readJsonBody<T = Record<string, unknown>>(req: Request): Promise<T | null> {
      try {
        return (await req.json()) as T;
      } catch {
        return null;
      }
    }

    type OpenAiCssOptions = {
      contentMax?: string;
      bgSubtle?: string;
    };

    function openAiBaseCss(options: OpenAiCssOptions = {}): string {
      const contentMaxCss = options.contentMax ? `--content-max: ${esc(options.contentMax)};` : '';
      const bgSubtle = options.bgSubtle ?? '#f9fafb';
      return `
      :root {
        color-scheme: light;
        ${contentMaxCss}
        --bg: #f7f7f8;
        --bg-elevated: #ffffff;
        --bg-subtle: ${esc(bgSubtle)};
        --border: #e5e7eb;
        --border-strong: #d1d5db;
        --text: #111827;
        --text-muted: #4b5563;
        --text-soft: #6b7280;
        --accent: #10a37f;
        --accent-strong: #0d8c6d;
        --danger: #b42318;
        --danger-strong: #912018;
        --focus: rgba(16, 163, 127, 0.25);
        --shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 12px rgba(16, 24, 40, 0.06);
      }
      * { box-sizing: border-box; }
      body {
        font-family: 'Soehne', 'Söhne', 'IBM Plex Sans', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        background: radial-gradient(1800px 400px at 10% -20%, #ffffff, transparent), var(--bg);
        color: var(--text);
      }`;
    }

    type ViewerPageOptions = {
      title: string;
      heading: string;
      subtitle?: string;
      headerMeta?: string;
      headerActions?: string;
      body: string;
      footer?: string;
      maxWidth?: string;
      includeMermaid?: boolean;
    };

    function renderViewerPage(options: ViewerPageOptions): string {
      const maxWidth = options.maxWidth ?? '1100px';
      return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(options.title)}</title>
    <style>
      ${openAiBaseCss({ contentMax: maxWidth })}
      a { color: var(--accent-strong); text-decoration: none; }
      a:hover { text-decoration: underline; }
      header {
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--border);
        background: rgba(247, 247, 248, 0.92);
        backdrop-filter: blur(10px);
      }
      .headerInner {
        max-width: var(--content-max);
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        flex-wrap: wrap;
      }
      h1 {
        margin: 0;
        font-size: 1.35rem;
        letter-spacing: 0.01em;
      }
      .subtitle {
        margin: 0.3rem 0 0;
        color: var(--text-muted);
        line-height: 1.45;
      }
      .headerActions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
      }
      main {
        max-width: var(--content-max);
        margin: 0 auto;
        padding: 1rem 1.25rem 2rem;
      }
      footer {
        max-width: var(--content-max);
        margin: 0 auto;
        padding: 1rem 1.25rem 2rem;
        color: var(--text-soft);
      }
      .card, .panel {
        border: 1px solid var(--border);
        border-radius: 14px;
        background: var(--bg-elevated);
        padding: 1rem;
        margin: 0.75rem 0;
        box-shadow: var(--shadow);
      }
      .split {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
        flex-wrap: wrap;
      }
      .stack { display: grid; gap: 0.28rem; }
      .cardTitle { font-size: 1.05rem; font-weight: 600; }
      .muted { color: var(--text-muted); }
      .label { color: var(--text-soft); }
      .meta {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: 0.6rem;
      }
      .row {
        display: flex;
        gap: 0.55rem;
        flex-wrap: wrap;
        align-items: center;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.75rem;
        border: 1px solid var(--border-strong);
        border-radius: 999px;
        padding: 0.16rem 0.55rem;
        color: var(--text-soft);
        background: #ffffff;
      }
      .pill.active {
        border-color: #a7f3d0;
        color: #065f46;
        background: #ecfdf3;
      }
      .pill.statusOk {
        border-color: #a7f3d0;
        color: #065f46;
        background: #ecfdf3;
      }
      .pill.statusBad {
        border-color: #fecaca;
        color: #991b1b;
        background: #fef2f2;
      }
      details {
        border: 1px solid var(--border);
        background: var(--bg-elevated);
        border-radius: 12px;
        padding: 0.75rem 0.9rem;
      }
      summary {
        cursor: pointer;
        color: var(--text);
        font-weight: 600;
      }
      pre {
        overflow: auto;
        padding: 0.75rem;
        border-radius: 10px;
        background: var(--bg-subtle);
        border: 1px solid var(--border);
        color: var(--text);
      }
      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
        font-size: 0.9em;
        color: #1f2937;
      }
      .ok { color: #027a48; }
      .bad { color: #b42318; }
      .alertBad {
        border-color: #fecaca;
        background: #fef2f2;
      }
      .spacer { height: 0.75rem; }
      .versionRow {
        border: 1px solid var(--border);
        border-radius: 10px;
        background: var(--bg-subtle);
        padding: 0.6rem 0.7rem;
        margin: 0.45rem 0;
      }
      .fieldGrid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 0.6rem;
      }
      .field {
        border: 1px solid var(--border);
        border-radius: 10px;
        background: var(--bg-subtle);
        padding: 0.55rem 0.65rem;
      }
      .fieldLabel {
        color: var(--text-soft);
        font-size: 0.78rem;
        margin-bottom: 0.15rem;
      }
      @media (max-width: 720px) {
        header { padding: 0.9rem; }
        main { padding: 0.8rem 0.9rem 1.5rem; }
        footer { padding: 0.8rem 0.9rem 1.5rem; }
        .headerActions { justify-content: flex-start; }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="headerInner">
        <div>
          <h1>${options.heading}</h1>
          ${options.subtitle ? `<p class="subtitle">${options.subtitle}</p>` : ''}
          ${options.headerMeta ? `<div class="meta">${options.headerMeta}</div>` : ''}
        </div>
        ${options.headerActions ? `<div class="headerActions">${options.headerActions}</div>` : ''}
      </div>
    </header>
    <main>${options.body}</main>
    ${options.footer ? `<footer>${options.footer}</footer>` : ''}
    ${options.includeMermaid
      ? `<script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "base" });
    </script>`
      : ''
    }
  </body>
</html>`;
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }, null, 2), { headers: JSON_HEADERS });
    }

    // JSON API
    if (url.pathname === '/api/workflows') {
      return new Response(JSON.stringify({ workflows: listWorkflowSummaries() }, null, 2), { headers: JSON_HEADERS });
    }

    const apiWorkflowMatch = url.pathname.match(/^\/api\/workflows\/([a-z0-9-]+)$/i);
    if (apiWorkflowMatch) {
      const workflowId = apiWorkflowMatch[1];
      const template = getBuiltWorkflowTemplate(workflowId);
      if (!template) return new Response(JSON.stringify({ error: 'Not found', workflowId }, null, 2), { status: 404, headers: JSON_HEADERS });
      const validation = validateBuiltWorkflow(template);
      return new Response(JSON.stringify({ workflowId, valid: validation.valid, invalidIds: validation.invalidIds, workflow: template }, null, 2), { headers: JSON_HEADERS });
    }

    // JSON API — MCP catalog + auto-maps
    if (url.pathname === '/api/mcps') {
      const categoryParam = url.searchParams.get('category') ?? 'all';
      const category: 'create-something' | 'workway' | 'third-party' | 'all' =
        categoryParam === 'create-something' || categoryParam === 'workway' || categoryParam === 'third-party' || categoryParam === 'all'
          ? categoryParam
          : 'all';

      return new Response(JSON.stringify({ category, catalog: listMcpCatalog(category) }, null, 2), { headers: JSON_HEADERS });
    }

    // JSON API — Judgment policies
    if (url.pathname === '/api/policies') {
      const authCtx = await authProvider.resolve(request, _env);
      const entityTypeParam = url.searchParams.get('entity_type');
      const entityId = url.searchParams.get('entity_id');
      const accountId = authCtx.accountId;
      const entityType: AtlasEntityType = entityTypeParam === 'mcp' ? 'mcp' : 'agent';
      if (!entityId) {
        return new Response(JSON.stringify({ error: 'entity_id query param is required' }, null, 2), {
          status: 400,
          headers: JSON_HEADERS,
        });
      }

      const active = await resolveActivePolicy(_env.DB, {
        accountId,
        entityType,
        entityId,
      });
      const versions = await listPolicyVersions(_env.DB, accountId, entityType, entityId);
      const activeGuardrails = {
        maxReviewDelta:
          typeof active.policy.guardrails?.maxReviewDelta === 'number' ? active.policy.guardrails.maxReviewDelta : null,
        maxBlockDelta: typeof active.policy.guardrails?.maxBlockDelta === 'number' ? active.policy.guardrails.maxBlockDelta : null,
      };
      const versionsWithGuardrails = versions.map((v) => {
        const parsed = JSON.parse(v.policy_json) as JudgmentPolicy;
        const guardrails = {
          maxReviewDelta: typeof parsed.guardrails?.maxReviewDelta === 'number' ? parsed.guardrails.maxReviewDelta : null,
          maxBlockDelta: typeof parsed.guardrails?.maxBlockDelta === 'number' ? parsed.guardrails.maxBlockDelta : null,
        };
        return { ...v, guardrails };
      });
      return new Response(
        JSON.stringify(
          {
            meta: {
              authScope: 'account',
              note: 'Response is scoped to authenticated account context from x-api-key/Bearer token.',
            },
            accountId,
            entityType,
            entityId,
            activePolicyVersionId: active.policyVersionId,
            activePolicy: active.policy,
            activeGuardrails: {
              maxReviewDelta:
                typeof active.policy.guardrails?.maxReviewDelta === 'number' ? active.policy.guardrails.maxReviewDelta : null,
              maxBlockDelta:
                typeof active.policy.guardrails?.maxBlockDelta === 'number' ? active.policy.guardrails.maxBlockDelta : null,
            },
            versions: versionsWithGuardrails.map((v) => ({
              id: v.id,
              status: v.status,
              created_by: v.created_by,
              created_at: v.created_at,
              policy: JSON.parse(v.policy_json),
              guardrails: v.guardrails,
            })),
          },
          null,
          2,
        ),
        { headers: JSON_HEADERS },
      );
    }

    if (url.pathname === '/api/policies/save' && request.method === 'POST') {
      const authCtx = await authProvider.resolve(request, _env);
      const body = await readJsonBody<{
        entity_type?: string;
        entity_id?: string;
        status?: 'draft' | 'active' | 'archived';
        policy?: JudgmentPolicy;
      }>(request);
      if (!body?.entity_id || !body?.policy) {
        return new Response(JSON.stringify({ error: 'entity_id and policy are required' }, null, 2), { status: 400, headers: JSON_HEADERS });
      }
      const entityType: AtlasEntityType = body.entity_type === 'mcp' ? 'mcp' : 'agent';
      const row = await savePolicyVersion(_env.DB, {
        accountId: authCtx.accountId,
        entityType,
        entityId: body.entity_id,
        status: body.status ?? 'draft',
        policy: body.policy,
        createdBy: authCtx.userId ?? 'api-key',
      });
      if (body.status === 'active') {
        await activatePolicyVersion(_env.DB, {
          accountId: authCtx.accountId,
          entityType,
          entityId: body.entity_id,
          policyVersionId: row.id,
          updatedBy: authCtx.userId ?? 'api-key',
        });
      }
      return new Response(
        JSON.stringify(
          {
            meta: {
              authScope: 'account',
              note: 'Mutation applies within authenticated account context from x-api-key/Bearer token.',
            },
            accountId: authCtx.accountId,
            entityType,
            entityId: body.entity_id,
            policyVersionId: row.id,
            status: row.status,
          },
          null,
          2,
        ),
        { headers: JSON_HEADERS },
      );
    }

    if (url.pathname === '/api/policies/activate' && request.method === 'POST') {
      const authCtx = await authProvider.resolve(request, _env);
      const body = await readJsonBody<{ entity_type?: string; entity_id?: string; policy_version_id?: string }>(request);
      if (!body?.entity_id || !body.policy_version_id) {
        return new Response(JSON.stringify({ error: 'entity_id and policy_version_id are required' }, null, 2), { status: 400, headers: JSON_HEADERS });
      }
      const entityType: AtlasEntityType = body.entity_type === 'mcp' ? 'mcp' : 'agent';
      const row = await getPolicyVersionById(_env.DB, authCtx.accountId, body.policy_version_id);
      if (!row) {
        return new Response(JSON.stringify({ error: 'policy_version_id not found' }, null, 2), { status: 404, headers: JSON_HEADERS });
      }
      await activatePolicyVersion(_env.DB, {
        accountId: authCtx.accountId,
        entityType,
        entityId: body.entity_id,
        policyVersionId: body.policy_version_id,
        updatedBy: authCtx.userId ?? 'api-key',
      });
      return new Response(
        JSON.stringify(
          {
            meta: {
              authScope: 'account',
              note: 'Mutation applies within authenticated account context from x-api-key/Bearer token.',
            },
            accountId: authCtx.accountId,
            entityType,
            entityId: body.entity_id,
            activePolicyVersionId: body.policy_version_id,
          },
          null,
          2,
        ),
        { headers: JSON_HEADERS },
      );
    }

    if (url.pathname === '/api/policies/estimate' && request.method === 'POST') {
      const authCtx = await authProvider.resolve(request, _env);
      const body = await readJsonBody<{
        entity_type?: string;
        entity_id?: string;
        before_policy_version_id?: string;
        after_policy_version_id?: string;
        policy?: JudgmentPolicy;
        scenarios?: JudgmentEstimateScenario[];
      }>(request);
      if (!body?.entity_id) {
        return new Response(JSON.stringify({ error: 'entity_id is required' }, null, 2), { status: 400, headers: JSON_HEADERS });
      }
      const entityType: AtlasEntityType = body.entity_type === 'mcp' ? 'mcp' : 'agent';
      const active = await resolveActivePolicy(_env.DB, {
        accountId: authCtx.accountId,
        entityType,
        entityId: body.entity_id,
      });

      const beforeRow = body.before_policy_version_id
        ? await getPolicyVersionById(_env.DB, authCtx.accountId, body.before_policy_version_id)
        : null;
      const beforePolicy = beforeRow ? (JSON.parse(beforeRow.policy_json) as JudgmentPolicy) : active.policy;
      const beforePolicyVersionId = beforeRow?.id ?? active.policyVersionId;

      let afterPolicy: JudgmentPolicy = active.policy;
      let afterPolicyVersionId: string = active.policyVersionId;
      if (body.after_policy_version_id) {
        const afterRow = await getPolicyVersionById(_env.DB, authCtx.accountId, body.after_policy_version_id);
        if (!afterRow) {
          return new Response(JSON.stringify({ error: 'after_policy_version_id not found' }, null, 2), { status: 404, headers: JSON_HEADERS });
        }
        afterPolicy = JSON.parse(afterRow.policy_json) as JudgmentPolicy;
        afterPolicyVersionId = afterRow.id;
      } else if (body.policy) {
        const saved = await savePolicyVersion(_env.DB, {
          accountId: authCtx.accountId,
          entityType,
          entityId: body.entity_id,
          status: 'draft',
          policy: body.policy,
          createdBy: authCtx.userId ?? 'api-key',
        });
        afterPolicy = body.policy;
        afterPolicyVersionId = saved.id;
      }

      const scenarios = body.scenarios ?? defaultEstimateScenarios();
      const estimate = evaluatePolicyScenarios(authCtx.accountId, authCtx.policy.readOnly === true, beforePolicy, afterPolicy, scenarios);
      const report = await saveEstimateReport(_env.DB, {
        accountId: authCtx.accountId,
        entityType,
        entityId: body.entity_id,
        beforePolicyVersionId,
        afterPolicyVersionId,
        scenarioSet: scenarios,
        summary: estimate.summary,
        createdBy: authCtx.userId ?? 'api-key',
      });

      return new Response(
        JSON.stringify(
          {
            meta: {
              authScope: 'account',
              note: 'Estimate/report is scoped to authenticated account context from x-api-key/Bearer token.',
            },
            accountId: authCtx.accountId,
            entityType,
            entityId: body.entity_id,
            beforePolicyVersionId,
            afterPolicyVersionId,
            inlineSummary: estimate.summary,
            scenarioDetails: estimate.details,
            reportId: report.id,
            reportUrl: `${baseUrl}/reports/${report.id}`,
          },
          null,
          2,
        ),
        { headers: JSON_HEADERS },
      );
    }

    const apiReportMatch = url.pathname.match(/^\/api\/reports\/([a-z0-9_\-]+)$/i);
    if (apiReportMatch) {
      const authCtx = await authProvider.resolve(request, _env);
      const reportId = apiReportMatch[1];
      const accountId = authCtx.accountId;
      const report = await getEstimateReportById(_env.DB, accountId, reportId);
      if (!report) {
        return new Response(JSON.stringify({ error: 'Not found', reportId }, null, 2), { status: 404, headers: JSON_HEADERS });
      }

      return new Response(
        JSON.stringify(
          {
            meta: {
              authScope: 'account',
              note: 'Response is scoped to authenticated account context from x-api-key/Bearer token.',
            },
            report: {
              ...report,
              scenario_set: JSON.parse(report.scenario_set_json),
              summary: JSON.parse(report.summary_json),
            },
          },
          null,
          2,
        ),
        { headers: JSON_HEADERS },
      );
    }

    const apiMcpMatch = url.pathname.match(/^\/api\/mcps\/([a-z0-9-]+)$/i);
    if (apiMcpMatch) {
      const slug = apiMcpMatch[1];
      const entry = findMcpCatalogEntry(slug);
      if (!entry) return new Response(JSON.stringify({ error: 'Not found', slug }, null, 2), { status: 404, headers: JSON_HEADERS });

      const endpointUrl = resolveMcpHttpEndpointUrl(entry);
      const introspection = await introspectMcpServer(endpointUrl);
      const def = mapMcpToWorkflowDefinition(entry, introspection.ok ? introspection.value : undefined);
      const workflow = buildWorkflowTemplate(def);
      const validation = validateBuiltWorkflow(workflow);
      const mermaid = workflowTemplateToMermaid(workflow);

      return new Response(JSON.stringify({
        slug,
        entry,
        endpointUrl,
        introspection,
        definition: def,
        valid: validation.valid,
        invalidIds: validation.invalidIds,
        mermaid,
        workflow,
      }, null, 2), { headers: JSON_HEADERS });
    }

    if (url.pathname === '/api/automations') {
      const authCtx = await authProvider.resolve(request, _env);
      const rows = await listActiveAutomationContracts(_env.DB, authCtx.accountId);
      return new Response(
        JSON.stringify(
          {
            meta: {
              authScope: 'account',
              note: 'Response is scoped to authenticated account context from x-api-key/Bearer token.',
            },
            accountId: authCtx.accountId,
            automations: rows.map((row) => ({
              automation_id: row.automation_id,
              version: row.version,
              name: row.name,
              status: row.status,
              execution_mode: row.execution_mode,
              policy_version_id: row.policy_version_id,
              approval_mode: row.approval_mode,
              trigger_type: row.trigger_type,
              created_at: row.created_at,
            })),
          },
          null,
          2,
        ),
        { headers: JSON_HEADERS },
      );
    }

    const apiAutomationMatch = url.pathname.match(/^\/api\/automations\/([a-z0-9_\-]+)$/i);
    if (apiAutomationMatch) {
      const authCtx = await authProvider.resolve(request, _env);
      const automationId = apiAutomationMatch[1];
      const row = await getActiveAutomationContract(_env.DB, authCtx.accountId, automationId);
      if (!row) {
        return new Response(JSON.stringify({ error: 'Not found', automationId }, null, 2), {
          status: 404,
          headers: JSON_HEADERS,
        });
      }
      return new Response(
        JSON.stringify(
          {
            meta: {
              authScope: 'account',
              note: 'Response is scoped to authenticated account context from x-api-key/Bearer token.',
            },
            accountId: authCtx.accountId,
            automation: {
              ...row,
              spec: JSON.parse(row.spec_json),
            },
          },
          null,
          2,
        ),
        { headers: JSON_HEADERS },
      );
    }

    if (url.pathname === '/api/inbox') {
      const authCtx = await authProvider.resolve(request, _env);
      const approvals = await listPendingApprovals(_env.DB, authCtx.accountId);
      return new Response(
        JSON.stringify(
          {
            meta: {
              authScope: 'account',
              note: 'Response is scoped to authenticated account context from x-api-key/Bearer token.',
            },
            accountId: authCtx.accountId,
            approvals: approvals.map((row) => ({
              approval_id: row.approval_id,
              run_id: row.run_id,
              automation_id: row.automation_id,
              action_type: row.action_type,
              reason: row.reason,
              requested_at: row.requested_at,
              expires_at: row.expires_at,
            })),
          },
          null,
          2,
        ),
        { headers: JSON_HEADERS },
      );
    }

    if (url.pathname === '/policies/editor') {
      const authCtx = await authProvider.resolve(request, _env);
      const entityTypeParam = url.searchParams.get('entity_type');
      const entityId = url.searchParams.get('entity_id') ?? 'fleet-watchdog';
      const entityType: AtlasEntityType = entityTypeParam === 'mcp' ? 'mcp' : 'agent';
      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Policy Tuning Studio</title>
    <style>
      ${openAiBaseCss({ bgSubtle: '#f3f4f6' })}
      header {
        padding: 0.95rem 1.2rem 0.85rem;
        border-bottom: 1px solid var(--border);
        position: sticky;
        top: 0;
        background: rgba(247, 247, 248, 0.94);
        backdrop-filter: blur(10px);
        z-index: 10;
      }
      .headerGrid {
        max-width: 1320px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.9rem;
        flex-wrap: wrap;
      }
      .titleBlock {
        min-width: 340px;
        flex: 1;
      }
      .eyebrow {
        font-size: 0.72rem;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: var(--text-soft);
      }
      .title {
        margin-top: 0.14rem;
        font-size: 1.28rem;
        font-weight: 700;
        letter-spacing: 0.004em;
        line-height: 1.2;
      }
      .metaLine {
        margin-top: 0.24rem;
        color: var(--text-soft);
        font-size: 0.9rem;
      }
      .operatorHint {
        margin-top: 0.3rem;
        color: var(--text-muted);
        line-height: 1.35;
      }
      .toolbarTight {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
        flex-wrap: wrap;
      }
      .surfaceLegend {
        opacity: 0.85;
      }
      .guidedRail {
        max-width: 1320px;
        margin: 0.72rem auto 0;
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 0.58rem 0.72rem;
        background: var(--bg-elevated);
      }
      .processLadder {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
        align-items: center;
        margin: 0.15rem 0 0.48rem;
      }
      .guidedFooter {
        display: flex;
        justify-content: space-between;
        gap: 0.72rem;
        align-items: center;
        flex-wrap: wrap;
      }
      main {
        max-width: 1320px;
        margin: 0 auto;
        padding: 0.95rem 1.2rem 6rem;
        display: grid;
        grid-template-columns: minmax(320px, 0.96fr) minmax(440px, 1.04fr);
        gap: 1rem;
      }
      .panel {
        border: 1px solid var(--border);
        border-radius: 7px;
        background: var(--bg-elevated);
        padding: 0.88rem 0.95rem;
      }
      .sectionLabel {
        font-size: 0.7rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--text-soft);
        margin-bottom: 0.1rem;
      }
      .panelTitle {
        font-size: 1.03rem;
        font-weight: 650;
        letter-spacing: 0.01em;
        margin-bottom: 0.2rem;
        color: var(--text);
      }
      .panelLead {
        margin: 0.12rem 0 0.68rem;
        color: var(--text-muted);
        font-size: 0.9rem;
        line-height: 1.35;
      }
      .muted { color: var(--text-muted); }
      .row { display: flex; gap: 0.55rem; flex-wrap: wrap; margin: 0.46rem 0; align-items: center; }
      .rowKey {
        align-items: flex-start;
        border-top: 1px solid var(--border);
        padding-top: 0.5rem;
        margin-top: 0.5rem;
      }
      .rowLabel {
        min-width: 120px;
        font-size: 0.77rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--text-soft);
        padding-top: 0.5rem;
      }
      .inlineField {
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }
      .inlineField > span {
        color: var(--text-soft);
        font-size: 0.85rem;
      }
      a { color: var(--accent-strong); text-decoration: none; }
      a:hover { text-decoration: underline; }
      select, input, textarea, button {
        background: #ffffff;
        color: var(--text);
        border: 1px solid var(--border-strong);
        border-radius: 8px;
        padding: 0.45rem 0.65rem;
        font: inherit;
        min-height: 36px;
      }
      select:focus-visible, input:focus-visible, textarea:focus-visible, button:focus-visible {
        outline: none;
        border-color: var(--accent-strong);
        box-shadow: 0 0 0 3px var(--focus);
      }
      button {
        cursor: pointer;
        transition: border-color 120ms, background 120ms, transform 120ms, color 120ms;
        background: #ffffff;
      }
      button:hover { border-color: #9ca3af; background: var(--bg-subtle); }
      button:active { transform: translateY(1px); }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btnPrimary {
        background: #f0f9ff;
        border-color: #99d9ff;
        color: #155e75;
      }
      .btnPrimary:hover {
        background: #e0f2fe;
        border-color: #7dd3fc;
        color: #164e63;
      }
      .btnCritical {
        background: var(--accent);
        border-color: var(--accent);
        color: #ffffff;
      }
      .btnCritical:hover {
        background: var(--accent-strong);
        border-color: var(--accent-strong);
        color: #ffffff;
      }
      .btnDanger {
        background: #fff5f4;
        border-color: #f0c1bc;
        color: var(--danger);
      }
      .btnDanger:hover {
        border-color: #e89f97;
        background: #ffe8e5;
      }
      .statusBadge {
        font-size: 0.74rem;
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        color: var(--text);
        background: var(--bg-elevated);
      }
      .rule {
        border: 1px solid var(--border-strong);
        border-radius: 8px;
        padding: 0.65rem;
        margin: 0.5rem 0;
        background: #ffffff;
      }
      .rule.dragging { opacity: 0.55; }
      .pill {
        font-size: 0.73rem;
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 0.14rem 0.42rem;
        color: var(--text-soft);
        background: var(--bg-subtle);
      }
      .pillAdd, .pillTighten {
        border-color: #a7f3d0;
        color: #065f46;
        background: #ecfdf3;
      }
      .pillRemove, .pillRelax {
        border-color: #fecaca;
        color: #991b1b;
        background: #fef2f2;
      }
      .pillChange {
        border-color: #fde68a;
        color: #92400e;
        background: #fffbeb;
      }
      .pillSame {
        border-color: var(--border-strong);
        color: var(--text-soft);
        background: #ffffff;
      }
      .atlasTag {
        font-size: 0.7rem;
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 0.1rem 0.4rem;
        color: var(--text-soft);
        background: var(--bg-subtle);
      }
      pre {
        overflow: auto;
        border: 1px solid var(--border);
        background: #f9fafb;
        border-radius: 8px;
        padding: 0.7rem;
        max-height: 320px;
        color: #111827;
      }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.86rem; }
      .advancedOnly { display: none; }
      body.mode-advanced .advancedOnly { display: block; }
      body.mode-advanced .advancedOnly.row { display: flex; }
      .ruleListFrame {
        border-top: 1px solid var(--border);
        margin-top: 0.52rem;
        padding-top: 0.35rem;
      }
      .blockDivider {
        border-top: 1px dashed var(--border);
        margin: 0.76rem 0 0.68rem;
      }
      .actionBar {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 20;
        border-top: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.97);
        backdrop-filter: blur(10px);
        padding: 0.7rem 1.2rem;
      }
      .actionBarInner {
        max-width: 1320px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        align-items: center;
        flex-wrap: wrap;
      }
      .actionLead {
        min-width: 310px;
      }
      .riskHigh { color: #b42318; }
      .riskMedium { color: #b54708; }
      .riskLow { color: #027a48; }
      .step {
        font-size: 0.78rem;
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 0.12rem 0.46rem;
        color: var(--text-soft);
        background: #ffffff;
      }
      .impactCard {
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 0.55rem 0.65rem;
        background: #ffffff;
        min-width: 170px;
      }
      .impactLabel { color: var(--text-soft); font-size: 0.78rem; }
      .impactValue { font-size: 1rem; font-weight: 650; color: var(--text); }
      .guardrailGood { color: #027a48; }
      .guardrailWarn { color: #b42318; }
      .stepStatus {
        font-size: 0.72rem;
        border-radius: 6px;
        padding: 0.1rem 0.45rem;
        border: 1px solid var(--border);
        color: var(--text-soft);
        background: var(--bg-subtle);
      }
      .stepReady {
        border-color: #fde68a;
        color: #92400e;
        background: #fffbeb;
      }
      .stepDone {
        border-color: #a7f3d0;
        color: #065f46;
        background: #ecfdf3;
      }
      .stepNav { cursor: pointer; background: #ffffff; }
      .stepNav:hover { border-color: var(--accent-strong); background: var(--bg-subtle); }
      @media (max-width: 1080px) {
        main { grid-template-columns: 1fr; }
      }
      @media (max-width: 720px) {
        header { padding: 0.84rem 0.9rem 0.8rem; }
        .title { font-size: 1.14rem; }
        .titleBlock { min-width: 0; }
        .guidedRail { margin-top: 0.65rem; }
        .rowKey { gap: 0.45rem; }
        .rowLabel { min-width: 100%; padding-top: 0; }
        .inlineField { flex-wrap: wrap; }
        main { padding: 0.84rem 0.9rem 7.4rem; }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="headerGrid">
        <div class="titleBlock">
          <div class="eyebrow">Judgment Layer / Policy Editor</div>
          <div class="title">Policy Tuning Studio</div>
          <div class="metaLine">Account: ${esc(authCtx.accountId)} · Entity: ${esc(entityType)}:${esc(entityId)}</div>
          <div id="modeHint" class="operatorHint">
            Simple mode enforces guardrails before activation.
          </div>
          <div class="row surfaceLegend advancedOnly" style="margin-top:0.36rem;">
            <span class="atlasTag">AI Tasks</span>
            <span class="atlasTag">Human Tasks</span>
            <span class="atlasTag">System Tasks</span>
            <span class="atlasTag">Data Artifacts</span>
            <span class="atlasTag">Constraints</span>
            <span class="atlasTag">Touchpoints</span>
          </div>
        </div>
        <div class="toolbarTight">
          <span id="statusBadge" class="statusBadge">Ready</span>
          <label class="muted" for="uiMode">View</label>
          <select id="uiMode">
            <option value="simple" selected>Simple</option>
            <option value="advanced">Advanced</option>
          </select>
          <a href="/policies?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}">Back to policies</a>
        </div>
      </div>
      <div class="guidedRail">
        <div class="sectionLabel">Workflow</div>
        <div id="guidedSteps" class="processLadder"></div>
        <div class="guidedFooter">
          <div id="guidedHint" class="muted">Follow the guided steps from left to right.</div>
          <button id="guidedPrimaryCta">Apply Objective Template</button>
        </div>
      </div>
    </header>
    <main>
      <section class="panel">
        <div class="sectionLabel">01 Diff</div>
        <div class="panelTitle">What Changed</div>
        <div class="panelLead">Compare the current live policy with your proposed snapshot before touching activation controls.</div>
        <div class="row rowKey">
          <div class="rowLabel">Comparison</div>
          <select id="compareMode">
            <option value="active-vs-selected" selected>Current live vs selected</option>
            <option value="any-two">Choose any two snapshots</option>
          </select>
        </div>
        <div class="row rowKey">
          <div class="rowLabel">Snapshots</div>
          <label class="inlineField"><span>Current live</span><select id="beforeVersion"></select></label>
          <label class="inlineField"><span>Proposed</span><select id="afterVersion"></select></label>
        </div>
        <div class="row advancedOnly">
          <button id="reloadBtn">Reload</button>
          <button id="activateAfterBtn">Make Live (Advanced)</button>
        </div>
        <div id="diffSummary" class="row"></div>
        <div id="guardrailTrend" class="row"></div>
        <pre id="diffOutput" class="mono advancedOnly"></pre>
      </section>

      <section class="panel">
        <div class="sectionLabel">02 Policy</div>
        <div class="panelTitle">Decision Rules</div>
        <div class="panelLead">Rank rules by priority, tune guardrails, then simulate expected decision deltas before making changes live.</div>
        <div class="row rowKey">
          <div class="rowLabel">Objective</div>
          <select id="objectivePreset">
            <option value="balanced" selected>Balanced automation</option>
            <option value="safety-first">Safety first (more review/block)</option>
            <option value="speed-first">Speed first (more auto-allow)</option>
          </select>
          <button id="applyPresetBtn">Apply Objective Template</button>
        </div>
        <div class="row rowKey">
          <div class="rowLabel">Guardrails</div>
          <label class="inlineField"><span>Max review delta</span><input id="maxReviewDelta" type="number" min="0" value="2" style="width:88px;" /></label>
          <label class="inlineField"><span>Max block delta</span><input id="maxBlockDelta" type="number" min="0" value="1" style="width:88px;" /></label>
          <button id="resetGuardrailsBtn">Reset Defaults</button>
        </div>
        <div id="ruleMeta" class="row"></div>
        <div class="ruleListFrame">
          <div id="ruleList"></div>
        </div>

        <div class="blockDivider"></div>
        <div class="sectionLabel">Rule Builder</div>
        <div class="panelTitle" style="margin-bottom:0.25rem;">Add Rule</div>
        <div class="row advancedOnly">
          <input id="ruleId" placeholder="Rule ID (advanced)" />
          <input id="rulePriority" type="number" value="50" />
          <input id="toolNames" placeholder="Tool names (comma-separated)" />
        </div>
        <div class="row rowKey">
          <div class="rowLabel">Rule Name</div>
          <input id="ruleName" placeholder="Example: Review before write actions" style="min-width:320px;" />
        </div>
        <div class="row">
          <label><input type="checkbox" id="hasWriteIntent" /> Involves changes/writes</label>
          <label><input type="checkbox" id="hasHumanReviewStep" /> Already has human review</label>
          <label class="advancedOnly"><input type="checkbox" id="introspectionOk" /> Tool discovery succeeded</label>
        </div>
        <div class="row rowKey">
          <div class="rowLabel">Decision</div>
          <select id="decision">
            <option value="allow">Allow automatically</option>
            <option value="require_human_review">Require human review</option>
            <option value="block">Block action</option>
          </select>
          <input id="reason" placeholder="Why this rule exists" style="min-width: 320px;" />
          <button id="addRuleBtn">Add Rule</button>
        </div>
        <div class="row rowKey">
          <div class="rowLabel">Actions</div>
          <button id="saveDraftBtn" class="btnPrimary">Save Draft</button>
          <button id="simulateBtn">Preview Impact</button>
        </div>
        <div id="impactCards" class="row"></div>
        <pre id="simulationOutput" class="mono"></pre>
      </section>
    </main>
    <div class="actionBar">
      <div class="actionBarInner">
        <div class="actionLead">
          <div style="font-weight:600;">Make Live Safely</div>
          <div id="riskSummary" class="muted">Run Preview Impact to see risk before activation.</div>
          <div id="guardrailStatus" class="muted" style="margin-top:0.2rem;">Guardrails: pending preview.</div>
        </div>
        <div class="row" style="margin:0;">
          <button id="simulateBottomBtn">Preview Impact</button>
          <button id="rollbackBtn">Rollback to Current Live</button>
          <button id="makeLiveBtn" class="btnCritical">Make Live</button>
        </div>
      </div>
    </div>

    <script>
      const entityType = ${JSON.stringify(entityType)};
      const entityId = ${JSON.stringify(entityId)};
      let activePolicyVersionId = null;
      let versions = [];
      let policies = new Map();
      let draftPolicy = null;
      let latestEstimateSummary = null;
      const DEFAULT_GUARDRAILS = {
        maxReviewDelta: 2,
        maxBlockDelta: 1,
      };

      function byId(id) { return document.getElementById(id); }
      function sortedRules(rules) { return [...rules].sort((a, b) => a.priority - b.priority); }
      function pretty(value) { return JSON.stringify(value, null, 2); }
      function impactText(delta) { return (delta > 0 ? '+' : '') + String(delta || 0); }
      function getDraftGuardrails() {
        return {
          maxReviewDelta: Number(draftPolicy?.guardrails?.maxReviewDelta ?? DEFAULT_GUARDRAILS.maxReviewDelta),
          maxBlockDelta: Number(draftPolicy?.guardrails?.maxBlockDelta ?? DEFAULT_GUARDRAILS.maxBlockDelta),
        };
      }
      function guardrailsFromPolicy(policy) {
        return {
          maxReviewDelta: Number(policy?.guardrails?.maxReviewDelta ?? DEFAULT_GUARDRAILS.maxReviewDelta),
          maxBlockDelta: Number(policy?.guardrails?.maxBlockDelta ?? DEFAULT_GUARDRAILS.maxBlockDelta),
        };
      }
      function renderGuardrailTrend(beforePolicy, afterPolicy) {
        const host = byId('guardrailTrend');
        if (!host) return;
        const before = guardrailsFromPolicy(beforePolicy);
        const after = guardrailsFromPolicy(afterPolicy);
        const trend = (beforeValue, afterValue, label) => {
          if (afterValue < beforeValue) return '<span class="pill pillTighten">' + label + ': tightened ' + beforeValue + '→' + afterValue + '</span>';
          if (afterValue > beforeValue) return '<span class="pill pillRelax">' + label + ': relaxed ' + beforeValue + '→' + afterValue + '</span>';
          return '<span class="pill pillSame">' + label + ': no change ' + afterValue + '</span>';
        };
        host.innerHTML =
          trend(before.maxReviewDelta, after.maxReviewDelta, 'Review threshold') +
          trend(before.maxBlockDelta, after.maxBlockDelta, 'Block threshold');
      }
      function isGuardrailBreached() {
        if (!latestEstimateSummary) return false;
        const reviewDelta = Math.max(0, latestEstimateSummary.delta.require_human_review || 0);
        const blockDelta = Math.max(0, latestEstimateSummary.delta.block || 0);
        const guardrails = getDraftGuardrails();
        return reviewDelta > guardrails.maxReviewDelta || blockDelta > guardrails.maxBlockDelta;
      }
      function computeGuidedState() {
        const before = selectedPolicy('beforeVersion');
        const after = draftPolicy || selectedPolicy('afterVersion');
        const diff = computeDiff(before, after);
        const changedTotal = (diff.added?.length || 0) + (diff.removed?.length || 0) + (diff.changed?.length || 0);
        const chooseComplete = Boolean(after);
        const draftComplete = chooseComplete && changedTotal > 0;
        const previewComplete = Boolean(latestEstimateSummary);
        const guardrailBreach = isGuardrailBreached();
        const makeLiveReady = previewComplete && !guardrailBreach;
        const makeLiveComplete = makeLiveReady && Boolean(activePolicyVersionId) && activePolicyVersionId === byId('afterVersion')?.value;
        return { chooseComplete, draftComplete, previewComplete, makeLiveReady, makeLiveComplete, guardrailBreach };
      }
      function renderGuidedRail() {
        const steps = byId('guidedSteps');
        const hint = byId('guidedHint');
        const cta = byId('guidedPrimaryCta');
        if (!steps || !hint || !cta) return;
        const s = computeGuidedState();
        const status = (complete, ready) =>
          complete ? '<span class="stepStatus stepDone">Complete</span>' : ready ? '<span class="stepStatus stepReady">Ready</span>' : '<span class="stepStatus">Not started</span>';
        steps.innerHTML =
          '<button type="button" class="step stepNav" data-step="choose">1. Choose</button>' + status(s.chooseComplete, true) +
          '<button type="button" class="step stepNav" data-step="draft">2. Draft</button>' + status(s.draftComplete, s.chooseComplete) +
          '<button type="button" class="step stepNav" data-step="preview">3. Preview</button>' + status(s.previewComplete, s.draftComplete) +
          '<button type="button" class="step stepNav" data-step="make-live">4. Make Live</button>' + status(s.makeLiveComplete, s.makeLiveReady);

        let action = 'apply-template';
        let label = 'Apply Objective Template';
        let copy = 'Start with a template to draft a policy change.';
        if (!s.draftComplete) {
          action = 'apply-template';
          label = 'Apply Objective Template';
          copy = 'Choose an objective template and create a draft change.';
        } else if (!s.previewComplete) {
          action = 'simulate';
          label = 'Preview Impact';
          copy = 'Run preview to estimate allow/review/block deltas.';
        } else if (s.makeLiveReady && !s.makeLiveComplete) {
          action = 'activate';
          label = 'Make Live';
          copy = 'Guardrails pass. You can safely activate this snapshot.';
        } else if (s.makeLiveComplete) {
          action = 'none';
          label = 'Live Now';
          copy = 'Current proposed snapshot is already live.';
        } else if (s.guardrailBreach) {
          action = 'adjust';
          label = 'Adjust Rules or Guardrails';
          copy = 'Preview exceeds guardrails. Lower risk before activation.';
        }
        hint.textContent = copy;
        cta.textContent = label;
        cta.dataset.action = action;
        cta.disabled = action === 'none';
        cta.style.opacity = action === 'none' ? '0.6' : '1';
      }
      function jumpToStep(step) {
        const map = {
          choose: byId('afterVersion'),
          draft: byId('objectivePreset'),
          preview: byId('simulateBtn'),
          'make-live': byId('makeLiveBtn'),
        };
        const target = map[step];
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof target.focus === 'function') target.focus();
      }
      function ensureDraftGuardrails() {
        if (!draftPolicy) return;
        const g = getDraftGuardrails();
        draftPolicy.guardrails = {
          maxReviewDelta: Number.isFinite(g.maxReviewDelta) && g.maxReviewDelta >= 0 ? g.maxReviewDelta : DEFAULT_GUARDRAILS.maxReviewDelta,
          maxBlockDelta: Number.isFinite(g.maxBlockDelta) && g.maxBlockDelta >= 0 ? g.maxBlockDelta : DEFAULT_GUARDRAILS.maxBlockDelta,
        };
      }
      function renderGuardrailsInputs() {
        const g = getDraftGuardrails();
        const review = byId('maxReviewDelta');
        const block = byId('maxBlockDelta');
        if (review) review.value = String(g.maxReviewDelta);
        if (block) block.value = String(g.maxBlockDelta);
      }
      function applyUIMode() {
        const mode = byId('uiMode')?.value || 'simple';
        document.body.classList.remove('mode-simple', 'mode-advanced');
        document.body.classList.add(mode === 'advanced' ? 'mode-advanced' : 'mode-simple');
        const hint = byId('modeHint');
        if (hint) {
          hint.textContent =
            mode === 'advanced'
              ? 'Advanced mode shows full technical controls and expert override actions.'
              : 'Simple mode enforces guardrails before activation.';
        }
        renderGuidedRail();
      }
      function setMakeLiveEnabled(enabled) {
        const btn = byId('makeLiveBtn');
        if (!btn) return;
        btn.disabled = !enabled;
        btn.style.opacity = enabled ? '1' : '0.6';
        btn.title = enabled ? '' : 'Preview indicates guardrail thresholds exceeded.';
      }
      function setStatus(text, tone) {
        const el = byId('statusBadge');
        if (!el) return;
        el.textContent = text;
        el.style.borderColor = tone === 'error' ? '#f0c1bc' : tone === 'success' ? '#a7f3d0' : '#d1d5db';
        el.style.color = tone === 'error' ? '#b42318' : tone === 'success' ? '#027a48' : '#374151';
        el.style.background = tone === 'error' ? '#fff5f4' : tone === 'success' ? '#ecfdf3' : '#ffffff';
      }

      function computeDiff(beforePolicy, afterPolicy) {
        const beforeMap = new Map((beforePolicy?.rules || []).map(r => [r.id, r]));
        const afterMap = new Map((afterPolicy?.rules || []).map(r => [r.id, r]));
        const added = [];
        const removed = [];
        const changed = [];
        for (const [id, rule] of afterMap.entries()) {
          if (!beforeMap.has(id)) added.push(id);
          else if (JSON.stringify(beforeMap.get(id)) !== JSON.stringify(rule)) changed.push(id);
        }
        for (const id of beforeMap.keys()) {
          if (!afterMap.has(id)) removed.push(id);
        }
        return { added, removed, changed };
      }

      function renderRuleList() {
        const wrap = byId('ruleList');
        if (!draftPolicy) { wrap.innerHTML = '<div class="muted">No draft loaded.</div>'; return; }
        draftPolicy.rules = sortedRules(draftPolicy.rules);
        byId('ruleMeta').innerHTML = '<span class="pill">Rules: ' + draftPolicy.rules.length + '</span>' +
          '<span class="pill">Snapshot: ' + (draftPolicy.id || '(draft)') + '</span>';
        wrap.innerHTML = draftPolicy.rules.map((r, i) => {
          return '<div class="rule" draggable="true" data-index="' + i + '">' +
            '<div class="row"><span class="pill">#' + r.priority + '</span><strong>' + (r.displayName || r.id) + '</strong><span>' + (r.then?.decision || '') + '</span><button data-remove="' + i + '" class="btnDanger" style="margin-left:auto;">Remove</button></div>' +
            '<div class="muted">' + (r.then?.reason || '') + '</div>' +
            '<div class="advancedOnly" style="color:var(--text-soft);font-size:0.85rem;">when: ' + JSON.stringify(r.when || {}) + '</div>' +
            '</div>';
        }).join('');

        let dragFrom = -1;
        wrap.querySelectorAll('.rule').forEach((el) => {
          el.addEventListener('dragstart', (e) => {
            dragFrom = Number(el.getAttribute('data-index'));
            el.classList.add('dragging');
            e.dataTransfer.setData('text/plain', String(dragFrom));
          });
          el.addEventListener('dragend', () => el.classList.remove('dragging'));
          el.addEventListener('dragover', (e) => e.preventDefault());
          el.addEventListener('drop', (e) => {
            e.preventDefault();
            const to = Number(el.getAttribute('data-index'));
            if (dragFrom < 0 || to < 0 || dragFrom === to) return;
            const arr = draftPolicy.rules;
            const [moved] = arr.splice(dragFrom, 1);
            arr.splice(to, 0, moved);
            arr.forEach((rule, idx) => { rule.priority = (idx + 1) * 10; });
            renderRuleList();
            renderDiff();
          });
        });
        wrap.querySelectorAll('button[data-remove]').forEach((el) => {
          el.addEventListener('click', () => {
            const idx = Number(el.getAttribute('data-remove'));
            if (Number.isNaN(idx)) return;
            draftPolicy.rules.splice(idx, 1);
            draftPolicy.rules.forEach((rule, i) => { rule.priority = (i + 1) * 10; });
            renderRuleList();
            renderDiff();
            setStatus('Removed rule', 'neutral');
          });
        });
      }

      function selectedPolicy(selectId) {
        const id = byId(selectId).value;
        return id ? policies.get(id) : null;
      }

      function renderDiff() {
        const before = selectedPolicy('beforeVersion');
        const after = draftPolicy || selectedPolicy('afterVersion');
        const diff = computeDiff(before, after);
        byId('diffSummary').innerHTML =
          '<span class="pill pillAdd">added: ' + diff.added.length + '</span>' +
          '<span class="pill pillRemove">removed: ' + diff.removed.length + '</span>' +
          '<span class="pill pillChange">changed: ' + diff.changed.length + '</span>';
        renderGuardrailTrend(before, after);
        byId('diffOutput').textContent = pretty({
          beforeVersion: byId('beforeVersion').value || null,
          afterVersion: byId('afterVersion').value || null,
          guardrailsBefore: guardrailsFromPolicy(before),
          guardrailsAfter: guardrailsFromPolicy(after),
          diff
        });
        updateRiskSummary(diff);
        renderGuidedRail();
      }

      function renderImpactCards() {
        const host = byId('impactCards');
        if (!host) return;
        if (!latestEstimateSummary) {
          host.innerHTML = '<div class="muted">No preview yet. Run Preview Impact to see expected outcome deltas.</div>';
          return;
        }
        host.innerHTML =
          '<div class="impactCard"><div class="impactLabel">Allow delta</div><div class="impactValue">' + impactText(latestEstimateSummary.delta.allow) + '</div></div>' +
          '<div class="impactCard"><div class="impactLabel">Review delta</div><div class="impactValue">' + impactText(latestEstimateSummary.delta.require_human_review) + '</div></div>' +
          '<div class="impactCard"><div class="impactLabel">Block delta</div><div class="impactValue">' + impactText(latestEstimateSummary.delta.block) + '</div></div>';
      }

      function updateRiskSummary(diff) {
        const target = byId('riskSummary');
        const guardrail = byId('guardrailStatus');
        if (!target) return;
        const d = diff || computeDiff(selectedPolicy('beforeVersion'), selectedPolicy('afterVersion'));
        const changedTotal = (d.added?.length || 0) + (d.removed?.length || 0) + (d.changed?.length || 0);
        let level = 'Low';
        let cls = 'riskLow';
        if (changedTotal >= 5 || (d.removed?.length || 0) >= 2) { level = 'High'; cls = 'riskHigh'; }
        else if (changedTotal >= 2) { level = 'Medium'; cls = 'riskMedium'; }

        const estimate = latestEstimateSummary
          ? ' Preview delta — allow: ' + latestEstimateSummary.delta.allow +
            ', review: ' + latestEstimateSummary.delta.require_human_review +
            ', block: ' + latestEstimateSummary.delta.block + '.'
          : ' Run Preview Impact for decision deltas.';
        target.className = cls;
        target.textContent = 'Risk: ' + level + '. Rule changes: ' + changedTotal + '.' + estimate;

        const reviewDelta = Math.max(0, latestEstimateSummary?.delta?.require_human_review || 0);
        const blockDelta = Math.max(0, latestEstimateSummary?.delta?.block || 0);
        const guardrails = getDraftGuardrails();
        const guardrailBreach = isGuardrailBreached();
        if (guardrail) {
          if (!latestEstimateSummary) {
            guardrail.className = 'muted';
            guardrail.textContent = 'Guardrails: pending preview.';
          } else if (guardrailBreach) {
            guardrail.className = 'guardrailWarn';
            guardrail.textContent = 'Guardrails exceeded: review delta ' + reviewDelta + ' (max ' + guardrails.maxReviewDelta + '), block delta ' + blockDelta + ' (max ' + guardrails.maxBlockDelta + ').';
          } else {
            guardrail.className = 'guardrailGood';
            guardrail.textContent = 'Guardrails pass: review delta ' + reviewDelta + ' / ' + guardrails.maxReviewDelta + ', block delta ' + blockDelta + ' / ' + guardrails.maxBlockDelta + '.';
          }
        }
        const simpleMode = (byId('uiMode')?.value || 'simple') === 'simple';
        setMakeLiveEnabled(!simpleMode || !!latestEstimateSummary && !guardrailBreach);
        renderGuidedRail();
      }

      function syncDraftFromAfter() {
        const after = selectedPolicy('afterVersion');
        if (!after) return;
        draftPolicy = JSON.parse(JSON.stringify(after));
        ensureDraftGuardrails();
        renderGuardrailsInputs();
        renderRuleList();
      }

      function applyPresetRules() {
        const preset = byId('objectivePreset')?.value || 'balanced';
        const templates = {
          balanced: [
            {
              id: 'tmpl-review-write',
              displayName: 'Review before write actions',
              priority: 10,
              when: { hasWriteIntent: true, hasHumanReviewStep: false },
              then: { decision: 'require_human_review', reason: 'Write actions should include human review.' },
            },
            {
              id: 'tmpl-allow-default',
              displayName: 'Allow by default',
              priority: 999,
              when: {},
              then: { decision: 'allow', reason: 'Default allow when no risk condition is matched.' },
            },
          ],
          'safety-first': [
            {
              id: 'tmpl-block-unknown',
              displayName: 'Block uncertain discovery state',
              priority: 5,
              when: { introspectionOk: false },
              then: { decision: 'block', reason: 'Block when tool discovery fails.' },
            },
            {
              id: 'tmpl-review-write',
              displayName: 'Require review for writes',
              priority: 10,
              when: { hasWriteIntent: true },
              then: { decision: 'require_human_review', reason: 'All write actions require explicit review.' },
            },
            {
              id: 'tmpl-allow-default',
              displayName: 'Allow low-risk remainder',
              priority: 999,
              when: {},
              then: { decision: 'allow', reason: 'Allow only remaining low-risk actions.' },
            },
          ],
          'speed-first': [
            {
              id: 'tmpl-allow-fast-lane',
              displayName: 'Allow non-write actions',
              priority: 10,
              when: { hasWriteIntent: false },
              then: { decision: 'allow', reason: 'Fast lane for non-write paths.' },
            },
            {
              id: 'tmpl-review-write',
              displayName: 'Review writes without existing approval',
              priority: 20,
              when: { hasWriteIntent: true, hasHumanReviewStep: false },
              then: { decision: 'require_human_review', reason: 'Require review only when not already present.' },
            },
            {
              id: 'tmpl-allow-default',
              displayName: 'Allow remainder',
              priority: 999,
              when: {},
              then: { decision: 'allow', reason: 'Default allow for remaining cases.' },
            },
          ],
        };

        if (!draftPolicy) {
          draftPolicy = {
            id: 'draft-' + entityId,
            name: 'Draft Policy',
            guardrails: {
              maxReviewDelta: DEFAULT_GUARDRAILS.maxReviewDelta,
              maxBlockDelta: DEFAULT_GUARDRAILS.maxBlockDelta,
            },
            rules: [],
          };
        }
        draftPolicy.rules = templates[preset].map((r) => ({ ...r }));
        ensureDraftGuardrails();
        renderGuardrailsInputs();
        renderRuleList();
        renderDiff();
        setStatus('Applied objective template', 'success');
      }

      function fillSelectors() {
        const before = byId('beforeVersion');
        const after = byId('afterVersion');
        const opts = versions.map(v => '<option value="' + v.id + '">' + v.id + ' (' + v.status + ')</option>').join('');
        before.innerHTML = '<option value="">(none)</option>' + opts;
        after.innerHTML = '<option value="">(none)</option>' + opts;
        const mode = byId('compareMode').value;
        if (mode === 'active-vs-selected') {
          before.value = activePolicyVersionId || '';
          after.value = versions[0]?.id || '';
        } else {
          before.value = versions[1]?.id || activePolicyVersionId || '';
          after.value = versions[0]?.id || '';
        }
        syncDraftFromAfter();
        renderDiff();
      }

      async function loadData() {
        setStatus('Loading...', 'neutral');
        const res = await fetch('/api/policies?entity_type=' + encodeURIComponent(entityType) + '&entity_id=' + encodeURIComponent(entityId));
        const data = await res.json();
        activePolicyVersionId = data.activePolicyVersionId || null;
        versions = data.versions || [];
        policies = new Map();
        for (const v of versions) policies.set(v.id, v.policy);
        if (data.activePolicyVersionId && data.activePolicy) policies.set(data.activePolicyVersionId, data.activePolicy);
        fillSelectors();
        renderImpactCards();
        setStatus('Loaded', 'success');
      }

      async function saveDraft() {
        if (!draftPolicy) return;
        ensureDraftGuardrails();
        setStatus('Saving draft...', 'neutral');
        const res = await fetch('/api/policies/save', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            entity_type: entityType,
            entity_id: entityId,
            status: 'draft',
            policy: draftPolicy,
          }),
        });
        const data = await res.json();
        byId('simulationOutput').textContent = pretty(data);
        latestEstimateSummary = data.inlineSummary || null;
        await loadData();
        byId('afterVersion').value = data.policyVersionId || byId('afterVersion').value;
        renderDiff();
        renderImpactCards();
        setStatus('Draft saved', 'success');
      }

      async function activateAfter() {
        const policyVersionId = byId('afterVersion').value;
        if (!policyVersionId) return;
        setStatus('Activating...', 'neutral');
        const res = await fetch('/api/policies/activate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            entity_type: entityType,
            entity_id: entityId,
            policy_version_id: policyVersionId,
          }),
        });
        const data = await res.json();
        byId('simulationOutput').textContent = pretty(data);
        await loadData();
        setStatus('Activated', 'success');
      }

      async function runSimulation() {
        setStatus('Running simulation...', 'neutral');
        const res = await fetch('/api/policies/estimate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            entity_type: entityType,
            entity_id: entityId,
            before_policy_version_id: byId('beforeVersion').value || undefined,
            policy: draftPolicy,
          }),
        });
        const data = await res.json();
        byId('simulationOutput').textContent = pretty(data);
        latestEstimateSummary = data.inlineSummary || null;
        updateRiskSummary();
        renderImpactCards();
        setStatus('Simulation complete', 'success');
      }

      async function rollbackToCurrentLive() {
        const policyVersionId = byId('beforeVersion').value;
        if (!policyVersionId) return;
        setStatus('Rolling back...', 'neutral');
        const res = await fetch('/api/policies/activate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            entity_type: entityType,
            entity_id: entityId,
            policy_version_id: policyVersionId,
          }),
        });
        const data = await res.json();
        byId('simulationOutput').textContent = pretty(data);
        await loadData();
        setStatus('Rolled back to current live snapshot', 'success');
      }

      byId('uiMode').addEventListener('change', () => {
        applyUIMode();
        renderDiff();
      });
      byId('compareMode').addEventListener('change', fillSelectors);
      byId('beforeVersion').addEventListener('change', renderDiff);
      byId('afterVersion').addEventListener('change', () => { syncDraftFromAfter(); renderDiff(); });
      byId('reloadBtn').addEventListener('click', loadData);
      byId('saveDraftBtn').addEventListener('click', saveDraft);
      byId('simulateBtn').addEventListener('click', runSimulation);
      byId('simulateBottomBtn').addEventListener('click', runSimulation);
      byId('activateAfterBtn').addEventListener('click', activateAfter);
      byId('makeLiveBtn').addEventListener('click', activateAfter);
      byId('rollbackBtn').addEventListener('click', rollbackToCurrentLive);
      byId('applyPresetBtn').addEventListener('click', applyPresetRules);
      byId('resetGuardrailsBtn').addEventListener('click', () => {
        if (!draftPolicy) return;
        draftPolicy.guardrails = {
          maxReviewDelta: DEFAULT_GUARDRAILS.maxReviewDelta,
          maxBlockDelta: DEFAULT_GUARDRAILS.maxBlockDelta,
        };
        renderGuardrailsInputs();
        renderDiff();
        setStatus('Guardrails reset to defaults', 'success');
      });
      byId('maxReviewDelta').addEventListener('input', () => {
        if (!draftPolicy) return;
        draftPolicy.guardrails = {
          ...getDraftGuardrails(),
          maxReviewDelta: Number(byId('maxReviewDelta').value || DEFAULT_GUARDRAILS.maxReviewDelta),
        };
        renderDiff();
      });
      byId('maxBlockDelta').addEventListener('input', () => {
        if (!draftPolicy) return;
        draftPolicy.guardrails = {
          ...getDraftGuardrails(),
          maxBlockDelta: Number(byId('maxBlockDelta').value || DEFAULT_GUARDRAILS.maxBlockDelta),
        };
        renderDiff();
      });
      byId('addRuleBtn').addEventListener('click', () => {
        if (!draftPolicy) {
          draftPolicy = {
            id: 'draft-' + entityId,
            name: 'Draft Policy',
            guardrails: {
              maxReviewDelta: DEFAULT_GUARDRAILS.maxReviewDelta,
              maxBlockDelta: DEFAULT_GUARDRAILS.maxBlockDelta,
            },
            rules: [],
          };
        }
        const name = byId('ruleName').value.trim();
        const id = (byId('ruleId').value.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
        if (!id) return;
        const priority = Number(byId('rulePriority').value || '50');
        const toolNamesRaw = byId('toolNames').value.trim();
        const rule = {
          id,
          displayName: name || id,
          priority,
          when: {
            ...(toolNamesRaw ? { toolNames: toolNamesRaw.split(',').map(s => s.trim()).filter(Boolean) } : {}),
            ...(byId('hasWriteIntent').checked ? { hasWriteIntent: true } : {}),
            ...(byId('hasHumanReviewStep').checked ? { hasHumanReviewStep: true } : {}),
            ...(byId('introspectionOk').checked ? { introspectionOk: true } : {}),
          },
          then: {
            decision: byId('decision').value,
            reason: byId('reason').value || 'No reason provided.',
          },
        };
        draftPolicy.rules.push(rule);
        renderRuleList();
        renderDiff();
        setStatus('Rule added', 'success');
      });
      byId('guidedPrimaryCta').addEventListener('click', () => {
        const action = byId('guidedPrimaryCta')?.dataset?.action;
        if (action === 'apply-template') {
          applyPresetRules();
          return;
        }
        if (action === 'simulate') {
          runSimulation();
          return;
        }
        if (action === 'activate') {
          activateAfter();
          return;
        }
        if (action === 'adjust') {
          byId('maxReviewDelta')?.focus();
        }
      });
      byId('guidedSteps').addEventListener('click', (event) => {
        const el = event.target;
        if (!el || !(el instanceof HTMLElement)) return;
        const step = el.getAttribute('data-step');
        if (!step) return;
        jumpToStep(step);
      });

      applyUIMode();
      setMakeLiveEnabled(false);
      renderGuardrailsInputs();
      renderGuidedRail();
      loadData().catch((e) => {
        byId('simulationOutput').textContent = String(e);
        setStatus('Failed to load', 'error');
      });
    </script>
  </body>
</html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/policies') {
      const authCtx = await authProvider.resolve(request, _env);
      const entityTypeParam = url.searchParams.get('entity_type');
      const entityId = url.searchParams.get('entity_id') ?? 'fleet-watchdog';
      const accountId = authCtx.accountId;
      const entityType: AtlasEntityType = entityTypeParam === 'mcp' ? 'mcp' : 'agent';
      const active = await resolveActivePolicy(_env.DB, {
        accountId,
        entityType,
        entityId,
      });
      const versions = await listPolicyVersions(_env.DB, accountId, entityType, entityId);
      const activeGuardrails = {
        maxReviewDelta:
          typeof active.policy.guardrails?.maxReviewDelta === 'number' ? active.policy.guardrails.maxReviewDelta : null,
        maxBlockDelta: typeof active.policy.guardrails?.maxBlockDelta === 'number' ? active.policy.guardrails.maxBlockDelta : null,
      };
      const versionsWithGuardrails = versions.map((v) => {
        const parsed = JSON.parse(v.policy_json) as JudgmentPolicy;
        const guardrails = {
          maxReviewDelta: typeof parsed.guardrails?.maxReviewDelta === 'number' ? parsed.guardrails.maxReviewDelta : null,
          maxBlockDelta: typeof parsed.guardrails?.maxBlockDelta === 'number' ? parsed.guardrails.maxBlockDelta : null,
        };
        return { ...v, guardrails };
      });

      const versionsMarkup =
        versionsWithGuardrails.length === 0
          ? '<div class="muted">No saved policy versions yet.</div>'
          : versionsWithGuardrails
              .map(
                (v) => `<div class="versionRow">
                <div><code>${esc(v.id)}</code></div>
                <div class="muted" style="margin-top:0.2rem;">${esc(v.status)} · ${esc(String(v.created_at))}</div>
                <div class="muted" style="margin-top:0.18rem;">guardrails(review<=<code>${esc(String(v.guardrails.maxReviewDelta ?? 'default'))}</code>, block<=<code>${esc(String(v.guardrails.maxBlockDelta ?? 'default'))}</code>)</div>
              </div>`,
              )
              .join('');

      const body = `
      <div class="card">
        <div class="cardTitle">Active policy</div>
        <div class="muted" style="margin-top:0.35rem;margin-bottom:0.45rem;">
          Guardrails: review delta max <code>${esc(String(activeGuardrails.maxReviewDelta ?? 'default'))}</code> · block delta max <code>${esc(String(activeGuardrails.maxBlockDelta ?? 'default'))}</code>
        </div>
        <pre><code>${esc(JSON.stringify(active.policy, null, 2))}</code></pre>
      </div>
      <div class="card">
        <div class="cardTitle">Saved versions</div>
        <div style="margin-top:0.5rem;">${versionsMarkup}</div>
      </div>
      <div class="muted" style="margin:0.8rem 0 0.35rem;">
        Access scope: this page and policy APIs are account-scoped by your API key or Bearer token context.
      </div>
      <div class="muted">JSON API: <a href="/api/policies?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}"><code>/api/policies</code></a></div>
      <div class="muted" style="margin-top:0.35rem;">Visual editor: <a href="/policies/editor?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}"><code>/policies/editor</code></a></div>`;

      const html = renderViewerPage({
        title: 'Judgment Policies',
        heading: 'Judgment Policies',
        subtitle: `${esc(accountId)} · ${esc(entityType)}:${esc(entityId)}`,
        headerMeta: `<span class="pill">Active <code>${esc(active.policyVersionId)}</code></span>`,
        headerActions: `<a class="pill" href="/policies/editor?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}">Open visual editor</a>`,
        body,
        maxWidth: '1020px',
      });

      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const reportMatch = url.pathname.match(/^\/reports\/([a-z0-9_\-]+)$/i);
    if (reportMatch) {
      const authCtx = await authProvider.resolve(request, _env);
      const reportId = reportMatch[1];
      const accountId = authCtx.accountId;
      const report = await getEstimateReportById(_env.DB, accountId, reportId);
      if (!report) return new Response('Not found', { status: 404 });
      const summary = JSON.parse(report.summary_json) as Record<string, unknown>;
      const scenarios = JSON.parse(report.scenario_set_json) as unknown;

      const body = `
      <div class="card">
        <div class="cardTitle">Metadata</div>
        <div class="fieldGrid" style="margin-top:0.55rem;">
          <div class="field">
            <div class="fieldLabel">Account</div>
            <div>${esc(report.account_id)}</div>
          </div>
          <div class="field">
            <div class="fieldLabel">Entity</div>
            <div>${esc(report.entity_type)}:${esc(report.entity_id)}</div>
          </div>
          <div class="field">
            <div class="fieldLabel">Before</div>
            <div><code>${esc(report.before_policy_version_id ?? 'none')}</code></div>
          </div>
          <div class="field">
            <div class="fieldLabel">After</div>
            <div><code>${esc(report.after_policy_version_id)}</code></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="cardTitle">Summary</div>
        <pre><code>${esc(JSON.stringify(summary, null, 2))}</code></pre>
      </div>
      <div class="card">
        <div class="cardTitle">Scenarios</div>
        <pre><code>${esc(JSON.stringify(scenarios, null, 2))}</code></pre>
      </div>
      <div class="muted" style="margin:0.8rem 0 0.35rem;">
        Access scope: report visibility is account-scoped by your API key/Bearer token context.
      </div>
      <div class="muted">API: <code>${esc(`${baseUrl}/api/reports/${report.id}`)}</code></div>`;

      const html = renderViewerPage({
        title: 'Policy Estimate Report',
        heading: 'Policy Estimate Report',
        headerMeta: `<span class="pill"><code>${esc(report.id)}</code></span>`,
        body,
        maxWidth: '1020px',
      });

      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // Human viewer
    if (url.pathname === '/workflows') {
      const workflows = listWorkflowSummaries();
      const cards = workflows
        .map((w) => {
          const tags = (w.tags ?? []).slice(0, 8);
          return `<article class="card">
          <div class="split">
            <div class="stack">
              <div class="cardTitle"><a href="/workflows/${esc(w.id)}">${esc(w.name)}</a></div>
              <div class="muted">${esc(w.description)}</div>
              <div class="muted"><span class="label">Use case:</span> ${esc(w.primaryUseCase)}</div>
            </div>
            <div><span class="pill"><code>${esc(w.id)}</code></span></div>
          </div>
          ${tags.length > 0 ? `<div class="meta">${tags.map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</div>` : ''}
        </article>`;
        })
        .join('');

      const html = renderViewerPage({
        title: 'Interaction Atlas - Workflows',
        heading: 'Interaction Atlas - Workflow Viewer',
        subtitle: 'Read-only agentic workflows mapped into <code>@quietloudlab/ai-interaction-atlas</code> terms.',
        headerActions: '<a class="pill" href="/mcps">MCP catalog</a>',
        body: cards,
        footer: 'MCP endpoint: <code>/mcp</code> · JSON API: <code>/api/workflows</code>',
        maxWidth: '980px',
      });

      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/mcps') {
      const categoryParam = url.searchParams.get('category') ?? 'all';
      const category: 'create-something' | 'workway' | 'third-party' | 'all' =
        categoryParam === 'create-something' || categoryParam === 'workway' || categoryParam === 'third-party' || categoryParam === 'all'
          ? categoryParam
          : 'all';

      const mcps = listMcpCatalog(category);

      const categories: Array<{ key: typeof category; label: string }> = [
        { key: 'all', label: 'All' },
        { key: 'create-something', label: 'CREATE SOMETHING' },
        { key: 'workway', label: 'WORKWAY' },
        { key: 'third-party', label: 'Third-party' },
      ];

      const categoryPills = categories
        .map((c) => {
          const href = c.key === 'all' ? '/mcps' : `/mcps?category=${encodeURIComponent(c.key)}`;
          const cls = c.key === category ? 'pill active' : 'pill';
          return `<a class="${cls}" href="${esc(href)}">${esc(c.label)}</a>`;
        })
        .join('');

      const cards = mcps
        .map((m) => {
          const tags: string[] = [m.category, ...(m.requiresAuth ? ['requires-auth'] : ['no-auth']), ...m.transports];
          return `<article class="card">
          <div class="split">
            <div class="stack">
              <div class="cardTitle"><a href="/mcps/${esc(m.slug)}">${esc(m.name)}</a></div>
              <div class="muted">${esc(m.description)}</div>
              <div class="muted"><span class="label">URL:</span> <code>${esc(m.url)}</code></div>
            </div>
            <div><span class="pill"><code>${esc(m.slug)}</code></span></div>
          </div>
          <div class="meta">${tags.map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</div>
        </article>`;
        })
        .join('');

      const html = renderViewerPage({
        title: 'Interaction Atlas - MCP Catalog',
        heading: 'Interaction Atlas - MCP Catalog',
        subtitle: 'Auto-mapped capability workflows per MCP server (generated from tool introspection when available).',
        headerMeta: categoryPills,
        headerActions: '<a class="pill" href="/workflows">Curated workflows</a><span class="pill"><code>/api/mcps</code></span>',
        body: cards,
        footer: 'MCP endpoint: <code>/mcp</code> · JSON API: <code>/api/mcps</code>',
        maxWidth: '980px',
      });

      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const mcpMatch = url.pathname.match(/^\/mcps\/([a-z0-9-]+)$/i);
    if (mcpMatch) {
      const slug = mcpMatch[1];
      const entry = findMcpCatalogEntry(slug);
      if (!entry) return new Response('Not found', { status: 404 });

      const endpointUrl = resolveMcpHttpEndpointUrl(entry);
      const introspection = await introspectMcpServer(endpointUrl);
      const def = mapMcpToWorkflowDefinition(entry, introspection.ok ? introspection.value : undefined);
      const workflow = buildWorkflowTemplate(def);
      const mermaid = workflowTemplateToMermaid(workflow) ?? 'error: mermaid generation failed';
      const validation = validateBuiltWorkflow(workflow);

      const toolCount = introspection.ok ? introspection.value.tools.length : 0;
      const resourceCount = introspection.ok ? introspection.value.resources.length : 0;
      const promptCount = introspection.ok ? introspection.value.prompts.length : 0;

      const headerMeta = [
        `<span class="pill">${esc(entry.category)}</span>`,
        `<span class="pill">${entry.requiresAuth ? 'requires-auth' : 'no-auth'}</span>`,
        ...entry.transports.map((t) => `<span class="pill">${esc(t)}</span>`),
        `<span class="pill"><code>${esc(endpointUrl)}</code></span>`,
      ].join('');

      const introspectionSummary = introspection.ok
        ? `<span class="ok">ok</span> · tools: <code>${toolCount}</code> · resources: <code>${resourceCount}</code> · prompts: <code>${promptCount}</code>`
        : `<span class="bad">failed</span> · ${esc(introspection.error)}`;

      const body = `
      <div class="panel">
        <div class="split">
          <div class="stack">
            <div class="label">Introspection</div>
            <div>${introspectionSummary}</div>
          </div>
          <div><span class="pill"><code>/api/mcps/${esc(entry.slug)}</code></span></div>
        </div>
      </div>

      <div class="panel">
        <div class="label" style="margin-bottom:0.5rem;">Mermaid diagram (auto-mapped)</div>
        <pre class="mermaid">${esc(mermaid)}</pre>
      </div>

      ${validation.valid ? '' : `<div class="panel alertBad"><div class="bad" style="font-weight:600;">Invalid Atlas IDs</div><div class="muted" style="margin-top:0.5rem;"><code>${esc(validation.invalidIds.join(', '))}</code></div></div>`}

      <details>
        <summary>MCP Entry JSON</summary>
        <pre><code>${esc(JSON.stringify(entry, null, 2))}</code></pre>
      </details>

      <div class="spacer"></div>

      <details>
        <summary>Introspection JSON</summary>
        <pre><code>${esc(JSON.stringify(introspection, null, 2))}</code></pre>
      </details>

      <div class="spacer"></div>

      <details>
        <summary>Workflow Definition JSON</summary>
        <pre><code>${esc(JSON.stringify(def, null, 2))}</code></pre>
      </details>

      <div class="spacer"></div>

      <details>
        <summary>Workflow JSON (Atlas WorkflowTemplate)</summary>
        <pre><code>${esc(JSON.stringify(workflow, null, 2))}</code></pre>
      </details>`;

      const html = renderViewerPage({
        title: `MCP - ${entry.name}`,
        heading: `${esc(entry.name)} <span class="label" style="font-weight:500;">(mcp:${esc(entry.slug)})</span>`,
        subtitle: esc(entry.description),
        headerMeta,
        headerActions: `<a class="pill" href="/mcps">All MCPs</a><span class="pill ${validation.valid ? 'statusOk' : 'statusBad'}">${validation.valid ? 'valid' : 'invalid'}</span>`,
        body,
        includeMermaid: true,
      });

      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const wfMatch = url.pathname.match(/^\/workflows\/([a-z0-9-]+)$/i);
    if (wfMatch) {
      const workflowId = wfMatch[1];
      const template = getBuiltWorkflowTemplate(workflowId);
      if (!template) return new Response('Not found', { status: 404 });

      const mermaid = getWorkflowMermaid(workflowId) ?? 'error: mermaid generation failed';
      const validation = validateBuiltWorkflow(template);

      const headerMeta = [
        `<span class="pill">${esc(template.primary_use_case)}</span>`,
        ...(template.tags ?? []).map((t) => `<span class="pill">${esc(t)}</span>`),
      ].join('');

      const body = `
      <div class="panel">
        <div class="label" style="margin-bottom:0.5rem;">Mermaid diagram</div>
        <pre class="mermaid">${esc(mermaid)}</pre>
      </div>

      ${validation.valid ? '' : `<div class="panel alertBad"><div class="bad" style="font-weight:600;">Invalid Atlas IDs</div><div class="muted" style="margin-top:0.5rem;"><code>${esc(validation.invalidIds.join(', '))}</code></div></div>`}

      <details>
        <summary>Workflow JSON (Atlas WorkflowTemplate)</summary>
        <pre><code>${esc(JSON.stringify(template, null, 2))}</code></pre>
      </details>`;

      const html = renderViewerPage({
        title: `Workflow - ${workflowId}`,
        heading: `${esc(template.name)} <span class="label" style="font-weight:500;">(${esc(workflowId)})</span>`,
        subtitle: esc(template.description),
        headerMeta,
        headerActions: `<a class="pill" href="/workflows">All workflows</a><span class="pill ${validation.valid ? 'statusOk' : 'statusBad'}">${validation.valid ? 'valid' : 'invalid'}</span>`,
        body,
        includeMermaid: true,
      });

      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // MCP endpoint (Streamable HTTP)
    if (url.pathname === '/mcp') {
      return server.handleRequest(request, _env);
    }

    // Default: info JSON
    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: 'interaction-atlas-mcp',
        version: '0.1.0',
        endpoints: {
          mcp: '/mcp',
          workflows: '/workflows',
          workflowsApi: '/api/workflows',
          mcps: '/mcps',
          mcpsApi: '/api/mcps',
          policies: '/policies',
          policyEditor: '/policies/editor?entity_type=agent&entity_id=<id>',
          policiesApi: '/api/policies?entity_type=agent&entity_id=<id>',
          policySaveApi: '/api/policies/save',
          policyActivateApi: '/api/policies/activate',
          policyEstimateApi: '/api/policies/estimate',
          reportApi: '/api/reports/<report_id>',
          automationsApi: '/api/automations',
          automationApi: '/api/automations/<automation_id>',
          inboxApi: '/api/inbox',
          health: '/health',
        },
        authNotes: {
          mcp: 'Use x-api-key or Bearer token for account-scoped context. Missing key resolves to public read-only.',
          policiesAndReports: 'Policy and report endpoints are scoped to authenticated account context (no account query override).',
        },
      }, null, 2), { headers: JSON_HEADERS });
    }

    return new Response('Not Found', { status: 404 });
  },
};
