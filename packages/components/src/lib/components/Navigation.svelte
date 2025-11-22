<script lang="ts">
	import { slide } from 'svelte/transition';

	interface NavLink {
		label: string;
		href: string;
	}

	interface Props {
		logo: string;
		logoSuffix?: string;
		logoHref?: string;
		links: NavLink[];
		currentPath?: string;
		fixed?: boolean;
		ctaLabel?: string;
		ctaHref?: string;
	}

	let {
		logo,
		logoSuffix,
		logoHref = '/',
		links,
		currentPath = $bindable('/'),
		fixed = false,
		ctaLabel,
		ctaHref
	}: Props = $props();

	let mobileMenuOpen = $state(false);

	function isActive(link: NavLink): boolean {
		if (link.href === '/') {
			return currentPath === '/';
		}
		return currentPath.startsWith(link.href);
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<nav class="{fixed ? 'fixed top-0 left-0 right-0 z-50 bg-black' : ''} border-b border-white/10">
	<div class="max-w-7xl mx-auto px-6 py-4">
		<div class="flex items-center justify-between">
			<!-- Logo / Home -->
			<a href={logoHref} class="text-xl font-bold tracking-tight">
				{logo}
				{#if logoSuffix}
					<span class="font-normal opacity-60">{logoSuffix}</span>
				{/if}
			</a>

			<!-- Desktop Navigation Links -->
			<div class="hidden md:flex items-center gap-8">
				{#each links as link}
					<a
						href={link.href}
						class="text-sm font-medium transition-colors {isActive(link)
							? 'text-white'
							: 'text-white/80 hover:text-white'}"
					>
						{link.label}
					</a>
				{/each}
				{#if ctaLabel && ctaHref}
					<a
						href={ctaHref}
						class="px-6 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-colors"
					>
						{ctaLabel}
					</a>
				{/if}
			</div>

			<!-- Mobile Menu Button (44px minimum touch target) -->
			<button
				onclick={toggleMobileMenu}
				class="md:hidden w-11 h-11 flex items-center justify-center text-white hover:text-white/80 transition-colors"
				aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
				aria-expanded={mobileMenuOpen}
			>
				{#if mobileMenuOpen}
					<!-- Close Icon (X) -->
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				{:else}
					<!-- Hamburger Icon -->
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				{/if}
			</button>
		</div>

		<!-- Mobile Menu -->
		{#if mobileMenuOpen}
			<div
				transition:slide={{ duration: 200 }}
				class="md:hidden pt-4 pb-2 flex flex-col gap-4 border-t border-white/10 mt-4"
			>
				{#each links as link}
					<a
						href={link.href}
						onclick={closeMobileMenu}
						class="text-sm font-medium transition-colors py-2 {isActive(link)
							? 'text-white'
							: 'text-white/80 hover:text-white'}"
					>
						{link.label}
					</a>
				{/each}
				{#if ctaLabel && ctaHref}
					<a
						href={ctaHref}
						onclick={closeMobileMenu}
						class="px-6 py-3 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-colors text-center"
					>
						{ctaLabel}
					</a>
				{/if}
			</div>
		{/if}
	</div>
</nav>
