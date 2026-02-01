<script lang="ts">
	/**
	 * Navigation Component
	 *
	 * Transparent header with logo and nav links
	 * Designed for overlay on hero sections
	 */

	import type { NavLink } from '$lib/config/site';

	interface Props {
		brandName: string;
		navLinks: NavLink[];
		logo?: string;
	}

	let { brandName, navLinks, logo }: Props = $props();
</script>

<header
	class="absolute top-0 left-0 w-full z-20 py-6 px-8 flex justify-between items-center border-b border-white/10 backdrop-blur-sm"
>
	<!-- Logo -->
	<div class="text-white">
		<a href="/" class="flex items-center gap-2">
			{#if logo}
				<img src={logo} alt={brandName} class="h-6" />
			{:else}
				<svg viewBox="0 0 50 50" width="24" height="24" fill="currentColor">
					<path d="M10 25 A 15 15 0 0 1 40 25" fill="none" stroke="currentColor" stroke-width="4"
					></path>
					<path d="M15 35 L 25 20 L 35 35" fill="none" stroke="currentColor" stroke-width="4"
					></path>
				</svg>
			{/if}
			<span class="font-bold text-xl tracking-widest">{brandName}</span>
		</a>
	</div>

	<!-- Desktop Nav -->
	<nav class="hidden md:flex gap-8 text-sm font-medium text-white/90">
		{#each navLinks as link}
			<a href={link.href} class="hover:text-white transition-colors">
				{link.label}
			</a>
		{/each}
	</nav>

	<!-- Mobile Menu Icon -->
	<button class="md:hidden text-white" aria-label="Open menu">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			class="w-6 h-6"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
			/>
		</svg>
	</button>
</header>
