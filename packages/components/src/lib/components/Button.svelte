<script lang="ts">
	import { getTransition } from '../tokens/animation.js';

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

	// Size classes - ALL guarantee 44px minimum touch target
	const sizeClasses = {
		sm: 'px-4 py-2.5 text-sm min-h-[44px]', // 44px minimum
		md: 'px-6 py-3 text-base min-h-[44px]', // 48px typical
		lg: 'px-8 py-4 text-lg min-h-[44px]' // 56px typical
	};

	// Variant classes
	const variantClasses = {
		primary: 'bg-white text-black hover:bg-white/90',
		secondary: 'bg-transparent text-white border-2 border-white hover:bg-white/10',
		ghost: 'bg-transparent text-white hover:bg-white/5'
	};

	const baseClasses = 'font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';

	const widthClass = fullWidth ? 'w-full' : '';

	const allClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass}`;
</script>

{#if href && !disabled}
	<a {href} class={allClasses} role="button" {onclick}>
		{#if children}
			{@render children()}
		{/if}
	</a>
{:else}
	<button {type} {disabled} class={allClasses} {onclick}>
		{#if children}
			{@render children()}
		{/if}
	</button>
{/if}

<style>
	/* Ensure focus states are visible */
	a:focus-visible,
	button:focus-visible {
		outline: 2px solid rgba(255, 255, 255, 0.8);
		outline-offset: 2px;
	}

	/* Guarantee touch target minimum */
	a,
	button {
		-webkit-tap-highlight-color: transparent;
	}
</style>
