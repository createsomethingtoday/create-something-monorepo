<script lang="ts">
	/**
	 * Philosophy Section
	 *
	 * Replaces Rudolf's office gallery with dwelling-oriented philosophy.
	 * Demonstrates "Partnership over automation" principle.
	 *
	 * Layout: 2-column grid (statement 2fr | principles 1fr)
	 * Motion: Staggered reveal for principles (--cascade-step)
	 * Typography: Light weight headline (300) for contrast
	 */

	interface Props {
		headline?: string;
		statement?: string;
		principles?: string[];
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
		<div class="philosophy-content">
			<h2 class="philosophy-headline">{headline}</h2>
			<p class="philosophy-statement">{statement}</p>
		</div>

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
	 * Heideggerian framing: dwelling invitation, not credibility theater
	 */

	.philosophy-section {
		padding: var(--space-3xl) 0;
		background: var(--color-bg-elevated);
	}

	.philosophy-container {
		max-width: 90rem;
		margin: 0 auto;
		padding: 0 var(--space-md);
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-2xl);
	}

	@media (min-width: 1024px) {
		.philosophy-container {
			grid-template-columns: 2fr 1fr;
		}
	}

	/*
	 * Philosophy Statement - Light weight for contrast
	 */

	.philosophy-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.philosophy-headline {
		font-size: var(--text-display);
		font-weight: 300; /* Light weight - contrasts with body */
		line-height: 1.1;
		color: var(--color-fg-primary);
	}

	.philosophy-statement {
		font-size: var(--text-body-lg);
		font-weight: 400;
		line-height: 1.6;
		color: var(--color-fg-secondary);
		max-width: 60ch;
	}

	/*
	 * Principles - Staggered reveal
	 */

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
		font-weight: 500;
		line-height: 1.5;
		color: var(--color-fg-tertiary);
		padding-left: var(--space-md);
		border-left: 2px solid var(--color-border-emphasis);

		/* Staggered reveal animation */
		opacity: 0;
		transform: translateY(20px);
		animation: principleReveal var(--duration-standard) var(--ease-standard) forwards;
		animation-delay: calc(var(--cascade-step) * var(--index));
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
			transform: translateY(0);
		}
	}
</style>
