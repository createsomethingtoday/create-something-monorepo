-- Sanitized workflow context records for the Webflow Governed Workflow Console.
-- Private source data, credentials, and raw system records stay outside this table.

CREATE TABLE IF NOT EXISTS canon_workflow_contexts (
  context_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  workflow_json TEXT NOT NULL CHECK (json_valid(workflow_json)),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'internal')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_canon_workflow_contexts_visibility_updated
  ON canon_workflow_contexts(visibility, updated_at DESC);

INSERT INTO canon_workflow_contexts (
  context_id,
  title,
  summary,
  workflow_json,
  visibility
) VALUES (
  'create-something-governed-workflow-console',
  'CREATE SOMETHING Governed Workflow Console',
  'A Webflow operator console backed by Cloudflare workflow state, preview-only actions, evidence, decisions, approval state, and client-safe artifacts.',
  '{
    "runtime": {
      "label": "Canon Runtime",
      "status": "ok",
      "environment": "Webflow + Cloudflare + D1",
      "lastChecked": "Database-backed context ready",
      "checks": [
        {"label": "Cloudflare route", "status": "ok", "detail": "Workflow context, action preview, and agent routes are available."},
        {"label": "D1 workflow state", "status": "ok", "detail": "Sanitized console state is loaded by context ID."},
        {"label": "Action execution", "status": "idle", "detail": "Preview-only in v1; no external mutation is executed."},
        {"label": "Policy boundary", "status": "ok", "detail": "Human approval remains required for mutations."}
      ]
    },
    "layers": [
      {
        "tier": "Database",
        "title": "Operational Memory",
        "status": "D1-backed",
        "description": "The console reads a sanitized workflow context record from Cloudflare D1 while private source records stay outside the public surface.",
        "evidence": ["Workflow context row", "Evidence IDs", "Review state"],
        "tone": "info"
      },
      {
        "tier": "Automation",
        "title": "Callable Runtime",
        "status": "Cloudflare-ready",
        "description": "Cloudflare routes return workflow state, bounded agent answers, and governed action previews before any external tool is allowed to mutate data.",
        "evidence": ["Workflow context API", "Action preview API", "Agent API"],
        "tone": "success"
      },
      {
        "tier": "Judgment",
        "title": "Approval Boundary",
        "status": "Human-gated",
        "description": "Policy checks, evidence labels, and named operator decisions determine whether a recommendation can become an executed action.",
        "evidence": ["Approval owner", "Decision queue", "Policy guardrails"],
        "tone": "warning"
      }
    ],
    "actions": [
      {
        "id": "draft-operator-brief",
        "label": "Draft operator brief",
        "description": "Prepare a client-safe workflow brief from approved evidence and decisions.",
        "summary": "This action can prepare a client-safe operator brief from approved workflow evidence, open decisions, and governance language.",
        "status": "allowed",
        "risk": "low",
        "policyChecks": [
          "Uses approved public or internal-safe evidence only.",
          "Does not include private source records, credentials, or token-bearing URLs.",
          "Produces a draft for operator review before publishing or forwarding."
        ],
        "evidence": ["Workflow map", "Evidence trail", "Decision queue"],
        "allowedNextActions": ["Draft brief", "Ask for operator review", "Attach evidence labels"]
      },
      {
        "id": "request-approval",
        "label": "Request approval",
        "description": "Prepare an approval request that lists the action, owner, and policy checks.",
        "summary": "This action can prepare an approval request that names the action, required approver, policy checks, and remaining blockers.",
        "status": "requires_approval",
        "risk": "medium",
        "policyChecks": [
          "Requires a named approval owner.",
          "Records the approval state before any external action.",
          "Keeps execution disabled until a human explicitly approves."
        ],
        "evidence": ["Approval boundary", "Policy rules", "Runtime status"],
        "allowedNextActions": ["Prepare approval request", "Keep action in review", "Record approval owner"]
      },
      {
        "id": "execute-external-action",
        "label": "Execute external action",
        "description": "Blocked in v1 because this console only previews governed actions.",
        "summary": "This action is blocked in the Governed Workflow Console v1. The route demonstrates the approval boundary without executing external writes.",
        "status": "blocked",
        "risk": "high",
        "policyChecks": [
          "External mutation is disabled in v1.",
          "Production connector execution is not configured on this preview route.",
          "Human approval and a dedicated integration contract are required first."
        ],
        "evidence": ["Governance rule", "Approval boundary"],
        "allowedNextActions": ["Review policy checks", "Define connector contract", "Assign approval owner"]
      }
    ],
    "approval": {
      "title": "Human Approval Gate",
      "description": "The system can prepare the action, but a named operator approves it before execution.",
      "approvalState": "review",
      "requiredApprover": "Named operator",
      "primaryActionLabel": "Mark approved",
      "secondaryActionLabel": "Keep in review"
    },
    "evidence": [
      {
        "id": "workflow-map",
        "label": "Workflow map",
        "detail": "Current workflow, owner, and decision states are captured before automation.",
        "source": "D1 workflow context",
        "tone": "info"
      },
      {
        "id": "action-contract",
        "label": "Action contract",
        "detail": "Every action has a preview, policy checks, allowed next actions, and a human approval state.",
        "source": "Cloudflare route",
        "tone": "success"
      },
      {
        "id": "private-boundary",
        "label": "Private boundary",
        "detail": "Source data, credentials, and raw client records stay outside the public surface.",
        "source": "Governance rule",
        "tone": "warning"
      }
    ],
    "decisions": [
      {
        "id": "confirm-authoritative-data",
        "title": "Confirm authoritative data",
        "description": "Name the source of truth before automation reads or writes records.",
        "owner": "Operator",
        "state": "open",
        "tier": "Database"
      },
      {
        "id": "approve-action-boundary",
        "title": "Approve action boundary",
        "description": "Decide which actions can be drafted and which require manual approval.",
        "owner": "Delivery lead",
        "state": "review",
        "tier": "Judgment"
      },
      {
        "id": "enable-runtime-smoke",
        "title": "Enable runtime smoke",
        "description": "Verify the Cloudflare endpoint and fallback behavior before publishing.",
        "owner": "Engineer",
        "state": "ready",
        "tier": "Automation"
      }
    ],
    "artifacts": [
      {
        "title": "Operator Brief",
        "type": "Review Packet",
        "description": "A concise handoff that explains the workflow, risks, and next decision.",
        "visibility": "public",
        "tone": "info"
      },
      {
        "title": "Policy Rules",
        "type": "Governance",
        "description": "Rules that decide when an action can be drafted, previewed, approved, or blocked.",
        "visibility": "internal",
        "tone": "warning"
      },
      {
        "title": "Runtime Contract",
        "type": "Cloudflare API",
        "description": "Endpoint shape for workflow context, bounded agent answers, and action previews.",
        "visibility": "public",
        "tone": "success"
      }
    ],
    "agent": {
      "title": "Ask the Control Layer",
      "placeholder": "Ask what is approved, private, or ready to preview...",
      "suggestedPrompts": [
        {"label": "Explain the workflow", "prompt": "Explain how the database, automation, and judgment layers work together."},
        {"label": "What needs approval?", "prompt": "What decision needs approval before this action can run?"},
        {"label": "What is private?", "prompt": "What should stay out of the public surface?"}
      ],
      "initialMessages": [
        {
          "role": "agent",
          "body": "I can answer from the approved workflow context and keep private source material out of the response.",
          "grounding": ["D1 workflow context", "Governance rule"]
        }
      ]
    },
    "guardrails": [
      "Answers use the sanitized CREATE SOMETHING workflow context only.",
      "This endpoint does not expose client secrets, credentials, raw source records, private workspace URLs, or token-bearing endpoints.",
      "V1 action routes return previews and policy checks only; they do not execute external mutations."
    ]
  }',
  'public'
)
ON CONFLICT(context_id) DO UPDATE SET
  title = excluded.title,
  summary = excluded.summary,
  workflow_json = excluded.workflow_json,
  visibility = excluded.visibility,
  updated_at = datetime('now');
