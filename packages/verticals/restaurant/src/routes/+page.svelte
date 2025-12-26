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
				<!-- Hours - Full width on its own row -->
				<div class="practical-block hours-block">
					<h3 class="practical-title">Hours</h3>
					<div class="hours-grid">
						{#each Object.entries($siteConfig.hours) as [day, hours]}
							<div class="hours-item" class:closed={hours === 'Closed'}>
								<span class="day-name">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
								{#if hours === 'Closed'}
									<span class="hours-closed">Closed</span>
								{:else}
									<div class="hours-detail">
										{#each hours.split(', ') as period}
											<span class="hours-period">{period}</span>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- Location & Contact side by side -->
				<div class="practical-block location-block">
					<h3 class="practical-title">Find Us</h3>
					<address class="location-address">
						<span class="address-line">{$siteConfig.address.street}</span>
						<span class="address-line">{$siteConfig.address.city}, {$siteConfig.address.state} {$siteConfig.address.zip}</span>
					</address>
					<p class="location-neighborhood">{$siteConfig.location.neighborhood}</p>
					{#if $siteConfig.location.parking}
						<div class="parking-info">
							<span class="parking-label">Parking</span>
							<ul class="parking-list">
								{#each $siteConfig.location.parking as option}
									<li>{option}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>

				<div class="practical-block contact-block">
					<h3 class="practical-title">Contact</h3>
					<div class="contact-links">
						<a href="tel:{$siteConfig.phone}" class="contact-link">
							<svg class="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
							</svg>
							<span>{$siteConfig.phone}</span>
						</a>
						<a href="mailto:{$siteConfig.email}" class="contact-link">
							<svg class="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
							</svg>
							<span>{$siteConfig.email}</span>
						</a>
					</div>
					{#if $siteConfig.social}
						<div class="social-links">
							{#if $siteConfig.social.instagram}
								<a href={$siteConfig.social.instagram} target="_blank" rel="noopener" class="social-link" aria-label="Instagram">
									<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
								</a>
							{/if}
							{#if $siteConfig.social.facebook}
								<a href={$siteConfig.social.facebook} target="_blank" rel="noopener" class="social-link" aria-label="Facebook">
									<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
								</a>
							{/if}
						</div>
					{/if}
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
	   Practical: Hours, Location, Contact - Redesigned
	   ========================================================================== */

	.practical {
		border-top: 1px solid var(--color-border-default);
		background: var(--color-bg-elevated);
		opacity: 0;
		transition: opacity 0.6s var(--ease-decelerate);
	}

	.practical.revealed {
		opacity: 1;
	}

	.practical-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-xl);
	}

	.practical-block {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.practical-title {
		font-size: var(--text-caption);
		font-weight: 600;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		margin-bottom: var(--space-md);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	/* Hours Grid - 7 columns for days */
	.hours-block {
		grid-column: 1 / -1;
	}

	.hours-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: var(--space-sm);
	}

	.hours-item {
		text-align: center;
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		background: var(--color-bg-elevated);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.hours-item:hover {
		background: var(--color-hover);
	}

	.hours-item.closed {
		opacity: 0.5;
	}

	.day-name {
		display: block;
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.hours-closed {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.hours-detail {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.hours-period {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		line-height: 1.4;
	}

	/* Location & Contact side by side */
	@media (min-width: 768px) {
		.practical-grid {
			grid-template-columns: 1fr 1fr;
		}

		.hours-block {
			grid-column: 1 / -1;
		}
	}

	.location-address {
		font-style: normal;
		margin-bottom: var(--space-sm);
	}

	.address-line {
		display: block;
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		line-height: var(--leading-relaxed);
	}

	.location-neighborhood {
		display: inline-block;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-elevated);
		padding: 4px 10px;
		border-radius: var(--radius-sm);
		margin: 0 0 var(--space-md);
	}

	.parking-info {
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.parking-label {
		display: block;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-xs);
	}

	.parking-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.parking-list li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		padding: 4px 0;
	}

	.contact-links {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.contact-link {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		text-decoration: none;
		padding: var(--space-sm);
		margin: calc(-1 * var(--space-sm));
		border-radius: var(--radius-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.contact-link:hover {
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	.contact-icon {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		opacity: 0.6;
	}

	.social-links {
		display: flex;
		gap: var(--space-sm);
		margin-top: var(--space-lg);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.social-link {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-md);
		background: var(--color-bg-elevated);
		color: var(--color-fg-muted);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.social-link:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.social-link svg {
		width: 18px;
		height: 18px;
	}

	/* Mobile: Stack hours vertically */
	@media (max-width: 767px) {
		.hours-grid {
			grid-template-columns: 1fr;
			gap: var(--space-xs);
		}

		.hours-item {
			display: flex;
			justify-content: space-between;
			align-items: center;
			text-align: left;
			padding: var(--space-sm) var(--space-md);
		}

		.day-name {
			margin-bottom: 0;
		}

		.hours-detail {
			flex-direction: row;
			gap: var(--space-sm);
			text-align: right;
		}

		.hours-period {
			white-space: nowrap;
		}
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
