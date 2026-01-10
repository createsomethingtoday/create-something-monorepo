<script lang="ts">
	/**
	 * Philosophy Section
	 *
	 * Replaces Rudolf's office gallery with dwelling-oriented philosophy statement.
	 * Embodies Heideggerian "tools recede" principle and Canon subtractive design.
	 *
	 * Structure: 2-column grid (statement 2fr | principles 1fr)
	 * Motion: Staggered reveal for principles (--cascade-step)
	 * Typography: Light weight headline (300) for contrast
	 */

	interface Props {
		headline?: string;
		statement?: string;
		principles?: readonly string[];
	}

	let {
		headline = 'Partnership',
		statement = 'Tools recede into transparent use. Claude Code generates components—you review and ship. The infrastructure disappears; only outcomes remain.',
		principles = [
			'AI partnership, not replacement',
			'Human judgment on architectural decisions',
			'Tools serve dwelling, not enframing',
			'Outcomes over process theatrics'
		]
	}: Props = $props();
</script>

<section class="philosophy-section">
	<div class="philosophy-container">
		<!-- Statement Column -->
		<div class="philosophy-content">
			<h2 class="philosophy-headline">{headline}</h2>
			<p class="philosophy-statement">{statement}</p>
		</div>

		<!-- Principles Column -->
		<div class="philosophy-principles">
			<ul class="principles-list">
				{#each principles as principle, index}
					<li class="principle-item" style="--index: {index}">
						{principle}
					</li>
				{/each}
			</ul>
		</div>
	</div>
</section>

<style>
	/*
	 * Philosophy Section Layout
	 * Pure monochrome. Golden ratio spacing. Typography-driven hierarchy.
	 */

	.philosophy-section {
		padding: var(--space-3xl) 0;
		background: var(--color-bg-pure);
	}

	.philosophy-container {
		max-width: 90rem;
		margin: 0 auto;
		padding: 0 var(--space-md);
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-2xl);
	}

	/* Desktop: 2-column grid (statement 2fr | principles 1fr) */
	@media (min-width: 768px) {
		.philosophy-container {
			grid-template-columns: 2fr 1fr;
			gap: var(--space-3xl);
		}
	}

	/*
	 * Statement Column - Light weight for contrast
	 */

	.philosophy-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.philosophy-headline {
		font-size: var(--text-h2);
		font-weight: 300; /* Light weight creates contrast */
		line-height: 1.2;
		color: var(--color-fg-primary);
		letter-spacing: -0.02em;
	}

	.philosophy-statement {
		font-size: var(--text-body-lg);
		font-weight: 400;
		line-height: 1.6;
		color: var(--color-fg-secondary);
	}

	/*
	 * Principles Column - Staggered reveal
	 */

	.philosophy-principles {
		display: flex;
		align-items: start;
		padding-top: var(--space-lg);
	}

	@media (min-width: 768px) {
		.philosophy-principles {
			border-left: 1px solid var(--color-border-default);
			padding-left: var(--space-lg);
			padding-top: 0;
		}
	}

	.principles-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.principle-item {
		font-size: var(--text-body);
		font-weight: 400;
		line-height: 1.5;
		color: var(--color-fg-tertiary);
		position: relative;
		padding-left: var(--space-md);
		opacity: 0;
		transform: translateY(10px);
		animation: principleReveal var(--duration-standard) var(--ease-standard) forwards;
		animation-delay: calc(var(--cascade-step) * var(--index));
	}

	.principle-item::before {
		content: '—';
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
	}

	@keyframes principleReveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/*
	 * Reduced Motion Support
	 */

	@media (prefers-reduced-motion: reduce) {
		.principle-item {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
