<script lang="ts">
	/**
	 * TrustSignals Component
	 *
	 * Discloses trust relationships—quiet evidence of credibility.
	 * Static, minimal presentation. No carousel, no animation.
	 * "Who else trusts this?" is meaningful information.
	 *
	 * Canon principle: Present without calling attention to presentation.
	 */

	interface TrustItem {
		name: string;
		logoText?: string; // For text-based logos (placeholder)
	}

	interface Props {
		headline?: string;
		items?: TrustItem[];
		variant?: 'clients' | 'certifications' | 'associations';
	}

	const defaultItems: TrustItem[] = [
		{ name: 'Client One', logoText: 'CLIENT' },
		{ name: 'Client Two', logoText: 'PARTNER' },
		{ name: 'Client Three', logoText: 'ENTERPRISE' },
		{ name: 'Client Four', logoText: 'GLOBAL' },
		{ name: 'Client Five', logoText: 'INDUSTRY' }
	];

	let {
		headline = 'Trusted by',
		items = defaultItems,
		variant = 'clients'
	}: Props = $props();
</script>

<section class="trust-section" aria-label="{headline}">
	<div class="container">
		{#if headline}
			<p class="trust-label">{headline}</p>
		{/if}

		<div class="trust-grid" role="list">
			{#each items as item}
				<div class="trust-item" role="listitem">
					<!--
						In production, replace with actual logo images:
						<img src={item.logo} alt={item.name} class="trust-logo" />

						Text placeholders shown for template demonstration.
					-->
					<span class="trust-logo-placeholder" aria-label={item.name}>
						{item.logoText || item.name}
					</span>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.trust-section {
		padding: var(--space-xl) 0;
		background: var(--color-bg-pure);
		border-top: 1px solid var(--color-border-default);
		border-bottom: 1px solid var(--color-border-default);
	}

	.container {
		max-width: var(--container-xl);
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	.trust-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
		text-align: center;
		margin-bottom: var(--space-lg);
	}

	.trust-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: var(--space-xl);
	}

	@media (min-width: 768px) {
		.trust-grid {
			gap: var(--space-2xl);
		}
	}

	.trust-item {
		flex-shrink: 0;
	}

	.trust-logo-placeholder {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-muted);
		letter-spacing: var(--tracking-wider);
		opacity: 0.6;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.trust-item:hover .trust-logo-placeholder {
		opacity: 1;
	}

	/* For actual logo images */
	:global(.trust-logo) {
		height: 24px;
		width: auto;
		filter: grayscale(100%);
		opacity: 0.5;
		transition:
			opacity var(--duration-micro) var(--ease-standard),
			filter var(--duration-micro) var(--ease-standard);
	}

	:global(.trust-item:hover .trust-logo) {
		opacity: 0.8;
		filter: grayscale(50%);
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.trust-logo-placeholder,
		:global(.trust-logo) {
			transition: none;
		}
	}
</style>
