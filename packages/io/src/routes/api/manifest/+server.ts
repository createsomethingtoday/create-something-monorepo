/**
 * Content Manifest API
 *
 * Returns the list of valid paper and experiment slugs that have actual routes.
 * Used by the unified search indexer to know which content to index.
 *
 * GET /api/manifest
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// These are derived from the actual route structure in src/routes/papers/
// Update this list when adding/removing static paper routes
const PAPER_SLUGS = [
	'agent-sdk-gemini-tools-integration',
	'agent-sdk-model-routing-optimization',
	'animation-spec-architecture',
	'autonomous-harness-architecture',
	'beads-cross-session-memory',
	'beads-integration-patterns',
	'code-mode-hermeneutic-analysis',
	'codex-orchestration',
	'cumulative-state-antipattern',
	'dual-agent-routing-experiment',
	'ethos-transfer-agentic-engineering',
	'haiku-optimization',
	'haiku-ultrathink-validation',
	'harness-agent-sdk-migration',
	'hermeneutic-debugging',
	'hermeneutic-spiral-ux',
	'hermeneutic-triad-review',
	'intellectual-genealogy',
	'kickstand-triad-audit',
	'norvig-partnership',
	'ralph-implementation',
	'ralph-vs-gastown',
	'spec-driven-development',
	'subtractive-form-design',
	'subtractive-studio',
	'teaching-modalities-experiment',
	'understanding-graphs',
	'webflow-dashboard-refactor',
	'workers-vs-python-sdk-plagiarism-detection'
];

const EXPERIMENT_SLUGS = [
	'agent-operations',
	'agentic-visualization',
	'awwwards-patterns',
	'canvas-interactivity',
	'data-patterns',
	'diagrams',
	'hybrid-scheduling',
	'ic-mvp-pipeline',
	'kinetic-typography',
	'living-arena',
	'render-preview',
	'render-studio',
	'spritz',
	'text-revelation'
];

export const GET: RequestHandler = async () => {
	return json({
		property: 'io',
		papers: PAPER_SLUGS,
		experiments: EXPERIMENT_SLUGS,
		generated: new Date().toISOString()
	});
};
