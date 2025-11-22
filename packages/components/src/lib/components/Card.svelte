<script lang="ts">
	/**
	 * Card Component
	 *
	 * Standardized card with variants following CREATE SOMETHING standards.
	 * Uses golden ratio spacing and defined border radius scale.
	 *
	 * @see /STANDARDS.md - Section 1.3 Spacing System, 1.4 Border Radius
	 */

	import { getRadius } from '../tokens/radius.js';
	import { getSpacing } from '../tokens/spacing.js';

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

	// Variant styles
	const variantClasses = {
		standard: 'bg-[#0a0a0a] border border-white/10',
		elevated: 'bg-[#0a0a0a] border border-white/10 shadow-xl',
		outlined: 'bg-transparent border-2 border-white/20'
	};

	// Padding map using golden ratio spacing
	const paddingMap = {
		none: '',
		sm: 'p-4', // 1rem
		md: 'p-6', // 1.5rem
		lg: 'p-8', // 2rem (approximately space-lg)
		xl: 'p-12' // 3rem
	};

	// Hover effect
	const hoverClass = hover
		? 'transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-2xl cursor-pointer'
		: '';

	// Border radius
	const radiusClass = `rounded-[${getRadius(radius)}]`;

	const allClasses = `${variantClasses[variant]} ${paddingMap[padding]} ${radiusClass} ${hoverClass} ${className}`;
</script>

{#if href}
	<a {href} class={allClasses} {onclick}>
		{#if children}
			{@render children()}
		{/if}
	</a>
{:else if onclick}
	<button type="button" class={allClasses} {onclick}>
		{#if children}
			{@render children()}
		{/if}
	</button>
{:else}
	<div class={allClasses}>
		{#if children}
			{@render children()}
		{/if}
	</div>
{/if}

<style>
	/* Focus states for accessibility */
	a:focus-visible,
	button:focus-visible,
	div:focus-visible {
		outline: 2px solid rgba(255, 255, 255, 0.8);
		outline-offset: 2px;
	}

	/* Smooth transitions */
	a,
	button,
	div {
		transition-property: transform, box-shadow;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
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
