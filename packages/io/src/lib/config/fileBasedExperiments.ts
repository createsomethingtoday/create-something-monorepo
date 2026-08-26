/**
 * File-Based Experiments Configuration
 *
 * Metadata for experiments that exist as Svelte component files
 * rather than database entries. These experiments can import and use
 * Svelte components for interactive visualizations.
 */

import type { FileBasedExperiment } from '@create-something/canon';
import type { Paper } from '@create-something/canon/types';
import { transformExperimentToPaper } from '@create-something/canon';
import { applyArtifactVisuals, defineArtifactVisuals } from './visualCommunication';

// Re-export for consumers
export type { FileBasedExperiment };
export type FileBasedExperimentPaper = Paper & {
	is_file_based?: boolean;
	tests_principles?: string[];
	route?: string;
};

const fileBasedExperimentMetadata: FileBasedExperiment[] = [
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
                          .,:;+*?%S#@
                     .,;*?%S##@@@@@@@@#
                  .;*?S#@@@@@@@@@@@@@@@@#
               .,+%#@@@@@@@"""""""@@@@@@@S
              ,+S@@@@@@"           "@@@@@@*
             ;%@@@@@"    ╱╲          "@@@@@;
            +#@@@@"    ╱    ╲    ╱╲    "@@@#+
           *#@@@"    ╱        ╲╱    ╲   "@@#*
          ?#@@"    ╱                  ╲   "@@?
         %#@@"   ═══════════════════════  "@#%
        S#@@"    Data → Intelligence      "@@S
       #@@@"              ↓                "@@@#
      @@@@@"           Insight            "@@@@@
     @@@@@@@"""""""""""""""""""""""""""@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
   #@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#
    Components that think, decide, reveal
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
                    ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
                  ▄█▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█▄
                 ██  ╱╲                         ██
                ██  ╱  ╲      ╱╲               ██
               ██  ╱    ╲    ╱  ╲   ╱╲        ██
              ██  ╱      ╲  ╱    ╲ ╱  ╲  ↗   ██
             ██──────────────────────────────██
            ██  ▇▆▅▄▃▂▁  Auth     ✓ improving ██
           ██  ▂▂▂▂▂▂▂  Cache    ✓ stable    ██
          ██  ▁▂▃▄▅▆▇  Database ⚠ degrading  ██
         ██  ▄▄▄▄▄▄▄  Storage  → flat        ██
        ██▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄██
       ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
          Patterns emerge without analysis
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
              .+*%S#@@#S%*+.
           ,*S@@@@@@@@@@@@@S*,
         .?#@@@#S%*++++*%S#@@@#?.
        +#@@S*.            .*S@@#+
       *@@#,    ((●))         ,#@@*
      +@@%     ╱     ╲         %@@+
      S@@    ╱   ~~~   ╲        @@S
      #@#   ╱  Whisper  ╲       #@#
      S@@    ╲         ╱        @@S
      +@@%     ╲     ╱    ≡≡≡  %@@+
       *@@#,    ╲   ╱    ≡≡≡ ,#@@*
        +#@@S*.   ╲╱   ≡≡≡.*S@@#+
         .?#@@@#S%*+++*%S#@@@#?.
           ,*S@@@@@@@@@@@@@S*,
              .+*%S#@@#S%*+.
      The tool recedes, understanding remains.
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
           ✓ VALIDATED
        ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
       █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
      █░  ╭─────╮    ╭─────╮    ╭─────╮  ░█
     █░  │SLACK │ ══▶│CLAUDE│ ══▶│  DB │  ░█
    █░   │ 💬  │    │ 🤖  │    │ 📊 │   ░█
   █░    ╰─────╯    ╰─────╯    ╰─────╯    ░█
  █░      Human      Agent      State      ░█
 █░      intent   interprets   updates      ░█
█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
█▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓█
 ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
       8 templates corrected via MCP
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
      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
     ░ We help businesses identify operational         ░
    ░  inefficiencies and implement AI-powered          ░
   ░   automation solutions that streamline              ░
  ░    workflows and remove what obscures.                ░
 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                         ↓ scroll
      ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
     ▒ W̶e̶ ̶h̶e̶l̶p̶ ̶b̶u̶s̶i̶n̶e̶s̶s̶e̶s̶ ̶i̶d̶e̶n̶t̶i̶f̶y̶ ̶o̶p̶e̶r̶a̶t̶i̶o̶n̶a̶l̶         ▒
    ▒  i̶n̶e̶f̶f̶i̶c̶i̶e̶n̶c̶i̶e̶s̶ ̶a̶n̶d̶ ̶i̶m̶p̶l̶e̶m̶e̶n̶t̶ ̶A̶I̶-̶p̶o̶w̶e̶r̶e̶d̶          ▒
   ▒   a̶u̶t̶o̶m̶a̶t̶i̶o̶n̶ ̶s̶o̶l̶u̶t̶i̶o̶n̶s̶ ̶t̶h̶a̶t̶ ̶s̶t̶r̶e̶a̶m̶l̶i̶n̶e̶              ▒
  ▒    w̶o̶r̶k̶f̶l̶o̶w̶s̶ ̶a̶n̶d̶ remove what obscures.                ▒
 ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
                         ↓ scroll
      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

            We remove what obscures.

      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
          The medium embodies the message.
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
         PHASE 1                          PHASE 2
        ╭───────╮                        ╭───────╮
       ╱ Active  ╲                      ╱Contemp-╲
      ╱   Mode    ╲      ═══════▶      ╱  lative  ╲
     ╱─────────────╲                  ╱───────────╲
    │ Q: Accumulat? │                │  "We help   │
    │ Q: Remove?    │   ──────▶      │  business.."│
    │ Q: Stopping?  │                │      ↓      │
    ╰───────────────╯                │  "We remove │
          │                          │   what      │
          │                          │  obscures"  │
          ▼                          ╰─────────────╯
    ╔═════════════════════════════════════════════╗
    ║  Both achieve Zuhandenheit: tool recedes    ║
    ╚═════════════════════════════════════════════╝
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
        ●═══════════●═══════════●═══════════●
       ╱│╲         ╱│╲         ╱│╲         ╱│╲
      ╱ │ ╲       ╱ │ ╲       ╱ │ ╲       ╱ │ ╲
     Session    Session    Session    Session
        1          2          3          N
        │          │          │          │
        └────┬─────┴────┬─────┴────┬─────┘
             │          │          │
             ▼          ▼          ▼
    ╔═══════════════════════════════════════════╗
    ║  ┌─────────────┐  ┌──────────────────┐   ║
    ║  │progress.txt │  │  features.json   │   ║
    ║  │ git history │  │     init.sh      │   ║
    ║  └─────────────┘  └──────────────────┘   ║
    ╚═══════════════════════════════════════════╝
           Artifacts enable re-entry into
             the hermeneutic circle
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
    BEFORE: Vorhandenheit (breakdown)
    ─────────────────────────────────────────
         ╭──────╮    ╭──────╮    ╭──────╮
        ╱ Input  ╲══▶╱Server ╲══▶╱  ???  ╲
       │   ✓     │  │   ✓    │  │ ✗FAIL │
        ╲       ╱    ╲      ╱    ╲      ╱
         ╰──────╯    ╰──────╯    ╰──────╯
                               "failed to
                              upload image"

    AFTER: Zuhandenheit (transparent)
    ─────────────────────────────────────────
              ╭──────────╮
             ╱   Input    ╲───▶ ✓ proceeds
            │  ⚠ 142 chars │
             ╲            ╱───▶ ✗ rename
              ╰──────────╯

       The tool recedes; the work continues.
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
    ╭═══════════════════════════════════════════════════════════════╮
    │                                                               │
    │  ┌──────────────────────┐   ┌──────────────────────────────┐  │
    │  │                      │   │                              │  │
    │  │  SERVICE CONFIG      │   │     LIVE DATABASE            │  │
    │  │  ╭────────────────╮  │   │  ┌────────────────────────┐  │  │
    │  │  │ [Automation ▼] │  │   │  │ automation / workflow  │  │  │
    │  │  ╰────────────────╯  │══▶│  │ 2 features · growth    │  │  │
    │  │  ╭────────────────╮  │   │  ├────────────────────────┤  │  │
    │  │  │ [Workflow   ▼] │  │   │  │ transformation / proc  │  │  │
    │  │  ╰────────────────╯  │   │  │ 4 features · enterprise│  │  │
    │  │  ╭────────────────╮  │   │  └────────────────────────┘  │  │
    │  │  │ ☑ Routing      │  │   │                              │  │
    │  │  │ ☐ Triggers     │  │   │   "The form recedes;         │  │
    │  │  ╰────────────────╯  │   │    the service emerges."     │  │
    │  └──────────────────────┘   └──────────────────────────────┘  │
    │                                                               │
    ╰═══════════════════════════════════════════════════════════════╯
      Zuhandenheit → Vorhandenheit → Gestell → Gelassenheit
`
	},
	{
		id: 'file-render-preview',
		slug: 'render-preview',
		title: 'Render Preview: See What the AI Sees',
		description: 'Interactive SVG-to-PNG preview showing the ControlNet conditioning input. Upload architectural drawings and see how they transform for AI rendering.',
		excerpt_short: 'Preview the conditioning input for AI architectural renders',
		excerpt_long: 'This experiment exposes the render pipeline\'s conditioning step. Upload an SVG floor plan and see the Canon-styled PNG that ControlNet will use to guide photorealistic rendering. Interactive crop selection lets you isolate rooms before full render.',
		category: 'research',
		tags: ['Render Pipeline', 'ControlNet', 'SVG', 'WASM', 'Architecture', 'AI', 'Transparency'],
		created_at: '2025-12-27T00:00:00Z',
		updated_at: '2025-12-27T00:00:00Z',
		reading_time_minutes: 5,
		difficulty: 'beginner',
		is_file_based: true,
		tests_principles: [
			'heidegger-zuhandenheit', // Tool recedes when working
			'rams-principle-4', // Understandable - see the conditioning
			'heidegger-aletheia', // Truth revealed through transparency
			'subtractive-triad' // Canon colors: remove what obscures
		],
		ascii_art: `
         ╭─────────────╮        ╭─────────────╮        ╭─────────────╮
        ╱             ╲      ╱             ╲      ╱             ╲
       │  ┌───┐ ┌───┐  │    │  ▓▓▓   ▓▓▓   │    │ ▒▒▒▒▒▒▒▒▒▒▒▒ │
       │  │   │ │   │  │═══▶│  ▓▓▓   ▓▓▓   │═══▶│ ▒▒▒▒▒▒▒▒▒▒▒▒ │
       │  └───┘ └───┘  │WASM│  ▓▓▓▓▓▓▓▓▓   │ AI │ ▒▒▒▒░░▒▒▒▒▒▒ │
       │  ┌─────────┐  │    │  ▓▓▓▓▓▓▓▓▓   │    │ ▒░░░░░░░░▒▒▒ │
       │  │         │  │    │  ▓▓▓▓▓▓▓▓▓   │    │ ▒▒▒▒▒▒▒▒▒▒▒▒ │
        ╲             ╱      ╲             ╱      ╲             ╱
         ╰─────────────╯        ╰─────────────╯        ╰─────────────╯
          Original SVG          Canon Preview          Photorealistic
          (your drawing)       (white on black)           Render

            "See what the AI sees. Control what the AI does."
`
	},
	{
		id: 'file-render-studio',
		slug: 'render-studio',
		title: 'Render Studio: Explicit Control, Transparent Results',
		description: 'Full architectural rendering workflow with Canon presets and pattern-based SVG operations. No natural language—explicit vocabulary, deterministic results.',
		excerpt_short: 'Architectural rendering with explicit presets and transparent conditioning',
		excerpt_long: 'Render Studio combines SVG editing with photorealistic rendering. Unlike black-box tools like Fenestra, presets are visible and named (threshold-dwelling, golden-hour), operations are pattern-based (no AI interpretation), and conditioning is transparent (see what the AI sees).',
		category: 'research',
		tags: ['Render Pipeline', 'ControlNet', 'SVG', 'Architecture', 'AI', 'Presets', 'Canon'],
		created_at: '2025-12-27T00:00:00Z',
		updated_at: '2025-12-27T00:00:00Z',
		reading_time_minutes: 10,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'heidegger-zuhandenheit', // Presets recede into transparent use
			'rams-principle-4', // Understandable - named presets, visible conditioning
			'heidegger-aletheia', // Truth revealed through explicit operations
			'subtractive-triad' // Pattern-based ops remove ambiguity
		],
		ascii_art: `
    ┏━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
    ┃   FLOOR PLAN EDITOR    ┃      RENDER PREVIEW          ┃
    ┃                        ┃                              ┃
    ┃   ╔═══╗ ╔═══╗          ┃   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    ┃
    ┃   ║   ║ ║   ║ [Upload] ┃   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    ┃
    ┃   ╚═══╝ ╚═══╝          ┃   ▓▓▓▓▓   ▓▓▓▓▓   ▓▓▓▓▓▓    ┃
    ┃   ╔═════════════╗      ┃   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    ┃
    ┃   ║             ║      ┃   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    ┃
    ┃   ╚═════════════╝      ┃                              ┃
    ┣━━━━━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
    ┃ [🛋️][👥][🏷️][🗑️]       ┃  Materials: threshold-dwelling ┃
    ┃                        ┃  Lighting:  golden-hour       ┃
    ┃ [Undo(3)] [Reset]      ┃  Angle:     wide              ┃
    ┗━━━━━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
             Explicit vocabulary. Deterministic results.
`
	},
	{
		id: 'file-spritz',
		slug: 'spritz',
		title: 'Spritz: Speed Reading for Video Walkthroughs',
		description: 'RSVP speed reading component with Optimal Recognition Point highlighting—words displayed one at a time, aligned to where your eye naturally focuses. Built for video intro/transition screens and interactive documentation.',
		excerpt_short: 'Speed reading component for video walkthroughs and interactive docs',
		excerpt_long: 'Spritz uses Rapid Serial Visual Presentation (RSVP) to display text one word at a time, with the Optimal Recognition Point (ORP) highlighted. This eliminates eye movement and enables 2-3x faster reading. Perfect for video intro screens, transitions, and interactive documentation where users control playback.',
		category: 'research',
		tags: ['RSVP', 'Speed Reading', 'Video', 'Documentation', 'Accessibility', 'Canon', 'Component'],
		created_at: '2026-01-15T00:00:00Z',
		updated_at: '2026-01-15T00:00:00Z',
		reading_time_minutes: 5,
		difficulty: 'beginner',
		is_file_based: true,
		tests_principles: [
			'rams-principle-10', // As little design as possible—word and ORP only
			'heidegger-zuhandenheit', // Controls recede into transparent use
			'rams-principle-4', // Understandable—no learning curve required
			'subtractive-triad' // Removes eye movement, reveals meaning
		],
		ascii_art: `
    Traditional: Your eyes ←─────→ move across
    ───────────────────────────────────────────

                         │
                         │
                         ▼
              ┌──────────────────────┐
              │                      │
              │     und e r s t and  │
              │           ▲          │
              │           │          │
              │      ORP focus       │
              │                      │
              └──────────────────────┘
                         │
                         │
                         ▼
              Eyes stay fixed.
              Words stream past.

           200 WPM ────▶ 400+ WPM
            with 90% comprehension
`
	},
	{
		id: 'file-living-arena',
		slug: 'living-arena',
		title: 'Living Arena: AI-Native Automation at Scale',
		description: 'What if your building could help people without them having to ask? A visualization of arena systems—security, lighting, HVAC, scheduling—all breathing as one, with humans always in control.',
		excerpt_short: 'AI-native arena automation with transparent reasoning and human oversight',
		excerpt_long: 'When you have access to all systems, interesting things happen. The building anticipates needs, coordinates responses, and keeps people safe—while staying honest about what it doesn\'t know and keeping humans in charge of the big decisions. This experiment shows what that looks like.',
		category: 'research',
		tags: ['AI-Native', 'Automation', 'Arena', 'Human-in-the-Loop', 'SVG', 'Reasoning', 'WORKWAY'],
		created_at: '2026-01-16T00:00:00Z',
		updated_at: '2026-01-16T00:00:00Z',
		reading_time_minutes: 12,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'human-in-the-loop', // Humans always decide on critical actions
			'explainable-reasoning', // AI shows its thinking, not just its decisions
			'holistic-updates', // One change, everything adapts together
			'honest-failures', // Transparent about limitations and mistakes
			'rams-principle-4', // Understandable—clear copy, no jargon
			'rams-principle-2' // Useful—serves human needs, not technology
		],
		ascii_art: `
                    ╱╲      ╱╲      ╱╲
                   ╱  ╲    ╱  ╲    ╱  ╲
                  ╱ 🛡️ ╲  ╱ 💡 ╲  ╱ 🌡️ ╲
                 ╱SECUR╲╱ LITE ╲╱ HVAC ╲
                ╱────────────────────────╲
               ╱                          ╲
              │    ╭────────────────╮      │
              │    │                │      │
              │    │   ╭──────╮     │      │
              │    │   │  AI  │     │      │
              │    │   ╰──────╯     │      │
              │    │       │        │      │
              │    │       ▼        │      │
              │    │      👤        │      │
              │    │  HUMAN DECIDES │      │
              │    ╰────────────────╯      │
               ╲                          ╱
                ╲────────────────────────╱
                 ╲ 📅 ╱╲ 📡 ╱╲    ╱
                  ╲  ╱  ╲  ╱  ╲  ╱
                   ╲╱    ╲╱    ╲╱
           The system helps. A human chooses.
`
	},
	{
		id: 'file-kinetic-typography',
		slug: 'kinetic-typography',
		title: 'Kinetic Typography: Data-Ink Ratio for Motion',
		description: 'Text animation as information revelation. Combining fluid morphing with assembly to show semantic weight—where Tufte meets Heidegger.',
		excerpt_short: 'Animation that reveals information hierarchy, not decoration',
		excerpt_long: 'Tufte\'s principle "Above all else, show the data" applied to kinetic typography. Characters scatter then converge, while emphasized words gain weight. The weight transition IS the data layer—revealing which words carry semantic importance. Animation as aletheia: truth unconcealed through motion.',
		category: 'research',
		tags: ['Typography', 'Animation', 'Tufte', 'Kinetic', 'Data Visualization', 'Canon', 'CSS'],
		created_at: '2025-12-21T00:00:00Z',
		updated_at: '2025-12-21T00:00:00Z',
		reading_time_minutes: 6,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'tufte-data-ink-ratio', // Animation adds information, not decoration
			'heidegger-aletheia', // Truth as unconcealment—emphasis emerges through motion
			'rams-principle-10', // As little design as possible—weight IS the data
			'rams-principle-4' // Understandable—hierarchy revealed through animation
		],
		ascii_art: `
       SCATTER              CONVERGE              WEIGHT
     ╭─────────╮          ╭─────────╮          ╭─────────╮
    │  L     s  │        │           │        │           │
    │    e   ,  │ ═════▶ │ Less, but │ ═════▶ │ Less, but │
    │      b t  │        │    better │        │   BETTER  │
    │  u      r │        │           │        │           │
    │        e  │        │           │        │           │
     ╰─────────╯          ╰─────────╯          ╰─────────╯
         │                    │                    │
         ▼                    ▼                    ▼
    ░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓████████████████
    0%            20%              60%            100%
    opacity      position         lock        weight gain

        "Above all else, show the data." — Tufte
`
	},
	{
		id: 'file-ic-mvp-pipeline',
		slug: 'ic-mvp-pipeline',
		title: 'IC MVP → Webflow Components: Agentic Translation Pipeline',
		description: 'Systematic translation of IC-built MVPs into production Webflow Code Components via agentic engineering. First validated case: Bundle Scanner translated in 3.5 hours with 95%+ design fidelity.',
		excerpt_short: 'Translating IC MVPs to Webflow Code Components via agentic engineering',
		excerpt_long: 'ICs build MVPs in Cursor, Claude Code, Lovable—then what? This experiment validates a pipeline for translating those MVPs into production Webflow Code Components. The Bundle Scanner (security tool for App Reviewers) translated in 3.5 hours: analysis, package creation, Shadow DOM styling, props exposure, bundle & share.',
		category: 'research',
		tags: ['Webflow', 'Code Components', 'DevLink', 'Agentic Engineering', 'Pipeline', 'MVP', 'Validated'],
		created_at: '2026-01-16T00:00:00Z',
		updated_at: '2026-01-16T00:00:00Z',
		reading_time_minutes: 15,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'tool-complementarity', // Agent analyzes, translates; human approves, tests
			'rams-principle-2', // Useful—MVPs become production components
			'heidegger-zuhandenheit', // Components recede into Designer use
			'subtractive-triad' // Remove friction from MVP → production path
		],
		ascii_art: `
                                              ✓ VALIDATED
       ╭──────────╮    ╭──────────╮    ╭──────────╮    ╭──────────╮
      ╱          ╲  ╱          ╲  ╱          ╲  ╱          ╲
     │   IC MVP   │══▶│  AGENTIC  │══▶│ WEBFLOW  │══▶│ DESIGNER │
     │            │  │  ANALYSIS │  │COMPONENT │  │  CANVAS  │
     │ Cursor/    │  │           │  │          │  │          │
     │ Claude/    │  │ Structure │  │.webflow  │  │ Props UI │
     │ Lovable    │  │ Deps      │  │.tsx      │  │ Preview  │
      ╲          ╱  │ Styling   │  │Shadow DOM│  │ Publish  │
       ╰──────────╯    ╰──────────╯    ╰──────────╯    ╰──────────╯

     ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
     ┃  Bundle Scanner: 3.5hrs │ 95%+ fidelity │ 100% features ┃
     ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
              MVPs stop dying in Downloads folders.
`
	},
	{
		id: 'file-canvas-interactivity',
		slug: 'canvas-interactivity',
		title: 'Canvas Interactivity: High-Performance Interactive Components',
		description: 'Four canvas-based interactive components demonstrating SvelteKit\'s advantages for rich UI: force-directed graphs, timeline editors, real-time charts, and exportable diagrams.',
		excerpt_short: 'Canvas-based components for graphs, timelines, charts, and diagrams',
		excerpt_long: 'This experiment showcases four high-performance canvas-based components built for SvelteKit: (1) KnowledgeGraphCanvas using Barnes-Hut approximation for O(n log n) force simulation, (2) TimelineEditor for keyframe animation editing, (3) RealtimeChart for live data visualization, and (4) CanvasDiagram with PNG/SVG export capabilities.',
		category: 'research',
		tags: ['Canvas', 'Data Viz', 'Interactive', 'Performance', 'SvelteKit'],
		created_at: '2026-01-16T00:00:00Z',
		updated_at: '2026-01-16T00:00:00Z',
		reading_time_minutes: 8,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'rams-principle-2', // Useful—direct manipulation for complex data
			'rams-principle-4', // Understandable—visual metaphors for abstract concepts
			'heidegger-zuhandenheit', // Tools recede, data emerges
			'tufte-data-ink-ratio' // Maximum data, minimum chrome
		],
		ascii_art: `
    ╭─────────────────────╮    ╭─────────────────────╮
   ╱   KNOWLEDGE GRAPH     ╲  ╱   TIMELINE EDITOR     ╲
  │       ○───○             │ │  ├──●──────●────●──   │
  │      ╱│╲  │             │ │  ├──●────●──────────  │
  │     ○─○─○ ○             │ │  └──●──●────────●──   │
  │    O(n log n)           │ │   ▼ scrub, edit       │
   ╲                       ╱   ╲                     ╱
    ╰─────────────────────╯    ╰─────────────────────╯

    ╭─────────────────────╮    ╭─────────────────────╮
   ╱    REALTIME CHART     ╲  ╱    CANVAS DIAGRAM     ╲
  │         ╱╲              │ │    ┌───┐    ◯         │
  │     ╱╲╱  ╲╱╲            │ │    │   │───▶          │
  │    ─────────────        │ │    └───┘    ◇         │
  │     live streaming      │ │   export PNG/SVG      │
   ╲                       ╱   ╲                     ╱
    ╰─────────────────────╯    ╰─────────────────────╯

      Canvas → pixels, bypassing DOM overhead
`
	},
	{
		id: 'file-ascii-renderer',
		slug: 'ascii-renderer',
		title: 'Shape-Aware ASCII Renderer: 6D Character Matching',
		description: 'High-quality ASCII rendering using 6D shape vectors and contrast enhancement. Characters are matched by shape, not just brightness—resulting in sharp edges and crisp contours.',
		excerpt_short: 'ASCII rendering with 6D shape matching and contrast enhancement',
		excerpt_long: 'Traditional ASCII renderers treat characters like pixels, mapping brightness to density. This experiment implements Alex Harri\'s technique: 6 sampling circles capture how each character fills its cell as a 6D vector. Contrast enhancement (global + directional) sharpens edges. The result: ASCII art that follows contours, not just gradients.',
		category: 'research',
		tags: ['ASCII', 'Rendering', 'Canvas', '3D', 'Shape Vectors', 'Contrast Enhancement'],
		created_at: '2026-01-21T00:00:00Z',
		updated_at: '2026-01-21T00:00:00Z',
		reading_time_minutes: 8,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'tufte-data-ink-ratio', // Characters convey shape, not just brightness
			'rams-principle-10', // Minimal overhead—characters ARE the visualization
			'heidegger-aletheia', // Form revealed through shape matching
			'subtractive-triad' // Remove brightness-only mapping, reveal shape
		],
		ascii_art: `
      TRADITIONAL              SHAPE-AWARE (6D)
    ╭─────────────╮          ╭─────────────────╮
   ╱@@@@@@@@@@@@@@@╲        ╱,,,##########,,,,╲
  │@@@@##########@@@│      │,,##MMMMMMMM##,,,│
  │@@@############@@│ ──▶  │,#MMMMMMMMMMMM#,,│
  │@@@@@@@@@@@@@@@@@@│      │,#MMMMM""""MMM#,,│
   ╲@@@@@@@@@@@@@@@╱        ╲,,##########,,,╱
    ╰─────────────╯          ╰─────────────────╯
    Blurry edges             Sharp contours

           6D Shape Vector
          ╭───┬───╮
          │ ○ │ ○ │ ← upper (staggered)
          ├───┼───┤
          │ ○ │ ○ │ ← middle
          ├───┼───┤
          │ ○ │ ○ │ ← lower (staggered)
          ╰───┴───╯

     ASCII characters are not pixels—
              they have SHAPE.
`
	},
	{
		id: 'file-living-arena-gpu',
		slug: 'living-arena-gpu',
		title: 'Living Arena GPU: WebGPU Crowd Simulation',
		description: 'WebGPU-accelerated crowd simulation with 8,000+ agents showing emergent behaviors—bottleneck formation, wave propagation, and panic spreading through social force models.',
		excerpt_short: 'GPU-accelerated crowd simulation with emergent behavior',
		excerpt_long: 'This experiment evolves the Living Arena concept from conceptual visualization to realistic simulation. Using WebGPU compute shaders, 8,000+ agents navigate the arena with physics-based crowd dynamics: goal attraction, collision avoidance, wall repulsion, and panic propagation. Watch emergent behaviors like bottleneck formation and crowd waves.',
		category: 'research',
		tags: ['WebGPU', 'Compute Shaders', 'Crowd Simulation', 'Social Force Model', 'Emergent Behavior', 'WGSL'],
		created_at: '2026-01-20T00:00:00Z',
		updated_at: '2026-01-20T00:00:00Z',
		reading_time_minutes: 8,
		difficulty: 'advanced',
		is_file_based: true,
		tests_principles: [
			'rams-principle-2', // Useful—realistic simulation reveals crowd dynamics
			'rams-principle-4', // Understandable—color-coded states, clear scenarios
			'heidegger-aletheia', // Truth revealed through emergent patterns
			'human-in-the-loop' // Scenarios demonstrate human oversight
		],
		ascii_art: `
                               N ▲
                            ▲▲▲▲▲▲▲
                          ▲▲▲▲▲▲▲▲▲▲▲
                         ╱─────────────╲
                        ╱  ○ ○ ○ ○ ○ ○  ╲
                       │  ○ ○ ● ● ○ ○ ○  │
                    W ◀│ ○ ○ ● ● ● ○ ○ ○ │▶ E
                       │  ○ ○ ● ○ ○ ○ ○  │
                        ╲  ○ ○ ○ ○ ○ ○  ╱
                         ╲─────────────╱
                          ▼▼▼▼▼▼▼▼▼▼▼
                            ▼▼▼▼▼▼▼
                               S ▼

     ○ calm    ● crowded    ● panicked
     8,000+ agents │ 60 FPS │ Social Force Model

     Watch crowds form, bottlenecks emerge, panic spread.
`
	},
	{
		id: 'file-ai-native-filtering',
		slug: 'ai-native-filtering',
		title: 'AI-Native Filtering: Natural Language Product Discovery',
		description: 'Experiment demonstrating AI-native frontend filtering where users describe what they want in natural language, and an agent applies the appropriate filters.',
		excerpt_short: 'Natural language product filtering powered by Workers AI',
		excerpt_long: 'What if users could describe what they want instead of clicking through filter checkboxes? This experiment tests the hypothesis that an AI agent can interpret natural language queries and apply structured filters more effectively than manual UI interaction. Built with D1 for product storage, Workers AI for reasoning, and SSE for streaming agent thoughts.',
		category: 'research',
		tags: ['AI-Native', 'Workers AI', 'D1', 'Filtering', 'Natural Language', 'SSE', 'Tool Calling'],
		created_at: '2026-01-31T00:00:00Z',
		updated_at: '2026-01-31T00:00:00Z',
		reading_time_minutes: 10,
		difficulty: 'intermediate',
		is_file_based: true,
		is_executable: 1,
		tests_principles: [
			'heidegger-zuhandenheit', // Interface recedes—user describes intent, not mechanics
			'rams-principle-4', // Understandable—natural language over UI taxonomy
			'rams-principle-2', // Useful—faster path to relevant products
			'subtractive-triad' // Remove UI complexity, reveal user intent
		],
		ascii_art: `
    ╭──────────────────────────────────────────────────────────────╮
    │                                                              │
    │    USER                    AGENT                   FILTERS   │
    │                                                              │
    │  "Show me chairs      ┌─────────────┐      ┌──────────────┐  │
    │   under $2000"   ───▶ │  Workers AI │ ───▶ │ category:    │  │
    │                       │             │      │   seating    │  │
    │                       │  Reasoning  │      │ price: <2000 │  │
    │                       │  Streaming  │      │ status: any  │  │
    │                       └─────────────┘      └──────────────┘  │
    │                             │                     │          │
    │                             ▼                     ▼          │
    │                       ╔═══════════════════════════════════╗  │
    │                       ║    5 products match               ║  │
    │                       ║    ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐  ║  │
    │                       ║    │   │ │   │ │   │ │   │ │   │  ║  │
    │                       ║    └───┘ └───┘ └───┘ └───┘ └───┘  ║  │
    │                       ╚═══════════════════════════════════╝  │
    │                                                              │
    ╰──────────────────────────────────────────────────────────────╯
         Ask for what you want. Skip the filter taxonomy.
`
	},
	{
		id: 'file-webflow-plagiarism-detection',
		slug: 'webflow-plagiarism-detection',
		title: 'Webflow Plagiarism Detection: Agent-Native Algorithms',
		description: 'A multi-layer plagiarism detection system combining classic CS algorithms (MinHash, LSH, PageRank, Bayesian) with AI tiers, exposed as MCP tools for team AI agents.',
		excerpt_short: 'Classic algorithms + AI tiers, exposed as MCP tools',
		excerpt_long: 'Agent-native design—exposing classic algorithms as MCP tools—enables team AI agents to perform sophisticated template analysis. MinHash fingerprints 9,500+ templates, LSH enables O(1) lookup, PageRank identifies originals, and Bayesian scoring combines signals into probabilities. Three-tier AI handles edge cases. 99.6% cost reduction vs manual review.',
		category: 'research',
		tags: ['Plagiarism', 'MinHash', 'LSH', 'PageRank', 'Bayesian', 'MCP', 'Agent-Native', 'Webflow', 'Validated'],
		created_at: '2026-01-20T00:00:00Z',
		updated_at: '2026-01-20T00:00:00Z',
		reading_time_minutes: 15,
		difficulty: 'advanced',
		is_file_based: true,
		tests_principles: [
			'heidegger-zuhandenheit', // Infrastructure recedes—administrators see decisions, not algorithms
			'rams-principle-2', // Useful—99.6% cost reduction, same quality
			'tool-complementarity', // Algorithms compute, AI judges, humans decide
			'subtractive-triad' // Three-tier removes work at each stage
		],
		ascii_art: `
           ✓ VALIDATED │ v2.3.0 │ 41/41 tests
        ╔═══════════════════════════════════════════════════════╗
        ║  WEBFLOW PLAGIARISM DETECTION                         ║
        ║                                                       ║
        ║  ┌──────────┐   ┌──────────┐   ┌──────────┐          ║
        ║  │ MinHash  │──▶│   LSH    │──▶│ PageRank │          ║
        ║  │ (1997)   │   │ (1998)   │   │ (1996)   │          ║
        ║  └──────────┘   └──────────┘   └──────────┘          ║
        ║       │              │              │                 ║
        ║       └──────────────┴──────────────┘                 ║
        ║                      │                                ║
        ║               ╔══════▼══════╗                         ║
        ║               ║  Bayesian   ║                         ║
        ║               ║  Confidence ║                         ║
        ║               ╚══════╤══════╝                         ║
        ║                      │                                ║
        ║               ╔══════▼══════╗                         ║
        ║               ║  MCP Tools  ║───▶ Team AI Agents      ║
        ║               ║ (10 tools)  ║                         ║
        ║               ╚═════════════╝                         ║
        ║                                                       ║
        ║  9,593 templates │ 517,850 functions │ $2.20/month    ║
        ╚═══════════════════════════════════════════════════════╝
              Classic algorithms. Agent-native delivery.
`
	},
	{
		id: 'file-webflow-analyzer-lineage',
		slug: 'webflow-analyzer-lineage',
		title: 'Webflow Analyzer Lineage: From Detection to Governed Review',
		description: 'A git-history-backed experiment tracing how Webflow analysis expanded from plagiarism detection into browser-backed MCP review, policy-grounded operations, and creator-facing submission assistance.',
		excerpt_short: 'The analyzer story only makes sense when the whole lineage is visible',
		excerpt_long: 'This experiment reconstructs the Webflow analyzer lineage across January to April 2026. What begins as plagiarism detection expands into browser-backed MCP review, policy snapshots, remote reviewer operations, and finally creator-facing validation and autofill flows. The result is a system story, not a feature list.',
		category: 'research',
		tags: ['Webflow', 'Analyzer', 'Git History', 'MCP', 'Review Systems', 'Policy as Artifact', 'Product Lineage'],
		created_at: '2026-04-25T00:00:00Z',
		updated_at: '2026-04-25T00:00:00Z',
		reading_time_minutes: 12,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'mcp-first-thesis',
			'three-tier-framework',
			'policy-as-artifact',
			'tool-complementarity'
		],
		ascii_art: `
    ╭──────────────────────────────────────────────────────────╮
    │ WEBFLOW ANALYZER LINEAGE                                │
    │                                                          │
    │ Jan        Feb         Mar                Apr            │
    │ detect  →  extract  →  govern         →  productize     │
    │ experiment   MCP         policy +         reviewer +     │
    │ origin        server      review ops       creator help  │
    │                                                          │
    │ The system got stronger as its boundaries got clearer.   │
    ╰──────────────────────────────────────────────────────────╯
`
	},
	{
		id: 'file-governed-codex-model-routing',
		slug: 'governed-codex-model-routing',
		title: 'Governed Codex Model Routing Economics',
		description: 'A controlled exploratory benchmark of Codex model, reasoning-effort, serving-tier, and fan-out choices under deterministic quality gates.',
		excerpt_short: 'Task-shaped model routing is supported—but seven n=1 trials do not validate it',
		excerpt_long: 'Seven exploratory Codex trials compare Luna executor fan-out, Terra effort levels, and Sol at low reasoning effort. The results support separating judgment from execution, while preserving the limitations and replication gates needed before any production routing policy changes.',
		category: 'research',
		tags: ['Codex', 'Model Routing', 'Agent Economics', 'Evaluation', 'Governance', 'Living Research'],
		created_at: '2026-08-26T00:00:00Z',
		updated_at: '2026-08-26T00:00:00Z',
		reading_time_minutes: 12,
		difficulty: 'advanced',
		is_file_based: true,
		tests_principles: [
			'three-tier-framework',
			'policy-as-artifact',
			'tool-complementarity',
			'evidence-bound-agent-routing'
		],
		ascii_art: `
    ╭──────────────────────────────────────────────────────────╮
    │ GOVERNED CODEX MODEL ROUTING                            │
    │                                                          │
    │ Judgment governor                 Bounded executors       │
    │ Sol / Low       ── policy ──▶     Luna / High fan-out    │
    │                                                          │
    │ Same hidden gates: 3/3  ·  mutants killed: 5/5          │
    │ Fan-out credits vs Sol/High: −90.57%                    │
    │                                                          │
    │ SUPPORTED — NOT VALIDATED                                │
    ╰──────────────────────────────────────────────────────────╯
`
	},
];

const fileBasedExperimentVisuals = {
	'file-agentic-viz': defineArtifactVisuals({
		kind: 'flow',
		title: 'An agentic component chooses the chart before the user asks.',
		caption:
			'Tufte principles become runtime judgment: data shape enters, component choice and explanation leave.',
		nodes: [
			{ label: 'Data', detail: 'The dataset carries shape and density.', icon: 'folder', tone: 'neutral' },
			{ label: 'Principles', detail: 'Tufte rules constrain display choices.', icon: 'document', tone: 'receipt' },
			{ label: 'Component', detail: 'The UI chooses a useful form.', icon: 'settings', tone: 'run' },
			{ label: 'Insight', detail: 'The visualization explains its decision.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'An autonomous visualization component applying Tufte principles to choose and explain the right data display.',
		motifs: [
			'data stream entering a principled decision layer',
			'component cards selecting chart forms',
			'small explanation receipt',
			'minimal black and white data marks with one amber accent'
		],
		alt: 'Abstract agentic visualization component choosing chart forms from data and Tufte principles.'
	}),
	'file-data-patterns': defineArtifactVisuals({
		kind: 'proof-card',
		title: 'Patterns become useful when the component reveals the exception.',
		caption:
			'The experiment shows service health, trend, and anomaly states without requiring manual inspection first.',
		nodes: [
			{ label: 'Stream', detail: 'Metrics arrive as raw series.', icon: 'refresh', tone: 'neutral' },
			{ label: 'Compare', detail: 'Small multiples expose difference.', icon: 'search', tone: 'neutral' },
			{ label: 'Anomaly', detail: 'Degradation becomes visible.', icon: 'warning', tone: 'wait' },
			{ label: 'Pattern', detail: 'The user sees what matters.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'A data-pattern visualization surface where trends, comparisons, and anomalies emerge without manual analysis.',
		motifs: [
			'small multiple metric strips',
			'one degrading service marked with amber',
			'pattern reveal receipt',
			'sparse chart grid with no dashboard clutter'
		],
		alt: 'Abstract data pattern surface revealing trends and anomalies through compact visual components.'
	}),
	'file-meeting-capture': defineArtifactVisuals({
		kind: 'flow',
		title: 'The capture tool recedes when understanding remains.',
		caption:
			'Audio becomes transcript, transcript becomes knowledge, and the interface stays out of the meeting.',
		nodes: [
			{ label: 'Audio', detail: 'The meeting is captured at the edge.', icon: 'mail', tone: 'neutral' },
			{ label: 'Transcribe', detail: 'Whisper turns speech into text.', icon: 'refresh', tone: 'run' },
			{ label: 'Store', detail: 'Knowledge infrastructure keeps the record.', icon: 'folder', tone: 'receipt' },
			{ label: 'Understand', detail: 'The tool disappears from attention.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'A meeting capture system where audio, transcription, and knowledge storage recede into transparent use.',
		motifs: [
			'sound wave entering a quiet transcript surface',
			'knowledge packet stored behind the interface',
			'tool receding into background',
			'operator-readable meeting receipt'
		],
		alt: 'Abstract meeting capture flow from audio to transcript to durable understanding.'
	}),
	'file-template-recategorization': defineArtifactVisuals({
		kind: 'flow',
		title: 'Data curation becomes reliable when interpretation and state update stay connected.',
		caption:
			'Claude Code interprets the taxonomy, Airtable MCP updates the records, and the corrected templates become the receipt.',
		nodes: [
			{ label: 'Intent', detail: 'Human points at a taxonomy problem.', icon: 'user', tone: 'wait' },
			{ label: 'Interpret', detail: 'Agent reads templates in context.', icon: 'search', tone: 'neutral' },
			{ label: 'Update', detail: 'MCP writes the corrected state.', icon: 'edit', tone: 'run' },
			{ label: 'Receipt', detail: 'Eight templates carry corrected categories.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'An MCP-backed Webflow template recategorization workflow connecting human intent, agent interpretation, and Airtable state updates.',
		motifs: [
			'human intent card feeding an agent interpretation layer',
			'Airtable-like database grid with corrected rows',
			'eight small template receipt cards',
			'clear write boundary around MCP action'
		],
		alt: 'Abstract template recategorization flow from human intent through MCP update to corrected records.'
	}),
	'file-text-revelation': defineArtifactVisuals({
		kind: 'state-strip',
		title: 'Removal is the animation.',
		caption:
			'Scroll state strips away corporate copy until only the essential sentence remains.',
		nodes: [
			{ label: 'Copy', detail: 'The page starts with accumulated language.', icon: 'document', tone: 'neutral' },
			{ label: 'Strike', detail: 'Nonessential words become visible as excess.', icon: 'edit', tone: 'wait' },
			{ label: 'Fade', detail: 'Obscuring language leaves the surface.', icon: 'minus', tone: 'stop' },
			{ label: 'Essence', detail: 'We remove what obscures.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'A scroll-driven subtractive typography animation where corporate copy erases itself to reveal the essential phrase.',
		motifs: [
			'text bands progressively struck through',
			'remaining phrase centered as the receipt',
			'visible removal states',
			'minimal editorial page texture'
		],
		alt: 'Abstract subtractive typography visual showing text erasure revealing the essential phrase.'
	}),
	'file-dwelling-conversion': defineArtifactVisuals({
		kind: 'boundary-matrix',
		title: 'Conversion can ask, or it can let the user dwell.',
		caption:
			'The experiment compares active assessment with contemplative text revelation as two modes of the same conversion insight.',
		nodes: [
			{ label: 'Assess', detail: 'Questions invite active reflection.', icon: 'edit', tone: 'neutral' },
			{ label: 'Reveal', detail: 'Text erasure invites contemplation.', icon: 'document', tone: 'receipt' },
			{ label: 'Dwell', detail: 'The tool recedes into experience.', icon: 'home', tone: 'run' },
			{ label: 'Convert', detail: 'Intent emerges without extraction.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'A conversion experiment comparing question-based assessment and scroll-driven text revelation as two dwelling modes.',
		motifs: [
			'two side-by-side conversion paths',
			'question cards dissolving into a revealed sentence',
			'non-extractive decision point',
			'quiet bridge between active and contemplative modes'
		],
		alt: 'Abstract dwelling conversion visual comparing assessment and text revelation modes.'
	}),
	'file-agent-continuity': defineArtifactVisuals({
		kind: 'layer-stack',
		title: 'Continuity survives when the session leaves artifacts behind.',
		caption:
			'Progress files, feature lists, and protocols let an agent re-enter the work after context changes.',
		nodes: [
			{ label: 'Session', detail: 'Context starts and eventually exhausts.', icon: 'clock', tone: 'wait' },
			{ label: 'Artifact', detail: 'Progress and state are externalized.', icon: 'document', tone: 'receipt' },
			{ label: 'Re-entry', detail: 'The next session resumes the circle.', icon: 'refresh', tone: 'run' },
			{ label: 'Continuity', detail: 'Understanding persists across boundaries.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'An agent continuity harness where durable artifacts preserve understanding across long-running sessions.',
		motifs: [
			'sequential session nodes connected through artifacts',
			'progress file and feature list packets',
			'context boundary with re-entry path',
			'hermeneutic circle as a sparse loop'
		],
		alt: 'Abstract agent continuity harness showing session re-entry through durable artifacts.'
	}),
	'file-validation-zuhandenheit': defineArtifactVisuals({
		kind: 'boundary-matrix',
		title: 'Validation belongs where the user can still recover.',
		caption:
			'Input-boundary feedback keeps the tool ready-to-hand; downstream server failure turns it into obstruction.',
		nodes: [
			{ label: 'Input', detail: 'The user names the object.', icon: 'edit', tone: 'neutral' },
			{ label: 'Validate', detail: 'Boundary catches the mismatch early.', icon: 'check', tone: 'run' },
			{ label: 'Breakdown', detail: 'Late server errors make the tool conspicuous.', icon: 'warning', tone: 'stop' },
			{ label: 'Recover', detail: 'Specific feedback restores flow.', icon: 'refresh', tone: 'receipt' }
		],
		subject:
			'A validation UX case study showing early input checks preventing downstream tool breakdown.',
		motifs: [
			'input boundary before a server boundary',
			'early validation receipt',
			'blocked downstream failure path',
			'recovery arrow back to user action'
		],
		alt: 'Abstract validation visual showing early input feedback preventing downstream failure.'
	}),
	'file-heideggerian-form': defineArtifactVisuals({
		kind: 'layer-stack',
		title: 'A form can teach philosophy by how it behaves.',
		caption:
			'Service configuration, validation, database feedback, and meta-commentary expose Zuhandenheit, Vorhandenheit, Gestell, and Gelassenheit.',
		nodes: [
			{ label: 'Configure', detail: 'The form serves intent.', icon: 'settings', tone: 'run' },
			{ label: 'Breakdown', detail: 'Validation makes friction visible.', icon: 'warning', tone: 'wait' },
			{ label: 'Database', detail: 'State updates are inspectable.', icon: 'folder', tone: 'receipt' },
			{ label: 'Let be', detail: 'The surface resists extraction.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'An interactive Heideggerian form experience showing service configuration beside live database state.',
		motifs: [
			'form panel beside database panel',
			'validation breakdown marker',
			'service-oriented state update',
			'four philosophical states as compact layers'
		],
		alt: 'Abstract Heideggerian form visual with service configuration and live database state.'
	}),
	'file-render-preview': defineArtifactVisuals({
		kind: 'flow',
		title: 'Rendering control starts by seeing the conditioning input.',
		caption:
			'SVG drawings become Canon previews before ControlNet receives them, making the AI input inspectable.',
		nodes: [
			{ label: 'SVG', detail: 'The user supplies the drawing.', icon: 'upload', tone: 'neutral' },
			{ label: 'Preview', detail: 'WASM produces the conditioning image.', icon: 'search', tone: 'run' },
			{ label: 'Crop', detail: 'The user chooses the useful region.', icon: 'edit', tone: 'wait' },
			{ label: 'Render', detail: 'AI receives a controlled input.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'An architectural render preview pipeline where SVG input becomes a visible ControlNet conditioning image.',
		motifs: [
			'floor plan SVG transforming into high-contrast conditioning image',
			'crop selection boundary',
			'AI render stage after visible preview',
			'operator control checkpoint'
		],
		alt: 'Abstract render preview flow showing SVG converted into visible AI conditioning input.'
	}),
	'file-render-studio': defineArtifactVisuals({
		kind: 'boundary-matrix',
		title: 'Explicit controls make AI rendering inspectable.',
		caption:
			'Named presets, pattern-based SVG operations, and visible conditioning replace natural-language ambiguity.',
		nodes: [
			{ label: 'Plan', detail: 'The floor plan stays editable.', icon: 'edit', tone: 'neutral' },
			{ label: 'Preset', detail: 'Named choices constrain the render.', icon: 'settings', tone: 'run' },
			{ label: 'Condition', detail: 'The AI input remains visible.', icon: 'search', tone: 'receipt' },
			{ label: 'Result', detail: 'The output can be traced back.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'An architectural render studio with explicit presets, pattern-based SVG operations, and transparent AI conditioning.',
		motifs: [
			'floor plan editor next to render preview',
			'named material and lighting controls',
			'visible conditioning layer',
			'traceable result receipt'
		],
		alt: 'Abstract render studio visual showing explicit controls and transparent rendering results.'
	}),
	'file-spritz': defineArtifactVisuals({
		kind: 'proof-card',
		title: 'Reading accelerates when the eye stops traveling.',
		caption:
			'RSVP and the optimal recognition point strip away eye movement while preserving comprehension.',
		nodes: [
			{ label: 'Text', detail: 'A sentence becomes a word stream.', icon: 'document', tone: 'neutral' },
			{ label: 'ORP', detail: 'The recognition point stays fixed.', icon: 'plus', tone: 'run' },
			{ label: 'Pace', detail: 'The user controls speed.', icon: 'clock', tone: 'wait' },
			{ label: 'Comprehend', detail: 'Meaning survives the compression.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'A Spritz-style RSVP reading component with fixed optimal recognition point and user-controlled pacing.',
		motifs: [
			'word centered on a fixed recognition axis',
			'traditional eye movement path removed',
			'speed control checkpoint',
			'comprehension receipt'
		],
		alt: 'Abstract Spritz RSVP visual with fixed recognition point and compressed reading path.'
	}),
	'file-living-arena': defineArtifactVisuals({
		kind: 'layer-stack',
		title: 'A living arena helps, but the human still decides.',
		caption:
			'Security, lighting, HVAC, scheduling, and reasoning coordinate as one system with explicit human oversight.',
		nodes: [
			{ label: 'Systems', detail: 'Building subsystems share context.', icon: 'settings', tone: 'neutral' },
			{ label: 'Reason', detail: 'AI proposes coordinated action.', icon: 'info', tone: 'wait' },
			{ label: 'Human', detail: 'Critical decisions stay owned.', icon: 'user', tone: 'receipt' },
			{ label: 'Adapt', detail: 'The arena updates safely.', icon: 'check', tone: 'run' }
		],
		subject:
			'A living arena automation model where building systems coordinate through AI while humans retain critical control.',
		motifs: [
			'arena floor surrounded by system nodes',
			'human decision center',
			'AI reasoning layer as a bounded assistant',
			'transparent automation status'
		],
		alt: 'Abstract living arena system with coordinated building automation and human oversight.'
	}),
	'file-kinetic-typography': defineArtifactVisuals({
		kind: 'state-strip',
		title: 'Motion earns its place when it reveals semantic weight.',
		caption:
			'Characters scatter, converge, and gain weight so animation becomes information rather than decoration.',
		nodes: [
			{ label: 'Scatter', detail: 'Letters begin as raw motion.', icon: 'refresh', tone: 'neutral' },
			{ label: 'Converge', detail: 'Position reveals the phrase.', icon: 'arrow-right', tone: 'run' },
			{ label: 'Weight', detail: 'Important words gain emphasis.', icon: 'plus', tone: 'receipt' },
			{ label: 'Meaning', detail: 'The hierarchy becomes readable.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'A kinetic typography experiment where motion reveals semantic hierarchy through scatter, convergence, and weight.',
		motifs: [
			'three animation states in one strip',
			'letters converging into a phrase',
			'one emphasized word gaining weight',
			'Tufte-inspired data-ink restraint'
		],
		alt: 'Abstract kinetic typography visual showing motion revealing semantic weight.'
	}),
	'file-ic-mvp-pipeline': defineArtifactVisuals({
		kind: 'flow',
		title: 'MVPs stop dying when translation becomes a pipeline.',
		caption:
			'Agentic analysis turns IC-built prototypes into Webflow Code Components with reviewable steps and Designer-ready outputs.',
		nodes: [
			{ label: 'MVP', detail: 'An IC builds the first tool.', icon: 'folder', tone: 'neutral' },
			{ label: 'Analyze', detail: 'Agent reads structure and dependencies.', icon: 'search', tone: 'wait' },
			{ label: 'Component', detail: 'Code Component package is produced.', icon: 'settings', tone: 'run' },
			{ label: 'Designer', detail: 'Props and preview reach the canvas.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'An agentic translation pipeline from IC-built MVP to production Webflow Code Component.',
		motifs: [
			'MVP source folder entering an agent analysis lane',
			'Webflow component package with props',
			'Designer canvas handoff',
			'validation receipt with fidelity marker'
		],
		alt: 'Abstract IC MVP pipeline translating a prototype into a Webflow Code Component.'
	}),
	'file-canvas-interactivity': defineArtifactVisuals({
		kind: 'boundary-matrix',
		title: 'Canvas earns complexity when interaction density outgrows the DOM.',
		caption:
			'Graphs, timelines, live charts, and diagrams share a high-performance pixel surface with exportable receipts.',
		nodes: [
			{ label: 'Graph', detail: 'Force layout handles dense relationships.', icon: 'share', tone: 'neutral' },
			{ label: 'Timeline', detail: 'Keyframes stay directly editable.', icon: 'clock', tone: 'wait' },
			{ label: 'Chart', detail: 'Live streams remain readable.', icon: 'refresh', tone: 'run' },
			{ label: 'Export', detail: 'Canvas output becomes a file.', icon: 'download', tone: 'receipt' }
		],
		subject:
			'A high-performance canvas interactivity suite for graphs, timelines, live charts, and exportable diagrams.',
		motifs: [
			'four canvas panels in a compact matrix',
			'force graph and timeline control marks',
			'live chart trace',
			'export receipt from diagram canvas'
		],
		alt: 'Abstract canvas interactivity matrix with graph, timeline, chart, and export surfaces.'
	}),
	'file-ascii-renderer': defineArtifactVisuals({
		kind: 'proof-card',
		title: 'ASCII characters have shape, not just brightness.',
		caption:
			'The renderer compares 6D character vectors so contours survive the translation into text.',
		nodes: [
			{ label: 'Sample', detail: 'Character cells are measured.', icon: 'search', tone: 'neutral' },
			{ label: 'Vector', detail: 'Six regions describe the shape.', icon: 'plus', tone: 'run' },
			{ label: 'Match', detail: 'Contours choose the character.', icon: 'check', tone: 'receipt' },
			{ label: 'Render', detail: 'ASCII preserves edges.', icon: 'document', tone: 'receipt' }
		],
		subject:
			'A shape-aware ASCII renderer using six-dimensional character matching to preserve contours and edges.',
		motifs: [
			'character cell with six sampling regions',
			'before and after ASCII contour comparison',
			'sharp edge receipt',
			'minimal monochrome text texture'
		],
		alt: 'Abstract ASCII renderer visual showing 6D shape matching and sharper contours.'
	}),
	'file-living-arena-gpu': defineArtifactVisuals({
		kind: 'state-strip',
		title: 'Emergent crowd behavior becomes visible when simulation runs at scale.',
		caption:
			'WebGPU agents expose bottlenecks, waves, and panic propagation while keeping scenario control explicit.',
		nodes: [
			{ label: 'Agents', detail: 'Thousands of actors enter the arena.', icon: 'users', tone: 'neutral' },
			{ label: 'Compute', detail: 'WebGPU updates motion in parallel.', icon: 'settings', tone: 'run' },
			{ label: 'Crowd', detail: 'Bottlenecks and waves emerge.', icon: 'warning', tone: 'wait' },
			{ label: 'Scenario', detail: 'The operator reads the simulation.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'A WebGPU crowd simulation where thousands of agents reveal bottlenecks, waves, and panic propagation.',
		motifs: [
			'arena plan filled with small agent marks',
			'GPU compute layer below the crowd',
			'color-coded calm, crowded, and panic states',
			'human-readable scenario receipt'
		],
		alt: 'Abstract Living Arena GPU visual showing large-scale crowd simulation and emergent behavior.'
	}),
	'file-ai-native-filtering': defineArtifactVisuals({
		kind: 'flow',
		title: 'The best filter interface may be the user saying what they mean.',
		caption:
			'Natural language intent becomes structured product filters through Workers AI, D1, and streaming reasoning.',
		nodes: [
			{ label: 'Intent', detail: 'User describes the desired product.', icon: 'user', tone: 'neutral' },
			{ label: 'Reason', detail: 'Workers AI maps language to fields.', icon: 'settings', tone: 'wait' },
			{ label: 'Filter', detail: 'D1 query becomes structured.', icon: 'search', tone: 'run' },
			{ label: 'Results', detail: 'Relevant products surface.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'An AI-native product filtering workflow where natural language is translated into structured filters and results.',
		motifs: [
			'user prompt entering an agent reasoning layer',
			'structured filter chips created from language',
			'D1 product result grid',
			'streaming thought receipt without clutter'
		],
		alt: 'Abstract AI-native filtering visual translating natural language into product filters.'
	}),
	'file-webflow-plagiarism-detection': defineArtifactVisuals({
		kind: 'layer-stack',
		title: 'Classic algorithms become agent-native when exposed as tools.',
		caption:
			'MinHash, LSH, PageRank, Bayesian scoring, and AI review tiers form a bounded plagiarism decision system.',
		nodes: [
			{ label: 'Fingerprint', detail: 'MinHash compresses templates.', icon: 'copy', tone: 'neutral' },
			{ label: 'Lookup', detail: 'LSH finds candidates quickly.', icon: 'search', tone: 'run' },
			{ label: 'Rank', detail: 'PageRank identifies likely originals.', icon: 'arrow-up', tone: 'neutral' },
			{ label: 'Decide', detail: 'Bayesian and AI tiers produce confidence.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'A Webflow plagiarism detection system stacking classic algorithms and AI tiers behind MCP tools.',
		motifs: [
			'algorithm stack labeled MinHash, LSH, PageRank, Bayesian',
			'MCP tool boundary above computed signals',
			'template similarity receipts',
			'confidence score card with human review lane'
		],
		alt: 'Abstract Webflow plagiarism detection visual with algorithm layers exposed as MCP tools.'
	}),
	'file-webflow-analyzer-lineage': defineArtifactVisuals({
		kind: 'flow',
		title: 'The analyzer story is a lineage, not a feature list.',
		caption:
			'Detection, extraction, governed review, and creator assistance become one system when the boundary history is visible.',
		nodes: [
			{ label: 'Detect', detail: 'Plagiarism analysis starts the lineage.', icon: 'search', tone: 'neutral' },
			{ label: 'Extract', detail: 'MCP turns evidence into tools.', icon: 'download', tone: 'run' },
			{ label: 'Govern', detail: 'Policy and review ops add boundaries.', icon: 'document', tone: 'wait' },
			{ label: 'Productize', detail: 'Creator assistance inherits the system.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'A Webflow analyzer lineage timeline from plagiarism detection to governed review and creator-facing submission help.',
		motifs: [
			'January to April system timeline',
			'four stages: detect, extract, govern, productize',
			'policy boundary appearing midstream',
			'creator and reviewer surfaces separated at the end'
		],
		alt: 'Abstract Webflow analyzer lineage visual showing the system evolving from detection to productized review.'
	}),
	'file-governed-codex-model-routing': defineArtifactVisuals({
		kind: 'flow',
		title: 'Route by task shape, then require the same evidence gate.',
		caption:
			'The exploratory result separates policy judgment from independently verifiable execution; it does not establish a universal model ranking.',
		nodes: [
			{ label: 'Classify', detail: 'Name coupling, risk, and judgment traps.', icon: 'search', tone: 'neutral' },
			{ label: 'Govern', detail: 'A capable low-effort model holds policy.', icon: 'document', tone: 'wait' },
			{ label: 'Execute', detail: 'Cheaper agents take independent slices.', icon: 'settings', tone: 'run' },
			{ label: 'Verify', detail: 'Hidden tests and mutation gates decide.', icon: 'check', tone: 'receipt' }
		],
		subject:
			'A governed Codex routing decision tree separating task classification, policy judgment, bounded execution, and deterministic verification.',
		motifs: [
			'one judgment governor feeding three independent executor lanes',
			'hidden test and mutation gates after aggregation',
			'credit and latency receipts kept separate from correctness',
			'visible supported but not validated status'
		],
		alt: 'Decision tree routing judged work to a governor and independent work to bounded executors before a shared verification gate.'
	})
};

export const fileBasedExperiments: FileBasedExperiment[] = applyArtifactVisuals(
	fileBasedExperimentMetadata,
	fileBasedExperimentVisuals,
	'fileBasedExperiments'
);

/**
 * Get all file-based experiments, transformed to match Paper interface
 */
export function getFileBasedExperiments(): FileBasedExperimentPaper[] {
	return fileBasedExperiments.map((experiment) =>
		transformExperimentToPaper(experiment) as unknown as FileBasedExperimentPaper
	);
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
