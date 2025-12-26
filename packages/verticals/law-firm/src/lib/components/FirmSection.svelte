<script lang="ts">
	/**
	 * Firm Section - The Philosophy
	 *
	 * Philosophy: This is where character emerges.
	 * Large typography, asymmetric layout, values as artifacts.
	 * Not a list of claims—a statement of being.
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';
	import { onMount } from 'svelte';

	const siteConfig = getSiteConfigFromContext();
	const { firm, barAssociations } = siteConfig;

	let revealed = $state(false);

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					revealed = true;
					observer.disconnect();
				}
			},
			{ threshold: 0.2 }
		);

		const section = document.getElementById('about');
		if (section) observer.observe(section);

		return () => observer.disconnect();
	});
</script>

<section class="firm-section" id="about" class:revealed>
	<div class="firm-grid">
		<!-- Left: The Philosophy -->
		<div class="philosophy-column">
			<span class="eyebrow">Our Approach</span>
			<h2 class="headline">{firm.headline}</h2>
			<p class="philosophy">{firm.philosophy}</p>
			<p class="founded">Est. {firm.founded}</p>
		</div>

		<!-- Right: Values as List -->
		<div class="values-column">
			<h3 class="values-heading">Values</h3>
			<ul class="values-list">
				{#each firm.values as value, i}
					<li class="value-item" style="--delay: {i * 60}ms">{value}</li>
				{/each}
			</ul>
		</div>
	</div>

	<!-- Bar Associations: Subtle footer -->
	{#if barAssociations.length > 0}
		<footer class="associations">
			<span class="associations-label">Member of</span>
			<span class="associations-list">
				{#each barAssociations as association, i}
					<span class="association">{association}</span>
					{#if i < barAssociations.length - 1}
						<span class="divider" aria-hidden="true">·</span>
					{/if}
				{/each}
			</span>
		</footer>
	{/if}
</section>

<style>
	.firm-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-elevated);
		max-width: 1200px;
		margin: 0 auto;
	}

	.firm-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: var(--space-2xl);
		align-items: start;
	}

	/* Philosophy Column */
	.philosophy-column {
		max-width: 600px;
	}

	.eyebrow {
		display: block;
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
		opacity: 0;
		transform: translateY(10px);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.revealed .eyebrow {
		opacity: 1;
		transform: translateY(0);
	}

	.headline {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-lg);
		line-height: 1.1;
		opacity: 0;
		transform: translateY(20px);
		transition: all var(--duration-standard) var(--ease-standard) 0.1s;
	}

	.revealed .headline {
		opacity: 1;
		transform: translateY(0);
	}

	.philosophy {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin: 0 0 var(--space-md);
		opacity: 0;
		transform: translateY(20px);
		transition: all var(--duration-standard) var(--ease-standard) 0.2s;
	}

	.revealed .philosophy {
		opacity: 1;
		transform: translateY(0);
	}

	.founded {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0;
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard) 0.3s;
	}

	.revealed .founded {
		opacity: 1;
	}

	/* Values Column */
	.values-column {
		padding-top: var(--space-xl);
	}

	.values-heading {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-fg-muted);
		margin: 0 0 var(--space-md);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard) 0.15s;
	}

	.revealed .values-heading {
		opacity: 1;
	}

	.values-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.value-item {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border-default);
		opacity: 0;
		transform: translateX(-10px);
		transition: all var(--duration-standard) var(--ease-standard);
		transition-delay: var(--delay);
	}

	.revealed .value-item {
		opacity: 1;
		transform: translateX(0);
	}

	.value-item:last-child {
		border-bottom: none;
	}

	/* Associations Footer */
	.associations {
		margin-top: var(--space-2xl);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
		text-align: center;
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard) 0.4s;
	}

	.revealed .associations {
		opacity: 1;
	}

	.associations-label {
		display: block;
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.associations-list {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.association {
		display: inline;
	}

	.divider {
		margin: 0 var(--space-sm);
		color: var(--color-fg-muted);
	}

	@media (max-width: 768px) {
		.firm-section {
			padding: var(--space-xl) var(--space-md);
		}

		.firm-grid {
			grid-template-columns: 1fr;
			gap: var(--space-xl);
		}

		.headline {
			font-size: var(--text-h2);
		}

		.values-column {
			padding-top: 0;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.eyebrow,
		.headline,
		.philosophy,
		.founded,
		.values-heading,
		.value-item,
		.associations {
			opacity: 1;
			transform: none;
			transition: none;
		}
	}
</style>
