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
		id: 'paper-kickstand-triad-audit',
		slug: 'kickstand-triad-audit',
		title: 'Subtractive Triad Audit: Kickstand',
		subtitle: 'A Production Case Study in Systematic Code Reduction',
		authors: ['CREATE SOMETHING Research'],
		abstract: `This paper documents the application of the Subtractive Triad framework (DRY → Rams → Heidegger) to Kickstand, a production venue intelligence system. Through systematic application of DRY (Unify), Rams (Remove), and Heidegger (Reconnect), we achieved: 92% reduction in active scripts (155 → 13), complete resolution of 30 TypeScript errors, and 48% improvement in system health score (6.2 → 9.2). The case study demonstrates how the meta-principle "creation is the discipline of removing what obscures" applies at implementation, artifact, and system levels.`,
		keywords: [
			'Subtractive Triad',
			'Code Audit',
			'DRY',
			'Dieter Rams',
			'Heidegger',
			'Cloudflare Workers',
			'TypeScript',
			'Case Study'
		],
		description:
			'Applied the Subtractive Triad framework (DRY → Rams → Heidegger) to audit a production venue intelligence system, achieving 48% health score improvement.',
		excerpt_short: 'Production system audit using the Subtractive Triad framework',
		excerpt_long:
			'This paper documents the application of the Subtractive Triad framework to Kickstand, a venue intelligence system. Through systematic application of DRY (Unify), Rams (Remove), and Heidegger (Reconnect), we reduced active scripts by 92%, fixed 30 TypeScript errors, and improved documentation coherence.',
		category: 'case-study',
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
		source_path: 'papers/published/kickstand-triad-audit.md',
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
		id: 'paper-understanding-graphs',
		slug: 'understanding-graphs',
		title: 'Understanding Graphs: "Less, But Better" Codebase Navigation',
		subtitle: 'Minimal Dependency Documentation Through Hermeneutic Analysis',
		authors: ['CREATE SOMETHING Research'],
		abstract: `This paper presents Understanding Graphs: a minimal, human-readable approach to documenting codebase relationships that embodies Dieter Rams' principle "Weniger, aber besser" (less, but better). Through application of Heidegger's hermeneutic circle, we developed a canonical format (UNDERSTANDING.md) that captures only understanding-critical relationships—bidirectional semantic dependencies that matter for comprehension rather than exhaustive import trees. The methodology demonstrates how subtractive documentation can reveal codebase structure more clearly than comprehensive tooling.`,
		keywords: [
			'Hermeneutics',
			'Codebase Navigation',
			'Less But Better',
			'Heidegger',
			'Documentation',
			'Methodology',
			'Dieter Rams'
		],
		description:
			"Research applying Heidegger's hermeneutic circle to develop minimal dependency documentation that captures only understanding-critical relationships.",
		excerpt_short: 'Minimal dependency documentation embodying "Weniger, aber besser"',
		excerpt_long:
			'This paper presents Understanding Graphs: a minimal, human-readable approach to documenting codebase relationships that embodies Dieter Rams\' principle "less, but better." Through hermeneutic analysis, we developed a canonical format (UNDERSTANDING.md) that captures bidirectional semantic relationships without tooling.',
		category: 'research',
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
		source_path: 'papers/published/understanding-graphs.md',
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
		id: 'paper-hermeneutic-spiral-ux',
		slug: 'hermeneutic-spiral-ux',
		title: 'The Hermeneutic Spiral in UX Design: Returning Users as Evolving Context',
		subtitle: 'Why Systems Should Remember and Ask Only What Has Changed',
		authors: ['CREATE SOMETHING Research'],
		abstract: `Traditional user intake flows treat each session as a blank slate, forcing users to re-enter information they've already provided. This paper applies Heidegger's hermeneutic circle to user experience design, proposing the Hermeneutic Spiral—a pattern where returning users encounter a system that remembers their context and asks only what has changed. We demonstrate this pattern through the Abundance Network, a creative matching platform built for Half Dozen.`,
		keywords: [
			'Hermeneutic Circle',
			'UX Design',
			'Conversational AI',
			'WhatsApp',
			'Delta Intake',
			'User Memory',
			'Heidegger',
			'Phenomenology'
		],
		description:
			'Applying Heidegger\'s hermeneutic circle to UX design, demonstrating how returning users should experience evolving context rather than stateless repetition.',
		excerpt_short: 'Delta intake: ask only what has changed',
		excerpt_long:
			'This paper applies Heidegger\'s hermeneutic circle to user experience design. Instead of treating each session as a blank slate, the Hermeneutic Spiral remembers user context and asks only what has changed—transforming intake from repetitive data entry into evolving conversation.',
		category: 'research',
		created_at: '2025-12-02T00:00:00Z',
		updated_at: '2025-12-02T00:00:00Z',
		reading_time_minutes: 20,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'heidegger-hermeneutic-circle', // Core framework
			'heidegger-zuhandenheit', // System recedes when working
			'rams-principle-2', // Useful - respects user time
			'rams-principle-5', // Unobtrusive - invisible memory
			'rams-principle-10' // As little as possible - delta intake
		],
		related_experiments: [
			'minimal-capture' // Also demonstrates zuhandenheit
		],
		source_path: 'papers/published/hermeneutic-spiral-ux.md',
		ascii_art: `
    ╔═══════════════════════════════════════════════════════════════╗
    ║   THE HERMENEUTIC SPIRAL                                      ║
    ║                                                               ║
    ║   First Visit              Return Visit                       ║
    ║   ───────────              ────────────                       ║
    ║   "What's your name?"      "Welcome back, Louis!"             ║
    ║   "What's your brand?"     "Same brand as last time?"         ║
    ║   "What's your budget?"    "What's different this time?"      ║
    ║   "What do you need?"                                         ║
    ║                                                               ║
    ║       ┌─────────────────────────────────────┐                 ║
    ║       │    Understanding deepens with       │                 ║
    ║       │    each spiral iteration            │                 ║
    ║       └─────────────────────────────────────┘                 ║
    ║                                                               ║
    ║   Parts → Whole → Parts → Whole → ...                         ║
    ║                                                               ║
    ║   "The circle is not vicious but productive"                  ║
    ║                              — Heidegger                      ║
    ╚═══════════════════════════════════════════════════════════════╝
`
	},
	{
		id: 'paper-hermeneutic-debugging',
		slug: 'hermeneutic-debugging',
		title: 'Hermeneutic Debugging',
		subtitle: 'Applying the Hermeneutic Circle to Software Debugging',
		authors: ['CREATE SOMETHING Research'],
		abstract: `Traditional debugging assumes a linear path: identify symptom, trace cause, apply fix. This paper argues that complex bugs resist linear analysis because they emerge from hidden assumptions—what Heidegger calls our "fore-structure" of understanding. By applying the hermeneutic circle to debugging, we demonstrate that the path to solution requires iterative interpretation where each failed attempt reveals previously invisible assumptions. We document this through a case study: a React logo animation that required eight iterations to solve, each revealing deeper truths about component lifecycle, state persistence, and the gap between code and runtime behavior.`,
		keywords: [
			'Hermeneutic Circle',
			'Debugging',
			'React',
			'State Management',
			'Heidegger',
			'Next.js',
			'Case Study',
			'Methodology'
		],
		description:
			'Applying Heidegger\'s hermeneutic circle to software debugging, demonstrating that understanding emerges through iterative interpretation.',
		excerpt_short: 'Debugging as hermeneutic interpretation',
		excerpt_long:
			'This paper applies the hermeneutic circle to software debugging through a case study: a React logo animation requiring eight iterations. Each failed fix revealed hidden assumptions about component lifecycle, state persistence, and runtime behavior—demonstrating that understanding emerges through iterative interpretation, not linear analysis.',
		category: 'methodology',
		created_at: '2025-12-03T00:00:00Z',
		updated_at: '2025-12-03T00:00:00Z',
		reading_time_minutes: 12,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'heidegger-hermeneutic-circle', // Core framework - understanding through iteration
			'heidegger-vorhandenheit', // Hidden assumptions become visible through breakdown
			'rams-principle-4' // Understandable - revelation through debugging
		],
		related_experiments: [
			'motion-ontology' // Phenomenological analysis of motion/animation
		],
		source_path: 'papers/published/hermeneutic-debugging.md',
		ascii_art: `
    ╔═══════════════════════════════════════════════════════════════╗
    ║   HERMENEUTIC DEBUGGING                                       ║
    ║                                                               ║
    ║   Iteration 1: "Just add a delay"     ──► Assumption exposed  ║
    ║   Iteration 2: "Use a ref"            ──► Assumption exposed  ║
    ║   Iteration 3: "Use sessionStorage"   ──► Assumption exposed  ║
    ║   ...                                                         ║
    ║   Iteration 8: "Check wasOnInternal"  ──► Working             ║
    ║                                                               ║
    ║       ┌─────────────────────────────────────┐                 ║
    ║       │    Each failed fix reveals          │                 ║
    ║       │    what we didn't know we assumed   │                 ║
    ║       └─────────────────────────────────────┘                 ║
    ║                                                               ║
    ║   "The circle is not vicious but productive"                  ║
    ║                              — Heidegger                      ║
    ╚═══════════════════════════════════════════════════════════════╝
`
	},
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
		source_path: 'papers/published/code-mode-hermeneutic-analysis.md',
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
	},
	{
		id: 'paper-subtractive-form-design',
		slug: 'subtractive-form-design',
		title: 'Subtractive Form Design: When Absence Is Clearer Than Instruction',
		subtitle: 'A Case Study in Hermeneutic Form Architecture',
		authors: ['CREATE SOMETHING Research'],
		abstract: `This paper documents the application of Heidegger's system-level hermeneutic question—"Does this serve the whole?"—to form field design. Through a case study of Webflow's app submission form, we demonstrate that form fields which don't apply to certain contexts create systemic disconnection: developers enter incorrect values, reviewers manually clear them, and submissions are delayed. The solution is subtractive: hide fields that don't apply rather than instructing users to leave them blank. This reveals a general principle: absence is clearer than instruction. When a field doesn't serve the whole, removing it reconnects the system more effectively than documentation ever could.`,
		keywords: [
			'Hermeneutic Circle',
			'Form Design',
			'UX',
			'Subtractive Design',
			'Heidegger',
			'Conditional Rendering',
			'Case Study',
			'OAuth'
		],
		description:
			'Applying Heidegger\'s hermeneutic question to form design: when a field doesn\'t apply, hiding it is clearer than instructing users to leave it blank.',
		excerpt_short: 'Absence is clearer than instruction',
		excerpt_long:
			'This paper applies Heidegger\'s system-level hermeneutic analysis to form field design. Through a case study of Webflow\'s app submission form, we demonstrate that fields which don\'t apply to certain contexts should be hidden rather than shown with "leave blank" instructions—absence reconnects the system more effectively than documentation.',
		category: 'case-study',
		created_at: '2025-12-09T00:00:00Z',
		updated_at: '2025-12-09T00:00:00Z',
		reading_time_minutes: 8,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'heidegger-hermeneutic-circle', // Core framework - does this serve the whole?
			'rams-principle-10', // As little as possible - remove unnecessary fields
			'rams-principle-4' // Understandable - absence > instruction
		],
		source_path: 'papers/published/subtractive-form-design.md',
		ascii_art: `
    ╔═══════════════════════════════════════════════════════════════╗
    ║   SUBTRACTIVE FORM DESIGN                                     ║
    ║                                                               ║
    ║   Before:                    After:                           ║
    ║   ┌────────────────────┐     ┌────────────────────┐           ║
    ║   │ App Capabilities   │     │ App Capabilities   │           ║
    ║   │ [Designer Ext ▼]   │     │ [Designer Ext ▼]   │           ║
    ║   ├────────────────────┤     └────────────────────┘           ║
    ║   │ Install URL        │                                      ║
    ║   │ (leave blank for   │     Field hidden = nothing           ║
    ║   │  Designer Ext)     │     to fill incorrectly              ║
    ║   │ [____________]     │                                      ║
    ║   └────────────────────┘                                      ║
    ║                                                               ║
    ║   Instruction buried         Absence is instruction           ║
    ║   in description                                              ║
    ║                                                               ║
    ║   "Does this serve the whole?" — Heidegger                    ║
    ╚═══════════════════════════════════════════════════════════════╝
`
	},
	{
		id: 'paper-sveltekit-zuhandenheit',
		slug: 'sveltekit-zuhandenheit',
		title: 'Framework as Equipment: A Phenomenological Analysis of SvelteKit',
		subtitle: 'When Framework Disappears, Application Emerges',
		authors: ['CREATE SOMETHING Research'],
		abstract: `This paper applies Heidegger's phenomenological distinction between ready-to-hand (Zuhandenheit) and present-at-hand (Vorhandenheit) to frontend framework evaluation. We argue that SvelteKit achieves Zuhandenheit—the mode of being where tools recede into transparent use—more completely than React, Vue, or Astro. This is not a subjective preference but an architectural consequence: SvelteKit's compiler-first design eliminates the runtime abstractions that force developers to consciously attend to framework mechanics. When the framework disappears, attention flows through it to the application itself.`,
		keywords: [
			'SvelteKit',
			'Zuhandenheit',
			'Vorhandenheit',
			'Framework Evaluation',
			'Heidegger',
			'React',
			'Vue',
			'Astro',
			'Phenomenology',
			'Compiler'
		],
		description:
			'A phenomenological analysis applying Heidegger\'s Zuhandenheit to framework evaluation, demonstrating why SvelteKit achieves tool transparency more completely than React, Vue, or Astro.',
		excerpt_short: 'When the framework disappears, applications emerge',
		excerpt_long:
			'This paper applies Heidegger\'s phenomenological framework to evaluate SvelteKit against React, Vue, and Astro. Through comparative analysis of breakdown moments—when frameworks demand explicit attention—we demonstrate that SvelteKit\'s compiler-first architecture achieves Zuhandenheit (ready-to-hand transparency) more completely than runtime-heavy alternatives.',
		category: 'research',
		created_at: '2025-12-13T00:00:00Z',
		updated_at: '2025-12-13T00:00:00Z',
		reading_time_minutes: 25,
		difficulty: 'advanced',
		is_file_based: true,
		tests_principles: [
			'heidegger-zuhandenheit', // Core thesis: SvelteKit achieves ready-to-hand
			'heidegger-vorhandenheit', // Contrasts with present-at-hand frameworks
			'rams-principle-5', // Unobtrusive - framework recedes from attention
			'rams-principle-10' // As little as possible - minimal framework ceremony
		],
		related_experiments: [
			'minimal-capture' // Demonstrates zuhandenheit in practice
		],
		source_path: 'papers/published/sveltekit-zuhandenheit.md',
		ascii_art: `
    ╔═══════════════════════════════════════════════════════════════╗
    ║   FRAMEWORK ZUHANDENHEIT SPECTRUM                             ║
    ║                                                               ║
    ║   Vorhandenheit ◄──────────────────────────► Zuhandenheit    ║
    ║   (Present-at-hand)                         (Ready-to-hand)   ║
    ║                                                               ║
    ║   React         Vue         Astro        Svelte               ║
    ║   ┌────┐       ┌────┐       ┌────┐       ┌────┐               ║
    ║   │████│       │███ │       │██  │       │█   │               ║
    ║   │████│       │███ │       │    │       │    │               ║
    ║   └────┘       └────┘       └────┘       └────┘               ║
    ║   Hooks        Refs         Islands      Compiler             ║
    ║   VirtualDOM   Reactivity   Defer        Disappears           ║
    ║   useEffect    .value                                         ║
    ║                                                               ║
    ║   "The hammer disappears when hammering"                      ║
    ║                              — Heidegger, Being and Time      ║
    ╚═══════════════════════════════════════════════════════════════╝
`
	},
	{
		id: 'paper-ethos-transfer-agentic-engineering',
		slug: 'ethos-transfer-agentic-engineering',
		title: 'From Learning About to Dwelling Within',
		subtitle: 'Agentic Engineering as Methodology Transfer in the Terminal',
		authors: ['CREATE SOMETHING Research'],
		abstract: `This paper examines how Claude Code can serve as a methodology transfer vehicle, helping users adopt the CREATE SOMETHING ethos through agentic engineering in the terminal. We argue that the terminal is the site of dwelling—where developers already work—and that Claude Code achieves Zuhandenheit (tools recede into transparent use) rather than Vorhandenheit (tools demand attention). The current Learn MCP infrastructure supports passive learning but lacks the feedback loops needed for active methodology adoption. We propose four evolution stages: Learning, Guided Application, Ethos Construction, and Methodology Embodiment.`,
		keywords: [
			'Ethos',
			'Methodology Transfer',
			'Claude Code',
			'MCP',
			'Dwelling',
			'Heidegger',
			'Terminal',
			'Agentic Engineering',
			'Learn MCP',
			'Subtractive Triad'
		],
		description:
			'Examining how Claude Code can transfer CREATE SOMETHING methodology through agentic engineering, transforming passive learning into active ethos adoption.',
		excerpt_short: 'The terminal as site of dwelling for methodology transfer',
		excerpt_long:
			'This paper examines how the Learn MCP infrastructure could guide users in building their own CREATE SOMETHING ethos through agentic engineering. The terminal is where developers already dwell—Claude Code meets them there, enabling methodology transfer through use rather than instruction.',
		category: 'research',
		created_at: '2025-12-14T00:00:00Z',
		updated_at: '2025-12-14T00:00:00Z',
		reading_time_minutes: 20,
		difficulty: 'advanced',
		is_file_based: true,
		tests_principles: [
			'heidegger-zuhandenheit', // Terminal as dwelling
			'heidegger-hermeneutic-circle', // Learning through practice
			'rams-principle-5' // Tools recede
		],
		related_experiments: [
			'minimal-capture' // Demonstrates zuhandenheit in practice
		],
		source_path: 'papers/ethos-transfer-agentic-engineering',
		ascii_art: `
    ╔═══════════════════════════════════════════════════════════════╗
    ║   METHODOLOGY TRANSFER                                        ║
    ║                                                               ║
    ║   Traditional:              Agentic:                          ║
    ║   ────────────              ────────                          ║
    ║   Course → Quiz → Cert      Practice → Reflect → Embody       ║
    ║                                                               ║
    ║   Learning About            Dwelling Within                   ║
    ║   (Vorhandenheit)           (Zuhandenheit)                    ║
    ║                                                               ║
    ║   ┌────────────────────────────────────────────┐              ║
    ║   │    .ltd (Canon)                            │              ║
    ║   │         ↓                                  │              ║
    ║   │    Learn MCP (Education)                   │              ║
    ║   │         ↓                                  │              ║
    ║   │    User Practice (Application)             │              ║
    ║   │         ↓                                  │              ║
    ║   │    Ethos Construction (Personalization)    │              ║
    ║   │         ↓                                  │              ║
    ║   │    Canon Evolution (Contribution)          │              ║
    ║   └────────────────────────────────────────────┘              ║
    ║                                                               ║
    ║   "To dwell means to remain in a place"                       ║
    ║                              — Heidegger                      ║
    ╚═══════════════════════════════════════════════════════════════╝
`
	},
	{
		id: 'paper-harness-agent-sdk-migration',
		slug: 'harness-agent-sdk-migration',
		title: 'Harness Agent SDK Migration: Empirical Analysis',
		subtitle: 'Security, Reliability, and Cost Improvements Through Explicit Tool Permissions',
		authors: ['CREATE SOMETHING Research'],
		abstract: `This paper documents the migration of the CREATE Something Harness from legacy headless mode patterns to Agent SDK best practices. We analyze the trade-offs between security, reliability, and operational efficiency, drawing from empirical observation of a live Canon Redesign project (21 features). The migration replaces --dangerously-skip-permissions with explicit --allowedTools, adds runaway prevention via --max-turns, and enables cost tracking through structured JSON output parsing.`,
		keywords: [
			'Agent SDK',
			'Claude Code',
			'Harness',
			'Autonomous Orchestration',
			'Tool Permissions',
			'Security',
			'Cost Optimization',
			'Peer Review',
			'Zuhandenheit'
		],
		description:
			'Empirical analysis of migrating from --dangerously-skip-permissions to --allowedTools in autonomous Claude Code orchestration.',
		excerpt_short: 'Agent SDK migration: explicit permissions, better security',
		excerpt_long:
			'This paper documents the migration of the CREATE Something Harness to Agent SDK best practices, replacing blanket permission skip with explicit tool allowlists. Empirical observation from a 21-feature Canon Redesign shows improved security with no operational cost.',
		category: 'case-study',
		created_at: '2025-12-19T00:00:00Z',
		updated_at: '2025-12-19T00:00:00Z',
		reading_time_minutes: 12,
		difficulty: 'intermediate',
		is_file_based: true,
		tests_principles: [
			'heidegger-zuhandenheit', // Infrastructure recedes into transparent use
			'rams-principle-10', // As little as possible - minimal tool surface
			'subtractive-triad' // DRY allowlist, Rams minimal tools, Heidegger serves the whole
		],
		source_path: 'papers/harness-agent-sdk-migration',
		ascii_art: `
    ╔═══════════════════════════════════════════════════════════════╗
    ║   AGENT SDK MIGRATION                                         ║
    ║                                                               ║
    ║   Before:                     After:                          ║
    ║   ────────                    ──────                          ║
    ║   --dangerously-skip          --allowedTools [explicit]       ║
    ║   --permissions               --max-turns 100                 ║
    ║                               --model [opus|sonnet|haiku]     ║
    ║                                                               ║
    ║   All tools     →            Whitelisted tools                ║
    ║   No limits     →            Turn limits                      ║
    ║   No tracking   →            Cost + metrics                   ║
    ║                                                               ║
    ║   ┌────────────────────────────────────────────┐              ║
    ║   │  Security: Explicit > Implicit             │              ║
    ║   │  Reliability: Bounded > Unbounded          │              ║
    ║   │  Visibility: Tracked > Opaque              │              ║
    ║   └────────────────────────────────────────────┘              ║
    ║                                                               ║
    ║   "The harness recedes; the work remains"                     ║
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
