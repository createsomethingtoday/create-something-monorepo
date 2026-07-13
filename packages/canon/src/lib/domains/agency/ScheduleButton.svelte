<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
		children?: import('svelte').Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		class: className = '',
		children
	}: Props = $props();

	async function handleClick() {
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
			// Analytics must never block the owned scheduling route.
		}

		goto('/book');
	}
</script>

<button onclick={handleClick} class="booking-cta {variant} {size} {className}" type="button">
	{#if children}
		{@render children()}
	{:else}
		<span>Book a mapping session</span>
	{/if}
</button>

<style>
	.booking-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		border-radius: var(--radius-performance-scale-sm);
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
		cursor: pointer;
		border: none;
	}

	.booking-cta.primary { background: var(--color-performance-fg-primary); color: var(--color-performance-bg-pure); }
	.booking-cta.primary:hover { background: var(--color-performance-fg-secondary); }
	.booking-cta.secondary { background: transparent; color: var(--color-performance-fg-primary); border: 1px solid var(--color-performance-border-emphasis); }
	.booking-cta.secondary:hover { background: var(--color-performance-hover); border-color: var(--color-performance-fg-primary); }
	.booking-cta.ghost { background: transparent; color: var(--color-performance-fg-secondary); }
	.booking-cta.ghost:hover { color: var(--color-performance-fg-primary); background: var(--color-performance-hover); }
	.booking-cta:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 2px; }
	.booking-cta.sm { padding: 0.5rem 1rem; font-size: var(--text-performance-body-sm); }
	.booking-cta.md { padding: 0.75rem 1.5rem; font-size: var(--text-performance-body); }
	.booking-cta.lg { padding: 1rem 2rem; font-size: var(--text-performance-body-lg); }
</style>
