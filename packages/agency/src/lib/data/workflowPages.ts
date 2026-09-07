export type WorkflowStep = {
  title: string;
  detail: string;
};

export type WorkflowArtifact = {
  title: string;
  detail: string;
};

export type WorkflowLink = {
  label: string;
  href: string;
  detail: string;
};

export type WorkflowFaq = {
  question: string;
  answer: string;
};

export type WorkflowPage = {
  slug: string;
  eyebrow: string;
  title: string;
  seoTitle: string;
  description: string;
  keywords: string[];
  directAnswer: string;
  fit: string;
  notFit: string;
  signals: string[];
  steps: WorkflowStep[];
  artifacts: WorkflowArtifact[];
  proofLinks: WorkflowLink[];
  faqs: WorkflowFaq[];
  relatedSlugs: string[];
  publishedTime: string;
  modifiedTime: string;
};

export const workflowPages: WorkflowPage[] = [
  {
    "slug": "mcp-server-development",
    "eyebrow": "MCP implementation guide",
    "title": "How to connect AI to your business tools with MCP",
    "seoTitle": "MCP Server Development: An Operating Guide",
    "description": "MCP, the Model Context Protocol, lets an AI assistant use tools and read information from other systems.",
    "keywords": [
      "MCP server development",
      "Model Context Protocol",
      "MCP tools",
      "MCP resources"
    ],
    "directAnswer": "MCP, the Model Context Protocol, lets an AI assistant use tools and read information from other systems. Start with one task. Agree on the data it may read, the actions it may take, and when a person must approve. Test those limits and keep a record of each result.",
    "fit": "Use this approach when an assistant needs repeatable access to business data or actions and the organization must retain ownership of credentials, policy, logs, and recovery.",
    "notFit": "Do not begin with a custom server when a read-only export answers the question, an established connector already provides the exact boundary, or nobody owns the source system after launch.",
    "signals": [
      "The same manual lookup or action appears in more than one assistant session.",
      "Credentials, tenant identity, approvals, or audit evidence matter to the action.",
      "A failed call needs a defined retry, stop, or human handoff instead of a plausible chat response."
    ],
    "steps": [
      {
        "title": "Choose the information to expose",
        "detail": "List the records, identifiers, dates, owners, and privacy rules. Preserve source names and timestamps so old information cannot pass for an up-to-date record."
      },
      {
        "title": "Give each tool one job",
        "detail": "Define its inputs, output limits, and failure behavior. Separate reading from changing records. Require verifiable approval for irreversible or high-impact actions."
      },
      {
        "title": "Check who has access",
        "detail": "Identify the person, workspace, service account, or customer using the tool. Check that identity for each action. Request only the OAuth permissions needed. Reject missing or unclear account links."
      },
      {
        "title": "Test it and hand it over",
        "detail": "Test success, denied access, missing evidence, stale data, duplicates, and unknown actions. Include data definitions, instructions, recovery steps, and example results in the handover."
      }
    ],
    "artifacts": [
      {
        "title": "Tool and resource contract",
        "detail": "A versioned catalog states what each primitive reads or changes, which identifiers it accepts, the scope it requires, and the structured result it returns."
      },
      {
        "title": "Authority matrix",
        "detail": "A compact policy names automatic actions, approval-required actions, blocked actions, and the owner who can change those rules."
      },
      {
        "title": "Verification receipt set",
        "detail": "Representative executions preserve source, request, decision, result, and failure evidence without leaking tokens or private record bodies."
      }
    ],
    "proofLinks": [
      {
        "label": "Inspect the owned stack boundary",
        "href": "/stack",
        "detail": "See what remains in your accounts and operating record before choosing a runtime."
      },
      {
        "label": "Review the security boundary",
        "href": "/security",
        "detail": "See how identity, secrets, approvals, and evidence are separated."
      }
    ],
    "faqs": [
      {
        "question": "What should an MCP server expose first?",
        "answer": "Expose the smallest read-only resource that resolves a repeated business question. It gives operators a way to validate identity, data shape, freshness, and privacy before granting an assistant any ability to change an external system."
      },
      {
        "question": "How many tools should the first MCP release include?",
        "answer": "There is no useful universal count. Include only the tools needed to complete one named workflow, and require a distinct test and authority rule for each. A small complete path is easier to evaluate than a broad catalog with unclear ownership."
      },
      {
        "question": "Who owns an MCP server after delivery?",
        "answer": "The client should own the accounts, source data, credential relationships, policy choices, deployment access, logs, and recovery procedure. A delivery partner can maintain the implementation, but should not become an invisible authorization dependency."
      }
    ],
    "relatedSlugs": [
      "mcp-security-oauth",
      "mcp-vs-api",
      "ai-workflow-observability"
    ],
    "publishedTime": "2026-08-02",
    "modifiedTime": "2026-09-07"
  },
  {
    "slug": "ai-workflow-automation",
    "eyebrow": "Automation decision guide",
    "title": "How to choose your first AI automation",
    "seoTitle": "AI Workflow Automation: Map Before You Build",
    "description": "Start with one task your team repeats.",
    "keywords": [
      "AI workflow automation",
      "business process automation",
      "AI operations"
    ],
    "directAnswer": "Start with one task your team repeats. Agree on its inputs, the person responsible, and what a good result looks like. Automate the parts you can test. Keep decisions that need judgment with a person, and record what happened and what still needs attention.",
    "fit": "Use automation when the work repeats often enough to observe, the source systems are accessible, and a responsible operator can define success, exceptions, and the stop condition.",
    "notFit": "Delay automation when every case is novel, the source records are unreliable, the team cannot name a decision owner, or a mistaken action would be hard to detect and reverse.",
    "signals": [
      "People copy the same context between two or more systems on a regular cadence.",
      "A queue grows because evidence gathering takes longer than the actual decision.",
      "The team can describe a passing case, an exception, and the person who resolves that exception."
    ],
    "steps": [
      {
        "title": "Choose one repeated task",
        "detail": "Follow a task from its starting event to its expected result. Measure volume, delays, rework, and exceptions before changing it."
      },
      {
        "title": "Separate drafts from decisions",
        "detail": "Identify steps that gather facts, organize records, or draft a response. Separate them from spending money, publishing, changing access, or interpreting policy. Start with preparation when decision quality is unproven."
      },
      {
        "title": "Test everyday and difficult cases",
        "detail": "Include ordinary cases, unusual cases, denied actions, missing inputs, and duplicates. Compare results with source records. Check that the agent asks for help when information is missing."
      },
      {
        "title": "Agree on the launch checks",
        "detail": "Name who can enable live actions. Define monitoring, reasons to pause, recovery, and record retention. Make launch an explicit decision after the checks pass."
      }
    ],
    "artifacts": [
      {
        "title": "Workflow map",
        "detail": "The map names the initiating signal, source records, decisions, owners, tool boundaries, exception paths, and proof expected at completion."
      },
      {
        "title": "Case fixture pack",
        "detail": "A reusable set of representative cases makes quality discussions concrete and prevents a polished demo from substituting for operational coverage."
      },
      {
        "title": "Operating runbook",
        "detail": "The runbook explains release state, approvals, monitoring, pause and rollback actions, escalation contacts, and the evidence needed for the next review."
      }
    ],
    "proofLinks": [
      {
        "label": "See the service path",
        "href": "/services",
        "detail": "Review how Map, Build, and Control divide definition, implementation, and operation."
      },
      {
        "label": "Inspect a compiled workflow",
        "href": "/proof/marketplace-workflow",
        "detail": "See a bounded shadow example with cases, contracts, and deterministic receipts."
      }
    ],
    "faqs": [
      {
        "question": "Which AI workflow should a company automate first?",
        "answer": "Choose a frequent, bounded handoff with accessible records, a known owner, measurable delay or rework, and reversible actions. Avoid beginning with the company’s highest-stakes judgment simply because it sounds strategically important."
      },
      {
        "question": "Does AI workflow automation require an autonomous agent?",
        "answer": "No. Many valuable systems watch for a change, assemble evidence, draft a recommendation, and wait for a human decision. Autonomy is an authority choice, not a requirement for using models or tool connectivity."
      },
      {
        "question": "When is an AI automation pilot ready for production?",
        "answer": "It is ready only after representative cases pass, identity and tool permissions are bounded, exception ownership is staffed, monitoring and rollback exist, and the accountable operator explicitly accepts the remaining risk."
      }
    ],
    "relatedSlugs": [
      "workflow-mapping",
      "human-in-the-loop-ai",
      "ai-workflow-governance"
    ],
    "publishedTime": "2026-08-02",
    "modifiedTime": "2026-09-07"
  },
  {
    "slug": "ai-workflow-governance",
    "eyebrow": "Governance operating guide",
    "title": "How to set rules an AI workflow must follow",
    "seoTitle": "AI Workflow Governance: Policies, Approvals, Proof",
    "description": "AI governance means enforceable rules for what a system may read, suggest, change, or send for review.",
    "keywords": [
      "AI workflow governance",
      "AI policy controls",
      "governed automation"
    ],
    "directAnswer": "AI governance means enforceable rules for what a system may read, suggest, change, or send for review. Put those rules in permissions, approval checks, tests, and operating instructions. Keep records so your team can check what happened. A policy document alone cannot enforce them.",
    "fit": "Use this model when an AI-assisted process touches customer data, money, publication, access, regulated decisions, or any action whose authority must be explained later.",
    "notFit": "A governance program is not useful if it produces a document nobody can connect to runtime behavior, or if every exception depends on an unavailable executive rather than an operating owner.",
    "signals": [
      "Teams disagree about whether the assistant may act or only recommend.",
      "Approvals happen in chat but are not attached to the resulting external change.",
      "Operators cannot reconstruct which evidence, policy version, and identity produced a decision."
    ],
    "steps": [
      {
        "title": "List the permitted actions",
        "detail": "For each tool and record, list what may be read, proposed, changed automatically, changed with approval, or blocked. Include customer and role restrictions."
      },
      {
        "title": "Define what happens when a rule fails",
        "detail": "Track pending, approved, denied, expired, missing-evidence, and unknown-action states. If no rule matches, stop. Explain which information or responsible person is missing."
      },
      {
        "title": "Record the action and its approval",
        "detail": "Keep source references, policy version, approver identity, request, result identifiers, and timestamps. Protect sensitive data while retaining enough information to review the decision."
      },
      {
        "title": "Review the rules and test recovery",
        "detail": "Review exceptions and business changes. Test pausing, removing access, retrying, correcting data, and undoing changes. Update the instructions when tools or processes change."
      }
    ],
    "artifacts": [
      {
        "title": "Machine-readable policy pack",
        "detail": "Versioned rules connect business language to tool names, roles, thresholds, approvals, evidence requirements, and explicit blocked states."
      },
      {
        "title": "Approval record",
        "detail": "The record binds the decision to a person or policy, a defined scope, supporting evidence, expiration, and the action that consumed it."
      },
      {
        "title": "Recovery checklist",
        "detail": "Operators receive tested instructions for pausing work, invalidating access, correcting state, notifying owners, and documenting the final disposition."
      }
    ],
    "proofLinks": [
      {
        "label": "Review the Control model",
        "href": "/control",
        "detail": "See how Signal, Decision, and Proof support governed operation."
      },
      {
        "label": "Read the bearer token policy",
        "href": "/bearer-token-policy",
        "detail": "Inspect a concrete access-policy boundary and its operational limits."
      }
    ],
    "faqs": [
      {
        "question": "What is the minimum viable AI governance artifact?",
        "answer": "For one workflow, start with an authority table that names each action, its allowed identity, required evidence, approval state, and failure behavior. Connect that table to tests and receipts before expanding into a broader governance program."
      },
      {
        "question": "Can a prompt serve as an AI policy?",
        "answer": "A prompt can explain intent, but it cannot by itself authenticate a user, enforce a scope, prove an approval, or reverse an external change. Pair judgment instructions with runtime permissions, validators, state, and observable evidence."
      },
      {
        "question": "How often should AI workflow policies be reviewed?",
        "answer": "Review after material tool, data, legal, organizational, or failure changes and on a cadence proportionate to risk. Use observed exceptions and denied actions as inputs, rather than updating policy only on a calendar."
      }
    ],
    "relatedSlugs": [
      "human-in-the-loop-ai",
      "ai-agent-evaluation",
      "ai-workflow-observability"
    ],
    "publishedTime": "2026-08-02",
    "modifiedTime": "2026-09-07"
  },
  {
    "slug": "human-in-the-loop-ai",
    "eyebrow": "Approval design guide",
    "title": "How to give people useful control over AI decisions",
    "seoTitle": "Human-in-the-Loop AI: Approval and Escalation Design",
    "description": "Human-in-the-loop AI means a person reviews a defined decision before the work continues.",
    "keywords": [
      "human in the loop AI",
      "AI approval workflow",
      "AI escalation"
    ],
    "directAnswer": "Human-in-the-loop AI means a person reviews a defined decision before the work continues. Show that person the proposed action and the evidence needed to judge it. Let them approve, reject, correct, defer, or ask for help. Keep their decision in the work history.",
    "fit": "Use human review when policy interpretation, customer consequence, irreversible action, uncertain evidence, or professional accountability makes automated commitment inappropriate.",
    "notFit": "Adding a generic approval button is not meaningful oversight if the reviewer lacks source evidence, cannot change the recommendation, or faces a queue too large to examine responsibly.",
    "signals": [
      "The system can prepare a case reliably but cannot justify final judgment across exceptions.",
      "Different roles own content quality, security, legal, financial, or customer-impact decisions.",
      "Reviewers spend most of their time finding context instead of evaluating the proposed action."
    ],
    "steps": [
      {
        "title": "Define the review question",
        "detail": "State the exact question, allowed outcomes, reviewer permissions, and deadline. Ask for approval of the specific action that needs judgment."
      },
      {
        "title": "Put the evidence beside the action",
        "detail": "Show source links, excerpts, check results, applicable rules, uncertainty, and the proposed change together. Separate observed facts from AI interpretation. Highlight missing information."
      },
      {
        "title": "Let the reviewer correct or stop it",
        "detail": "Allow edits, requests for evidence, reassignment, and stopping. Record a reason without requiring an essay for routine decisions. Make urgent exceptions visible without bypassing the rules."
      },
      {
        "title": "Check whether review works in practice",
        "detail": "Measure waiting time, review time, corrections, disagreement, missed exceptions, and abandoned tasks. Reduce volume or add staff if reviewers cannot examine the work properly."
      }
    ],
    "artifacts": [
      {
        "title": "Decision packet",
        "detail": "A compact, source-linked view separates facts, recommendation, policy checks, uncertainty, missing evidence, and the exact action awaiting authority."
      },
      {
        "title": "Role and escalation map",
        "detail": "The map names the primary reviewer, backup, specialist escalations, response target, and what the system does while the decision is pending."
      },
      {
        "title": "Review quality receipt",
        "detail": "The receipt records the presented evidence, reviewer outcome, corrections, reason code, action result, and time needed without claiming that approval alone proves quality."
      }
    ],
    "proofLinks": [
      {
        "label": "Read the template review field report",
        "href": "/field-reports/template-review",
        "detail": "See why successful evidence preparation did not justify automated judgment."
      },
      {
        "label": "Inspect the Decision surface",
        "href": "/products/decision",
        "detail": "See how a governed system routes judgment and preserves the boundary."
      }
    ],
    "faqs": [
      {
        "question": "Which AI decisions should always involve a person?",
        "answer": "Require a responsible person where law, policy, professional duty, irreversible impact, unclear evidence, or meaningful customer consequence demands accountable judgment. The boundary should be based on the action and context, not the model brand."
      },
      {
        "question": "How can teams prevent approval fatigue?",
        "answer": "Narrow the decision, group related evidence, remove low-value notifications, automate only well-proven cases, use risk-based thresholds, and measure queue health. If reviewers routinely approve without reading, reduce volume or authority."
      },
      {
        "question": "Does human approval make an AI system safe?",
        "answer": "Not automatically. Safety also depends on source quality, reviewer competence, interface clarity, available time, permission enforcement, monitoring, and recovery. Approval is one control whose effectiveness must be tested in operation."
      }
    ],
    "relatedSlugs": [
      "ai-workflow-governance",
      "ai-agent-evaluation",
      "webflow-template-review"
    ],
    "publishedTime": "2026-08-02",
    "modifiedTime": "2026-09-07"
  },
  {
    "slug": "ai-agent-evaluation",
    "eyebrow": "Release evidence guide",
    "title": "How to test an AI agent before giving it more access",
    "seoTitle": "AI Agent Evaluation: Cases, Gates, and Release Evidence",
    "description": "Test the agent on the work it will actually do.",
    "keywords": [
      "AI agent evaluation",
      "agent evals",
      "AI release gates"
    ],
    "directAnswer": "Test the agent on the work it will actually do. Include routine tasks, exceptions, denied actions, missing information, old records, and hostile inputs. Check both the result and whether it followed the rules. Grant more access only after an explicit release decision, with a way to undo it.",
    "fit": "Use workflow-specific evaluation whenever an agent reads private context, calls tools, recommends consequential actions, or moves from drafting toward external execution.",
    "notFit": "A single demonstration, aggregate accuracy score, or vendor benchmark cannot establish readiness when failures have different costs or when the agent’s permissions differ from the test environment.",
    "signals": [
      "Stakeholders describe the agent as working but cannot name the cases it passed.",
      "A new tool, prompt, model, policy, or data source can change behavior after launch.",
      "The team needs a repeatable reason to expand, hold, or reduce the agent’s authority."
    ],
    "steps": [
      {
        "title": "Define the possible results",
        "detail": "Name successful, needs-human, blocked, missing-evidence, tool-failure, and unknown-action outcomes. Check answer quality and whether the agent stopped when it should."
      },
      {
        "title": "Build a reusable set of cases",
        "detail": "Use representative patterns with privacy protections. Keep difficult exceptions. Save versions of inputs and expected results so changes in models, instructions, rules, and tools can be compared."
      },
      {
        "title": "Hide the answers during the test",
        "detail": "Keep expected results hidden from the agent. Use repeatable automated checks where possible. Have qualified reviewers examine disputed judgments, tool calls, and stopping behavior."
      },
      {
        "title": "Approve the release and keep checking",
        "detail": "Record allowed actions, required scores, unresolved risks, the approver, and recovery steps. Keep checking live results: passing test cases cannot guarantee future behavior."
      }
    ],
    "artifacts": [
      {
        "title": "Versioned evaluation set",
        "detail": "Fixtures identify source pattern, expected outcome class, required evidence, prohibited actions, privacy treatment, and why the case matters."
      },
      {
        "title": "Promotion decision",
        "detail": "A signed record states the tested versions, scores by case class, known misses, granted authority, monitoring plan, owner, and rollback trigger."
      },
      {
        "title": "Regression report",
        "detail": "Each material system change is compared against prior behavior, with new failures routed to a named owner before the release can expand authority."
      }
    ],
    "proofLinks": [
      {
        "label": "Inspect deterministic workflow proof",
        "href": "/proof/marketplace-workflow",
        "detail": "See representative outcomes and repeatable compiled artifacts."
      },
      {
        "label": "Review a blocked promotion",
        "href": "/field-reports/template-review",
        "detail": "See how an exceptional-case miss kept judgment with a person."
      }
    ],
    "faqs": [
      {
        "question": "How many cases are enough for an AI agent evaluation?",
        "answer": "No fixed count proves readiness. Cover every meaningful outcome and risk class, then add cases until new samples stop revealing major behavior gaps. High-consequence or diverse workflows require broader evidence than a narrow drafting task."
      },
      {
        "question": "Should AI agent evaluations use production data?",
        "answer": "Use representative patterns while applying privacy, access, and retention rules. De-identification or synthetic fixtures may be appropriate, but verify that they preserve the edge conditions and source relationships the agent will actually encounter."
      },
      {
        "question": "What should happen when an agent fails one rare case?",
        "answer": "Assess the consequence and whether the failure reveals a general boundary weakness. Keep or reduce authority, add the case to regression coverage, fix the relevant data, policy, tool, or judgment layer, and require a new promotion decision."
      }
    ],
    "relatedSlugs": [
      "ai-workflow-governance",
      "human-in-the-loop-ai",
      "ai-workflow-observability"
    ],
    "publishedTime": "2026-08-02",
    "modifiedTime": "2026-09-07"
  },
  {
    "slug": "mcp-security-oauth",
    "eyebrow": "Identity and access guide",
    "title": "How to control who can access an MCP connection",
    "seoTitle": "MCP Security and OAuth: Scope, Identity, Evidence",
    "description": "An MCP connection lets AI use tools and information.",
    "keywords": [
      "MCP security",
      "MCP OAuth",
      "Model Context Protocol authentication"
    ],
    "directAnswer": "An MCP connection lets AI use tools and information. Check who is calling, which customer or workspace they belong to, and what they may do. OAuth lets someone authorize access to their account; it does not replace checks on each action. Protect credentials, separate reads from writes, and log decisions without exposing private data.",
    "fit": "Use delegated OAuth when a person or customer must authorize access to their own third-party account and the runtime needs revocable, scoped credentials tied to that identity.",
    "notFit": "Do not force user OAuth onto a service-owned batch process with no user delegation, and do not use a shared static bearer token as a substitute for tenant-aware authorization.",
    "signals": [
      "The same MCP endpoint serves more than one user, client, workspace, or data boundary.",
      "A provider connection can be valid while still belonging to the wrong entity inside the broker.",
      "Operators need to revoke access or explain which scopes and identity authorized a tool call."
    ],
    "steps": [
      {
        "title": "Link the correct accounts",
        "detail": "Document the person, application, provider account, customer, and internal workspace identifiers. Reject connections that sign in successfully but cannot be linked to the requested account."
      },
      {
        "title": "Request only the permissions needed",
        "detail": "Match each tool to its required provider permissions, starting read-only where possible. Explain the access in plain language. Obtain new consent before adding permissions."
      },
      {
        "title": "Check every action",
        "detail": "Validate token audience, issuer, expiry, connection status, account mapping, role, tool rules, and approval. Check close to the action. A successful login or AI instruction is not sufficient."
      },
      {
        "title": "Protect credentials and test disconnect",
        "detail": "Store credentials securely, redact logs, rotate service secrets, and support disconnect. Test that removing provider access works. Keep audit identifiers and outcomes without unnecessary private content."
      }
    ],
    "artifacts": [
      {
        "title": "Identity binding record",
        "detail": "The record connects internal user and tenant identifiers to the provider account and authorization grant, with status, timestamps, and revocation state."
      },
      {
        "title": "Scope-to-tool matrix",
        "detail": "Each exposed operation lists its provider scopes, internal role, approval need, data sensitivity, and response redaction rules."
      },
      {
        "title": "Access audit receipt",
        "detail": "A safe receipt captures caller, tenant, policy version, connection identifier, tool, decision, and result status while excluding bearer credentials and private bodies."
      }
    ],
    "proofLinks": [
      {
        "label": "Inspect Agency security",
        "href": "/security",
        "detail": "Review identity, secrets, least privilege, and operational evidence boundaries."
      },
      {
        "label": "Read the token policy",
        "href": "/bearer-token-policy",
        "detail": "See where bearer access is accepted and where it is intentionally insufficient."
      }
    ],
    "faqs": [
      {
        "question": "Does OAuth make an MCP server secure by itself?",
        "answer": "No. OAuth can establish delegated access, but the server must still validate tokens, bind the right tenant, enforce tool-specific policy, protect secrets, limit data, handle revocation, and preserve evidence for each action."
      },
      {
        "question": "Why can an MCP connection succeed for the wrong user?",
        "answer": "Authentication may prove control of a provider account while the broker or application maps that grant to the wrong internal user or workspace. Verify the full identity chain and entity identifiers before changing scopes or tool code."
      },
      {
        "question": "When is a static bearer token acceptable for MCP access?",
        "answer": "It can be appropriate for a tightly bounded service-to-service control with secure storage, rotation, narrow policy, and no need for user delegation. It should not impersonate multiple customers or replace revocable per-user authorization."
      }
    ],
    "relatedSlugs": [
      "mcp-server-development",
      "ai-workflow-governance",
      "mcp-vs-api"
    ],
    "publishedTime": "2026-08-02",
    "modifiedTime": "2026-09-07"
  },
  {
    "slug": "mcp-vs-api",
    "eyebrow": "Architecture comparison",
    "title": "MCP or an API: which connection does your project need?",
    "seoTitle": "MCP vs API: When to Use Each Interface",
    "description": "An API lets software exchange information or request actions.",
    "keywords": [
      "MCP vs API",
      "Model Context Protocol vs REST API",
      "AI tool integration"
    ],
    "directAnswer": "An API lets software exchange information or request actions. MCP gives compatible AI assistants a standard way to discover and use selected tools and information. MCP often sits on top of an API. Choose the simplest connection that serves the task, while keeping authentication, permissions, validation, and work records.",
    "fit": "Choose MCP when multiple compatible AI hosts need to discover and use a bounded capability with descriptions and structured context, while the organization keeps an independent source service underneath.",
    "notFit": "Choose a direct API or internal function when the consumer is deterministic application code, latency and throughput dominate, or exposing model-oriented discovery adds no useful interoperability.",
    "signals": [
      "The capability should be usable from more than one assistant or agent host.",
      "The consumer benefits from resource descriptions and tool schemas at discovery time.",
      "The business service already has or needs an interface independent of any model host."
    ],
    "steps": [
      {
        "title": "Identify what will connect",
        "detail": "List browsers, background jobs, other systems, AI assistants, and people separately. The same task may need an API for applications and an MCP connection for assistants."
      },
      {
        "title": "Keep the business rules in one place",
        "detail": "Keep validation, permissions, duplicate-request handling, and state changes in the shared service. The MCP adapter should translate requests without creating a second copy of those rules."
      },
      {
        "title": "Compare practical requirements",
        "detail": "Check discovery, compatibility, streaming, batch sizes, speed, versions, caching, rate limits, retries, customer separation, and logging. Choose the simplest connection that meets the requirements."
      },
      {
        "title": "Test the service and the AI connection",
        "detail": "Test the underlying service first, then use the MCP tool through a compatible assistant. Check structured errors and confirm that the adapter cannot grant extra permissions."
      }
    ],
    "artifacts": [
      {
        "title": "Consumer and interface map",
        "detail": "A diagram ties each consumer to the API, MCP adapter, data source, identity boundary, and owning team, revealing duplicated logic or accidental coupling."
      },
      {
        "title": "Capability contract",
        "detail": "The contract defines business inputs, outputs, errors, side effects, idempotency, service limits, and audit fields independently of the transport used by a client."
      },
      {
        "title": "Compatibility test matrix",
        "detail": "Tests cover direct service calls and supported MCP hosts, including discovery, schemas, authorization failures, partial outages, timeouts, and representative successful cases."
      }
    ],
    "proofLinks": [
      {
        "label": "See the tool-stack boundary",
        "href": "/partners",
        "detail": "Understand how application, runtime, intelligence, approval, and evidence layers divide ownership."
      },
      {
        "label": "Review what the client keeps",
        "href": "/stack",
        "detail": "See why the owned service boundary matters beyond a particular interface."
      }
    ],
    "faqs": [
      {
        "question": "Does MCP replace REST or GraphQL APIs?",
        "answer": "Usually not. MCP gives AI hosts a standard consumption interface, while REST, GraphQL, RPC, queues, or database access may still power the owned service beneath it. The best layering avoids duplicating business rules in the adapter."
      },
      {
        "question": "Can the same capability support both MCP and an API?",
        "answer": "Yes. Put the capability and policy in a shared service, then expose purpose-built adapters. The API can serve deterministic clients while MCP supplies model-oriented discovery and structured invocation for compatible hosts."
      },
      {
        "question": "Is MCP only useful for tool calls?",
        "answer": "No. MCP can expose resources for context and prompts for reusable interaction patterns as well as tools for actions. Prefer the least powerful primitive that completes the consumer’s job."
      }
    ],
    "relatedSlugs": [
      "mcp-server-development",
      "mcp-security-oauth",
      "ai-workflow-automation"
    ],
    "publishedTime": "2026-08-02",
    "modifiedTime": "2026-09-07"
  },
  {
    "slug": "webflow-marketplace-operations",
    "eyebrow": "Marketplace operations guide",
    "title": "How to organize Webflow Marketplace reviews",
    "seoTitle": "Webflow Marketplace Operations: A Governed Workflow",
    "description": "Treat submission, validation, review, approval, publication, and monitoring as separate steps with named owners.",
    "keywords": [
      "Webflow Marketplace operations",
      "Marketplace review workflow",
      "Webflow operations"
    ],
    "directAnswer": "Treat submission, validation, review, approval, publication, and monitoring as separate steps with named owners. Automate evidence gathering and objective checks first. Keep policy decisions with qualified reviewers until testing supports a change. Record each step so the next person can see what happened.",
    "fit": "Use this system when volume, multiple asset types, reviewer specialization, policy changes, and publication consequences make ad hoc queue handling hard to inspect or improve.",
    "notFit": "Do not force every review lane into one automatic decision rule when apps, templates, libraries, and partners have different evidence, authority, and customer-impact boundaries.",
    "signals": [
      "Review context is scattered across submissions, messages, dashboards, and reviewer memory.",
      "Objective validation repeats while nuanced quality or policy judgment remains specialist work.",
      "Teams cannot trace a published item back to the evidence, approval, and version that justified it."
    ],
    "steps": [
      {
        "title": "Map the review stages",
        "detail": "List asset types, versions, checks, reviewers, requested changes, approvals, publication, incidents, and retirement. Name the system that owns each status and what can advance it."
      },
      {
        "title": "Prepare the review evidence",
        "detail": "Collect metadata, automated checks, screenshots, sources, prior decisions, and policy references. Mark missing or outdated evidence so an incomplete case does not appear ready."
      },
      {
        "title": "Assign the right reviewer",
        "detail": "Assign decisions by asset type, risk, policy area, and reviewer permissions. Keep corrections and escalation reasons. Publication access must stay separate from evidence collection."
      },
      {
        "title": "Record publication and watch for problems",
        "detail": "Keep version identifiers, the decision owner, policy version, resulting status, and publication record. Link later incidents to the exact item and approval history."
      }
    ],
    "artifacts": [
      {
        "title": "Lifecycle state model",
        "detail": "A versioned model defines legal transitions, required evidence, responsible roles, and blocked states for every supported Marketplace asset type."
      },
      {
        "title": "Reviewer packet schema",
        "detail": "The schema keeps objective checks, source artifacts, model analysis, prior history, missing evidence, and human decision fields distinguishable."
      },
      {
        "title": "Publication receipt",
        "detail": "The receipt ties the published identifier and version to the approved packet, authorized publisher, timestamp, and monitoring responsibility."
      }
    ],
    "proofLinks": [
      {
        "label": "Inspect the Marketplace workflow proof",
        "href": "/proof/marketplace-workflow",
        "detail": "See the versioned map, compiled contracts, representative cases, and deterministic result."
      },
      {
        "label": "Read the template review field report",
        "href": "/field-reports/template-review",
        "detail": "See the measured boundary between evidence preparation and reviewer judgment."
      }
    ],
    "faqs": [
      {
        "question": "Which part of Marketplace review is best to automate first?",
        "answer": "Begin with evidence collection, metadata normalization, completeness checks, duplicate detection, and other objective validations. These reduce reviewer search time while leaving nuanced policy and quality judgment with the accountable specialist."
      },
      {
        "question": "How should Marketplace exceptions be handled?",
        "answer": "Represent exceptions as explicit states with a reason, evidence requirement, specialist owner, deadline, and allowed next actions. Do not let an unusual case borrow approval from a nearby routine case."
      },
      {
        "question": "What proves a Marketplace item was properly published?",
        "answer": "A useful receipt connects the exact submitted version, completed validations, human approval, publisher identity, external item identifier, publication timestamp, and monitoring owner. A success message alone is not enough."
      }
    ],
    "relatedSlugs": [
      "webflow-app-review",
      "webflow-template-review",
      "ai-workflow-observability"
    ],
    "publishedTime": "2026-08-02",
    "modifiedTime": "2026-09-07"
  },
  {
    "slug": "webflow-app-review",
    "eyebrow": "App review guide",
    "title": "How to prepare a Webflow app for review",
    "seoTitle": "Webflow App Review: Evidence and Release Readiness",
    "description": "Choose the exact app version to submit and test the installation and main user task.",
    "keywords": [
      "Webflow app review",
      "Webflow Marketplace app",
      "app submission checklist"
    ],
    "directAnswer": "Choose the exact app version to submit and test the installation and main user task. Explain its permissions and external services. Test empty, denied, disconnected, and failure states. Make sure screenshots, documentation, and support instructions describe that same version.",
    "fit": "Use this approach for Marketplace apps, Designer extensions, data clients, or integrations whose review depends on permissions, user experience, support, privacy, and repeatable installation behavior.",
    "notFit": "A polished demo is not a substitute for an installable submitted build, and a locally successful API call does not prove the reviewer can authorize, configure, and use the app in the review environment.",
    "signals": [
      "The app crosses Webflow, an external provider, and a hosted runtime with separate identities.",
      "Permissions or data handling are hard to infer from the visible product path.",
      "A reviewer must reproduce setup and failure behavior without developer assistance."
    ],
    "steps": [
      {
        "title": "Identify the submitted version",
        "detail": "Record the app version, deployment, Webflow configuration, external services, privacy policy, support contact, and test account instructions. Match screenshots and claims to that version."
      },
      {
        "title": "Explain access and data use",
        "detail": "List OAuth permissions, site access, data categories, storage, subprocessors, retention, deletion, and disconnect behavior. Use plain language that matches the app and consent screens."
      },
      {
        "title": "Try the reviewer’s path",
        "detail": "Test installation, setup, the main task, empty states, denied consent, expired sessions, disconnected providers, invalid inputs, retry, and uninstall. Capture what the reviewer can see."
      },
      {
        "title": "Include support and release records",
        "detail": "Provide the support and recovery instructions for the submitted version. Keep the release record and known limits alongside the review evidence."
      }
    ],
    "artifacts": [
      {
        "title": "Review candidate manifest",
        "detail": "The manifest binds source revision, deployment, app configuration, requested permissions, external services, documentation, screenshots, and submission identifiers."
      },
      {
        "title": "Reviewer journey evidence",
        "detail": "A reproducible sequence shows installation, consent, primary task, key failure states, disconnect, and uninstall from the same build the reviewer receives."
      },
      {
        "title": "Release and support runbook",
        "detail": "The runbook names monitoring, incident response, customer support, version changes, rollback, credential rotation, and the person responsible after approval."
      }
    ],
    "proofLinks": [
      {
        "label": "See the owned tool stack",
        "href": "/partners",
        "detail": "Understand the identity and runtime boundaries that an app review must make legible."
      },
      {
        "label": "Review Agency security",
        "href": "/security",
        "detail": "Inspect the permission, secret, evidence, and recovery expectations behind delivery."
      }
    ],
    "faqs": [
      {
        "question": "What evidence should accompany a Webflow app submission?",
        "answer": "Provide version-bound installation steps, permission explanations, privacy and support links, reviewer credentials if allowed, primary and failure-path evidence, external-service details, and a way to identify the exact deployed candidate."
      },
      {
        "question": "How should OAuth be tested before Webflow app review?",
        "answer": "Test first consent, repeat consent, denial, expired sessions, wrong account or site, provider disconnect, revoked grants, and app uninstall. Confirm user-facing scope language and verify that revoked access actually stops protected operations."
      },
      {
        "question": "Does Marketplace approval prove the live app works for every customer?",
        "answer": "No. Approval establishes a review decision for a submitted candidate. The owner must still verify publication, installation, runtime health, support readiness, provider changes, and customer-specific permissions after release."
      }
    ],
    "relatedSlugs": [
      "webflow-marketplace-operations",
      "mcp-security-oauth",
      "ai-agent-evaluation"
    ],
    "publishedTime": "2026-08-02",
    "modifiedTime": "2026-09-07"
  },
  {
    "slug": "webflow-template-review",
    "eyebrow": "Template review guide",
    "title": "How AI can help with Webflow template review",
    "seoTitle": "Webflow Template Review: Evidence Before Judgment",
    "description": "Use automation to gather evidence and run repeatable checks.",
    "keywords": [
      "Webflow template review",
      "template quality review",
      "Webflow Marketplace templates"
    ],
    "directAnswer": "Use automation to gather evidence and run repeatable checks. Keep subjective quality and policy decisions with a qualified reviewer until testing supports a change. Identify the exact template version, show missing information, and record the reviewer’s corrections and final decision.",
    "fit": "Use this pattern when reviewers repeatedly inspect structure, responsiveness, accessibility, licensing, content, and policy context but exceptional quality decisions remain nuanced.",
    "notFit": "Do not train a broad automated judge from noisy historical outcomes and then treat average agreement as permission to approve or reject new templates without exceptional-case evidence.",
    "signals": [
      "Reviewers spend substantial effort opening the same sources and reconstructing the same checklist context.",
      "Objective findings are useful but do not consistently explain approval, iteration, rejection, or policy outcomes.",
      "The team needs faster preparation while preserving specialist judgment and a defensible decision trail."
    ],
    "steps": [
      {
        "title": "Identify the exact template version",
        "detail": "Record the template, submission, preview, files, author, dates, and policy version. Flag evidence that cannot be linked to the submitted version."
      },
      {
        "title": "Run objective checks",
        "detail": "Check structure, responsive behavior, accessibility, links, assets, licensing, and content, with source references. Distinguish missing access from a failed check. A rule of thumb is not a policy decision."
      },
      {
        "title": "Make the case easy to review",
        "detail": "Group facts, issues, prior context, and open questions by checklist area. Highlight exceptional cases. Label suggestions so they cannot be mistaken for official Marketplace decisions."
      },
      {
        "title": "Record the reviewer’s decision",
        "detail": "Keep the outcome, requested changes, reasons, corrections, and time spent. Add missed patterns to future tests. Historical labels alone do not establish the correct policy decision."
      }
    ],
    "artifacts": [
      {
        "title": "Version-bound evidence packet",
        "detail": "The packet links each observation to its source, timestamp, check, and candidate version, with unavailable inputs and model inferences plainly marked."
      },
      {
        "title": "Checklist coverage map",
        "detail": "Each review area shows which checks are deterministic, which require specialist judgment, which evidence is missing, and who owns the final decision."
      },
      {
        "title": "Reviewer correction log",
        "detail": "Corrections, disagreements, exceptional cases, and decisions become evaluation evidence without being mistaken for a fully reliable automated label set."
      }
    ],
    "proofLinks": [
      {
        "label": "Read the measured field report",
        "href": "/field-reports/template-review",
        "detail": "Inspect packet completion, the blocked judgment boundary, and the evidence sources."
      },
      {
        "label": "See the operating workflow proof",
        "href": "/proof/marketplace-workflow",
        "detail": "Review how cases and artifacts connect review to an inspectable lifecycle."
      }
    ],
    "faqs": [
      {
        "question": "Can AI approve Webflow templates automatically?",
        "answer": "Only after the owner defines that authority and evaluation demonstrates acceptable behavior across ordinary and exceptional cases. Evidence preparation can be valuable sooner; subjective Marketplace judgment should remain human when promotion criteria are not met."
      },
      {
        "question": "What is the most useful output from template-review automation?",
        "answer": "A source-linked packet that reduces context gathering, shows objective findings, exposes missing evidence, and keeps reviewer decisions editable. Its value is preparation quality, not the appearance of an authoritative score."
      },
      {
        "question": "How should historical template outcomes be used?",
        "answer": "Use them to discover patterns and build representative evaluations, while accounting for policy changes, reviewer variation, incomplete reasons, and exceptional decisions. Historical status alone may not explain why an outcome was correct."
      }
    ],
    "relatedSlugs": [
      "human-in-the-loop-ai",
      "webflow-marketplace-operations",
      "ai-agent-evaluation"
    ],
    "publishedTime": "2026-08-02",
    "modifiedTime": "2026-09-07"
  },
  {
    "slug": "workflow-mapping",
    "eyebrow": "Definition guide",
    "title": "How to map a task before choosing AI tools",
    "seoTitle": "AI Workflow Mapping: Signals, Decisions, and Proof",
    "description": "Follow one business task from what starts it to the result you need.",
    "keywords": [
      "AI workflow mapping",
      "workflow map",
      "automation discovery"
    ],
    "directAnswer": "Follow one business task from what starts it to the result you need. List the information, tools, people, approvals, exceptions, and recovery steps. Use that plan to decide what to build. Choose models and connections after the task and responsibilities are clear.",
    "fit": "Use a map when people agree that a process is painful but describe its owner, inputs, decisions, or successful completion differently, especially before committing to a platform.",
    "notFit": "Do not turn mapping into a months-long documentation project. If the team cannot select one real case and responsible owner, narrow the proposed workflow before adding more diagrams.",
    "signals": [
      "The process works through tribal knowledge, private spreadsheets, inboxes, or repeated context reconstruction.",
      "Vendors are being selected before anyone can state which decisions and records must remain owned.",
      "A pilot cannot be evaluated because success, exceptions, and authority were never defined."
    ],
    "steps": [
      {
        "title": "Follow a recent example",
        "detail": "Trace the event that started it, records opened, messages sent, decisions, actions, and saved results. Record delays and workarounds before drawing broader conclusions."
      },
      {
        "title": "Name the start, decision, and result",
        "detail": "Define what needs attention, which question needs judgment, who decides, and what record confirms completion. A notification or AI response alone may not show that the task is done."
      },
      {
        "title": "Mark approvals and exceptions",
        "detail": "Label each action automatic, approval-required, manual, or blocked. Include missing data, duplicates, conflicting records, provider failures, and unknown actions. Name the next person and step for each."
      },
      {
        "title": "Choose a small first test",
        "detail": "Choose a part you can safely repeat and compare with today’s results. Agree on who keeps accounts, data, rules, tests, logs, and instructions before selecting tools."
      }
    ],
    "artifacts": [
      {
        "title": "Typed workflow definition",
        "detail": "A versioned record names systems, events, objects, states, roles, decisions, tools, approvals, evidence requirements, and failure behavior."
      },
      {
        "title": "Authority boundary",
        "detail": "A readable matrix shows who may view, recommend, approve, execute, publish, correct, pause, and recover each stage of the handoff."
      },
      {
        "title": "Pilot acceptance plan",
        "detail": "Representative cases, baseline measures, success thresholds, known exclusions, observation period, owner, and promotion gate make the next commitment explicit."
      }
    ],
    "proofLinks": [
      {
        "label": "Use the public mapping surface",
        "href": "/map",
        "detail": "Open a workflow map and make owners, systems, approvals, and evidence visible."
      },
      {
        "label": "See how the service proceeds",
        "href": "/services",
        "detail": "Review the division between mapping, building, and controlled operation."
      }
    ],
    "faqs": [
      {
        "question": "How detailed should an AI workflow map be?",
        "answer": "It should be detailed enough to identify source records, owners, decisions, permissions, exceptions, evidence, and acceptance cases for one handoff. Add implementation detail only when it changes authority, risk, or testability."
      },
      {
        "question": "Who should participate in workflow mapping?",
        "answer": "Include the person who performs the work, the decision owner, the source-system owner, and anyone accountable for risk or customer impact. Executives can set priorities, but operators reveal the actual path and exceptions."
      },
      {
        "question": "Should a workflow map name specific AI vendors?",
        "answer": "Only where a vendor constraint materially affects data, identity, capability, cost, or recovery. Define the business and control contract first so a model or connector can be replaced without redesigning the operating intent."
      }
    ],
    "relatedSlugs": [
      "ai-workflow-automation",
      "ai-workflow-governance",
      "ai-workflow-observability"
    ],
    "publishedTime": "2026-08-02",
    "modifiedTime": "2026-09-07"
  },
  {
    "slug": "ai-workflow-observability",
    "eyebrow": "Operating evidence guide",
    "title": "How to see what your AI workflow did",
    "seoTitle": "AI Workflow Observability: Traces, Receipts, Recovery",
    "description": "Keep a work history that connects technical activity to the business task.",
    "keywords": [
      "AI workflow observability",
      "agent monitoring",
      "AI audit logs"
    ],
    "directAnswer": "Keep a work history that connects technical activity to the business task. Record the input, identity, rules and model versions, tools used, approvals, result identifiers, timing, and outcome. Alert someone when there is a problem they can resolve, such as a stalled approval, repeated failure, or incorrect result.",
    "fit": "Use this model when an agent or automation spans several systems and operators need to answer what happened, why it happened, whether it completed, and how to recover.",
    "notFit": "Raw model traces and infrastructure logs are not sufficient if they omit customer-safe identifiers, business state, decision ownership, external side effects, or the runbook action expected from an alert.",
    "signals": [
      "A tool reports success but the expected external record, publication, or customer state is missing.",
      "Operators receive alerts without enough context or authority to resolve the underlying case.",
      "The team cannot compare failures by workflow version, provider, policy, tenant, or outcome class."
    ],
    "steps": [
      {
        "title": "Define the record you need",
        "detail": "Choose identifiers and statuses that show the task from start to result. Include source links and dates. Minimize sensitive data and restrict access by role."
      },
      {
        "title": "Record decisions and failures",
        "detail": "Record model, prompt, policy, tool, and data-schema versions. Include access checks, approvals, retries, errors, and reasons for stopping. Distinguish inferred content from source facts."
      },
      {
        "title": "Check that external changes happened",
        "detail": "After a write, check the external identifier or status when practical. Keep queued, pending, draft, published, and reconciled results separate. A successful request may not mean the work is finished."
      },
      {
        "title": "Send alerts someone can act on",
        "detail": "Group alerts by impact, person responsible, urgency, and recovery action. Test dashboards and instructions with failed cases. Use the patterns to improve the system."
      }
    ],
    "artifacts": [
      {
        "title": "Workflow receipt schema",
        "detail": "A structured record connects case, source, identity, decision, policy, tools, approvals, external results, timestamps, privacy class, and final status."
      },
      {
        "title": "Operator exception view",
        "detail": "The view groups unresolved cases by owner and recovery action, shows source-linked evidence, and distinguishes retryable failures from decisions that need human judgment."
      },
      {
        "title": "Outcome reconciliation job",
        "detail": "A bounded check compares claimed completion with the authoritative external state and produces a correction, escalation, or verified-close receipt."
      }
    ],
    "proofLinks": [
      {
        "label": "Inspect the Proof product",
        "href": "/products/proof",
        "detail": "See how durable records close the loop between action and owned evidence."
      },
      {
        "label": "Review deterministic workflow receipts",
        "href": "/proof/marketplace-workflow",
        "detail": "See outcome classes and repeatable artifacts in a bounded example."
      }
    ],
    "faqs": [
      {
        "question": "What is the difference between AI tracing and workflow observability?",
        "answer": "Tracing explains model and tool execution. Workflow observability adds source identity, business state, policy, approval, external outcomes, ownership, and recovery so an operator can resolve the case rather than only inspect a technical span."
      },
      {
        "question": "What should an AI workflow alert contain?",
        "answer": "Include the case and tenant identifiers, affected business state, severity, safe evidence summary, likely boundary, responsible owner, allowed recovery action, and links to the receipt and runbook. Never place secrets in the alert."
      },
      {
        "question": "How long should AI workflow evidence be retained?",
        "answer": "Set retention by business, contractual, legal, privacy, and recovery needs for each evidence class. Keep identifiers and decision proof only as long as justified, restrict access, support deletion, and avoid retaining full sensitive prompts by default."
      }
    ],
    "relatedSlugs": [
      "ai-workflow-governance",
      "ai-agent-evaluation",
      "workflow-mapping"
    ],
    "publishedTime": "2026-08-02",
    "modifiedTime": "2026-09-07"
  }
];

const workflowPagesBySlug = new Map(workflowPages.map((page) => [page.slug, page]));

export function getWorkflowPage(slug: string): WorkflowPage | undefined {
  return workflowPagesBySlug.get(slug);
}
