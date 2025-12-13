<script lang="ts">
	/**
	 * Firm Section
	 * About the firm - philosophy, values, history
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';

	const siteConfig = getSiteConfigFromContext();
	const { firm, barAssociations } = siteConfig;
</script>

<section class="firm-section" id="about">
	<div class="container">
		<header class="section-header">
			<h2 class="section-title">{firm.headline}</h2>
		</header>

		<div class="firm-content">
			<div class="firm-philosophy">
				<p class="philosophy-text">{firm.philosophy}</p>
				<p class="founded-text">Serving clients since {firm.founded}.</p>
			</div>

			<div class="firm-values">
				<h3 class="values-title">Our Values</h3>
				<ul class="values-list">
					{#each firm.values as value}
						<li class="value-item">{value}</li>
					{/each}
				</ul>
			</div>
		</div>

		{#if barAssociations.length > 0}
			<div class="bar-associations">
				<h4 class="associations-title">Member Of</h4>
				<ul class="associations-list">
					{#each barAssociations as association}
						<li class="association-item">{association}</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</section>

<style>
	.firm-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 900px;
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.firm-content {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: var(--space-xl);
		margin-bottom: var(--space-xl);
	}

	.philosophy-text {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.8;
		margin: 0 0 var(--space-md);
	}

	.founded-text {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin: 0;
	}

	.values-title {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.values-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.value-item {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.value-item:last-child {
		border-bottom: none;
	}

	.bar-associations {
		text-align: center;
		padding-top: var(--space-xl);
		border-top: 1px solid var(--color-border-default);
	}

	.associations-title {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		margin: 0 0 var(--space-sm);
	}

	.associations-list {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-md);
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.association-item {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	@media (max-width: 768px) {
		.firm-section {
			padding: var(--space-xl) var(--space-md);
		}

		.firm-content {
			grid-template-columns: 1fr;
			gap: var(--space-lg);
		}
	}
</style>
