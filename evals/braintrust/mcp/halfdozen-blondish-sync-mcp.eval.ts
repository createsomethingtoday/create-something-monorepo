import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Eval, type Score } from 'braintrust';
import { summarizeBraintrustPayload } from '../../../packages/halfdozen-blondish-sync-mcp/src/braintrust.js';
import type { SyncResult } from '../../../packages/halfdozen-blondish-sync-mcp/src/types.js';

type BlondishSyncInput = {
  caseName: 'runtime_telemetry' | 'operator_guardrails' | 'sanitized_summary' | 'scale_path';
};

type BlondishSyncOutput = {
  caseName: BlondishSyncInput['caseName'];
  checks: Record<string, boolean>;
  notes: Record<string, string | number | boolean>;
};

const EXPECTED_TOOLS = [
  'blondish_sync_preflight',
  'blondish_sync_audit',
  'blondish_sync_plan_source_to_hd_repairs',
  'blondish_sync_repair_missing_hd_rows',
  'blondish_sync_repair_external_url_drift',
  'blondish_sync_source_to_hd',
  'blondish_sync_hd_status_to_source',
  'blondish_sync_full',
];

const CASES: Array<{ input: BlondishSyncInput; metadata: Record<string, string> }> = [
  { input: { caseName: 'runtime_telemetry' }, metadata: { suite: 'mcp-fleet', subject: 'halfdozen-blondish-sync-mcp' } },
  { input: { caseName: 'operator_guardrails' }, metadata: { suite: 'mcp-fleet', subject: 'halfdozen-blondish-sync-mcp' } },
  { input: { caseName: 'sanitized_summary' }, metadata: { suite: 'mcp-fleet', subject: 'halfdozen-blondish-sync-mcp' } },
  { input: { caseName: 'scale_path' }, metadata: { suite: 'mcp-fleet', subject: 'halfdozen-blondish-sync-mcp' } },
];

