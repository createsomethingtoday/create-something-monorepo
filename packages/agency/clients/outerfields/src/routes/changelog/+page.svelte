<script lang="ts">
	/**
	 * OUTERFIELDS Changelog
	 * 
	 * Public development progress page for investors and stakeholders
	 */
	import { Calendar, Check, Zap, Shield, Video, CreditCard, BarChart3, Users, Smartphone, Mail, Bot } from 'lucide-svelte';

	interface ChangelogEntry {
		date: string;
		version?: string;
		title: string;
		description: string;
		category: 'feature' | 'improvement' | 'fix' | 'security';
		highlights?: string[];
	}

	const changelog: ChangelogEntry[] = [
		{
			date: '2026-01-20',
			version: '1.4.0',
			title: 'AI-Native Workflow Enhancements',
			description: 'Advanced AI tooling for platform self-improvement and founding member presets.',
			category: 'feature',
			highlights: [
				'Stack-founding-members preset for quick member setup',
				'Incremental diff mode for AI-native workflows',
				'Auto-load environment configuration'
			]
		},
		{
			date: '2026-01-19',
			version: '1.3.0',
			title: 'Mobile & Tablet Optimization',
			description: 'Responsive design improvements ensuring flawless experience across all devices.',
			category: 'improvement',
			highlights: [
				'iPad/tablet viewport overflow fixes',
				'Mobile navigation improvements',
				'Video landing page mobile optimization'
			]
		},
		{
			date: '2026-01-18',
			version: '1.2.1',
			title: 'Security & Logging Updates',
			description: 'Critical security patches and improved payment webhook logging.',
			category: 'security',
			highlights: [
				'Stripe webhook persistent logging',
				'Wrangler security update (undici fix)',
				'Improved error tracking'
			]
		},
		{
			date: '2026-01-17',
			version: '1.2.0',
			title: 'AI-Native Platform System',
			description: 'Revolutionary self-improving platform with human-in-the-loop guardrails.',
			category: 'feature',
			highlights: [
				'AI agent proposal system',
				'Human approval workflow',
				'Automated UX improvements',
				'Guardrails for safe changes'
			]
		},
		{
			date: '2026-01-14',
			version: '1.1.0',
			title: 'Email & Communication System',
			description: 'Professional email templates with Resend integration for member communications.',
			category: 'feature',
			highlights: [
				'Resend template management',
				'Video landing page update emails',
				'Client update notifications',
				'Branded email from createsomething.io'
			]
		},
		{
			date: '2026-01-13',
			version: '1.0.0',
			title: 'Video Experience & Presentations',
			description: 'Complete video landing page experience with comments, transcripts, and investor presentations.',
			category: 'feature',
			highlights: [
				'Video watch pages with analytics',
				'Comments and transcript system',
				'Related videos recommendations',
				'Investor & user presentations',
				'AI analytics chat preview',
				'Remote MCP publishing'
			]
		},
		{
			date: '2026-01-12',
			version: '0.9.0',
			title: 'Production Launch',
			description: 'Full platform deployment with Cloudflare infrastructure and membership system.',
			category: 'feature',
			highlights: [
				'Netflix-style content browsing',
				'$99 lifetime membership checkout',
				'Stripe payment integration',
				'Calendly discovery calls',
				'Analytics dashboard preview',
				'Component Lab with tool demos',
				'Journey section (Code+Media+Build+Sell)',
				'Competitive comparison vs Patreon/Substack'
			]
		},
		{
			date: '2026-01-11',
			version: '0.8.0',
			title: 'AI Analytics Chat',
			description: 'Interactive Claude-powered analytics assistant for content strategy insights.',
			category: 'feature',
			highlights: [
				'Natural language analytics queries',
				'Content strategy recommendations',
				'Real-time platform insights'
			]
		},
		{
			date: '2026-01-09',
			version: '0.7.0',
			title: 'MCP Server & AI Integration',
			description: 'Remote MCP server for AI-native platform exploration and analytics.',
			category: 'feature',
			highlights: [
				'Remote MCP server deployment',
				'AI-powered content strategy chat',
				'Component Lab with live previews',
				'OUTERFIELDS brand integration'
			]
		},
		{
			date: '2026-01-08',
			version: '0.6.0',
			title: 'Platform Foundation',
			description: 'Core platform features including video player, pricing, and 3D hero experience.',
			category: 'feature',
			highlights: [
				'Sketchfab 3D embed hero',
				'Flux AI thumbnails',
				'Veo 3.1 video generation',
				'Engagement heatmap',
				'R2 CDN video delivery',
				'Demo authentication system'
			]
		}
	];

	const stats = {
		totalCommits: 75,
		features: 42,
		improvements: 18,
		fixes: 15,
		daysInDevelopment: 13
	};

	function getCategoryIcon(category: string) {
		switch (category) {
			case 'feature': return Zap;
			case 'improvement': return Check;
			case 'fix': return Shield;
			case 'security': return Shield;
			default: return Check;
		}
	}

	function getCategoryColor(category: string) {
		switch (category) {
			case 'feature': return 'var(--color-success)';
			case 'improvement': return 'var(--color-info)';
			case 'fix': return 'var(--color-warning)';
			case 'security': return 'var(--color-error)';
			default: return 'var(--color-fg-muted)';
		}
	}
