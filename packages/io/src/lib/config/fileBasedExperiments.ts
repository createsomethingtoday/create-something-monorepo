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
		title: 'Dwelling as Conversion: From Assessment to Progressive Erasure',
		description: 'Documenting the evolution from interactive assessment to scroll-driven TextRevelation—two modes of dwelling that transform conversion into experience.',
		excerpt_short: 'Two approaches to conversion as dwelling: asking vs showing',
		excerpt_long: 'This experiment documents two approaches to the same insight: conversion is dwelling continued. Phase 1 used interactive assessment questions. Phase 2 uses TextRevelation—a scroll-driven animation where words erase to reveal "We remove what obscures." Both achieve Zuhandenheit through different modes of engagement.',
		category: 'research',
		tags: ['Heidegger', 'Conversion', 'TextRevelation', 'Scroll Animation', 'Progressive Erasure', 'Dwelling', 'Agency', 'Evolution'],
		created_at: '2025-12-11T00:00:00Z',
		updated_at: '2025-12-13T00:00:00Z',
		reading_time_minutes: 12,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'heidegger-zuhandenheit', // Tool recedes—both modes achieve transparent use
			'heidegger-aletheia', // Truth as unconcealment—essence emerges through removal
			'rams-principle-10', // As little design as possible—text IS the animation
			'subtractive-triad' // Applied at meta-level: evolution embodies subtraction
		],
		ascii_art: `
    ╔═══════════════════════════════════════════════════════════════════╗
    ║   DWELLING AS CONVERSION: EVOLUTION                               ║
    ║                                                                   ║
    ║   Phase 1: Active              Phase 2: Contemplative             ║
    ║   ┌────────────────────┐       ┌────────────────────────────────┐ ║
    ║   │ Q1: Accumulating?  │       │ "We help businesses..."        │ ║
    ║   │ Q2: Would remove?  │  ──►  │         ↓ scroll               │ ║
    ║   │ Q3: Stopping you?  │       │ "We remove what obscures"      │ ║
    ║   └────────────────────┘       └────────────────────────────────┘ ║
    ║                                                                   ║
    ║   Both achieve Zuhandenheit: the tool recedes                     ║
    ╚═══════════════════════════════════════════════════════════════════╝
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
	},
	{
		id: 'file-validation-zuhandenheit',
		slug: 'validation-zuhandenheit',
		title: 'Validation as Zuhandenheit: Preventing Tool Breakdown Through Proximity',
		description: 'When validation occurs at the point of input, tools remain ready-to-hand. When errors surface downstream, tools break down into present-at-hand obstruction.',
		excerpt_short: 'Client-side validation keeps tools transparent; server errors cause breakdown',
		excerpt_long: 'A case study in form validation through a Heideggerian lens. When users upload files with 100+ character names, the downstream Admin system fails with a cryptic "failed to upload image" error. By moving validation to the input boundary, we prevent Vorhandenheit—the moment when tools stop serving and start obstructing.',
		category: 'research',
		tags: ['Heidegger', 'Validation', 'Zuhandenheit', 'Vorhandenheit', 'Forms', 'Case Study'],
		created_at: '2025-12-12T00:00:00Z',
		updated_at: '2025-12-12T00:00:00Z',
		reading_time_minutes: 6,
		difficulty: 'beginner',
		is_file_based: true,
		tests_principles: [
			'heidegger-zuhandenheit', // Validation recedes into transparent use
			'heidegger-vorhandenheit', // Server errors force tool breakdown
			'rams-principle-4', // Understandable—errors appear where they're made
			'rams-principle-5' // Unobtrusive—validation disappears when input is valid
		],
		ascii_art: `
    ╔═══════════════════════════════════════════╗
    ║   VALIDATION AS ZUHANDENHEIT              ║
    ║                                           ║
    ║   Before (Vorhandenheit):                 ║
    ║   ┌────────┐     ┌────────┐     ┌──────┐  ║
    ║   │ Input  │ ──▶ │ Server │ ──▶ │ ???  │  ║
    ║   │ (ok)   │     │  (ok)  │     │ FAIL │  ║
    ║   └────────┘     └────────┘     └──────┘  ║
    ║                                 ↑         ║
    ║                          "failed to       ║
    ║                           upload image"   ║
    ║                                           ║
    ║   After (Zuhandenheit):                   ║
    ║   ┌────────┐                              ║
    ║   │ Input  │ ──▶ ✓ proceeds               ║
    ║   │ ⚠ 142  │     or                       ║
    ║   │ chars  │ ──▶ ✗ "rename file"          ║
    ║   └────────┘                              ║
    ║                                           ║
    ║   The tool recedes; the work continues.   ║
    ╚═══════════════════════════════════════════╝
