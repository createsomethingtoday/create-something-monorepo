<script lang="ts">
	/**
	 * Home Page - Restaurant
	 *
	 * Journey through the dining experience:
	 * 1. Hero: Atmosphere and identity
	 * 2. Menu Highlights: Taste and offerings
	 * 3. Hours & Location: Practical information
	 * 4. Reservation CTA: Easy booking
	 * 5. About: Philosophy and story
	 */

	import { siteConfig } from '$lib/config/context';
</script>

<svelte:head>
	<title>{$siteConfig.name} - {$siteConfig.tagline}</title>
	<meta name="description" content={$siteConfig.description} />
</svelte:head>

<main class="home">
	<!-- Hero Section -->
	<section class="hero">
		<div class="hero-image-wrapper">
			<img src={$siteConfig.hero.image} alt={$siteConfig.hero.alt} class="hero-image" />
			<div class="hero-overlay"></div>
		</div>
		<div class="hero-content">
			<h1 class="hero-title">{$siteConfig.name}</h1>
			<p class="hero-tagline">{$siteConfig.tagline}</p>
			<p class="hero-description">{$siteConfig.description}</p>
			<div class="hero-cta">
				<a href="/reservations" class="cta-primary">Make a Reservation</a>
				<a href="/menu" class="cta-secondary">View Menu</a>
			</div>
		</div>
	</section>

	<!-- Menu Highlights -->
	<section class="section menu-highlights">
		<div class="container">
			<div class="section-header">
				<h2 class="section-title">Featured Dishes</h2>
				<p class="section-subtitle">Seasonal ingredients, expertly prepared</p>
			</div>
			<div class="menu-grid">
				{#each $siteConfig.featuredDishes as dish}
					<div class="dish-card">
						<div class="dish-image-wrapper">
							<img src={dish.image} alt={dish.name} class="dish-image" />
						</div>
						<div class="dish-content">
							<div class="dish-header">
								<h3 class="dish-name">{dish.name}</h3>
								<span class="dish-price">${dish.price}</span>
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
					</div>
				{/each}
			</div>
			<div class="menu-cta">
				<a href="/menu" class="cta-secondary">View Full Menu</a>
			</div>
		</div>
	</section>

	<!-- Hours & Location -->
	<section class="section hours-location">
		<div class="container">
			<div class="info-grid">
				<!-- Hours -->
				<div class="info-card">
					<h3 class="info-title">Hours</h3>
					<div class="hours-list">
						{#each Object.entries($siteConfig.hours) as [day, hours]}
							<div class="hours-row">
								<span class="day-label">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
								<span class="hours-value">{hours}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Location -->
				<div class="info-card">
					<h3 class="info-title">Location</h3>
					<div class="location-content">
						<p class="location-address">
							{$siteConfig.address.street}<br />
							{$siteConfig.address.city}, {$siteConfig.address.state} {$siteConfig.address.zip}
						</p>
						<div class="location-details">
							<p class="location-neighborhood">{$siteConfig.location.neighborhood}</p>
							{#if $siteConfig.location.landmarks && $siteConfig.location.landmarks.length > 0}
								<ul class="location-landmarks">
									{#each $siteConfig.location.landmarks as landmark}
										<li>{landmark}</li>
									{/each}
								</ul>
							{/if}
						</div>
						<div class="location-contact">
							<p><a href="tel:{$siteConfig.phone}">{$siteConfig.phone}</a></p>
							<p><a href="mailto:{$siteConfig.email}">{$siteConfig.email}</a></p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Reservation CTA -->
	<section class="section reservation-cta">
		<div class="container">
			<div class="cta-content">
				<h2 class="cta-title">Reserve Your Table</h2>
				<p class="cta-text">{$siteConfig.reservations.note}</p>
				<div class="cta-actions">
					{#if $siteConfig.reservations.enabled && $siteConfig.reservations.url}
						<a href={$siteConfig.reservations.url} target="_blank" rel="noopener noreferrer" class="cta-primary">
							Book on {$siteConfig.reservations.provider}
						</a>
					{/if}
					<a href="tel:{$siteConfig.reservations.phone}" class="cta-secondary">
						Call {$siteConfig.reservations.phone}
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- About Teaser -->
	<section class="section about-teaser">
		<div class="container">
			<div class="about-grid">
				<div class="about-content">
					<h2 class="about-title">Our Philosophy</h2>
					<p class="about-text">{$siteConfig.description}</p>
					{#if $siteConfig.team && $siteConfig.team.length > 0}
						<div class="team-highlight">
							<div class="team-member">
								<img src={$siteConfig.team[0].image} alt={$siteConfig.team[0].name} class="team-photo" />
								<div class="team-info">
									<h4 class="team-name">{$siteConfig.team[0].name}</h4>
									<p class="team-role">{$siteConfig.team[0].role}</p>
									<p class="team-bio">{$siteConfig.team[0].bio}</p>
								</div>
							</div>
						</div>
					{/if}
					<a href="/about" class="cta-secondary">Learn More About Us</a>
				</div>
				{#if $siteConfig.accolades && $siteConfig.accolades.length > 0}
					<div class="accolades">
						<h3 class="accolades-title">Recognition</h3>
						<div class="accolades-list">
							{#each $siteConfig.accolades as accolade}
								<div class="accolade-item">
									<span class="accolade-title">{accolade.title}</span>
									<span class="accolade-org">{accolade.organization} ({accolade.year})</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</section>
</main>

<style>
	.home {
		background: var(--color-bg-pure);
	}

	/* Hero Section */
	.hero {
		position: relative;
		height: 85vh;
		min-height: 600px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.hero-image-wrapper {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	.hero-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.hero-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.6));
	}

	.hero-content {
		position: relative;
		z-index: 1;
		text-align: center;
		max-width: var(--width-content);
		padding: 0 var(--space-md);
	}

	.hero-title {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
	}

	.hero-tagline {
		font-size: var(--text-h2);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
	}

	.hero-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-xl);
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
	}

	.hero-cta {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
	}

	/* Menu Highlights */
	.menu-highlights {
		background: var(--color-bg-elevated);
	}

	.menu-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.dish-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.dish-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-4px);
	}

	.dish-image-wrapper {
		width: 100%;
		height: 200px;
		overflow: hidden;
	}

	.dish-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.dish-content {
		padding: var(--space-lg);
	}

	.dish-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--space-sm);
	}

	.dish-name {
		font-size: var(--text-h4);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.dish-price {
		font-size: var(--text-body-lg);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
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
		flex-wrap: wrap;
	}

	.dietary-badge {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		border: 1px solid var(--color-border-default);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		text-transform: lowercase;
	}

	.menu-cta {
		text-align: center;
	}

	/* Hours & Location */
	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-xl);
	}

	.info-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
	}

	.info-title {
		font-size: var(--text-h3);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.hours-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.hours-row {
		display: flex;
		justify-content: space-between;
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.hours-row:last-child {
		border-bottom: none;
	}

	.day-label {
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		text-transform: capitalize;
	}

	.hours-value {
		color: var(--color-fg-tertiary);
	}

	.location-address {
		font-size: var(--text-body-lg);
		color: var(--color-fg-primary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-md);
	}

	.location-neighborhood {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.location-landmarks {
		list-style: none;
		padding: 0;
		margin: var(--space-sm) 0;
	}

	.location-landmarks li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		padding: var(--space-xs) 0;
	}

	.location-contact {
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.location-contact a {
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.location-contact a:hover {
		color: var(--color-fg-primary);
	}

	/* Reservation CTA */
	.reservation-cta {
		background: var(--color-bg-elevated);
	}

	.cta-content {
		text-align: center;
		max-width: var(--width-content);
		margin: 0 auto;
	}

	.cta-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.cta-text {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xl);
	}

	.cta-actions {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
	}

	/* About Teaser */
	.about-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: var(--space-2xl);
	}

	@media (max-width: 768px) {
		.about-grid {
			grid-template-columns: 1fr;
		}
	}

	.about-title {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.about-text {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-lg);
	}

	.team-highlight {
		margin-bottom: var(--space-xl);
	}

	.team-member {
		display: flex;
		gap: var(--space-md);
		align-items: start;
	}

	.team-photo {
		width: 100px;
		height: 100px;
		border-radius: var(--radius-md);
		object-fit: cover;
	}

	.team-name {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.team-role {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-sm);
	}

	.team-bio {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.accolades-title {
		font-size: var(--text-h4);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.accolades-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.accolade-item {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.accolade-title {
		display: block;
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.accolade-org {
		display: block;
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}
</style>
