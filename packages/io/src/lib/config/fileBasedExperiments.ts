/**
 * File-Based Experiments Configuration
 *
 * Metadata for experiments that exist as Svelte component files
 * rather than database entries. These experiments can import and use
 * Svelte components for interactive visualizations.
 */

import type { FileBasedExperiment } from '@create-something/components';
import { transformExperimentToPaper } from '@create-something/components';

// Re-export for consumers
export type { FileBasedExperiment };

export const fileBasedExperiments: FileBasedExperiment[] = [
	{
		id: 'file-kickstand-triad-audit',
		slug: 'kickstand-triad-audit',
		title: 'Subtractive Triad Audit: Kickstand',
		description: 'Applied the Subtractive Triad framework (DRY → Rams → Heidegger) to audit a production venue intelligence system, achieving 48% health score improvement.',
		excerpt_short: 'Production system audit using the Subtractive Triad framework',
		excerpt_long: 'This paper documents the application of the Subtractive Triad framework to Kickstand, a venue intelligence system. Through systematic application of DRY (Unify), Rams (Remove), and Heidegger (Reconnect), we reduced active scripts by 92%, fixed 30 TypeScript errors, and improved documentation coherence.',
		category: 'case-study',
		tags: ['Subtractive Triad', 'Code Audit', 'DRY', 'Dieter Rams', 'Heidegger', 'Cloudflare Workers', 'TypeScript'],
		created_at: '2025-11-29T00:00:00Z',
		updated_at: '2025-11-29T00:00:00Z',
		reading_time_minutes: 12,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'subtractive-triad', // Meta: tests the triad itself
			'rams-principle-10', // As little as possible - 92% script reduction
			'heidegger-hermeneutic-circle' // Understanding through practice
		],
		ascii_art: `
    ╔═══════════════════════════════════════════════════════╗
    ║   SUBTRACTIVE TRIAD AUDIT                             ║
    ║                                                       ║
    ║   DRY        Rams       Heidegger                     ║
    ║   ─────      ─────      ─────────                     ║
    ║   Unify      Remove     Reconnect                     ║
    ║                                                       ║
    ║   Before:    After:                                   ║
    ║   ┌─────┐    ┌─────┐                                  ║
    ║   │█████│    │██   │  Scripts: 155 → 13              ║
    ║   │█████│    │     │  TS Errors: 30 → 0              ║
    ║   │█████│    │     │  Health: 6.2 → 9.2              ║
    ║   └─────┘    └─────┘                                  ║
    ║                                                       ║
    ║   "Creation is removing what obscures"                ║
    ╚═══════════════════════════════════════════════════════╝
`
	},
	{
		id: 'file-understanding-graphs',
		slug: 'understanding-graphs',
		title: 'Understanding Graphs: "Less, But Better" Codebase Navigation',
		description: 'Research experiment applying Heidegger\'s hermeneutic circle to develop minimal dependency documentation that captures only understanding-critical relationships.',
		excerpt_short: 'Minimal dependency documentation embodying "Weniger, aber besser"',
		excerpt_long: 'This paper presents Understanding Graphs: a minimal, human-readable approach to documenting codebase relationships that embodies Dieter Rams\' principle "less, but better." Through hermeneutic analysis, we developed a canonical format (UNDERSTANDING.md) that captures bidirectional semantic relationships without tooling.',
		category: 'research',
		tags: ['Hermeneutics', 'Codebase Navigation', 'Less But Better', 'Heidegger', 'Documentation', 'Methodology'],
		created_at: '2025-11-25T00:00:00Z',
		updated_at: '2025-11-26T00:00:00Z',
		reading_time_minutes: 15,
		difficulty: 'advanced',
		is_file_based: true,
		tests_principles: [
			'rams-principle-10', // As little as possible - minimal documentation
			'rams-principle-4', // Understandable - human-readable format
			'heidegger-hermeneutic-circle' // Understanding through interpretation
		],
		ascii_art: `
    ╔═══════════════════════════════════════════════════════╗
    ║   UNDERSTANDING GRAPHS                                ║
    ║                                                       ║
    ║   Traditional:        Understanding:                  ║
    ║   ┌───┐              ┌───────────────┐                ║
    ║   │ A │──imports──►  │ Purpose       │                ║
    ║   │   │──calls────►  │ Entry Points  │                ║
    ║   │   │──types────►  │ Key Concepts  │                ║
    ║   │   │──refs─────►  │ Depends On ↔  │                ║
    ║   └───┘              │ Enables       │                ║
    ║   (exhaustive)       └───────────────┘                ║
    ║                      (sufficient)                     ║
    ║                                                       ║
    ║   "Less, but better" — Dieter Rams                    ║
    ╚═══════════════════════════════════════════════════════╝
`
	},
	{
		id: 'file-agentic-viz',
		slug: 'agentic-visualization',
		title: 'Agentic Visualization: Autonomous UI Components Embodying Tufte\'s Principles',
		description: 'Research experiment demonstrating autonomous UI components that embody expert knowledge and make intelligent decisions about data presentation.',
		excerpt_short: 'Autonomous UI components that embody Edward Tufte\'s visualization principles',
		excerpt_long: 'This paper presents agentic visualization: autonomous UI components that embody expert knowledge and make intelligent decisions about data presentation. We demonstrate how Edward Tufte\'s principles for displaying quantitative information can be encoded into self-governing components.',
		category: 'research',
		tags: ['Visualization', 'Components', 'Tufte', 'Agentic Design', 'Research Paper'],
		created_at: '2025-11-25T00:00:00Z',
		updated_at: '2025-11-26T00:00:00Z',
		reading_time_minutes: 15,
		difficulty: 'advanced',
		is_file_based: true,
		tests_principles: [
			'tufte-data-ink-ratio', // Maximize data-ink ratio
			'tufte-small-multiples', // Reveal patterns through repetition
			'rams-principle-2', // Useful - components serve data revelation
			'rams-principle-5' // Unobtrusive - visualization recedes, data emerges
		],
		ascii_art: `
    ╔═══════════════════════════════════════════╗
    ║   AGENTIC VISUALIZATION                   ║
    ║                                           ║
    ║     ┌─────────────────────────────┐       ║
    ║  ▲  │         ╱╲                  │       ║
    ║  │  │        ╱  ╲      ╱╲         │       ║
    ║  │  │       ╱    ╲    ╱  ╲   ╱╲   │       ║
    ║  │  │      ╱      ╲  ╱    ╲ ╱  ╲  │       ║
    ║  │  │─────────────────────────────┤       ║
    ║     │  Data → Intelligence → Insight│      ║
    ║     └─────────────────────────────┘       ║
    ║                                           ║
    ║   Components that think, decide, reveal   ║
    ╚═══════════════════════════════════════════╝
`
	},
	{
		id: 'file-data-patterns',
		slug: 'data-patterns',
		title: 'Revealing Data Patterns Through Agentic Components',
		description: 'Demonstration of how agentic visualization components automatically reveal patterns, trends, and anomalies without manual analysis.',
		excerpt_short: 'How visualization components reveal patterns automatically',
		excerpt_long: 'A concise demonstration showing how @create-something/tufte components automatically reveal performance degradation, service health comparisons, and error distributions without requiring manual data analysis.',
		category: 'tutorial',
		tags: ['Visualization', 'Data Analysis', 'Patterns', 'Tutorial'],
		created_at: '2025-11-26T00:00:00Z',
		updated_at: '2025-11-26T00:00:00Z',
		reading_time_minutes: 5,
		difficulty: 'beginner',
		is_file_based: true,
		tests_principles: [
			'tufte-data-ink-ratio', // Maximize signal, minimize noise
			'rams-principle-3', // Aesthetic - form follows data
			'heidegger-aletheia' // Truth as unconcealment - patterns emerge
		],
		ascii_art: `
    ╔═══════════════════════════════════════════╗
    ║   DATA PATTERNS                           ║
    ║                                           ║
    ║   Trends:    ↗  ↘  ↗  →  ↗               ║
    ║            ────────────────────           ║
    ║   Auth:     ▇▆▅▄▃▂▁ ✓ improving          ║
    ║   Cache:    ▂▂▂▂▂▂▂ ✓ stable             ║
    ║   Database: ▁▂▃▄▅▆▇ ⚠ degrading          ║
    ║   Storage:  ▄▄▄▄▄▄▄ → flat               ║
    ║            ────────────────────           ║
    ║                                           ║
    ║   Patterns emerge without analysis        ║
    ╚═══════════════════════════════════════════╝
`
	}
];

/**
 * Get all file-based experiments, transformed to match Paper interface
 */
export function getFileBasedExperiments() {
	return fileBasedExperiments.map(transformExperimentToPaper);
}

/**
 * Get a file-based experiment by slug
 */
export function getFileBasedExperiment(slug: string): FileBasedExperiment | undefined {
	return fileBasedExperiments.find(exp => exp.slug === slug);
}

/**
 * Check if a slug corresponds to a file-based experiment
 */
export function isFileBasedExperiment(slug: string): boolean {
	return fileBasedExperiments.some(exp => exp.slug === slug);
}