function repoFile(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

function booleanScore(name: string, value: boolean, metadata?: Record<string, unknown>): Score {
  return {
    name,
    score: value ? 1 : 0,
    metadata,
  };
}

function sourceContainsToolWrapper(source: string, tool: string): boolean {
  return new RegExp(`tracedJsonToolResponse\\(\\s*env,\\s*'${tool}'`).test(source);
}

function evaluateRuntimeTelemetry(): BlondishSyncOutput {
  const packageJson = repoFile('packages/halfdozen-blondish-sync-mcp/package.json');
  const braintrustSource = repoFile('packages/halfdozen-blondish-sync-mcp/src/braintrust.ts');
  const mcpSource = repoFile('packages/halfdozen-blondish-sync-mcp/src/mcp.ts');
  const indexSource = repoFile('packages/halfdozen-blondish-sync-mcp/src/index.ts');
  const wrangler = repoFile('packages/halfdozen-blondish-sync-mcp/wrangler.toml');

  const tracedTools = EXPECTED_TOOLS.filter((tool) => (
    mcpSource.includes(`'${tool}'`) && sourceContainsToolWrapper(mcpSource, tool)
  ));

  return {
    caseName: 'runtime_telemetry',
    checks: {
      package_has_braintrust_dependency: packageJson.includes('"braintrust"'),
      helper_uses_braintrust_logger: braintrustSource.includes('initLogger') && braintrustSource.includes('logger.traced'),
      all_tools_wrapped: tracedTools.length === EXPECTED_TOOLS.length,
      health_exposes_braintrust_state: indexSource.includes('braintrustHealth(env)'),
      wrangler_sets_project_name: wrangler.includes('BRAINTRUST_PROJECT_NAME'),
    },
    notes: {
      expected_tools: EXPECTED_TOOLS.length,
      traced_tools: tracedTools.length,
    },
  };
}

function evaluateOperatorGuardrails(): BlondishSyncOutput {
  const mcpSource = repoFile('packages/halfdozen-blondish-sync-mcp/src/mcp.ts');
  const registry = repoFile('config/mcp-hub/registry.core.json');

  return {
    caseName: 'operator_guardrails',
    checks: {
      exposes_all_expected_tools: EXPECTED_TOOLS.every((tool) => mcpSource.includes(`'${tool}'`)),
      audit_first_prompt_present: mcpSource.includes('Use blondish_sync_preflight before first use')
        && mcpSource.includes('For diagnosis, call blondish_sync_audit'),
      scoped_repair_prompt_present: mcpSource.includes('prefer scoped repair tools')
        && mcpSource.includes('Use blondish_sync_repair_missing_hd_rows only')
        && mcpSource.includes('Use blondish_sync_repair_external_url_drift only'),
      generic_replication_denial_present: mcpSource.includes('Do not claim this is generic bidirectional replication'),
      registry_tool_count_current: registry.includes('"estimated_tool_count": 8'),
    },
    notes: {
      tool_count: EXPECTED_TOOLS.length,
    },
  };
}

function evaluateSanitizedSummary(): BlondishSyncOutput {
  const result: SyncResult = {
    ok: true,
    action: 'audit',
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    details: {
      source_rows_checked: 19,
      target_rows_checked: 620,
      matched_rows: 19,
      missing_hd_rows: [
        { source_page_id: '2a187fb8-b156-8037-b5c4-f4f195ca516e', ext_page_id: 'ST-ISH-9', ticket: 'Merchandise Funnel' },
      ],
      duplicate_hd_matches: [],
      contract_field_drifts: [
        { target_page_id: '36f01918-7ac5-815c-ba0a-c5390f0a3a40', ext_page_id: 'ST-ISH-24', fields: ['External URL'] },
      ],
      body_drifts: [],
      reverse_status_drifts: [],
    },
  };

  const summary = summarizeBraintrustPayload(result);
  const serialized = JSON.stringify(summary);

  return {
    caseName: 'sanitized_summary',
    checks: {
      includes_row_counts: summary.source_rows_checked === 19 && summary.target_rows_checked === 620,
      includes_drift_counts: summary.missing_hd_rows_count === 1 && summary.contract_field_drifts_count === 1,
      includes_field_categories: serialized.includes('External URL'),
      omits_page_ids: !serialized.includes('2a187fb8-b156-8037-b5c4-f4f195ca516e')
        && !serialized.includes('36f01918-7ac5-815c-ba0a-c5390f0a3a40'),
      omits_ticket_titles: !serialized.includes('Merchandise Funnel'),
    },
    notes: {
      serialized_length: serialized.length,
    },
  };
}

function evaluateScalePath(): BlondishSyncOutput {
  const readme = repoFile('packages/halfdozen-blondish-sync-mcp/README.md');
  const mcpSource = repoFile('packages/halfdozen-blondish-sync-mcp/src/mcp.ts');
  const rootPackage = repoFile('package.json');

  return {
    caseName: 'scale_path',
    checks: {
      readme_names_operator_control_plane: readme.includes('operator control plane'),
      readme_names_webhooks: readme.includes('Notion Developer webhook subscriptions'),
      readme_names_persisted_index: readme.includes('persisted sync index'),
      prompt_names_future_webhooks_and_index: mcpSource.includes('Notion webhooks and a persisted sync index'),
      root_script_registered: rootPackage.includes('braintrust:eval:mcp:halfdozen-blondish-sync'),
    },
    notes: {
      readme_bytes: readme.length,
    },
  };
}

void Eval<BlondishSyncInput, BlondishSyncOutput>('create-something-mcp-fleet', {
  experimentName: 'halfdozen_blondish_sync_mcp_contract',
  data: CASES,
  task: async (input): Promise<BlondishSyncOutput> => {
    switch (input.caseName) {
      case 'runtime_telemetry':
        return evaluateRuntimeTelemetry();
      case 'operator_guardrails':
        return evaluateOperatorGuardrails();
      case 'sanitized_summary':
        return evaluateSanitizedSummary();
      case 'scale_path':
        return evaluateScalePath();
    }
  },
  scores: [
    ({ output }) => booleanScore('all_checks_pass', Object.values(output.checks).every(Boolean), output.notes),
    ({ output }) => booleanScore('runtime_telemetry', output.caseName !== 'runtime_telemetry' || Object.values(output.checks).every(Boolean), output.checks),
    ({ output }) => booleanScore('operator_guardrails', output.caseName !== 'operator_guardrails' || Object.values(output.checks).every(Boolean), output.checks),
    ({ output }) => booleanScore('sanitized_summary', output.caseName !== 'sanitized_summary' || Object.values(output.checks).every(Boolean), output.checks),
    ({ output }) => booleanScore('scale_path', output.caseName !== 'scale_path' || Object.values(output.checks).every(Boolean), output.checks),
  ],
});
