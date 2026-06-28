export type MarketingPageDecision = 'index' | 'route' | 'archive';
export type MarketingPageCluster =
	| 'core-services'
	| 'stack-boundary'
	| 'tool-programs'
	| 'dify'
	| 'products'
	| 'business-use-case'
	| 'enterprise-use-case';
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
		path: '/services',
		cluster: 'core-services',
		role: 'pillar',
		decision: 'index',
		audience: 'Teams with one messy business handoff that needs controlled AI assistance.',
		funnelStage: 'book',
		intent: 'Explain the core service path: map one workflow before build work starts.',
		primaryAction: 'Map the workflow',
		requiredTerms: ['workflow', 'handoff', 'approval', 'stop', 'audit trail'],
		requiredLinks: ['#atlas-warmup'],
		schema: 'faq',
		search: {
			changefreq: 'weekly',
			priority: '0.95',
			lastmod: '2026-06-19'
		},
		selfHealing: ['copy:heal', 'search-route:sync']
	},
	{
		path: '/stack',
		cluster: 'stack-boundary',
		role: 'pillar',
		decision: 'index',
		audience: 'Teams deciding what they own before AI tools act across accounts.',
		funnelStage: 'understand',
		intent: 'Explain the stack boundary in workflow terms before vendor choices dominate.',
		primaryAction: 'Map the stack boundary',
		requiredTerms: ['workflow', 'approval', 'evidence', 'runbook', 'vendor'],
		requiredLinks: ['/cloudflare', '/dify', '/notion'],
		schema: 'faq',
		search: {
			changefreq: 'monthly',
			priority: '0.85',
			lastmod: '2026-06-19'
		},
		selfHealing: ['copy:heal', 'search-route:sync']
	},
	{
		path: '/partners',
		cluster: 'tool-programs',
		role: 'pillar',
		decision: 'index',
		audience: 'Teams deciding which tool program route fits one workflow.',
		funnelStage: 'understand',
		intent: 'Route a workflow toward Dify, Cloudflare, Notion, or the broader stack boundary.',
		primaryAction: 'Map the route',
		requiredTerms: ['Dify', 'Cloudflare', 'Notion', 'workflow', 'evidence'],
		requiredLinks: ['/dify', '/cloudflare', '/notion', '/stack'],
		schema: 'faq',
		search: {
			changefreq: 'monthly',
			priority: '0.85',
			lastmod: '2026-06-19'
		},
		selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
	},
	{
		path: '/cloudflare',
		cluster: 'tool-programs',
		role: 'support',
		decision: 'index',
		audience: 'Teams whose workflow needs owned runtime routes and durable state.',
		funnelStage: 'evaluate',
		intent: 'Explain Cloudflare as the runtime substrate for controlled workflow routes.',
		primaryAction: 'Map the runtime',
		requiredTerms: ['Cloudflare', 'Workers', 'D1', 'workflow', 'evidence'],
		requiredLinks: ['/partners', '/stack'],
		schema: 'faq',
		search: {
			changefreq: 'monthly',
			priority: '0.8',
			lastmod: '2026-06-19'
		},
		selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
	},
	{
		path: '/notion',
		cluster: 'tool-programs',
		role: 'support',
		decision: 'index',
		audience: 'Teams whose workflow needs an operator-facing review workspace.',
		funnelStage: 'evaluate',
		intent: 'Explain Notion as the visible operating layer around AI-enabled work.',
		primaryAction: 'Map the workspace',
		requiredTerms: ['Notion', 'workspace', 'workflow', 'evidence', 'review'],
		requiredLinks: ['/partners', '/stack'],
		schema: 'faq',
		search: {
			changefreq: 'monthly',
			priority: '0.8',
			lastmod: '2026-06-22'
		},
		selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
	},
	{
		path: '/dify',
		cluster: 'dify',
		role: 'pillar',
		decision: 'index',
		audience: 'Teams evaluating Dify for controlled AI workflow systems.',
		funnelStage: 'understand',
		intent: 'Explain the Dify workflow path and route readers into the cluster.',
		primaryAction: 'Map one workflow',
		requiredTerms: ['Dify', 'MCP', 'Policy OS', 'approval', 'evidence'],
		requiredLinks: ['/dify/mcp-control-plane', '/dify/agent-eval-gates', '/stack'],
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
		audience: 'Operators planning a routed Dify page portfolio.',
		funnelStage: 'evaluate',
		intent: 'Explain how canonical pages, distribution notes, and route scoring support the Dify portfolio.',
		primaryAction: 'Book workflow mapping',
		requiredTerms: ['Dify', 'portfolio', 'routing', 'strength', 'canonical'],
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
		intent: 'Capture comparison intent and route it toward the governed Dify workflow path.',
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
	},
	{
		path: '/products',
		cluster: 'products',
		role: 'pillar',
		decision: 'index',
		audience: 'Teams looking for proof before trusting the workflow method.',
		funnelStage: 'evaluate',
		intent: 'Show proof objects that make the CREATE SOMETHING method inspectable.',
		primaryAction: 'Apply the proof',
		requiredTerms: ['proof', 'workflow', 'evidence', 'approval', 'runbook'],
		requiredLinks: [],
		schema: 'faq',
		search: {
			changefreq: 'monthly',
			priority: '0.75',
			lastmod: '2026-06-19'
		},
		selfHealing: ['copy:heal', 'search-route:sync']
	},
	{
		path: '/use-cases/business',
		cluster: 'business-use-case',
		role: 'pillar',
		decision: 'index',
		audience: 'Small teams carrying repeated workflow handoffs manually.',
		funnelStage: 'book',
		intent: 'Explain the small-team workflow pilot path in natural language.',
		primaryAction: 'Bring the workflow',
		requiredTerms: ['workflow', 'pilot', 'runbook', 'approval', 'evidence'],
		requiredLinks: [],
		schema: 'faq',
		search: {
			changefreq: 'monthly',
			priority: '0.8',
			lastmod: '2026-06-19'
		},
		selfHealing: ['copy:heal', 'search-route:sync']
	},
	{
		path: '/use-cases/enterprise',
		cluster: 'enterprise-use-case',
		role: 'pillar',
		decision: 'index',
		audience: 'Teams whose AI-assisted workflows already affect operations or risk.',
		funnelStage: 'book',
		intent: 'Explain the enterprise Policy OS path after the first workflow is live.',
		primaryAction: 'Bring the workflow',
		requiredTerms: ['Policy OS', 'workflow', 'approval', 'evidence', 'reliability'],
		requiredLinks: [],
		schema: 'faq',
		search: {
			changefreq: 'monthly',
			priority: '0.8',
			lastmod: '2026-06-19'
		},
		selfHealing: ['copy:heal', 'search-route:sync']
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
			label: 'Page includes a direct next action',
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
