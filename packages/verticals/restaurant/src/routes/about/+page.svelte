<script lang="ts">
	/**
	 * About Page - Restaurant
	 *
	 * Restaurant philosophy, chef/team profiles, accolades.
	 * Warm, inviting, sensory-rich voice.
	 */

	import { siteConfig } from '$lib/config/context';
</script>

<svelte:head>
	<title>About - {$siteConfig.name}</title>
	<meta
		name="description"
		content="Learn about our philosophy, meet our team, and discover the story behind {$siteConfig.name}."
	/>
</svelte:head>

<main class="about-page">
	<!-- Page Header -->
	<section class="page-header">
		<div class="container">
			<h1>About</h1>
			<p class="lead">{$siteConfig.description}</p>
		</div>
	</section>

	<!-- Philosophy Section -->
	<section class="philosophy-section">
		<div class="container">
			<h2>Our Philosophy</h2>
			<div class="philosophy-content">
				<p>
					Great dining is an act of hospitality. It's the convergence of carefully sourced
					ingredients, skilled technique, and genuine warmth. Every dish that leaves our kitchen
					carries the intention to nourish, delight, and create lasting memories.
				</p>
				<p>
					We believe in seasonality—not as a trend, but as a fundamental principle. The best
					ingredients don't need embellishment; they need respect. Our relationships with local
					farmers, fishermen, and purveyors allow us to showcase the Pacific Northwest at its
					finest, prepared with techniques that honor both tradition and innovation.
				</p>
				<p>
					The dining room is an extension of the kitchen. Our service team approaches every table
					with the same care and precision that our culinary team brings to every plate. This is
					the full expression of hospitality—generous, unpretentious, and deeply human.
				</p>
			</div>
		</div>
	</section>

	<!-- Team Section -->
	{#if $siteConfig.team && $siteConfig.team.length > 0}
		<section class="team-section">
			<div class="container">
				<h2>Our Team</h2>
				<p class="section-lead">
					Meet the people who bring your dining experience to life, night after night.
				</p>

				<div class="team-grid">
					{#each $siteConfig.team as member}
						<article class="team-member">
							<div class="member-image-wrapper">
								<img src={member.image} alt={member.name} class="member-image" />
							</div>
							<div class="member-content">
								<h3 class="member-name">{member.name}</h3>
								<p class="member-role">{member.role}</p>
								<p class="member-bio">{member.bio}</p>
								{#if member.specialties && member.specialties.length > 0}
									<div class="member-specialties">
										{#each member.specialties as specialty}
											<span class="specialty-tag">{specialty}</span>
										{/each}
									</div>
								{/if}
							</div>
						</article>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- Features Section -->
	<section class="features-section">
		<div class="container">
			<h2>What Sets Us Apart</h2>
			<div class="features-grid">
				<article class="feature">
					<h3>Seasonal Menus</h3>
					<p>
						Our menu evolves with the harvest. What's on your plate tonight may be different next
						month—and that's exactly how it should be.
					</p>
				</article>

				<article class="feature">
					<h3>Local Partnerships</h3>
					<p>
						We work directly with farmers, fishermen, and artisans who share our commitment to
						quality and sustainability.
					</p>
				</article>

				<article class="feature">
					<h3>Artisanal Techniques</h3>
					<p>
						From house-cured meats to hand-rolled pasta, we make what we can in-house. The extra
						effort shows on the plate.
					</p>
				</article>

				<article class="feature">
					<h3>Curated Wine Program</h3>
					<p>
						Our sommelier has assembled a collection that emphasizes Pacific Northwest producers
						alongside classic regions.
					</p>
				</article>
			</div>
		</div>
	</section>

	<!-- Accolades Section -->
	{#if $siteConfig.accolades && $siteConfig.accolades.length > 0}
		<section class="accolades-section">
			<div class="container">
				<h2>Recognition</h2>
				<p class="section-lead">
					We're honored by the recognition, but the real reward is your return visit.
				</p>

				<div class="accolades-grid">
					{#each $siteConfig.accolades as accolade}
						<article class="accolade">
							<h3 class="accolade-title">{accolade.title}</h3>
							<p class="accolade-org">{accolade.organization}</p>
							<p class="accolade-year">{accolade.year}</p>
						</article>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- Atmosphere Section -->
	<section class="atmosphere-section">
		<div class="container">
			<h2>The Space</h2>
			<div class="atmosphere-content">
				<p>
					We designed the dining room to disappear. No gimmicks, no distractions—just warm light,
					natural materials, and enough room to breathe. The focus should be on your companions and
					the meal, not the decor.
				</p>
				<p>
					{#if $siteConfig.location.neighborhood}
						Located in {$siteConfig.location.neighborhood}, we're
					{:else}
						We're
					{/if}
					tucked away from the bustle but accessible when you're ready for a proper meal. The space
					seats 60, with an additional 8 at the chef's counter for those who want to watch the kitchen
					in action.
				</p>
			</div>
		</div>
	</section>

	<!-- Reservation CTA -->
	<section class="about-cta">
		<div class="container">
			<div class="cta-content">
				<h2>Experience it yourself</h2>
				<p>Reserve a table and join us for dinner.</p>
				<div class="cta-actions">
					<a href="/reservations" class="cta-primary">Make a Reservation</a>
					<a href="/menu" class="cta-secondary">View Menu</a>
				</div>
			</div>
		</div>
	</section>
</main>

<style>
	.about-page {
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 900px;
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	/* Page Header */
	.page-header {
		padding: var(--space-2xl) 0 var(--space-xl);
		text-align: center;
		border-bottom: 1px solid var(--color-border-default);
	}

	.page-header h1 {
		font-size: var(--text-display);
		font-weight: var(--font-light);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		letter-spacing: -0.02em;
	}

	.lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		max-width: 700px;
		margin: 0 auto;
		line-height: 1.7;
	}

	/* Philosophy Section */
	.philosophy-section {
		padding: var(--space-2xl) 0;
	}

	.philosophy-section h2 {
		font-size: var(--text-h1);
		font-weight: var(--font-light);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-lg);
	}

	.philosophy-content {
		max-width: 750px;
	}

	.philosophy-content p {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin-bottom: var(--space-md);
	}

	/* Team Section */
	.team-section {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.team-section h2 {
		font-size: var(--text-h1);
		font-weight: var(--font-light);
		color: var(--color-fg-primary);
		text-align: center;
		margin-bottom: var(--space-sm);
	}

	.section-lead {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		text-align: center;
		margin: 0 auto var(--space-xl);
		max-width: 600px;
	}

	.team-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-xl);
	}

	.team-member {
		display: grid;
		grid-template-columns: 200px 1fr;
		gap: var(--space-lg);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	@media (max-width: 640px) {
		.team-member {
			grid-template-columns: 1fr;
		}
	}

	.member-image-wrapper {
		width: 100%;
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: var(--radius-md);
	}

	.member-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.member-name {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.member-role {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-sm);
	}

	.member-bio {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin-bottom: var(--space-sm);
	}

	.member-specialties {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.specialty-tag {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		border: 1px solid var(--color-border-default);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
	}

	/* Features Section */
	.features-section {
		padding: var(--space-2xl) 0;
	}

	.features-section h2 {
		font-size: var(--text-h1);
		font-weight: var(--font-light);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xl);
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-lg);
	}

	.feature {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.feature h3 {
		font-size: var(--text-h4);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.feature p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	/* Accolades Section */
	.accolades-section {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.accolades-section h2 {
		font-size: var(--text-h1);
		font-weight: var(--font-light);
		color: var(--color-fg-primary);
		text-align: center;
		margin-bottom: var(--space-sm);
	}

	.accolades-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.accolade {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		text-align: center;
	}

	.accolade-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.accolade-org {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.accolade-year {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Atmosphere Section */
	.atmosphere-section {
		padding: var(--space-2xl) 0;
	}

	.atmosphere-section h2 {
		font-size: var(--text-h1);
		font-weight: var(--font-light);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-lg);
	}

	.atmosphere-content {
		max-width: 750px;
	}

	.atmosphere-content p {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin-bottom: var(--space-md);
	}

	/* CTA Section */
	.about-cta {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.cta-content {
		text-align: center;
		max-width: 600px;
		margin: 0 auto;
	}

	.cta-content h2 {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.cta-content p {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xl);
	}

	.cta-actions {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
		flex-wrap: wrap;
	}

	.cta-primary,
	.cta-secondary {
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		transition: all var(--duration-micro) var(--ease-standard);
		text-decoration: none;
		display: inline-block;
	}

	.cta-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: 1px solid var(--color-fg-primary);
	}

	.cta-primary:hover {
		background: var(--color-fg-secondary);
		border-color: var(--color-fg-secondary);
	}

	.cta-secondary {
		background: transparent;
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-emphasis);
	}

	.cta-secondary:hover {
		background: var(--color-hover);
		border-color: var(--color-border-strong);
	}

	@media (max-width: 480px) {
		.cta-actions {
			flex-direction: column;
		}

		.cta-primary,
		.cta-secondary {
			width: 100%;
		}
	}
</style>
