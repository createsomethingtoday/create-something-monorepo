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

	const baseClasses = `btn btn-${variant} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} flex items-center justify-center gap-2`;
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
	/* Base Button */
	.btn {
		border-radius: var(--radius-full);
		font-weight: var(--font-semibold);
		transition: all var(--duration-micro) var(--ease-standard);
		-webkit-tap-highlight-color: transparent;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Size Variants */
	.btn-sm {
		font-size: var(--text-body-sm);
	}

	.btn-md {
		font-size: var(--text-body);
	}

	.btn-lg {
		font-size: var(--text-body-lg);
	}

	/* Primary Variant */
	.btn-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.9;
	}

	/* Secondary Variant */
	.btn-secondary {
		background: transparent;
		color: var(--color-fg-primary);
		border: 2px solid var(--color-fg-primary);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--color-active);
	}

	/* Ghost Variant */
	.btn-ghost {
		background: transparent;
		color: var(--color-fg-primary);
	}

	.btn-ghost:hover:not(:disabled) {
		background: var(--color-hover);
	}

	/* Focus states for accessibility */
	a:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
</style>
