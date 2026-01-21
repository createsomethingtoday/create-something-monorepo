<script lang="ts">
	/**
	 * OUTERFIELDS Changelog
	 * 
	 * Development progress in Nicely Said voice:
	 * - Lead with outcomes, not announcements
	 * - Specific numbers, not vague claims
	 * - Plain language, user-focused
	 */
	import { Calendar, Check, Zap, Shield } from 'lucide-svelte';

	interface ChangelogEntry {
		date: string;
		version?: string;
		title: string;
		description: string;
		category: 'feature' | 'improvement' | 'fix' | 'security';
		highlights?: string[];
	}

	// Nicely Said: Lead with what changed for users, not what we built
	const changelog: ChangelogEntry[] = [
		{
			date: '2026-01-20',
			version: '1.4.0',
			title: 'Members set up faster now',
			description: 'New founding member preset gets you from signup to watching in under 2 minutes. Environment loads automatically.',
			category: 'feature',
			highlights: [
				'One-click member setup',
				'Auto-detect your environment',
				'Skip the configuration screens'
			]
		},
		{
			date: '2026-01-19',
			version: '1.3.0',
			title: 'iPad and tablet: no more overflow',
			description: 'Fixed horizontal scrolling issues on tablets. Navigation stays put. Videos fill the screen properly.',
			category: 'improvement',
			highlights: [
				'iPad viewport: fixed',
				'Mobile nav: no more overflow',
				'Video pages: edge-to-edge'
			]
		},
		{
			date: '2026-01-18',
			version: '1.2.1',
			title: 'Payments: better logging, security patch',
			description: 'Stripe webhooks now log persistently. Updated Wrangler to fix a security vulnerability.',
			category: 'security',
			highlights: [
				'Webhook logs persist (easier debugging)',
				'Security patch: undici vulnerability',
				'Error tracking improved'
			]
		},
		{
			date: '2026-01-17',
			version: '1.2.0',
			title: 'The platform improves itself',
			description: 'AI proposes small UX fixes. You approve or reject. Changes deploy automatically. No code required.',
			category: 'feature',
			highlights: [
				'AI spots UX issues',
				'You review every change',
				'Safe guardrails built in',
				'Rollback with one click'
			]
		},
		{
			date: '2026-01-14',
			version: '1.1.0',
			title: 'Emails that actually arrive',
			description: 'Resend integration. Branded emails from createsomething.io. New video? You get notified.',
			category: 'feature',
			highlights: [
				'Video update notifications',
				'Branded sender address',
				'Template management'
			]
		},
		{
			date: '2026-01-13',
			version: '1.0.0',
			title: 'Watch pages shipped',
			description: 'Full video experience: comments, transcripts, related videos. Investor presentations live. AI chat demo available.',
			category: 'feature',
			highlights: [
				'Comments on every video',
				'Full transcripts',
				'Related videos sidebar',
				'Investor deck: /presentations/investor',
				'AI analytics chat: try it free'
			]
		},
		{
			date: '2026-01-12',
			version: '0.9.0',
			title: 'Production launch',
			description: '$99 lifetime membership. Stripe checkout. Calendly scheduling. Netflix-style browsing.',
			category: 'feature',
			highlights: [
				'Browse like Netflix',
				'Pay once, access forever',
				'Book discovery calls',
				'Analytics dashboard preview',
				'Compare vs Patreon, Substack'
			]
		},
		{
			date: '2026-01-11',
			version: '0.8.0',
			title: 'Ask questions about your content',
			description: 'Type what you want to know. AI analyzes your video performance and suggests what to create next.',
			category: 'feature',
			highlights: [
				'Natural language queries',
				'Content strategy suggestions',
				'Real-time insights'
			]
		},
		{
			date: '2026-01-09',
			version: '0.7.0',
			title: 'AI tools connected',
			description: 'MCP server deployed. Claude can browse your analytics. Component previews work.',
			category: 'feature',
			highlights: [
				'Remote MCP server',
				'AI content strategy',
				'Live component previews'
			]
		},
		{
			date: '2026-01-08',
			version: '0.6.0',
			title: 'Foundation: videos play',
			description: '3D hero from Sketchfab. AI-generated thumbnails. Engagement heatmaps. R2 CDN delivery.',
			category: 'feature',
			highlights: [
				'3D galaxy background',
				'Flux AI thumbnails',
				'See where viewers drop off',
				'Global CDN: fast everywhere'
			]
		}
	];

	const stats = {
		totalCommits: 75,
		features: 42,
		daysActive: 13,
		price: 99
	};

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
	<title>What's New | OUTERFIELDS</title>
	<meta name="description" content="See what we shipped this week. Every update, every fix, documented." />
</svelte:head>

<main class="changelog-page">
	<section class="hero-section">
		<div class="hero-content">
			<span class="hero-badge">Building in Public</span>
			<h1 class="hero-title">What we shipped</h1>
			<p class="hero-description">
				13 days. 75+ commits. Everything documented here.
			</p>
		</div>
	</section>

	<section class="stats-section">
		<div class="stats-grid">
			<div class="stat-card">
				<span class="stat-value">{stats.daysActive}</span>
				<span class="stat-label">days building</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">{stats.totalCommits}+</span>
				<span class="stat-label">commits</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">{stats.features}</span>
				<span class="stat-label">features shipped</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">${stats.price}</span>
				<span class="stat-label">lifetime access</span>
			</div>
		</div>
	</section>

	<section class="timeline-section">
		<div class="timeline-container">
			<h2 class="section-title">The timeline</h2>
			
			<div class="timeline">
				{#each changelog as entry}
					<div class="timeline-entry">
						<div class="timeline-marker" style="--marker-color: {getCategoryColor(entry.category)}">
							{#if entry.category === 'feature'}
								<Zap size={14} />
							{:else if entry.category === 'security'}
								<Shield size={14} />
							{:else}
								<Check size={14} />
							{/if}
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
			<h2 class="cta-title">Watch it happen</h2>
			<p class="cta-description">
				$99 gets you lifetime access. See every video, every behind-the-scenes update, forever.
			</p>
			<div class="cta-buttons">
				<a href="/#pricing" class="cta-primary">Get lifetime access — $99</a>
				<a href="/presentations/investor" class="cta-secondary">Investor deck</a>
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
		margin-bottom: 0.75rem;
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
