<script lang="ts">
	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost';
		size?: 'sm' | 'md' | 'lg';
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		/** Prevent activation while an action is pending. */
		loading?: boolean;
		fullWidth?: boolean;
		children?: import('svelte').Snippet;
		onclick?: (event: MouseEvent) => void;
	}

	let {
		variant = 'primary',
		size = 'md',
		href,
		type = 'button',
		disabled = false,
		loading = false,
		fullWidth = false,
		children,
		onclick
	}: Props = $props();

	// Size classes - ALL guarantee 44px minimum touch target (layout utilities OK)
	const sizeClasses = {
		sm: 'btn-sm px-4 py-2.5 min-h-[44px]',
		md: 'btn-md px-6 py-3 min-h-[44px]',
		lg: 'btn-lg px-8 py-4 min-h-[44px]'
	};

	const baseClasses = $derived(
		`btn btn-${variant} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} flex items-center justify-center gap-2`
	);
</script>

{#if href && !disabled && !loading}
	<a {href} class={baseClasses} style:width={fullWidth ? '100%' : undefined} {onclick}>
		{#if children}
			{@render children()}
		{/if}
	</a>
{:else}
	<button {type} disabled={disabled || loading} aria-busy={loading || undefined} class={baseClasses} style:width={fullWidth ? '100%' : undefined} {onclick}>
		{#if children}
			{@render children()}
		{/if}
	</button>
{/if}

<style>
	.btn {
		display: inline-flex;
		min-height: var(--height-performance-control-min, 2.75rem);
		align-items: center;
		justify-content: center;
		gap: var(--space-performance-xs, 0.5rem);
		padding: var(--space-performance-sm, 0.75rem) var(--space-performance-md, 1.25rem);
		border-radius: var(--radius-performance-sm);
		border: 1px solid transparent;
		font-family:var(--font-performance-interface,inherit);
		font-weight: var(--font-performance-medium);
		text-decoration:none;
		box-sizing:border-box;
		letter-spacing: 0;
		transition:
			background var(--duration-performance-micro) var(--ease-performance-standard),
			border-color var(--duration-performance-micro) var(--ease-performance-standard),
			color var(--duration-performance-micro) var(--ease-performance-standard);
		-webkit-tap-highlight-color: transparent;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Size Variants */
	.btn-sm {
		padding:10px 16px;
		font-size: var(--text-performance-body-sm);
	}

	.btn-md {
		padding:12px 24px;
		font-size: var(--text-performance-body);
	}

	.btn-lg {
		padding:16px 32px;
		font-size: var(--text-performance-body-lg);
	}

	.btn-primary {
		background: var(--color-performance-ink);
		color: var(--color-performance-panel);
		border-color: var(--color-performance-ink);
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-performance-ink-soft);
		border-color: var(--color-performance-ink-soft);
	}

	.btn-secondary {
		background: var(--color-performance-panel);
		color: var(--color-performance-ink);
		border-color: var(--color-performance-line-strong);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--color-performance-court);
		border-color: var(--color-performance-ink);
	}

	.btn-ghost {
		background: transparent;
		color: var(--color-performance-ink);
		border-color: var(--color-performance-line);
	}

	.btn-ghost:hover:not(:disabled) {
		background: var(--color-performance-court);
		border-color: var(--color-performance-line-strong);
	}

	a:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.btn { transition:none; }
	}
</style>
