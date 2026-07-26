/**
 * Content Manifest API
 *
 * Returns metadata for all services and work (case studies) with actual routes.
 * Used by the unified search indexer to know which content to index.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ IMPORTANT: Agency services are STATIC DATA in $lib/data/services   │
 * │ Work/case studies are MARKDOWN FILES in content/work/              │
 * │                                                                     │
 * │ They are NOT stored in D1 - the search indexer uses this manifest. │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * WHEN ADDING A NEW SERVICE:
 * 1. Add to $lib/data/services.ts
 * 2. Add entry to SERVICES array below
 *
 * WHEN ADDING A NEW CASE STUDY:
 * 1. Create markdown file: content/work/{slug}.md
 * 2. Add entry to WORK array below
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
 * Services defined in $lib/data/services.ts
 * Each entry here should match the service definitions there
 */
const SERVICES: ContentItem[] = [
	{
		slug: 'map',
		title: 'CREATE SOMETHING Map',
		description: 'Standalone workflow-mapping product for living definitions, review, versioning, and implementation handoff.',
		category: 'product'
	},
	{
		slug: 'build',
		title: 'CREATE SOMETHING Build',
		description: 'Implementation service that turns an approved workflow map into an owned, connected system.',
		category: 'service'
	},
	{
		slug: 'control',
		title: 'CREATE SOMETHING Control',
		description: 'Standalone governed-execution product for approvals, policy, runs, evidence, and recovery. Control includes Map.',
		category: 'product'
	},
	{
		slug: 'workflow-infrastructure',
		title: 'Workflow System',
		description: 'CREATE SOMETHING builds production-safe workflow systems for business-critical operations with clear operating boundaries.',
		category: 'service'
	},
	{
		slug: 'policy-os',
		title: 'Policy OS (Compatibility Alias)',
		description: 'Compatibility alias for the internal Control contract bundle, runtime policy layer, and existing entitlement identifiers.',
		category: 'compatibility'
	},
	{
		slug: 'reliability-and-control-layer',
		title: 'Reliability and Control Layer (Deprecated Alias)',
		description: 'Deprecated compatibility alias for the CREATE SOMETHING Control product.',
		category: 'compatibility'
	},
	{
		slug: 'enterprise-extension',
		title: 'Enterprise Extension',
		description: 'Custom orchestration for high-stakes, cross-system, and compliance-heavy workflows.',
		category: 'service'
	},
	{
		slug: 'mcp-only-discovery',
		title: 'MCP Entry Path (Discovery/Compliance)',
		description: 'Scoped entry path for read-only or limited-scope connectivity when teams need a safe workflow starting point before broader automation.',
		category: 'service'
	}
];

/**
 * Work/case studies from content/work/*.md
 * Each entry here MUST have a corresponding markdown file
 */
const WORK: ContentItem[] = [
	{
		slug: 'arc-for-gmail',
		title: 'Arc for Gmail',
		description: 'Agent-powered email assistant with Gmail integration',
		category: 'case-study'
	},
	{
		slug: 'kickstand',
		title: 'Kickstand',
		description: 'Artist discovery and curation platform for Half Dozen',
		category: 'case-study'
	},
	{
		slug: 'maverick-x',
		title: 'Maverick X',
		description: 'Full rebrand and platform delivery in 3 weeks',
		category: 'case-study'
	},
	{
		slug: 'the-stack',
		title: 'The Stack',
		description: 'Restaurant website with reservations and location management',
		category: 'case-study'
	},
	{
		slug: 'viralytics',
		title: 'Viralytics',
		description: 'Social media analytics and content optimization platform',
		category: 'case-study'
	}
];

export const GET: RequestHandler = async () => {
	return json({
		property: 'agency',
		services: SERVICES,
		work: WORK,
		// Legacy format for backward compatibility
		serviceSlugs: SERVICES.map(s => s.slug),
		workSlugs: WORK.map(w => w.slug),
		generated: new Date().toISOString()
	});
};
