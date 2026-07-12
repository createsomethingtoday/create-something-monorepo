-- Delivery engagement context seed — generated, do not hand-edit.
-- Source of truth before seeding: packages/agency/src/lib/delivery/shivworks-context.ts
-- Regenerate: node scripts/generate-delivery-context-migration.mjs src/lib/delivery/shivworks-context.ts migrations/0026_shivworks_delivery_context.sql shivworksWorkflowContext
-- Once this row exists, D1 wins and content edits happen here, not in the TS fallback.
-- Client-safe content only: no secrets, tokens, raw records, or contact data.

INSERT INTO canon_workflow_contexts (
  context_id,
  title,
  summary,
  workflow_json,
  visibility
) VALUES (
  'shivworks-network-handoff',
  'ShivWorks Network access runbook',
  'This is the handoff artifact for the PM to forward to the technical owner or developer. Access can be granted now to any named ShivWorks recipient who needs to take ownership of the backend, secrets, CLI workflow, or database operations.',
  '{
  "engagement": {
    "client": "ShivWorks",
    "owner": "CREATE SOMETHING",
    "phase": "Developer access / backend handoff",
    "recipient": "PM forwards to developer",
    "lane": "workflow_pilot"
  },
  "runtime": {
    "label": "ShivWorks Network Runtime",
    "status": "ok",
    "environment": "Cloudflare Pages + D1 + Infisical",
    "lastChecked": "Handoff ready",
    "checks": [
      {
        "label": "Production member network",
        "status": "ok",
        "detail": "network.shivworks.com is live on Cloudflare Pages with a generated fallback domain."
      },
      {
        "label": "Standalone repository",
        "status": "ok",
        "detail": "createsomethingtoday/shivworks-network is the self-contained application repo."
      },
      {
        "label": "Secrets in Infisical",
        "status": "ok",
        "detail": "Dev and production secret paths exist; values are never sent in chat or repo files."
      },
      {
        "label": "Access grants",
        "status": "idle",
        "detail": "GitHub, Infisical, Cloudflare, and app-admin grants wait on a named recipient."
      }
    ]
  },
  "layers": [
    {
      "tier": "Database",
      "title": "Cloudflare D1",
      "status": "Live",
      "description": "Production member, entitlement, session, course, event, media, and progress data lives in the Cloudflare D1 database named shivworks-network-db. With Cloudflare access, the named developer can own read, write, migration, and repair work through Wrangler and the repo CLI.",
      "evidence": [
        "shivworks-network-db",
        "Repo migration scripts"
      ],
      "tone": "success"
    },
    {
      "tier": "Automation",
      "title": "CLI and runtime access",
      "status": "Ready to provision",
      "description": "Developers use the standalone GitHub repo, Infisical-injected environment variables, Wrangler login for Cloudflare operations, and repo scripts for checks, tests, migrations, and guarded D1 queries.",
      "evidence": [
        "Developer runbook",
        "Infisical dev path"
      ],
      "tone": "info"
    },
    {
      "tier": "Judgment",
      "title": "Access boundary",
      "status": "Ready for named recipient",
      "description": "Access can be granted now to whichever developer or technical owner ShivWorks names. GitHub, Infisical, Cloudflare, and app admin access are still separate grants so ownership stays clear.",
      "evidence": [
        "Access lanes",
        "Named-recipient rule"
      ],
      "tone": "warning"
    }
  ],
  "actions": [
    {
      "id": "grant-developer-access",
      "label": "Grant developer access",
      "description": "Provision GitHub, Infisical, and Cloudflare access for the named recipient.",
      "summary": "Access is granted lane by lane to a named recipient: GitHub contributor access, Infisical dev path, and Cloudflare access only for the person owning production data work.",
      "status": "requires_approval",
      "risk": "medium",
      "policyChecks": [
        "Recipient name, email, GitHub username, and Infisical identity collected first.",
        "Each lane is a separate, attributable grant — no shared broad credential.",
        "Production secret access only for the named production owner."
      ],
      "evidence": [
        "Access lanes",
        "Delivery package"
      ],
      "allowedNextActions": [
        "Collect recipient identities",
        "Invite to repository",
        "Grant Infisical dev access"
      ]
    },
    {
      "id": "production-data-work",
      "label": "Production data work",
      "description": "Direct D1 operations through Wrangler and repo scripts by the named technical owner.",
      "summary": "Production database reads, migrations, and repairs run through Wrangler and the repo CLI under a named Cloudflare user so the work stays attributable. Production writes should be named and logged.",
      "status": "requires_approval",
      "risk": "high",
      "policyChecks": [
        "Named-user Cloudflare access, not shared tokens, for interactive work.",
        "Scoped API tokens only for non-interactive automation.",
        "Production writes are named and logged."
      ],
      "evidence": [
        "D1 ownership runbook",
        "Cloudflare access lane"
      ],
      "allowedNextActions": [
        "Run D1 read check",
        "List migrations",
        "Log intended writes"
      ]
    },
    {
      "id": "transfer-ownership",
      "label": "Transfer surfaces to ShivWorks accounts",
      "description": "Move the repo, Cloudflare project, Infisical project, and vendor accounts for full separation.",
      "summary": "For zero long-term CREATE SOMETHING dependency, the repo, Cloudflare project, Infisical project, and vendor accounts can transfer into ShivWorks-owned accounts. Until then, access stays scoped to ShivWorks-specific surfaces.",
      "status": "requires_approval",
      "risk": "medium",
      "policyChecks": [
        "ShivWorks chooses scoped managed access or full transfer.",
        "No CREATE SOMETHING monorepo or internal stack access is part of this handoff.",
        "Vendor account ownership moves with the transfer decision."
      ],
      "evidence": [
        "CREATE SOMETHING boundary",
        "Delivery package"
      ],
      "allowedNextActions": [
        "Record the ownership decision",
        "Plan account transfers"
      ]
    }
  ],
  "approval": {
    "title": "Named Recipient Gate",
    "description": "Every access lane is granted only to recipients ShivWorks names. The PM forwards this page; grants follow the named identities.",
    "approvalState": "review",
    "requiredApprover": "ShivWorks PM / technical lead",
    "primaryActionLabel": "Mark recipient approved",
    "secondaryActionLabel": "Keep in review"
  },
  "evidence": [
    {
      "id": "secret-boundary",
      "label": "Credential boundary",
      "detail": "Credential values stay in Infisical and Cloudflare secrets. The delivery page publishes secret names and ownership boundaries only.",
      "source": "Infisical",
      "visibility": "private",
      "tone": "warning"
    },
    {
      "id": "production-data",
      "label": "Production D1 contents",
      "detail": "Production D1 contains member, entitlement, session, admin, VIP, media, and progress data. The named technical owner can be granted CLI ownership for data work as needed.",
      "source": "shivworks-network-db",
      "visibility": "private",
      "tone": "info"
    },
    {
      "id": "runtime-secrets",
      "label": "Vendor runtime secrets",
      "detail": "Identity, Stripe, Resend, Circle, and Cloudflare Stream credentials are runtime secrets, not GitHub artifacts or frontend handoff notes.",
      "source": "Runtime secret storage",
      "visibility": "private",
      "tone": "warning"
    },
    {
      "id": "cs-boundary",
      "label": "CREATE SOMETHING boundary",
      "detail": "The ShivWorks developer does not need CREATE SOMETHING monorepo, agency-site, or internal operating-stack access.",
      "source": "Governance rule",
      "visibility": "private",
      "tone": "info"
    },
    {
      "id": "separation-path",
      "label": "Full separation path",
      "detail": "If ShivWorks wants no CREATE SOMETHING account dependency long term, move the repo, Cloudflare project, Infisical project, and vendor accounts into ShivWorks-owned accounts.",
      "source": "Delivery package",
      "visibility": "private",
      "tone": "info"
    },
    {
      "id": "frontend-scope",
      "label": "Frontend management scope",
      "detail": "Replit/front-end management is outside this developer runbook. The PM owns that workflow.",
      "source": "Scope note",
      "visibility": "private",
      "tone": "neutral"
    }
  ],
  "decisions": [
    {
      "id": "collect-identities",
      "title": "Collect the recipient name, email, GitHub username, Infisical identity, and Cloudflare account email if Cloudflare access is needed.",
      "owner": "ShivWorks PM",
      "state": "open",
      "tier": "Judgment"
    },
    {
      "id": "invite-recipient",
      "title": "Invite the named recipient to createsomethingtoday/shivworks-network.",
      "owner": "CREATE SOMETHING",
      "state": "open",
      "tier": "Automation"
    },
    {
      "id": "grant-infisical-dev",
      "title": "Grant Infisical dev access for the ShivWorks project/path and confirm they can run the app locally.",
      "owner": "CREATE SOMETHING",
      "state": "open",
      "tier": "Automation"
    },
    {
      "id": "grant-cloudflare",
      "title": "Grant Cloudflare access to the named production owner if they will own D1 data, Pages, or Stream operations.",
      "owner": "CREATE SOMETHING",
      "state": "open",
      "tier": "Database"
    },
    {
      "id": "ownership-decision",
      "title": "Choose scoped CREATE SOMETHING-managed access for now or transfer the ShivWorks surfaces into ShivWorks-owned accounts for full separation.",
      "owner": "ShivWorks",
      "state": "review",
      "tier": "Judgment"
    },
    {
      "id": "app-admin-role",
      "title": "When app admin access is needed, have the user sign in and then set their D1 member role to admin.",
      "owner": "ShivWorks product admin",
      "state": "open",
      "tier": "Database"
    }
  ],
  "artifacts": [
    {
      "title": "ShivWorks Network repo",
      "type": "Main GitHub repository",
      "href": "https://github.com/createsomethingtoday/shivworks-network",
      "visibility": "public",
      "tone": "info"
    },
    {
      "title": "Production member network",
      "type": "Cloudflare Pages app",
      "href": "https://network.shivworks.com",
      "visibility": "public",
      "tone": "success"
    },
    {
      "title": "Pages fallback URL",
      "type": "Cloudflare Pages generated domain",
      "href": "https://shivworks-network.pages.dev",
      "visibility": "public",
      "tone": "info"
    },
    {
      "title": "Infisical secret vault",
      "type": "Secret delivery path; values not published here",
      "visibility": "private",
      "tone": "warning"
    },
    {
      "title": "Cloudflare D1 database",
      "type": "shivworks-network-db via Wrangler",
      "visibility": "private",
      "tone": "warning"
    }
  ],
  "agent": {
    "title": "Ask This Handoff",
    "placeholder": "Example: What access does the developer need first?",
    "suggestedPrompts": [
      {
        "label": "First steps",
        "prompt": "What access does the developer need first?"
      },
      {
        "label": "Private boundary",
        "prompt": "What stays private in this handoff?"
      },
      {
        "label": "Decisions needed",
        "prompt": "What decisions does ShivWorks still need to make?"
      },
      {
        "label": "How it fits",
        "prompt": "How do the database, automation, and judgment layers fit together?"
      }
    ],
    "initialMessages": [
      {
        "role": "agent",
        "body": "Ask about access lanes, the developer runbook, what stays private, or which decisions are still open.",
        "grounding": [
          "Sanitized handoff context"
        ]
      }
    ]
  },
  "businessContexts": [
    {
      "id": "shivworks-network-handoff",
      "client": "ShivWorks",
      "project": "ShivWorks Network",
      "workflow": "Backend handoff → named developer ownership",
      "environment": "Production",
      "status": "review",
      "owner": "CREATE SOMETHING",
      "detail": "Developer access / backend handoff phase awaiting a named recipient."
    }
  ],
  "activeBusinessContextId": "shivworks-network-handoff",
  "metrics": [
    {
      "label": "Access lanes",
      "value": "4",
      "detail": "GitHub, Infisical, Cloudflare, App Admin",
      "tone": "info"
    },
    {
      "label": "Runbook commands",
      "value": "4",
      "detail": "Setup, validation, D1 read, D1 ownership",
      "tone": "info"
    },
    {
      "label": "Open decisions",
      "value": "6",
      "detail": "Identities, grants, ownership model",
      "tone": "warning"
    },
    {
      "label": "Boundary",
      "value": "ShivWorks-only",
      "detail": "No CREATE SOMETHING internal access required",
      "tone": "success"
    }
  ],
  "sourceStatuses": [
    {
      "system": "GitHub repository",
      "status": "ok",
      "detail": "Standalone repo ready for contributor invites.",
      "tier": "Automation"
    },
    {
      "system": "Cloudflare Pages + D1",
      "status": "ok",
      "detail": "Production app and database live under the CREATE SOMETHING account pending ownership decision.",
      "tier": "Database"
    },
    {
      "system": "Infisical",
      "status": "ok",
      "detail": "Dev and production secret paths ready for named-recipient grants.",
      "tier": "Automation"
    },
    {
      "system": "App admin (identity + members table)",
      "status": "idle",
      "detail": "Admin role is set in D1 after the user signs in through the application identity service.",
      "tier": "Judgment"
    }
  ],
  "approvalQueue": [
    {
      "id": "approval-named-recipient",
      "actionId": "grant-developer-access",
      "title": "Approve the named recipient for access grants",
      "requester": "Delivery system",
      "requiredApprover": "ShivWorks PM",
      "status": "review",
      "risk": "medium",
      "due": "Before any access lane is granted",
      "evidence": [
        "Delivery package",
        "Access lanes"
      ],
      "policyChecks": [
        "Recipient identities collected",
        "Lanes granted separately and attributably"
      ]
    }
  ],
  "executionQueue": [],
  "activityEvents": [],
  "guardrails": [
    "Answers use the sanitized ShivWorks handoff context only.",
    "Secret values are never published here or sent in chat — Infisical and Cloudflare secrets are the delivery path.",
    "Access is granted lane by lane to named recipients; no shared broad credentials.",
    "This handoff covers ShivWorks-specific surfaces only — no CREATE SOMETHING internal access."
  ],
  "handoffPackage": [
    {
      "label": "Runbook URL",
      "audience": "PM and ShivWorks lead",
      "deliverable": "This delivery page is the shareable source of truth for the backend handoff. The PM does not need to run the commands.",
      "how": "Send the page URL to the developer or technical owner who will take over the repo, secrets, and database workflow."
    },
    {
      "label": "Developer identity",
      "audience": "PM and backend developer",
      "deliverable": "The receiving developer needs a name, email, GitHub username, and Infisical account identity before access can be granted.",
      "how": "Collect those identities in one thread, then grant access through GitHub, Infisical, Cloudflare, and app admin as needed for that recipient."
    },
    {
      "label": "Repository access",
      "audience": "Backend developer",
      "deliverable": "Contributor access to createsomethingtoday/shivworks-network, which is the standalone application repository.",
      "how": "Invite the developer through the CREATE SOMETHING GitHub organization with the minimum role needed for active work."
    },
    {
      "label": "Secret access",
      "audience": "Backend developer",
      "deliverable": "Infisical access for development secrets and the names of any production secrets that exist. Secret values are not sent in chat.",
      "how": "Grant dev environment access in Infisical first. Add production access only for the named person taking production responsibility."
    },
    {
      "label": "Database path",
      "audience": "Technical owner",
      "deliverable": "CLI ownership of the ShivWorks data path through Cloudflare D1 and the repo scripts when the developer needs to inspect, query, migrate, or update data.",
      "how": "Grant Cloudflare D1 access to the named technical owner. They use Wrangler plus the repo commands for direct database work."
    },
    {
      "label": "CREATE SOMETHING boundary",
      "audience": "PM and technical owner",
      "deliverable": "No access to the CREATE SOMETHING monorepo, agency site, or internal operating stack is required for the ShivWorks handoff.",
      "how": "Grant only ShivWorks-specific surfaces. For zero long-term crossover, transfer the repo, Cloudflare project, Infisical project, and vendor accounts into ShivWorks-owned accounts."
    },
    {
      "label": "Acceptance check",
      "audience": "Developer and PM",
      "deliverable": "Confirmation that the developer can clone the repo, inject dev secrets, run the app, and run the validation commands.",
      "how": "The developer sends back pass/fail evidence. The PM can mark the handoff accepted once the technical recipient confirms setup."
    }
  ],
  "accessLanes": [
    {
      "label": "GitHub",
      "owner": "CREATE SOMETHING GitHub org",
      "scope": "Contributor access to createsomethingtoday/shivworks-network",
      "action": "Invite the developer with the minimum role needed for active backend work."
    },
    {
      "label": "Infisical",
      "owner": "CREATE SOMETHING / ShivWorks secret vault",
      "scope": "dev path for normal development; prod only by exception",
      "action": "Share secret names and environment access through Infisical, never in chat or repo files."
    },
    {
      "label": "Cloudflare",
      "owner": "Create Something Cloudflare account",
      "scope": "Pages, D1, Stream, and direct database CLI operations when backend production work requires it",
      "action": "Grant named-user access for the handoff recipient so D1 data work is attributable. Use scoped API tokens only for non-interactive automation."
    },
    {
      "label": "App Admin",
      "owner": "ShivWorks product admin",
      "scope": "Admin role inside the members table",
      "action": "After the person signs in through the application identity service, set their member role to admin in D1 when they need product admin access."
    }
  ],
  "runbookCommands": [
    {
      "label": "Local setup",
      "description": "Clone the standalone repo and start the app with dev secrets injected by Infisical.",
      "command": "git clone https://github.com/createsomethingtoday/shivworks-network.git\ncd shivworks-network\npnpm install\ninfisical login\ninfisical init\ninfisical run --env=dev --path=/ -- pnpm dev"
    },
    {
      "label": "Validation",
      "description": "Run the package checks with the same dev secret context.",
      "command": "infisical run --env=dev --path=/ -- pnpm check\ninfisical run --env=dev --path=/ -- pnpm test"
    },
    {
      "label": "D1 read check",
      "description": "Use after Cloudflare access is granted to confirm the named recipient can reach the production D1 database.",
      "command": "wrangler login\n\nCLOUDFLARE_ACCOUNT_ID=9645bd52e640b8a4f40a3a55ff1dd75a \\\npnpm db:shell \"SELECT name FROM sqlite_master WHERE type=''table'';\""
    },
    {
      "label": "D1 ownership path",
      "description": "Use the repo migration and database scripts for intentional data ownership work. Production writes should be named and logged.",
      "command": "pnpm migrate:list\npnpm migrate\n\nCLOUDFLARE_ACCOUNT_ID=9645bd52e640b8a4f40a3a55ff1dd75a \\\npnpm db:shell \"SELECT COUNT(*) FROM members;\""
    }
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
