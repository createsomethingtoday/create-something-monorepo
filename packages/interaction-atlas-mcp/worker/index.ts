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
            versions: versions.map((v) => ({
              id: v.id,
              status: v.status,
              created_by: v.created_by,
              created_at: v.created_at,
              policy: JSON.parse(v.policy_json),
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
      :root { color-scheme: dark; }
      body {
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        background:
          linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
          #0b0b10;
        background-size: 28px 28px, 28px 28px, auto;
        color: #f8fafc;
      }
      header {
        padding: 1.1rem 1.35rem;
        border-bottom: 1px solid #1f2937;
        position: sticky;
        top: 0;
        background: rgba(11, 11, 16, 0.92);
        backdrop-filter: blur(6px);
        z-index: 10;
      }
      main { padding: 1rem 1.25rem 5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
      @media (max-width: 1040px) { main { grid-template-columns: 1fr; } }
      .panel {
        border: 1px solid #1f2937;
        border-radius: 14px;
        background: #111827;
        padding: 1rem;
        box-shadow: inset 0 1px 0 rgba(148,163,184,0.08);
      }
      .panelTitle { font-weight: 650; letter-spacing: 0.01em; margin-bottom: 0.25rem; }
      .muted { color: #94a3b8; }
      .row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin: 0.45rem 0; align-items: center; }
      select, input, textarea, button {
        background: #020617;
        color: #f8fafc;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 0.4rem 0.6rem;
      }
      select:focus, input:focus, textarea:focus { outline: none; border-color: #60a5fa; box-shadow: 0 0 0 2px rgba(96,165,250,0.18); }
      button { cursor: pointer; transition: border-color 120ms, background 120ms, transform 120ms; }
      button:hover { border-color: #60a5fa; background: #0b1220; }
      button:active { transform: translateY(1px); }
      .btnPrimary { background: #1d4ed8; border-color: #1e40af; color: #dbeafe; }
      .btnPrimary:hover { background: #1e40af; color: #eff6ff; }
      .btnDanger { background: #3f1212; border-color: #7f1d1d; color: #fecaca; }
      .statusBadge { font-size: 0.75rem; border: 1px solid #334155; border-radius: 999px; padding: 0.2rem 0.55rem; color: #cbd5e1; }
      .rule {
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 0.65rem;
        margin: 0.5rem 0;
        background: linear-gradient(180deg, #0b1220, #0a1020);
      }
      .rule.dragging { opacity: 0.55; }
      .pill { font-size: 0.75rem; border: 1px solid #334155; border-radius: 999px; padding: 0.15rem 0.5rem; color: #cbd5e1; background: #0f172a; }
      .pillAdd { border-color: #14532d; color: #bbf7d0; background: rgba(20,83,45,0.22); }
      .pillRemove { border-color: #7f1d1d; color: #fecaca; background: rgba(127,29,29,0.22); }
      .pillChange { border-color: #78350f; color: #fde68a; background: rgba(120,53,15,0.22); }
      .atlasTag { font-size: 0.72rem; border: 1px solid #1e3a8a; border-radius: 999px; padding: 0.12rem 0.5rem; color: #bfdbfe; background: rgba(30,58,138,0.22); }
      pre { overflow: auto; border: 1px solid #1f2937; background: #020617; border-radius: 8px; padding: 0.7rem; max-height: 320px; color: #e2e8f0; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.86rem; }
      .advancedOnly { display: none; }
      body.mode-advanced .advancedOnly { display: block; }
      body.mode-advanced .advancedOnly.row { display: flex; }
      .actionBar {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 20;
        border-top: 1px solid #1f2937;
        background: rgba(11, 11, 16, 0.95);
        backdrop-filter: blur(6px);
        padding: 0.75rem 1.25rem;
      }
      .riskHigh { color: #fecaca; }
      .riskMedium { color: #fde68a; }
      .riskLow { color: #bbf7d0; }
      .step { font-size: 0.78rem; border: 1px solid #334155; border-radius: 999px; padding: 0.12rem 0.48rem; color: #cbd5e1; }
      .impactCard { border: 1px solid #334155; border-radius: 10px; padding: 0.5rem; background: #0f172a; min-width: 180px; }
      .impactLabel { color: #94a3b8; font-size: 0.78rem; }
      .impactValue { font-size: 1rem; font-weight: 650; color: #f8fafc; }
      .guardrailGood { color: #bbf7d0; }
      .guardrailWarn { color: #fecaca; }
    </style>
  </head>
  <body>
    <header>
      <div style="display:flex;justify-content:space-between;gap:0.75rem;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <div style="font-size:1.2rem;font-weight:700;">Policy Tuning Studio</div>
          <div class="muted" style="margin-top:0.25rem;">Account: ${esc(authCtx.accountId)} · Entity: ${esc(entityType)}:${esc(entityId)}</div>
          <div class="muted" style="margin-top:0.35rem;">Simple mode is recommended for non-technical operators.</div>
          <div class="row" style="margin-top:0.45rem;">
            <span class="atlasTag">AI Tasks</span>
            <span class="atlasTag">Human Tasks</span>
            <span class="atlasTag">System Tasks</span>
            <span class="atlasTag">Data Artifacts</span>
            <span class="atlasTag">Constraints</span>
            <span class="atlasTag">Touchpoints</span>
          </div>
          <div class="row" style="margin-top:0.5rem;">
            <span class="step">1. Choose</span>
            <span class="step">2. Draft</span>
            <span class="step">3. Preview</span>
            <span class="step">4. Make Live</span>
          </div>
        </div>
        <div class="row" style="margin:0;">
          <span id="statusBadge" class="statusBadge">Ready</span>
          <label class="muted" for="uiMode">View</label>
          <select id="uiMode">
            <option value="simple" selected>Simple</option>
            <option value="advanced">Advanced</option>
          </select>
          <a href="/policies?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}" style="color:#93c5fd;">Back to policies</a>
        </div>
      </div>
    </header>
    <main>
      <section class="panel">
        <div class="panelTitle">What Changed</div>
        <div class="row">
          <label>Comparison style</label>
          <select id="compareMode">
            <option value="active-vs-selected" selected>Current live vs selected</option>
            <option value="any-two">Choose any two snapshots</option>
          </select>
        </div>
        <div class="row">
          <label>Current live snapshot</label>
          <select id="beforeVersion"></select>
          <label>Proposed snapshot</label>
          <select id="afterVersion"></select>
        </div>
        <div class="row advancedOnly">
          <button id="reloadBtn">Reload</button>
          <button id="activateAfterBtn" class="btnPrimary">Make Live (Advanced)</button>
        </div>
        <div id="diffSummary" class="row"></div>
        <pre id="diffOutput" class="mono advancedOnly"></pre>
      </section>

      <section class="panel">
        <div class="panelTitle">Decision Rules</div>
        <div class="muted" style="margin-bottom:0.5rem;">Reorder rules to control what runs first. Top rules have stronger priority.</div>
        <div class="row">
          <label class="muted">Objective</label>
          <select id="objectivePreset">
            <option value="balanced" selected>Balanced automation</option>
            <option value="safety-first">Safety first (more review/block)</option>
            <option value="speed-first">Speed first (more auto-allow)</option>
          </select>
          <button id="applyPresetBtn">Apply Objective Template</button>
        </div>
        <div id="ruleMeta" class="row"></div>
        <div id="ruleList"></div>

        <div style="margin-top:0.75rem;" class="panelTitle">Add Rule</div>
        <div class="row advancedOnly">
          <input id="ruleId" placeholder="Rule ID (advanced)" />
          <input id="rulePriority" type="number" value="50" />
          <input id="toolNames" placeholder="Tool names (comma-separated)" />
        </div>
        <div class="row">
          <label class="muted">Rule name</label>
          <input id="ruleName" placeholder="Example: Review before write actions" style="min-width:320px;" />
        </div>
        <div class="row">
          <label><input type="checkbox" id="hasWriteIntent" /> Involves changes/writes</label>
          <label><input type="checkbox" id="hasHumanReviewStep" /> Already has human review</label>
          <label class="advancedOnly"><input type="checkbox" id="introspectionOk" /> Tool discovery succeeded</label>
        </div>
        <div class="row">
          <select id="decision">
            <option value="allow">Allow automatically</option>
            <option value="require_human_review">Require human review</option>
            <option value="block">Block action</option>
          </select>
          <input id="reason" placeholder="Why this rule exists" style="min-width: 320px;" />
          <button id="addRuleBtn" class="btnPrimary">Add Rule</button>
        </div>
        <div class="row">
          <button id="saveDraftBtn" class="btnPrimary">Save Draft</button>
          <button id="simulateBtn">Preview Impact</button>
        </div>
        <div id="impactCards" class="row"></div>
        <pre id="simulationOutput" class="mono"></pre>
      </section>
    </main>
    <div class="actionBar">
      <div style="display:flex;justify-content:space-between;gap:0.75rem;align-items:center;flex-wrap:wrap;">
        <div>
          <div style="font-weight:600;">Make Live Safely</div>
          <div id="riskSummary" class="muted">Run Preview Impact to see risk before activation.</div>
          <div id="guardrailStatus" class="muted" style="margin-top:0.2rem;">Guardrails: pending preview.</div>
        </div>
        <div class="row" style="margin:0;">
          <button id="simulateBottomBtn">Preview Impact</button>
          <button id="rollbackBtn">Rollback to Current Live</button>
          <button id="makeLiveBtn" class="btnPrimary">Make Live</button>
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
      const guardrails = {
        maxReviewDelta: 2,
        maxBlockDelta: 1,
      };

      function byId(id) { return document.getElementById(id); }
      function sortedRules(rules) { return [...rules].sort((a, b) => a.priority - b.priority); }
      function pretty(value) { return JSON.stringify(value, null, 2); }
      function impactText(delta) { return (delta > 0 ? '+' : '') + String(delta || 0); }
      function applyUIMode() {
        const mode = byId('uiMode')?.value || 'simple';
        document.body.classList.remove('mode-simple', 'mode-advanced');
        document.body.classList.add(mode === 'advanced' ? 'mode-advanced' : 'mode-simple');
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
        el.style.borderColor = tone === 'error' ? '#7f1d1d' : tone === 'success' ? '#14532d' : '#334155';
        el.style.color = tone === 'error' ? '#fecaca' : tone === 'success' ? '#bbf7d0' : '#cbd5e1';
        el.style.background = tone === 'error' ? 'rgba(127,29,29,0.22)' : tone === 'success' ? 'rgba(20,83,45,0.22)' : 'transparent';
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
        if (!draftPolicy) { wrap.innerHTML = '<div style="color:#9ca3af;">No draft loaded.</div>'; return; }
        draftPolicy.rules = sortedRules(draftPolicy.rules);
        byId('ruleMeta').innerHTML = '<span class="pill">Rules: ' + draftPolicy.rules.length + '</span>' +
          '<span class="pill">Snapshot: ' + (draftPolicy.id || '(draft)') + '</span>';
        wrap.innerHTML = draftPolicy.rules.map((r, i) => {
          return '<div class="rule" draggable="true" data-index="' + i + '">' +
            '<div class="row"><span class="pill">#' + r.priority + '</span><strong>' + (r.displayName || r.id) + '</strong><span>' + (r.then?.decision || '') + '</span><button data-remove="' + i + '" class="btnDanger" style="margin-left:auto;">Remove</button></div>' +
            '<div style="color:#9ca3af;">' + (r.then?.reason || '') + '</div>' +
            '<div class="advancedOnly" style="color:#64748b;font-size:0.85rem;">when: ' + JSON.stringify(r.when || {}) + '</div>' +
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
        const after = selectedPolicy('afterVersion');
        const diff = computeDiff(before, after);
        byId('diffSummary').innerHTML =
          '<span class="pill pillAdd">added: ' + diff.added.length + '</span>' +
          '<span class="pill pillRemove">removed: ' + diff.removed.length + '</span>' +
          '<span class="pill pillChange">changed: ' + diff.changed.length + '</span>';
        byId('diffOutput').textContent = pretty({
          beforeVersion: byId('beforeVersion').value || null,
          afterVersion: byId('afterVersion').value || null,
          diff
        });
        updateRiskSummary(diff);
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
        const guardrailBreach = reviewDelta > guardrails.maxReviewDelta || blockDelta > guardrails.maxBlockDelta;
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
      }

      function syncDraftFromAfter() {
        const after = selectedPolicy('afterVersion');
        if (!after) return;
        draftPolicy = JSON.parse(JSON.stringify(after));
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
          draftPolicy = { id: 'draft-' + entityId, name: 'Draft Policy', rules: [] };
        }
        draftPolicy.rules = templates[preset].map((r) => ({ ...r }));
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
      byId('addRuleBtn').addEventListener('click', () => {
        if (!draftPolicy) {
          draftPolicy = {
            id: 'draft-' + entityId,
            name: 'Draft Policy',
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

      applyUIMode();
      setMakeLiveEnabled(false);
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

      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Judgment Policies</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #0b0b10; color: #e5e7eb; }
      header { padding: 1.75rem 1.5rem 1rem; border-bottom: 1px solid #1f2937; }
      main { padding: 1rem 1.5rem 2rem; max-width: 980px; }
      .card { border: 1px solid #1f2937; border-radius: 12px; background: #0f172a; padding: 0.9rem; margin: 0.75rem 0; }
      .pill { font-size: 0.75rem; border: 1px solid #334155; border-radius: 999px; padding: 0.15rem 0.55rem; }
      code { color: #cbd5e1; }
      a { color: #93c5fd; text-decoration: none; }
    </style>
  </head>
  <body>
    <header>
      <h1 style="margin:0;">Judgment Policies</h1>
      <div style="color:#9ca3af;margin-top:0.35rem;">${esc(accountId)} · ${esc(entityType)}:${esc(entityId)}</div>
      <div style="margin-top:0.55rem;" class="pill">Active: <code>${esc(active.policyVersionId)}</code></div>
    </header>
    <main>
      <div class="card">
        <div style="font-weight:600;margin-bottom:0.35rem;">Active policy</div>
        <pre><code>${esc(JSON.stringify(active.policy, null, 2))}</code></pre>
      </div>
      <div class="card">
        <div style="font-weight:600;margin-bottom:0.35rem;">Saved versions</div>
        ${versions.length === 0 ? '<div style="color:#9ca3af;">No saved policy versions yet.</div>' : versions.map(v => `<div style="margin:0.4rem 0;"><code>${esc(v.id)}</code> · ${esc(v.status)} · ${esc(String(v.created_at))}</div>`).join('')}
      </div>
      <div style="color:#9ca3af;margin:0.75rem 0 0.35rem;">
        Access scope: this page and policy APIs are account-scoped by your API key/Bearer token context.
      </div>
      <div style="color:#64748b;">JSON API: <a href="/api/policies?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}"><code>/api/policies</code></a></div>
      <div style="color:#64748b;margin-top:0.35rem;">Visual editor: <a href="/policies/editor?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}"><code>/policies/editor</code></a></div>
    </main>
  </body>
</html>`;

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

      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Policy Estimate Report</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #0b0b10; color: #e5e7eb; }
      header { padding: 1.75rem 1.5rem 1rem; border-bottom: 1px solid #1f2937; }
      main { padding: 1rem 1.5rem 2rem; max-width: 980px; }
      .card { border: 1px solid #1f2937; border-radius: 12px; background: #0f172a; padding: 0.9rem; margin: 0.75rem 0; }
      code { color: #cbd5e1; }
    </style>
  </head>
  <body>
    <header>
      <h1 style="margin:0;">Policy Estimate Report</h1>
      <div style="color:#9ca3af;margin-top:0.35rem;"><code>${esc(report.id)}</code></div>
    </header>
    <main>
      <div class="card">
        <div><strong>Account:</strong> ${esc(report.account_id)}</div>
        <div><strong>Entity:</strong> ${esc(report.entity_type)}:${esc(report.entity_id)}</div>
        <div><strong>Before:</strong> <code>${esc(report.before_policy_version_id ?? 'none')}</code></div>
        <div><strong>After:</strong> <code>${esc(report.after_policy_version_id)}</code></div>
      </div>
      <div class="card">
        <div style="font-weight:600;margin-bottom:0.35rem;">Summary</div>
        <pre><code>${esc(JSON.stringify(summary, null, 2))}</code></pre>
      </div>
      <div class="card">
        <div style="font-weight:600;margin-bottom:0.35rem;">Scenarios</div>
        <pre><code>${esc(JSON.stringify(scenarios, null, 2))}</code></pre>
      </div>
      <div style="color:#9ca3af;margin:0.75rem 0 0.35rem;">
        Access scope: report visibility is account-scoped by your API key/Bearer token context.
      </div>
      <div style="color:#64748b;">API: <code>${esc(`${baseUrl}/api/reports/${report.id}`)}</code></div>
    </main>
  </body>
</html>`;

      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // Human viewer
    if (url.pathname === '/workflows') {
      const workflows = listWorkflowSummaries();
      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Interaction Atlas — Workflows</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #0b0b10; color: #e5e7eb; }
      a { color: #93c5fd; text-decoration: none; }
      a:hover { text-decoration: underline; }
      header { padding: 2rem 1.5rem 1rem; border-bottom: 1px solid #1f2937; background: radial-gradient(1000px 600px at 15% 10%, #111827, transparent), #0b0b10; }
      h1 { margin: 0 0 0.25rem 0; font-size: 1.4rem; letter-spacing: 0.01em; }
      p { margin: 0.25rem 0 0 0; color: #9ca3af; line-height: 1.4; }
      main { padding: 1rem 1.5rem 2rem; max-width: 980px; }
      .card { border: 1px solid #1f2937; background: #0f172a; border-radius: 14px; padding: 1rem; margin: 0.75rem 0; }
      .meta { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.5rem; }
      .pill { font-size: 0.75rem; color: #cbd5e1; border: 1px solid #334155; border-radius: 999px; padding: 0.15rem 0.55rem; background: rgba(15, 23, 42, 0.6); }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 0.875em; color: #e2e8f0; }
      footer { padding: 1rem 1.5rem 2rem; color: #6b7280; border-top: 1px solid #111827; }
    </style>
  </head>
  <body>
    <header>
      <h1>Interaction Atlas — Workflow Viewer</h1>
      <p>Read-only agentic workflows mapped into <code>@quietloudlab/ai-interaction-atlas</code> terms.</p>
      <p style="margin-top:0.55rem;"><a href="/mcps">MCP catalog</a></p>
    </header>
    <main>
      ${workflows.map(w => {
        const tags = (w.tags ?? []).slice(0, 8);
        return `<div class="card">
          <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;">
            <div>
              <div style="font-size:1.05rem;font-weight:600;"><a href="/workflows/${esc(w.id)}">${esc(w.name)}</a></div>
              <div style="margin-top:0.25rem;color:#9ca3af;">${esc(w.description)}</div>
              <div style="margin-top:0.5rem;color:#cbd5e1;"><span style="color:#64748b;">Use case:</span> ${esc(w.primaryUseCase)}</div>
            </div>
            <div style="text-align:right;">
              <div class="pill"><code>${esc(w.id)}</code></div>
            </div>
          </div>
          ${tags.length > 0 ? `<div class="meta">${tags.map(t => `<span class="pill">${esc(t)}</span>`).join('')}</div>` : ''}
        </div>`;
      }).join('')}
    </main>
    <footer>
      MCP endpoint: <code>/mcp</code> · JSON API: <code>/api/workflows</code>
    </footer>
  </body>
</html>`;

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

      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Interaction Atlas — MCP Catalog</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #0b0b10; color: #e5e7eb; }
      a { color: #93c5fd; text-decoration: none; }
      a:hover { text-decoration: underline; }
      header { padding: 2rem 1.5rem 1rem; border-bottom: 1px solid #1f2937; background: radial-gradient(1000px 600px at 15% 10%, #111827, transparent), #0b0b10; }
      h1 { margin: 0 0 0.25rem 0; font-size: 1.4rem; letter-spacing: 0.01em; }
      p { margin: 0.25rem 0 0 0; color: #9ca3af; line-height: 1.4; }
      main { padding: 1rem 1.5rem 2rem; max-width: 980px; }
      .card { border: 1px solid #1f2937; background: #0f172a; border-radius: 14px; padding: 1rem; margin: 0.75rem 0; }
      .meta { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.5rem; }
      .pill { font-size: 0.75rem; color: #cbd5e1; border: 1px solid #334155; border-radius: 999px; padding: 0.15rem 0.55rem; background: rgba(15, 23, 42, 0.6); }
      .pill.active { border-color: #60a5fa; color: #dbeafe; background: rgba(37, 99, 235, 0.12); }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 0.875em; color: #e2e8f0; }
      footer { padding: 1rem 1.5rem 2rem; color: #6b7280; border-top: 1px solid #111827; }
    </style>
  </head>
  <body>
    <header>
      <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;">
        <div>
          <h1>Interaction Atlas — MCP Catalog</h1>
          <p>Auto-mapped capability workflows per MCP server (generated from tool introspection when available).</p>
          <div class="meta">
            ${categories.map(c => {
              const href = c.key === 'all' ? '/mcps' : `/mcps?category=${encodeURIComponent(c.key)}`;
              const cls = c.key === category ? 'pill active' : 'pill';
              return `<a class="${cls}" href="${esc(href)}">${esc(c.label)}</a>`;
            }).join('')}
          </div>
        </div>
        <div style="text-align:right;">
          <a href="/workflows">Curated workflows</a>
          <div style="margin-top:0.5rem;color:#64748b;"><code>/api/mcps</code></div>
        </div>
      </div>
    </header>
    <main>
      ${mcps.map(m => {
        const tags: string[] = [
          m.category,
          ...(m.requiresAuth ? ['requires-auth'] : ['no-auth']),
          ...m.transports,
        ];
        return `<div class="card">
          <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;">
            <div>
              <div style="font-size:1.05rem;font-weight:600;"><a href="/mcps/${esc(m.slug)}">${esc(m.name)}</a></div>
              <div style="margin-top:0.25rem;color:#9ca3af;">${esc(m.description)}</div>
              <div style="margin-top:0.55rem;color:#cbd5e1;"><span style="color:#64748b;">URL:</span> <code>${esc(m.url)}</code></div>
            </div>
            <div style="text-align:right;">
              <div class="pill"><code>${esc(m.slug)}</code></div>
            </div>
          </div>
          <div class="meta">${tags.map(t => `<span class="pill">${esc(t)}</span>`).join('')}</div>
        </div>`;
      }).join('')}
    </main>
    <footer>
      MCP endpoint: <code>/mcp</code> · JSON API: <code>/api/mcps</code>
    </footer>
  </body>
</html>`;

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

      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MCP — ${esc(entry.name)}</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #0b0b10; color: #e5e7eb; }
      a { color: #93c5fd; text-decoration: none; }
      a:hover { text-decoration: underline; }
      header { padding: 1.75rem 1.5rem 1rem; border-bottom: 1px solid #1f2937; background: radial-gradient(1000px 600px at 15% 10%, #111827, transparent), #0b0b10; }
      h1 { margin: 0 0 0.25rem 0; font-size: 1.35rem; letter-spacing: 0.01em; }
      p { margin: 0.25rem 0 0 0; color: #9ca3af; line-height: 1.4; }
      main { padding: 1rem 1.5rem 2rem; max-width: 1100px; }
      .row { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.75rem; }
      .pill { font-size: 0.75rem; color: #cbd5e1; border: 1px solid #334155; border-radius: 999px; padding: 0.15rem 0.55rem; background: rgba(15, 23, 42, 0.6); }
      .panel { border: 1px solid #1f2937; background: #0f172a; border-radius: 14px; padding: 1rem; margin: 0.75rem 0; }
      details { border: 1px solid #1f2937; background: #0b1220; border-radius: 12px; padding: 0.75rem 0.9rem; }
      summary { cursor: pointer; color: #cbd5e1; font-weight: 600; }
      pre { overflow: auto; padding: 0.75rem; border-radius: 10px; background: #020617; border: 1px solid #111827; color: #e2e8f0; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 0.9em; }
      .ok { color: #34d399; }
      .bad { color: #f87171; }
    </style>
  </head>
  <body>
    <header>
      <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;">
        <div>
          <h1>${esc(entry.name)} <span style="font-weight:500;color:#64748b;">(mcp:${esc(entry.slug)})</span></h1>
          <p>${esc(entry.description)}</p>
          <div class="row">
            <span class="pill">${esc(entry.category)}</span>
            <span class="pill">${entry.requiresAuth ? 'requires-auth' : 'no-auth'}</span>
            ${entry.transports.map(t => `<span class="pill">${esc(t)}</span>`).join('')}
            <span class="pill"><code>${esc(endpointUrl)}</code></span>
          </div>
        </div>
        <div style="text-align:right;">
          <a href="/mcps">All MCPs</a>
          <div style="margin-top:0.5rem;">
            <span class="pill">${validation.valid ? `<span class="ok">valid</span>` : `<span class="bad">invalid</span>`}</span>
          </div>
        </div>
      </div>
    </header>
    <main>
      <div class="panel">
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;">
          <div>
            <div style="color:#9ca3af;margin-bottom:0.25rem;">Introspection</div>
            <div style="color:#cbd5e1;">
              ${introspection.ok
                ? `<span class="ok">ok</span> · tools: <code>${toolCount}</code> · resources: <code>${resourceCount}</code> · prompts: <code>${promptCount}</code>`
                : `<span class="bad">failed</span> · ${esc(introspection.error)}`
              }
            </div>
          </div>
          <div style="text-align:right;color:#64748b;">
            <div><code>/api/mcps/${esc(entry.slug)}</code></div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div style="color:#9ca3af;margin-bottom:0.5rem;">Mermaid diagram (auto-mapped)</div>
        <pre class="mermaid">${esc(mermaid)}</pre>
      </div>

      ${validation.valid ? '' : `<div class="panel"><div class="bad" style="font-weight:600;">Invalid Atlas IDs</div><div style="margin-top:0.5rem;color:#cbd5e1;"><code>${esc(validation.invalidIds.join(', '))}</code></div></div>`}

      <details>
        <summary>MCP Entry JSON</summary>
        <pre><code>${esc(JSON.stringify(entry, null, 2))}</code></pre>
      </details>

      <div style="height:0.75rem;"></div>

      <details>
        <summary>Introspection JSON</summary>
        <pre><code>${esc(JSON.stringify(introspection, null, 2))}</code></pre>
      </details>

      <div style="height:0.75rem;"></div>

      <details>
        <summary>Workflow Definition JSON</summary>
        <pre><code>${esc(JSON.stringify(def, null, 2))}</code></pre>
      </details>

      <div style="height:0.75rem;"></div>

      <details>
        <summary>Workflow JSON (Atlas WorkflowTemplate)</summary>
        <pre><code>${esc(JSON.stringify(workflow, null, 2))}</code></pre>
      </details>
    </main>

    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "base" });
    </script>
  </body>
</html>`;

      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const wfMatch = url.pathname.match(/^\/workflows\/([a-z0-9-]+)$/i);
    if (wfMatch) {
      const workflowId = wfMatch[1];
      const template = getBuiltWorkflowTemplate(workflowId);
      if (!template) return new Response('Not found', { status: 404 });

      const mermaid = getWorkflowMermaid(workflowId) ?? 'error: mermaid generation failed';
      const validation = validateBuiltWorkflow(template);

      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Workflow — ${esc(workflowId)}</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #0b0b10; color: #e5e7eb; }
      a { color: #93c5fd; text-decoration: none; }
      a:hover { text-decoration: underline; }
      header { padding: 1.75rem 1.5rem 1rem; border-bottom: 1px solid #1f2937; background: radial-gradient(1000px 600px at 15% 10%, #111827, transparent), #0b0b10; }
      h1 { margin: 0 0 0.25rem 0; font-size: 1.35rem; letter-spacing: 0.01em; }
      p { margin: 0.25rem 0 0 0; color: #9ca3af; line-height: 1.4; }
      main { padding: 1rem 1.5rem 2rem; max-width: 1100px; }
      .row { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.75rem; }
      .pill { font-size: 0.75rem; color: #cbd5e1; border: 1px solid #334155; border-radius: 999px; padding: 0.15rem 0.55rem; background: rgba(15, 23, 42, 0.6); }
      .panel { border: 1px solid #1f2937; background: #0f172a; border-radius: 14px; padding: 1rem; margin: 0.75rem 0; }
      details { border: 1px solid #1f2937; background: #0b1220; border-radius: 12px; padding: 0.75rem 0.9rem; }
      summary { cursor: pointer; color: #cbd5e1; font-weight: 600; }
      pre { overflow: auto; padding: 0.75rem; border-radius: 10px; background: #020617; border: 1px solid #111827; color: #e2e8f0; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 0.9em; }
      .ok { color: #34d399; }
      .bad { color: #f87171; }
    </style>
  </head>
  <body>
    <header>
      <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;">
        <div>
          <h1>${esc(template.name)} <span style="font-weight:500;color:#64748b;">(${esc(workflowId)})</span></h1>
          <p>${esc(template.description)}</p>
          <div class="row">
            <span class="pill">${esc(template.primary_use_case)}</span>
            ${(template.tags ?? []).map(t => `<span class="pill">${esc(t)}</span>`).join('')}
          </div>
        </div>
        <div style="text-align:right;">
          <a href="/workflows">All workflows</a>
          <div style="margin-top:0.5rem;">
            <span class="pill">${validation.valid ? `<span class="ok">valid</span>` : `<span class="bad">invalid</span>`}</span>
          </div>
        </div>
      </div>
    </header>
    <main>
      <div class="panel">
        <div style="color:#9ca3af;margin-bottom:0.5rem;">Mermaid diagram</div>
        <pre class="mermaid">${esc(mermaid)}</pre>
      </div>

      ${validation.valid ? '' : `<div class="panel"><div class="bad" style="font-weight:600;">Invalid Atlas IDs</div><div style="margin-top:0.5rem;color:#cbd5e1;"><code>${esc(validation.invalidIds.join(', '))}</code></div></div>`}

      <details>
        <summary>Workflow JSON (Atlas WorkflowTemplate)</summary>
        <pre><code>${esc(JSON.stringify(template, null, 2))}</code></pre>
      </details>
    </main>

    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "base" });
    </script>
  </body>
</html>`;

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
