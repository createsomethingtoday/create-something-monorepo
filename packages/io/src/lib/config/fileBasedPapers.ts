/**
 * File-Based Papers Configuration
 *
 * Metadata for papers that exist as markdown files in content/papers/
 * rather than static Svelte routes.
 *
 * This enables the [slug] dynamic route to serve papers from markdown.
 */

import type { FileBasedExperiment } from '@create-something/canon';
import { transformExperimentToPaper } from '@create-something/canon';
import { applyArtifactVisuals, defineArtifactVisuals } from './visualCommunication';

// Re-use the FileBasedExperiment type since it has the same shape
export type FileBasedPaper = FileBasedExperiment;

/**
 * Papers that should be served from markdown files
 *
 * These papers have their full content in /content/papers/{slug}.md
 * and can be served by the [slug] dynamic route.
 */
const fileBasedPaperMetadata: FileBasedPaper[] = [
	{
		id: 'paper-loop-operable-codebase',
		slug: 'loop-operable-codebase',
		title: 'The Loop-Operable Codebase',
		description: 'A CREATE SOMETHING field paper on converting loop-engineering hype into a bounded repo-native operating system using Linear, Symphony, worktrees, legibility contracts, policy artifacts, and explicit dispatch gates.',
		excerpt_short: 'Loops work when the codebase can observe and stop them',
		excerpt_long: 'This paper documents the CREATE SOMETHING loop pilot after reviewing public loop-engineering signals and validating the monorepo readiness gates. The result is not a Hermes-first rewrite. It is a Symphony-first operating pattern: read-only preflight by default, explicit dispatch for one bounded pass, Linear as durable state, worktrees as isolation, and policy artifacts as the stop boundary.',
		category: 'Research',
		tags: [
			'Loop Engineering',
			'Symphony',
			'Linear',
			'Codex',
			'Hermes',
			'Agent Harness',
			'Worktrees',
			'Policy OS',
			'Three-Tier Framework'
		],
		created_at: '2026-06-22T15:32:59Z',
		updated_at: '2026-06-22T15:32:59Z',
		reading_time_minutes: 16,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'mcp-first-thesis',
			'three-tier-framework',
			'policy-as-artifact',
			'verification-first',
			'agent-governance'
		],
		route: '/papers/loop-operable-codebase',
		ascii_art: `
╭──────────────────────────────────────────────────────────────╮
│ LINEAR  →  SYMPHONY  →  WORKTREE  →  CHECKS  →  RECEIPT     │
│ queue      dispatch     isolation    evidence   memory       │
│                                                              │
│ A loop is useful only when the codebase can observe it,      │
│ bound it, and stop it.                                      │
╰──────────────────────────────────────────────────────────────╯
`
	},
	{
		id: 'paper-proof-surface',
		slug: 'proof-surface',
		title: 'The Proof Surface',
		description: 'Why agent work needs public receipts, private evidence, and owner authority once it leaves chat. A practical model for turning traces, deploys, approval notes, blocked states, delivery records, and workflow templates into business-readable proof.',
		excerpt_short: 'Proof is the product once work leaves chat',
		excerpt_long: 'This paper defines the Proof Surface as the business-readable layer that turns agent work into inspectable operating receipts. It sits above private logs, traces, deploy output, and workflow contracts, separating public-safe status from sensitive evidence while keeping ownership visible after the agent has acted. The paper includes a support-recovery example and starter proof template.',
		category: 'Research',
		tags: [
			'Proof Surface',
			'Receipts',
			'Workflow Trust Layer',
			'Policy OS',
			'Agent Governance',
			'Delivery Records',
			'Operator Surface',
			'Three-Tier Framework'
		],
		created_at: '2026-06-22T15:00:00Z',
		updated_at: '2026-06-22T15:00:00Z',
		reading_time_minutes: 18,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'mcp-first-thesis',
			'three-tier-framework',
			'policy-as-artifact',
			'verification-first',
			'agent-governance'
		],
		route: '/papers/proof-surface',
		ascii_art: `
╭──────────────────────────────────────────────────────────────╮
│ RUN  →  WAIT  →  STOP  →  RECEIPT                           │
│ act     owner    reason   proof                              │
│                                                              │
│ Make agent work inspectable without exposing private proof.  │
╰──────────────────────────────────────────────────────────────╯
`,
		visual_summary: {
			kind: 'state-strip',
			title: 'Agent work becomes trustworthy when each state has a receipt.',
			caption:
				'The visual grammar is intentionally small: show what can run, what must wait, what must stop, and what proves the decision.',
			nodes: [
				{
					label: 'Run',
					detail: 'Bounded work proceeds inside an approved workflow boundary.',
					icon: 'check',
					tone: 'run'
				},
				{
					label: 'Wait',
					detail: 'A named owner must approve before the workflow creates impact.',
					icon: 'clock',
					tone: 'wait'
				},
				{
					label: 'Stop',
					detail: 'The system refuses or defers work when evidence, scope, or policy is missing.',
					icon: 'warning',
					tone: 'stop'
				},
				{
					label: 'Receipt',
					detail: 'The outcome is preserved as a public-safe proof surface with private evidence behind it.',
					icon: 'document',
					tone: 'receipt'
				}
			]
		},
		generated_brand_image: {
			prompt_contract: 'create-something-research-visual.v1',
			model: 'gpt-image-2',
			status: 'prompt-only',
			intended_use: 'article-hero',
			size: '1536x1024',
			quality: 'medium',
			alt: 'Abstract CREATE SOMETHING proof surface showing public receipts above private evidence for agent work.',
			prompt: `CREATE SOMETHING research visual system.

Purpose:
Create a publication-quality visual abstract for a research paper.

Brand:
Minimal, rigorous, systems-oriented, black and white foundation with one restrained amber accent. High contrast, quiet interface density, no decorative clutter.

Visual language:
Abstract operating-system diagram. Architectural systems thinking. Sparse geometry. Visible layers, boundaries, traces, receipts, handoff paths, and owner checkpoints. Subtle terminal or paper texture. No stock-photo people. No glossy SaaS gradients. No mascot. No cartoon. No fake UI chrome.

Composition:
16:9 editorial hero. Centered system object with generous negative space. Readable at article header size. Suitable above a title, but do not include title text in the image.

Subject:
A proof surface for AI agent work: private evidence below, public receipt above, with four visible states: run, wait, stop, receipt.

Required motifs:
- layered surface separating public status from private evidence
- small receipt cards or evidence packets
- bounded workflow path
- owner approval checkpoint
- visible stop state that feels intentional, not broken

Forbidden:
watermarks, extra logos, random text, illegible labels, fake brand names, colorful dashboard clutter, decorative blobs.`
		}
	},
	{
		id: 'paper-eval-evidence-layer',
		slug: 'eval-evidence-layer',
		title: 'The Eval Evidence Layer',
		description: 'How Langfuse traces and Braintrust gates make agent workflows measurable. A quantitative model for turning Dify runtime traces, MCP eval gates, approval receipts, and blocked-state evidence into publish, hold, rollback, or graduation decisions.',
		excerpt_short: 'Traces and evals matter when they change a release decision',
		excerpt_long: 'This paper extends the Policy OS contract bundle with a quantitative evidence layer. Dify carries the app, Langfuse explains the app runtime, Braintrust gates the CREATE SOMETHING-owned MCP contracts, and release decisions depend on thresholds that operators can inspect.',
		category: 'Research',
		tags: [
			'Eval Evidence Layer',
			'Langfuse',
			'Braintrust',
			'Dify',
			'MCP',
			'Policy OS',
			'Agent Governance',
			'Observability',
			'Release Evidence'
		],
		created_at: '2026-06-22T12:00:00Z',
		updated_at: '2026-06-22T12:00:00Z',
		reading_time_minutes: 17,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'mcp-first-thesis',
			'three-tier-framework',
			'policy-as-artifact',
			'verification-first',
			'agent-governance'
		],
		route: '/papers/eval-evidence-layer',
		ascii_art: `
╭──────────────────────────────────────────────────────────────╮
│ DIFY APP TRACE  →  LANGFUSE  →  RUNTIME EVIDENCE            │
│ MCP CONTRACT    →  BRAINTRUST →  GATE EVIDENCE              │
│                                                              │
│ Measure only what can change publish, hold, rollback,        │
│ or graduation decisions.                                    │
╰──────────────────────────────────────────────────────────────╯
`
	},
	{
		id: 'paper-workflow-trust-layer',
		slug: 'workflow-trust-layer',
		title: 'The Workflow Trust Layer',
		description: 'Why agents need handoffs, approval states, and evidence before they need more tools. A practical operating model for mapping one workflow into auto-allowed, approval-needed, and blocked states before expanding autonomy.',
		excerpt_short: 'Connection does not create trust',
		excerpt_long: 'This paper turns recent CREATE SOMETHING implementation work into a practical model for users evaluating agentic workflows. MCP exposes capability, app surfaces make workflows usable, runtime services provide durable boundaries, and SDK-backed services can graduate risky orchestration into code when evidence justifies the platform burden. The workflow trust layer is the artifact family that keeps those surfaces coherent.',
		category: 'Research',
		tags: [
			'Workflow Trust Layer',
			'Policy OS',
			'MCP',
			'Dify',
			'OpenAI Agents SDK',
			'Approval States',
			'Agent Governance',
			'Three-Tier Framework'
		],
		created_at: '2026-06-20T15:00:00Z',
		updated_at: '2026-06-20T15:00:00Z',
		reading_time_minutes: 18,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'mcp-first-thesis',
			'three-tier-framework',
			'policy-as-artifact',
			'verification-first'
		],
		route: '/papers/workflow-trust-layer',
		ascii_art: `
╭──────────────────────────────────────────────────────────────╮
│ TOOL ACCESS  →  DECISION STATE  →  RECEIPT                  │
│ can it run?     allow / approve / block    prove the path    │
│                                                              │
│ Connection does not create trust. The workflow boundary does.│
╰──────────────────────────────────────────────────────────────╯
`
	},
	{
		id: 'paper-endpoint-construction-product',
		slug: 'endpoint-construction-product',
		title: 'Endpoint Construction Is Product Construction',
		description: 'Why AI-native products depend on the capability boundary more than the chat surface. A practical model for treating endpoints as the product grammar that defines intent, schema, authority, state, limits, errors, evidence, and fallback.',
		excerpt_short: 'The product is the capability boundary the model inhabits',
		excerpt_long: 'This paper argues that endpoint construction is product construction in AI-native systems. Using Atlas as the case study, it shows how typed objects, bounded mutations, tiered limits, durable state, fallback behavior, and inspectable readiness turn a canvas from a diagram into an agent-operable product surface.',
		category: 'Research',
		tags: [
			'Endpoint Construction',
			'MCP',
			'Tool Calling',
			'AI-Native Product',
			'Atlas',
			'Policy OS',
			'Workflow Trust Layer',
			'Three-Tier Framework'
		],
		created_at: '2026-06-24T02:21:21Z',
		updated_at: '2026-06-24T04:05:00Z',
		reading_time_minutes: 18,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'mcp-first-thesis',
			'three-tier-framework',
			'policy-as-artifact',
			'verification-first',
			'agent-governance'
		],
		route: '/papers/endpoint-construction-product',
		ascii_art: `
╭──────────────────────────────────────────────────────────────╮
│ CHAT SURFACE  ->  ENDPOINT GRAMMAR  ->  OPERATING RECEIPT   │
│ intent            schema / authority      proof              │
│                                                              │
│ The product is the boundary the model can safely inhabit.    │
╰──────────────────────────────────────────────────────────────╯
`
	},
	{
		id: 'paper-policy-os-contract-bundle',
		slug: 'policy-os-contract-bundle',
		title: 'The Policy OS Contract Bundle',
		description: 'Why governed AI workflows need a portable contract bundle before they need more autonomy. A practical model for defining MCP capability, agent behavior, outcome success, golden tasks, runbooks, and runtime graduation.',
		excerpt_short: 'The portable unit of governed AI work',
		excerpt_long: 'This paper explains the Policy OS contract bundle as the practical unit that makes AI workflows inspectable, testable, portable, and governable. MCP exposes capability, agent contracts define behavior, outcome contracts define success, golden tasks preserve proof, and runbooks keep humans in control across Dify, Codex, Pi, repo-owned services, and SDK-backed graduation paths.',
		category: 'Research',
		tags: [
			'Policy OS',
			'Contract Bundle',
			'MCP',
			'Dify',
			'OpenAI Agents SDK',
			'Golden Tasks',
			'Agent Governance',
			'Skills on MCP',
			'Three-Tier Framework'
		],
		created_at: '2026-06-21T19:53:36Z',
		updated_at: '2026-06-21T21:06:00Z',
		reading_time_minutes: 18,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'mcp-first-thesis',
			'three-tier-framework',
			'policy-as-artifact',
			'verification-first',
			'agent-governance'
		],
		route: '/papers/policy-os-contract-bundle',
		ascii_art: `
╭──────────────────────────────────────────────────────────────╮
│ MCP CONTRACT  →  AGENT CONTRACT  →  OUTCOME CONTRACT        │
│ capability       behavior           success                 │
│                                                              │
│ GOLDEN TASKS  →  RUNBOOK  →  RUNTIME GRADUATION             │
│ prove it          operate it   move only with evidence       │
╰──────────────────────────────────────────────────────────────╯
`
	},
	{
		id: 'paper-analyzer-mcp-review-architecture',
		slug: 'analyzer-mcp-review-architecture',
		title: 'The Analyzer MCP: A Policy-Grounded Review Architecture',
		description: 'How CREATE SOMETHING turned Webflow template review into a multi-surface MCP system that joins Designer state, published-site evidence, policy ingestion, and governed review output.',
		excerpt_short: 'A review system, not just a site analyzer',
		excerpt_long: 'This case study explains how the Webflow Site Analyzer MCP was created, the review problem it solves, and the architectural pattern it demonstrates for other system architects. The key move was treating review as a governed MCP system across three surfaces: published pages, Designer-only metadata, and external policy that changes over time.',
		category: 'Case Study',
		tags: [
			'Analyzer MCP',
			'Webflow',
			'MCP',
			'Three-Tier Framework',
			'Policy as Artifact',
			'Review Systems',
			'Observability'
		],
		created_at: '2026-04-13T00:00:00Z',
		updated_at: '2026-04-13T00:00:00Z',
		reading_time_minutes: 16,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'mcp-first-thesis',
			'three-tier-framework',
			'policy-as-artifact',
			'verification-first'
		],
		route: '/papers/analyzer-mcp-review-architecture',
		ascii_art: `
╭──────────────────────────────────────────────────────────────╮
│ PUBLISHED SITE   DESIGNER STATE   POLICY SNAPSHOT           │
│      │                 │                 │                  │
│      └──────────┬──────┴──────┬──────────┘                  │
│                 ANALYZER MCP REVIEW ARTIFACT                │
│        observable • queued • versioned • manual-bounded    │
╰──────────────────────────────────────────────────────────────╯
`
	},
	{
		id: 'paper-webflow-analyzer-productization',
		slug: 'webflow-analyzer-productization',
		title: 'Webflow Analyzer Productization',
		description: 'How CREATE SOMETHING translated reviewer-side analyzer infrastructure into creator-facing validation, autofill, screenshot packaging, and submission UX without collapsing trust boundaries.',
		excerpt_short: 'The analyzer became a product when it started helping creators before submission',
		excerpt_long: 'This case study explains how the Webflow analyzer moved from reviewer tooling into creator-facing product surfaces. The key move was not exposing raw review output more widely. It was translating evidence-gathering into bounded validation, autofill, screenshot packaging, and submission guidance while preserving reviewer-only judgment states.',
		category: 'Case Study',
		tags: [
			'Webflow',
			'Analyzer',
			'Productization',
			'Creator Workflow',
			'Review Systems',
			'Three-Tier Framework',
			'Submission UX'
		],
		created_at: '2026-04-25T00:00:00Z',
		updated_at: '2026-04-25T00:00:00Z',
		reading_time_minutes: 14,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'three-tier-framework',
			'policy-as-artifact',
			'verification-first',
			'rams-principle-2'
		],
		route: '/papers/webflow-analyzer-productization',
		ascii_art: `
╭──────────────────────────────────────────────────────────────╮
│ REVIEWER MCP  →  VALIDATION  →  AUTOFILL  →  SUBMISSION UX  │
│ raw evidence     bounded check    applied work   cleaner     │
│ manual states    creator help     screenshots    handoff     │
│                                                              │
│ Same analyzer family. Different trust surfaces.              │
╰──────────────────────────────────────────────────────────────╯
`
	},
	{
		id: 'paper-andon-protocol',
		slug: 'andon-protocol',
		title: 'The Andon Protocol',
		description: 'AI-native structured escalation for agent harnesses and multi-agent systems. v3.1 adds Silent Running Detection, cost-parameter defaults and worked examples, Resolution Surface design for batch review, and a three-phase implementation plan. The canonical boundary between Automation and Judgment in the Three-Tier Framework.',
		excerpt_short: 'When to pull the cord: obligation-based escalation, with a concrete path to deployment',
		excerpt_long: 'Agent systems handle uncertainty badly—they either ask constantly or guess silently. v3.1 extends the protocol with five AI-native capabilities (Jidoka, Multi-Agent Topology, Dynamic Thresholds, Harness Evolution, Semantic Precedent) and operational design: Silent Running Detection (post-hoc audit of unraised uncertainty), cost defaults and resolution equation worked examples, Resolution Surface (triage, batch, precedent visibility), and phased rollout (Foundation → Intelligence → Evolution).',
		category: 'Research',
		tags: ['Andon', 'Three-Tier Framework', 'Judgment', 'Automation', 'HITL', 'Kaizen'],
		created_at: '2026-02-01T00:00:00Z',
		updated_at: '2026-02-12T00:00:00Z',
		reading_time_minutes: 18,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: ['rams-principle-2', 'subtractive-triad'],
		ascii_art: `
        ╭───────────────────────────────────────╮
       ╱   First pull     Line stop              ╲
      │   Alert only  →  Halt workflow            │
      │   Obligation to pull. Not silence.        │
      ╰───────────────────────────────────────────╯
           Less, but better.
`
	},
	{
		id: 'paper-ground-case-study',
		slug: 'ground-case-study',
		title: 'Ground: Verification-First Code Analysis',
		description: 'Case study: How Ground saved 8+ hours analyzing an 80+ package monorepo by preventing AI hallucination in code analysis.',
		excerpt_short: 'How computed claims replaced guesswork in an 80+ package monorepo',
		excerpt_long: 'This case study documents how Ground was used to analyze the CREATE SOMETHING monorepo (~80+ packages, 50k+ lines of TypeScript). The verification-first approach prevented AI hallucination and saved an estimated 8+ hours compared to manual code review or pattern-matching tools.',
		category: 'Case Study',
		tags: ['Ground', 'Code Analysis', 'Hallucination Prevention', 'Monorepo'],
		created_at: '2026-01-30T00:00:00Z',
		updated_at: '2026-01-30T00:00:00Z',
		reading_time_minutes: 15,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'verification-first',
			'rams-principle-2',
			'subtractive-triad'
		],
		ascii_art: `
        ╭───────────────────────────────────────╮
       ╱   BEFORE          AFTER                 ╲
      │   AI: "95%"   →   Ground: "87.3% AST"    │
      │   similar?        similarity computed     │
      ╰───────────────────────────────────────────╯
           No claim without evidence.
`
	},
	{
		id: 'paper-composio-three-tier-delivery',
		slug: 'composio-three-tier-delivery',
		title: 'Composio in the MCP Delivery System',
		description: 'A decision-grade analysis of why Composio is included for commodity connectivity, how the wrap pattern protects brand and margin, and how delivery remains aligned to Database, Automation, and Judgment control boundaries.',
		excerpt_short: 'Composio accelerates connectivity; CREATE SOMETHING retains the outcome layer',
		excerpt_long: 'This paper formalizes the Composio inclusion policy for CREATE SOMETHING: where it fits, where it does not, and how it aligns with the MCP-first thesis and Three-Tier Framework. It maps bridge components to control models, defines red lines and graduation criteria, and records current governance status: 29/29 technical checks on 2026-02-10, conditional adopt decision on 2026-02-21, pilot closure pending.',
		category: 'Research',
		tags: [
			'Composio',
			'MCP',
			'Three-Tier Framework',
			'Wrap Pattern',
			'Agent Outcome Stack',
			'Policy as Artifact'
		],
		created_at: '2026-03-04T00:00:00Z',
		updated_at: '2026-03-04T00:00:00Z',
		reading_time_minutes: 22,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'mcp-first-thesis',
			'three-tier-framework',
			'rams-principle-2',
			'subtractive-triad'
		],
		route: '/papers/composio-three-tier-delivery',
		ascii_art: `
        ╭───────────────────────────────────────╮
       ╱   Client sees CREATE SOMETHING MCP      ╲
      │   Composio inside  →  Commodity CRUD     │
      │   Margin stays in policy + outcomes      │
      ╰───────────────────────────────────────────╯
           Creation over consumption.
`
	},
	{
		id: 'paper-policy-os-development-infrastructure',
		slug: 'policy-os-development-infrastructure',
		title: 'Policy OS Applied to Development Infrastructure',
		description: 'Applying the Three-Tier Framework and Policy OS to the development workflow itself, demonstrating that agent governance emerges as a structural property at every scale.',
		excerpt_short: 'Governed agent execution via the Pi coding agent harness',
		excerpt_long: 'Policy OS was designed for client MCP deployments. This case study documents applying the same product to CREATE SOMETHING development workflow via the Pi coding agent harness, showing that agent governance is not an add-on but a structural property that emerges from the Three-Tier Framework at every scale.',
		category: 'Case Study',
		tags: [
			'Policy OS',
			'Three-Tier Framework',
			'Pi',
			'Agent Governance',
			'Quality Gates',
			'MCP',
			'Development Infrastructure'
		],
		created_at: '2026-05-11T00:00:00Z',
		updated_at: '2026-05-11T00:00:00Z',
		reading_time_minutes: 10,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'policy-as-artifact',
			'three-tier-framework',
			'verification-first',
			'agent-governance'
		],
		route: '/papers/policy-os-development-infrastructure',
		ascii_art: `
╭──────────────────────────────────────────────────────────────╮
│ POLICY OS  →  PI HARNESS  →  DEVELOPMENT WORKFLOW            │
│ governance    quality gates   receipts and evidence          │
│                                                              │
│ The harness is policy. The configuration is the contract.    │
╰──────────────────────────────────────────────────────────────╯
`
	},
	{
		id: 'paper-braintrust-trace-unsurfacing',
		slug: 'braintrust-trace-unsurfacing',
		title: 'Braintrust Trace Unsurfacing: Finding What Normal Aggregates Hide',
		description: 'How a 1,000-row trace snapshot exposed clustered permission failures, routing misses, and latent control-plane stalls.',
		excerpt_short: 'Trace-level evidence exposes the operational structure aggregate metrics hide',
		excerpt_long: 'This paper documents a CREATE SOMETHING Braintrust trace audit and explains why aggregate uptime metrics were insufficient to diagnose practical reliability risk. A mostly successful 1,000-row sample still surfaced concentrated failure clusters: LinkedIn permission denials, intent route misses, repeated 429 throttles, and extreme control-plane latency outliers.',
		category: 'Research',
		tags: [
			'Braintrust',
			'Observability',
			'MCP',
			'Reliability',
			'Experiment Design',
			'Dashboarding'
		],
		created_at: '2026-03-04T00:00:00Z',
		updated_at: '2026-03-04T00:00:00Z',
		reading_time_minutes: 15,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'verification-first',
			'three-tier-framework',
			'policy-as-artifact'
		],
		route: '/papers/braintrust-trace-unsurfacing',
		ascii_art: `
        ╭───────────────────────────────────────╮
       ╱   Mostly green aggregate metrics        ╲
      │   Trace clusters → permission, routing    │
      │   and tail-latency reliability work       │
      ╰───────────────────────────────────────────╯
           Observability as decision infrastructure.
`
	}
];

