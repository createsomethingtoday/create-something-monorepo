-- Expand the Governed Workflow Console from a generic workflow demo into
-- CREATE SOMETHING business-management state for MCPs, agents, workflows,
-- Dify, Composio, Cloudflare, Linear, Infisical, and Webflow.

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
    'Business-management migration'
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
    'Business-management migration'
  ),
  (
    'approval-mcp-fleet-posture',
    'create-something-governed-workflow-console',
    'review-mcp-fleet',
    'MCP fleet posture review',
    'Operations system',
    'Operator',
    'review',
    'medium',
    'Before promoting new tool access',
    '["MCP fleet registry","Dify coverage","Hub control plane"]',
    '["Classify direct vs brokered access","Confirm tenant boundary","Record owner before promotion"]',
    'Business-management migration'
  ),
  (
    'approval-agent-workflow-handoff',
    'create-something-governed-workflow-console',
    'prepare-agent-workflow-handoff',
    'Agent workflow handoff',
    'Agent runtime',
    'Delivery lead',
    'review',
    'medium',
    'Before client-facing use',
    '["Agent prompts","Workflow route","Decision queue"]',
    '["Use sanitized context only","Name operator owner","Keep private source material out of replies"]',
    'Business-management migration'
  ),
  (
    'approval-dify-composio-promotion',
    'create-something-governed-workflow-console',
    'promote-connector-action',
    'Dify and Composio promotion',
    'Connector system',
    'Senior operator',
    'blocked',
    'high',
    'After connector contract and rollback plan',
    '["Dify intake manifest","Composio connector boundary","Approval policy"]',
    '["No token-bearing endpoints in Webflow","Require rollback note","Require production connector contract"]',
    'Business-management migration'
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
  ),
  (
    'event-business-scope-expanded',
    'create-something-governed-workflow-console',
    'context',
    'Business-management scope expanded',
    'The console tracks MCPs, agents, workflows, Dify, Composio, Cloudflare, Linear, Infisical, and Webflow.',
    'Operator',
    'info',
    '{"surface":"business-management"}'
  ),
  (
    'event-mcp-fleet-visible',
    'create-something-governed-workflow-console',
    'evidence',
    'MCP fleet visible',
    'MCP posture is represented as source status, decisions, approvals, and execution queue state.',
    'Repository',
    'success',
    '{"surface":"mcp-fleet"}'
  ),
  (
    'event-connectors-held',
    'create-something-governed-workflow-console',
    'approval',
    'Connector writes held',
    'Dify and Composio connector promotion remains blocked until approval, contract, and rollback evidence exist.',
    'Policy',
    'warning',
    '{"surface":"connector-boundary"}'
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
  summary = 'A Webflow operator console backed by Cloudflare workflow state for MCPs, agents, workflows, Dify, Composio, approvals, evidence, and client-safe artifacts.',
  workflow_json = json_set(
    workflow_json,
    '$.runtime',
    json('{
      "label": "Canon Runtime",
      "status": "ok",
      "environment": "Webflow + Cloudflare + D1",
      "lastChecked": "Business-management context ready",
      "checks": [
        {"label": "Cloudflare routes", "status": "ok", "detail": "Workflow context, agent, approval, and action preview routes are available."},
        {"label": "D1 workflow state", "status": "ok", "detail": "Sanitized business-management context is loaded by context ID."},
        {"label": "MCP fleet", "status": "warning", "detail": "Fleet posture is visible; endpoint health remains governed by the registry and runbooks."},
        {"label": "Agents and workflows", "status": "ok", "detail": "Agent answers are bounded by approved context and guardrails."},
        {"label": "Dify intake", "status": "warning", "detail": "Dify candidates are tracked as intake and promotion state, not direct browser actions."},
        {"label": "Composio connectors", "status": "warning", "detail": "SaaS connector execution remains brokered and approval-gated."},
        {"label": "Action execution", "status": "idle", "detail": "Preview-only in v1; no external mutation is executed."},
        {"label": "Policy boundary", "status": "ok", "detail": "Human approval remains required for mutations."}
      ]
    }'),
    '$.layers',
    json('[
      {
        "tier": "Database",
        "title": "Operational Memory",
        "status": "D1-backed",
        "description": "Cloudflare D1 holds sanitized workflow context, approval queue state, activity events, and source-status summaries while private source records stay outside Webflow.",
        "evidence": ["Workflow context row", "Approval queue", "Activity events", "Source statuses"],
        "tone": "info"
      },
      {
        "tier": "Automation",
        "title": "MCP, Agent, and Connector Runtime",
        "status": "Cloudflare-ready",
        "description": "Cloudflare routes expose bounded reads, action previews, and agent answers for MCPs, workflows, Dify, and Composio without executing external mutations from the public console.",
        "evidence": ["MCP fleet registry", "Agent route", "Action preview API", "Connector intake"],
        "tone": "success"
      },
      {
        "tier": "Judgment",
        "title": "Approval Boundary",
        "status": "Human-gated",
        "description": "Policy checks, evidence labels, named approvers, and rollback notes determine whether any recommendation can move toward connector execution.",
        "evidence": ["Approval owner", "Decision queue", "Policy guardrails", "Rollback note"],
        "tone": "warning"
      }
    ]'),
    '$.actions',
    json('[
      {
        "id": "draft-operator-brief",
        "label": "Draft operator brief",
        "description": "Prepare a client-safe workflow brief from approved evidence and decisions.",
        "summary": "This action can prepare a client-safe operator brief from approved workflow evidence, open decisions, and governance language.",
        "status": "allowed",
        "risk": "low",
        "policyChecks": ["Uses approved public or internal-safe evidence only.","Does not include private source records, credentials, or token-bearing URLs.","Produces a draft for operator review before publishing or forwarding."],
        "evidence": ["Workflow map","Evidence trail","Decision queue"],
        "allowedNextActions": ["Draft brief","Ask for operator review","Attach evidence labels"]
      },
      {
        "id": "request-approval",
        "label": "Request approval",
        "description": "Prepare an approval request that lists the action, owner, and policy checks.",
        "summary": "This action can prepare an approval request that names the action, required approver, policy checks, and remaining blockers.",
        "status": "requires_approval",
        "risk": "medium",
        "policyChecks": ["Requires a named approval owner.","Records the approval state before any external action.","Keeps execution disabled until a human explicitly approves."],
        "evidence": ["Approval boundary","Policy rules","Runtime status"],
        "allowedNextActions": ["Prepare approval request","Keep action in review","Record approval owner"]
      },
      {
        "id": "execute-external-action",
        "label": "Execute external action",
        "description": "Blocked in v1 because this console only previews governed actions.",
        "summary": "This action is blocked in the Governed Workflow Console v1. The route demonstrates the approval boundary without executing external writes.",
        "status": "blocked",
        "risk": "high",
        "policyChecks": ["External mutation is disabled in v1.","Production connector execution is not configured on this preview route.","Human approval and a dedicated integration contract are required first."],
        "evidence": ["Governance rule","Approval boundary"],
        "allowedNextActions": ["Review policy checks","Define connector contract","Assign approval owner"]
      },
      {
        "id": "review-mcp-fleet",
        "label": "Review MCP fleet",
        "description": "Prepare an operator review of MCP endpoints, brokered access, Dify candidates, and ownership gaps.",
        "summary": "This action prepares an operator review of MCP endpoints, brokered access, Dify candidates, and ownership gaps without exposing credentials or private registry details.",
        "status": "requires_approval",
        "risk": "medium",
        "policyChecks": ["Classifies direct versus brokered MCP access.","Records owner and tenant boundary before promotion.","Keeps credentials, private source records, and token-bearing URLs out of Webflow."],
        "evidence": ["MCP fleet registry","Hub control plane","Dify coverage"],
        "allowedNextActions": ["Prepare fleet review","Record owner","Keep risky tool access in review"]
      },
      {
        "id": "prepare-agent-workflow-handoff",
        "label": "Prepare agent workflow handoff",
        "description": "Draft the operator handoff for agents, workflows, allowed questions, and approval boundaries.",
        "summary": "This action drafts the operator handoff for agents, workflows, allowed questions, and approval boundaries from approved context.",
        "status": "allowed",
        "risk": "medium",
        "policyChecks": ["Uses sanitized workflow context only.","Names the approval owner before client-facing use.","Keeps private source material out of agent answers."],
        "evidence": ["Agent prompts","Workflow route","Decision queue"],
        "allowedNextActions": ["Draft handoff","Ask for operator review","Attach decision evidence"]
      },
      {
        "id": "promote-connector-action",
        "label": "Promote connector action",
        "description": "Blocked until a Dify or Composio connector has a production contract, approval owner, and rollback note.",
        "summary": "This action is blocked until a Dify or Composio connector has a production contract, named approval owner, and rollback note.",
        "status": "blocked",
        "risk": "high",
        "policyChecks": ["Production connector contract required.","Rollback note required before execution.","No token-bearing endpoints or credentials may be placed in browser props."],
        "evidence": ["Dify intake manifest","Composio connector boundary","Approval policy"],
        "allowedNextActions": ["Define connector contract","Assign senior operator","Keep execution blocked"]
      }
    ]'),
    '$.evidence',
    json('[
      {"id":"workflow-map","label":"Workflow map","detail":"Current workflow, owner, and decision states are captured before automation.","source":"D1 workflow context","tone":"info"},
      {"id":"action-contract","label":"Action contract","detail":"Every action has a preview, policy checks, allowed next actions, and a human approval state.","source":"Cloudflare route","tone":"success"},
      {"id":"private-boundary","label":"Private boundary","detail":"Source data, credentials, and raw client records stay outside the public surface.","source":"Governance rule","tone":"warning"},
      {"id":"mcp-fleet-registry","label":"MCP fleet registry","detail":"The console tracks which MCPs are active, brokered, direct, or awaiting promotion.","source":"Repo registry","tone":"info"},
      {"id":"connector-boundary","label":"Connector boundary","detail":"Dify and Composio remain managed connector surfaces, not browser-exposed credentials or direct public writes.","source":"Integration policy","tone":"warning"}
    ]'),
    '$.decisions',
    json('[
      {"id":"confirm-authoritative-data","title":"Confirm authoritative data","description":"Name the source of truth before automation reads or writes records.","owner":"Operator","state":"open","tier":"Database"},
      {"id":"approve-action-boundary","title":"Approve action boundary","description":"Decide which actions can be drafted and which require manual approval.","owner":"Delivery lead","state":"review","tier":"Judgment"},
      {"id":"enable-runtime-smoke","title":"Enable runtime smoke","description":"Verify the Cloudflare endpoint and fallback behavior before publishing.","owner":"Engineer","state":"ready","tier":"Automation"},
      {"id":"review-mcp-fleet-posture","title":"Review MCP fleet posture","description":"Confirm which MCP servers are active, brokered, Dify-direct candidates, or parked.","owner":"Operator","state":"review","tier":"Automation"},
      {"id":"promote-connector-execution","title":"Promote connector execution","description":"Decide whether any Dify or Composio connector may move beyond preview-only behavior.","owner":"Senior operator","state":"blocked","tier":"Judgment"},
      {"id":"confirm-agent-workflow-ownership","title":"Confirm agent workflow ownership","description":"Name the operator responsible for agent answers, workflow handoff, and approval records.","owner":"Delivery lead","state":"open","tier":"Judgment"}
    ]'),
    '$.artifacts',
    json('[
      {"title":"Operator Brief","type":"Review Packet","description":"A concise handoff that explains the workflow, risks, and next decision.","visibility":"public","tone":"info"},
      {"title":"Policy Rules","type":"Governance","description":"Rules that decide when an action can be drafted, previewed, approved, or blocked.","visibility":"internal","tone":"warning"},
      {"title":"Runtime Contract","type":"Cloudflare API","description":"Endpoint shape for workflow context, bounded agent answers, approval updates, and action previews.","visibility":"public","tone":"success"},
      {"title":"MCP Fleet Registry","type":"Operations","description":"Inventory and posture for CREATE SOMETHING MCP endpoints, bundles, and brokered tool access.","visibility":"internal","tone":"info"},
      {"title":"Dify Intake Manifest","type":"Connector Intake","description":"Dify app and MCP intake state used to decide what is direct, brokered, or not yet production-ready.","visibility":"internal","tone":"warning"},
      {"title":"Composio Connector Boundary","type":"Connector Policy","description":"Rules for when Composio-backed SaaS actions stay brokered, require approval, or can move toward execution.","visibility":"internal","tone":"warning"}
    ]'),
    '$.agent',
    json('{
      "title": "Ask the Control Layer",
      "placeholder": "Ask about MCPs, agents, connectors, approvals, or Cloudflare state...",
      "suggestedPrompts": [
        {"label":"Explain the workflow","prompt":"Explain how the database, automation, and judgment layers work together."},
        {"label":"What needs approval?","prompt":"What decision needs approval before this action can run?"},
        {"label":"What is private?","prompt":"What should stay out of the public surface?"},
        {"label":"Which MCPs matter?","prompt":"Summarize the MCP fleet posture and what needs operator review."},
        {"label":"Connector readiness","prompt":"Explain the Dify and Composio boundary before any connector execution."},
        {"label":"Cloudflare state","prompt":"What does Cloudflare own in this console?"}
      ],
      "initialMessages": [
        {"role":"agent","body":"I can answer from the approved workflow context, including MCP, agent, workflow, Dify, Composio, and Cloudflare boundaries, while keeping private source material out of the response.","grounding":["D1 workflow context","Governance rule","Source statuses"]}
      ]
    }'),
    '$.businessContexts',
    json('[
      {"id":"cs-ops-core","client":"CREATE SOMETHING","project":"Governed Workflow Console","workflow":"Webflow + Cloudflare delivery","environment":"Production preview","status":"active","owner":"Operator","detail":"Console state is scoped to the CREATE SOMETHING operating layer."},
      {"id":"mcp-agent-operations","client":"CREATE SOMETHING","project":"MCP and agent operations","workflow":"MCP fleet + agent workflow review","environment":"Internal","status":"review","owner":"Engineering","detail":"Tracks active MCP surfaces, agent routes, workflow handoffs, and which actions stay approval-gated."},
      {"id":"connector-governance","client":"CREATE SOMETHING","project":"Dify and Composio connector governance","workflow":"Connector intake, brokerage, and approval","environment":"Internal","status":"review","owner":"Senior operator","detail":"Keeps Dify and Composio useful without letting connector credentials or write actions leak into Webflow."}
    ]'),
    '$.activeBusinessContextId',
    'cs-ops-core',
    '$.metrics',
    json('[
      {"label":"Business surfaces","value":"9","detail":"MCPs, agents, workflows, Dify, Composio, Cloudflare, Linear, Infisical, Webflow","tone":"info"},
      {"label":"Pending approvals","value":"5","detail":"Named approver required for promotion and execution","tone":"warning"},
      {"label":"Runtime posture","value":"Preview","detail":"No external mutation in v1","tone":"success"},
      {"label":"Connector posture","value":"Brokered","detail":"Dify and Composio stay behind policy boundaries","tone":"warning"},
      {"label":"Private boundary","value":"Enforced","detail":"Secrets and raw records stay out of Webflow","tone":"success"},
      {"label":"Evidence model","value":"Artifact-backed","detail":"Linear, docs, registry, and D1 context provide review evidence","tone":"success"}
    ]'),
    '$.sourceStatuses',
    json('[
      {"system":"Cloudflare Workers, Pages, and D1","status":"ok","detail":"The runtime owns workflow state, preview routes, approval persistence, and production deployment.","lastSynced":"Runtime read","owner":"Engineering","tier":"Database"},
      {"system":"MCP Hub and fleet registry","status":"warning","detail":"MCP inventory and brokered access are visible for operator review; execution remains policy-bound.","lastSynced":"Repo registry","owner":"Engineering","tier":"Automation"},
      {"system":"Agents and workflows","status":"ok","detail":"Agent answers and workflow previews are bounded by sanitized context and approval rules.","lastSynced":"Cloudflare route","owner":"Engineering","tier":"Automation"},
      {"system":"Dify","status":"warning","detail":"Dify MCP coverage is tracked as intake and promotion state before production use.","lastSynced":"Inventory artifact","owner":"Operator","tier":"Automation"},
      {"system":"Composio","status":"warning","detail":"Composio remains a brokered connector layer; no browser-exposed credentials or direct public writes.","lastSynced":"Connector policy","owner":"Engineering","tier":"Automation"},
      {"system":"Webflow Components","status":"ok","detail":"Reusable components hydrate from the workflow context.","lastSynced":"Library share","owner":"Design systems","tier":"Automation"},
      {"system":"Linear","status":"ok","detail":"Tracked work, ownership, deployment evidence, and follow-up decisions live outside the public page.","lastSynced":"Issue evidence","owner":"Operator","tier":"Database"},
      {"system":"Infisical","status":"idle","detail":"Secrets remain out of component props, D1 public context, and Webflow browser code.","lastSynced":"Secret boundary","owner":"Engineering","tier":"Judgment"},
      {"system":"Approval Policy","status":"warning","detail":"External mutations require a named human approval path.","lastSynced":"Policy artifact","owner":"Operator","tier":"Judgment"}
    ]'),
    '$.executionQueue',
    json('[
      {"id":"execution-draft-brief","actionId":"draft-operator-brief","title":"Draft operator brief","status":"preview","owner":"Operator","system":"Cloudflare route","risk":"low","rollback":"Discard generated draft before publication.","lastUpdated":"Preview ready"},
      {"id":"execution-approval-request","actionId":"request-approval","title":"Prepare approval request","status":"queued","owner":"Delivery lead","system":"Cloudflare route","risk":"medium","rollback":"Keep action in review and cancel notification.","lastUpdated":"Waiting on approval owner"},
      {"id":"execution-external-action","actionId":"execute-external-action","title":"Execute external action","status":"blocked","owner":"Senior operator","system":"External connector","risk":"high","rollback":"Define rollback before enabling connector execution.","lastUpdated":"Blocked in v1"},
      {"id":"execution-mcp-fleet-review","actionId":"review-mcp-fleet","title":"Review MCP fleet posture","status":"queued","owner":"Engineering","system":"MCP Hub","risk":"medium","rollback":"Keep new tool access disabled until review evidence is recorded.","lastUpdated":"Awaiting operator review"},
      {"id":"execution-agent-workflow-handoff","actionId":"prepare-agent-workflow-handoff","title":"Prepare agent workflow handoff","status":"preview","owner":"Delivery lead","system":"Agent route","risk":"medium","rollback":"Revert to static guidance and keep agent route bounded to read-only answers.","lastUpdated":"Preview ready"},
      {"id":"execution-connector-promotion","actionId":"promote-connector-action","title":"Promote Dify or Composio connector action","status":"blocked","owner":"Senior operator","system":"Dify / Composio","risk":"high","rollback":"Disable connector execution and leave only preview/intake state visible.","lastUpdated":"Blocked pending contract"}
    ]'),
    '$.guardrails',
    json('[
      "Answers use the sanitized CREATE SOMETHING business-management context only.",
      "This endpoint does not expose client secrets, credentials, raw source records, private workspace URLs, or token-bearing endpoints.",
      "V1 action routes return previews and policy checks only; they do not execute external mutations.",
      "MCP, Dify, and Composio promotion requires named operator approval, a connector contract, and rollback evidence."
    ]')
  ),
  updated_at = datetime('now')
WHERE context_id = 'create-something-governed-workflow-console';
