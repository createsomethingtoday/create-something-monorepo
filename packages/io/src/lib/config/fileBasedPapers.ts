/**
 * File-Based Research Papers Configuration
 *
 * Formal academic research papers that provide theoretical grounding.
 * Distinguished from experiments by their ontological mode:
 *
 * Papers = Vorhandenheit (present-at-hand)
 *   → Detached theoretical analysis
 *   → Reader as observer
 *   → DESCRIBES the hermeneutic circle
 *
 * Experiments = Zuhandenheit (ready-to-hand)
 *   → Engaged practical demonstration
 *   → Reader as participant
 *   → DEMONSTRATES the hermeneutic circle
 *
 * Both contribute to .io's research mission, closing the circle
 * between philosophy (.ltd) and practice (.space).
 */

import type { FileBasedPaper } from '@create-something/components';
import { transformResearchPaperToPaper } from '@create-something/components';

// Re-export for consumers
export type { FileBasedPaper };

export const fileBasedPapers: FileBasedPaper[] = [
	{
		id: 'paper-code-mode-hermeneutic',
		slug: 'code-mode-hermeneutic-analysis',
		title: 'Code-Mediated Tool Use: A Hermeneutic Analysis of LLM-Tool Interaction',
		subtitle: 'Why Code Mode Achieves Zuhandenheit Where Tool Calling Forces Vorhandenheit',
		authors: ['CREATE SOMETHING Research'],
		abstract: `This paper applies Heidegger's phenomenological analysis of ready-to-hand (Zuhandenheit) versus present-at-hand (Vorhandenheit) to contemporary Large Language Model (LLM) agent architecture, specifically examining the distinction between direct tool calling and code-mediated tool access (Code Mode). We argue that Code Mode achieves Zuhandenheit—tools becoming transparent in use—while traditional tool calling forces Vorhandenheit—tools as objects of conscious focus. This is not merely an optimization but an ontological shift in how agents relate to tools.`,
		keywords: [
			'Code Mode',
			'MCP',
			'Hermeneutic Circle',
			'Zuhandenheit',
			'Vorhandenheit',
			'LLM Agents',
			'Cloudflare Workers',
			'Phenomenology',
			'AI-Native Development'
		],
		description:
			'A phenomenological analysis applying Heidegger to LLM agent architecture, demonstrating why Code Mode achieves tool transparency where traditional approaches fail.',
		excerpt_short: 'Heidegger meets LLM agents: Why Code Mode works',
		excerpt_long:
			'This paper applies Heidegger\'s phenomenological framework to understand why LLMs perform better writing code to call tools than generating tool calls directly. Through hermeneutic analysis, we reveal this is not merely a training data phenomenon but an ontological shift—Code Mode achieves Zuhandenheit (ready-to-hand) where tool calling forces Vorhandenheit (present-at-hand).',
		category: 'research',
		created_at: '2025-11-21T00:00:00Z',
		updated_at: '2025-12-02T00:00:00Z',
		reading_time_minutes: 45,
		difficulty: 'advanced',
		is_file_based: true,
		tests_principles: [
			'heidegger-zuhandenheit', // Core thesis: Code Mode achieves ready-to-hand
			'heidegger-vorhandenheit', // Contrasts with present-at-hand tool calling
			'heidegger-hermeneutic-circle', // Section V traces the circle explicitly
			'rams-principle-5', // Unobtrusive - tools recede from attention
			'rams-principle-10' // As little as possible - minimal cognitive overhead
		],
		related_experiments: [
			'minimal-capture', // Demonstrates zuhandenheit in practice
			'motion-ontology', // Phenomenological analysis of motion
			'kickstand-triad-audit' // Applied hermeneutic methodology
		],
		source_path: 'papers/drafts/code-mode-hermeneutic-analysis.md',
		ascii_art: `
    ╔═══════════════════════════════════════════════════════════════╗
    ║   CODE-MEDIATED TOOL USE                                      ║
    ║   A Hermeneutic Analysis                                      ║
    ║                                                               ║
    ║   Tool Calling           Code Mode                            ║
    ║   ────────────           ─────────                            ║
    ║   ┌─────────┐           async function() {                    ║
    ║   │ <tool>  │             const result =                      ║
    ║   │  call   │               await api.call();                 ║
    ║   │ </tool> │             return process(result);             ║
    ║   └─────────┘           }                                     ║
    ║                                                               ║
    ║   Vorhandenheit          Zuhandenheit                         ║
    ║   (present-at-hand)      (ready-to-hand)                      ║
    ║                                                               ║
    ║   Tools as objects       Tools recede into                    ║
    ║   of explicit focus      transparent use                      ║
    ║                                                               ║
    ║   "The hammer disappears when hammering"                      ║
    ║                              — Heidegger, Being and Time      ║
    ╚═══════════════════════════════════════════════════════════════╝
`
	}
];

/**
 * Get all file-based papers, transformed to match Paper interface
 */
export function getFileBasedPapers() {
	return fileBasedPapers.map(transformResearchPaperToPaper);
}

/**
 * Get a file-based paper by slug
 */
export function getFileBasedPaper(slug: string): FileBasedPaper | undefined {
	return fileBasedPapers.find((paper) => paper.slug === slug);
}

/**
 * Check if a slug corresponds to a file-based paper
 */
export function isFileBasedPaper(slug: string): boolean {
	return fileBasedPapers.some((paper) => paper.slug === slug);
}
