<script lang="ts">
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

<nav class="nav-container" class:nav-fixed={fixed} aria-label="Primary">
	<div class="max-w-7xl mx-auto px-6 py-4">
		<div class="flex items-center justify-between">
			<!-- Logo / Home -->
			<a href={logoHref} class="nav-logo">
				{logo}
				{#if logoSuffix}
					<span class="nav-logo-suffix">{logoSuffix}</span>
				{/if}
			</a>

			<!-- Desktop Navigation Links -->
			<div class="hidden md:flex items-center gap-8 ml-8">
				{#each links as link}
					<a href={link.href} class="nav-link" class:active={isActive(link)}>
						{link.label}
					</a>
				{/each}
				{#if ctaLabel && ctaHref}
					<a href={ctaHref} class="nav-cta">
						{ctaLabel}
					</a>
				{/if}
			</div>

			<!-- Mobile Menu Button (44px minimum touch target) -->
			<button
				onclick={toggleMobileMenu}
				class="nav-menu-button md:hidden w-11 h-11 flex items-center justify-center"
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
			<div class="nav-mobile-menu animate-slide-down md:hidden pt-4 pb-2 flex flex-col gap-4 mt-4">
				{#each links as link}
					<a href={link.href} onclick={closeMobileMenu} class="nav-link py-2" class:active={isActive(link)}>
						{link.label}
					</a>
				{/each}
				{#if ctaLabel && ctaHref}
					<a href={ctaHref} onclick={closeMobileMenu} class="nav-cta text-center">
						{ctaLabel}
					</a>
				{/if}
			</div>
		{/if}
	</div>
</nav>

<style>
	/* Navigation Container */
	.nav-container {
		border-bottom: 1px solid var(--color-border-default);
		background: var(--color-bg-pure);
	}

	.nav-fixed {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		width: 100%;
		z-index: 50;
		background: var(--color-bg-pure);
	}

	/* Logo */
	.nav-logo {
		font-size: 1.25rem;
		font-weight: var(--font-bold);
		letter-spacing: -0.025em;
		color: var(--color-fg-primary);
	}

	.nav-logo-suffix {
		font-weight: normal;
		color: var(--color-fg-tertiary);
	}

	/* Navigation Links */
	.nav-link {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.nav-link:hover,
	.nav-link.active {
		color: var(--color-fg-primary);
	}

	/* CTA Button */
	.nav-cta {
		padding: 0.5rem 1.5rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-full);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.nav-cta:hover {
		opacity: 0.9;
	}

	/* Mobile Menu Button */
	.nav-menu-button {
		color: var(--color-fg-primary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.nav-menu-button:hover {
		color: var(--color-fg-secondary);
	}

	/* Mobile Menu */
	.nav-mobile-menu {
		border-top: 1px solid var(--color-border-default);
	}

	/* Slide down animation for mobile menu */
	.animate-slide-down {
		animation: slide-down 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	@keyframes slide-down {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-slide-down {
			animation: none;
		}
	}
</style>
