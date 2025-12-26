<script lang="ts">
	/**
	 * Practice Areas Section
	 *
	 * Philosophy: Each practice area is a doorway, not a card.
	 * Large typography creates hierarchy; icons are secondary.
	 * Horizontal rhythm on desktop, vertical stack on mobile.
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';
	import { onMount } from 'svelte';

	const siteConfig = getSiteConfigFromContext();
	const { practiceAreas } = siteConfig;

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

		const section = document.getElementById('practice-areas');
		if (section) observer.observe(section);

		return () => observer.disconnect();
	});
</script>

<section class="practice-areas" id="practice-areas" class:revealed>
	<header class="section-header">
		<span class="section-eyebrow">Practice Areas</span>
		<h2 class="section-title">Focused expertise<br />where it matters.</h2>
	</header>

	<div class="areas-list">
		{#each practiceAreas as area, i}
			<a
				href="/practice-areas/{area.slug}"
				class="area-item"
				style="--delay: {i * 80}ms"
				aria-label="Learn more about {area.name}"
			>
				<span class="area-number">{String(i + 1).padStart(2, '0')}</span>
				<div class="area-content">
					<h3 class="area-name">{area.name}</h3>
					<p class="area-description">{area.description}</p>
				</div>
				<span class="area-arrow" aria-hidden="true">→</span>
			</a>
		{/each}
	</div>
</section>

<style>
	.practice-areas {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-pure);
		max-width: 1000px;
		margin: 0 auto;
	}

	.section-header {
		margin-bottom: var(--space-xl);
	}

	.section-eyebrow {
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

	.revealed .section-eyebrow {
		opacity: 1;
		transform: translateY(0);
	}

	.section-title {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
		line-height: 1.1;
		opacity: 0;
		transform: translateY(20px);
		transition: all var(--duration-standard) var(--ease-standard) 0.1s;
	}

	.revealed .section-title {
		opacity: 1;
		transform: translateY(0);
	}

	.areas-list {
		display: flex;
		flex-direction: column;
	}

	.area-item {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: var(--space-lg);
		padding: var(--space-lg) 0;
		border-bottom: 1px solid var(--color-border-default);
		text-decoration: none;
		opacity: 0;
		transform: translateY(20px);
		transition:
			opacity var(--duration-standard) var(--ease-standard),
			transform var(--duration-standard) var(--ease-standard),
			background var(--duration-micro) var(--ease-standard);
		transition-delay: var(--delay);
	}

	.revealed .area-item {
		opacity: 1;
		transform: translateY(0);
	}

	.area-item:first-child {
		border-top: 1px solid var(--color-border-default);
	}

	.area-item:hover {
		background: var(--color-hover);
	}

	.area-number {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		font-variant-numeric: tabular-nums;
		min-width: 2ch;
	}

	.area-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.area-name {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.area-item:hover .area-name {
		color: var(--color-fg-secondary);
	}

	.area-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin: 0;
		line-height: 1.5;
	}

	.area-arrow {
		font-size: var(--text-h3);
		color: var(--color-fg-muted);
		opacity: 0;
		transform: translateX(-10px);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.area-item:hover .area-arrow {
		opacity: 1;
		transform: translateX(0);
	}

	@media (max-width: 768px) {
		.practice-areas {
			padding: var(--space-xl) var(--space-md);
		}

		.section-title {
			font-size: var(--text-h2);
		}

		.area-item {
			grid-template-columns: auto 1fr;
			gap: var(--space-md);
		}

		.area-arrow {
			display: none;
		}

		.area-name {
			font-size: var(--text-body-lg);
		}

		.area-description {
			font-size: var(--text-body-sm);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.section-eyebrow,
		.section-title,
		.area-item {
			opacity: 1;
			transform: none;
			transition: background var(--duration-micro) var(--ease-standard);
		}

		.area-arrow {
			opacity: 0.5;
			transform: none;
		}

		.area-item:hover .area-arrow {
			opacity: 1;
		}
	}
</style>
