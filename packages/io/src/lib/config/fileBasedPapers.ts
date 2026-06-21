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

// Re-use the FileBasedExperiment type since it has the same shape
export type FileBasedPaper = FileBasedExperiment;

/**
 * Papers that should be served from markdown files
 *
 * These papers have their full content in /content/papers/{slug}.md
 * and can be served by the [slug] dynamic route.
 */
export const fileBasedPapers: FileBasedPaper[] = [
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
