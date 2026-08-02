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
    slug: 'mcp-server-development',
    eyebrow: 'MCP implementation guide',
    title: 'How to develop an MCP server that is safe to operate',
    seoTitle: 'MCP Server Development: An Operating Guide',
    description:
      'Learn how to scope, build, authorize, test, and hand off an MCP server without hiding business rules inside tool code.',
    keywords: ['MCP server development', 'Model Context Protocol', 'MCP tools', 'MCP resources'],
    directAnswer:
      'A production-ready MCP server is a controlled interface to an owned system, not merely a list of callable functions. Start with the records it may read, define each permitted action and approval boundary, then require evidence that every tool call either completed inside that boundary or stopped with a useful receipt.',
    fit: 'Use this approach when an assistant needs repeatable access to business data or actions and the organization must retain ownership of credentials, policy, logs, and recovery.',
    notFit:
      'Do not begin with a custom server when a read-only export answers the question, an established connector already provides the exact boundary, or nobody owns the source system after launch.',
    signals: [
      'The same manual lookup or action appears in more than one assistant session.',
      'Credentials, tenant identity, approvals, or audit evidence matter to the action.',
      'A failed call needs a defined retry, stop, or human handoff instead of a plausible chat response.'
    ],
    steps: [
      {
        title: 'Name the source of truth',
        detail:
          'List the exact records, owners, identifiers, freshness rules, and privacy classes the server will expose. A resource should preserve source identity and timestamps so the model cannot mistake a cached description for live business state.'
      },
      {
        title: 'Design narrow tools',
        detail:
          'Give each tool one business job, an explicit input schema, bounded output, and a documented failure state. Separate read operations from writes, and keep irreversible or high-impact actions behind an approval that the server can verify.'
      },
      {
        title: 'Bind identity and authority',
        detail:
          'Decide whether access belongs to a person, workspace, service account, or customer tenant. Validate that identity at execution time, request the smallest OAuth scopes, and reject any action whose entity binding is missing or ambiguous.'
      },
      {
        title: 'Replay and hand off',
        detail:
          'Test successful, denied, missing-evidence, stale-data, duplicate, and unknown-action cases. Package the schemas, runbook, rollback path, and representative receipts so another operator can inspect the server without reverse-engineering its code.'
      }
    ],
    artifacts: [
      {
        title: 'Tool and resource contract',
        detail:
          'A versioned catalog states what each primitive reads or changes, which identifiers it accepts, the scope it requires, and the structured result it returns.'
      },
      {
        title: 'Authority matrix',
        detail:
          'A compact policy names automatic actions, approval-required actions, blocked actions, and the owner who can change those rules.'
      },
      {
        title: 'Verification receipt set',
        detail:
          'Representative executions preserve source, request, decision, result, and failure evidence without leaking tokens or private record bodies.'
      }
    ],
    proofLinks: [
      {
        label: 'Inspect the owned stack boundary',
        href: '/stack',
        detail: 'See what remains in your accounts and operating record before choosing a runtime.'
      },
      {
        label: 'Review the security boundary',
        href: '/security',
        detail: 'See how identity, secrets, approvals, and evidence are separated.'
      }
    ],
    faqs: [
      {
        question: 'What should an MCP server expose first?',
        answer:
          'Expose the smallest read-only resource that resolves a repeated business question. It gives operators a way to validate identity, data shape, freshness, and privacy before granting an assistant any ability to change an external system.'
      },
      {
        question: 'How many tools should the first MCP release include?',
        answer:
          'There is no useful universal count. Include only the tools needed to complete one named workflow, and require a distinct test and authority rule for each. A small complete path is easier to evaluate than a broad catalog with unclear ownership.'
      },
      {
        question: 'Who owns an MCP server after delivery?',
        answer:
          'The client should own the accounts, source data, credential relationships, policy choices, deployment access, logs, and recovery procedure. A delivery partner can maintain the implementation, but should not become an invisible authorization dependency.'
      }
    ],
    relatedSlugs: ['mcp-security-oauth', 'mcp-vs-api', 'ai-workflow-observability'],
    publishedTime: '2026-08-02',
    modifiedTime: '2026-08-02'
  },
  {
    slug: 'ai-workflow-automation',
    eyebrow: 'Automation decision guide',
    title: 'How to automate an AI workflow without automating the ambiguity',
    seoTitle: 'AI Workflow Automation: Map Before You Build',
    description:
      'A practical guide to selecting, mapping, piloting, and operating one AI-assisted business handoff with explicit ownership.',
    keywords: ['AI workflow automation', 'business process automation', 'AI operations'],
    directAnswer:
      'Good AI workflow automation begins with one repeated handoff whose inputs, owner, decision, and acceptable result can be named. The system should prepare or execute only the parts with testable rules, route judgment to the right person, and preserve a record that explains what happened and what still needs attention.',
    fit: 'Use automation when the work repeats often enough to observe, the source systems are accessible, and a responsible operator can define success, exceptions, and the stop condition.',
    notFit:
      'Delay automation when every case is novel, the source records are unreliable, the team cannot name a decision owner, or a mistaken action would be hard to detect and reverse.',
    signals: [
      'People copy the same context between two or more systems on a regular cadence.',
      'A queue grows because evidence gathering takes longer than the actual decision.',
      'The team can describe a passing case, an exception, and the person who resolves that exception.'
    ],
    steps: [
      {
        title: 'Choose one handoff',
        detail:
          'Start where a named signal enters and a named person or system expects a result. Record the volume, delay, rework, and exception types before proposing technology so the pilot has a baseline that operators recognize.'
      },
      {
        title: 'Separate preparation from judgment',
        detail:
          'Mark which tasks gather facts, normalize records, or draft an option and which tasks commit money, publish content, change access, or interpret policy. Automate preparation first when decision quality is not yet proven.'
      },
      {
        title: 'Run representative cases',
        detail:
          'Select ordinary, edge, denied, missing-input, and duplicate cases. Compare outputs with the source records and operator expectations, documenting where the system asks for help instead of filling gaps with confident language.'
      },
      {
        title: 'Promote with controls',
        detail:
          'Define who can enable live actions, which metrics trigger review, how to pause execution, and how evidence is retained. Promotion should change an explicit operating state rather than quietly turning a prototype into production.'
      }
    ],
    artifacts: [
      {
        title: 'Workflow map',
        detail:
          'The map names the initiating signal, source records, decisions, owners, tool boundaries, exception paths, and proof expected at completion.'
      },
      {
        title: 'Case fixture pack',
        detail:
          'A reusable set of representative cases makes quality discussions concrete and prevents a polished demo from substituting for operational coverage.'
      },
      {
        title: 'Operating runbook',
        detail:
          'The runbook explains release state, approvals, monitoring, pause and rollback actions, escalation contacts, and the evidence needed for the next review.'
      }
    ],
    proofLinks: [
      {
        label: 'See the service path',
        href: '/services',
        detail:
          'Review how Map, Build, and Control divide definition, implementation, and operation.'
      },
      {
        label: 'Inspect a compiled workflow',
        href: '/proof/marketplace-workflow',
        detail: 'See a bounded shadow example with cases, contracts, and deterministic receipts.'
      }
    ],
    faqs: [
      {
        question: 'Which AI workflow should a company automate first?',
        answer:
          'Choose a frequent, bounded handoff with accessible records, a known owner, measurable delay or rework, and reversible actions. Avoid beginning with the company’s highest-stakes judgment simply because it sounds strategically important.'
      },
      {
        question: 'Does AI workflow automation require an autonomous agent?',
        answer:
          'No. Many valuable systems watch for a change, assemble evidence, draft a recommendation, and wait for a human decision. Autonomy is an authority choice, not a requirement for using models or tool connectivity.'
      },
      {
        question: 'When is an AI automation pilot ready for production?',
        answer:
          'It is ready only after representative cases pass, identity and tool permissions are bounded, exception ownership is staffed, monitoring and rollback exist, and the accountable operator explicitly accepts the remaining risk.'
      }
    ],
    relatedSlugs: ['workflow-mapping', 'human-in-the-loop-ai', 'ai-workflow-governance'],
    publishedTime: '2026-08-02',
    modifiedTime: '2026-08-02'
  },
  {
    slug: 'ai-workflow-governance',
    eyebrow: 'Governance operating guide',
    title: 'How to govern an AI workflow with artifacts instead of promises',
    seoTitle: 'AI Workflow Governance: Policies, Approvals, Proof',
    description:
      'Turn AI policy into versioned authority rules, approval paths, tests, receipts, and recovery procedures operators can inspect.',
    keywords: ['AI workflow governance', 'AI policy controls', 'governed automation'],
    directAnswer:
      'AI workflow governance is the set of enforceable rules and records that determine what a system may read, recommend, change, or escalate. Effective governance lives in schemas, permissions, approval states, tests, logs, and runbooks so operators can verify the boundary before and after an action—not only read a policy statement.',
    fit: 'Use this model when an AI-assisted process touches customer data, money, publication, access, regulated decisions, or any action whose authority must be explained later.',
    notFit:
      'A governance program is not useful if it produces a document nobody can connect to runtime behavior, or if every exception depends on an unavailable executive rather than an operating owner.',
    signals: [
      'Teams disagree about whether the assistant may act or only recommend.',
      'Approvals happen in chat but are not attached to the resulting external change.',
      'Operators cannot reconstruct which evidence, policy version, and identity produced a decision.'
    ],
    steps: [
      {
        title: 'Inventory authority',
        detail:
          'For each tool and record, name allowed reads, proposed changes, automatic changes, approval-required changes, and blocked actions. Include tenant and role constraints instead of assuming every authenticated user has equivalent authority.'
      },
      {
        title: 'Encode decision states',
        detail:
          'Represent pending, approved, denied, expired, insufficient-evidence, and unknown-action states explicitly. The runtime should fail closed when no rule matches and tell the operator what evidence or owner is missing.'
      },
      {
        title: 'Attach proof to execution',
        detail:
          'Preserve source references, policy version, approver identity, tool request, result identifiers, and timestamps. Keep sensitive payloads protected while retaining enough structure to audit and reproduce the decision path.'
      },
      {
        title: 'Review and recover',
        detail:
          'Schedule policy review around observed exceptions and business changes. Test pause, credential revocation, replay, data correction, and rollback procedures so governance remains useful when a provider or process changes.'
      }
    ],
    artifacts: [
      {
        title: 'Machine-readable policy pack',
        detail:
          'Versioned rules connect business language to tool names, roles, thresholds, approvals, evidence requirements, and explicit blocked states.'
      },
      {
        title: 'Approval record',
        detail:
          'The record binds the decision to a person or policy, a defined scope, supporting evidence, expiration, and the action that consumed it.'
      },
      {
        title: 'Recovery checklist',
        detail:
          'Operators receive tested instructions for pausing work, invalidating access, correcting state, notifying owners, and documenting the final disposition.'
      }
    ],
    proofLinks: [
      {
        label: 'Review the Control model',
        href: '/control',
        detail: 'See how Signal, Decision, and Proof support governed operation.'
      },
      {
        label: 'Read the bearer token policy',
        href: '/bearer-token-policy',
        detail: 'Inspect a concrete access-policy boundary and its operational limits.'
      }
    ],
    faqs: [
      {
        question: 'What is the minimum viable AI governance artifact?',
        answer:
          'For one workflow, start with an authority table that names each action, its allowed identity, required evidence, approval state, and failure behavior. Connect that table to tests and receipts before expanding into a broader governance program.'
      },
      {
        question: 'Can a prompt serve as an AI policy?',
        answer:
          'A prompt can explain intent, but it cannot by itself authenticate a user, enforce a scope, prove an approval, or reverse an external change. Pair judgment instructions with runtime permissions, validators, state, and observable evidence.'
      },
      {
        question: 'How often should AI workflow policies be reviewed?',
        answer:
          'Review after material tool, data, legal, organizational, or failure changes and on a cadence proportionate to risk. Use observed exceptions and denied actions as inputs, rather than updating policy only on a calendar.'
      }
    ],
    relatedSlugs: ['human-in-the-loop-ai', 'ai-agent-evaluation', 'ai-workflow-observability'],
    publishedTime: '2026-08-02',
    modifiedTime: '2026-08-02'
  },
  {
    slug: 'human-in-the-loop-ai',
    eyebrow: 'Approval design guide',
    title: 'How to design human-in-the-loop AI that respects the human',
    seoTitle: 'Human-in-the-Loop AI: Approval and Escalation Design',
    description:
      'Design AI-assisted review so people receive the evidence, options, authority, and time needed to make a real decision.',
    keywords: ['human in the loop AI', 'AI approval workflow', 'AI escalation'],
    directAnswer:
      'Human-in-the-loop AI works when the system assigns a specific decision to a specific role and presents the evidence needed to make it. The human must be able to approve, deny, correct, defer, or escalate without reconstructing context, and the system must preserve that decision as part of the operating record.',
    fit: 'Use human review when policy interpretation, customer consequence, irreversible action, uncertain evidence, or professional accountability makes automated commitment inappropriate.',
    notFit:
      'Adding a generic approval button is not meaningful oversight if the reviewer lacks source evidence, cannot change the recommendation, or faces a queue too large to examine responsibly.',
    signals: [
      'The system can prepare a case reliably but cannot justify final judgment across exceptions.',
      'Different roles own content quality, security, legal, financial, or customer-impact decisions.',
      'Reviewers spend most of their time finding context instead of evaluating the proposed action.'
    ],
    steps: [
      {
        title: 'Name the decision',
        detail:
          'Write the exact question the reviewer answers, the allowed outcomes, the scope of authority, and the deadline. Avoid asking a person to approve an entire process when only one bounded claim or action needs judgment.'
      },
      {
        title: 'Assemble an evidence packet',
        detail:
          'Present source links, relevant excerpts, validation results, policy rules, confidence limits, and the proposed change together. Distinguish observed facts from model-generated interpretation and highlight missing inputs.'
      },
      {
        title: 'Design correction and escalation',
        detail:
          'Let reviewers edit the recommendation, request more evidence, assign another owner, or stop the case. Capture a reason without forcing long prose for routine decisions, and make urgent exceptions visible without bypassing policy.'
      },
      {
        title: 'Measure reviewer reality',
        detail:
          'Track queue age, review time, correction frequency, disagreement, missed exceptions, and abandonment. Reduce automation or add staffing when the nominal human checkpoint becomes a rubber stamp under operational pressure.'
      }
    ],
    artifacts: [
      {
        title: 'Decision packet',
        detail:
          'A compact, source-linked view separates facts, recommendation, policy checks, uncertainty, missing evidence, and the exact action awaiting authority.'
      },
      {
        title: 'Role and escalation map',
        detail:
          'The map names the primary reviewer, backup, specialist escalations, response target, and what the system does while the decision is pending.'
      },
      {
        title: 'Review quality receipt',
        detail:
          'The receipt records the presented evidence, reviewer outcome, corrections, reason code, action result, and time needed without claiming that approval alone proves quality.'
      }
    ],
    proofLinks: [
      {
        label: 'Read the template review field report',
        href: '/field-reports/template-review',
        detail: 'See why successful evidence preparation did not justify automated judgment.'
      },
      {
        label: 'Inspect the Decision surface',
        href: '/products/decision',
        detail: 'See how a governed system routes judgment and preserves the boundary.'
      }
    ],
    faqs: [
      {
        question: 'Which AI decisions should always involve a person?',
        answer:
          'Require a responsible person where law, policy, professional duty, irreversible impact, unclear evidence, or meaningful customer consequence demands accountable judgment. The boundary should be based on the action and context, not the model brand.'
      },
      {
        question: 'How can teams prevent approval fatigue?',
        answer:
          'Narrow the decision, group related evidence, remove low-value notifications, automate only well-proven cases, use risk-based thresholds, and measure queue health. If reviewers routinely approve without reading, reduce volume or authority.'
      },
      {
        question: 'Does human approval make an AI system safe?',
        answer:
          'Not automatically. Safety also depends on source quality, reviewer competence, interface clarity, available time, permission enforcement, monitoring, and recovery. Approval is one control whose effectiveness must be tested in operation.'
      }
    ],
    relatedSlugs: ['ai-workflow-governance', 'ai-agent-evaluation', 'webflow-template-review'],
    publishedTime: '2026-08-02',
    modifiedTime: '2026-08-02'
  },
  {
    slug: 'ai-agent-evaluation',
    eyebrow: 'Release evidence guide',
    title: 'How to evaluate an AI agent before granting more authority',
    seoTitle: 'AI Agent Evaluation: Cases, Gates, and Release Evidence',
    description:
      'Evaluate an AI agent with representative cases, explicit outcomes, promotion gates, and operating evidence tied to real authority.',
    keywords: ['AI agent evaluation', 'agent evals', 'AI release gates'],
    directAnswer:
      'Evaluate an AI agent against the workflow it will operate, not only generic model benchmarks. Build cases from ordinary work, exceptions, denied actions, missing evidence, stale records, and adversarial inputs; score both task quality and boundary behavior; then grant authority only through an explicit release gate with rollback.',
    fit: 'Use workflow-specific evaluation whenever an agent reads private context, calls tools, recommends consequential actions, or moves from drafting toward external execution.',
    notFit:
      'A single demonstration, aggregate accuracy score, or vendor benchmark cannot establish readiness when failures have different costs or when the agent’s permissions differ from the test environment.',
    signals: [
      'Stakeholders describe the agent as working but cannot name the cases it passed.',
      'A new tool, prompt, model, policy, or data source can change behavior after launch.',
      'The team needs a repeatable reason to expand, hold, or reduce the agent’s authority.'
    ],
    steps: [
      {
        title: 'Define outcome classes',
        detail:
          'Name pass, needs-human, blocked, insufficient-evidence, tool-failure, and unknown-action outcomes. Set quality criteria for the answer and safety criteria for the path taken, including whether the agent stopped at the right boundary.'
      },
      {
        title: 'Build representative fixtures',
        detail:
          'Sample real patterns with privacy controls, preserving difficult exceptions instead of only average cases. Version inputs and expected evidence so regressions can be compared across model, prompt, policy, and tool changes.'
      },
      {
        title: 'Run blind and inspect traces',
        detail:
          'Keep expected outcomes hidden from the executing agent, score with deterministic checks where possible, and have qualified reviewers examine disputed judgments. Inspect tool calls and stops, not merely final prose.'
      },
      {
        title: 'Gate promotion and monitor drift',
        detail:
          'Tie each release state to allowed actions, required scores, unresolved risks, owner approval, and rollback. Continue sampling live receipts because a passing fixture set does not freeze provider behavior or business context.'
      }
    ],
    artifacts: [
      {
        title: 'Versioned evaluation set',
        detail:
          'Fixtures identify source pattern, expected outcome class, required evidence, prohibited actions, privacy treatment, and why the case matters.'
      },
      {
        title: 'Promotion decision',
        detail:
          'A signed record states the tested versions, scores by case class, known misses, granted authority, monitoring plan, owner, and rollback trigger.'
      },
      {
        title: 'Regression report',
        detail:
          'Each material system change is compared against prior behavior, with new failures routed to a named owner before the release can expand authority.'
      }
    ],
    proofLinks: [
      {
        label: 'Inspect deterministic workflow proof',
        href: '/proof/marketplace-workflow',
        detail: 'See representative outcomes and repeatable compiled artifacts.'
      },
      {
        label: 'Review a blocked promotion',
        href: '/field-reports/template-review',
        detail: 'See how an exceptional-case miss kept judgment with a person.'
      }
    ],
    faqs: [
      {
        question: 'How many cases are enough for an AI agent evaluation?',
        answer:
          'No fixed count proves readiness. Cover every meaningful outcome and risk class, then add cases until new samples stop revealing major behavior gaps. High-consequence or diverse workflows require broader evidence than a narrow drafting task.'
      },
      {
        question: 'Should AI agent evaluations use production data?',
        answer:
          'Use representative patterns while applying privacy, access, and retention rules. De-identification or synthetic fixtures may be appropriate, but verify that they preserve the edge conditions and source relationships the agent will actually encounter.'
      },
      {
        question: 'What should happen when an agent fails one rare case?',
        answer:
          'Assess the consequence and whether the failure reveals a general boundary weakness. Keep or reduce authority, add the case to regression coverage, fix the relevant data, policy, tool, or judgment layer, and require a new promotion decision.'
      }
    ],
    relatedSlugs: ['ai-workflow-governance', 'human-in-the-loop-ai', 'ai-workflow-observability'],
    publishedTime: '2026-08-02',
    modifiedTime: '2026-08-02'
  },
  {
    slug: 'mcp-security-oauth',
    eyebrow: 'Identity and access guide',
    title: 'How to secure MCP access with OAuth and explicit entity binding',
    seoTitle: 'MCP Security and OAuth: Scope, Identity, Evidence',
    description:
      'Secure an MCP connection by binding user, tenant, scopes, tools, approvals, secrets, and audit evidence across the full execution path.',
    keywords: ['MCP security', 'MCP OAuth', 'Model Context Protocol authentication'],
    directAnswer:
      'Secure MCP access by authenticating the caller, binding that identity to the correct customer or workspace, issuing only the scopes required for one workflow, and checking authorization again when each tool executes. Keep secrets server-side, separate reads from writes, and record decisions without exposing tokens or sensitive payloads.',
    fit: 'Use delegated OAuth when a person or customer must authorize access to their own third-party account and the runtime needs revocable, scoped credentials tied to that identity.',
    notFit:
      'Do not force user OAuth onto a service-owned batch process with no user delegation, and do not use a shared static bearer token as a substitute for tenant-aware authorization.',
    signals: [
      'The same MCP endpoint serves more than one user, client, workspace, or data boundary.',
      'A provider connection can be valid while still belonging to the wrong entity inside the broker.',
      'Operators need to revoke access or explain which scopes and identity authorized a tool call.'
    ],
    steps: [
      {
        title: 'Model identities and entities',
        detail:
          'Document the person, application, provider account, customer tenant, and internal workspace identifiers. Define which mapping is authoritative and reject connections that authenticate successfully but cannot be bound to the requested entity.'
      },
      {
        title: 'Request minimal scopes',
        detail:
          'Map each resource and tool to provider scopes and begin read-only where possible. Explain the requested access in user-facing language, and require a new consent path before adding permissions rather than silently broadening an existing grant.'
      },
      {
        title: 'Enforce at execution',
        detail:
          'Validate token audience, issuer, expiry, connection status, entity binding, role, tool policy, and approval state close to the action. Never rely solely on a successful login or on instructions inside the model context.'
      },
      {
        title: 'Protect and revoke',
        detail:
          'Store credentials in an approved secret boundary, redact logs, rotate service secrets, support user disconnect, and test provider revocation. Preserve identifiers and outcomes needed for audit without retaining unnecessary sensitive content.'
      }
    ],
    artifacts: [
      {
        title: 'Identity binding record',
        detail:
          'The record connects internal user and tenant identifiers to the provider account and authorization grant, with status, timestamps, and revocation state.'
      },
      {
        title: 'Scope-to-tool matrix',
        detail:
          'Each exposed operation lists its provider scopes, internal role, approval need, data sensitivity, and response redaction rules.'
      },
      {
        title: 'Access audit receipt',
        detail:
          'A safe receipt captures caller, tenant, policy version, connection identifier, tool, decision, and result status while excluding bearer credentials and private bodies.'
      }
    ],
    proofLinks: [
      {
        label: 'Inspect Agency security',
        href: '/security',
        detail: 'Review identity, secrets, least privilege, and operational evidence boundaries.'
      },
      {
        label: 'Read the token policy',
        href: '/bearer-token-policy',
        detail: 'See where bearer access is accepted and where it is intentionally insufficient.'
      }
    ],
    faqs: [
      {
        question: 'Does OAuth make an MCP server secure by itself?',
        answer:
          'No. OAuth can establish delegated access, but the server must still validate tokens, bind the right tenant, enforce tool-specific policy, protect secrets, limit data, handle revocation, and preserve evidence for each action.'
      },
      {
        question: 'Why can an MCP connection succeed for the wrong user?',
        answer:
          'Authentication may prove control of a provider account while the broker or application maps that grant to the wrong internal user or workspace. Verify the full identity chain and entity identifiers before changing scopes or tool code.'
      },
      {
        question: 'When is a static bearer token acceptable for MCP access?',
        answer:
          'It can be appropriate for a tightly bounded service-to-service control with secure storage, rotation, narrow policy, and no need for user delegation. It should not impersonate multiple customers or replace revocable per-user authorization.'
      }
    ],
    relatedSlugs: ['mcp-server-development', 'ai-workflow-governance', 'mcp-vs-api'],
    publishedTime: '2026-08-02',
    modifiedTime: '2026-08-02'
  },
  {
    slug: 'mcp-vs-api',
    eyebrow: 'Architecture comparison',
    title: 'MCP vs API: choose the interface by the consumer and control boundary',
    seoTitle: 'MCP vs API: When to Use Each Interface',
    description:
      'Compare MCP and conventional APIs by consumer, discovery, context, authorization, stability, observability, and operating ownership.',
    keywords: ['MCP vs API', 'Model Context Protocol vs REST API', 'AI tool integration'],
    directAnswer:
      'Use an API as the stable system interface for software clients and use MCP when an AI host needs a discoverable, context-rich way to consume selected resources, tools, or prompts. MCP usually sits on top of owned APIs and data access; it does not remove the need for authentication, authorization, validation, rate limits, idempotency, or audit evidence.',
    fit: 'Choose MCP when multiple compatible AI hosts need to discover and use a bounded capability with descriptions and structured context, while the organization keeps an independent source service underneath.',
    notFit:
      'Choose a direct API or internal function when the consumer is deterministic application code, latency and throughput dominate, or exposing model-oriented discovery adds no useful interoperability.',
    signals: [
      'The capability should be usable from more than one assistant or agent host.',
      'The consumer benefits from resource descriptions and tool schemas at discovery time.',
      'The business service already has or needs an interface independent of any model host.'
    ],
    steps: [
      {
        title: 'Identify the consumer',
        detail:
          'List browsers, backend jobs, partner systems, AI hosts, and human operators separately. A single business capability may need a stable API for applications and a narrower MCP adapter for assistant consumption.'
      },
      {
        title: 'Place the business rule',
        detail:
          'Keep validation, permissions, idempotency, and state transitions in the owned service or policy layer. The MCP adapter should translate a model-facing request into that controlled interface, not fork the business logic.'
      },
      {
        title: 'Compare operational needs',
        detail:
          'Assess discovery, compatibility, streaming, batch size, latency, versioning, caching, rate limits, retries, tenant isolation, and traceability. Choose the simplest interface that preserves the required control and service quality.'
      },
      {
        title: 'Test both boundaries',
        detail:
          'Verify the underlying service with deterministic integration tests, then test the MCP resource or tool through a real compatible host. Confirm that errors remain structured and that the adapter cannot expand authority beyond the service contract.'
      }
    ],
    artifacts: [
      {
        title: 'Consumer and interface map',
        detail:
          'A diagram ties each consumer to the API, MCP adapter, data source, identity boundary, and owning team, revealing duplicated logic or accidental coupling.'
      },
      {
        title: 'Capability contract',
        detail:
          'The contract defines business inputs, outputs, errors, side effects, idempotency, service limits, and audit fields independently of the transport used by a client.'
      },
      {
        title: 'Compatibility test matrix',
        detail:
          'Tests cover direct service calls and supported MCP hosts, including discovery, schemas, authorization failures, partial outages, timeouts, and representative successful cases.'
      }
    ],
    proofLinks: [
      {
        label: 'See the tool-stack boundary',
        href: '/partners',
        detail:
          'Understand how application, runtime, intelligence, approval, and evidence layers divide ownership.'
      },
      {
        label: 'Review what the client keeps',
        href: '/stack',
        detail: 'See why the owned service boundary matters beyond a particular interface.'
      }
    ],
    faqs: [
      {
        question: 'Does MCP replace REST or GraphQL APIs?',
        answer:
          'Usually not. MCP gives AI hosts a standard consumption interface, while REST, GraphQL, RPC, queues, or database access may still power the owned service beneath it. The best layering avoids duplicating business rules in the adapter.'
      },
      {
        question: 'Can the same capability support both MCP and an API?',
        answer:
          'Yes. Put the capability and policy in a shared service, then expose purpose-built adapters. The API can serve deterministic clients while MCP supplies model-oriented discovery and structured invocation for compatible hosts.'
      },
      {
        question: 'Is MCP only useful for tool calls?',
        answer:
          'No. MCP can expose resources for context and prompts for reusable interaction patterns as well as tools for actions. Prefer the least powerful primitive that completes the consumer’s job.'
      }
    ],
    relatedSlugs: ['mcp-server-development', 'mcp-security-oauth', 'ai-workflow-automation'],
    publishedTime: '2026-08-02',
    modifiedTime: '2026-08-02'
  },
  {
    slug: 'webflow-marketplace-operations',
    eyebrow: 'Marketplace operations guide',
    title: 'How to operate a Webflow Marketplace review system',
    seoTitle: 'Webflow Marketplace Operations: A Governed Workflow',
    description:
      'Map submissions, evidence, review, approvals, publication, exceptions, and monitoring into one inspectable Marketplace operating system.',
    keywords: [
      'Webflow Marketplace operations',
      'Marketplace review workflow',
      'Webflow operations'
    ],
    directAnswer:
      'A reliable Webflow Marketplace operation treats submission, validation, specialist review, approval, publication, and monitoring as distinct states with distinct owners. Automate evidence preparation and objective checks first, keep policy judgment with qualified reviewers until evaluation earns promotion, and attach every transition to a durable record.',
    fit: 'Use this system when volume, multiple asset types, reviewer specialization, policy changes, and publication consequences make ad hoc queue handling hard to inspect or improve.',
    notFit:
      'Do not force every review lane into one automatic decision rule when apps, templates, libraries, and partners have different evidence, authority, and customer-impact boundaries.',
    signals: [
      'Review context is scattered across submissions, messages, dashboards, and reviewer memory.',
      'Objective validation repeats while nuanced quality or policy judgment remains specialist work.',
      'Teams cannot trace a published item back to the evidence, approval, and version that justified it.'
    ],
    steps: [
      {
        title: 'Model the lifecycle',
        detail:
          'Define asset types, submission versions, validation states, reviewer assignments, requests for change, approvals, publication, incidents, and retirement. Name which system owns each state and which events may advance it.'
      },
      {
        title: 'Compile evidence packets',
        detail:
          'Collect structured metadata, automated checks, screenshots, source links, prior decisions, and policy references into a reviewable packet. Mark unavailable or stale evidence instead of presenting an incomplete packet as ready.'
      },
      {
        title: 'Route specialist judgment',
        detail:
          'Assign decisions by asset type, risk, policy area, and reviewer authority. Preserve corrections and escalation reasons, and keep publication permissions separate from evidence collection or recommendation generation.'
      },
      {
        title: 'Prove and monitor transitions',
        detail:
          'Record hashes or version identifiers, decision owner, policy version, resulting state, and publication receipt. Watch post-publication signals and route incidents back to the exact item and approval history.'
      }
    ],
    artifacts: [
      {
        title: 'Lifecycle state model',
        detail:
          'A versioned model defines legal transitions, required evidence, responsible roles, and blocked states for every supported Marketplace asset type.'
      },
      {
        title: 'Reviewer packet schema',
        detail:
          'The schema keeps objective checks, source artifacts, model analysis, prior history, missing evidence, and human decision fields distinguishable.'
      },
      {
        title: 'Publication receipt',
        detail:
          'The receipt ties the published identifier and version to the approved packet, authorized publisher, timestamp, and monitoring responsibility.'
      }
    ],
    proofLinks: [
      {
        label: 'Inspect the Marketplace workflow proof',
        href: '/proof/marketplace-workflow',
        detail:
          'See the versioned map, compiled contracts, representative cases, and deterministic result.'
      },
      {
        label: 'Read the template review field report',
        href: '/field-reports/template-review',
        detail: 'See the measured boundary between evidence preparation and reviewer judgment.'
      }
    ],
    faqs: [
      {
        question: 'Which part of Marketplace review is best to automate first?',
        answer:
          'Begin with evidence collection, metadata normalization, completeness checks, duplicate detection, and other objective validations. These reduce reviewer search time while leaving nuanced policy and quality judgment with the accountable specialist.'
      },
      {
        question: 'How should Marketplace exceptions be handled?',
        answer:
          'Represent exceptions as explicit states with a reason, evidence requirement, specialist owner, deadline, and allowed next actions. Do not let an unusual case borrow approval from a nearby routine case.'
      },
      {
        question: 'What proves a Marketplace item was properly published?',
        answer:
          'A useful receipt connects the exact submitted version, completed validations, human approval, publisher identity, external item identifier, publication timestamp, and monitoring owner. A success message alone is not enough.'
      }
    ],
    relatedSlugs: ['webflow-app-review', 'webflow-template-review', 'ai-workflow-observability'],
    publishedTime: '2026-08-02',
    modifiedTime: '2026-08-02'
  },
  {
    slug: 'webflow-app-review',
    eyebrow: 'App review guide',
    title: 'How to prepare a Webflow app for review without losing the operating boundary',
    seoTitle: 'Webflow App Review: Evidence and Release Readiness',
    description:
      'Prepare a Webflow app review packet that connects product behavior, permissions, privacy, installation, failure states, and release evidence.',
    keywords: ['Webflow app review', 'Webflow Marketplace app', 'app submission checklist'],
    directAnswer:
      'Prepare a Webflow app for review by proving the exact installation and user path, explaining every permission and external service, testing empty, denied, disconnected, and failure states, and binding screenshots and documentation to the submitted version. Review readiness is a product and operating claim, not a checklist of marketing assets.',
    fit: 'Use this approach for Marketplace apps, Designer extensions, data clients, or integrations whose review depends on permissions, user experience, support, privacy, and repeatable installation behavior.',
    notFit:
      'A polished demo is not a substitute for an installable submitted build, and a locally successful API call does not prove the reviewer can authorize, configure, and use the app in the review environment.',
    signals: [
      'The app crosses Webflow, an external provider, and a hosted runtime with separate identities.',
      'Permissions or data handling are hard to infer from the visible product path.',
      'A reviewer must reproduce setup and failure behavior without developer assistance.'
    ],
    steps: [
      {
        title: 'Freeze the review candidate',
        detail:
          'Record the submitted version, deployment identity, Webflow configuration, external endpoints, privacy policy, support route, and test account instructions. Ensure every screenshot and statement refers to that same candidate.'
      },
      {
        title: 'Explain access and data',
        detail:
          'Map OAuth scopes, site permissions, data categories, storage locations, subprocessors, retention, deletion, and disconnect behavior. Use plain language that matches both implementation and consent screens.'
      },
      {
        title: 'Rehearse the reviewer journey',
        detail:
          'Install from the permitted review path and test onboarding, primary job, empty state, denied consent, expired session, disconnected provider, invalid input, retry, and uninstall. Capture evidence from the reviewer-visible surface.'
      },
      {
        title: 'Package support and release proof',
        detail:
          'Provide concise setup steps, known limits, troubleshooting, support ownership, monitoring, and rollback. Keep production publication separate from review approval and verify the listed version again after any requested change.'
      }
    ],
    artifacts: [
      {
        title: 'Review candidate manifest',
        detail:
          'The manifest binds source revision, deployment, app configuration, requested permissions, external services, documentation, screenshots, and submission identifiers.'
      },
      {
        title: 'Reviewer journey evidence',
        detail:
          'A reproducible sequence shows installation, consent, primary task, key failure states, disconnect, and uninstall from the same build the reviewer receives.'
      },
      {
        title: 'Release and support runbook',
        detail:
          'The runbook names monitoring, incident response, customer support, version changes, rollback, credential rotation, and the person responsible after approval.'
      }
    ],
    proofLinks: [
      {
        label: 'See the owned tool stack',
        href: '/partners',
        detail:
          'Understand the identity and runtime boundaries that an app review must make legible.'
      },
      {
        label: 'Review Agency security',
        href: '/security',
        detail:
          'Inspect the permission, secret, evidence, and recovery expectations behind delivery.'
      }
    ],
    faqs: [
      {
        question: 'What evidence should accompany a Webflow app submission?',
        answer:
          'Provide version-bound installation steps, permission explanations, privacy and support links, reviewer credentials if allowed, primary and failure-path evidence, external-service details, and a way to identify the exact deployed candidate.'
      },
      {
        question: 'How should OAuth be tested before Webflow app review?',
        answer:
          'Test first consent, repeat consent, denial, expired sessions, wrong account or site, provider disconnect, revoked grants, and app uninstall. Confirm user-facing scope language and verify that revoked access actually stops protected operations.'
      },
      {
        question: 'Does Marketplace approval prove the live app works for every customer?',
        answer:
          'No. Approval establishes a review decision for a submitted candidate. The owner must still verify publication, installation, runtime health, support readiness, provider changes, and customer-specific permissions after release.'
      }
    ],
    relatedSlugs: ['webflow-marketplace-operations', 'mcp-security-oauth', 'ai-agent-evaluation'],
    publishedTime: '2026-08-02',
    modifiedTime: '2026-08-02'
  },
  {
    slug: 'webflow-template-review',
    eyebrow: 'Template review guide',
    title: 'How to improve Webflow template review without replacing the reviewer',
    seoTitle: 'Webflow Template Review: Evidence Before Judgment',
    description:
      'Prepare source-linked template evidence, objective checks, and exception context while keeping subjective quality decisions accountable.',
    keywords: [
      'Webflow template review',
      'template quality review',
      'Webflow Marketplace templates'
    ],
    directAnswer:
      'Improve Webflow template review by automating repeatable evidence collection and objective checks while keeping subjective quality and policy decisions with a qualified reviewer until evaluation proves otherwise. The packet should identify the exact template version, expose missing evidence, and preserve the reviewer’s corrections and final disposition.',
    fit: 'Use this pattern when reviewers repeatedly inspect structure, responsiveness, accessibility, licensing, content, and policy context but exceptional quality decisions remain nuanced.',
    notFit:
      'Do not train a broad automated judge from noisy historical outcomes and then treat average agreement as permission to approve or reject new templates without exceptional-case evidence.',
    signals: [
      'Reviewers spend substantial effort opening the same sources and reconstructing the same checklist context.',
      'Objective findings are useful but do not consistently explain approval, iteration, rejection, or policy outcomes.',
      'The team needs faster preparation while preserving specialist judgment and a defensible decision trail.'
    ],
    steps: [
      {
        title: 'Bind the submitted version',
        detail:
          'Identify the template, submission, preview, files, author, timestamps, and policy version. Reject or flag packets whose sources cannot be tied to the exact review candidate rather than silently using the latest available page.'
      },
      {
        title: 'Collect objective evidence',
        detail:
          'Run structural, responsive, accessibility, link, asset, licensing, and content checks that produce source references. Separate missing access from a failed check and avoid converting a heuristic into a policy decision.'
      },
      {
        title: 'Present the review boundary',
        detail:
          'Group facts, detected issues, prior context, and unresolved questions by checklist area. Make exceptional examples visible and state which conclusions are suggestions rather than official Marketplace determinations.'
      },
      {
        title: 'Capture decision and learning',
        detail:
          'Record the human outcome, requested changes, reason codes, corrections to the packet, and time spent. Add missed patterns to fixtures while keeping historical labels distinct from verified policy ground truth.'
      }
    ],
    artifacts: [
      {
        title: 'Version-bound evidence packet',
        detail:
          'The packet links each observation to its source, timestamp, check, and candidate version, with unavailable inputs and model inferences plainly marked.'
      },
      {
        title: 'Checklist coverage map',
        detail:
          'Each review area shows which checks are deterministic, which require specialist judgment, which evidence is missing, and who owns the final decision.'
      },
      {
        title: 'Reviewer correction log',
        detail:
          'Corrections, disagreements, exceptional cases, and decisions become evaluation evidence without being mistaken for a fully reliable automated label set.'
      }
    ],
    proofLinks: [
      {
        label: 'Read the measured field report',
        href: '/field-reports/template-review',
        detail:
          'Inspect packet completion, the blocked judgment boundary, and the evidence sources.'
      },
      {
        label: 'See the operating workflow proof',
        href: '/proof/marketplace-workflow',
        detail: 'Review how cases and artifacts connect review to an inspectable lifecycle.'
      }
    ],
    faqs: [
      {
        question: 'Can AI approve Webflow templates automatically?',
        answer:
          'Only after the owner defines that authority and evaluation demonstrates acceptable behavior across ordinary and exceptional cases. Evidence preparation can be valuable sooner; subjective Marketplace judgment should remain human when promotion criteria are not met.'
      },
      {
        question: 'What is the most useful output from template-review automation?',
        answer:
          'A source-linked packet that reduces context gathering, shows objective findings, exposes missing evidence, and keeps reviewer decisions editable. Its value is preparation quality, not the appearance of an authoritative score.'
      },
      {
        question: 'How should historical template outcomes be used?',
        answer:
          'Use them to discover patterns and build representative evaluations, while accounting for policy changes, reviewer variation, incomplete reasons, and exceptional decisions. Historical status alone may not explain why an outcome was correct.'
      }
    ],
    relatedSlugs: ['human-in-the-loop-ai', 'webflow-marketplace-operations', 'ai-agent-evaluation'],
    publishedTime: '2026-08-02',
    modifiedTime: '2026-08-02'
  },
  {
    slug: 'workflow-mapping',
    eyebrow: 'Definition guide',
    title: 'How to map an AI workflow before choosing the tools',
    seoTitle: 'AI Workflow Mapping: Signals, Decisions, and Proof',
    description:
      'Map one AI-assisted workflow by naming its trigger, records, owners, decisions, actions, exceptions, evidence, and recovery path.',
    keywords: ['AI workflow mapping', 'workflow map', 'automation discovery'],
    directAnswer:
      'Map an AI workflow by tracing one business handoff from the signal that starts it to the decision it requires and the proof that closes it. Name source records, owners, allowed actions, approvals, exceptions, system boundaries, and recovery before selecting models or connectors; the map becomes the contract for build and operation.',
    fit: 'Use a map when people agree that a process is painful but describe its owner, inputs, decisions, or successful completion differently, especially before committing to a platform.',
    notFit:
      'Do not turn mapping into a months-long documentation project. If the team cannot select one real case and responsible owner, narrow the proposed workflow before adding more diagrams.',
    signals: [
      'The process works through tribal knowledge, private spreadsheets, inboxes, or repeated context reconstruction.',
      'Vendors are being selected before anyone can state which decisions and records must remain owned.',
      'A pilot cannot be evaluated because success, exceptions, and authority were never defined.'
    ],
    steps: [
      {
        title: 'Choose a real case',
        detail:
          'Start with a recent example and follow the initiating event, records opened, messages sent, judgments made, actions taken, and evidence saved. Record delays, rework, and workarounds without generalizing too early.'
      },
      {
        title: 'Name signal, decision, and proof',
        detail:
          'Define what change starts attention, which question requires judgment, who owns it, and what durable evidence confirms completion. Distinguish a notification from a signal and an assistant response from proof.'
      },
      {
        title: 'Mark authority and exceptions',
        detail:
          'For every action, state automatic, approval-required, manual, or blocked. Add missing-data, duplicate, conflicting-record, provider-failure, and unknown-action paths, with a named owner and expected next step.'
      },
      {
        title: 'Select the smallest pilot',
        detail:
          'Choose the bounded portion that can be replayed safely and measured against the observed baseline. Decide which accounts, data, policies, tests, logs, and runbooks the client keeps before choosing the implementation stack.'
      }
    ],
    artifacts: [
      {
        title: 'Typed workflow definition',
        detail:
          'A versioned record names systems, events, objects, states, roles, decisions, tools, approvals, evidence requirements, and failure behavior.'
      },
      {
        title: 'Authority boundary',
        detail:
          'A readable matrix shows who may view, recommend, approve, execute, publish, correct, pause, and recover each stage of the handoff.'
      },
      {
        title: 'Pilot acceptance plan',
        detail:
          'Representative cases, baseline measures, success thresholds, known exclusions, observation period, owner, and promotion gate make the next commitment explicit.'
      }
    ],
    proofLinks: [
      {
        label: 'Use the public mapping surface',
        href: '/map',
        detail: 'Open a workflow map and make owners, systems, approvals, and evidence visible.'
      },
      {
        label: 'See how the service proceeds',
        href: '/services',
        detail: 'Review the division between mapping, building, and controlled operation.'
      }
    ],
    faqs: [
      {
        question: 'How detailed should an AI workflow map be?',
        answer:
          'It should be detailed enough to identify source records, owners, decisions, permissions, exceptions, evidence, and acceptance cases for one handoff. Add implementation detail only when it changes authority, risk, or testability.'
      },
      {
        question: 'Who should participate in workflow mapping?',
        answer:
          'Include the person who performs the work, the decision owner, the source-system owner, and anyone accountable for risk or customer impact. Executives can set priorities, but operators reveal the actual path and exceptions.'
      },
      {
        question: 'Should a workflow map name specific AI vendors?',
        answer:
          'Only where a vendor constraint materially affects data, identity, capability, cost, or recovery. Define the business and control contract first so a model or connector can be replaced without redesigning the operating intent.'
      }
    ],
    relatedSlugs: ['ai-workflow-automation', 'ai-workflow-governance', 'ai-workflow-observability'],
    publishedTime: '2026-08-02',
    modifiedTime: '2026-08-02'
  },
  {
    slug: 'ai-workflow-observability',
    eyebrow: 'Operating evidence guide',
    title: 'How to observe an AI workflow with evidence operators can use',
    seoTitle: 'AI Workflow Observability: Traces, Receipts, Recovery',
    description:
      'Observe AI-assisted work through source-aware traces, decision receipts, outcome checks, alerts, and recovery actions tied to business state.',
    keywords: ['AI workflow observability', 'agent monitoring', 'AI audit logs'],
    directAnswer:
      'AI workflow observability connects technical execution to the business case being handled. Preserve the source event, identity, policy and model versions, tool actions, approvals, external result identifiers, timing, and final disposition; then alert on states an operator can resolve, such as stalled approval, missing evidence, repeated failure, or result mismatch.',
    fit: 'Use this model when an agent or automation spans several systems and operators need to answer what happened, why it happened, whether it completed, and how to recover.',
    notFit:
      'Raw model traces and infrastructure logs are not sufficient if they omit customer-safe identifiers, business state, decision ownership, external side effects, or the runbook action expected from an alert.',
    signals: [
      'A tool reports success but the expected external record, publication, or customer state is missing.',
      'Operators receive alerts without enough context or authority to resolve the underlying case.',
      'The team cannot compare failures by workflow version, provider, policy, tenant, or outcome class.'
    ],
    steps: [
      {
        title: 'Define the business receipt',
        detail:
          'Name the identifiers and states needed to prove the workflow’s job, from initiating signal through decision and external result. Include source references and timestamps while minimizing sensitive content and restricting access by role.'
      },
      {
        title: 'Instrument decision boundaries',
        detail:
          'Record model, prompt, policy, tool, and schema versions; authorization and approval outcomes; retries; structured errors; and stop reasons. Mark inferred content separately from facts read from an owned source.'
      },
      {
        title: 'Verify side effects',
        detail:
          'After a write, read back the external identifier or state when practical. Treat queued, pending, draft, published, and reconciled as separate outcomes so a successful request is not mistaken for completed business work.'
      },
      {
        title: 'Route actionable exceptions',
        detail:
          'Group alerts by business consequence, owner, urgency, and recovery action. Test dashboards and runbooks with failed cases, and review patterns to improve data, automation, or policy rather than merely increasing log volume.'
      }
    ],
    artifacts: [
      {
        title: 'Workflow receipt schema',
        detail:
          'A structured record connects case, source, identity, decision, policy, tools, approvals, external results, timestamps, privacy class, and final status.'
      },
      {
        title: 'Operator exception view',
        detail:
          'The view groups unresolved cases by owner and recovery action, shows source-linked evidence, and distinguishes retryable failures from decisions that need human judgment.'
      },
      {
        title: 'Outcome reconciliation job',
        detail:
          'A bounded check compares claimed completion with the authoritative external state and produces a correction, escalation, or verified-close receipt.'
      }
    ],
    proofLinks: [
      {
        label: 'Inspect the Proof product',
        href: '/products/proof',
        detail: 'See how durable records close the loop between action and owned evidence.'
      },
      {
        label: 'Review deterministic workflow receipts',
        href: '/proof/marketplace-workflow',
        detail: 'See outcome classes and repeatable artifacts in a bounded example.'
      }
    ],
    faqs: [
      {
        question: 'What is the difference between AI tracing and workflow observability?',
        answer:
          'Tracing explains model and tool execution. Workflow observability adds source identity, business state, policy, approval, external outcomes, ownership, and recovery so an operator can resolve the case rather than only inspect a technical span.'
      },
      {
        question: 'What should an AI workflow alert contain?',
        answer:
          'Include the case and tenant identifiers, affected business state, severity, safe evidence summary, likely boundary, responsible owner, allowed recovery action, and links to the receipt and runbook. Never place secrets in the alert.'
      },
      {
        question: 'How long should AI workflow evidence be retained?',
        answer:
          'Set retention by business, contractual, legal, privacy, and recovery needs for each evidence class. Keep identifiers and decision proof only as long as justified, restrict access, support deletion, and avoid retaining full sensitive prompts by default.'
      }
    ],
    relatedSlugs: ['ai-workflow-governance', 'ai-agent-evaluation', 'workflow-mapping'],
    publishedTime: '2026-08-02',
    modifiedTime: '2026-08-02'
  }
];

const workflowPagesBySlug = new Map(workflowPages.map((page) => [page.slug, page]));

export function getWorkflowPage(slug: string): WorkflowPage | undefined {
  return workflowPagesBySlug.get(slug);
}
