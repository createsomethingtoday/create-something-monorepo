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
		slug: 'web-development',
		title: 'Web Development',
		description: '3 weeks to production. Sub-100ms response times. Edge-deployed, zero maintenance.',
		category: 'service'
	},
	{
		slug: 'automation',
		title: 'AI Automation Systems',
		description: '60-70% time savings on manual work. Systems that process data, make decisions, and talk to your tools.',
		category: 'service'
	},
	{
		slug: 'transformation',
		title: 'Digital Transformation',
		description: 'Strategic advisory for organizations ready to embrace AI-native development.',
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
		description: 'AI-powered email assistant with Gmail integration',
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
