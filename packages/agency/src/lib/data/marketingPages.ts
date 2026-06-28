export type MarketingPageDecision = 'index' | 'route' | 'archive';
export type MarketingPageCluster = 'dify';
export type MarketingPageRole = 'pillar' | 'support' | 'comparison' | 'implementation' | 'operations';
export type MarketingFunnelStage = 'discover' | 'understand' | 'evaluate' | 'implement' | 'book';
export type MarketingSelfHealingLever =
	| 'copy:heal'
	| 'search-route:sync'
	| 'canonical-route:review'
	| 'archive-route:review';

export type MarketingPageEntry = {
	path: string;
	cluster: MarketingPageCluster;
	role: MarketingPageRole;
	decision: MarketingPageDecision;
	routeTarget?: string;
	audience: string;
	funnelStage: MarketingFunnelStage;
	intent: string;
	primaryAction: string;
	requiredTerms: string[];
	requiredLinks: string[];
	schema: 'faq' | 'article';
	search: {
		changefreq: 'daily' | 'weekly' | 'monthly';
		priority: string;
		lastmod: string;
	};
	selfHealing: MarketingSelfHealingLever[];
};

export type MarketingPageScore = {
	total: number;
	maximum: number;
	percent: number;
	status: 'strong' | 'route-review' | 'archive-review';
	checks: Array<{
		id: string;
		label: string;
		points: number;
		max: number;
		passed: boolean;
	}>;
};

export const marketingPageMinimums: Record<MarketingPageDecision, number> = {
	index: 82,
	route: 60,
	archive: 0
};

export const marketingPagePortfolio: MarketingPageEntry[] = [
	{
		path: '/dify',
		cluster: 'dify',
		role: 'pillar',
		decision: 'index',
		audience: 'Teams evaluating Dify for controlled AI workflow systems.',
		funnelStage: 'understand',
		intent: 'Explain the Dify implementation lane and route readers into the cluster.',
		primaryAction: 'Map one workflow',
		requiredTerms: ['Dify', 'MCP', 'Policy OS', 'approval', 'evidence'],
		requiredLinks: ['/dify/mcp-control-plane', '/dify/agent-eval-gates', '/partners'],
		schema: 'faq',
		search: {
			changefreq: 'weekly',
			priority: '0.9',
			lastmod: '2026-06-19'
		},
		selfHealing: ['copy:heal', 'search-route:sync']
	},
	{
		path: '/dify/mcp-control-plane',
		cluster: 'dify',
		role: 'support',
		decision: 'index',
		audience: 'Builders and operators who need Dify connected to governed tools.',
		funnelStage: 'understand',
		intent: 'Teach the operating model: Dify surface, MCP boundary, Policy OS rule.',
		primaryAction: 'Request workflow teardown',
		requiredTerms: ['Dify', 'MCP', 'Policy OS', 'approval', 'evidence'],
		requiredLinks: ['/dify', '/dify/agent-eval-gates'],
		schema: 'article',
		search: {
			changefreq: 'weekly',
			priority: '0.85',
			lastmod: '2026-06-22'
		},
		selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
	},
	{
		path: '/dify/agent-eval-gates',
		cluster: 'dify',
		role: 'operations',
		decision: 'index',
		audience: 'Operators deciding whether a Dify workflow is ready to run.',
		funnelStage: 'evaluate',
		intent: 'Show the gates that prove a Dify workflow can operate safely.',
		primaryAction: 'Request workflow teardown',
		requiredTerms: ['Dify', 'Langfuse', 'Braintrust', 'forbidden tool', 'secret refusal'],
		requiredLinks: ['/dify', '/dify/ship-dify-app-with-mcp-tools'],
		schema: 'article',
		search: {
			changefreq: 'weekly',
			priority: '0.85',
			lastmod: '2026-06-23'
		},
		selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
	},
	{
		path: '/dify/ship-dify-app-with-mcp-tools',
		cluster: 'dify',
		role: 'implementation',
		decision: 'index',
		audience: 'Teams ready to package one Dify workflow with scoped tools.',
		funnelStage: 'implement',
		intent: 'Give a practical shipping checklist for Dify plus MCP systems.',
		primaryAction: 'Book workflow mapping',
		requiredTerms: ['Dify', 'MCP', 'Policy OS', 'runbook', 'proof'],
		requiredLinks: ['/dify', '/dify/mcp-control-plane', '/dify/agent-eval-gates'],
		schema: 'article',
		search: {
			changefreq: 'weekly',
			priority: '0.85',
			lastmod: '2026-06-23'
		},
		selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
	},
	{
		path: '/dify/content-engine',
		cluster: 'dify',
		role: 'operations',
		decision: 'index',
		audience: 'Operators planning a custom-domain-first Dify content funnel.',
		funnelStage: 'evaluate',
		intent: 'Explain how canonical pages, dispatches, and routing support the Dify funnel.',
		primaryAction: 'Book workflow mapping',
		requiredTerms: ['Dify', 'custom-domain', 'routing', 'conversion', 'canonical'],
		requiredLinks: ['/dify', '/dify/mcp-control-plane', '/dify/n8n-vs-dify'],
		schema: 'article',
		search: {
			changefreq: 'weekly',
			priority: '0.85',
			lastmod: '2026-06-22'
		},
		selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
	},
	{
		path: '/dify/n8n-vs-dify',
		cluster: 'dify',
		role: 'comparison',
		decision: 'index',
		audience: 'Teams comparing workflow automation with agent app surfaces.',
		funnelStage: 'evaluate',
		intent: 'Capture comparison intent and route it toward the governed Dify lane.',
		primaryAction: 'Request workflow teardown',
		requiredTerms: ['Dify', 'n8n', 'Cloudflare', 'agent app', 'automation'],
		requiredLinks: ['/dify', '/dify/mcp-control-plane'],
		schema: 'article',
		search: {
			changefreq: 'weekly',
			priority: '0.85',
			lastmod: '2026-06-22'
		},
		selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
	}
];

