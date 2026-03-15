<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
	type Size = 'default' | 'sm' | 'lg' | 'icon';

	interface Props extends HTMLButtonAttributes {
		variant?: Variant;
		size?: Size;
		children?: Snippet;
	}

	let {
		variant = 'default',
		size = 'default',
		class: className = '',
		children,
		...restProps
	}: Props = $props();
</script>

<button
	class="btn btn-{variant} btn-{size} {className}"
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</button>

<style>
		.btn {
			display: inline-flex;
			align-items: center;
			justify-content: center;
		gap: 0.5rem;
		white-space: nowrap;
		font-weight: var(--font-medium);
			letter-spacing: -0.01em;
			border-radius: 0.75rem;
			border: 1px solid var(--color-shell-border-default);
			cursor: pointer;
			transition:
				background-color var(--duration-micro) var(--ease-standard),
				border-color var(--duration-micro) var(--ease-standard),
				color var(--duration-micro) var(--ease-standard);
		}

	.btn:disabled {
		pointer-events: none;
		opacity: 0.5;
	}

	.btn:focus-visible {
		outline: none;
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-focus) 22%, transparent);
	}

	/* Variants */
	.btn-default {
		background: color-mix(in srgb, var(--color-info) 92%, #ffffff);
		color: #ffffff;
		border-color: color-mix(in srgb, var(--color-info) 82%, #ffffff);
	}

		.btn-default:hover:not(:disabled) {
			background: color-mix(in srgb, var(--color-info) 90%, #ffffff 10%);
			border-color: color-mix(in srgb, var(--color-info) 76%, #ffffff 24%);
		}

	.btn-secondary {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
		border-color: var(--color-shell-border-default);
	}

		.btn-secondary:hover:not(:disabled) {
			background: var(--color-bg-subtle);
			border-color: var(--color-shell-border-strong);
		}

	.btn-destructive {
		background: var(--color-error);
		color: white;
		border-color: var(--color-error);
	}

		.btn-destructive:hover:not(:disabled) {
			background: color-mix(in srgb, var(--color-error) 92%, #000000 8%);
			border-color: color-mix(in srgb, var(--color-error) 82%, #000000 18%);
		}

	.btn-outline {
		background: transparent;
		color: var(--color-fg-primary);
		border-color: var(--color-shell-border-default);
	}

	.btn-outline:hover:not(:disabled) {
		background: var(--color-bg-subtle);
		border-color: var(--color-shell-border-strong);
	}

	.btn-ghost {
		background: transparent;
		color: var(--color-fg-secondary);
		border-color: transparent;
		box-shadow: none;
	}

	.btn-ghost:hover:not(:disabled) {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.btn-link {
		background: transparent;
		color: var(--color-fg-secondary);
		text-decoration: none;
		border-color: transparent;
		box-shadow: none;
		padding: 0;
		height: auto;
	}

	.btn-link:hover:not(:disabled) {
		color: var(--color-fg-primary);
	}

	/* Sizes */
	.btn:not(.btn-sm):not(.btn-lg):not(.btn-icon):not(.btn-link) {
		height: 2.5rem;
		padding: 0.5rem 1.05rem;
		font-size: var(--text-body-sm);
	}

	.btn-sm {
		height: 2.15rem;
		padding: 0.25rem 0.85rem;
		font-size: var(--text-caption);
	}

	.btn-lg {
		height: 2.9rem;
		padding: 0.5rem 2rem;
		font-size: var(--text-body);
	}

	.btn-icon {
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
	}
</style>
