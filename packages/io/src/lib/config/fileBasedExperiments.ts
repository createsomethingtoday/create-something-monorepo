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
	},
	{
		id: 'file-meeting-capture',
		slug: 'meeting-capture',
		title: 'Meeting Capture: Tools Recede, Understanding Remains',
		description: 'Building a personal meeting transcription tool that embodies Heideggerian Zuhandenheit—the tool disappears into use while understanding emerges.',
		excerpt_short: 'A meeting transcription tool where the tool recedes and understanding remains',
		excerpt_long: 'This experiment documents building a personal meeting transcription system that embodies Heidegger\'s concept of Zuhandenheit (ready-to-hand). Rather than competing with feature-rich alternatives like Granola or Otter, we built the minimum viable tool that captures audio, transcribes via Whisper, and stores in CREATE SOMETHING\'s knowledge infrastructure.',
		category: 'research',
		tags: ['Heidegger', 'Zuhandenheit', 'Cloudflare', 'Swift', 'Transcription', 'Tools'],
		created_at: '2025-12-04T00:00:00Z',
		updated_at: '2025-12-04T00:00:00Z',
		reading_time_minutes: 12,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'heidegger-zuhandenheit', // Tools recede into transparent use
			'rams-principle-10', // As little design as possible
			'rams-principle-2', // Useful - serves understanding, not features
			'subtractive-triad' // DRY → Rams → Heidegger applied
		],
		ascii_art: `
    ╔═══════════════════════════════════════════╗
    ║   MEETING CAPTURE                         ║
    ║                                           ║
    ║   ┌─────────┐    ┌─────────┐    ┌───────┐ ║
    ║   │ ((o))   │ →  │    ~    │ →  │  ≡≡≡  │ ║
    ║   │  Audio  │    │ Whisper │    │ Text  │ ║
    ║   └─────────┘    └─────────┘    └───────┘ ║
    ║                                           ║
    ║      Swift         Cloudflare      D1     ║
    ║     (local)        (process)    (store)   ║
    ║                                           ║
    ║   "The tool recedes, understanding        ║
    ║    remains." — Heidegger                  ║
    ╚═══════════════════════════════════════════╝
`
	},
	{
		id: 'file-template-recategorization',
		slug: 'template-recategorization',
		title: 'Template Recategorization: MCP as Hermeneutic Bridge',
		description: 'Using Claude Code with Airtable MCP to recategorize miscategorized Webflow templates—demonstrating how AI agents can participate in the hermeneutic circle of data curation.',
		excerpt_short: 'AI-assisted data curation through MCP tool integration',
		excerpt_long: 'Validated experiment: Claude Code with Airtable MCP successfully recategorized 8 templates incorrectly placed in "Public Services" (intended for government entities). Demonstrates tool complementarity, hermeneutic spiral in data curation, and establishes a reusable pattern for .agency service delivery.',
		category: 'research',
		tags: ['MCP', 'Airtable', 'Claude Code', 'Data Curation', 'Tool Complementarity', 'Webflow', 'Validated'],
		created_at: '2025-12-05T00:00:00Z',
		updated_at: '2025-12-05T00:00:00Z',
		reading_time_minutes: 10,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'tool-complementarity', // Claude Code interprets, human confirms, agent executes
			'hermeneutic-spiral', // Understanding deepens: taxonomy ↔ individual templates
			'rams-principle-2', // Useful - correct categorization serves marketplace users
			'subtractive-triad' // DRY (use MCP) → Rams (remove wrong categories) → Heidegger (serve whole)
		],
		ascii_art: `
    ╔═══════════════════════════════════════════╗
    ║   TEMPLATE RECATEGORIZATION   ✓ VALIDATED ║
    ║                                           ║
    ║   ┌─────────┐    ┌─────────┐    ┌───────┐ ║
    ║   │  SLACK  │ →  │  CLAUDE │ →  │AIRTABLE║
    ║   │ (issue) │    │  (MCP)  │    │(update)│ ║
    ║   └─────────┘    └─────────┘    └───────┘ ║
    ║                                           ║
    ║   Human        Claude Code      Database  ║
    ║  (intent)    (interpretation)   (state)   ║
    ║                                           ║
    ║   8 templates corrected via conversation  ║
    ╚═══════════════════════════════════════════╝
`
	},
	{
		id: 'file-text-revelation',
		slug: 'text-revelation',
		title: 'Subtractive Typography: When Removal Is the Animation',
		description: 'Exploring scroll-driven text subtraction where the medium embodies the message—corporate fluff strikes through and fades, leaving only the essence: "We remove what obscures."',
		excerpt_short: 'Text animation where removal itself is the message',
		excerpt_long: 'The most CREATE SOMETHING way to tell the subtraction story is through text that subtracts itself. No decorative elements—the medium embodies the message. This experiment documents a scroll-driven Progressive Erasure animation where corporate copy strikes through, fades away, and leaves only the essential phrase: "We remove what obscures."',
		category: 'research',
		tags: ['Typography', 'Animation', 'Scroll-Driven', 'Subtraction', 'Canon', 'CSS'],
		created_at: '2025-12-11T00:00:00Z',
		updated_at: '2025-12-11T00:00:00Z',
		reading_time_minutes: 8,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'rams-principle-10', // As little design as possible—text IS the animation
			'heidegger-aletheia', // Truth as unconcealment—essence emerges through removal
			'subtractive-triad', // The technique demonstrates the philosophy it describes
			'rams-principle-4' // Understandable—the animation teaches subtraction
		],
		ascii_art: `
    ╔═══════════════════════════════════════════════════════════════╗
    ║   SUBTRACTIVE TYPOGRAPHY                                      ║
    ║                                                               ║
    ║   Frame 0:                                                    ║
    ║   ┌─────────────────────────────────────────────────────────┐ ║
    ║   │ We help businesses identify operational inefficiencies  │ ║
    ║   │ and implement AI-powered automation solutions that      │ ║
    ║   │ streamline workflows and remove what obscures.          │ ║
    ║   └─────────────────────────────────────────────────────────┘ ║
    ║                              ↓ scroll                         ║
    ║   Frame 1:                                                    ║
    ║   ┌─────────────────────────────────────────────────────────┐ ║
    ║   │ We h̶e̶l̶p̶ ̶b̶u̶s̶i̶n̶e̶s̶s̶e̶s̶ ̶i̶d̶e̶n̶t̶i̶f̶y̶ ̶o̶p̶e̶r̶a̶t̶i̶o̶n̶a̶l̶ ̶i̶n̶e̶f̶f̶i̶c̶i̶e̶n̶c̶i̶e̶s̶  │ ║
    ║   │ a̶n̶d̶ ̶i̶m̶p̶l̶e̶m̶e̶n̶t̶ ̶A̶I̶-̶p̶o̶w̶e̶r̶e̶d̶ ̶a̶u̶t̶o̶m̶a̶t̶i̶o̶n̶ ̶s̶o̶l̶u̶t̶i̶o̶n̶s̶ ̶t̶h̶a̶t̶      │ ║
    ║   │ s̶t̶r̶e̶a̶m̶l̶i̶n̶e̶ ̶w̶o̶r̶k̶f̶l̶o̶w̶s̶ ̶a̶n̶d̶ remove what obscures.        │ ║
    ║   └─────────────────────────────────────────────────────────┘ ║
    ║                              ↓ scroll                         ║
    ║   Frame 2:                                                    ║
    ║   ┌─────────────────────────────────────────────────────────┐ ║
    ║   │                                                         │ ║
    ║   │              We remove what obscures.                   │ ║
    ║   │                                                         │ ║
    ║   └─────────────────────────────────────────────────────────┘ ║
    ║                                                               ║
    ║   "The medium embodies the message."                          ║
    ╚═══════════════════════════════════════════════════════════════╝
`
	},
	{
		id: 'file-dwelling-conversion',
		slug: 'dwelling-conversion',
		title: 'Dwelling as Conversion: The Subtractive Triad Assessment',
		description: 'Transforming the agency homepage from static sales copy to an interactive assessment that continues the dwelling experience—applying Heidegger\'s Zuhandenheit to conversion optimization.',
		excerpt_short: 'Converting users by continuing their dwelling rather than interrupting it',
		excerpt_long: 'Analytics revealed a rupture: users dwell in experiments on .space and .io (50%+ of traffic) but bounce from .agency\'s static sales page. The solution wasn\'t better copy—it was continuing the experiment. This paper documents building an interactive Subtractive Triad Assessment that transforms selling into dwelling.',
		category: 'research',
		tags: ['Heidegger', 'Conversion', 'Assessment', 'Hermeneutic Circle', 'Dwelling', 'Agency', 'Analytics'],
		created_at: '2025-12-11T00:00:00Z',
		updated_at: '2025-12-11T00:00:00Z',
		reading_time_minutes: 10,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'heidegger-zuhandenheit', // Tool recedes—assessment feels like exploration, not interrogation
			'hermeneutic-spiral', // User's answers deepen mutual understanding
			'rams-principle-2', // Useful—surfaces relevant service, not just collects leads
			'subtractive-triad' // Applied at meta-level: assessment IS the triad
		],
		ascii_art: `
    ╔═══════════════════════════════════════════╗
    ║   DWELLING AS CONVERSION                  ║
    ║                                           ║
    ║   Before:        After:                   ║
    ║   ┌─────────┐    ┌─────────────────────┐  ║
    ║   │  SELL   │    │   Q1: Accumulating? │  ║
    ║   │ "Start  │    │   Q2: Remove what?  │  ║
    ║   │  conv." │    │   Q3: Stopping you? │  ║
    ║   └────┬────┘    └──────────┬──────────┘  ║
    ║        │                    │             ║
    ║     5.6%               dwelling           ║
    ║   contact              continues          ║
    ║                                           ║
    ║   "The tool recedes; insight emerges."    ║
    ╚═══════════════════════════════════════════╝
`
	},
	{
		id: 'file-agent-continuity',
		slug: 'agent-continuity',
		title: 'Agent Continuity: Harnesses for Long-Running Sessions',
		description: 'Analysis of Anthropic\'s agent harness patterns through a Heideggerian lens—how persistent artifacts enable re-entry into the hermeneutic circle across context boundaries.',
		excerpt_short: 'How agents maintain understanding across session boundaries',
		excerpt_long: 'When context exhausts, agents experience Unzuhandenheit—the tool becomes conspicuous, workflow breaks. This research analyzes Anthropic\'s patterns for long-running agents (progress files, structured feature lists, session protocols) and maps them to CREATE SOMETHING\'s existing architecture, identifying opportunities for adoption.',
		category: 'research',
		tags: ['Agent Architecture', 'Heidegger', 'Context Management', 'Anthropic', 'Session Continuity', 'Reference'],
		created_at: '2025-12-08T00:00:00Z',
		updated_at: '2025-12-08T00:00:00Z',
		reading_time_minutes: 8,
		difficulty: 'advanced',
		is_file_based: true,
		tests_principles: [
			'hermeneutic-spiral', // Each session re-enters the circle of understanding
			'heidegger-zuhandenheit', // Harness artifacts recede into transparent use
			'rams-principle-10', // As little as possible—minimal harness, maximum continuity
			'subtractive-triad' // DRY (structured state) → Rams (essential files only) → Heidegger (serve understanding)
		],
		ascii_art: `
    ╔═══════════════════════════════════════════╗
    ║   AGENT CONTINUITY                        ║
    ║                                           ║
    ║   Session 1      Session 2      Session N ║
    ║   ┌───────┐      ┌───────┐      ┌───────┐ ║
    ║   │ Agent │ ──▶  │ Agent │ ──▶  │ Agent │ ║
    ║   └───┬───┘      └───┬───┘      └───┬───┘ ║
    ║       │              │              │     ║
    ║       ▼              ▼              ▼     ║
    ║   ╔═══════════════════════════════════╗   ║
    ║   ║  progress.txt  │  features.json  ║   ║
    ║   ║  git history   │  init.sh        ║   ║
    ║   ╚═══════════════════════════════════╝   ║
    ║                                           ║
    ║   "Artifacts enable re-entry into the     ║
    ║    hermeneutic circle" — Heidegger        ║
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
