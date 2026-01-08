/**
 * Beads Dependency Graph Experiment - Server Load
 *
 * Hypothesis: Force-directed graph visualization can reveal work structure
 * without decoration - functional branding through real data.
 */

import type { PageServerLoad } from './$types';

interface BeadsNode {
	id: string;
	title: string;
	status: 'pending' | 'in-progress' | 'completed';
	priority: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
	labels: string[];
}

interface BeadsEdge {
	source: string;
	target: string;
	type: 'blocks' | 'parent' | 'related';
}

export const load: PageServerLoad = async () => {
	// Mock Beads data representing realistic work structure
	const nodes: BeadsNode[] = [
		// Foundation work
		{
			id: 'cs-001',
			title: 'Setup Canon design tokens',
			status: 'completed',
			priority: 'P1',
			labels: ['infrastructure', 'canon']
		},
		{
			id: 'cs-002',
			title: 'Configure Tailwind + Canon',
			status: 'completed',
			priority: 'P1',
			labels: ['infrastructure', 'canon']
		},

		// Authentication feature
		{
			id: 'cs-010',
			title: 'Design auth architecture',
			status: 'completed',
			priority: 'P0',
			labels: ['feature', 'auth', 'architecture']
		},
		{
			id: 'cs-011',
			title: 'Implement login endpoint',
			status: 'completed',
			priority: 'P0',
			labels: ['feature', 'auth']
		},
		{
			id: 'cs-012',
			title: 'Add session middleware',
			status: 'in-progress',
			priority: 'P0',
			labels: ['feature', 'auth']
		},
		{
			id: 'cs-013',
			title: 'Write auth tests',
			status: 'pending',
			priority: 'P1',
			labels: ['feature', 'auth', 'testing']
		},

		// Template platform
		{
			id: 'cs-020',
			title: 'Router worker architecture',
			status: 'completed',
			priority: 'P1',
			labels: ['feature', 'templates']
		},
		{
			id: 'cs-021',
			title: 'Tenant config system',
			status: 'in-progress',
			priority: 'P1',
			labels: ['feature', 'templates']
		},
		{
			id: 'cs-022',
			title: 'R2 asset serving',
			status: 'pending',
			priority: 'P2',
			labels: ['feature', 'templates']
		},
		{
			id: 'cs-023',
			title: 'Custom domain support',
			status: 'pending',
			priority: 'P3',
			labels: ['feature', 'templates']
		},

		// Beads integration
		{
			id: 'cs-030',
			title: 'Install Beads',
			status: 'completed',
			priority: 'P1',
			labels: ['infrastructure', 'beads']
		},
		{
			id: 'cs-031',
			title: 'Beads dependency parsing',
			status: 'in-progress',
			priority: 'P2',
			labels: ['feature', 'beads']
		},
		{
			id: 'cs-032',
			title: 'Graph visualization component',
			status: 'in-progress',
			priority: 'P2',
			labels: ['feature', 'beads', 'experiment']
		},

		// Documentation
		{
			id: 'cs-040',
			title: 'Document Canon patterns',
			status: 'pending',
			priority: 'P2',
			labels: ['docs', 'canon']
		},
		{
			id: 'cs-041',
			title: 'Template deployment guide',
			status: 'pending',
			priority: 'P3',
			labels: ['docs', 'templates']
		}
	];

	// Dependencies showing real work structure
	const edges: BeadsEdge[] = [
		// Canon tokens needed before Tailwind config
		{ source: 'cs-001', target: 'cs-002', type: 'blocks' },

		// Auth architecture blocks implementation
		{ source: 'cs-010', target: 'cs-011', type: 'blocks' },
		{ source: 'cs-011', target: 'cs-012', type: 'blocks' },
		{ source: 'cs-012', target: 'cs-013', type: 'blocks' },

		// Template platform dependencies
		{ source: 'cs-020', target: 'cs-021', type: 'blocks' },
		{ source: 'cs-021', target: 'cs-022', type: 'blocks' },
		{ source: 'cs-022', target: 'cs-023', type: 'blocks' },

		// Beads workflow
		{ source: 'cs-030', target: 'cs-031', type: 'blocks' },
		{ source: 'cs-031', target: 'cs-032', type: 'blocks' },

		// Cross-feature dependencies
		{ source: 'cs-001', target: 'cs-040', type: 'related' }, // Canon docs need tokens
		{ source: 'cs-020', target: 'cs-041', type: 'related' } // Router docs need architecture
	];

	return {
		metadata: {
			title: 'Beads Dependency Graph',
			description:
				'Force-directed visualization of work structure. Functional branding through real data.',
			hypothesis:
				'Dependency graphs reveal hidden structure and serve as functional branding - information over decoration',
			dateStarted: '2026-01-08',
			status: 'active'
		},
		graph: {
			nodes,
			edges
		}
	};
};
