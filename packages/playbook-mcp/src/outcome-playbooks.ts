import type { WorkflowStep } from './playbooks.js';

export type OutcomeVertical = 'construction' | 'agency' | 'ops';

// Aligns with docs/guides/ATLAS_LINEAR_INTEGRATION.md label conventions.
export type OversightLevel = 'required' | 'recommended' | 'optional' | 'none';

export type IntegrationKind = 'mcp' | 'composio' | 'custom';

export interface RequiredIntegration {
  kind: IntegrationKind;
  slug: string;
  label: string;
  required: boolean;
  purpose: string;
}

export interface DataArtifactRef {
  schema: string;
  description: string;
}

export interface PlaybookJudgment {
  /**
   * Maps to existing policy packs in `.judgment/policies/*.toml`.
   * Note: policy packs are guidance; enforcement depends on runtime host.
   */
  recommendedPolicy: 'safe' | 'standard' | 'power';
  notes: string;
}

export interface PlaybookTestScenario {
  name: string;
  given: string;
  when: string;
  then: string;
}

export interface OutcomePlaybook {
  id: string;
  name: string;
  vertical: OutcomeVertical;
  /** Priority within the vertical: 1 is highest. */
  priority: number;

  description: string;
  whyValuable: string;
  oversight: OversightLevel;

  requiredIntegrations: RequiredIntegration[];
  inputs: DataArtifactRef[];
  outputs: DataArtifactRef[];

  /** Atlas constraint ids (e.g., const_privacy, const_audit_log). */
  constraints: string[];
  /** Internal engineering patterns from PATTERNS_INDEX.json (e.g., outbox-v1). */
  resiliencePatterns: string[];

  /** Linear labels per docs/guides/ATLAS_LINEAR_INTEGRATION.md */
  linearLabels: string[];
  judgment: PlaybookJudgment;

  /** Atlas-mapped steps (Codex-first variant). */
  steps: WorkflowStep[];

  /** Minimal acceptance scenarios for judgment + regression testing. */
  testScenarios: PlaybookTestScenario[];
}

const S = (referenceId: string, customLabel: string, notes: string): WorkflowStep => ({
  referenceId,
  customLabel,
  notes,
});

