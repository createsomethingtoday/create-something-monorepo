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
		tests_principles: [
			'rams-principle-5', // Unobtrusive - tool recedes from user's attention
			'rams-principle-10', // As little as possible - stripped to essence
			'heidegger-zuhandenheit' // Ready-to-hand - the tool becomes invisible in use
		],
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
    |   Pre-understanding ────────► Emergent          |
    |   (README)                    (Implementation)  |
    |                                                 |
    |   The circle closes:                            |
    |   Practice reveals what theory cannot.          |
    +-------------------------------------------------+
`
	},
	{
		id: 'file-threshold-dwelling',
		slug: 'threshold-dwelling',
		title: 'Threshold Dwelling: Miesian Floor Plan Visualization',
		description:
			"Architectural visualization using Heidegger's threshold zone theory. Five zones reveal how we dwell: OUTER → SERVICE → PUBLIC → PRIVATE → OPEN.",
		excerpt_short: 'Floor plans through phenomenological zones',
		excerpt_long:
			"Threshold Dwelling applies Heidegger's concept of dwelling to architectural visualization. Rather than labeling rooms by function, the plan reveals five threshold zones—OUTER, SERVICE, PUBLIC, PRIVATE, OPEN—through barely perceptible value shifts. Tufte's data-ink ratio, Mies's 'less is more,' and Rams's unobtrusiveness converge in a single SVG.",
		category: 'practice',
		tags: ['Heidegger', 'Architecture', 'Tufte', 'Mies', 'Rams', 'SVG', 'Visualization'],
		created_at: '2025-11-30T00:00:00Z',
		updated_at: '2025-11-30T00:00:00Z',
		reading_time_minutes: 5,
		difficulty: 'intermediate',
		is_file_based: true,
		is_executable: 0,
		tests_principles: [
			'rams-principle-5', // Unobtrusive
			'rams-principle-10' // As little as possible
		],
		ascii_art: `
    +-------------------------------------------------+
    |   THRESHOLD DWELLING                            |
    |                                                 |
    |   OUTER ──► SERVICE ──► PUBLIC                  |
    |                           │                     |
    |                           ▼                     |
    |              OPEN ◄──── PRIVATE                 |
    |                                                 |
    |   Philosophy implicit in structure.             |
    +-------------------------------------------------+
`
	},
	{
		id: 'file-integration-praxis',
		slug: 'praxis',
		title: 'Integration Praxis: Learning Through Practice',
		description:
			'Interactive exercises teaching WORKWAY SDK patterns through the hermeneutic circle. Code, reflect, understand.',
		excerpt_short: 'Learn SDK patterns through guided practice',
		excerpt_long:
			'Integration Praxis embodies the hermeneutic circle: understanding emerges through practice, not documentation. Five exercises teach error handling, timeouts, retries, webhook security, and integration building. The Subtractive Triad audits each solution, revealing over-engineering and disconnection.',
		category: 'practice',
		tags: ['Hermeneutic Circle', 'SDK', 'Practice', 'Subtractive Triad', 'Interactive'],
		created_at: '2025-11-30T00:00:00Z',
		updated_at: '2025-11-30T00:00:00Z',
		reading_time_minutes: 30,
		difficulty: 'intermediate',
		is_file_based: true,
		is_executable: 1,
		tests_principles: [
			'rams-principle-2', // Useful
			'rams-principle-4', // Understandable
			'rams-principle-10' // As little as possible
		],
		route: '/praxis', // Override: lives at /praxis, not /experiments/praxis
		ascii_art: `
    +-------------------------------------------------+
    |   INTEGRATION PRAXIS                            |
    |                                                 |
    |   [Code] ──► [Run] ──► [Reflect] ──► [Reveal]   |
    |                                                 |
    |   DRY         Rams        Heidegger             |
    |   Unify       Remove      Reconnect             |
    |                                                 |
    |   Understanding through practice.               |
    +-------------------------------------------------+
`
	},
	{
		id: 'file-code-mode',
		slug: 'code-mode',
		title: 'Code Mode: The Zuhandenheit Experiment',
		description:
			"Experience Heidegger's tool-transparency distinction firsthand. Complete tasks using tool calling vs Code Mode and notice where your attention goes.",
		excerpt_short: 'Experience tool transparency vs tool obstruction',
		excerpt_long:
			"An interactive experiment applying Heidegger's Zuhandenheit (ready-to-hand) vs Vorhandenheit (present-at-hand) distinction to LLM agent architecture. Complete the same task twice—once with direct tool calling, once with Code Mode—and discover which mode lets tools recede into transparent use.",
		category: 'research',
		tags: ['Heidegger', 'Code Mode', 'Tool Calling', 'Phenomenology', 'Zuhandenheit', 'Interactive'],
		created_at: '2025-12-13T00:00:00Z',
		updated_at: '2025-12-13T00:00:00Z',
		reading_time_minutes: 10,
		difficulty: 'intermediate',
		is_file_based: true,
		is_executable: 1,
		tests_principles: [
			'heidegger-zuhandenheit', // Tools recede into use
			'rams-principle-5' // Unobtrusive - tool transparency
		],
		ascii_art: `
    +-------------------------------------------------+
    |   CODE MODE: THE ZUHANDENHEIT EXPERIMENT        |
    |                                                 |
    |   Tool Calling          Code Mode               |
    |   (Vorhandenheit)       (Zuhandenheit)          |
    |                                                 |
    |   <invoke...>           const x = await ...     |
    |     Attention           Attention               |
    |     ↓                   ↓                       |
    |   [THE TOOL]            [THE TASK]              |
    |                                                 |
    |   Where does your attention go?                 |
    +-------------------------------------------------+
