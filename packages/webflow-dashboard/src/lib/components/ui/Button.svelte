<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'default' | 'webflow' | 'outline' | 'ghost' | 'destructive';
	type Size = 'sm' | 'default' | 'lg' | 'icon';

	interface Props extends HTMLButtonAttributes {
		variant?: Variant;
		size?: Size;
		loading?: boolean;
		children: Snippet;
	}

	let {
		variant = 'default',
		size = 'default',
		loading = false,
		disabled = false,
		children,
		class: className = '',
		...restProps
	}: Props = $props();

	const sizeClasses: Record<Size, string> = {
		sm: 'h-8 px-3 text-sm',
		default: 'h-9 px-4 py-2',
		lg: 'h-10 px-8',
		icon: 'h-9 w-9'
	};
</script>

<button
	class="btn btn-{variant} {sizeClasses[size]} {className}"
	disabled={disabled || loading}
	aria-busy={loading}
	{...restProps}
>
	{#if loading}
		<span class="loading-spinner" aria-hidden="true"></span>
	{/if}
	{@render children()}
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		white-space: nowrap;
		font-family: var(--font-sans);
		font-weight: var(--font-medium);
		border-radius: var(--radius-lg);
		transition: all var(--duration-micro) var(--ease-standard);
		cursor: pointer;
		border: none;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}

	.btn:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	/* Variants */
	.btn-default {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
	}

	.btn-default:hover:not(:disabled) {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.btn-webflow {
		background: var(--webflow-blue);
		color: #ffffff;
	}

	.btn-webflow:hover:not(:disabled) {
		background: var(--webflow-blue-dark);
	}

	.btn-outline {
		background: transparent;
		color: var(--webflow-blue);
		border: 1px solid var(--webflow-blue);
	}

	.btn-outline:hover:not(:disabled) {
		background: color-mix(in srgb, var(--webflow-blue) 10%, transparent);
	}

	.btn-ghost {
		background: transparent;
		color: var(--color-fg-primary);
	}

	.btn-ghost:hover:not(:disabled) {
		background: var(--color-hover);
	}

	.btn-destructive {
		background: var(--color-error);
		color: #ffffff;
	}

	.btn-destructive:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-error) 80%, black);
	}

	/* Loading Spinner */
	.loading-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
