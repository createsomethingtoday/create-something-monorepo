-- Business-management state for the Webflow Governed Workflow Console.
-- These rows store sanitized operator state only. Private records and secrets stay outside the public console.

CREATE TABLE IF NOT EXISTS canon_workflow_approvals (
  approval_id TEXT PRIMARY KEY,
  context_id TEXT NOT NULL,
  action_id TEXT,
  title TEXT NOT NULL,
  requester TEXT,
  required_approver TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'review' CHECK (status IN ('review', 'approved', 'blocked')),
  risk TEXT CHECK (risk IN ('low', 'medium', 'high')),
  due_at TEXT,
  evidence_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_json)),
  policy_checks_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(policy_checks_json)),
  updated_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_canon_workflow_approvals_context_status
  ON canon_workflow_approvals(context_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS canon_workflow_activity (
  event_id TEXT PRIMARY KEY,
  context_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('context', 'approval', 'preview', 'agent', 'deploy', 'evidence', 'decision')),
  label TEXT NOT NULL,
  detail TEXT,
  actor TEXT,
  tone TEXT CHECK (tone IN ('neutral', 'info', 'success', 'warning', 'danger')),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_canon_workflow_activity_context_created
  ON canon_workflow_activity(context_id, created_at DESC);

INSERT INTO canon_workflow_approvals (
  approval_id,
  context_id,
  action_id,
  title,
  requester,
  required_approver,
  status,
  risk,
  due_at,
  evidence_json,
  policy_checks_json,
  updated_by
) VALUES
  (
    'approval-action-boundary',
    'create-something-governed-workflow-console',
    'request-approval',
    'Approve action boundary',
    'Delivery system',
    'Named operator',
    'review',
    'medium',
    'Before connector execution',
    '["Approval boundary","Policy rules"]',
    '["Named approver required","No external mutation before approval"]',
    'Seed migration'
  ),
  (
    'approval-external-execution',
    'create-something-governed-workflow-console',
    'execute-external-action',
    'External execution contract',
    'Runtime system',
    'Senior operator',
    'blocked',
    'high',
    'After production connector contract',
    '["Runtime contract","Governance rule"]',
    '["Production connector contract required","Rollback note required"]',
    'Seed migration'
  )
ON CONFLICT(approval_id) DO UPDATE SET
  context_id = excluded.context_id,
  action_id = excluded.action_id,
  title = excluded.title,
  requester = excluded.requester,
  required_approver = excluded.required_approver,
  status = excluded.status,
  risk = excluded.risk,
  due_at = excluded.due_at,
  evidence_json = excluded.evidence_json,
  policy_checks_json = excluded.policy_checks_json,
  updated_by = excluded.updated_by,
  updated_at = datetime('now');

INSERT INTO canon_workflow_activity (
  event_id,
  context_id,
  event_type,
  label,
  detail,
  actor,
  tone,
  metadata_json
) VALUES
  (
    'event-context-ready',
    'create-something-governed-workflow-console',
    'context',
    'Workflow context ready',
    'The console can render from sanitized workflow state.',
    'Cloudflare',
    'success',
    '{"surface":"workflow-context"}'
  ),
  (
    'event-policy-boundary',
    'create-something-governed-workflow-console',
    'approval',
    'Approval boundary active',
    'External mutations require named approval and an execution contract.',
    'Policy',
    'warning',
    '{"surface":"approval-queue"}'
  )
ON CONFLICT(event_id) DO UPDATE SET
  context_id = excluded.context_id,
  event_type = excluded.event_type,
  label = excluded.label,
  detail = excluded.detail,
  actor = excluded.actor,
  tone = excluded.tone,
  metadata_json = excluded.metadata_json;

UPDATE canon_workflow_contexts
SET
  workflow_json = json_set(
    workflow_json,
    '$.businessContexts',
    json('[
      {
        "id": "cs-ops-core",
        "client": "CREATE SOMETHING",
        "project": "Governed Workflow Console",
        "workflow": "Webflow + Cloudflare delivery",
        "environment": "Production preview",
        "status": "active",
        "owner": "Operator",
        "detail": "Console state is scoped to the CREATE SOMETHING operating layer."
      },
      {
        "id": "client-delivery-model",
        "client": "CREATE SOMETHING",
        "project": "Client delivery operating model",
        "workflow": "Database / Automation / Judgment rollout",
        "environment": "Internal",
        "status": "review",
        "owner": "Delivery lead",
        "detail": "Reusable model for governed client workflow launches."
      }
    ]'),
    '$.activeBusinessContextId',
    'cs-ops-core',
    '$.metrics',
    json('[
      {"label":"Open decisions","value":"3","detail":"Operator review queue","tone":"warning"},
      {"label":"Pending approvals","value":"2","detail":"Named approver required","tone":"warning"},
      {"label":"Runtime posture","value":"Preview","detail":"No external mutation in v1","tone":"success"},
      {"label":"Private boundary","value":"Enforced","detail":"Secrets and raw records stay out of Webflow","tone":"success"}
    ]'),
    '$.sourceStatuses',
    json('[
      {"system":"Cloudflare D1","status":"ok","detail":"Sanitized workflow context and approval queue are available.","lastSynced":"Runtime read","owner":"Engineering","tier":"Database"},
      {"system":"Webflow Components","status":"ok","detail":"Reusable components hydrate from the workflow context.","lastSynced":"Library share","owner":"Design systems","tier":"Automation"},
      {"system":"Linear","status":"ok","detail":"Tracked work and deployment evidence are recorded outside the public surface.","lastSynced":"CRE-247","owner":"Operator","tier":"Database"},
      {"system":"Infisical","status":"idle","detail":"Secrets remain out of component props and public workflow context.","lastSynced":"Secret boundary","owner":"Engineering","tier":"Judgment"},
      {"system":"Approval Policy","status":"warning","detail":"External mutations require a named human approval path.","lastSynced":"Policy artifact","owner":"Operator","tier":"Judgment"}
    ]'),
    '$.approvalQueue',
    json('[
      {
        "id":"approval-action-boundary",
        "actionId":"request-approval",
        "title":"Approve action boundary",
        "requester":"Delivery system",
        "requiredApprover":"Named operator",
        "status":"review",
        "risk":"medium",
        "due":"Before connector execution",
        "evidence":["Approval boundary","Policy rules"],
        "policyChecks":["Named approver required","No external mutation before approval"]
      },
      {
        "id":"approval-external-execution",
        "actionId":"execute-external-action",
        "title":"External execution contract",
        "requester":"Runtime system",
        "requiredApprover":"Senior operator",
        "status":"blocked",
        "risk":"high",
        "due":"After production connector contract",
        "evidence":["Runtime contract","Governance rule"],
        "policyChecks":["Production connector contract required","Rollback note required"]
      }
    ]'),
    '$.executionQueue',
    json('[
      {"id":"execution-draft-brief","actionId":"draft-operator-brief","title":"Draft operator brief","status":"preview","owner":"Operator","system":"Cloudflare route","risk":"low","rollback":"Discard generated draft before publication.","lastUpdated":"Preview ready"},
      {"id":"execution-approval-request","actionId":"request-approval","title":"Prepare approval request","status":"queued","owner":"Delivery lead","system":"Cloudflare route","risk":"medium","rollback":"Keep action in review and cancel notification.","lastUpdated":"Waiting on approval owner"},
      {"id":"execution-external-action","actionId":"execute-external-action","title":"Execute external action","status":"blocked","owner":"Senior operator","system":"External connector","risk":"high","rollback":"Define rollback before enabling connector execution.","lastUpdated":"Blocked in v1"}
    ]'),
    '$.activityEvents',
    json('[
      {"id":"event-context-ready","eventType":"context","label":"Workflow context ready","detail":"The console can render from sanitized workflow state.","actor":"Cloudflare","timestamp":"Runtime read","tone":"success"},
      {"id":"event-policy-boundary","eventType":"approval","label":"Approval boundary active","detail":"External mutations require named approval and an execution contract.","actor":"Policy","timestamp":"Policy artifact","tone":"warning"}
    ]')
  ),
  updated_at = datetime('now')
WHERE context_id = 'create-something-governed-workflow-console';
