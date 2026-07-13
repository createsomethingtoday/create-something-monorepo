<script lang="ts">
	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost';
		size?: 'sm' | 'md' | 'lg';
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
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

{#if href && !disabled}
	<a {href} class={baseClasses} role="button" {onclick}>
		{#if children}
			{@render children()}
		{/if}
	</a>
{:else}
	<button {type} {disabled} class={baseClasses} {onclick}>
		{#if children}
			{@render children()}
		{/if}
	</button>
{/if}

<style>
	.btn {
		border-radius: var(--radius-performance-sm);
		border: 1px solid transparent;
		font-weight: var(--font-performance-semibold);
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
		font-size: var(--text-performance-body-sm);
	}

	.btn-md {
		font-size: var(--text-performance-body);
	}

	.btn-lg {
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
		outline: 2px solid var(--color-performance-signal);
		outline-offset: 2px;
	}
</style>
