<script lang="ts">
	/**
	 * Card Component
	 *
	 * Standardized card with variants following CREATE SOMETHING standards.
	 * Uses canonical CSS custom properties for all design tokens.
	 */

	type CardVariant = 'standard' | 'elevated' | 'outlined';
	type CardRadius = 'sm' | 'md' | 'lg' | 'xl';
	type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

	interface Props {
		variant?: CardVariant;
		radius?: CardRadius;
		padding?: CardPadding;
		hover?: boolean;
		href?: string;
		class?: string;
		children?: import('svelte').Snippet;
		onclick?: (event: MouseEvent) => void;
	}

	let {
		variant = 'standard',
		radius = 'lg',
		padding = 'lg',
		hover = false,
		href,
		class: className = '',
		children,
		onclick
	}: Props = $props();

	// Padding map using layout utilities (acceptable per CSS Architecture standard)
	const paddingMap = {
		none: '',
		sm: 'p-4',
		md: 'p-6',
		lg: 'p-8',
		xl: 'p-12'
	};

	const baseClasses = `card card-${variant} card-radius-${radius} ${hover ? 'card-hover' : ''} ${paddingMap[padding]} ${className}`;
</script>

{#if href}
	<a {href} class={baseClasses} {onclick}>
		{#if children}
			{@render children()}
		{/if}
	</a>
{:else if onclick}
	<button type="button" class={baseClasses} {onclick}>
		{#if children}
			{@render children()}
		{/if}
	</button>
{:else}
	<div class={baseClasses}>
		{#if children}
			{@render children()}
		{/if}
	</div>
{/if}

<style>
	/* Base Card */
	.card {
		transition: all var(--duration-standard) var(--ease-standard);
	}

	/* Variants */
	.card-standard {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
	}

	.card-elevated {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		box-shadow: var(--shadow-xl);
	}

	.card-outlined {
		background: transparent;
		border: 2px solid var(--color-border-emphasis);
	}

	/* Radius variants */
	.card-radius-sm {
		border-radius: var(--radius-sm);
	}

	.card-radius-md {
		border-radius: var(--radius-md);
	}

	.card-radius-lg {
		border-radius: var(--radius-lg);
	}

	.card-radius-xl {
		border-radius: var(--radius-xl);
	}

	/* Hover effect */
	.card-hover {
		cursor: pointer;
	}

	.card-hover:hover {
		transform: translateY(-8px);
		box-shadow: var(--shadow-2xl);
	}

	/* Focus states for accessibility */
	a:focus-visible,
	button:focus-visible,
	div:focus-visible {
		outline: 2px solid var(--color-fg-muted);
		outline-offset: 2px;
	}

	/* Reset button styles when used as card */
	button {
		border: none;
		background: none;
		font: inherit;
		text-align: inherit;
		cursor: pointer;
		width: 100%;
	}
</style>
