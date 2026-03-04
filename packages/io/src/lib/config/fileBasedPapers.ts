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
		description: 'How Composio is included as internal plumbing for commodity integrations while preserving CREATE SOMETHING\'s creation moat, Three-Tier control model, and Agent Outcome Stack delivery default.',
		excerpt_short: 'Composio is infrastructure, not positioning',
		excerpt_long: 'This paper documents why Composio is included in our framework, how the wrap pattern keeps CREATE SOMETHING client-facing, and where each bridge component maps to Database, Automation, and Judgment. It also records the current decision status: 29/29 technical checks passed on 2026-02-10, with a canonical conditional adopt decision on 2026-02-21 pending Phase 2 pilot closure.',
		category: 'Research',
		tags: [
			'Composio',
			'MCP',
			'Three-Tier Framework',
			'Wrap Pattern',
			'Agent Outcome Stack',
			'Automation Infrastructure'
		],
		created_at: '2026-03-04T00:00:00Z',
		updated_at: '2026-03-04T00:00:00Z',
		reading_time_minutes: 12,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: ['mcp-first-thesis', 'three-tier-framework', 'subtractive-triad'],
		route: '/papers/composio-three-tier-delivery',
		ascii_art: `
        ╭───────────────────────────────────────╮
       ╱   Client sees CREATE SOMETHING MCP      ╲
      │   Composio inside  →  Commodity CRUD     │
      │   Margin stays in policy + outcomes      │
      ╰───────────────────────────────────────────╯
           Creation over consumption.
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