`
	},
	{
		id: 'file-heideggerian-form',
		slug: 'heideggerian-form-experience',
		title: 'Heideggerian Form Experience: When Forms Serve Rather Than Extract',
		description: 'An interactive experiment demonstrating Heideggerian philosophy through service configuration. Form behavior embodies Zuhandenheit (transparent use), Vorhandenheit (validation breakdown), Gestell (extraction patterns), and Gelassenheit (service-oriented design).',
		excerpt_short: 'Forms that demonstrate philosophy through interaction',
		excerpt_long: 'This experiment presents a live service configuration form alongside a real-time database view. As users configure services, the form demonstrates Heideggerian concepts: Zuhandenheit when flowing smoothly, Vorhandenheit when validation breaks, Gestell through meta-commentary on extraction, and Gelassenheit through forms that serve user intent.',
		category: 'research',
		tags: ['Heidegger', 'Forms', 'UX', 'Interactive', 'Philosophy', 'D1', 'Subtractive Triad'],
		created_at: '2025-12-19T00:00:00Z',
		updated_at: '2025-12-19T00:00:00Z',
		reading_time_minutes: 8,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'heidegger-zuhandenheit', // Form recedes into transparent use
			'heidegger-vorhandenheit', // Validation makes form visible
			'heidegger-gestell', // Meta-commentary on extraction
			'heidegger-gelassenheit', // Neither submission nor rejection
			'rams-principle-4', // Understandable - form teaches through use
			'rams-principle-5' // Unobtrusive - no unnecessary friction
		],
		ascii_art: `
    ╔═══════════════════════════════════════════════════════════════════════╗
    ║   HEIDEGGERIAN FORM EXPERIENCE                                        ║
    ║                                                                       ║
    ║   ┌─────────────────────────────┬────────────────────────────────┐    ║
    ║   │                             │                                │    ║
    ║   │    SERVICE CONFIGURATION    │     LIVE DATABASE              │    ║
    ║   │                             │                                │    ║
    ║   │    ┌─ Service Type ────┐    │     ┌────────────────────────┐ │    ║
    ║   │    │ [Automation    ▼] │    │     │ automation / workflow  │ │    ║
    ║   │    └───────────────────┘    │     │ 2 features · growth    │ │    ║
    ║   │                             │     ├────────────────────────┤ │    ║
    ║   │    ┌─ Scope ───────────┐    │     │ transformation / proc  │ │    ║
    ║   │    │ [Workflow      ▼] │    │     │ 4 features · enterprise│ │    ║
    ║   │    └───────────────────┘    │     └────────────────────────┘ │    ║
    ║   │                             │                                │    ║
    ║   │    ┌─ Features ────────┐    │     "The form recedes;         │    ║
    ║   │    │ ☑ Routing         │    │      the service emerges."     │    ║
    ║   │    │ ☐ Triggers        │    │                                │    ║
    ║   │    └───────────────────┘    │                                │    ║
    ║   │                             │                                │    ║
    ║   └─────────────────────────────┴────────────────────────────────┘    ║
    ║                                                                       ║
    ║   Zuhandenheit → Vorhandenheit → Gestell → Gelassenheit              ║
    ╚═══════════════════════════════════════════════════════════════════════╝
`
	},
	{
		id: 'file-subtractive-revelation',
		slug: 'subtractive-revelation',
		title: 'Subtractive Revelation: Logo as Aletheia',
		description: 'An interactive experiment where the CREATE SOMETHING cube emerges through noise removal. The cube was always there—we merely reveal it through disciplined subtraction.',
		excerpt_short: 'The cube was always there. You merely removed what concealed it.',
		excerpt_long: 'This experiment embodies Heidegger\'s Aletheia—truth as unconcealment. Rather than building up a logo through additive means (grids, construction), we start with noise that conceals the isometric cube. User interaction subtracts the noise, revealing what was always present beneath.',
		category: 'research',
		tags: ['Heidegger', 'Aletheia', 'Logo', 'Interactive', 'Subtraction', 'Philosophy', 'Animation'],
		created_at: '2025-12-21T00:00:00Z',
		updated_at: '2025-12-21T00:00:00Z',
		reading_time_minutes: 5,
		difficulty: 'beginner',
		is_file_based: true,
		tests_principles: [
			'heidegger-aletheia', // Truth as unconcealment—the cube was always there
			'subtractive-triad', // Creation is removal of what obscures
			'rams-principle-10', // As little design as possible—noise is the only addition
			'heidegger-zuhandenheit', // Wipe mode: tool recedes into use
			'heidegger-gelassenheit' // Dissolve/stillness modes: letting-be
		],
		ascii_art: `
    ╔═══════════════════════════════════════════════════════════════════════╗
    ║   SUBTRACTIVE REVELATION                                              ║
    ║                                                                       ║
    ║   Before:                        After:                               ║
    ║   ┌────────────────────┐         ┌────────────────────┐               ║
    ║   │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │         │                    │               ║
    ║   │ ▒▒▒░▒▒▒▒▒▒▒▒▒░▒▒▒▒ │         │       ╱╲           │               ║
    ║   │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │   ──►   │      ╱  ╲          │               ║
    ║   │ ▒▒░▒▒▒▒▒░▒▒▒▒▒▒░▒▒ │         │     ╱╲  ╱╲         │               ║
    ║   │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │         │    ╱  ╲╱  ╲        │               ║
    ║   │ ▒▒▒▒░▒▒▒▒▒▒▒░▒▒▒▒▒ │         │                    │               ║
    ║   └────────────────────┘         └────────────────────┘               ║
    ║                                                                       ║
    ║   "The cube was always there. You merely removed what concealed it."  ║
    ╚═══════════════════════════════════════════════════════════════════════╝
`
	},
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