export const OUTCOME_PLAYBOOKS: OutcomePlaybook[] = [
  // ==========================================================================
  // Construction (Procore-centered)
  // ==========================================================================
  {
    id: 'construction--rfi-management',
    name: 'RFI Management (Draft + Route + Track)',
    vertical: 'construction',
    priority: 1,
    description: 'Turn a field question into a Procore RFI draft with referenced context, route it to the right reviewer, track deadlines, and escalate automatically.',
    whyValuable: 'RFIs are a recurring schedule bottleneck. Automation reduces follow-up churn, prevents stalled approvals, and improves auditability.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'custom', slug: 'procore-mcp', label: 'Procore', required: true, purpose: 'Read drawings/spec context; create/update RFIs; track status' },
      { kind: 'composio', slug: 'gmail', label: 'Email (Gmail)', required: false, purpose: 'Notify reviewers and stakeholders; send deadline reminders' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store run logs, reviewer mapping, and escalation state' },
      { kind: 'mcp', slug: 'schedule', label: 'Schedule', required: false, purpose: 'Link RFIs to schedule tasks and critical path context' },
    ],
    inputs: [
      { schema: 'field_question', description: 'Short description of the issue/question from field' },
      { schema: 'drawing_spec_refs', description: 'Relevant drawing sheets/spec sections (if known)' },
    ],
    outputs: [
      { schema: 'rfi', description: 'Drafted RFI (question, context, references, impact, attachments)' },
      { schema: 'review_request', description: 'Assigned reviewer + due date + escalation plan' },
    ],
    constraints: ['const_privacy', 'const_audit_log', 'const_authorization', 'const_human_loop'],
    resiliencePatterns: ['chain-of-verification-v1', 'outbox-v1', 'circuit-breaker-v1'],
    linearLabels: ['mcp:procore-mcp', 'ai:generate', 'human:review', 'artifact:rfi', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Require human review before creating/sending RFIs. Log every created/updated record (audit trail).',
    },
    steps: [
      S('human_type_input', 'Capture field question', 'User provides the field question and any known references.'),
      S('system_api', 'Fetch Procore context', 'Pull related drawings/spec sections, existing RFIs, and assignees from Procore.'),
      S('task_generate', 'Draft RFI', 'Generate an RFI draft with subject, question, context, references, and suggested impact flags.'),
      S('task_verify', 'Verify references', 'Check that referenced spec sections/drawings exist and the draft is internally consistent.'),
      S('human_review', 'Review + edit', 'Human reviews the draft, edits wording, and confirms recipients/due date.'),
      S('system_api', 'Create/update in Procore', 'Create the RFI in Procore (or update an existing one) and attach supporting docs.'),
      S('system_notification', 'Notify + track', 'Notify reviewers/stakeholders and schedule deadline reminders/escalations.'),
      S('system_log', 'Log run', 'Write a run log with links, due date, and decisions to Substrate for traceability.'),
    ],
    testScenarios: [
      {
        name: 'Happy path',
        given: 'A clear field question and the correct Procore project is connected.',
        when: 'The playbook runs end-to-end with a human reviewer.',
        then: 'A single RFI is created/updated, notifications are sent, and the run log includes the Procore RFI link.',
      },
    ],
  },
  {
    id: 'construction--submittal-review',
    name: 'Submittal Review (Extract + Check + Respond)',
    vertical: 'construction',
    priority: 2,
    description: 'Monitor new submittals, extract key fields, check compliance against specs, draft review comments, and update status.',
    whyValuable: 'Submittals drive procurement and installation. Faster, more consistent review reduces rework cycles and schedule slips.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'custom', slug: 'procore-mcp', label: 'Procore', required: true, purpose: 'Fetch submittals, attachments, and status; post review decisions/comments' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Maintain review checklist templates and record decisions' },
    ],
    inputs: [
      { schema: 'submittal_package', description: 'Submittal PDF(s) + metadata + spec requirements' },
      { schema: 'spec_reference', description: 'Relevant spec section(s) for compliance checks' },
    ],
    outputs: [
      { schema: 'submittal_review_comments', description: 'Structured comments + required corrections' },
      { schema: 'submittal_decision', description: 'Approved / Approved as Noted / Revise and Resubmit / Rejected' },
    ],
    constraints: ['const_privacy', 'const_audit_log', 'const_quality_threshold', 'const_human_loop'],
    resiliencePatterns: ['chain-of-verification-v1', 'circuit-breaker-v1'],
    linearLabels: ['mcp:procore-mcp', 'ai:verify', 'human:review', 'artifact:submittal', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human must approve any submittal decision. Keep a checklist artifact for consistent review.',
    },
    steps: [
      S('system_api', 'Detect new submittals', 'Fetch newly submitted / pending-review submittals from Procore.'),
      S('task_extract', 'Extract key fields', 'Extract product, model, substitutions, lead times, and required attributes from the submittal package.'),
      S('task_verify', 'Check against spec', 'Verify compliance against spec requirements and identify missing/incorrect items.'),
      S('task_generate', 'Draft review comments', 'Generate structured review comments and recommended decision.'),
      S('human_review', 'Approve decision', 'Reviewer approves/edits the comments and decision.'),
      S('system_api', 'Update Procore', 'Post comments and decision to Procore and route to submitter.'),
      S('system_log', 'Log run', 'Record decision, rationale, and links in Substrate.'),
    ],
    testScenarios: [
      {
        name: 'Missing spec reference',
        given: 'A new submittal exists but spec references are incomplete.',
        when: 'The playbook runs compliance checks.',
        then: 'The system flags missing references and routes to human for clarification instead of posting an approval.',
      },
    ],
  },
  {
    id: 'construction--change-order-processing',
    name: 'Change Order Processing (Draft + Impact + Approve)',
    vertical: 'construction',
    priority: 3,
    description: 'Convert change requests into a draft change order, estimate schedule/cost impact, route approvals, and sync downstream systems.',
    whyValuable: 'Change orders are high-dollar and high-risk. Faster, evidence-backed drafts reduce revenue leakage and approval latency.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'custom', slug: 'procore-mcp', label: 'Procore', required: true, purpose: 'Create/update change events and change orders; attach evidence' },
      { kind: 'composio', slug: 'gmail', label: 'Email (Gmail)', required: false, purpose: 'Route approvals and deliver owner communications' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store cost/schedule assumptions and decision records' },
      { kind: 'mcp', slug: 'schedule', label: 'Schedule', required: false, purpose: 'Pull baseline schedule for impact analysis' },
    ],
    inputs: [
      { schema: 'change_request', description: 'Field/design change description + supporting evidence' },
      { schema: 'cost_breakdown', description: 'Labor/material/equipment impacts if available' },
    ],
    outputs: [
      { schema: 'change_order', description: 'Draft change order package with evidence and assumptions' },
      { schema: 'impact_summary', description: 'Schedule + budget impact summary for stakeholders' },
    ],
    constraints: ['const_audit_log', 'const_authorization', 'const_human_loop', 'const_quality_threshold'],
    resiliencePatterns: ['saga-v1', 'outbox-v1', 'chain-of-verification-v1'],
    linearLabels: ['mcp:procore-mcp', 'ai:estimate', 'human:approve', 'artifact:change-order', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human approval required for any cost/schedule numbers and for submitting change orders externally.',
    },
    steps: [
      S('human_type_input', 'Capture change request', 'User provides the change request context and any supporting evidence.'),
      S('system_api', 'Fetch linked artifacts', 'Pull related RFIs, submittals, drawings, and prior change events from Procore.'),
      S('task_estimate', 'Estimate impact', 'Estimate cost/schedule impact with explicit assumptions and confidence notes.'),
      S('task_generate', 'Draft change order', 'Generate a draft change order package and summary for approvals.'),
      S('task_verify', 'Verify package', 'Check arithmetic, completeness, and that evidence links are included.'),
      S('human_review', 'Approve + edit', 'Human approves scope, numbers, and external messaging.'),
      S('system_api', 'Submit in Procore', 'Create/update change event and change order in Procore; attach evidence.'),
      S('system_notification', 'Route approvals', 'Notify approvers and track approval SLA; escalate if stalled.'),
      S('system_log', 'Log run', 'Persist decision record + assumptions + links in Substrate.'),
    ],
    testScenarios: [
      {
        name: 'Low confidence estimate',
        given: 'The change request lacks quantity takeoff or cost data.',
        when: 'Impact estimation runs.',
        then: 'The output includes explicit assumptions and requires human approval before submission.',
      },
    ],
  },
  {
    id: 'construction--daily-log-synthesis',
    name: 'Daily Log Synthesis (Field -> Exec Summary)',
    vertical: 'construction',
    priority: 4,
    description: 'Aggregate daily logs, photos, and key events into an executive summary and distribute to stakeholders.',
    whyValuable: 'Daily reporting is repetitive and time-consuming. Automation improves consistency and stakeholder visibility with minimal effort.',
    oversight: 'recommended',
    requiredIntegrations: [
      { kind: 'custom', slug: 'procore-mcp', label: 'Procore', required: true, purpose: 'Fetch daily logs/photos; post summary if desired' },
      { kind: 'composio', slug: 'gmail', label: 'Email (Gmail)', required: false, purpose: 'Distribute daily summaries to stakeholders' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store daily summaries and maintain distribution lists' },
    ],
    inputs: [
      { schema: 'daily_logs', description: 'Crew notes, work completed, deliveries, issues, photos, weather' },
    ],
    outputs: [
      { schema: 'daily_summary', description: 'Structured daily summary with highlights, blockers, and next-day plan' },
    ],
    constraints: ['const_privacy', 'const_audit_log', 'const_format'],
    resiliencePatterns: ['outbox-v1', 'circuit-breaker-v1'],
    linearLabels: ['mcp:procore-mcp', 'ai:summarize', 'human:review', 'artifact:daily-log', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human review recommended for client-facing distribution; internal summaries can be auto-sent with an audit trail.',
    },
    steps: [
      S('system_timer', 'Schedule daily run', 'Run at end of day (or early morning) for each active project.'),
      S('system_api', 'Fetch daily signals', 'Pull daily logs, photos, deliveries, and incident notes from Procore.'),
      S('task_synthesize', 'Synthesize summary', 'Summarize progress, blockers, risks, and decisions with clear bullet points.'),
      S('task_verify', 'Verify completeness', 'Check that required sections exist (progress, issues, safety, next steps).'),
      S('human_review', 'Optional review', 'Reviewer optionally edits wording and confirms recipients.'),
      S('system_notification', 'Distribute summary', 'Send summary to stakeholders and store the artifact in Substrate.'),
      S('system_log', 'Log run', 'Write a run log with recipients and links to source records.'),
    ],
    testScenarios: [
      {
        name: 'No daily logs',
        given: 'No daily log entries exist for the day.',
        when: 'The daily synthesis runs.',
        then: 'The system produces a short “no updates” summary and does not fabricate progress.',
      },
    ],
  },
  {
    id: 'construction--pay-app-prep',
    name: 'Pay App Prep (SOV + Progress -> Draft Billing)',
    vertical: 'construction',
    priority: 5,
    description: 'Prepare a draft pay application package by reconciling progress, SOV, and approved change orders; route for approval.',
    whyValuable: 'Billing cycles are cash-flow critical. Automating package prep reduces errors and accelerates payment.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'custom', slug: 'procore-mcp', label: 'Procore', required: true, purpose: 'Pull SOV/progress/COs; create draft pay app package' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store billing assumptions and approval records' },
      { kind: 'mcp', slug: 'quickbooks-notion', label: 'QuickBooks (optional)', required: false, purpose: 'Cross-check AR/AP context and customer balances' },
    ],
    inputs: [
      { schema: 'schedule_of_values', description: 'SOV lines and prior billing history' },
      { schema: 'progress_evidence', description: 'Field progress, photos, inspections, approved COs' },
    ],
    outputs: [
      { schema: 'pay_application', description: 'Draft pay app package (lines, percent complete, attachments, narrative)' },
    ],
    constraints: ['const_audit_log', 'const_quality_threshold', 'const_human_loop', 'const_authorization'],
    resiliencePatterns: ['chain-of-verification-v1', 'saga-v1', 'outbox-v1'],
    linearLabels: ['mcp:procore-mcp', 'ai:generate', 'human:approve', 'artifact:pay-app', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human approval required before submission. Include explicit reconciliation notes and attach evidence.',
    },
    steps: [
      S('system_timer', 'Schedule billing run', 'Run weekly/monthly ahead of billing deadline.'),
      S('system_api', 'Fetch SOV + progress', 'Pull SOV, prior pay apps, approved change orders, and progress evidence from Procore.'),
      S('task_estimate', 'Estimate percent complete', 'Estimate percent complete per SOV line with cited evidence and confidence notes.'),
      S('task_generate', 'Draft pay app', 'Generate a draft pay application package and narrative.'),
      S('task_verify', 'Reconcile totals', 'Verify totals, retainage, and that COs are included/excluded correctly.'),
      S('human_review', 'Approve submission', 'Human reviews and approves line items and totals.'),
      S('system_api', 'Submit package', 'Create/update the pay application in Procore and attach evidence package.'),
      S('system_log', 'Log run', 'Persist billing record and evidence links in Substrate.'),
    ],
    testScenarios: [
      {
        name: 'Mismatch vs prior billing',
        given: 'SOV totals do not match prior billing baseline.',
        when: 'Reconciliation runs.',
        then: 'The system flags the mismatch and blocks submission until human resolves it.',
      },
    ],
  },
  {
    id: 'construction--cost-variance-alerts',
    name: 'Cost Variance Alerts (Budget -> Early Warning)',
    vertical: 'construction',
    priority: 6,
    description: 'Monitor budget vs actuals/commitments, flag variances early, and generate action-oriented summaries for PMs.',
    whyValuable: 'Early detection prevents overruns from compounding. Automation turns raw financials into readable weekly decisions.',
    oversight: 'recommended',
    requiredIntegrations: [
      { kind: 'custom', slug: 'procore-mcp', label: 'Procore', required: false, purpose: 'Pull commitments, costs, and cost codes' },
      { kind: 'mcp', slug: 'quickbooks-notion', label: 'QuickBooks (optional)', required: false, purpose: 'Cross-check invoices, payments, and GL lines' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store baselines and weekly variance snapshots' },
    ],
    inputs: [
      { schema: 'cost_snapshot', description: 'Budget, actuals, commitments, and forecast by cost code' },
    ],
    outputs: [
      { schema: 'variance_report', description: 'Ranked variances with explanations and recommended actions' },
    ],
    constraints: ['const_audit_log', 'const_privacy', 'const_quality_threshold'],
    resiliencePatterns: ['circuit-breaker-v1', 'chain-of-verification-v1'],
    linearLabels: ['ai:analyze', 'human:review', 'artifact:variance-report', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human review recommended for decision-making; report generation can be fully automated with audit logs.',
    },
    steps: [
      S('system_timer', 'Schedule weekly run', 'Run weekly (and optionally daily for high-risk phases).'),
      S('system_api', 'Fetch financial snapshot', 'Pull budget, actuals, commitments, and forecasts from connected systems.'),
      S('task_rank', 'Rank variances', 'Rank cost codes by variance magnitude and risk severity.'),
      S('task_explain', 'Explain drivers', 'Explain likely drivers (change orders, productivity, procurement) and highlight missing data.'),
      S('task_generate', 'Draft action plan', 'Generate recommended next actions and owner assignments.'),
      S('human_review', 'Review + assign', 'Human reviews the ranked list and assigns follow-ups.'),
      S('system_log', 'Log snapshot', 'Store the snapshot and decisions for trend tracking.'),
    ],
    testScenarios: [
      {
        name: 'Missing cost codes',
        given: 'Some transactions are uncategorized.',
        when: 'Variance ranking runs.',
        then: 'The system flags uncategorized spend and avoids definitive conclusions for those buckets.',
      },
    ],
  },
  {
    id: 'construction--schedule-risk-forecast',
    name: 'Schedule Risk Forecast (Signals -> Mitigation)',
    vertical: 'construction',
    priority: 7,
    description: 'Use workflow signals (RFIs, submittals, procurement) to forecast schedule risks and propose mitigation actions.',
    whyValuable: 'Schedule slips emerge gradually. Forecasting based on operational signals enables proactive mitigation before critical path impact.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'mcp', slug: 'schedule', label: 'Schedule', required: true, purpose: 'Read baseline schedule and milestones; write risk notes/tasks' },
      { kind: 'custom', slug: 'procore-mcp', label: 'Procore', required: false, purpose: 'Pull RFI/submittal/procurement timing signals' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store risk register snapshots and mitigation plans' },
    ],
    inputs: [
      { schema: 'schedule', description: 'Baseline schedule + current progress' },
      { schema: 'workflow_signals', description: 'RFI/submittal lead times, procurement lead times, inspection outcomes' },
    ],
    outputs: [
      { schema: 'risk_register', description: 'Ranked schedule risks with evidence and mitigation actions' },
    ],
    constraints: ['const_quality_threshold', 'const_audit_log', 'const_human_loop'],
    resiliencePatterns: ['chain-of-verification-v1', 'circuit-breaker-v1'],
    linearLabels: ['ai:predict', 'human:approve', 'artifact:risk-register', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Require human approval before modifying schedules or sending escalations to external parties.',
    },
    steps: [
      S('system_timer', 'Schedule weekly run', 'Run weekly and before major milestones.'),
      S('system_api', 'Fetch schedule + signals', 'Pull schedule state and operational signals from connected systems.'),
      S('task_forecast', 'Forecast risk', 'Forecast risk of delay per milestone/activity with evidence and confidence notes.'),
      S('task_rank', 'Rank risks', 'Rank risks by criticality and time-to-impact.'),
      S('task_generate', 'Generate mitigation plan', 'Generate mitigation actions (expedite, resequence, add resources) and owners.'),
      S('human_review', 'Approve actions', 'Human selects/approves mitigation actions.'),
      S('system_update_db', 'Update risk register', 'Write the risk register snapshot and mitigation plan to Substrate.'),
      S('system_log', 'Log run', 'Record the run outcome and links to evidence.'),
    ],
    testScenarios: [
      {
        name: 'Conflicting signals',
        given: 'Procurement shows delays but field reports show progress.',
        when: 'Forecasting runs.',
        then: 'The playbook outputs a flagged “needs investigation” risk with evidence, not a confident forecast.',
      },
    ],
  },
  {
    id: 'construction--procurement-long-lead-watch',
    name: 'Long-Lead Procurement Watch (Forecast + Expedite)',
    vertical: 'construction',
    priority: 8,
    description: 'Track long-lead items, forecast delivery risk, and draft expedite/escalation communications.',
    whyValuable: 'Long-lead slip cascades through schedules. Automation surfaces risk early and standardizes vendor follow-ups.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'custom', slug: 'procore-mcp', label: 'Procore', required: false, purpose: 'Read procurement log and submittal approvals' },
      { kind: 'composio', slug: 'gmail', label: 'Email (Gmail)', required: false, purpose: 'Send expedite requests and escalation emails' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store vendor contacts, SLAs, and escalation history' },
    ],
    inputs: [
      { schema: 'procurement_log', description: 'Item, vendor, promised dates, lead times, dependencies' },
    ],
    outputs: [
      { schema: 'procurement_risk_report', description: 'Risk-ranked items + draft expedite messages' },
    ],
    constraints: ['const_audit_log', 'const_authorization', 'const_human_loop'],
    resiliencePatterns: ['outbox-v1', 'circuit-breaker-v1'],
    linearLabels: ['ai:predict', 'human:approve', 'artifact:procurement-report', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human approval required before sending vendor escalation emails or changing committed dates.',
    },
    steps: [
      S('system_timer', 'Schedule weekly run', 'Run weekly for active projects.'),
      S('system_api', 'Fetch procurement log', 'Pull procurement items and status from connected systems.'),
      S('task_forecast', 'Forecast delays', 'Forecast likely slippage using vendor history and current status.'),
      S('task_rank', 'Rank by criticality', 'Rank items by schedule dependency and time-to-impact.'),
      S('task_generate', 'Draft expedite requests', 'Draft vendor expedite/escalation emails with specific asks and dates.'),
      S('human_review', 'Approve sends', 'Human approves outbound communications and escalation tier.'),
      S('system_notification', 'Send + track', 'Send messages and record them to Substrate for traceability.'),
      S('system_log', 'Log run', 'Store risk report + actions taken.'),
    ],
    testScenarios: [
      {
        name: 'Missing vendor contact',
        given: 'An item has no vendor contact email.',
        when: 'Draft expedite request runs.',
        then: 'The playbook flags the missing contact and does not attempt to send.',
      },
    ],
  },
  {
    id: 'construction--quality-ncr-tracking',
    name: 'Quality NCR Tracking (Detect + Assign + Close)',
    vertical: 'construction',
    priority: 9,
    description: 'Capture non-conformance issues, draft corrective actions, assign owners, and track closure evidence.',
    whyValuable: 'Rework is expensive. A consistent NCR loop reduces repeat defects and improves accountability.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'custom', slug: 'procore-mcp', label: 'Procore', required: false, purpose: 'Read punch lists/inspections; write NCR items if supported' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store NCR records, evidence, and closure criteria' },
    ],
    inputs: [
      { schema: 'quality_issue', description: 'Observed defect + location + photos + spec reference' },
    ],
    outputs: [
      { schema: 'ncr', description: 'NCR record with corrective action plan and closure checklist' },
    ],
    constraints: ['const_audit_log', 'const_quality_threshold', 'const_human_loop'],
    resiliencePatterns: ['chain-of-verification-v1', 'outbox-v1'],
    linearLabels: ['ai:classify', 'human:approve', 'artifact:ncr', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human approval required for corrective action wording and closure status.',
    },
    steps: [
      S('human_type_input', 'Capture issue', 'User records the quality issue with photos and location.'),
      S('task_classify', 'Classify severity', 'Classify severity and likely root cause categories.'),
      S('task_generate', 'Draft corrective action', 'Generate corrective action steps and required evidence for closure.'),
      S('human_review', 'Approve plan', 'Human approves corrective action and assigns owners/due dates.'),
      S('system_update_db', 'Create NCR record', 'Create/update NCR record in Substrate (and/or Procore).'),
      S('system_notification', 'Notify owners', 'Notify owners and set reminder cadence.'),
      S('task_verify', 'Verify closure evidence', 'Verify closure evidence completeness before marking closed.'),
      S('human_validate', 'Close NCR', 'Human validates closure and approves marking the NCR as closed.'),
      S('system_log', 'Log run', 'Record NCR lifecycle changes for audit.'),
    ],
    testScenarios: [
      {
        name: 'Insufficient closure evidence',
        given: 'Closure photos are missing or unclear.',
        when: 'Closure verification runs.',
        then: 'The system blocks closure and requests additional evidence.',
      },
    ],
  },
  {
    id: 'construction--safety-compliance-flagging',
    name: 'Safety/Compliance Flagging (Monitor + Escalate)',
    vertical: 'construction',
    priority: 10,
    description: 'Monitor safety observations/incidents, flag high-risk items, draft incident summaries, and escalate with audit logging.',
    whyValuable: 'Safety incidents are high-liability. Automation improves consistency, timeliness, and traceability of follow-ups.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'custom', slug: 'procore-mcp', label: 'Procore', required: false, purpose: 'Pull safety observations/incidents and photos' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store incident logs and escalation outcomes' },
      { kind: 'composio', slug: 'slack', label: 'Slack (optional)', required: false, purpose: 'Escalate alerts to safety channel' },
    ],
    inputs: [
      { schema: 'safety_observation', description: 'Observation/incident record with notes, photos, and context' },
    ],
    outputs: [
      { schema: 'safety_alert', description: 'Escalation alert with recommended actions and owner' },
      { schema: 'incident_summary', description: 'Structured incident summary for reporting and audit' },
    ],
    constraints: ['const_privacy', 'const_audit_log', 'const_human_loop', 'const_quality_threshold'],
    resiliencePatterns: ['chain-of-verification-v1', 'outbox-v1'],
    linearLabels: ['ai:classify', 'human:approve', 'artifact:safety-alert', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human approval required for incident summaries and any external reporting actions.',
    },
    steps: [
      S('system_timer', 'Schedule daily run', 'Run daily (or after each incident intake).'),
      S('system_api', 'Fetch safety signals', 'Pull observations/incidents and related photos/notes from connected systems.'),
      S('task_classify', 'Classify risk', 'Classify risk severity and urgency (with explicit rationale).'),
      S('task_generate', 'Draft summary + actions', 'Draft incident summary and recommended actions (who/what/when).'),
      S('human_review', 'Approve escalation', 'Human approves escalation payload and recipients.'),
      S('system_notification', 'Send alert', 'Send alert to configured channels and store the record in Substrate.'),
      S('system_log', 'Log run', 'Record classification + actions for audit.'),
    ],
    testScenarios: [
      {
        name: 'False positive risk',
        given: 'A low-severity observation is misclassified as high risk.',
        when: 'Human review occurs.',
        then: 'Human corrects the risk level and the system learns via recorded feedback notes.',
      },
    ],
  },

  // ==========================================================================
  // Agency (marketing/creative)
  // ==========================================================================
  {
    id: 'agency--lead-scoring-routing',
    name: 'Lead Scoring + Routing (Inbox -> CRM)',
    vertical: 'agency',
    priority: 1,
    description: 'Classify inbound leads, enrich context, score fit, route to the right owner, and draft initial outreach.',
    whyValuable: 'Improves response time and sales focus. Automation reduces manual triage and increases consistency.',
    oversight: 'recommended',
    requiredIntegrations: [
      { kind: 'composio', slug: 'gmail', label: 'Email (Gmail)', required: false, purpose: 'Capture inbound leads from inbox and send outreach' },
      { kind: 'composio', slug: 'hubspot', label: 'CRM (HubSpot)', required: false, purpose: 'Create/update deals and contacts' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store scoring rubric, ICP definitions, and routing rules' },
    ],
    inputs: [
      { schema: 'lead_inquiry', description: 'Inbound message + context (company, needs, budget hints)' },
    ],
    outputs: [
      { schema: 'lead_score', description: 'Fit/urgency score with rationale and recommended owner' },
      { schema: 'outreach_draft', description: 'Draft reply requesting next-step details or booking a call' },
    ],
    constraints: ['const_privacy', 'const_audit_log', 'const_quality_threshold'],
    resiliencePatterns: ['chain-of-verification-v1', 'outbox-v1'],
    linearLabels: ['ai:classify', 'human:review', 'artifact:lead', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human review recommended before sending outbound replies; auto-route inside CRM is safe with audit logging.',
    },
    steps: [
      S('system_api', 'Fetch inbound leads', 'Pull new inbound inquiries from email/forms/CRM.'),
      S('task_extract', 'Extract fields', 'Extract company, need, timeline, budget signals, and contact info.'),
      S('task_rank', 'Score + route', 'Score fit/urgency based on ICP and route to owner.'),
      S('task_generate', 'Draft outreach', 'Draft an initial reply and 3 clarifying questions.'),
      S('human_review', 'Approve send', 'Human approves/edits outbound messaging.'),
      S('system_update_db', 'Update CRM', 'Create/update CRM records and assign owner.'),
      S('system_notification', 'Send + notify', 'Send the outreach and notify the assigned owner.'),
      S('system_log', 'Log run', 'Record scoring rationale and message links for audit.'),
    ],
    testScenarios: [
      {
        name: 'Spam/low-fit lead',
        given: 'An inquiry is clearly spam or out-of-scope.',
        when: 'Classification and scoring runs.',
        then: 'The lead is labeled low-fit with no outreach draft, and routed to an archive queue.',
      },
    ],
  },
  {
    id: 'agency--proposal-rfp-drafter',
    name: 'Proposal / RFP Drafter (Requirements -> Draft)',
    vertical: 'agency',
    priority: 2,
    description: 'Extract requirements from a client brief/RFP, assemble relevant case studies, and draft a compliant proposal for review.',
    whyValuable: 'Proposals consume senior time. Automation accelerates first drafts and improves consistency while keeping humans in the loop.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store case studies, bios, pricing bands, and proposal templates' },
      { kind: 'composio', slug: 'google_drive', label: 'Docs (Drive)', required: false, purpose: 'Pull existing assets and deliver the final proposal' },
    ],
    inputs: [
      { schema: 'rfp', description: 'RFP/brief document and any attachments' },
      { schema: 'capabilities_library', description: 'Service offerings, pricing ranges, case studies' },
    ],
    outputs: [
      { schema: 'proposal', description: 'Draft proposal/RFP response with requirements matrix and narrative' },
    ],
    constraints: ['const_privacy', 'const_audit_log', 'const_human_loop', 'const_quality_threshold'],
    resiliencePatterns: ['chain-of-verification-v1'],
    linearLabels: ['ai:generate', 'human:approve', 'artifact:proposal', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human approval required for pricing, scope, and claims. Include a requirements checklist to avoid misses.',
    },
    steps: [
      S('human_upload_file', 'Upload RFP', 'User provides RFP/brief and supporting docs.'),
      S('task_extract', 'Extract requirements', 'Extract requirements into a structured checklist and timeline.'),
      S('system_read_db', 'Fetch reusable assets', 'Pull relevant case studies, bios, and templates from Substrate.'),
      S('task_plan', 'Outline response', 'Plan proposal structure and map requirements to sections.'),
      S('task_generate', 'Draft proposal', 'Generate a complete draft including requirements matrix and executive summary.'),
      S('task_verify', 'Compliance check', 'Verify every RFP requirement has a mapped response section.'),
      S('human_review', 'Edit + approve', 'Human edits positioning, scope, and pricing; approves final.'),
      S('human_export', 'Export final', 'Export final proposal as PDF/doc with correct branding.'),
      S('system_log', 'Log run', 'Store proposal version and decisions in Substrate.'),
    ],
    testScenarios: [
      {
        name: 'Hard requirement missed',
        given: 'RFP includes mandatory security/compliance requirements.',
        when: 'Compliance check runs.',
        then: 'The playbook flags missing sections and blocks export until addressed.',
      },
    ],
  },
  {
    id: 'agency--client-reporting-briefing',
    name: 'Client Reporting + Briefing (Metrics -> Narrative)',
    vertical: 'agency',
    priority: 3,
    description: 'Collect performance metrics, normalize them, generate a concise narrative briefing, and prepare client-ready reporting artifacts.',
    whyValuable: 'Reporting is recurring overhead. Automation frees account leads to spend time on strategy instead of compiling numbers.',
    oversight: 'recommended',
    requiredIntegrations: [
      { kind: 'composio', slug: 'google_analytics', label: 'Analytics (GA4)', required: false, purpose: 'Fetch site/app performance metrics' },
      { kind: 'composio', slug: 'google_ads', label: 'Ads (Google)', required: false, purpose: 'Fetch ad performance metrics' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store KPI definitions, templates, and historical briefs' },
    ],
    inputs: [
      { schema: 'kpi_data', description: 'Channel metrics over the reporting period' },
      { schema: 'client_context', description: 'Goals, campaigns, and known events (launches, outages)' },
    ],
    outputs: [
      { schema: 'report', description: 'Client-ready report + executive summary + next actions' },
    ],
    constraints: ['const_privacy', 'const_audit_log', 'const_format'],
    resiliencePatterns: ['circuit-breaker-v1', 'outbox-v1'],
    linearLabels: ['ai:summarize', 'human:review', 'artifact:report', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human review recommended for client-facing narratives; metric pulls can be automated with audit logs.',
    },
    steps: [
      S('system_timer', 'Schedule report run', 'Run weekly/monthly per client cadence.'),
      S('system_api', 'Fetch metrics', 'Pull metrics from connected analytics/ad platforms.'),
      S('task_transform', 'Normalize metrics', 'Normalize metrics and compute deltas vs previous periods.'),
      S('task_synthesize', 'Synthesize insights', 'Identify drivers, anomalies, and what changed (with evidence).'),
      S('task_generate', 'Draft briefing', 'Draft a client-ready narrative and recommended next actions.'),
      S('human_review', 'Review narrative', 'Human reviews tone, framing, and correctness.'),
      S('human_export', 'Export + deliver', 'Export report and deliver to client.'),
      S('system_log', 'Log run', 'Store brief + data snapshot references in Substrate.'),
    ],
    testScenarios: [
      {
        name: 'Anomalous spike',
        given: 'A metric spikes due to a tracking issue.',
        when: 'Insight synthesis runs.',
        then: 'The playbook flags “possible tracking anomaly” and avoids definitive claims.',
      },
    ],
  },
  {
    id: 'agency--content-production-seo',
    name: 'Content Production (Outline -> Draft -> Publish)',
    vertical: 'agency',
    priority: 4,
    description: 'Turn a brief into an outlined and drafted content asset, with basic fact-check prompts and editorial review gates.',
    whyValuable: 'Content is high-volume. Automation accelerates drafts and enforces consistent structure while keeping editorial control.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store content briefs, voice guides, and publishing checklists' },
      { kind: 'composio', slug: 'webflow', label: 'Webflow', required: false, purpose: 'Publish content to site CMS' },
    ],
    inputs: [
      { schema: 'content_brief', description: 'Topic, target audience, goals, keywords, constraints' },
    ],
    outputs: [
      { schema: 'content_draft', description: 'Draft article with headings, key points, and CTA' },
      { schema: 'publish_checklist', description: 'Checklist for metadata, links, and formatting' },
    ],
    constraints: ['const_tone', 'const_quality_threshold', 'const_human_loop'],
    resiliencePatterns: ['chain-of-verification-v1'],
    linearLabels: ['ai:generate', 'human:approve', 'artifact:content', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human approval required before publishing. Maintain voice guide and a pre-publish checklist artifact.',
    },
    steps: [
      S('human_type_input', 'Provide brief', 'User provides the content brief and constraints.'),
      S('system_read_db', 'Load voice + guidelines', 'Load brand voice, style rules, and content structure templates.'),
      S('task_plan', 'Outline', 'Generate an outline with headings, key points, and a CTA.'),
      S('task_generate', 'Draft content', 'Draft the content using the outline and voice constraints.'),
      S('task_verify', 'Quality checks', 'Run a quality checklist: structure, tone, claims to verify, and missing links.'),
      S('human_review', 'Edit + approve', 'Editor reviews, corrects factual claims, and approves publish.'),
      S('human_export', 'Publish', 'Publish via CMS (or export final draft for upload).'),
      S('system_log', 'Log run', 'Record version and approval decision.'),
    ],
    testScenarios: [
      {
        name: 'Unsupported claim',
        given: 'Draft includes a statistic without a source.',
        when: 'Quality checks run.',
        then: 'The playbook flags the claim for human verification before publish.',
      },
    ],
  },
  {
    id: 'agency--ad-creative-variant-testing',
    name: 'Ad Creative Variants (Brief -> Batch -> Test Plan)',
    vertical: 'agency',
    priority: 5,
    description: 'Generate multiple on-brand ad variants (copy + concepts), create a test plan, and log learnings.',
    whyValuable: 'Creative iteration is the lever in paid media. Automation produces more testable variants with consistent brand constraints.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store brand guidelines, prior winners/losers, and creative templates' },
      { kind: 'composio', slug: 'google_ads', label: 'Ads Platform', required: false, purpose: 'Push approved variants and read performance metrics' },
    ],
    inputs: [
      { schema: 'campaign_brief', description: 'Offer, audience, constraints, target action' },
    ],
    outputs: [
      { schema: 'creative_batch', description: 'Batch of variants with labeling and hypotheses' },
      { schema: 'test_plan', description: 'Plan for budget split, timeline, and success metrics' },
    ],
    constraints: ['const_tone', 'const_quality_threshold', 'const_human_loop'],
    resiliencePatterns: ['chain-of-verification-v1'],
    linearLabels: ['ai:generate', 'human:approve', 'artifact:creative', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human approval required before launching ads. Keep an experiment log artifact with win/loss reasons.',
    },
    steps: [
      S('human_type_input', 'Provide campaign brief', 'User provides offer, audience, and constraints.'),
      S('system_read_db', 'Load guidelines', 'Load brand voice, banned claims, and prior winners/losers.'),
      S('task_generate', 'Generate variants', 'Generate a batch of variants (headlines, primary text, CTAs).'),
      S('task_rank', 'Rank + select shortlist', 'Rank variants by predicted fit to brief and constraint compliance; propose shortlist.'),
      S('human_review', 'Approve shortlist', 'Human selects/edits the variants to test.'),
      S('task_plan', 'Create test plan', 'Create a test plan with metrics, timeline, and budget allocations.'),
      S('system_log', 'Log experiment', 'Store experiment record and links to creatives.'),
    ],
    testScenarios: [
      {
        name: 'Banned claim',
        given: 'A variant violates a compliance rule (e.g., unapproved claim).',
        when: 'Ranking/selection runs.',
        then: 'The playbook flags the violation and excludes it from the shortlist.',
      },
    ],
  },
  {
    id: 'agency--social-calendar-localization',
    name: 'Social Calendar (Plan + Draft + Approve)',
    vertical: 'agency',
    priority: 6,
    description: 'Plan a weekly social calendar, draft platform-specific posts, and prepare an approval queue.',
    whyValuable: 'Social execution is repetitive. Automation reduces time spent on drafting and ensures consistent cadence.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store content pillars, campaign calendar, and approval rules' },
      { kind: 'composio', slug: 'buffer', label: 'Scheduler (optional)', required: false, purpose: 'Schedule approved posts' },
    ],
    inputs: [
      { schema: 'content_pillars', description: 'Themes, offers, events, and constraints for the week' },
    ],
    outputs: [
      { schema: 'social_calendar', description: 'Calendar with post copy per channel and approval status' },
    ],
    constraints: ['const_tone', 'const_human_loop', 'const_format'],
    resiliencePatterns: ['outbox-v1'],
    linearLabels: ['ai:plan', 'human:approve', 'artifact:social-calendar', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human approval required before scheduling. Keep a content calendar artifact per client.',
    },
    steps: [
      S('system_timer', 'Schedule weekly run', 'Run weekly to plan next week content.'),
      S('system_read_db', 'Load pillars + campaigns', 'Load content pillars and current campaigns.'),
      S('task_plan', 'Plan calendar', 'Plan post cadence and themes across platforms.'),
      S('task_generate', 'Draft posts', 'Draft platform-specific post copy and image prompts.'),
      S('human_review', 'Approve posts', 'Human approves/edits copy and selects which posts to publish.'),
      S('human_export', 'Schedule', 'Schedule approved posts in a scheduler (or export for manual scheduling).'),
      S('system_log', 'Log run', 'Store calendar and approvals in Substrate.'),
    ],
    testScenarios: [
      {
        name: 'Conflicting campaign dates',
        given: 'A campaign launch date changed after planning.',
        when: 'Weekly plan runs.',
        then: 'The playbook flags conflicts and regenerates the affected posts only.',
      },
    ],
  },
  {
    id: 'agency--cro-testing-roadmap',
    name: 'CRO Testing Roadmap (Insights -> Hypotheses)',
    vertical: 'agency',
    priority: 7,
    description: 'Analyze conversion funnel signals and produce a prioritized test roadmap with hypotheses and acceptance criteria.',
    whyValuable: 'CRO improvements directly impact revenue. Automation accelerates analysis-to-test planning.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'composio', slug: 'google_analytics', label: 'Analytics (GA4)', required: false, purpose: 'Pull funnel performance data' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store test history, templates, and ICE scoring rubric' },
    ],
    inputs: [
      { schema: 'funnel_metrics', description: 'Funnel steps, drop-offs, segment behavior' },
    ],
    outputs: [
      { schema: 'cro_roadmap', description: 'Ranked tests with hypotheses, metrics, and success criteria' },
    ],
    constraints: ['const_quality_threshold', 'const_human_loop', 'const_audit_log'],
    resiliencePatterns: ['chain-of-verification-v1'],
    linearLabels: ['ai:analyze', 'human:approve', 'artifact:cro-roadmap', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human approval required before implementing tests. Ensure statistical and brand considerations are reviewed.',
    },
    steps: [
      S('system_api', 'Fetch funnel data', 'Pull conversion funnel and segment data from analytics sources.'),
      S('task_extract', 'Extract friction points', 'Identify drop-offs and patterns by segment/device/source.'),
      S('task_rank', 'Prioritize opportunities', 'Rank opportunities with an ICE rubric and evidence notes.'),
      S('task_generate', 'Draft hypotheses', 'Generate test hypotheses, variants, and measurement plans.'),
      S('human_review', 'Approve roadmap', 'Human reviews for feasibility and brand alignment.'),
      S('system_update_db', 'Create tasks', 'Create tasks in PM system for approved tests.'),
      S('system_log', 'Log run', 'Store roadmap and evidence in Substrate.'),
    ],
    testScenarios: [
      {
        name: 'Insufficient data volume',
        given: 'Traffic is too low for statistical significance.',
        when: 'Prioritization runs.',
        then: 'The playbook recommends qualitative research instead of A/B tests.',
      },
    ],
  },
  {
    id: 'agency--pm-autopilot',
    name: 'Project Management Autopilot (Brief -> Tasks)',
    vertical: 'agency',
    priority: 8,
    description: 'Convert a client brief into milestones, tasks, owners, and a status cadence, then keep it updated as work progresses.',
    whyValuable: 'Reduces PM overhead and keeps work visible. Automation maintains hygiene: owners, due dates, and handoffs.',
    oversight: 'recommended',
    requiredIntegrations: [
      { kind: 'composio', slug: 'notion', label: 'Notion (PM)', required: false, purpose: 'Create/update tasks and project pages' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store project templates and status cadence rules' },
    ],
    inputs: [
      { schema: 'client_brief', description: 'Deliverables, deadlines, constraints, stakeholders' },
    ],
    outputs: [
      { schema: 'project_plan', description: 'Milestones, tasks, owners, and status cadence' },
    ],
    constraints: ['const_audit_log', 'const_human_loop'],
    resiliencePatterns: ['outbox-v1', 'saga-v1'],
    linearLabels: ['ai:plan', 'human:review', 'artifact:project-plan', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human review recommended for task assignments and deadlines; automated updates should be logged.',
    },
    steps: [
      S('human_upload_file', 'Provide brief', 'User provides the project brief and constraints.'),
      S('task_extract', 'Extract deliverables', 'Extract deliverables, stakeholders, and deadlines into structured fields.'),
      S('task_plan', 'Create plan', 'Generate milestones, tasks, and a weekly status cadence.'),
      S('human_review', 'Review assignments', 'Human reviews owners, dates, and scope.'),
      S('system_update_db', 'Create PM artifacts', 'Create/update tasks and project pages in PM system.'),
      S('system_notification', 'Notify owners', 'Notify owners of assignments and next steps.'),
      S('system_log', 'Log run', 'Record plan + changes for audit.'),
    ],
    testScenarios: [
      {
        name: 'Overloaded owner',
        given: 'An owner is already at capacity.',
        when: 'Task planning runs.',
        then: 'The playbook flags the overload and suggests alternative assignments.',
      },
    ],
  },
  {
    id: 'agency--competitive-intel-brief',
    name: 'Competitive Intel Brief (Monitor -> Summary)',
    vertical: 'agency',
    priority: 9,
    description: 'Collect competitor updates and produce a concise weekly brief with implications and opportunities.',
    whyValuable: 'Competitive monitoring is repetitive but important. Automation creates a consistent signal loop.',
    oversight: 'recommended',
    requiredIntegrations: [
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store competitor list, watch sources, and weekly briefs' },
    ],
    inputs: [
      { schema: 'competitor_sources', description: 'List of competitor URLs, ads libraries, newsletters, releases' },
    ],
    outputs: [
      { schema: 'competitive_brief', description: 'Weekly brief: what changed, why it matters, suggested responses' },
    ],
    constraints: ['const_audit_log', 'const_quality_threshold'],
    resiliencePatterns: ['chain-of-verification-v1'],
    linearLabels: ['ai:summarize', 'human:review', 'artifact:competitive-brief', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human review recommended to validate interpretation and avoid overclaiming.',
    },
    steps: [
      S('system_timer', 'Schedule weekly run', 'Run weekly for each client/market.'),
      S('task_retrieve', 'Retrieve updates', 'Retrieve updates from the configured sources.'),
      S('task_extract', 'Extract changes', 'Extract key changes and categorize (product, pricing, messaging).'),
      S('task_synthesize', 'Synthesize implications', 'Summarize implications and opportunities with explicit uncertainty notes.'),
      S('human_review', 'Review brief', 'Human reviews and edits the brief.'),
      S('human_export', 'Publish brief', 'Export/share brief with stakeholders.'),
      S('system_log', 'Log run', 'Store sources and brief for traceability.'),
    ],
    testScenarios: [
      {
        name: 'Source unreachable',
        given: 'A competitor source is down or blocked.',
        when: 'Retrieval runs.',
        then: 'The brief notes missing sources and continues without failing the whole run.',
      },
    ],
  },
  {
    id: 'agency--client-call-prep',
    name: 'Client Call Prep (Data -> Agenda -> Follow-ups)',
    vertical: 'agency',
    priority: 10,
    description: 'Generate an agenda and talking points for client calls, then convert decisions into follow-up tasks.',
    whyValuable: 'Reduces prep time while improving meeting quality. Ensures decisions are captured and executed.',
    oversight: 'recommended',
    requiredIntegrations: [
      { kind: 'mcp', slug: 'schedule', label: 'Schedule', required: false, purpose: 'Find upcoming meetings and attendees' },
      { kind: 'composio', slug: 'notion', label: 'Notion (PM)', required: false, purpose: 'Write agenda and follow-up tasks' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store agenda template and meeting memory' },
    ],
    inputs: [
      { schema: 'client_status', description: 'Current performance + open issues + upcoming deliverables' },
    ],
    outputs: [
      { schema: 'agenda', description: 'Call agenda with talking points and questions' },
      { schema: 'followups', description: 'Action items with owners and due dates' },
    ],
    constraints: ['const_privacy', 'const_audit_log'],
    resiliencePatterns: ['outbox-v1'],
    linearLabels: ['ai:summarize', 'human:review', 'artifact:agenda', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human review recommended; follow-up task creation can be automated with audit logging.',
    },
    steps: [
      S('system_timer', 'Detect upcoming call', 'Run 2-24 hours before scheduled client calls.'),
      S('system_api', 'Fetch context', 'Fetch recent metrics, open tasks, and prior notes.'),
      S('task_synthesize', 'Synthesize talking points', 'Summarize wins, risks, and open decisions to discuss.'),
      S('task_generate', 'Draft agenda', 'Draft agenda, questions, and recommended next actions.'),
      S('human_review', 'Review agenda', 'Human edits for tone and priorities.'),
      S('system_update_db', 'Create follow-ups', 'Create follow-up tasks for decisions and assignments.'),
      S('system_log', 'Log run', 'Store agenda and follow-ups in Substrate.'),
    ],
    testScenarios: [
      {
        name: 'Missing data sources',
        given: 'Analytics platform credentials are missing.',
        when: 'Context fetch runs.',
        then: 'The agenda is generated from available context and flags missing sources for remediation.',
      },
    ],
  },

  // ==========================================================================
  // Ops (SMB back-office)
  // ==========================================================================
  {
    id: 'ops--inbox-triage',
    name: 'Inbox Triage (Classify + Draft + Route)',
    vertical: 'ops',
    priority: 1,
    description: 'Classify incoming email, prioritize, draft responses, route to the right owner/system, and log outcomes.',
    whyValuable: 'Email triage is universal and time-consuming. Automation reduces switching costs and ensures fast response on high-priority items.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'composio', slug: 'gmail', label: 'Email (Gmail)', required: true, purpose: 'Read and draft/send emails; apply labels' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store routing rules, templates, and audit logs' },
    ],
    inputs: [
      { schema: 'email', description: 'Inbound email message + thread context' },
    ],
    outputs: [
      { schema: 'triage_decision', description: 'Category, priority, owner, and next action' },
      { schema: 'draft_reply', description: 'Draft reply (if applicable)' },
    ],
    constraints: ['const_privacy', 'const_audit_log', 'const_human_loop'],
    resiliencePatterns: ['chain-of-verification-v1', 'outbox-v1'],
    linearLabels: ['mcp:gmail-mcp', 'ai:classify', 'human:approve', 'artifact:email', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Require human approval for any external send. Auto-labeling and internal routing can be automatic with audit logs.',
    },
    steps: [
      S('system_api', 'Fetch new messages', 'Pull new inbound messages from inbox.'),
      S('task_classify', 'Classify + prioritize', 'Classify category (sales/support/billing/etc.) and rank priority.'),
      S('task_generate', 'Draft replies', 'Draft replies or request-for-info messages using templates.'),
      S('human_review', 'Approve send', 'Human approves/edits outbound replies.'),
      S('system_api', 'Send + label', 'Send approved messages and apply labels/triage status.'),
      S('system_update_db', 'Record decision', 'Record triage decision and links in Substrate.'),
      S('system_log', 'Log run', 'Write audit log for traceability.'),
    ],
    testScenarios: [
      {
        name: 'Ambiguous request',
        given: 'An email lacks sufficient details to respond.',
        when: 'Drafting runs.',
        then: 'The draft asks for missing info and is routed for human approval.',
      },
    ],
  },
  {
    id: 'ops--meeting-notes-actions',
    name: 'Meeting Notes + Action Items (Transcript -> Tasks)',
    vertical: 'ops',
    priority: 2,
    description: 'Summarize meeting transcripts, extract decisions and action items, assign owners, and publish to the team knowledge base.',
    whyValuable: 'Eliminates manual note-taking and improves accountability by converting talk into tracked work.',
    oversight: 'recommended',
    requiredIntegrations: [
      { kind: 'mcp', slug: 'zoom-sync', label: 'Zoom (optional)', required: false, purpose: 'Fetch recordings/transcripts' },
      { kind: 'composio', slug: 'notion', label: 'Notion (docs/tasks)', required: false, purpose: 'Publish notes and create tasks' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store notes and action item history' },
    ],
    inputs: [
      { schema: 'transcript', description: 'Meeting transcript and attendee list' },
    ],
    outputs: [
      { schema: 'meeting_summary', description: 'Summary, decisions, risks, and open questions' },
      { schema: 'action_items', description: 'Tasks with owner and due date suggestions' },
    ],
    constraints: ['const_privacy', 'const_audit_log'],
    resiliencePatterns: ['outbox-v1'],
    linearLabels: ['ai:summarize', 'human:review', 'artifact:meeting-notes', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human review recommended for sensitive meetings. Task creation can be automated but should be logged.',
    },
    steps: [
      S('system_api', 'Fetch transcript', 'Fetch transcript/recording and attendee list.'),
      S('task_synthesize', 'Summarize meeting', 'Summarize key points, decisions, and unresolved issues.'),
      S('task_extract', 'Extract actions', 'Extract action items and propose owners/dates.'),
      S('human_review', 'Review notes', 'Human reviews summary and action items.'),
      S('system_update_db', 'Publish + create tasks', 'Publish notes and create tasks in the chosen system.'),
      S('system_notification', 'Notify owners', 'Notify owners of assigned action items.'),
      S('system_log', 'Log run', 'Store notes, tasks, and links.'),
    ],
    testScenarios: [
      {
        name: 'No decisions made',
        given: 'Meeting is exploratory with no explicit decisions.',
        when: 'Extraction runs.',
        then: 'The output contains questions and next steps, not fabricated decisions.',
      },
    ],
  },
  {
    id: 'ops--crm-auto-update',
    name: 'CRM Auto-Update (Interactions -> Structured Records)',
    vertical: 'ops',
    priority: 3,
    description: 'Extract structured fields from interactions (email/calls) and update CRM records with summaries and next steps.',
    whyValuable: 'CRM hygiene is hard. Automation keeps records current without sales/admin overhead.',
    oversight: 'recommended',
    requiredIntegrations: [
      { kind: 'composio', slug: 'hubspot', label: 'CRM (HubSpot)', required: false, purpose: 'Update contacts/deals and write meeting notes' },
      { kind: 'composio', slug: 'gmail', label: 'Email (Gmail)', required: false, purpose: 'Read interaction context' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store extraction templates and audit logs' },
    ],
    inputs: [
      { schema: 'interaction', description: 'Email thread or call notes/transcript' },
    ],
    outputs: [
      { schema: 'crm_update', description: 'Structured update: summary, stage, next steps, follow-up date' },
    ],
    constraints: ['const_privacy', 'const_audit_log', 'const_quality_threshold'],
    resiliencePatterns: ['outbox-v1', 'chain-of-verification-v1'],
    linearLabels: ['ai:extract', 'human:review', 'artifact:crm-update', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human review recommended when changing deal stage or amounts; routine note updates can be automatic with audit logs.',
    },
    steps: [
      S('system_api', 'Fetch interaction', 'Fetch recent interactions from email/CRM sources.'),
      S('task_extract', 'Extract structured fields', 'Extract participants, intent, commitments, next steps, and dates.'),
      S('task_verify', 'Sanity check', 'Verify extracted fields are supported by text evidence.'),
      S('human_review', 'Optional review', 'Human reviews changes when impacting deal stage/amount.'),
      S('system_update_db', 'Update CRM', 'Write updates back to CRM with links to the evidence.'),
      S('system_log', 'Log run', 'Store an audit record of changes.'),
    ],
    testScenarios: [
      {
        name: 'Hallucinated commitment',
        given: 'Conversation is vague about next steps.',
        when: 'Extraction runs.',
        then: 'The playbook outputs “unknown/needs confirmation” rather than inventing commitments.',
      },
    ],
  },
  {
    id: 'ops--ap-invoice-processing',
    name: 'AP Invoice Processing (Extract + Match + Approve)',
    vertical: 'ops',
    priority: 4,
    description: 'Extract invoice details, validate against PO/contract rules, route approvals, and create the payable record.',
    whyValuable: 'AP processing is repetitive and error-prone. Automation reduces cycle time and improves financial control.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'composio', slug: 'gmail', label: 'Email (Gmail)', required: false, purpose: 'Receive invoices via email and route approvals' },
      { kind: 'composio', slug: 'quickbooks', label: 'Accounting (QuickBooks)', required: false, purpose: 'Create bills and track payments' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store vendor rules, approval thresholds, and audit logs' },
    ],
    inputs: [
      { schema: 'invoice', description: 'Invoice PDF and vendor metadata' },
      { schema: 'po_rules', description: 'Approval thresholds and match rules' },
    ],
    outputs: [
      { schema: 'bill', description: 'Validated bill record with match status and approver trail' },
    ],
    constraints: ['const_privacy', 'const_audit_log', 'const_authorization', 'const_human_loop'],
    resiliencePatterns: ['outbox-v1', 'chain-of-verification-v1', 'circuit-breaker-v1'],
    linearLabels: ['ai:extract', 'human:approve', 'artifact:invoice', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human approval required for any payment/bill creation above threshold or unmatched invoices. Always keep audit logs.',
    },
    steps: [
      S('system_api', 'Fetch invoices', 'Fetch invoice emails/attachments and vendor metadata.'),
      S('task_extract', 'Extract invoice fields', 'Extract vendor, invoice number, dates, line items, totals, and terms.'),
      S('task_verify', 'Match rules', 'Verify against PO/contract rules and flag discrepancies.'),
      S('human_review', 'Approve exceptions', 'Human approves exceptions and confirms payment readiness.'),
      S('system_update_db', 'Create bill', 'Create bill in accounting system and store reference in Substrate.'),
      S('system_notification', 'Notify stakeholders', 'Notify approver/requester and set reminders if needed.'),
      S('system_log', 'Log run', 'Store extraction + match results for audit.'),
    ],
    testScenarios: [
      {
        name: 'Unmatched invoice',
        given: 'Invoice does not match a PO or contract rule.',
        when: 'Matching runs.',
        then: 'The playbook routes to human approval and does not create a bill automatically.',
      },
    ],
  },
  {
    id: 'ops--ar-collections-reminders',
    name: 'AR Collections (Rank + Draft + Track)',
    vertical: 'ops',
    priority: 5,
    description: 'Identify overdue invoices, rank by risk, draft reminder sequences, and track outcomes with escalation.',
    whyValuable: 'Improves cash flow and reduces time spent chasing payments. Automation standardizes follow-ups.',
    oversight: 'recommended',
    requiredIntegrations: [
      { kind: 'composio', slug: 'quickbooks', label: 'Accounting (QuickBooks)', required: false, purpose: 'Pull open invoices and payment status' },
      { kind: 'composio', slug: 'gmail', label: 'Email (Gmail)', required: false, purpose: 'Send reminders and log communications' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store collections playbook, cadences, and outcomes' },
    ],
    inputs: [
      { schema: 'open_invoices', description: 'Invoice list with due dates and customer info' },
    ],
    outputs: [
      { schema: 'collections_plan', description: 'Ranked invoices with reminder drafts and cadence' },
    ],
    constraints: ['const_privacy', 'const_audit_log', 'const_quality_threshold'],
    resiliencePatterns: ['outbox-v1', 'circuit-breaker-v1'],
    linearLabels: ['ai:rank', 'human:review', 'artifact:collections', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human review recommended for high-value customers; routine reminders can be automated with audit logs.',
    },
    steps: [
      S('system_timer', 'Schedule weekly run', 'Run weekly (or daily for high-volume AR).'),
      S('system_api', 'Fetch open invoices', 'Fetch open/overdue invoices and customer contact info.'),
      S('task_rank', 'Rank by risk', 'Rank invoices by amount, age, customer risk, and strategic importance.'),
      S('task_generate', 'Draft reminders', 'Draft reminder emails with clear next steps and payment links.'),
      S('human_review', 'Optional review', 'Human reviews for tone and customer relationship sensitivity.'),
      S('system_notification', 'Send + track', 'Send messages and track outcomes in Substrate.'),
      S('system_log', 'Log run', 'Record reminders sent and next follow-up date.'),
    ],
    testScenarios: [
      {
        name: 'Customer dispute',
        given: 'Invoice is flagged as disputed.',
        when: 'Reminder drafting runs.',
        then: 'The playbook routes to human and suggests a dispute-resolution message instead of a generic reminder.',
      },
    ],
  },
  {
    id: 'ops--support-ticket-autoresolve',
    name: 'Support Ticket Automation (Classify + Suggest + Escalate)',
    vertical: 'ops',
    priority: 6,
    description: 'Classify tickets, retrieve relevant knowledge, draft responses, auto-resolve common cases, and escalate complex issues.',
    whyValuable: 'Support volume grows faster than headcount. Automation deflects common requests and speeds resolution.',
    oversight: 'recommended',
    requiredIntegrations: [
      { kind: 'composio', slug: 'zendesk', label: 'Support (Zendesk)', required: false, purpose: 'Fetch/update tickets and post replies' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store KB articles, macros, and escalation rules' },
    ],
    inputs: [
      { schema: 'support_ticket', description: 'Ticket content and customer context' },
    ],
    outputs: [
      { schema: 'support_reply', description: 'Draft reply with referenced KB and next steps' },
      { schema: 'escalation', description: 'Escalation summary for human agent (if needed)' },
    ],
    constraints: ['const_privacy', 'const_audit_log', 'const_quality_threshold'],
    resiliencePatterns: ['chain-of-verification-v1', 'outbox-v1'],
    linearLabels: ['ai:classify', 'human:review', 'artifact:support-ticket', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Auto-resolve only for low-risk categories; keep an escalation gate and audit log for all responses.',
    },
    steps: [
      S('system_api', 'Fetch tickets', 'Fetch new/updated tickets from support system.'),
      S('task_classify', 'Classify intent', 'Classify ticket intent and risk level.'),
      S('task_retrieve', 'Retrieve KB', 'Retrieve relevant KB/macros and prior similar resolutions.'),
      S('task_generate', 'Draft response', 'Draft response with clear steps and referenced policy.'),
      S('human_review', 'Review if needed', 'Human reviews high-risk or ambiguous cases.'),
      S('system_api', 'Post reply/resolve', 'Post reply and update status; escalate if required.'),
      S('system_log', 'Log run', 'Store resolution and references.'),
    ],
    testScenarios: [
      {
        name: 'High-risk request',
        given: 'Ticket requests account deletion or sensitive data access.',
        when: 'Classification runs.',
        then: 'The playbook escalates to human and does not auto-reply with sensitive actions.',
      },
    ],
  },
  {
    id: 'ops--knowledge-base-maintenance',
    name: 'Knowledge Base Maintenance (Cluster -> Update -> Publish)',
    vertical: 'ops',
    priority: 7,
    description: 'Detect recurring questions, cluster themes, draft KB updates, and publish with review gates.',
    whyValuable: 'Good knowledge bases reduce support load and onboarding time. Automation keeps docs current as reality changes.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'composio', slug: 'notion', label: 'Notion (KB)', required: false, purpose: 'Publish KB updates' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store KB sources and change log' },
    ],
    inputs: [
      { schema: 'support_history', description: 'Recent tickets/questions and resolutions' },
    ],
    outputs: [
      { schema: 'kb_update', description: 'Draft KB article updates and new entries' },
    ],
    constraints: ['const_privacy', 'const_audit_log', 'const_human_loop'],
    resiliencePatterns: ['chain-of-verification-v1'],
    linearLabels: ['ai:cluster', 'human:approve', 'artifact:kb', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human approval required before publishing documentation changes that affect customers or policy.',
    },
    steps: [
      S('system_timer', 'Schedule weekly run', 'Run weekly to keep KB fresh.'),
      S('system_read_db', 'Load recent issues', 'Load recent tickets/questions and resolution notes.'),
      S('task_cluster', 'Cluster themes', 'Cluster recurring themes and identify gaps in documentation.'),
      S('task_generate', 'Draft KB updates', 'Draft new/updated KB entries with clear steps and links.'),
      S('human_review', 'Approve publish', 'Human reviews for correctness and policy alignment.'),
      S('system_update_db', 'Publish', 'Publish updates and record change log.'),
      S('system_log', 'Log run', 'Store published links and diffs for traceability.'),
    ],
    testScenarios: [
      {
        name: 'Outdated procedure detected',
        given: 'Ticket resolutions conflict with an existing KB article.',
        when: 'Draft updates runs.',
        then: 'The playbook flags the mismatch and proposes a specific edit with rationale.',
      },
    ],
  },
  {
    id: 'ops--employee-onboarding',
    name: 'Employee Onboarding (Accounts + Checklist + Welcome)',
    vertical: 'ops',
    priority: 8,
    description: 'Create onboarding checklist, provision accounts, draft welcome comms, and track completion.',
    whyValuable: 'Onboarding is cross-system and error-prone. Automation reduces delays and ensures consistent access control.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'composio', slug: 'google_workspace', label: 'Google Workspace', required: false, purpose: 'Create user accounts and groups' },
      { kind: 'composio', slug: 'slack', label: 'Slack', required: false, purpose: 'Invite to channels and set roles' },
      { kind: 'composio', slug: 'notion', label: 'Notion', required: false, purpose: 'Create onboarding page and tasks' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store role templates and audit logs' },
    ],
    inputs: [
      { schema: 'new_hire', description: 'Name, role, start date, manager, access needs' },
    ],
    outputs: [
      { schema: 'onboarding_checklist', description: 'Checklist + provisioned accounts + welcome email' },
    ],
    constraints: ['const_authorization', 'const_audit_log', 'const_human_loop'],
    resiliencePatterns: ['saga-v1', 'outbox-v1'],
    linearLabels: ['system:orchestrate', 'human:approve', 'artifact:onboarding', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Human approval required for permission grants. Use least privilege defaults and log all access provisioning.',
    },
    steps: [
      S('human_type_input', 'Provide new hire info', 'User provides new hire details and access needs.'),
      S('task_plan', 'Plan onboarding checklist', 'Generate checklist by role template and required systems.'),
      S('system_api', 'Provision accounts', 'Create accounts/invites and assign groups according to least privilege.'),
      S('task_generate', 'Draft welcome comms', 'Draft welcome email and first-day agenda.'),
      S('human_review', 'Approve access', 'Human approves permissions and comms.'),
      S('system_update_db', 'Publish checklist', 'Publish onboarding checklist and tracking record.'),
      S('system_log', 'Log run', 'Store audit log of created accounts and permissions.'),
    ],
    testScenarios: [
      {
        name: 'High-privilege role',
        given: 'Role requires admin privileges.',
        when: 'Provisioning runs.',
        then: 'The playbook enforces explicit human approval and logs permission grants.',
      },
    ],
  },
  {
    id: 'ops--expense-reimbursements',
    name: 'Expense Reimbursements (Extract + Policy Check + Route)',
    vertical: 'ops',
    priority: 9,
    description: 'Extract receipt details, check policy compliance, route approvals, and file reimbursement records.',
    whyValuable: 'Reduces admin overhead and speeds reimbursements while keeping policy compliance auditable.',
    oversight: 'recommended',
    requiredIntegrations: [
      { kind: 'composio', slug: 'quickbooks', label: 'Accounting', required: false, purpose: 'Create expense records and reimbursements' },
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store policy rules and audit logs' },
    ],
    inputs: [
      { schema: 'receipt', description: 'Receipt image/PDF and submitter context' },
    ],
    outputs: [
      { schema: 'expense_record', description: 'Categorized expense with policy compliance status' },
    ],
    constraints: ['const_privacy', 'const_audit_log', 'const_quality_threshold'],
    resiliencePatterns: ['chain-of-verification-v1', 'outbox-v1'],
    linearLabels: ['ai:extract', 'human:review', 'artifact:expense', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'standard',
      notes: 'Auto-approve only low-risk, policy-compliant expenses; route exceptions to human approval.',
    },
    steps: [
      S('system_api', 'Fetch receipts', 'Fetch receipts from email/upload sources.'),
      S('task_extract', 'Extract receipt fields', 'Extract merchant, date, amount, category hints, and tax.'),
      S('task_verify', 'Policy check', 'Check against policy thresholds and required fields.'),
      S('human_review', 'Approve exceptions', 'Human approves exceptions or missing data.'),
      S('system_update_db', 'Create expense record', 'Create expense record and link evidence.'),
      S('system_log', 'Log run', 'Store audit record for compliance.'),
    ],
    testScenarios: [
      {
        name: 'Missing receipt details',
        given: 'Receipt image is unreadable.',
        when: 'Extraction runs.',
        then: 'The playbook requests a clearer receipt and does not create an expense record.',
      },
    ],
  },
  {
    id: 'ops--compliance-monitoring',
    name: 'Compliance Monitoring (Rules + Alerts + Audit)',
    vertical: 'ops',
    priority: 10,
    description: 'Run periodic checks against key signals, detect anomalies, and produce auditable alerts and summaries.',
    whyValuable: 'Reduces compliance risk by catching issues early and maintaining an audit trail for decisions.',
    oversight: 'required',
    requiredIntegrations: [
      { kind: 'mcp', slug: 'substrate', label: 'Substrate', required: true, purpose: 'Store rules, results, and audit logs' },
    ],
    inputs: [
      { schema: 'policy_rules', description: 'Rules/checks to run (thresholds, required fields, anomalies)' },
    ],
    outputs: [
      { schema: 'compliance_report', description: 'Report of checks run, findings, and escalations' },
      { schema: 'alerts', description: 'Alerts with evidence links and recommended actions' },
    ],
    constraints: ['const_audit_log', 'const_human_loop', 'const_quality_threshold'],
    resiliencePatterns: ['chain-of-verification-v1', 'circuit-breaker-v1'],
    linearLabels: ['ai:verify', 'human:approve', 'artifact:compliance-report', 'constraint:cost'],
    judgment: {
      recommendedPolicy: 'safe',
      notes: 'Run in read-only posture when possible. Escalations require human approval and should include evidence.',
    },
    steps: [
      S('system_timer', 'Schedule checks', 'Run checks on a defined cadence.'),
      S('system_read_db', 'Load rules', 'Load compliance rules and prior baseline results.'),
      S('task_monitor', 'Detect anomalies', 'Detect anomalies and out-of-policy conditions.'),
      S('task_verify', 'Verify evidence', 'Verify findings have sufficient evidence and links.'),
      S('task_generate', 'Draft report', 'Generate a compliance report and alert payloads.'),
      S('human_review', 'Approve alerts', 'Human approves escalations and assigns owners.'),
      S('system_notification', 'Send alerts', 'Send approved alerts and record them for audit.'),
      S('system_log', 'Log run', 'Persist run results and approvals.'),
    ],
    testScenarios: [
      {
        name: 'False alarm',
        given: 'A rule triggers due to a known exception.',
        when: 'Human review occurs.',
        then: 'The exception is documented and the rule is updated with a recorded decision.',
      },
    ],
  },
];

export const OUTCOME_PLAYBOOK_IDS = OUTCOME_PLAYBOOKS.map((p) => p.id);

export function getOutcomePlaybookById(id: string): OutcomePlaybook | undefined {
  return OUTCOME_PLAYBOOKS.find((p) => p.id === id);
}
