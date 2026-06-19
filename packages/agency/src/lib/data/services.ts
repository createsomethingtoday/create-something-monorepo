/**
 * Products and Services Data
 *
 * Full MCP portfolio and delivery positioning for the /products page.
 * Categories: featured, developer-tools, framework, integration, client.
 */

export type ProductCategory = 'featured' | 'developer-tools' | 'framework' | 'integration' | 'client';

export interface Product {
	id: string;
	title: string;
	description: string;
	pricing: string;
	timeline: string;
	stripeProductId?: string;
	stripePriceId?: string;
	/** Short phrase displayed under the title */
	tagline?: string;
	/** Badge text, e.g. "Free & Open Source" */
	badge?: string;
	/** Category for grouping on the products page */
	category?: ProductCategory;
	/** Link destination — detail page path or external URL */
	href?: string;
	/** npm package name for installable products */
	npmPackage?: string;
	/** Client name for portfolio items */
	client?: string;
	/** Integration platforms for portfolio items */
	integrations?: string[];
}

export const products: Product[] = [
	// ─── Featured ────────────────────────────────────────────────
	{
		id: 'loom',
		title: 'Loom Archive',
		tagline: 'Historical proof for agent continuity',
		description:
			'Archived MCP coordination work that proved agents need ownership, checkpoints, routing, and recovery. New repo work now uses Linear as the task source of truth.',
		badge: 'Historical Proof',
		category: 'featured',
		href: '/products/loom',
		npmPackage: '@createsomething/loom-mcp',
		pricing: 'Archived',
		timeline: 'Linear-first coordination'
	},
	{
		id: 'ground',
		title: 'Ground',
		tagline: 'Code analysis that checks before it claims',
		description:
			'Stop hallucinated duplicates. Ground requires verification before claims — no more false positives.',
		badge: 'Free & Open Source',
		category: 'featured',
		href: '/products/ground',
		npmPackage: '@createsomething/ground-mcp',
		pricing: 'Free',
		timeline: 'Instant setup'
	},

	// ─── Developer Tools ─────────────────────────────────────────
	{
		id: 'triad-audit',
		title: 'Triad Audit',
		tagline: 'Subtractive Triad analysis for codebases',
		description:
			'DRY (duplication), Rams (excess), Heidegger (disconnection). Three-level audit with actions: Unify, Remove, Reconnect.',
		badge: 'Free & Open Source',
		category: 'developer-tools',
		href: 'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/triad-audit',
		npmPackage: '@createsomething/triad-audit',
		pricing: 'Free',
		timeline: 'Instant setup'
	},
	{
		id: 'learn',
		title: 'Learn',
		tagline: 'Learn the Subtractive Triad via Claude Code',
		description:
			'Interactive MCP server for learning the CREATE SOMETHING approach — authentication, lessons, praxis exercises, and reflection.',
		badge: 'Free & Open Source',
		category: 'developer-tools',
		href: 'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/learn',
		npmPackage: '@createsomething/learn',
		pricing: 'Free',
		timeline: 'Instant setup'
	},
	{
		id: 'seeing',
		title: 'Seeing',
		tagline: 'Gemini CLI extension for Subtractive Triad foundations',
		description:
			'Perceive duplication, excess, and disconnection before dwelling in code. A Gemini extension for learning to see.',
		badge: 'Free & Open Source',
		category: 'developer-tools',
		href: 'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/seeing',
		npmPackage: '@createsomething/seeing',
		pricing: 'Free',
		timeline: 'Instant setup'
	},

	// ─── Framework & Infrastructure ──────────────────────────────
	{
		id: 'three-tier-framework',
		title: 'Three-Tier Framework',
		tagline: 'Database, Automation, Judgment as MCP',
		description:
			'The framework itself as an MCP server — Resources, Tools, and Prompts. Architecture review, debugging, and design guidance.',
		badge: 'Open Source',
		category: 'framework',
		href: 'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/three-tier-framework-mcp',
		pricing: 'Free',
		timeline: 'Instant setup'
	},
	{
		id: 'substrate',
		title: 'Substrate',
		tagline: 'Agent-native data layer',
		description:
			'MCP-managed workspaces with D1 and R2. Teams interact through agents instead of a UI — structured data, files, and connectivity.',
		badge: 'Open Source',
		category: 'framework',
		href: 'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/substrate-mcp',
		pricing: 'Free',
		timeline: 'Requires Cloudflare setup'
	},

	// ─── Integration MCPs ────────────────────────────────────────
	{
		id: 'notion-sync',
		title: 'Notion Sync',
		tagline: 'Two-way Notion database sync',
		description:
			'Bidirectional sync between a master Issues database and client-specific Notion databases with conflict handling.',
		badge: 'Open Source',
		category: 'integration',
		href: 'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/notion-sync-mcp',
		pricing: 'Free',
		timeline: 'Requires Notion integration'
	},
	{
		id: 'schedule',
		title: 'Schedule',
		tagline: 'Shared scheduling with backfill and forecast',
		description:
			'CRUD, backfill, forecast, and conflict detection. Deployable as a Cloudflare Worker with SSE transport for AI clients.',
		badge: 'Open Source',
		category: 'integration',
		href: 'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/schedule-mcp',
		pricing: 'Free',
		timeline: 'Requires Cloudflare setup'
	},
	{
		id: 'quickbooks-notion',
		title: 'QuickBooks Notion',
		tagline: 'QuickBooks Online to Notion sync',
		description:
			'Read-only MCP server giving AI agents secure access to QuickBooks data, synced into Notion databases with OAuth auto-refresh.',
		badge: 'Open Source',
		category: 'integration',
		href: 'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/quickbooks-notion-mcp',
		pricing: 'Free',
		timeline: 'Requires Intuit + Notion setup'
	},
	{
		id: 'webflow-site-analyzer',
		title: 'Webflow Site Analyzer',
		tagline: 'Site analysis — SEO, structure, performance',
		description:
			'Analyze Webflow sites with a self-improving intelligence layer: touchpoints, SEO, structure, performance, and Designer metadata.',
		badge: 'Open Source',
		category: 'integration',
		href: 'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/webflow-site-analyzer-mcp',
		pricing: 'Free',
		timeline: 'Requires Webflow access'
	},
	{
		id: 'webflow-marketplace',
		title: 'Webflow Marketplace',
		tagline: 'Plagiarism detection and marketplace analysis',
		description:
			'MCP server for the Webflow Marketplace with plagiarism detection (MinHash, LSH, PageRank), marketplace asset analysis, and framework detection.',
		badge: 'Open Source',
		category: 'integration',
		href: 'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/webflow-mcp',
		pricing: 'Free',
		timeline: 'Requires Webflow access'
	},
	{
		id: 'community',
		title: 'Community',
		tagline: 'Agent-managed community presence',
		description:
			'Monitor platforms, draft responses, and queue them for human review. Community presence with minimal daily effort.',
		badge: 'Open Source',
		category: 'integration',
		href: 'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/community-mcp',
		pricing: 'Free',
		timeline: 'Instant setup'
	},
	{
		id: 'social',
		title: 'Social',
		tagline: 'LinkedIn content scheduling and optimization',
		description:
			'AI-native social calendar management. Schedule, observe, and optimize LinkedIn content through MCP.',
		badge: 'Open Source',
		category: 'integration',
		href: 'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/social-mcp',
		pricing: 'Free',
		timeline: 'Instant setup'
	},

	// ─── Client Portfolio ────────────────────────────────────────
	{
		id: 'halfdozen',
		title: 'Half Dozen Sync Suite',
		tagline: 'Gmail, YouTube, and Zoom Clips to Notion',
		description:
			'Three custom MCP servers syncing Gmail emails, YouTube playlist transcripts, and Zoom Clips into Notion — with contact matching, browser automation, and email notifications. Codex setup + policy + runbook included.',
		badge: 'Custom Build',
		category: 'client',
		client: 'Half Dozen',
		integrations: ['Gmail', 'YouTube', 'Zoom', 'Notion', 'Steel.dev'],
		pricing: 'Custom',
		timeline: 'Custom project'
	},
	{
		id: 'outerfields',
		title: 'Outerfields PCN',
		tagline: 'AI-guided platform documentation',
		description:
			'MCP server for the OUTERFIELDS Premium Content Network — AI-driven component exploration, pattern guidance, deployment, and architecture documentation. Codex setup + policy + runbook included.',
		badge: 'Custom Build',
		category: 'client',
		client: 'Outerfields',
		integrations: ['Cloudflare Workers', 'MCP Remote'],
		pricing: 'Custom',
		timeline: 'Custom project'
	}
];

/**
 * Get products by category
 */
export function getProductsByCategory(category: ProductCategory): Product[] {
	return products.filter((p) => p.category === category);
}

/**
 * Get a product by its slug/id
 */
export function getOfferingBySlug(slug: string): Product | undefined {
	return products.find((p) => p.id === slug);
}
