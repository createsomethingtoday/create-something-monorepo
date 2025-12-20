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
		border-radius: var(--radius-md);
		border: none;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn:disabled {
		pointer-events: none;
		opacity: 0.5;
	}

	.btn:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	/* Variants */
	.btn-default {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.btn-default:hover:not(:disabled) {
		background: var(--color-fg-secondary);
	}

	.btn-secondary {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--color-bg-subtle);
		border-color: var(--color-border-emphasis);
	}

	.btn-destructive {
		background: var(--color-error);
		color: white;
	}

	.btn-destructive:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-outline {
		background: transparent;
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
	}

	.btn-outline:hover:not(:disabled) {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.btn-ghost {
		background: transparent;
		color: var(--color-fg-secondary);
	}

	.btn-ghost:hover:not(:disabled) {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.btn-link {
		background: transparent;
		color: var(--color-info);
		text-decoration: underline;
		text-underline-offset: 4px;
	}

	.btn-link:hover:not(:disabled) {
		opacity: 0.8;
	}

	/* Sizes */
	.btn-default:not(.btn-sm):not(.btn-lg):not(.btn-icon) {
		height: 2.25rem;
		padding: 0.5rem 1rem;
		font-size: var(--text-body-sm);
	}

	.btn-sm {
		height: 2rem;
		padding: 0.25rem 0.75rem;
		font-size: var(--text-caption);
	}

	.btn-lg {
		height: 2.5rem;
		padding: 0.5rem 2rem;
		font-size: var(--text-body);
	}

	.btn-icon {
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
	}
</style>
