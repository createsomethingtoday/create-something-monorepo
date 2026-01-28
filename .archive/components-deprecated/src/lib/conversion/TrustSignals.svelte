<script lang="ts">
	/**
	 * TrustSignals Component
	 *
	 * Discloses trust relationships—quiet evidence of credibility.
	 * Static, minimal presentation. No carousel, no animation.
	 * "Who else trusts this?" is meaningful information.
	 *
	 * Canon principle: Present without calling attention to presentation.
	 *
	 * @example
	 * <TrustSignals
	 *   headline="Trusted by"
	 *   items={[{ name: 'Acme Corp', logoUrl: '/logos/acme.svg' }]}
	 * />
	 */

	interface TrustItem {
		name: string;
		logoUrl?: string;
		logoText?: string; // Fallback for text-based logos
	}

	interface Props {
		headline?: string;
		items?: TrustItem[];
		variant?: 'clients' | 'certifications' | 'associations' | 'press';
		compact?: boolean;
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
		variant = 'clients',
		compact = false
	}: Props = $props();
</script>

<section class="trust-section" class:compact aria-label={headline}>
	<div class="container">
		{#if headline}
			<p class="trust-label">{headline}</p>
		{/if}

		<div class="trust-grid" role="list">
			{#each items as item}
				<div class="trust-item" role="listitem">
					{#if item.logoUrl}
						<img src={item.logoUrl} alt={item.name} class="trust-logo" />
					{:else}
						<span class="trust-logo-placeholder" aria-label={item.name}>
							{item.logoText || item.name}
						</span>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.trust-section {
		padding: var(--space-xl, 4.236rem) 0;
		background: var(--color-bg-pure, #000);
		border-top: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.trust-section.compact {
		padding: var(--space-lg, 2.618rem) 0;
	}

	.container {
		max-width: 72rem;
		margin: 0 auto;
		padding: 0 var(--space-md, 1.618rem);
	}

	.trust-label {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		text-transform: uppercase;
		letter-spacing: 0.1em;
		text-align: center;
		margin-bottom: var(--space-lg, 2.618rem);
	}

	.compact .trust-label {
		margin-bottom: var(--space-md, 1.618rem);
	}

	.trust-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: var(--space-xl, 4.236rem);
	}

	.compact .trust-grid {
		gap: var(--space-lg, 2.618rem);
	}

	@media (min-width: 768px) {
		.trust-grid {
			gap: var(--space-2xl, 6.854rem);
		}

		.compact .trust-grid {
			gap: var(--space-xl, 4.236rem);
		}
	}

	.trust-item {
		flex-shrink: 0;
	}

	.trust-logo-placeholder {
		font-size: var(--text-body-sm, 0.875rem);
		font-weight: 600;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		letter-spacing: 0.1em;
		opacity: 0.6;
		transition: opacity var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.trust-item:hover .trust-logo-placeholder {
		opacity: 1;
	}

	.trust-logo {
		height: 24px;
		width: auto;
		filter: grayscale(100%);
		opacity: 0.5;
		transition:
			opacity var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			filter var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.trust-item:hover .trust-logo {
		opacity: 0.8;
		filter: grayscale(50%);
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.trust-logo-placeholder,
		.trust-logo {
			transition: none;
		}
	}
</style>
