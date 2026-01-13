<script lang="ts">
	/**
	 * OUTERFIELDS Investor Presentation
	 *
	 * Designed for investors and partners.
	 */
	import Presentation from '$lib/components/Presentation.svelte';
	import Slide from '$lib/components/Slide.svelte';
	import AIAnalytics from '$lib/components/AIAnalytics.svelte';
	import AnalyticsDashboard from '$lib/components/AnalyticsDashboard.svelte';
</script>

<svelte:head>
	<title>OUTERFIELDS | Investor Presentation</title>
	<meta name="description" content="OUTERFIELDS - Investor pitch deck." />
	<meta name="robots" content="noindex" />
</svelte:head>

<Presentation title="OUTERFIELDS" subtitle="Premium Content Network">
	<Slide type="title">
		<span class="number">01</span>
		<div class="logo">∞</div>
		<h1>OUTERFIELDS</h1>
		<p class="subtitle">Premium Content Network</p>
		<p class="tagline">A modern platform for premium content + community</p>
	</Slide>

	<Slide type="content">
		<span class="number">02</span>
		<h2>The Problem</h2>
		<p>
			Creators and brands build audiences on <span class="highlight">rented platforms</span>.
		</p>
		<ul>
			<li>Monetization rules change without warning</li>
			<li>Your reach is gated by algorithms you don’t control</li>
			<li>Subscriber relationships are indirect</li>
			<li>Analytics are fragmented across tools</li>
		</ul>
	</Slide>

	<Slide type="content">
		<span class="number">03</span>
		<h2>The Pattern</h2>
		<p>
			This isn’t a niche problem. Any creator with content + community eventually wants:
			<span class="highlight">ownership</span>.
		</p>
		<ul>
			<li>A Netflix-style viewing experience</li>
			<li>Direct subscriptions and member gating</li>
			<li>Unified analytics + clear next actions</li>
			<li>A premium destination that feels finished</li>
		</ul>
	</Slide>

	<Slide type="content">
		<span class="number">04</span>
		<h2>The Solution: OUTERFIELDS</h2>
		<p>
			A <span class="highlight">premium content network</span> you control—content, membership, and analytics
			in one place.
		</p>
		<ul>
			<li>Netflix-style browsing + playback</li>
			<li>Membership gating (free preview + paid library)</li>
			<li>Built-in AI analytics assistant</li>
			<li>Direct-to-fan monetization and retention tooling</li>
		</ul>
	</Slide>

	<Slide type="image">
		<span class="number">05</span>
		<div class="product-preview">
			<div class="preview-card">
				<div class="preview-header">
					<span class="preview-logo">∞</span>
					<span>OUTERFIELDS</span>
				</div>
				<div class="preview-content">
					<div class="preview-hero">Premium Content, No Compromises</div>
					<div class="preview-grid">
						<div class="preview-item"></div>
						<div class="preview-item"></div>
						<div class="preview-item"></div>
						<div class="preview-item"></div>
					</div>
				</div>
			</div>
		</div>
		<p class="caption">
			Live demo:
			<a href="https://outerfields.createsomething.agency" target="_blank">outerfields.createsomething.agency</a>
		</p>
	</Slide>

	<Slide type="image">
		<span class="number">06</span>
		<div class="embed">
			<AIAnalytics forceUnlocked interactive={false} />
		</div>
		<p class="caption">AI reads your analytics and turns it into clear next actions.</p>
	</Slide>

	<Slide type="image">
		<span class="number">07</span>
		<div class="embed">
			<AnalyticsDashboard forceUnlocked interactive={false} />
		</div>
		<p class="caption">One dashboard: engagement, social metrics, and project progress.</p>
	</Slide>

	<Slide type="split">
		<span class="number">08</span>
		<div class="left">
			<h2>Founding Members</h2>
			<p><span class="brand">$99</span> one-time payment</p>
			<p>Lifetime access to all content, analytics, and exclusives.</p>
			<p class="muted">30-day money-back guarantee</p>
		</div>
		<div class="divider"></div>
		<div class="right">
			<h2>Future: Creator Revenue Share</h2>
			<p>Creators earn from subscriptions</p>
			<p>Platform takes 15% (vs. 30-50% on others)</p>
			<p class="muted">Aligned incentives</p>
		</div>
	</Slide>

	<Slide type="stat">
		<span class="number">09</span>
		<div class="stat-value">50+</div>
		<div class="stat-label">Premium videos at launch</div>
		<div class="stat-context">
			Multiple categories. Full catalog gating. Built to feel like a finished network, not a prototype.
		</div>
	</Slide>

	<Slide type="content">
		<span class="number">10</span>
		<h2>Technology Stack</h2>
		<p>
			Built on <span class="highlight">Cloudflare’s edge infrastructure</span> for global performance.
		</p>
		<ul>
			<li>Sub-50ms video delivery worldwide (R2 + CDN)</li>
			<li>AI-powered engagement analytics (Workers AI)</li>
			<li>Zero-downtime deployments (Cloudflare Pages)</li>
			<li>Scales automatically—no DevOps overhead</li>
		</ul>
	</Slide>

	<Slide type="content">
		<span class="number">11</span>
		<h2>Why OUTERFIELDS Wins</h2>
		<ul>
			<li><span class="em">A finished destination</span> (not a collection of links)</li>
			<li><span class="em">Creator-aligned</span> revenue model (85% to creators)</li>
			<li><span class="em">AI-native</span> analytics and next-action guidance</li>
			<li><span class="em">Loyal audience</span> that pays and stays</li>
			<li><span class="em">Infrastructure that disappears</span> (fast, global, low-ops)</li>
		</ul>
	</Slide>

	<Slide type="content">
		<span class="number">12</span>
		<h2>Roadmap</h2>
		<ul>
			<li><span class="em">Now:</span> Founding member launch</li>
			<li><span class="em">Next:</span> Creator portal + revenue share</li>
			<li><span class="em">Then:</span> Mobile apps (iOS/Android)</li>
			<li><span class="em">Later:</span> Live events + commerce</li>
		</ul>
	</Slide>

	<Slide type="content">
		<span class="number">13</span>
		<h2>The Ask</h2>
		<p>
			We’re raising a <span class="highlight">seed round</span> to accelerate growth.
		</p>
		<ul>
			<li>Creator acquisition + content licensing</li>
			<li>Mobile app development</li>
			<li>Marketing and distribution</li>
			<li>Team expansion (engineering + content)</li>
		</ul>
	</Slide>

	<Slide type="title">
		<span class="number">14</span>
		<div class="logo">∞</div>
		<h1>OUTERFIELDS</h1>
		<p class="subtitle">Premium Content Network</p>
		<p class="tagline">
			<a href="https://outerfields.createsomething.agency" class="cta-link">outerfields.createsomething.agency</a>
		</p>
	</Slide>
