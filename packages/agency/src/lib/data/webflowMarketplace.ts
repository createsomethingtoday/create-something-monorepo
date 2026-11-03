/* Portfolio evidence captured October 30, 2026. Source research remains in the private review package. */
export const webflowAttribution = "Selected professional work by Micah Johnson for Webflow, presented as individual portfolio work. Webflow did not commission this work through CREATE SOMETHING. Individual contributions are described within a wider team and platform context.";
export const webflowStudies = [
  {
    "id": "overview",
    "label": "The complete story",
    "title": "Making the Marketplace lifecycle easier to navigate",
    "deck": "Selected Webflow work by Micah Johnson",
    "summary": "My work across Webflow’s Marketplace connects the tools creators use to prepare and manage their work with the systems reviewers use to evaluate it.",
    "focus": "Product development, workflow design, integration engineering, and reusable review guidance",
    "problem": "A Marketplace experience extends far beyond a listing page. A creator needs to understand the requirements, prepare an asset, submit it, respond to feedback, and maintain the listing. Reviewers need the right version, reliable evidence, and clear authority to act. When those steps live in separate tools, people have to reconstruct the workflow themselves.",
    "approach": [
      "I worked across that lifecycle: the Asset Dashboard, the Webflow Way Validator, App Review Preflight, template and app submission flows, review tools using the Model Context Protocol (MCP), developer skills, the public Apps Marketplace, and the Marketplace listings experience inside the creator workspace. Each project addressed a different handoff.",
      "The creator tools bring the next action closer to the work. The Validator checks template requirements in Designer. App Review Preflight examines app artifacts and records evidence about runtime behavior. Submission forms connect those results to intake. The Asset Dashboard makes assets, review progress, editing, and Marketplace insights available in one workspace.",
      "The review tools address the other side of the handoff. MCP gives a reviewer’s AI assistant structured access to queue and version context. Skills turn recurring review problems into preparation and remediation guidance. Both preserve the distinction between collecting evidence and making a Marketplace decision.",
      "The public Marketplace and creator workspace required a different kind of care: accessible controls, controlled category rollouts, curation tools, understandable labels, and navigation that returns a creator to the correct listing and workspace. These details determine whether the surrounding system feels coherent."
    ],
    "decision": "The central design decision was to keep evidence states explicit. A request accepted by a server is different from a confirmed review record. A passing validation run is different from approval. A feature merged behind a flag is different from a broadly released experience.",
    "result": "The documented result is a set of connected product surfaces and operational tools, with current implementation evidence and historical examples of deployment and workflow verification. The portfolio demonstrates the breadth of the work and the decisions connecting it. It does not establish a measured increase in revenue, adoption, approval rate, or review speed.",
    "limit": "This is a retrospective portfolio draft. Historical CTX reports support the narrative; they are not a fresh audit of every production surface. Exact dates, role titles, collaborators, and the division of ownership still need a final factual read.",
    "captures": [
      {
        "label": "Comprehensive Webflow Marketplace lifecycle film",
        "scope": "A compilation of actual captured screens and labeled offline replays. Setup, input and connection prerequisites remain bounded demonstrations, not full production acceptance. Individual portfolio work by Micah Johnson.",
        "video": "/films/webflow-marketplace/overview.mp4",
        "poster": "/films/webflow-marketplace/overview.jpg",
        "captions": "/films/webflow-marketplace/overview.vtt"
      }
    ]
  },
  {
    "id": "asset-dashboard",
    "label": "Asset Dashboard",
    "title": "A workspace for the work after submission",
    "deck": "Creator experience · Asset management",
    "summary": "I worked on the Asset Dashboard to bring asset management, submission progress, validation, and Marketplace insights into a creator workspace.",
    "focus": "Creator dashboard, asset workflows, and the Webflow Cloud migration",
    "problem": "Submitting an asset is one step in a continuing relationship with the Marketplace. Creators also need to see what happened to their submission, inspect feedback, update information, and understand the context in which their work is being sold.",
    "approach": [
      "The Dashboard brings those tasks together around the asset. A creator can browse a portfolio, open an individual asset, follow its submission journey, and enter the editor. Marketplace insights provide a separate view of category performance and the freshness of the underlying information.",
      "My work also covered the Webflow Cloud port and shared domain layer. The migration scope includes authentication, protected routes, asset detail and editing, image uploads, profile management, submission tracking, and analytics. Keeping that scope explicit matters: a migrated screen is useful only if the surrounding creator workflow remains intact."
    ],
    "decision": "Organize the workspace around assets and their progress, with source freshness visible where creators interpret Marketplace data.",
    "result": "An existing authenticated recording demonstrates a test portfolio, a submission timeline, the editor opening, and Marketplace insights. It establishes those visible interactions. No fields were changed or saved during the recording.",
    "limit": "The recording demonstrates the Asset Dashboard, not every route in the Cloud port or the later native Creator Hub migration. Adoption and time savings have not been established for this study.",
    "captures": [
      {
        "label": "Asset Dashboard guided walkthrough",
        "scope": "Historical authenticated test-portfolio recording. Asset context, journey, editor entry and insights; no changes saved.",
        "video": "/films/webflow-marketplace/asset-dashboard.mp4",
        "poster": "/films/webflow-marketplace/asset-dashboard.jpg",
        "captions": "/films/webflow-marketplace/asset-dashboard.vtt"
      }
    ]
  },
  {
    "id": "validator",
    "label": "Validator App",
    "title": "Make template requirements actionable in Designer",
    "deck": "Webflow Way Validator · Template preparation",
    "summary": "I worked on the Webflow Way Validator to help creators inspect template quality while they are working, then carry the validation result into submission.",
    "focus": "Designer extension, published-site checks, persisted results, and intake integration",
    "problem": "A written guideline tells a creator what good work should satisfy. It does not show which element or page needs attention in the template they are building. Leaving those checks until review pushes avoidable correction work into a later stage.",
    "approach": [
      "The Validator combines Designer checks with checks on the published site. Its interface groups findings across Designer structure, assets and images, and content and accessibility. Partial runs support iteration; the submission path asks for the full set of checks and pages.",
      "The result also has to travel. The worker can persist a sanitized artifact and expose the latest submission status. The template form checks that result alongside the published setup, then gives a specific recovery path when the expected evidence is missing. This connects a creator’s validation run to the intake system without treating a pasted claim as proof."
    ],
    "decision": "Use validation as concrete preparation evidence. The latest persisted result can satisfy a submission contract, while visual quality and final Marketplace approval remain separate judgments.",
    "result": "Current extension and worker source implement categorized checks, computed pass results, and a latest-result endpoint. The template intake code integrates that evidence. This study establishes the implementation; it does not claim a measured reduction in rejection or review time.",
    "limit": "The new authenticated Designer capture shows setup requirements and check-scope controls. The test site lacks the published Validator script. No script was installed, site published, token rotated, validation run completed, or result persisted.",
    "captures": [
      {
        "label": "Live Validator setup and scope",
        "scope": "Live Designer inspection on an owned test site. Setup and scope only; no validation run or site changes.",
        "video": "/films/webflow-marketplace/validator.mp4",
        "poster": "/films/webflow-marketplace/validator.jpg",
        "captions": "/films/webflow-marketplace/validator.vtt"
      }
    ]
  },
  {
    "id": "preflight",
    "label": "Preflight App",
    "title": "Give app review evidence a clear origin",
    "deck": "App Review Preflight · Developer and reviewer tools",
    "summary": "I worked on App Review Preflight to connect app artifacts, specific findings, and observed runtime evidence before a Marketplace review decision.",
    "focus": "Artifact analysis, immutable revisions, evidence provenance, and reviewer replay",
    "problem": "An app bundle, a developer’s test report, and behavior observed in a running installation answer different questions. Combining them into one undifferentiated pass makes it difficult for a reviewer to know what was actually checked.",
    "approach": [
      "App Review Preflight has a developer surface in Designer and a reviewer workspace on the web. The workflow associates analysis with immutable revisions, so the evidence points to a particular artifact rather than a moving target.",
      "The architecture distinguishes supplied source material from runtime observations collected by a server-owned browser. Reviewers can inspect the evidence and request independent replay. Read-only integration in the App Review MCP carries the receipt, bundle identity, readiness, and runtime context into the review workflow."
    ],
    "decision": "Preserve who supplied the evidence, which revision it describes, and how it was observed. A Preflight receipt identifies evidence; it does not certify Marketplace approval.",
    "result": "The new authenticated Designer recording shows Preflight connected to the authorized Webflow Selection Box demo site. It demonstrates the app-bundle and private review-ZIP inputs, opens the hosted-JavaScript path, and returns without submitting. The implementation sources separately document immutable revisions and reviewer evidence.",
    "limit": "The recording is an input-path walkthrough. No files were uploaded, analysis job started, receipt created, runtime observation performed, or reviewer replay demonstrated. The app connection was authorized only for the selected demo site; no design was edited or published.",
    "captures": [
      {
        "label": "Connected Preflight input-path walkthrough",
        "scope": "Live Designer on the authorized demo site. Bundle/review-ZIP and hosted-script inputs only; no upload, job, receipt, runtime observation, site edit or publication.",
        "video": "/films/webflow-marketplace/preflight.mp4",
        "poster": "/films/webflow-marketplace/preflight.jpg",
        "captions": "/films/webflow-marketplace/preflight.vtt"
      }
    ]
  },
  {
    "id": "apps",
    "label": "webflow.com/apps",
    "title": "Improve discovery and operation inside the Apps Marketplace",
    "deck": "Webflow’s codebase · Categories, accessibility, and curation",
    "summary": "My work in webflow/webflow included the public Apps Marketplace: category rollout, accessible interactions, and tools supporting Marketplace curation.",
    "focus": "Incremental product changes in an existing application, with review and rollout controls",
    "problem": "A public app directory serves several audiences at once. Visitors need usable categories and accessible controls. Marketplace staff need to maintain featured content. A change must fit the existing application and its release process.",
    "approach": [
      "For the Campaigns category, the work connected the category definition and route to a feature-controlled navigation entry. That allowed the route and listing metadata to be prepared before broad exposure. Historical records describe the rollout, existing-category checks, and later verification with tagged apps.",
      "Accessibility work covered app detail and form controls, accessible names, live regions, and button state. Curation work included the New & Noteworthy candidates panel and a separate shelf manager proposal. These changes addressed everyday discovery and operational tasks within the existing Marketplace rather than replacing the whole directory."
    ],
    "decision": "Separate code availability, content readiness, and public exposure. A category can resolve correctly while its navigation entry remains intentionally hidden until the content and release decision are ready.",
    "result": "The new live public recording confirms Campaigns appears in navigation and shows HubSpot, Google Ads for Webflow, and Adobe Marketo Engage. Historical CTX records the category rollout and distinguishes the shipped candidates panel from the shelf manager still awaiting review at that checkpoint.",
    "limit": "The new recording demonstrates public category browsing only. Direct current source access to webflow/webflow remains unavailable. It does not verify admin curation, every accessibility change, current PR status, or conversion lift.",
    "captures": [
      {
        "label": "Live Apps Marketplace browsing",
        "scope": "Live public Campaigns navigation and listings. No installs or admin curation.",
        "video": "/films/webflow-marketplace/apps.mp4",
        "poster": "/films/webflow-marketplace/apps.jpg",
        "captions": "/films/webflow-marketplace/apps.vtt"
      }
    ]
  },
  {
    "id": "submission",
    "label": "Submission forms",
    "title": "Make intake confirm what happened",
    "deck": "Template and App submission · Validation and recovery",
    "summary": "I developed Marketplace submission workflows that connect creator eligibility, asset information, validation evidence, uploads, and a review-record handoff.",
    "focus": "Template and app intake, inline guidance, evidence integration, and reliable receipts",
    "problem": "A form can accept a request without creating a complete record that a review team can use. If the success message skips that distinction, creators can believe their work is in review while the underlying handoff is still processing or incomplete.",
    "approach": [
      "The template flow checks creator eligibility and the published site, integrates Validator results, handles constrained uploads, and can use analysis to suggest listing information. It is an independent Webflow Cloud application embedded in the public submission page.",
      "The receipt logic looks for a matching asset, version, creator, and review status. Until the confirmation is available, the state remains processing. App intake adds its own listing guidance and artifact requirements. Historical app-form verification describes cross-field checks and URL guidance, with the Preflight receipt optional in production at that checkpoint."
    ],
    "decision": "Give each stage a truthful state and a specific recovery action. Template and app validation contracts remain distinct; the template Validator requirement does not establish an equivalent mandatory App Preflight gate.",
    "result": "The template source implements validation integration and review-record confirmation. Historical CTX evidence supports app-form improvements in the separate webflow/wf-app-form-cloud repository. The result is a more explicit intake contract; its effect on submission quality has not been measured for this study.",
    "limit": "The new template-form recording shows the live validation, listing, and incomplete readiness sections without checking a real identity, uploading, or submitting. The App form separately requires a Webflow connection before entry. No completed intake or review-record creation is claimed.",
    "captures": [
      {
        "label": "Live template form walkthrough",
        "scope": "Live unsent template-form inspection. No identity check, upload, validation job, or submission.",
        "video": "/films/webflow-marketplace/submission.mp4",
        "poster": "/films/webflow-marketplace/submission.jpg",
        "captions": "/films/webflow-marketplace/submission.vtt"
      },
      {
        "label": "App form connection prerequisite",
        "scope": "Actual App form entry gate. No new Webflow connection or authenticated intake is shown.",
        "video": "/films/webflow-marketplace/submission-app-gate.mp4",
        "poster": "/films/webflow-marketplace/submission-app-gate.jpg",
        "captions": "/films/webflow-marketplace/submission-app-gate.vtt"
      }
    ]
  },
  {
    "id": "review-mcp",
    "label": "Template/App Review MCP",
    "title": "Bring review context to the reviewer’s tools",
    "deck": "Model Context Protocol · Review operations",
    "summary": "I built review tooling that gives an AI assistant structured access to Marketplace queues, asset versions, prior feedback, and submission evidence, with explicit limits on changes.",
    "focus": "Template and app review integrations, evidence retrieval, and write boundaries",
    "problem": "A reviewer needs to understand the current version and prior decisions before deciding what to do next. Reconstructing that context across operational systems adds work, and an assistant with broad write access can introduce a second problem: acting on incomplete or stale information.",
    "approach": [
      "The Template and App Review MCPs expose domain-specific review tools. They bring record context into the reviewer’s agent workflow while retaining important differences between template and app operations.",
      "Template self-assignment uses runtime reviewer identity. Supplemental agent notes have their own feedback field. Confirmed app status changes require an expected current status, so stale state or missing confirmation can fail explicitly. App reviewer assignment remains read-only through this interface. Preflight evidence is available as review context rather than an approval shortcut."
    ],
    "decision": "Make the authority to act as explicit as the evidence. Tool access, reviewer ownership, confirmation, and the freshness of the underlying record all affect which action is valid.",
    "result": "The new offline evidence replay shows eight actual production-handler calls with synthetic in-memory clients: queue and context reads, confirmation and stale-state refusals, reviewer self-assignment, the review contract, and supplemental-only notes. Assertions passed with zero network attempts or external writes.",
    "limit": "The recording is an offline replay of real handler output. It does not demonstrate live MCP transport, reviewer authentication, Airtable retrieval, or production review operations.",
    "captures": [
      {
        "label": "Review MCP offline evidence replay",
        "scope": "Offline evidence replay with synthetic clients. Actual handler results; no live reviewer or Airtable operation.",
        "video": "/films/webflow-marketplace/review-mcp.mp4",
        "poster": "/films/webflow-marketplace/review-mcp.jpg",
        "captions": "/films/webflow-marketplace/review-mcp.vtt"
      }
    ]
  },
  {
    "id": "skills",
    "label": "Skills",
    "title": "Turn review experience into reusable preparation",
    "deck": "Developer guidance · Preflight and remediation",
    "summary": "I turned recurring Marketplace app review problems into shareable skills and checklists developers can use before submission and after receiving findings.",
    "focus": "Guidance design, workflow routing, evidence checklists, packaging, and consistency evaluation",
    "problem": "A general coding assistant can produce plausible advice that misses the requirements of a particular platform. Developers also need different guidance when they are preparing a first submission and when they already have specific findings to resolve.",
    "approach": [
      "The preparation skill walks through building and checking a Marketplace app. The remediation skill starts from issued findings, preserves their wording and acceptance criteria, routes fixes to the owning layer, and builds evidence for resubmission readiness. The two workflows deliberately route different requests.",
      "The packages include checklists, references, evaluation cases, and static consistency harnesses. They separate published platform requirements from additional security or engineering guidance. Supporting reviewer skills describe queue operation, analysis interpretation, write guardrails, and fallback when a review flow cannot proceed."
    ],
    "decision": "Treat the guidance as a maintained product. Keep its claims grounded, preserve the finding contract, and distinguish source checks, artifact checks, runtime observation, submission, and reviewer acceptance.",
    "result": "The new recording replays original skill excerpts and actual local static-harness output: 158 preparation checks and 97 remediation checks passed. These results establish grounding and package consistency, not model behavior or review success.",
    "limit": "The source and static-evaluation replay contains no live model conversation or behavioral evaluation. Historical package download verification remains a separate earlier result.",
    "captures": [
      {
        "label": "Skills source and static evaluation replay",
        "scope": "Original source and actual static evaluation output. No live model behavior is demonstrated.",
        "video": "/films/webflow-marketplace/skills.mp4",
        "poster": "/films/webflow-marketplace/skills.jpg",
        "captions": "/films/webflow-marketplace/skills.vtt"
      }
    ]
  },
  {
    "id": "listings",
    "label": "Marketplace listings",
    "title": "Keep creators connected to the listing they are editing",
    "deck": "Creator Hub · Naming, navigation, and migration",
    "summary": "I worked on the Marketplace listings experience connecting a creator’s overview, individual listings, and editing tools inside the Webflow workspace.",
    "focus": "Creator Hub migration, product naming, editor return paths, and unsaved-change behavior",
    "problem": "A creator can start editing a listing in one workspace and return to a different workspace through a generic Dashboard link. The interruption is small in code and substantial in use: the creator loses the place and context of the task.",
    "approach": [
      "The work included clearer names for the surface and its information: Marketplace listings, Listings, and Revenue. The proposed tab organization grouped Overview, Listings, and Settings. The native workspace migration was staged, with read-only capabilities and editing work moving through different review and release checkpoints.",
      "The editor return-path work preserves the originating listings address, including the workspace and tab. It also handles unsaved changes: cancelling the leave action keeps the creator in the editor, while confirming returns them to the listings context. Historical live verification recorded that path without saving an edit."
    ],
    "decision": "Preserve the creator’s location across application boundaries. Naming, navigation, and unsaved-change behavior are part of the same task, even when the editor and workspace live in different applications.",
    "result": "The new authenticated capture shows Marketplace listings in the owned Create Something workspace, its three app listings, and the search filter narrowing and restoring the list. Historical CTX separately records the template-editor return-path test and the staged migration.",
    "limit": "The new recording demonstrates owned app listing discovery and search. It does not exercise a template editor, the unsaved-change prompt, or the bookmark/email fallback. Historical editor evidence must not be presented as newly recorded behavior.",
    "captures": [
      {
        "label": "Live Marketplace listings walkthrough",
        "scope": "Owned workspace listings and search. No template editor, unsaved-change prompt, or listing edit is demonstrated.",
        "video": "/films/webflow-marketplace/listings.mp4",
        "poster": "/films/webflow-marketplace/listings.jpg",
        "captions": "/films/webflow-marketplace/listings.vtt"
      }
    ]
  }
];
export const webflowStages = [
  {
    "label": "Prepare",
    "start": 0.0,
    "end": 59.5,
    "title": "Prepare before review.",
    "prompt": "Inspect app setup and source guidance.",
    "evidence": "Validator shows setup; Preflight shows connected input paths. Skills is an offline source/static-evaluation replay. No app analysis runs here."
  },
  {
    "label": "Submit",
    "start": 59.5,
    "end": 84.2,
    "title": "Make the intake state clear.",
    "prompt": "Inspect the template form and App connection prerequisite.",
    "evidence": "No upload, validation job, or submission is shown."
  },
  {
    "label": "Review",
    "start": 84.2,
    "end": 117.23333333333333,
    "title": "Keep evidence and authority separate.",
    "prompt": "Inspect actual saved handler results.",
    "evidence": "Offline replay with synthetic clients; no live reviewer authentication or Airtable operation."
  },
  {
    "label": "Manage",
    "start": 117.23333333333333,
    "end": 151.13333333333333,
    "title": "Keep the asset in context.",
    "prompt": "Inspect the test Dashboard and owned app listings.",
    "evidence": "Dashboard footage is historical. Listings shows search; no edit or save."
  },
  {
    "label": "Discover",
    "start": 151.13333333333333,
    "end": 168.26666666666668,
    "title": "Find the category.",
    "prompt": "Inspect current public Campaigns navigation and results.",
    "evidence": "Public browsing only. No install or admin curation."
  }
];
