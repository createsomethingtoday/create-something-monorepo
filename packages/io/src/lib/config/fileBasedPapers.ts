/**
 * File-Based Papers Configuration
 *
 * Metadata for papers that exist as markdown files in content/papers/
 * rather than static Svelte routes.
 *
 * This enables the [slug] dynamic route to serve papers from markdown.
 */

import type { FileBasedExperiment } from '@create-something/canon';
import { isPublicFileBasedContent, transformExperimentToPaper } from '@create-something/canon';

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
		featured: 100,
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
		featured: 90,
		tests_principles: ['rams-principle-2', 'subtractive-triad'],
		route: '/papers/andon-protocol',
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
		featured: 80,
		tests_principles: [
			'verification-first',
			'rams-principle-2',
			'subtractive-triad'
		],
		route: '/papers/ground-case-study',
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
		featured: 75,
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
		id: 'paper-braintrust-trace-unsurfacing',
		slug: 'braintrust-trace-unsurfacing',
		title: 'Braintrust Trace Unsurfacing: Finding What Normal Aggregates Hide',
		description:
			'How a 1,000-row Braintrust trace snapshot exposed clustered permission failures, routing misses, and latent control-plane stalls that aggregate reliability metrics hid.',
		excerpt_short: 'A trace audit that turns hidden reliability structure into ranked experiments',
		excerpt_long:
			'This paper documents a CREATE SOMETHING Braintrust trace audit and explains why aggregate uptime metrics were insufficient to diagnose practical reliability risk. It converts concentrated failure clusters into ranked experiments with explicit acceptance criteria and dashboard contracts.',
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
			'policy-as-artifact',
			'observability'
		],
		route: '/papers/braintrust-trace-unsurfacing',
		ascii_art: `
        ╭───────────────────────────────────────╮
       ╱   1,000 traces     71 error rows        ╲
      │   Aggregates hide  →  clusters surface   │
      │   Incidents become ranked experiments    │
      ╰───────────────────────────────────────────╯
           Reliability is structure, not vibes.
`
	}
];

function getPublicFileBasedPapers(): FileBasedPaper[] {
	return fileBasedPapers.filter(isPublicFileBasedContent);
}

/**
 * Get all file-based papers, transformed to match Paper interface
 */
export function getFileBasedPapers() {
	return getPublicFileBasedPapers().map(transformExperimentToPaper);
}

/**
 * Get a file-based paper by slug
 */
export function getFileBasedPaper(slug: string): FileBasedPaper | undefined {
	return getPublicFileBasedPapers().find((p) => p.slug === slug);
}

/**
 * Check if a slug corresponds to a file-based paper
 */
export function isFileBasedPaper(slug: string): boolean {
	return getPublicFileBasedPapers().some((p) => p.slug === slug);
}
