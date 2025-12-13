<script lang="ts">
	/**
	 * EmergencyBanner - Sticky 24/7 Availability Banner
	 *
	 * Positioned above navigation at top of viewport.
	 * When dismissed, nav slides up to fill the space.
	 * Features pulse animation and click-to-call.
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';
	import { Phone, X } from 'lucide-svelte';
	import { bannerDismissed } from '$lib/stores/banner';

	const siteConfig = getSiteConfigFromContext();

	interface Props {
		dismissible?: boolean;
	}

	let { dismissible = true }: Props = $props();

	const phoneNumber = siteConfig.emergencyPhone || siteConfig.phone;
	const telLink = `tel:${phoneNumber.replace(/[^0-9+]/g, '')}`;

	function dismiss() {
		bannerDismissed.set(true);
	}
</script>

{#if siteConfig.available24_7 && !$bannerDismissed}
	<div class="emergency-banner">
		<div class="banner-content">
			<div class="banner-left">
				<span class="pulse-dot"></span>
				<span class="banner-text">
					<strong>Injured?</strong> Get help now.
				</span>
			</div>
			<a href={telLink} class="banner-phone">
				<Phone size={16} />
				<span>{phoneNumber}</span>
				<span class="availability-text">Available 24/7</span>
			</a>
		</div>
		{#if dismissible}
			<button class="dismiss-btn" onclick={dismiss} aria-label="Dismiss banner">
				<X size={16} />
			</button>
		{/if}
	</div>
{/if}

<style>
	.emergency-banner {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: var(--z-emergency);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-md);
		background: linear-gradient(
			90deg,
			rgba(68, 170, 68, 0.15) 0%,
			rgba(68, 170, 68, 0.25) 50%,
			rgba(68, 170, 68, 0.15) 100%
		);
		border-bottom: 1px solid rgba(68, 170, 68, 0.3);
		backdrop-filter: blur(12px);
	}

	.banner-content {
		display: flex;
		align-items: center;
		gap: var(--space-lg);
		flex: 1;
		justify-content: center;
	}

	.banner-left {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.pulse-dot {
		width: 8px;
		height: 8px;
		background: var(--color-success);
		border-radius: var(--radius-full);
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
			box-shadow: 0 0 0 0 rgba(68, 170, 68, 0.7);
		}
		50% {
			opacity: 0.8;
			box-shadow: 0 0 0 6px rgba(68, 170, 68, 0);
		}
	}

	.banner-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.banner-text strong {
		color: var(--color-fg-primary);
	}

	.banner-phone {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: 6px var(--space-sm);
		background: rgba(68, 170, 68, 0.2);
		border: 1px solid var(--color-success);
		border-radius: var(--radius-full);
		color: var(--color-success);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.banner-phone:hover {
		background: rgba(68, 170, 68, 0.3);
	}

	.availability-text {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		padding-left: var(--space-xs);
		border-left: 1px solid rgba(68, 170, 68, 0.3);
	}

	.dismiss-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		background: transparent;
		border: none;
		color: var(--color-fg-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.dismiss-btn:hover {
		color: var(--color-fg-secondary);
		background: rgba(255, 255, 255, 0.1);
	}

	/* Responsive */
	@media (max-width: 640px) {
		.banner-content {
			flex-direction: column;
			gap: var(--space-xs);
		}

		.availability-text {
			display: none;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.pulse-dot {
			animation: none;
		}
	}
</style>