`
	},
	{
		id: 'file-subtractive-form',
		slug: 'subtractive-form',
		title: 'Subtractive Form Design: When Absence Is Clearer Than Instruction',
		description:
			'Interactive experiment demonstrating how hiding inapplicable form fields eliminates user errors more effectively than instructions.',
		excerpt_short: 'Experience the hermeneutic question applied to form design',
		excerpt_long:
			'This experiment lets you experience Heidegger\'s system-level question—"Does this serve the whole?"—applied to form field design. Toggle between instructional and subtractive approaches, watch error rates shift from 68% to 0%, and understand why a visible field implies it should be filled—documentation cannot overcome this affordance.',
		category: 'practice',
		tags: ['Heidegger', 'Hermeneutic Circle', 'Form Design', 'UX', 'Subtractive Triad'],
		created_at: '2025-12-13T00:00:00Z',
		updated_at: '2025-12-13T00:00:00Z',
		reading_time_minutes: 5,
		difficulty: 'intermediate',
		is_file_based: true,
		is_executable: 1,
		tests_principles: [
			'rams-principle-5', // Unobtrusive - hidden fields don't demand attention
			'rams-principle-10', // As little as possible - remove what doesn't apply
			'heidegger-system' // Does this serve the whole?
		],
		ascii_art: `
    +-------------------------------------------------+
    |   SUBTRACTIVE FORM DESIGN                       |
    |                                                 |
    |   Before                  After                 |
    |                                                 |
    |   [Field] ───────►       (Hidden)               |
    |   "leave blank"           Nothing               |
    |                                                 |
    |   68% error rate          0% error rate         |
    |                                                 |
    |   Absence is clearer than instruction           |
    +-------------------------------------------------+
`
	},
	{
		id: 'file-hermeneutic-debugging',
		slug: 'hermeneutic-debugging',
		title: 'Hermeneutic Debugging: The Circle of Understanding',
		description:
			'Experience the hermeneutic circle in debugging. Walk through 8 iterations of a React bug, predicting outcomes and discovering hidden assumptions.',
		excerpt_short: 'Understanding emerges through iteration',
		excerpt_long:
			'Walk through a real debugging session where a simple logo animation required 8 iterations to solve. At each step, predict what will happen, run a simulation, and discover the hidden assumption that was exposed. Experience firsthand how debugging is interpretation—closing the gap between what we think the code does and what it actually does.',
		category: 'methodology',
		tags: ['Debugging', 'Hermeneutic Circle', 'Heidegger', 'React', 'Interactive'],
		created_at: '2025-12-13T00:00:00Z',
		updated_at: '2025-12-13T00:00:00Z',
		reading_time_minutes: 15,
		difficulty: 'intermediate',
		is_file_based: true,
		is_executable: 1,
		tests_principles: [
			'rams-principle-4', // Understandable
			'heidegger-hermeneutic-circle' // Understanding through iterative interpretation
		],
		ascii_art: `
    +-------------------------------------------------+
    |   HERMENEUTIC DEBUGGING                         |
    |                                                 |
    |   Attempt ──► Fail ──► Observe ──► Revise       |
    |      │                               │          |
    |      └───────────────────────────────┘          |
    |                                                 |
    |   Each failure reveals a hidden assumption.     |
    |                                                 |
    |   Understanding emerges through iteration.      |
    +-------------------------------------------------+
`
	},
	{
		id: 'file-nba-live',
		slug: 'nba-live',
		title: 'NBA Live Analytics: Spec-Driven Development Meta-Experiment',
		description:
			'Real-time NBA analytics dashboard testing whether spec-driven development produces both working software and methodology documentation.',
		excerpt_short: 'Spec-driven development through live sports analytics',
		excerpt_long:
			'A meta-experiment using live NBA data to test spec-driven development methodology. Three analytical views—Duo Synergy, Defensive Impact, and Shot Network—validate the hypothesis that structured specs can guide agent-based development. The dashboard itself is the artifact; the methodology documentation is the meta-artifact.',
		category: 'methodology',
		tags: ['Spec-Driven', 'Agent Orchestration', 'Data Visualization', 'Tufte', 'D3', 'Meta-Experiment'],
		created_at: '2026-01-04T00:00:00Z',
		updated_at: '2026-01-04T00:00:00Z',
		reading_time_minutes: 20,
		difficulty: 'advanced',
		is_file_based: true,
		is_executable: 1,
		tests_principles: [
			'rams-principle-2', // Useful - delivers real analytical value
			'rams-principle-4', // Understandable - clear methodology explanations
			'rams-principle-8', // Thorough - complete analytical coverage
			'heidegger-zuhandenheit' // Tools recede - infrastructure disappears
		],
		ascii_art: `
    +-------------------------------------------------+
    |   NBA LIVE ANALYTICS                            |
    |                                                 |
    |   [Duo Synergy]  [Defensive]  [Shot Network]    |
    |        PPP        Impact          D3 Graph      |
    |                                                 |
    |   ┌─────────────────────────────────────────┐   |
    |   │  NBA API ──► Worker ──► D1 ──► Views    │   |
    |   │             (30s KV)                    │   |
    |   └─────────────────────────────────────────┘   |
    |                                                 |
    |   Spec-driven development produces             |
    |   both software and methodology.               |
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
