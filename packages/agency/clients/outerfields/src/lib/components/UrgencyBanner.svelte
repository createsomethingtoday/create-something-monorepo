<script lang="ts">
	/**
	 * OUTERFIELDS Urgency Banner
	 * Pre-sale phase messaging at top of page
	 */
	import { AlertCircle } from 'lucide-svelte';
</script>

<div class="urgency-banner">
	<div class="banner-content">
		<div class="banner-icon">
			<AlertCircle size={18} />
		</div>
		<p class="banner-text">
			<strong>Pre-Sale Phase:</strong> Platform currently being built. Lock in founding member pricing
			before we launch. <span class="price-highlight">$99 lifetime access won't last forever.</span>
		</p>
	</div>
</div>

<style>
	.urgency-banner {
		background: linear-gradient(
			135deg,
			var(--color-warning-muted) 0%,
			rgba(170, 136, 68, 0.15) 100%
		);
		border-bottom: 1px solid var(--color-warning-border);
		padding: 0.875rem 1.5rem;
		position: sticky;
		top: 0;
		z-index: 50;
		backdrop-filter: blur(10px);
	}

	.banner-content {
		max-width: 80rem;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
	}

	.banner-icon {
		display: flex;
		align-items: center;
		color: var(--color-warning);
		flex-shrink: 0;
	}

	.banner-text {
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
		margin: 0;
		text-align: center;
		line-height: 1.5;
	}

	.banner-text strong {
		color: var(--color-fg-primary);
		font-weight: 700;
	}

	.price-highlight {
		color: var(--color-warning);
		font-weight: 600;
	}

	@media (max-width: 768px) {
		.urgency-banner {
			padding: 0.75rem 1rem;
		}

		.banner-icon {
			display: none;
		}

		.banner-text {
			font-size: 0.8125rem;
		}
	}

	@media (max-width: 480px) {
		.banner-text {
			font-size: 0.75rem;
		}
	}
</style>