</script>

<svelte:head>
	<title>Changelog | OUTERFIELDS</title>
	<meta name="description" content="Development progress and feature releases for the OUTERFIELDS premium content network." />
</svelte:head>

<main class="changelog-page">
	<section class="hero-section">
		<div class="hero-content">
			<span class="hero-badge">Development Progress</span>
			<h1 class="hero-title">Building in Public</h1>
			<p class="hero-description">
				Track our journey as we build OUTERFIELDS—a premium content network that blends 
				code, media, and distribution into one subscriber experience.
			</p>
		</div>
	</section>

	<section class="stats-section">
		<div class="stats-grid">
			<div class="stat-card">
				<span class="stat-value">{stats.daysInDevelopment}</span>
				<span class="stat-label">Days of Development</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">{stats.totalCommits}+</span>
				<span class="stat-label">Commits</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">{stats.features}</span>
				<span class="stat-label">Features Shipped</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">$99</span>
				<span class="stat-label">Lifetime Access</span>
			</div>
		</div>
	</section>

	<section class="timeline-section">
		<div class="timeline-container">
			<h2 class="section-title">Release Timeline</h2>
			
			<div class="timeline">
				{#each changelog as entry, i}
					{@const Icon = getCategoryIcon(entry.category)}
					<div class="timeline-entry">
						<div class="timeline-marker" style="--marker-color: {getCategoryColor(entry.category)}">
							<Icon size={16} />
						</div>
						
						<div class="timeline-content">
							<div class="entry-header">
								<div class="entry-meta">
									<span class="entry-date">
										<Calendar size={14} />
										{entry.date}
									</span>
									{#if entry.version}
										<span class="entry-version">v{entry.version}</span>
									{/if}
									<span class="entry-category" style="--cat-color: {getCategoryColor(entry.category)}">
										{entry.category}
									</span>
								</div>
								<h3 class="entry-title">{entry.title}</h3>
							</div>
							
							<p class="entry-description">{entry.description}</p>
							
							{#if entry.highlights && entry.highlights.length > 0}
								<ul class="entry-highlights">
									{#each entry.highlights as highlight}
										<li>
											<Check size={14} />
											{highlight}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="cta-section">
		<div class="cta-content">
			<h2 class="cta-title">Join the Journey</h2>
			<p class="cta-description">
				Become a founding member and get lifetime access to the platform as we continue to build.
			</p>
			<div class="cta-buttons">
				<a href="/#pricing" class="cta-primary">Become a Founding Member - $99</a>
				<a href="/presentations/investor" class="cta-secondary">View Investor Deck</a>
			</div>
		</div>
	</section>
</main>

<style>
	.changelog-page {
		min-height: 100vh;
		background: var(--color-bg-pure);
	}

	/* Hero Section */
	.hero-section {
		padding: 8rem 1.5rem 4rem;
		text-align: center;
		background: linear-gradient(to bottom, var(--color-bg-surface), var(--color-bg-pure));
	}

	.hero-content {
		max-width: 48rem;
		margin: 0 auto;
	}

	.hero-badge {
		display: inline-block;
		padding: 0.375rem 0.75rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 9999px;
		font-size: var(--text-caption);
		font-weight: 600;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1.5rem;
	}

	.hero-title {
		font-size: clamp(2.5rem, 5vw, 4rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
		letter-spacing: -0.02em;
	}

	.hero-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-muted);
		line-height: 1.7;
		margin: 0;
	}

	/* Stats Section */
	.stats-section {
		padding: 0 1.5rem 4rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		max-width: 56rem;
		margin: 0 auto;
	}

	.stat-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		text-align: center;
	}

	.stat-value {
		display: block;
		font-size: clamp(1.5rem, 3vw, 2.5rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: 0.25rem;
	}

	.stat-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Timeline Section */
	.timeline-section {
		padding: 4rem 1.5rem;
	}

	.timeline-container {
		max-width: 48rem;
		margin: 0 auto;
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 3rem;
		text-align: center;
	}

	.timeline {
		position: relative;
		padding-left: 2rem;
	}

	.timeline::before {
		content: '';
		position: absolute;
		left: 0.75rem;
		top: 0;
		bottom: 0;
		width: 2px;
		background: var(--color-border-default);
	}

	.timeline-entry {
		position: relative;
		padding-bottom: 2.5rem;
	}

	.timeline-entry:last-child {
		padding-bottom: 0;
	}

	.timeline-marker {
		position: absolute;
		left: -2rem;
		top: 0;
		width: 1.5rem;
		height: 1.5rem;
		background: var(--color-bg-surface);
		border: 2px solid var(--marker-color);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--marker-color);
	}

	.timeline-content {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.timeline-content:hover {
		border-color: var(--color-border-strong);
	}

	.entry-header {
		margin-bottom: 1rem;
	}

	.entry-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
		flex-wrap: wrap;
	}

	.entry-date {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.entry-version {
		padding: 0.125rem 0.5rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		font-weight: 600;
		color: var(--color-fg-secondary);
		font-family: monospace;
	}

	.entry-category {
		padding: 0.125rem 0.5rem;
		background: color-mix(in srgb, var(--cat-color) 15%, transparent);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		font-weight: 600;
		color: var(--cat-color);
		text-transform: capitalize;
	}

	.entry-title {
		font-size: var(--text-body-lg);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.entry-description {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		line-height: 1.6;
		margin: 0 0 1rem;
	}

	.entry-highlights {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.entry-highlights li {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.625rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.entry-highlights li :global(svg) {
		color: var(--color-success);
	}

	/* CTA Section */
	.cta-section {
		padding: 4rem 1.5rem 6rem;
		background: var(--color-bg-surface);
	}

	.cta-content {
		max-width: 36rem;
		margin: 0 auto;
		text-align: center;
	}

	.cta-title {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
	}

	.cta-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-muted);
		margin: 0 0 2rem;
		line-height: 1.6;
	}

	.cta-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.cta-primary {
		display: inline-block;
		padding: 0.875rem 1.5rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-md);
		font-weight: 600;
		text-decoration: none;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.cta-primary:hover {
		opacity: 0.9;
	}

	.cta-secondary {
		display: inline-block;
		padding: 0.875rem 1.5rem;
		background: transparent;
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-weight: 600;
		text-decoration: none;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.cta-secondary:hover {
		border-color: var(--color-border-strong);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.hero-section {
			padding: 6rem 1rem 3rem;
		}

		.timeline {
			padding-left: 1.5rem;
		}

		.timeline-marker {
			left: -1.5rem;
		}

		.timeline::before {
			left: 0.5rem;
		}
	}

	@media (max-width: 480px) {
		.entry-highlights {
			flex-direction: column;
		}

		.cta-buttons {
			flex-direction: column;
		}

		.cta-primary,
		.cta-secondary {
			width: 100%;
		}
	}
</style>
