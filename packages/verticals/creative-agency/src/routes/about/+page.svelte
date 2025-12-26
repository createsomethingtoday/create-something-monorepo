<script lang="ts">
	import { config } from '$lib/config/runtime';
	import SEOHead from '$lib/components/SEOHead.svelte';
</script>

<SEOHead title="About" description="{$config.description}" />

<!-- Hero -->
<section class="hero">
	<div class="hero-content">
		<h1 class="hero-title">About Us</h1>
		<p class="hero-description">
			{$config.description}
		</p>
	</div>
</section>

<!-- Stats -->
<section class="stats section">
	<div class="stats-grid">
		{#each $config.stats as stat}
			<div class="stat">
				<span class="stat-number">{stat.number}</span>
				<span class="stat-label">{stat.label}</span>
			</div>
		{/each}
	</div>
</section>

<!-- Philosophy -->
<section class="philosophy section">
	<div class="philosophy-content">
		<h2 class="philosophy-title">Our Approach</h2>
		<p class="philosophy-text">
			We believe great brands are built on strategy, not trends. Every decision we make—from
			positioning to pixel—is rooted in a deep understanding of your business, your customers,
			and your category.
		</p>
		<p class="philosophy-text">
			We're small by design. Every project gets our full attention. You work directly with
			senior talent who understand the stakes and deliver work that moves the needle.
		</p>
	</div>
</section>

<!-- Team -->
<section class="team section">
	<div class="section-header">
		<h2 class="section-title">The Team</h2>
	</div>

	<div class="team-grid">
		{#each $config.team as member}
			<div class="team-member">
				<div class="member-image">
					<img src={member.image} alt={member.name} loading="lazy" />
				</div>
				<div class="member-info">
					<h3 class="member-name">{member.name}</h3>
					<p class="member-role">{member.role}</p>
					<p class="member-bio">{member.bio}</p>
				</div>
			</div>
		{/each}
	</div>
</section>

<!-- Clients -->
<section class="clients section">
	<p class="clients-label">Clients we've worked with</p>
	<div class="clients-grid">
		{#each $config.clients as client}
			<span class="client-name">{client}</span>
		{/each}
	</div>
</section>

<!-- CTA -->
<section class="cta section">
	<div class="cta-content">
		<h2 class="cta-title">Let's work together</h2>
		<p class="cta-description">
			We take on a limited number of projects each year. If you're ready to invest in your
			brand, we'd love to hear from you.
		</p>
		<a href="/contact" class="btn-primary btn-lg">Start a Project</a>
	</div>
</section>

<style>
	/* Hero */
	.hero {
		padding: var(--space-3xl) var(--gutter) var(--space-2xl);
	}

	.hero-content {
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.hero-title {
		font-size: var(--text-display);
		font-weight: 700;
		letter-spacing: var(--tracking-tight);
		margin-bottom: var(--space-md);
	}

	.hero-description {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
		max-width: 50ch;
		line-height: var(--leading-relaxed);
	}

	/* Stats */
	.stats {
		border-top: 1px solid var(--color-border-default);
		border-bottom: 1px solid var(--color-border-default);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-xl);
		max-width: var(--content-width);
		margin: 0 auto;
		text-align: center;
	}

	.stat-number {
		font-size: var(--text-display);
		font-weight: 700;
		display: block;
	}

	.stat-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Philosophy */
	.philosophy-content {
		max-width: var(--content-narrow);
		margin: 0 auto;
	}

	.philosophy-title {
		font-size: var(--text-h2);
		font-weight: 600;
		margin-bottom: var(--space-lg);
	}

	.philosophy-text {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-md);
	}

	/* Team */
	.section-header {
		max-width: var(--content-width);
		margin: 0 auto var(--space-xl);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 600;
	}

	.team-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-xl);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.team-member {
		display: flex;
		gap: var(--space-lg);
	}

	.member-image {
		width: 200px;
		height: 200px;
		flex-shrink: 0;
		overflow: hidden;
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
	}

	.member-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.member-name {
		font-size: var(--text-h3);
		font-weight: 600;
		margin-bottom: var(--space-xs);
	}

	.member-role {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.member-bio {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* Clients */
	.clients {
		text-align: center;
		background: var(--color-bg-surface);
	}

	.clients-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		margin-bottom: var(--space-lg);
	}

	.clients-grid {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: var(--space-xl);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.client-name {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-muted);
	}

	/* CTA */
	.cta {
		text-align: center;
	}

	.cta-content {
		max-width: var(--content-narrow);
		margin: 0 auto;
	}

	.cta-title {
		font-size: var(--text-h1);
		margin-bottom: var(--space-sm);
	}

	.cta-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.team-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.team-member {
			flex-direction: column;
		}

		.member-image {
			width: 100%;
			height: 250px;
		}
	}
</style>
