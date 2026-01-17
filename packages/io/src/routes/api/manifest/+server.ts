/**
 * Content Manifest API
 *
 * Returns metadata for all papers and experiments with actual routes.
 * Used by the unified search indexer to know which content to index.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ IMPORTANT: IO papers are STATIC SVELTE ROUTES with interactive     │
 * │ components (IsometricSpiral, custom visualizations, etc.)          │
 * │                                                                     │
 * │ They CANNOT be served from D1 - the content includes Svelte        │
 * │ components that must be compiled at build time.                    │
 * │                                                                     │
 * │ This manifest provides metadata for the search indexer.            │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * WHEN ADDING A NEW PAPER:
 * 1. Create the static route: src/routes/papers/{slug}/+page.svelte
 * 2. Add an entry to the PAPERS array below
 * 3. The search indexer will pick it up on the next re-index (every 6 hours)
 *
 * GET /api/manifest
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ContentItem {
	slug: string;
	title: string;
	description: string;
	category?: string;
}

/**
 * Papers with static routes in src/routes/papers/
 *
 * Each entry here MUST have a corresponding:
 *   src/routes/papers/{slug}/+page.svelte
 *
 * Update this array when adding/removing paper routes.
 */
const PAPERS: ContentItem[] = [
	{ slug: 'agent-sdk-gemini-tools-integration', title: 'Agent SDK Gemini Tools Integration', description: 'Integrating Gemini tools with the Agent SDK for enhanced model capabilities', category: 'technical' },
	{ slug: 'agent-sdk-model-routing-optimization', title: 'Agent SDK Model Routing Optimization', description: 'Optimizing model routing in the Agent SDK for better performance', category: 'technical' },
	{ slug: 'animation-spec-architecture', title: 'Animation Spec Architecture', description: 'Architectural patterns for animation specifications in modern web apps', category: 'methodology' },
	{ slug: 'autonomous-harness-architecture', title: 'Autonomous Harness Architecture', description: 'Building autonomous agent harnesses with structured workflows', category: 'technical' },
	{ slug: 'beads-cross-session-memory', title: 'Beads Cross-Session Memory', description: 'Implementing cross-session memory with the Beads system', category: 'technical' },
	{ slug: 'beads-integration-patterns', title: 'Beads Integration Patterns', description: 'Integration patterns for the Beads memory system', category: 'technical' },
	{ slug: 'code-mode-hermeneutic-analysis', title: 'Code-Mediated Tool Use: A Hermeneutic Analysis', description: 'Why Code Mode achieves Zuhandenheit while tool calling forces Vorhandenheit', category: 'theoretical' },
	{ slug: 'codex-orchestration', title: 'Codex Orchestration', description: 'Orchestrating multiple AI agents with Codex patterns', category: 'technical' },
	{ slug: 'cumulative-state-antipattern', title: 'Cumulative State Antipattern', description: 'Identifying and avoiding the cumulative state antipattern in agent systems', category: 'methodology' },
	{ slug: 'dual-agent-routing-experiment', title: 'Dual Agent Routing Experiment', description: 'Experiments with dual agent routing strategies', category: 'experiment' },
	{ slug: 'ethos-transfer-agentic-engineering', title: 'Ethos Transfer in Agentic Engineering', description: 'Transferring design ethos to AI agents through structured patterns', category: 'theoretical' },
	{ slug: 'haiku-optimization', title: 'Haiku Optimization', description: 'Optimizing Claude Haiku for cost-effective agent operations', category: 'technical' },
	{ slug: 'haiku-ultrathink-validation', title: 'Haiku Ultrathink Validation', description: 'Validating ultrathink patterns with Haiku models', category: 'experiment' },
	{ slug: 'harness-agent-sdk-migration', title: 'Harness Agent SDK Migration', description: 'Migrating from custom harness to the Anthropic Agent SDK', category: 'technical' },
	{ slug: 'hermeneutic-debugging', title: 'Hermeneutic Debugging', description: 'Applying hermeneutic methods to debug complex AI systems', category: 'methodology' },
	{ slug: 'hermeneutic-spiral-ux', title: 'The Hermeneutic Spiral in UX Design', description: 'Applying Heidegger\'s hermeneutic circle to UX design', category: 'methodology' },
	{ slug: 'hermeneutic-triad-review', title: 'Hermeneutic Triad Review', description: 'Reviewing the hermeneutic triad pattern in software design', category: 'methodology' },
	{ slug: 'intellectual-genealogy', title: 'Intellectual Genealogy', description: 'Tracing the intellectual genealogy of AI-native development', category: 'theoretical' },
	{ slug: 'kickstand-triad-audit', title: 'Kickstand Triad Audit', description: 'Auditing the Kickstand system using triad analysis', category: 'experiment' },
	{ slug: 'norvig-partnership', title: 'Norvig Partnership', description: 'Exploring the Norvig partnership model for AI collaboration', category: 'theoretical' },
	{ slug: 'ralph-implementation', title: 'Ralph Implementation', description: 'Implementing the Ralph orchestration pattern', category: 'technical' },
	{ slug: 'ralph-vs-gastown', title: 'Ralph vs Gastown', description: 'Comparing Ralph and Gastown orchestration approaches', category: 'experiment' },
	{ slug: 'spec-driven-development', title: 'Spec-Driven Development', description: 'Development methodology driven by structured specifications', category: 'methodology' },
	{ slug: 'subtractive-form-design', title: 'Subtractive Form Design', description: 'Applying Dieter Rams\' "less but better" to form design', category: 'methodology' },
	{ slug: 'subtractive-studio', title: 'Subtractive Studio', description: 'Building a subtractive design studio workflow', category: 'methodology' },
	{ slug: 'teaching-modalities-experiment', title: 'Teaching Modalities Experiment', description: 'Experimenting with different teaching modalities for AI', category: 'experiment' },
	{ slug: 'understanding-graphs', title: 'Understanding Graphs', description: 'Building understanding through knowledge graph visualization', category: 'technical' },
	{ slug: 'webflow-dashboard-refactor', title: 'Webflow Dashboard Refactor', description: 'Refactoring the Webflow dashboard with Canon patterns', category: 'experiment' },
	{ slug: 'workers-vs-python-sdk-plagiarism-detection', title: 'Workers vs Python SDK: Plagiarism Detection', description: 'Comparing Cloudflare Workers and Python SDK for plagiarism detection', category: 'experiment' }
];

