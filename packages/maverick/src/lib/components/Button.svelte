<script lang="ts">
	/**
	 * Button Component - Maverick X Design System
	 * Features shine effect on hover and animated arrow
	 */

	import Icon from './Icon.svelte';

	interface Props {
		title: string;
		href?: string;
		onclick?: () => void;
		arrow?: boolean;
		light?: boolean;
		class?: string;
	}

	let { title, href, onclick, arrow = false, light = false, class: className = '' }: Props = $props();

	const baseClasses =
		'btn group relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 transition-all';

	const lightClasses =
		'border-w-50 bg-w-50 text-g-500 hover:bg-g-500 hover:text-white hover:shadow-lg hover:shadow-black/20';

	const darkClasses =
		'border-g-500 bg-g-500 text-w-50 hover:bg-white hover:text-g-500 hover:shadow-lg hover:shadow-black/20';

	const buttonClasses = $derived(`${baseClasses} ${light ? lightClasses : darkClasses} ${className}`);
</script>

{#if href}
	<a {href} class={buttonClasses} {onclick}>
		<!-- Shine effect on hover -->
		<span class="shine-effect"></span>

		<!-- Button content -->
		<span class="relative z-10 mr-auto">{title}</span>

		{#if arrow}
			<span
				class="relative z-10 flex items-center justify-center w-8 h-8 ml-6 -mr-3 transition-all duration-slow transform group-hover:scale-110 {light
					? 'bg-g-500 group-hover:bg-white'
					: 'bg-white group-hover:bg-g-500'}"
			>
				<span class="animate-bounce-x">
					<Icon
						name="arrow-right"
						class="!w-5 !h-5 transition-all duration-slow transform group-hover:translate-x-0.5 {light
							? 'text-white group-hover:text-g-500'
							: 'text-g-500 group-hover:text-white'}"
					/>
				</span>
			</span>
		{/if}
	</a>
{:else}
	<button type="button" class={buttonClasses} {onclick}>
		<!-- Shine effect on hover -->
		<span class="shine-effect"></span>

		<!-- Button content -->
		<span class="relative z-10 mr-auto">{title}</span>

		{#if arrow}
			<span
				class="relative z-10 flex items-center justify-center w-8 h-8 ml-6 -mr-3 transition-all duration-slow transform group-hover:scale-110 {light
					? 'bg-g-500 group-hover:bg-white'
					: 'bg-white group-hover:bg-g-500'}"
			>
				<span class="animate-bounce-x">
					<Icon
						name="arrow-right"
						class="!w-5 !h-5 transition-all duration-slow transform group-hover:translate-x-0.5 {light
							? 'text-white group-hover:text-g-500'
							: 'text-g-500 group-hover:text-white'}"
					/>
				</span>
			</span>
		{/if}
	</button>
{/if}

<style>
	.shine-effect {
		position: absolute;
		inset: 0;
		background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent);
		transform: translateX(-100%);
		opacity: 0;
		transition:
			transform 0.6s ease-in-out,
			opacity 0.6s ease-in-out;
	}

	:global(.group:hover) .shine-effect {
		transform: translateX(100%);
		opacity: 1;
	}
</style>
