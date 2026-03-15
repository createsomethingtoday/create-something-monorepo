import type { AtlasWorkflowDefinition } from './types.js';

export const WORKFLOW_DEFINITIONS: AtlasWorkflowDefinition[] = [
  {
    id: 'fleet-watchdog',
    name: 'Fleet Watchdog (Telemetry Review)',
    description:
      'Reliability review workflow for an MCP fleet. Pull recent health + errors + activity, synthesize incidents, and produce a human-reviewable remediation report.',
    primaryUseCase: 'Service reliability monitoring for an MCP fleet',
    tags: ['reliability', 'telemetry', 'mcp-fleet', 'review'],
    touchpoints: ['tp_cli', 'tp_api', 'tp_doc'],
    constraints: ['const_audit_log', 'const_error_handling', 'const_quality_threshold'],
    steps: [
      {
        referenceId: 'human_type_input',
        notes: 'Operator provides the watchdog query / scope (lookback window, fleet list, thresholds).',
      },
      {
        referenceId: 'system_read_db',
        label: 'Query Telemetry DB',
        notes:
          'Read telemetry aggregates + error clusters. Evidence sources: tool outputs for health/errors/activity/trends.',
        attachments: [
          { type: 'constraint', referenceId: 'const_audit_log' },
          { type: 'constraint', referenceId: 'const_error_handling' },
        ],
      },
      {
        referenceId: 'task_synthesize',
        notes: 'Synthesize incidents and regressions into a concise report with concrete values and counts.',
      },
      {
        referenceId: 'task_verify',
        notes: 'Verify each incident claim is supported by telemetry evidence; flag “no data” explicitly.',
        attachments: [{ type: 'constraint', referenceId: 'const_quality_threshold' }],
      },
      {
        referenceId: 'human_review',
        notes: 'Human reviews the report for accuracy and prioritization; decides what to act on.',
        attachments: [{ type: 'constraint', referenceId: 'const_human_loop' }],
      },
    ],
    policy: {
      notes:
        'View-only: this workflow surfaces incidents and recommendations; it does not take remediation actions.',
    },
  },
  {
    id: 'inbox-triage',
    name: 'Inbox Triage (Gmail)',
    description:
      'Triage inbound email threads, summarize client-relevant items, and identify escalation vs safe-to-sync actions with a human in the loop.',
    primaryUseCase: 'Email triage + escalation routing',
    tags: ['gmail', 'triage', 'escalation', 'review'],
    touchpoints: ['tp_email', 'tp_cli', 'tp_api'],
    constraints: ['const_privacy', 'const_authorization', 'const_human_loop'],
    steps: [
      {
        referenceId: 'human_type_input',
        notes: 'Operator sets the triage window (e.g., last 24h) and what counts as “client-relevant”.',
      },
      {
        referenceId: 'system_api',
        label: 'Fetch Email Threads',
        notes: 'Read inbox threads and message bodies (PII-sensitive).',
        attachments: [
          { type: 'constraint', referenceId: 'const_privacy' },
          { type: 'constraint', referenceId: 'const_authorization' },
        ],
      },
      {
        referenceId: 'task_extract',
        notes: 'Extract structured fields (who, what, deadlines, asks) with citations to thread/message IDs.',
      },
      {
        referenceId: 'task_classify',
        notes: 'Classify threads: sync-to-CRM/Notion, ignore, or escalate.',
      },
      {
        referenceId: 'human_review',
        notes: 'Human approves any outbound actions (writes, escalations, client follow-ups).',
        attachments: [{ type: 'constraint', referenceId: 'const_human_loop' }],
      },
    ],
    policy: {
      notes:
        'Default posture: recommend actions, but avoid autonomous writes unless the workflow is explicitly configured to allow it.',
    },
  },
  {
    id: 'dedup',
    name: 'Dedup (Canonicalization)',
    description:
      'Find likely duplicate entities, propose canonical records with evidence + confidence, and produce a merge plan gated by human approval.',
    primaryUseCase: 'Deduplication and canonicalization',
    tags: ['dedup', 'canonicalization', 'quality', 'review'],
    touchpoints: ['tp_cli', 'tp_api', 'tp_web'],
    constraints: ['const_provenance', 'const_confidence', 'const_human_loop'],
    steps: [
      {
        referenceId: 'human_type_input',
        notes: 'Operator defines target dataset and matching criteria (fields, thresholds, merge rules).',
      },
      {
        referenceId: 'system_read_db',
        label: 'Load Records',
        notes: 'Read candidate records from the source of truth (DB/CRM/Notion/etc).',
        attachments: [{ type: 'constraint', referenceId: 'const_provenance' }],
      },
      {
        referenceId: 'task_cluster',
        notes: 'Cluster similar records into candidate duplicate groups.',
        attachments: [{ type: 'constraint', referenceId: 'const_confidence' }],
      },
      {
        referenceId: 'task_rank',
        notes: 'Rank duplicate candidates and select likely canonical records.',
      },
      {
        referenceId: 'task_synthesize',
        notes: 'Generate a merge plan with evidence per proposed change (field-level provenance).',
        attachments: [{ type: 'constraint', referenceId: 'const_provenance' }],
      },
      {
        referenceId: 'human_review',
        notes: 'Human approves merge plan before any updates/deletes happen.',
        attachments: [{ type: 'constraint', referenceId: 'const_human_loop' }],
      },
    ],
    policy: {
      notes:
        'Destructive operations (delete/archive/merge) require explicit human approval; automation should stop at a proposed plan by default.',
    },
  },
];

export function getWorkflowDefinition(id: string): AtlasWorkflowDefinition | undefined {
  return WORKFLOW_DEFINITIONS.find((w) => w.id === id);
}

