<script lang="ts">
	/**
	 * Home Page - Restaurant (Premium)
	 *
	 * Philosophy: The interface recedes; the dining experience emerges.
	 * Zuhandenheit applied to hospitality—atmosphere over information.
	 *
	 * Journey through the dining experience:
	 * 1. Hero: Full-bleed atmosphere with subtle reveal
	 * 2. Philosophy: Centered statement (the "why")
	 * 3. Menu Highlights: Visual feast with purposeful motion
	 * 4. Hours & Location: Practical elegance
	 * 5. Reservation CTA: Invitation, not transaction
	 * 6. About: Chef and story
	 */

	import { siteConfig } from '$lib/config/context';
	import { onMount } from 'svelte';

	let heroVisible = $state(false);
	let sectionsRevealed = $state(false);

	onMount(() => {
		// Stagger hero reveal
		requestAnimationFrame(() => {
			heroVisible = true;
		});
		// Reveal sections after hero settles
		setTimeout(() => {
			sectionsRevealed = true;
		}, 800);
	});
</script>

<svelte:head>
	<title>{$siteConfig.name} - {$siteConfig.tagline}</title>
	<meta name="description" content={$siteConfig.description} />
</svelte:head>

<main class="home">
	<!-- Hero Section: Full-bleed atmosphere -->
	<section class="hero" class:visible={heroVisible}>
		<div class="hero-image-wrapper">
			<img src={$siteConfig.hero.image} alt={$siteConfig.hero.alt} class="hero-image" />
			<div class="hero-vignette"></div>
		</div>

		<!-- Minimal overlay content: name reveals atmosphere, doesn't compete -->
		<div class="hero-content">
			<span class="hero-eyebrow">{$siteConfig.tagline}</span>
			<h1 class="hero-title">{$siteConfig.name}</h1>
		</div>

		<!-- Scroll indicator: subtle invitation -->
		<div class="scroll-indicator" aria-hidden="true">
			<span class="scroll-line"></span>
		</div>
	</section>

	<!-- Philosophy: The "why" before the "what" -->
	<section class="philosophy section" class:revealed={sectionsRevealed}>
		<blockquote class="philosophy-quote">
			"{$siteConfig.description}"
		</blockquote>
	</section>

	<!-- Menu Highlights: Visual feast with staggered reveals -->
	<section class="section menu-highlights" class:revealed={sectionsRevealed}>
		<div class="container">
			<header class="section-header">
				<span class="section-eyebrow">The Menu</span>
				<h2 class="section-title">Seasonal Highlights</h2>
			</header>

			<div class="menu-grid">
				{#each $siteConfig.featuredDishes as dish, i}
					<article class="dish-card" style="--delay: {i * 100}ms">
						<div class="dish-image-wrapper">
							<img src={dish.image} alt={dish.name} class="dish-image" loading="lazy" />
						</div>
						<div class="dish-content">
							<div class="dish-header">
								<h3 class="dish-name">{dish.name}</h3>
								<span class="dish-price">{dish.price}</span>
							</div>
							<p class="dish-description">{dish.description}</p>
							{#if dish.dietary && dish.dietary.length > 0}
								<div class="dish-dietary">
									{#each dish.dietary as diet}
										<span class="dietary-badge">{diet}</span>
									{/each}
								</div>
							{/if}
						</div>
					</article>
				{/each}
			</div>

			<div class="menu-cta">
				<a href="/menu" class="cta-text">View Full Menu →</a>
			</div>
		</div>
	</section>

	<!-- Reservation CTA: Invitation, not transaction -->
	<section class="section reservation-cta" class:revealed={sectionsRevealed}>
		<div class="container">
			<div class="reservation-content">
				<span class="section-eyebrow">Join Us</span>
				<h2 class="reservation-title">Reserve Your Experience</h2>
				<p class="reservation-note">{$siteConfig.reservations.note}</p>
				<div class="reservation-actions">
					{#if $siteConfig.reservations.enabled && $siteConfig.reservations.url}
						<a href={$siteConfig.reservations.url} target="_blank" rel="noopener noreferrer" class="cta-primary">
							Reserve a Table
						</a>
					{/if}
					<a href="tel:{$siteConfig.reservations.phone}" class="cta-text">
						{$siteConfig.reservations.phone}
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Practical: Hours & Location in a refined grid -->
	<section class="section practical" class:revealed={sectionsRevealed}>
		<div class="container">
			<div class="practical-grid">
				<!-- Hours -->
				<div class="practical-block">
					<h3 class="practical-title">Hours</h3>
					<dl class="hours-list">
						{#each Object.entries($siteConfig.hours) as [day, hours]}
							<div class="hours-row">
								<dt class="day-label">{day}</dt>
								<dd class="hours-value">{hours}</dd>
							</div>
						{/each}
					</dl>
				</div>

				<!-- Location -->
				<div class="practical-block">
					<h3 class="practical-title">Location</h3>
					<address class="location-address">
						{$siteConfig.address.street}<br />
						{$siteConfig.address.city}, {$siteConfig.address.state} {$siteConfig.address.zip}
					</address>
					<p class="location-neighborhood">{$siteConfig.location.neighborhood}</p>
				</div>

				<!-- Contact -->
				<div class="practical-block">
					<h3 class="practical-title">Contact</h3>
					<div class="contact-links">
						<a href="tel:{$siteConfig.phone}" class="contact-link">{$siteConfig.phone}</a>
						<a href="mailto:{$siteConfig.email}" class="contact-link">{$siteConfig.email}</a>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Chef & Story: The human element -->
	{#if $siteConfig.team && $siteConfig.team.length > 0}
		<section class="section chef-section" class:revealed={sectionsRevealed}>
			<div class="container">
				<div class="chef-grid">
					<div class="chef-image-wrapper">
						<img src={$siteConfig.team[0].image} alt={$siteConfig.team[0].name} class="chef-image" loading="lazy" />
					</div>
					<div class="chef-content">
						<span class="section-eyebrow">The Chef</span>
						<h2 class="chef-name">{$siteConfig.team[0].name}</h2>
						<p class="chef-role">{$siteConfig.team[0].role}</p>
						<p class="chef-bio">{$siteConfig.team[0].bio}</p>
						<a href="/about" class="cta-text">Our Story →</a>
					</div>
				</div>
			</div>
		</section>
	{/if}

	<!-- Recognition: Subtle footer element -->
	{#if $siteConfig.accolades && $siteConfig.accolades.length > 0}
		<section class="section recognition" class:revealed={sectionsRevealed}>
			<div class="container">
				<div class="recognition-list">
					{#each $siteConfig.accolades as accolade}
						<span class="recognition-item">
							{accolade.title} — {accolade.organization}, {accolade.year}
						</span>
					{/each}
				</div>
			</div>
		</section>
	{/if}
</main>

<style>
	/* ==========================================================================
	   Restaurant Template - Awwwards Quality
	   Philosophy: The interface recedes; the dining experience emerges.
	   ========================================================================== */

	.home {
		background: var(--color-bg-pure);
	}

	/* ==========================================================================
	   Hero: Full-bleed atmospheric immersion
	   ========================================================================== */

	.hero {
		position: relative;
		height: 100vh;
		height: 100dvh;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		overflow: hidden;
	}

	.hero-image-wrapper {
		position: absolute;
		inset: 0;
	}

	.hero-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		transform: scale(1.05);
		transition:
			opacity 1.8s var(--ease-decelerate),
			transform 2.5s var(--ease-decelerate);
	}

	.hero.visible .hero-image {
		opacity: 1;
		transform: scale(1);
	}

	/* Subtle vignette instead of heavy overlay */
	.hero-vignette {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(ellipse at center, transparent 40%, var(--color-bg-pure) 100%),
			linear-gradient(to top, var(--color-bg-pure) 0%, transparent 40%);
		pointer-events: none;
	}

	.hero-content {
		position: relative;
		z-index: 1;
		text-align: center;
		padding: var(--space-3xl) var(--space-lg);
		opacity: 0;
		transform: translateY(30px);
		transition:
			opacity 1s var(--ease-decelerate) 0.8s,
			transform 1s var(--ease-decelerate) 0.8s;
	}

	.hero.visible .hero-content {
		opacity: 1;
		transform: translateY(0);
	}

	.hero-eyebrow {
		display: block;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.2em;
		margin-bottom: var(--space-sm);
	}

	.hero-title {
		font-size: var(--text-display-xl);
		font-weight: 300;
		color: var(--color-fg-primary);
		letter-spacing: -0.02em;
		margin: 0;
	}

	/* Scroll indicator */
	.scroll-indicator {
		position: absolute;
		bottom: var(--space-xl);
		left: 50%;
		transform: translateX(-50%);
		opacity: 0;
		transition: opacity 0.8s var(--ease-decelerate) 2s;
	}

	.hero.visible .scroll-indicator {
		opacity: 0.5;
	}

	.scroll-line {
		display: block;
		width: 1px;
		height: var(--space-lg);
		background: linear-gradient(to bottom, var(--color-fg-primary), transparent);
		animation: scroll-pulse 2.5s var(--ease-standard) infinite;
	}

	@keyframes scroll-pulse {
		0%, 100% { opacity: 0.3; transform: scaleY(1); }
		50% { opacity: 0.8; transform: scaleY(1.3); }
	}

	/* ==========================================================================
	   Philosophy: Centered contemplative statement
	   ========================================================================== */

	.philosophy {
		padding: var(--space-3xl) var(--space-lg);
		opacity: 0;
		transform: translateY(40px);
		transition:
			opacity 0.8s var(--ease-decelerate),
			transform 0.8s var(--ease-decelerate);
	}

	.philosophy.revealed {
		opacity: 1;
		transform: translateY(0);
	}

	.philosophy-quote {
		max-width: 50ch;
		margin: 0 auto;
		font-size: var(--text-h2);
		font-weight: 300;
		font-style: italic;
		color: var(--color-fg-secondary);
		text-align: center;
		line-height: var(--leading-relaxed);
	}

	/* ==========================================================================
	   Shared Section Styles
	   ========================================================================== */

	.section {
		padding: var(--space-3xl) var(--space-lg);
	}

	.section.revealed {
		/* Child elements animate individually */
	}

	.container {
		max-width: var(--width-content);
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-2xl);
	}

	.section-eyebrow {
		display: block;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		margin-bottom: var(--space-xs);
	}

	.section-title {
		font-size: var(--text-h1);
		font-weight: 300;
		color: var(--color-fg-primary);
		margin: 0;
	}

	/* ==========================================================================
	   Menu Highlights: Staggered visual feast
	   ========================================================================== */

	.menu-highlights {
		background: var(--color-bg-elevated);
	}

	.menu-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-md);
	}

	.dish-card {
		overflow: hidden;
		opacity: 0;
		transform: translateY(30px);
		transition:
			opacity 0.6s var(--ease-decelerate),
			transform 0.6s var(--ease-decelerate);
		transition-delay: var(--delay, 0ms);
	}

	.menu-highlights.revealed .dish-card {
		opacity: 1;
		transform: translateY(0);
	}

	.dish-image-wrapper {
		aspect-ratio: 4/3;
		overflow: hidden;
		margin-bottom: var(--space-md);
	}

	.dish-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--duration-complex) var(--ease-decelerate);
	}

	.dish-card:hover .dish-image {
		transform: scale(1.03);
	}

	.dish-content {
		/* No padding - let typography breathe */
	}

	.dish-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--space-xs);
	}

	.dish-name {
		font-size: var(--text-body-lg);
		font-weight: 500;
		color: var(--color-fg-primary);
	}

	.dish-price {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
	}

	.dish-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-sm);
	}

	.dish-dietary {
		display: flex;
		gap: var(--space-xs);
	}

	.dietary-badge {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: lowercase;
	}

	.dietary-badge:not(:last-child)::after {
		content: '·';
		margin-left: var(--space-xs);
	}

	.menu-cta {
		text-align: center;
		margin-top: var(--space-2xl);
	}

	/* ==========================================================================
	   Reservation CTA: Invitation, not transaction
	   ========================================================================== */

	.reservation-cta {
		text-align: center;
		background: var(--color-bg-surface);
		opacity: 0;
		transform: translateY(30px);
		transition:
			opacity 0.6s var(--ease-decelerate),
			transform 0.6s var(--ease-decelerate);
	}

	.reservation-cta.revealed {
		opacity: 1;
		transform: translateY(0);
	}

	.reservation-content {
		max-width: 600px;
		margin: 0 auto;
	}

	.reservation-title {
		font-size: var(--text-display);
		font-weight: 300;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.reservation-note {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xl);
	}

	.reservation-actions {
		display: flex;
		gap: var(--space-lg);
		justify-content: center;
		align-items: center;
	}

	/* ==========================================================================
	   Practical: Hours, Location, Contact
	   ========================================================================== */

	.practical {
		border-top: 1px solid var(--color-border-default);
		opacity: 0;
		transition: opacity 0.6s var(--ease-decelerate);
	}

	.practical.revealed {
		opacity: 1;
	}

	.practical-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-2xl);
	}

	.practical-block {
		/* Minimal container */
	}

	.practical-title {
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-md);
	}

	.hours-list {
		margin: 0;
		padding: 0;
	}

	.hours-row {
		display: flex;
		justify-content: space-between;
		padding: var(--space-xs) 0;
	}

	.day-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-transform: capitalize;
	}

	.hours-value {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.location-address {
		font-style: normal;
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-sm);
	}

	.location-neighborhood {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.contact-links {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.contact-link {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.contact-link:hover {
		color: var(--color-fg-primary);
	}

	/* ==========================================================================
	   Chef Section: The human element
	   ========================================================================== */

	.chef-section {
		opacity: 0;
		transform: translateY(30px);
		transition:
			opacity 0.6s var(--ease-decelerate),
			transform 0.6s var(--ease-decelerate);
	}

	.chef-section.revealed {
		opacity: 1;
		transform: translateY(0);
	}

	.chef-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-2xl);
		align-items: center;
	}

	.chef-image-wrapper {
		aspect-ratio: 4/5;
		overflow: hidden;
	}

	.chef-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.chef-content {
		/* Let typography speak */
	}

	.chef-name {
		font-size: var(--text-h1);
		font-weight: 300;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.chef-role {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-lg);
	}

	.chef-bio {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-lg);
	}

	/* ==========================================================================
	   Recognition: Subtle footer
	   ========================================================================== */

	.recognition {
		border-top: 1px solid var(--color-border-default);
		padding: var(--space-xl) var(--space-lg);
		opacity: 0;
		transition: opacity 0.6s var(--ease-decelerate);
	}

	.recognition.revealed {
		opacity: 1;
	}

	.recognition-list {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: var(--space-lg);
	}

	.recognition-item {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* ==========================================================================
	   CTA Styles
	   ========================================================================== */

	.cta-primary {
		display: inline-block;
		padding: var(--space-sm) var(--space-xl);
		font-size: var(--text-body);
		font-weight: 500;
		color: var(--color-bg-pure);
		background: var(--color-fg-primary);
		border-radius: 0;
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.cta-primary:hover {
		background: var(--color-fg-secondary);
	}

	.cta-text {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.cta-text:hover {
		color: var(--color-fg-primary);
	}

	/* ==========================================================================
	   Responsive
	   ========================================================================== */

	@media (max-width: 1024px) {
		.menu-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.practical-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.chef-grid {
			grid-template-columns: 1fr;
			gap: var(--space-xl);
		}
	}

	@media (max-width: 640px) {
		.hero-title {
			font-size: var(--text-display);
		}

		.menu-grid,
		.practical-grid {
			grid-template-columns: 1fr;
		}

		.reservation-actions {
			flex-direction: column;
		}
	}

	/* ==========================================================================
	   Reduced Motion
	   ========================================================================== */

	@media (prefers-reduced-motion: reduce) {
		.hero-image {
			opacity: 1;
			transform: none;
			transition: none;
		}

		.hero-content,
		.scroll-indicator,
		.philosophy,
		.dish-card,
		.reservation-cta,
		.practical,
		.chef-section,
		.recognition {
			opacity: 1;
			transform: none;
			transition: none;
		}

		.scroll-line {
			animation: none;
		}

		.dish-image {
			transition: none;
		}
	}
</style>