const fileBasedPaperVisuals = {
	'paper-loop-operable-codebase': defineArtifactVisuals({
		kind: 'flow',
		title: 'A useful loop is observable, bounded, and able to stop.',
		caption:
			'Linear, Symphony, worktrees, checks, and receipts become one operating path only when dispatch authority is explicit.',
		nodes: [
			{ label: 'Queue', detail: 'Linear owns durable work state and evidence.', icon: 'document', tone: 'neutral' },
			{ label: 'Dispatch', detail: 'Symphony starts one bounded pass only when requested.', icon: 'settings', tone: 'wait' },
			{ label: 'Worktree', detail: 'Codex workers edit inside isolated checkouts.', icon: 'refresh', tone: 'run' },
			{ label: 'Receipt', detail: 'Validation and cleanup evidence decide the next step.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'A repo-native agent loop where Linear queues work, Symphony dispatches one bounded worker, a worktree isolates edits, checks validate the result, and receipts decide whether autonomy can increase.',
		motifs: [
			'Linear issue queue connected to a bounded Symphony dispatch gate',
			'isolated git worktree as an execution chamber',
			'policy artifact boundary around the worker path',
			'evidence receipt that either promotes, retries, or stops the loop'
		],
		alt: 'Abstract CREATE SOMETHING agent loop showing Linear, Symphony, worktree isolation, checks, and evidence receipts.'
	}),
	'paper-proof-surface': defineArtifactVisuals({
		kind: 'state-strip',
		title: 'Agent work becomes trustworthy when each state has a receipt.',
		caption:
			'The visual grammar is intentionally small: show what can run, what must wait, what must stop, and what proves the decision.',
		nodes: [
			{
				label: 'Run',
				detail: 'Bounded work proceeds inside an approved workflow boundary.',
				icon: 'check',
				tone: 'run'
			},
			{
				label: 'Wait',
				detail: 'A named owner must approve before the workflow creates impact.',
				icon: 'clock',
				tone: 'wait'
			},
			{
				label: 'Stop',
				detail: 'The system refuses or defers work when evidence, scope, or policy is missing.',
				icon: 'warning',
				tone: 'stop'
			},
			{
				label: 'Receipt',
				detail: 'The outcome is preserved as a public-safe proof surface with private evidence behind it.',
				icon: 'document',
				tone: 'receipt'
			}
		],
		subject:
			'A proof surface for AI agent work: private evidence below, public receipt above, with four visible states: run, wait, stop, receipt.',
		motifs: [
			'layered surface separating public status from private evidence',
			'small receipt cards or evidence packets',
			'bounded workflow path',
			'owner approval checkpoint',
			'visible stop state that feels intentional, not broken'
		],
		alt: 'Abstract CREATE SOMETHING proof surface showing public receipts above private evidence for agent work.'
	}),
	'paper-eval-evidence-layer': defineArtifactVisuals({
		kind: 'layer-stack',
		title: 'Measurements matter when they change a release decision.',
		caption:
			'Dify, Langfuse, Braintrust, and approval receipts become one evidence layer only when they gate publish, hold, rollback, or graduation.',
		nodes: [
			{ label: 'Runtime trace', detail: 'Dify and Langfuse explain what happened.', icon: 'refresh', tone: 'neutral' },
			{ label: 'Contract gate', detail: 'Braintrust checks the owned MCP behavior.', icon: 'check', tone: 'run' },
			{ label: 'Decision', detail: 'Thresholds choose publish, hold, rollback, or graduate.', icon: 'warning', tone: 'wait' },
			{ label: 'Receipt', detail: 'Evidence is attached where operators can inspect it.', icon: 'document', tone: 'receipt' }
		],
		subject:
			'An eval evidence layer where app traces and contract gates converge into release decisions for AI workflows.',
		motifs: [
			'Dify app trace feeding a runtime evidence lane',
			'Braintrust contract gate with pass and hold thresholds',
			'four release decisions: publish, hold, rollback, graduate',
			'operator-facing evidence receipt'
		],
		alt: 'Abstract eval evidence layer connecting traces and gates to release decisions.'
	}),
	'paper-workflow-trust-layer': defineArtifactVisuals({
		kind: 'boundary-matrix',
		title: 'Trust begins when a workflow names what can run, wait, and stop.',
		caption:
			'The visual model separates tool access from operating authority so capability does not masquerade as trust.',
		nodes: [
			{ label: 'Access', detail: 'MCP exposes capability.', icon: 'settings', tone: 'neutral' },
			{ label: 'Run', detail: 'Allowed work proceeds inside the boundary.', icon: 'check', tone: 'run' },
			{ label: 'Wait', detail: 'Risky actions ask a named owner.', icon: 'clock', tone: 'wait' },
			{ label: 'Stop', detail: 'Out-of-scope actions refuse with a reason.', icon: 'warning', tone: 'stop' }
		],
		subject:
			'A workflow trust layer showing tool access being sorted into run, wait, and stop states before autonomy expands.',
		motifs: [
			'tool connection entering a decision boundary',
			'three state lanes labeled run, wait, stop',
			'approval checkpoint with owner marker',
			'receipt trail after a permitted action'
		],
		alt: 'Abstract workflow trust layer showing capability separated from approval and blocked states.'
	}),
	'paper-endpoint-construction-product': defineArtifactVisuals({
		kind: 'boundary-matrix',
		title: 'AI-native product power lives in the endpoint grammar.',
		caption:
			'The visual model turns a chat request into a bounded endpoint contract with intent, schema, authority, state, limits, errors, evidence, and fallback.',
		nodes: [
			{ label: 'Intent', detail: 'Name the business capability.', icon: 'document', tone: 'neutral' },
			{ label: 'Authority', detail: 'Separate read, propose, approve, apply, and rollback.', icon: 'user', tone: 'wait' },
			{ label: 'State', detail: 'Persist sessions, events, limits, and artifacts.', icon: 'folder', tone: 'neutral' },
			{ label: 'Receipt', detail: 'Return evidence and recovery paths.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'An AI-native product endpoint grammar where chat requests pass through typed capability boundaries before becoming governed work.',
		motifs: [
			'chat request entering an endpoint boundary',
			'contract fields for intent, schema, authority, state, limits, errors, evidence, fallback',
			'Atlas-style workflow map behind the boundary',
			'operator receipt showing what ran, waited, stopped, or persisted'
		],
		alt: 'Abstract endpoint construction visual showing chat becoming a governed capability boundary with receipts.'
	}),
	'paper-policy-os-contract-bundle': defineArtifactVisuals({
		kind: 'layer-stack',
		title: 'Governed AI work ships as a contract bundle.',
		caption:
			'Capability, behavior, outcomes, golden tasks, and runbooks stay portable when policy is treated as the artifact.',
		nodes: [
			{ label: 'MCP contract', detail: 'Capability boundary.', icon: 'settings', tone: 'neutral' },
			{ label: 'Agent contract', detail: 'Behavior boundary.', icon: 'user', tone: 'neutral' },
			{ label: 'Outcome contract', detail: 'Success boundary.', icon: 'check', tone: 'run' },
			{ label: 'Runbook', detail: 'Human control boundary.', icon: 'document', tone: 'receipt' }
		],
		subject:
			'A portable Policy OS contract bundle stacking capability, behavior, outcome, golden-task, and runbook artifacts.',
		motifs: [
			'five artifact layers aligned as a governed bundle',
			'portable package boundary',
			'golden task receipt cards',
			'runbook control handle for a human operator'
		],
		alt: 'Abstract Policy OS contract bundle with stacked governance artifacts.'
	}),
	'paper-analyzer-mcp-review-architecture': defineArtifactVisuals({
		kind: 'flow',
		title: 'Review quality improves when evidence surfaces stay separate.',
		caption:
			'Published pages, Designer state, and policy snapshots feed one governed analyzer artifact without collapsing trust boundaries.',
		nodes: [
			{ label: 'Published site', detail: 'Observable page evidence.', icon: 'external-link', tone: 'neutral' },
			{ label: 'Designer state', detail: 'Private build metadata.', icon: 'edit', tone: 'wait' },
			{ label: 'Policy', detail: 'Versioned review rules.', icon: 'document', tone: 'receipt' },
			{ label: 'Analyzer MCP', detail: 'Governed review output.', icon: 'check', tone: 'run' }
		],
		subject:
			'A Webflow Analyzer MCP review architecture joining public site evidence, Designer metadata, and policy snapshots.',
		motifs: [
			'three evidence streams converging into a review artifact',
			'clear boundary between public and private inputs',
			'policy snapshot packet',
			'manual-bounded review output'
		],
		alt: 'Abstract analyzer MCP review architecture with three bounded evidence inputs.'
	}),
	'paper-webflow-analyzer-productization': defineArtifactVisuals({
		kind: 'flow',
		title: 'Productization translates evidence without exposing reviewer judgment.',
		caption:
			'Creator-facing validation, autofill, screenshots, and submission guidance are useful because they preserve the reviewer boundary.',
		nodes: [
			{ label: 'Analyzer', detail: 'Reviewer evidence stays governed.', icon: 'search', tone: 'neutral' },
			{ label: 'Validate', detail: 'Creator-safe checks happen early.', icon: 'check', tone: 'run' },
			{ label: 'Autofill', detail: 'Known data becomes submission help.', icon: 'edit', tone: 'neutral' },
			{ label: 'Handoff', detail: 'Reviewers inherit cleaner packets.', icon: 'share', tone: 'receipt' }
		],
		subject:
			'A creator-facing Webflow analyzer product path that translates review evidence into validation and submission assistance.',
		motifs: [
			'analyzer core behind a trust boundary',
			'validation and autofill lanes',
			'screenshot evidence packet',
			'creator-to-reviewer handoff'
		],
		alt: 'Abstract Webflow analyzer productization flow preserving reviewer trust boundaries.'
	}),
	'paper-andon-protocol': defineArtifactVisuals({
		kind: 'state-strip',
		title: 'Escalation is a protocol, not a vibe.',
		caption:
			'The Andon path makes uncertainty visible before an agent silently guesses or keeps working past its authority.',
		nodes: [
			{ label: 'Sense', detail: 'Uncertainty or obligation appears.', icon: 'info', tone: 'neutral' },
			{ label: 'Pull', detail: 'The agent raises the cord.', icon: 'warning', tone: 'wait' },
			{ label: 'Stop', detail: 'Impact pauses when the line must halt.', icon: 'close', tone: 'stop' },
			{ label: 'Resolve', detail: 'Batch review returns a decision.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'An AI-native Andon escalation protocol with first pull, line stop, resolution surface, and silent-running detection.',
		motifs: [
			'visible cord pull signal',
			'line-stop boundary for agent work',
			'resolution surface with batch review cards',
			'silent-running audit trail'
		],
		alt: 'Abstract Andon protocol showing escalation from uncertainty to line stop and resolution.'
	}),
	'paper-ground-case-study': defineArtifactVisuals({
		kind: 'proof-card',
		title: 'Verification replaces confidence theater with computed claims.',
		caption:
			'Ground turns similarity, symbol, and package claims into evidence an agent can cite without guessing.',
		nodes: [
			{ label: 'Claim', detail: 'A codebase question is made explicit.', icon: 'document', tone: 'neutral' },
			{ label: 'Compute', detail: 'AST and package facts are measured.', icon: 'settings', tone: 'run' },
			{ label: 'Reject guess', detail: 'Unsupported claims stop.', icon: 'warning', tone: 'stop' },
			{ label: 'Cite', detail: 'The answer carries evidence.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'A verification-first code analysis workflow where computed code facts replace approximate AI confidence.',
		motifs: [
			'code graph transformed into measured evidence',
			'confidence percentage crossed out',
			'AST similarity receipt',
			'agent answer linked to source proof'
		],
		alt: 'Abstract Ground case study showing computed code evidence replacing guessed confidence.'
	}),
	'paper-composio-three-tier-delivery': defineArtifactVisuals({
		kind: 'layer-stack',
		title: 'Commodity connectivity belongs below owned outcomes.',
		caption:
			'Composio can accelerate CRUD and OAuth, while CREATE SOMETHING keeps margin in policy, workflow, and judgment.',
		nodes: [
			{ label: 'Database', detail: 'External app state and records.', icon: 'folder', tone: 'neutral' },
			{ label: 'Automation', detail: 'Composio handles commodity actions.', icon: 'settings', tone: 'run' },
			{ label: 'Judgment', detail: 'Policy and outcomes stay owned.', icon: 'user', tone: 'wait' },
			{ label: 'Wrap', detail: 'Client sees the CREATE SOMETHING surface.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'A Composio delivery stack where commodity connectivity is wrapped by owned CREATE SOMETHING policy and outcome layers.',
		motifs: [
			'three-tier stack labeled Database, Automation, Judgment',
			'commodity connector inside a wrapper boundary',
			'client-facing surface above hidden integration plumbing',
			'policy receipt controlling graduation'
		],
		alt: 'Abstract Composio three-tier delivery stack with owned judgment above commodity connectivity.'
	}),
	'paper-policy-os-development-infrastructure': defineArtifactVisuals({
		kind: 'flow',
		title: 'The development harness is also a policy surface.',
		caption:
			'Policy OS applied to Pi makes local agent work inspectable through gates, receipts, and explicit handoffs.',
		nodes: [
			{ label: 'Policy OS', detail: 'Rules become artifacts.', icon: 'document', tone: 'receipt' },
			{ label: 'Pi harness', detail: 'Agent execution is bounded.', icon: 'settings', tone: 'neutral' },
			{ label: 'Quality gate', detail: 'Checks run before promotion.', icon: 'check', tone: 'run' },
			{ label: 'Handoff', detail: 'Evidence survives the session.', icon: 'share', tone: 'receipt' }
		],
		subject:
			'A development infrastructure workflow where Policy OS governs the Pi coding agent harness through quality gates.',
		motifs: [
			'policy artifact entering a coding harness',
			'quality gates as checkpoints',
			'agent worktree and evidence receipt',
			'handoff packet for the next operator'
		],
		alt: 'Abstract Policy OS development infrastructure with Pi harness quality gates.'
	}),
	'paper-braintrust-trace-unsurfacing': defineArtifactVisuals({
		kind: 'proof-card',
		title: 'Trace clusters expose what aggregate health hides.',
		caption:
			'A mostly green sample can still contain permission, routing, throttling, and latency structures that need operational decisions.',
		nodes: [
			{ label: 'Aggregate', detail: 'The top-line metric looks healthy.', icon: 'success', tone: 'run' },
			{ label: 'Trace sample', detail: 'Rows preserve runtime detail.', icon: 'document', tone: 'neutral' },
			{ label: 'Cluster', detail: 'Failures group by cause.', icon: 'search', tone: 'wait' },
			{ label: 'Decision', detail: 'Reliability work becomes targeted.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'A Braintrust trace audit where clustered failures emerge from a mostly green aggregate metric.',
		motifs: [
			'green aggregate panel with hidden lower trace rows',
			'clusters for permission, routing, throttling, latency',
			'trace cards grouped into decision lanes',
			'operator receipt for targeted reliability work'
		],
		alt: 'Abstract Braintrust trace unsurfacing visual showing hidden failure clusters under green aggregates.'
	})
};

export const fileBasedPapers: FileBasedPaper[] = applyArtifactVisuals(
	fileBasedPaperMetadata,
	fileBasedPaperVisuals,
	'fileBasedPapers'
);

/**
 * Get all file-based papers, transformed to match Paper interface
 */
export function getFileBasedPapers() {
	return fileBasedPapers.map(transformExperimentToPaper);
}

/**
 * Get a file-based paper by slug
 */
export function getFileBasedPaper(slug: string): FileBasedPaper | undefined {
	return fileBasedPapers.find(p => p.slug === slug);
}

/**
 * Check if a slug corresponds to a file-based paper
 */
export function isFileBasedPaper(slug: string): boolean {
	return fileBasedPapers.some(p => p.slug === slug);
}
