<script lang="ts">
	/**
	 * Menu Page - Restaurant
	 *
	 * Complete menu organized by category.
	 * Dietary filters and clear pricing.
	 */

	import { siteConfig } from '$lib/config/context';

	// Group menu items by category
	$: categorizedMenu = $siteConfig.menuCategories.map((category) => ({
		...category,
		items: $siteConfig.menuItems.filter((item) => item.category === category.slug)
	}));
</script>

<svelte:head>
	<title>Menu - {$siteConfig.name}</title>
	<meta
		name="description"
		content="Explore our seasonal menu featuring fresh, locally-sourced ingredients."
	/>
</svelte:head>

<main class="menu-page">
	<!-- Page Header -->
	<section class="page-header">
		<div class="container">
			<h1>Menu</h1>
			<p class="lead">
				Seasonal ingredients, expertly prepared. Our menu changes with the harvest to bring you the
				freshest flavors.
			</p>
		</div>
	</section>

	<!-- Menu Sections -->
	<div class="container">
		{#each categorizedMenu as category}
			{#if category.items.length > 0}
				<section class="menu-category">
					<div class="category-header">
						<h2 class="category-title">{category.title}</h2>
						{#if category.description}
							<p class="category-description">{category.description}</p>
						{/if}
					</div>

					<div class="menu-items">
						{#each category.items as item}
							<article class="menu-item">
								<div class="item-header">
									<h3 class="item-name">{item.name}</h3>
									<span class="item-price">${item.price}</span>
								</div>
								<p class="item-description">{item.description}</p>
								{#if item.dietary && item.dietary.length > 0}
									<div class="item-dietary">
										{#each item.dietary as diet}
											<span class="dietary-badge">{diet}</span>
										{/each}
									</div>
								{/if}
							</article>
						{/each}
					</div>
				</section>
			{/if}
		{/each}
	</div>

	<!-- Dietary Info -->
	<section class="dietary-info">
		<div class="container">
			<h2>Dietary Accommodations</h2>
			<p class="dietary-lead">
				We're happy to accommodate dietary restrictions and preferences. Please inform your server
				of any allergies or special requirements.
			</p>
			<div class="dietary-options">
				{#each $siteConfig.dietaryOptions as option}
					<div class="dietary-option">
						<h3 class="dietary-title">{option.title}</h3>
						<p class="dietary-description">{option.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Reservation CTA -->
	<section class="menu-cta">
		<div class="container">
			<div class="cta-content">
				<h2>Ready to dine?</h2>
				<p>Reserve your table and experience these dishes yourself.</p>
				<div class="cta-actions">
					{#if $siteConfig.reservations.enabled && $siteConfig.reservations.url}
						<a
							href={$siteConfig.reservations.url}
							target="_blank"
							rel="noopener noreferrer"
							class="cta-primary"
						>
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
</main>

<style>
	.menu-page {
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
		max-width: 600px;
		margin: 0 auto;
		line-height: 1.6;
	}

	/* Menu Category */
	.menu-category {
		padding: var(--space-2xl) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.menu-category:last-of-type {
		border-bottom: none;
	}

	.category-header {
		margin-bottom: var(--space-xl);
		text-align: center;
	}

	.category-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.category-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		font-style: italic;
	}

	/* Menu Items */
	.menu-items {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.menu-item {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.menu-item:hover {
		border-color: var(--color-border-emphasis);
	}

	.item-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--space-xs);
		gap: var(--space-sm);
	}

	.item-name {
		font-size: var(--text-h4);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.item-price {
		font-size: var(--text-body-lg);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		white-space: nowrap;
	}

	.item-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-sm);
	}

	.item-dietary {
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

	/* Dietary Info */
	.dietary-info {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.dietary-info h2 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		text-align: center;
		margin-bottom: var(--space-sm);
	}

	.dietary-lead {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		text-align: center;
		margin: 0 auto var(--space-xl);
		max-width: 600px;
		line-height: 1.6;
	}

	.dietary-options {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.dietary-option {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.dietary-title {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.dietary-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: 1.5;
	}

	/* CTA Section */
	.menu-cta {
		padding: var(--space-2xl) 0;
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