</Presentation>

<style>
	/* Product Preview Card (kept local for deck styling parity) */
	.product-preview {
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
	}

	.preview-card {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg, 1rem);
		overflow: hidden;
	}

	.preview-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--color-border-default);
		font-weight: 600;
		font-size: 0.875rem;
	}

	.preview-logo {
		font-size: 1.25rem;
	}

	.preview-content {
		padding: 2rem;
	}

	.preview-hero {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.preview-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
	}

	.preview-item {
		aspect-ratio: 16/9;
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm, 0.5rem);
	}

	.caption a {
		color: var(--color-brand, #7c2bee);
		text-decoration: none;
	}

	.caption a:hover {
		text-decoration: underline;
	}

	:global(.cta-link) {
		color: var(--color-brand, #7c2bee) !important;
		text-decoration: none;
		font-weight: 500;
	}

	:global(.cta-link:hover) {
		text-decoration: underline;
	}

	@media (max-width: 640px) {
		.preview-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	/* Presentation embeds: make full-page sections compact inside slides */
	.embed :global(section) {
		padding: 0 !important;
	}

	.embed :global(.section-header) {
		margin-bottom: 1.5rem !important;
	}

	.embed :global(.ai-analytics-container),
	.embed :global(.analytics-container) {
		max-width: 100% !important;
	}
</style>

