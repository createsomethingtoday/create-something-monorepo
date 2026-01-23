<script lang="ts">
	/**
	 * OUTERFIELDS About Page
	 *
	 * Company information and PCN services overview
	 */
	import { Code, Film, Wrench, TrendingUp, Users, Calendar } from 'lucide-svelte';

	function bookDiscoveryCall() {
		window.open('https://calendly.com/outerfields/discovery-call', '_blank');
	}

	const stats = [
		{ value: '50+', label: 'Episodes Produced' },
		{ value: '3', label: 'Active Partners' },
		{ value: '$19,999', label: 'Starting Price' }
	];

	const pillars = [
		{
			icon: Code,
			title: 'Code',
			description: 'Data-driven platform development with custom integrations'
		},
		{
			icon: Film,
			title: 'Media',
			description: 'Professional content production that captures your brand'
		},
		{
			icon: Wrench,
			title: 'Build',
			description: 'Systems and infrastructure designed for scale'
		},
		{
			icon: TrendingUp,
			title: 'Sell',
			description: 'Marketing strategies that drive real growth'
		}
	];
</script>

<svelte:head>
	<title>About | OUTERFIELDS</title>
	<meta name="description" content="Learn about OUTERFIELDS - we build Private Content Networks for creators and brands." />
</svelte:head>

<main class="about-page">
	<section class="hero">
		<div class="container">
			<h1 class="hero-title">We Build Private Content Networks</h1>
			<p class="hero-subtitle">
				OUTERFIELDS is a full-service PCN creation agency. We handle the platform, production, and marketing—so you can focus on what you do best.
			</p>
		</div>
	</section>

	<section class="stats-section">
		<div class="container">
			<div class="stats-grid">
				{#each stats as stat}
					<div class="stat-card">
						<span class="stat-value">{stat.value}</span>
						<span class="stat-label">{stat.label}</span>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="pillars-section">
		<div class="container">
			<h2 class="section-title">Our Approach</h2>
			<p class="section-description">
				Code + Media + Build + Sell = Unstoppable
			</p>
			<div class="pillars-grid">
				{#each pillars as pillar}
					{@const Icon = pillar.icon}
					<div class="pillar-card">
						<div class="pillar-icon">
							<Icon size={28} />
						</div>
						<h3 class="pillar-title">{pillar.title}</h3>
						<p class="pillar-description">{pillar.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="mission-section">
		<div class="container">
			<div class="mission-content">
				<h2 class="mission-title">Why Private Content Networks?</h2>
				<p class="mission-text">
					Creators deserve to own their platform, their audience, and their revenue. Social media algorithms change, ad revenue fluctuates, and platform policies shift without warning.
				</p>
				<p class="mission-text">
					A Private Content Network puts you in control. Your brand. Your subscribers. Your business.
				</p>
				<p class="mission-text">
					We've built 50+ episodes across multiple networks, partnering with creators like SHIV Works, Velocity Health Clinic, and Good Life Network. Now we're ready to build yours.
				</p>
			</div>
		</div>
	</section>

	<section class="cta-section">
		<div class="container">
			<div class="cta-content">
				<Users size={32} />
				<h2 class="cta-title">Ready to Build Your PCN?</h2>
				<p class="cta-description">
					Book a free discovery call to discuss your project and get a custom quote.
				</p>
				<button class="cta-button" onclick={bookDiscoveryCall}>
					<Calendar size={20} />
					Book a Discovery Call
				</button>
			</div>
		</div>
	</section>
</main>

<style>
	.about-page {
		min-height: 100vh;
		background: var(--color-bg-pure);
	}

	.container {
		max-width: var(--container-max-width);
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	/* Hero */
	.hero {
		padding: 8rem 0 4rem;
		text-align: center;
	}

	.hero-title {
		font-size: clamp(2.5rem, 6vw, 4rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 1.5rem;
		line-height: 1.1;
	}

	.hero-subtitle {
		font-size: 1.25rem;
		color: var(--color-fg-muted);
		max-width: 40rem;
		margin: 0 auto;
		line-height: 1.7;
	}

	/* Stats */
	.stats-section {
		padding: 4rem 0;
		background: var(--color-bg-surface);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2rem;
	}

	.stat-card {
		text-align: center;
		padding: 2rem;
	}

	.stat-value {
		display: block;
		font-size: clamp(2.5rem, 5vw, 3.5rem);
		font-weight: 700;
		color: var(--color-sun);
		margin-bottom: 0.5rem;
	}

	.stat-label {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Pillars */
	.pillars-section {
		padding: 6rem 0;
	}

	.section-title {
		font-size: clamp(2rem, 4vw, 2.5rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		text-align: center;
		margin: 0 0 0.5rem;
	}

	.section-description {
		font-size: 1.125rem;
		color: var(--color-fg-muted);
		text-align: center;
		margin: 0 0 3rem;
	}

	.pillars-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1.5rem;
	}

	.pillar-card {
		padding: 2rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		text-align: center;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.pillar-card:hover {
		border-color: var(--color-sun);
	}

	.pillar-icon {
		width: 3.5rem;
		height: 3.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 1rem;
		background: var(--color-primary-muted);
		border-radius: 0.75rem;
		color: var(--color-sun);
	}

	.pillar-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.pillar-description {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		line-height: 1.6;
		margin: 0;
	}

	/* Mission */
	.mission-section {
		padding: 6rem 0;
		background: var(--color-bg-surface);
	}

	.mission-content {
		max-width: 48rem;
		margin: 0 auto;
	}

	.mission-title {
		font-size: clamp(1.75rem, 4vw, 2.25rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 2rem;
		text-align: center;
	}

	.mission-text {
		font-size: 1.125rem;
		color: var(--color-fg-secondary);
		line-height: 1.8;
		margin: 0 0 1.5rem;
	}

	.mission-text:last-child {
		margin-bottom: 0;
	}

	/* CTA */
	.cta-section {
		padding: 6rem 0;
	}

	.cta-content {
		max-width: 32rem;
		margin: 0 auto;
		text-align: center;
		padding: 3rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
	}

	.cta-content :global(svg:first-child) {
		color: var(--color-sun);
		margin-bottom: 1rem;
	}

	.cta-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.75rem;
	}

	.cta-description {
		font-size: 1rem;
		color: var(--color-fg-muted);
		margin: 0 0 1.5rem;
		line-height: 1.6;
	}

	.cta-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 2rem;
		background: var(--color-sun);
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 700;
		color: white;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.cta-button:hover {
		background: var(--color-primary-hover);
		transform: scale(1.02);
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.pillars-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 768px) {
		.hero {
			padding: 6rem 0 3rem;
		}

		.stats-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.stat-card {
			padding: 1.5rem;
		}

		.pillars-grid {
			grid-template-columns: 1fr;
		}

		.pillar-card {
			padding: 1.5rem;
		}

		.cta-content {
			padding: 2rem;
		}
	}
</style>
