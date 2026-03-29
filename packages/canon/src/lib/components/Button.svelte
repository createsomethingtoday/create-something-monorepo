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
	/* Base Button */
	.btn {
		border-radius: 999px;
		border: 1px solid transparent;
		font-weight: var(--font-semibold);
		letter-spacing: 0.02em;
		transition:
			transform var(--duration-micro) var(--ease-standard),
			background var(--duration-micro) var(--ease-standard),
			border-color var(--duration-micro) var(--ease-standard),
			box-shadow var(--duration-micro) var(--ease-standard),
			color var(--duration-micro) var(--ease-standard);
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
		background: linear-gradient(180deg, #ffffff, #eceef7);
		color: #090909;
		border-color: rgba(255, 255, 255, 0.28);
		box-shadow: 0 10px 22px rgba(0, 0, 0, 0.16);
	}

	.btn-primary:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 14px 30px rgba(0, 0, 0, 0.22);
	}

	.btn-primary:active:not(:disabled) {
		transform: translateY(0);
	}

	/* Secondary Variant */
	.btn-secondary {
		background: color-mix(in srgb, var(--color-shell-surface-secondary) 88%, transparent);
		color: var(--color-fg-primary);
		border-color: var(--color-shell-border-default);
	}

	.btn-secondary:hover:not(:disabled) {
		transform: translateY(-1px);
		background: var(--color-shell-surface-hover);
		border-color: var(--color-shell-border-strong);
	}

	.btn-secondary:active:not(:disabled) {
		transform: translateY(0);
	}

	/* Ghost Variant */
	.btn-ghost {
		background: transparent;
		color: var(--color-fg-primary);
		border-color: var(--color-shell-border-subtle);
	}

	.btn-ghost:hover:not(:disabled) {
		transform: translateY(-1px);
		background: var(--color-hover);
		border-color: var(--color-shell-border-default);
	}

	.btn-ghost:active:not(:disabled) {
		transform: translateY(0);
	}

	/* Focus states for accessibility */
	a:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
</style>
