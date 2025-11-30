/**
 * File-Based Experiments Configuration
 *
 * SEIN: Experiments that exist as Svelte component files
 * rather than database entries. Interactive, executable.
 *
 * "Weniger, aber besser" - Less, but better.
 */

import type { FileBasedExperiment } from '@create-something/components';
import { transformExperimentToPaper } from '@create-something/components';

// Re-export for consumers
export type { FileBasedExperiment };

export const fileBasedExperiments: FileBasedExperiment[] = [
	{
		id: 'file-minimal-capture',
		slug: 'minimal-capture',
		title: 'Minimal Capture: The Canon\'s Reach',
		description:
			'An experiment in propagation: when tools built for others absorb the ethos. QR → Form → Storage → Retrieval, stripped to essence.',
		excerpt_short: 'When the canon propagates beyond the boundary',
		excerpt_long:
			'Minimal Capture explores what happens when CREATE SOMETHING principles are applied to external projects. Built as a gift for someone outside the practice, the tool unconsciously absorbed the design canon—proving that "weniger, aber besser" is not a style but a way of seeing.',
		category: 'practice',
		tags: ['Hermeneutics', 'Design Canon', 'Heidegger', 'Gift', 'Propagation'],
		created_at: '2025-11-27T00:00:00Z',
		updated_at: '2025-11-27T00:00:00Z',
		reading_time_minutes: 5,
		difficulty: 'intermediate',
		is_file_based: true,
		is_executable: 1,
		// Hermeneutic Circle: Evidence is QUALITATIVE, not quantitative
		// The artifact's existence proves canon propagation - no execution metrics needed
		// "The tool already embodies the principles. Measuring clicks adds noise."
		ascii_art: `
    +-------------------------------------------------+
    |   MINIMAL CAPTURE                               |
    |                                                 |
    |   [QR] ──► [Form] ──► [D1] ──► [Admin]          |
    |                                                 |
    |   Built for another,                            |
    |   absorbed the canon.                           |
    |                                                 |
    |   The ethos propagates                          |
    |   beyond the boundary.                          |
    +-------------------------------------------------+
`
	},
	{
		id: 'file-motion-ontology',
		slug: 'motion-ontology',
		title: 'Motion Ontology: Phenomenological Animation Analysis',
		description:
			"Extract and interpret web animations through Heidegger's phenomenological lens. Real Puppeteer-based analysis reveals the being of motion.",
		excerpt_short: 'Phenomenological analysis of web animations',
		excerpt_long:
			"Motion Ontology applies Heidegger's phenomenological framework to web animation analysis. Using real Puppeteer-based extraction with page.hover(), we capture animations mid-flight and interpret them through concepts like Zuhandenheit (ready-to-hand) and Vorhandenheit (present-at-hand).",
		category: 'research',
		tags: ['Phenomenology', 'Animation', 'Heidegger', 'Puppeteer', 'Motion Design'],
		created_at: '2025-11-26T00:00:00Z',
		updated_at: '2025-11-26T00:00:00Z',
		reading_time_minutes: 10,
		difficulty: 'advanced',
		is_file_based: true,
		is_executable: 1,
		// Hermeneutic Circle: Tests Rams principles on animation
		tests_principles: ['rams-principle-5', 'rams-principle-10'], // Unobtrusive, As little as possible
		ascii_art: `
    +-------------------------------------------------+
    |   MOTION ONTOLOGY                               |
    |                                                 |
    |   Zuhandenheit        Vorhandenheit             |
    |   (ready-to-hand)     (present-at-hand)         |
    |                                                 |
    |      [hover]              [inspect]             |
    |        |                      |                 |
    |        v                      v                 |
    |   Transparent           Analyzed                |
    |   engagement            breakdown               |
    |                                                 |
    |   The being of animation revealed               |
    +-------------------------------------------------+
`
	},
	{
		id: 'file-workway-canon-audit',
		slug: 'workway-canon-audit',
		title: 'WORKWAY SDK: The Hermeneutic Circle in Practice',
		description:
			"Applying Dieter Rams' 10 Principles to integration SDK development. Score improved from 41/50 to 48/50 through iterative implementation.",
		excerpt_short: 'Canon maintenance applied to SDK development',
		excerpt_long:
			"The WORKWAY SDK Canon Audit demonstrates the hermeneutic circle in action: pre-understanding (README) meets emergent understanding (implementation). Through building integrations, gaps revealed themselves—ActionResult error structure, timeout patterns, retry logic. The canon doesn't exist in isolation; it's validated through practice.",
		category: 'canon',
		tags: ['Dieter Rams', 'Canon Maintenance', 'SDK Design', 'Hermeneutic Circle', 'DX'],
		created_at: '2025-11-29T00:00:00Z',
		updated_at: '2025-11-29T00:00:00Z',
		reading_time_minutes: 15,
		difficulty: 'advanced',
		is_file_based: true,
		is_executable: 0,
		tests_principles: [
			'rams-principle-2', // Useful
			'rams-principle-6', // Honest
			'rams-principle-7', // Long-lasting
			'rams-principle-8', // Thorough
			'rams-principle-10' // As little as possible
		],
		ascii_art: `
    +-------------------------------------------------+
    |   WORKWAY SDK CANON AUDIT                       |
    |                                                 |
    |   Pre-understanding    Emergent understanding   |
    |   (README)             (Implementation)         |
    |                                                 |
    |        |                      |                 |
    |        v                      v                 |
    |   ActionResult  ──────►  DX Helpers             |
    |   IntegrationError ───►  Error Taxonomy         |
    |   Timeout ────────────►  AbortController        |
    |   Retry ──────────────►  Exponential Backoff    |
    |                                                 |
    |   Score: 41/50 ──────────────────► 48/50        |
    |                                                 |
    |   "The circle closes: implementation            |
    |    reveals what documentation cannot."          |
    +-------------------------------------------------+
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
	return fileBasedExperiments.find((exp) => exp.slug === slug);
}

/**
 * Check if a slug corresponds to a file-based experiment
 */
export function isFileBasedExperiment(slug: string): boolean {
	return fileBasedExperiments.some((exp) => exp.slug === slug);
}