export function scoreMarketingPage(
	entry: MarketingPageEntry,
	source: string,
	options: { plainLanguagePassed?: boolean } = {}
): MarketingPageScore {
	const plainLanguagePassed = options.plainLanguagePassed ?? true;
	const checks = [
		{
			id: 'route-job',
			label: 'Page has a defined funnel job',
			points: entry.intent && entry.audience && entry.funnelStage ? 12 : 0,
			max: 12,
			passed: Boolean(entry.intent && entry.audience && entry.funnelStage)
		},
		{
			id: 'seo',
			label: 'Page declares SEO title and description',
			points: /<SEO[\s\S]*?title="/.test(source) && /<SEO[\s\S]*?description="/.test(source) ? 14 : 0,
			max: 14,
			passed: /<SEO[\s\S]*?title="/.test(source) && /<SEO[\s\S]*?description="/.test(source)
		},
		{
			id: 'schema',
			label: `Page uses ${entry.schema} schema`,
			points:
				entry.schema === 'faq'
					? /faqItems/.test(source)
						? 12
						: 0
					: /ogType="article"/.test(source) && /publishedTime=/.test(source)
						? 12
						: 0,
			max: 12,
			passed:
				entry.schema === 'faq'
					? /faqItems/.test(source)
					: /ogType="article"/.test(source) && /publishedTime=/.test(source)
		},
		{
			id: 'primary-action',
			label: 'Page includes a direct conversion action',
			points: source.includes('agencyCoreMessaging') || source.includes(entry.primaryAction) ? 14 : 0,
			max: 14,
			passed: source.includes('agencyCoreMessaging') || source.includes(entry.primaryAction)
		},
		{
			id: 'routing',
			label: 'Page routes to related cluster pages',
			points: entry.requiredLinks.every((link) => source.includes(`"${link}"`) || source.includes(`href: '${link}'`)) ? 14 : 0,
			max: 14,
			passed: entry.requiredLinks.every((link) => source.includes(`"${link}"`) || source.includes(`href: '${link}'`))
		},
		{
			id: 'terms',
			label: 'Page contains required intent terms',
			points: entry.requiredTerms.every((term) => source.toLowerCase().includes(term.toLowerCase())) ? 14 : 0,
			max: 14,
			passed: entry.requiredTerms.every((term) => source.toLowerCase().includes(term.toLowerCase()))
		},
		{
			id: 'plain-language',
			label: 'Page avoids known internal marketing language',
			points: plainLanguagePassed ? 12 : 0,
			max: 12,
			passed: plainLanguagePassed
		},
		{
			id: 'route-decision',
			label: 'Indexable pages have search metadata',
			points:
				entry.decision === 'index' && entry.search.changefreq && entry.search.priority && entry.search.lastmod
					? 8
					: entry.decision !== 'index' && entry.routeTarget
						? 8
						: 0,
			max: 8,
			passed:
				(entry.decision === 'index' && Boolean(entry.search.changefreq && entry.search.priority && entry.search.lastmod)) ||
				(entry.decision !== 'index' && Boolean(entry.routeTarget))
		}
	];

	const total = checks.reduce((sum, check) => sum + check.points, 0);
	const maximum = checks.reduce((sum, check) => sum + check.max, 0);
	const percent = Math.round((total / maximum) * 100);

	return {
		total,
		maximum,
		percent,
		status: percent >= marketingPageMinimums.index ? 'strong' : percent >= marketingPageMinimums.route ? 'route-review' : 'archive-review',
		checks
	};
}
