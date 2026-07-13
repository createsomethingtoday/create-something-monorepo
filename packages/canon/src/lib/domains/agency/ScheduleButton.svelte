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
		border-radius: var(--radius-sm);
		transition: all var(--duration-micro) var(--ease-standard);
		cursor: pointer;
		border: none;
	}

	.booking-cta.primary { background: var(--color-fg-primary); color: var(--color-bg-pure); }
	.booking-cta.primary:hover { background: var(--color-fg-secondary); }
	.booking-cta.secondary { background: transparent; color: var(--color-fg-primary); border: 1px solid var(--color-border-emphasis); }
	.booking-cta.secondary:hover { background: var(--color-hover); border-color: var(--color-fg-primary); }
	.booking-cta.ghost { background: transparent; color: var(--color-fg-secondary); }
	.booking-cta.ghost:hover { color: var(--color-fg-primary); background: var(--color-hover); }
	.booking-cta:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
	.booking-cta.sm { padding: 0.5rem 1rem; font-size: var(--text-body-sm); }
	.booking-cta.md { padding: 0.75rem 1.5rem; font-size: var(--text-body); }
	.booking-cta.lg { padding: 1rem 2rem; font-size: var(--text-body-lg); }
</style>
