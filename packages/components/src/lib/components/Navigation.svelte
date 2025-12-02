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

<nav class="nav" class:fixed>
	<div class="max-w-7xl mx-auto px-6 py-4">
		<div class="flex items-center justify-between">
			<!-- Logo / Home -->
			<a href={logoHref} class="nav-logo text-xl font-bold tracking-tight">
				{logo}
				{#if logoSuffix}
					<span class="logo-suffix font-normal">{logoSuffix}</span>
				{/if}
			</a>

			<!-- Desktop Navigation Links -->
			<div class="hidden md:flex items-center gap-8">
				{#each links as link}
					<a
						href={link.href}
						class="nav-link text-sm font-medium"
						class:active={isActive(link)}
					>
						{link.label}
					</a>
				{/each}
				{#if ctaLabel && ctaHref}
					<a href={ctaHref} class="nav-cta px-6 py-2 text-sm font-semibold">
						{ctaLabel}
					</a>
				{/if}
			</div>

			<!-- Mobile Menu Button (44px minimum touch target) -->
			<button
				onclick={toggleMobileMenu}
				class="mobile-menu-btn md:hidden w-11 h-11 flex items-center justify-center"
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
				class="mobile-menu md:hidden pt-4 pb-2 flex flex-col gap-4 mt-4"
			>
				{#each links as link}
					<a
						href={link.href}
						onclick={closeMobileMenu}
						class="nav-link text-sm font-medium py-2"
						class:active={isActive(link)}
					>
						{link.label}
					</a>
				{/each}
				{#if ctaLabel && ctaHref}
					<a
						href={ctaHref}
						onclick={closeMobileMenu}
						class="nav-cta px-6 py-3 text-sm font-semibold text-center"
					>
						{ctaLabel}
					</a>
				{/if}
			</div>
		{/if}
	</div>
</nav>

<style>
	/* Navigation Container */
	.nav {
		border-bottom: 1px solid var(--color-border-default);
	}

	.nav.fixed {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: var(--z-fixed);
		background: var(--color-bg-pure);
	}

	/* Logo */
	.nav-logo {
		color: var(--color-fg-primary);
	}

	.logo-suffix {
		color: var(--color-fg-tertiary);
	}

	/* Navigation Links */
	.nav-link {
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.nav-link:hover,
	.nav-link.active {
		color: var(--color-fg-primary);
	}

	/* CTA Button */
	.nav-cta {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-full);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.nav-cta:hover {
		opacity: 0.9;
	}

	/* Mobile Menu Button */
	.mobile-menu-btn {
		color: var(--color-fg-primary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.mobile-menu-btn:hover {
		color: var(--color-fg-secondary);
	}

	/* Mobile Menu */
	.mobile-menu {
		border-top: 1px solid var(--color-border-default);
	}
</style>