// Experiments with static routes in src/routes/experiments/
const EXPERIMENTS: ContentItem[] = [
	{ slug: 'agent-operations', title: 'Agent Operations', description: 'Interactive experiment for agent operation patterns', category: 'interactive' },
	{ slug: 'agentic-visualization', title: 'Agentic Visualization', description: 'Visualizing agent decision-making in real-time', category: 'interactive' },
	{ slug: 'awwwards-patterns', title: 'Awwwards Patterns', description: 'Design patterns from award-winning websites', category: 'interactive' },
	{ slug: 'canvas-interactivity', title: 'Canvas Interactivity', description: 'Interactive canvas experiments', category: 'interactive' },
	{ slug: 'data-patterns', title: 'Data Patterns', description: 'Exploring data visualization patterns', category: 'interactive' },
	{ slug: 'diagrams', title: 'Diagrams', description: 'Interactive diagram components', category: 'interactive' },
	{ slug: 'hybrid-scheduling', title: 'Hybrid Scheduling', description: 'Hybrid agent scheduling experiments', category: 'interactive' },
	{ slug: 'ic-mvp-pipeline', title: 'IC MVP Pipeline', description: 'Interactive concept MVP pipeline', category: 'interactive' },
	{ slug: 'kinetic-typography', title: 'Kinetic Typography', description: 'Motion typography experiments', category: 'interactive' },
	{ slug: 'living-arena', title: 'Living Arena', description: 'Living documentation arena', category: 'interactive' },
	{ slug: 'render-preview', title: 'Render Preview', description: 'Real-time render preview system', category: 'interactive' },
	{ slug: 'render-studio', title: 'Render Studio', description: 'Interactive rendering studio', category: 'interactive' },
	{ slug: 'spritz', title: 'Spritz', description: 'Speed reading with Spritz technique', category: 'interactive' },
	{ slug: 'text-revelation', title: 'Text Revelation', description: 'Progressive text revelation patterns', category: 'interactive' }
];

export const GET: RequestHandler = async () => {
	return json({
		property: 'io',
		papers: PAPERS,
		experiments: EXPERIMENTS,
		// Legacy format for backward compatibility
		paperSlugs: PAPERS.map(p => p.slug),
		experimentSlugs: EXPERIMENTS.map(e => e.slug),
		generated: new Date().toISOString()
	});
};
