<script lang="ts">
	import { browser } from '$app/environment';

	interface Props {
		linkSlug?: string;
		variant?: 'primary' | 'secondary' | 'ghost';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
		children?: import('svelte').Snippet;
	}

	let {
		linkSlug = 'createsomething/together',
		variant = 'primary',
		size = 'md',
		class: className = '',
		children
	}: Props = $props();

	async function openBooking() {
		// Track analytics
		try {
			fetch('/api/analytics/track', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					event_type: 'booking_initiated',
					property: 'agency',
					path: browser ? window.location.pathname : '/'
				})
			});
		} catch {
			// Silent fail - don't block booking
		}

		// Open SavvyCal popup
		if (browser && typeof window.SavvyCal !== 'undefined') {
			window.SavvyCal('open', { link: linkSlug });
		} else if (browser) {
			// Fallback: open in new tab
			window.open(`https://savvycal.com/${linkSlug}`, '_blank');
		}
	}
</script>

<button
	onclick={openBooking}
	class="booking-cta {variant} {size} {className}"
	type="button"
>
	{#if children}
		{@render children()}
	{:else}
		<span>Book a discovery call</span>
		<svg
			class="arrow-icon"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			stroke-width="2"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M13 7l5 5m0 0l-5 5m5-5H6"
			/>
		</svg>
	{/if}
</button>

<style>
	.booking-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
		transition: all var(--duration-micro) var(--ease-standard);
		cursor: pointer;
		border: none;
	}

	/* Variants */
	.booking-cta.primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.booking-cta.primary:hover {
		background: var(--color-fg-secondary);
	}

	.booking-cta.primary:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.booking-cta.secondary {
		background: transparent;
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-emphasis);
	}

	.booking-cta.secondary:hover {
		background: var(--color-hover);
		border-color: var(--color-fg-primary);
	}

	.booking-cta.secondary:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.booking-cta.ghost {
		background: transparent;
		color: var(--color-fg-secondary);
	}

	.booking-cta.ghost:hover {
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	.booking-cta.ghost:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	/* Sizes */
	.booking-cta.sm {
		padding: 0.5rem 1rem;
		font-size: var(--text-body-sm);
	}

	.booking-cta.md {
		padding: 0.75rem 1.5rem;
		font-size: var(--text-body);
	}

	.booking-cta.lg {
		padding: 1rem 2rem;
		font-size: var(--text-body-lg);
	}

	.arrow-icon {
		width: 1em;
		height: 1em;
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.booking-cta:hover .arrow-icon {
		transform: translateX(4px);
	}
</style>
