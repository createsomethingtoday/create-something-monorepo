<script lang="ts">
	/**
	 * StudioSection - The Philosophy of Space
	 *
	 * This section invites dwelling. Text flows like the studio's
	 * philosophy: considered, unhurried, with room to breathe.
	 *
	 * The approach items appear as principles, not bullets.
	 * Space between is not emptiness—it's meaning.
	 *
	 * "Architecture should recede into experience."
	 */

	import { siteConfig } from '$lib/config/context';

	interface Props {
		headline?: string;
		philosophy?: string;
		approach?: readonly string[];
	}

	let { headline, philosophy, approach }: Props = $props();

	// Reactive defaults from store
	const effectiveHeadline = $derived(headline ?? $siteConfig.studio.headline);
	const effectivePhilosophy = $derived(philosophy ?? $siteConfig.studio.philosophy);
	const effectiveApproach = $derived(approach ?? $siteConfig.studio.approach);
</script>

<section class="studio-section">
	<div class="studio-container">
		<!-- Philosophy: the core statement -->
		<div class="studio-philosophy">
			<h2 class="studio-headline">{effectiveHeadline}</h2>
			<p class="studio-statement">{effectivePhilosophy}</p>
		</div>

		<!-- Approach: principles, not features -->
		<div class="studio-approach">
			<ul class="approach-list">
				{#each effectiveApproach as principle, index}
					<li class="approach-item" style="--index: {index}">
						{principle}
					</li>
				{/each}
			</ul>
		</div>
	</div>
</section>

<style>
	.studio-section {
		padding: var(--space-3xl) 0;
		background: var(--color-bg-pure);
	}

	.studio-container {
		max-width: var(--width-wide);
		margin: 0 auto;
		padding: 0 var(--space-lg);
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-2xl);
	}

	/* Philosophy block */
	.studio-philosophy {
		max-width: var(--width-prose);
	}

	.studio-headline {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		letter-spacing: var(--tracking-wider);
		text-transform: uppercase;
		margin-bottom: var(--space-lg);
	}

	.studio-statement {
		font-size: var(--text-h2);
		font-weight: var(--font-light);
		color: var(--color-fg-primary);
		line-height: var(--leading-relaxed);
		letter-spacing: var(--tracking-tight);
	}

	/* Approach list: principles */
	.studio-approach {
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.approach-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.approach-item {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		letter-spacing: var(--tracking-normal);
		position: relative;
		padding-left: var(--space-lg);
		opacity: 0;
		animation: approach-fade 0.6s var(--ease-decelerate) forwards;
		animation-delay: calc(var(--index) * 0.1s + 0.3s);
	}

	.approach-item::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.6em;
		width: var(--space-sm);
		height: 1px;
		background: var(--color-fg-muted);
	}

	@keyframes approach-fade {
		from {
			opacity: 0;
			transform: translateX(-10px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	/* Desktop: side by side */
	@media (min-width: 1024px) {
		.studio-container {
			grid-template-columns: 2fr 1fr;
			gap: var(--space-3xl);
			align-items: start;
		}

		.studio-approach {
			padding-top: 0;
			border-top: none;
			border-left: 1px solid var(--color-border-default);
			padding-left: var(--space-xl);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.approach-item {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
