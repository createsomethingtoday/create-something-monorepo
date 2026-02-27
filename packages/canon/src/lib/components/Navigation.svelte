<script lang="ts">
	import { UserMenu } from '../auth/components/index.js';
	import type { User } from '../auth/types.js';

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
		/** Current authenticated user (shows UserMenu when present) */
		user?: User | null;
		/** Called when user clicks logout in UserMenu */
		onLogout?: () => void;
		/** Login page URL (shown when no user) */
		loginHref?: string;
		/** Show login link when not authenticated */
		showLogin?: boolean;
		/** Account settings URL for UserMenu */
		accountHref?: string;
	}

	let {
		logo,
		logoSuffix,
		logoHref = '/',
		links,
		currentPath = $bindable('/'),
		fixed = false,
		ctaLabel,
		ctaHref,
		user = null,
		onLogout,
		loginHref = '/login',
		showLogin = false,
		accountHref = '/account'
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
	<div class="nav-inner shell-inner">
		<div class="flex items-center justify-between">
			<!-- Logo / Home -->
			<a href={logoHref} class="nav-logo">
				{logo}
				{#if logoSuffix}
					<span class="nav-logo-suffix">{logoSuffix}</span>
				{/if}
			</a>

			<!-- Desktop Navigation Links -->
			<div class="nav-desktop hidden lg:flex items-center gap-2 ml-8">
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
				{#if user}
					<UserMenu {user} onLogout={onLogout ?? (() => {})} settingsHref={accountHref} />
				{:else if showLogin}
					<a href={loginHref} class="nav-link">
						Sign in
					</a>
				{/if}
			</div>

			<!-- Mobile Menu Button (44px minimum touch target) -->
			<button
				onclick={toggleMobileMenu}
				class="nav-menu-button lg:hidden w-11 h-11 flex items-center justify-center"
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
			<div class="nav-mobile-menu animate-slide-down lg:hidden pt-4 pb-2 flex flex-col gap-4 mt-4">
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
				{#if user}
					<div class="nav-mobile-user">
						<span class="nav-mobile-user-email">{user.email}</span>
						<a href={accountHref} onclick={closeMobileMenu} class="nav-link py-2">
							Account
						</a>
						<button type="button" class="nav-mobile-logout" onclick={() => { closeMobileMenu(); onLogout?.(); }}>
							Sign out
						</button>
					</div>
				{:else if showLogin}
					<a href={loginHref} onclick={closeMobileMenu} class="nav-link py-2">
						Sign in
					</a>
				{/if}
			</div>
		{/if}
	</div>
</nav>

<style>
	/* Navigation Container */
	.nav-container {
		background: var(--color-shell-surface);
	}

	.nav-inner {
		padding: 0.875rem var(--container-padding, 1.5rem);
		display: flex;
		flex-direction: column;
	}

	.nav-fixed {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		width: 100%;
		z-index: var(--z-fixed);
		background-color: color-mix(in srgb, var(--color-shell-surface) 86%, transparent);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		box-shadow: var(--color-shell-shadow);
	}

	/* Logo */
	.nav-logo {
		font-size: 1.25rem;
		font-weight: var(--font-bold);
		letter-spacing: -0.02em;
		color: var(--color-fg-primary);
		text-decoration: none;
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
		text-decoration: none;
		border-radius: var(--radius-md);
		padding: 0.4rem 0.7rem;
		transition:
			color var(--duration-micro) var(--ease-standard),
			background-color var(--duration-micro) var(--ease-standard),
			border-color var(--duration-micro) var(--ease-standard);
	}

	.nav-link:hover {
		color: var(--color-fg-primary);
		background: var(--color-shell-surface-hover);
	}

	.nav-link.active {
		color: var(--color-fg-primary);
		background: var(--color-shell-surface-tertiary);
	}

	.nav-link:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	/* CTA Button */
	.nav-cta {
		padding: 0.5rem 1rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-lg);
		border: 1px solid transparent;
		text-decoration: none;
		transition:
			opacity var(--duration-micro) var(--ease-standard),
			transform var(--duration-micro) var(--ease-standard);
	}

	.nav-cta:hover {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.nav-cta:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.nav-desktop {
		background: color-mix(in srgb, var(--color-shell-surface-secondary) 88%, transparent);
		border-radius: var(--radius-full);
		padding: 0.25rem;
	}

	/* Mobile Menu Button */
	.nav-menu-button {
		color: var(--color-fg-primary);
		background: var(--color-shell-surface-tertiary);
		border-radius: var(--radius-md);
		transition:
			color var(--duration-micro) var(--ease-standard),
			background var(--duration-micro) var(--ease-standard),
			border-color var(--duration-micro) var(--ease-standard);
	}

	.nav-menu-button:hover {
		background: var(--color-shell-surface-hover);
		border-color: var(--color-shell-border-strong);
	}

	.nav-menu-button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	/* Mobile Menu */
	.nav-mobile-menu {
		background: var(--color-shell-surface-secondary);
		border-radius: var(--radius-lg);
		padding-left: var(--space-sm);
		padding-right: var(--space-sm);
		box-shadow: var(--color-shell-shadow);
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

	/* Mobile User Section */
	.nav-mobile-user {
		padding-top: var(--space-sm);
		margin-top: var(--space-sm);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.nav-mobile-user-email {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		padding: var(--space-xs) 0;
	}

	.nav-mobile-logout {
		background: none;
		border: none;
		color: var(--color-error);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		padding: var(--space-sm) 0;
		text-align: left;
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.nav-mobile-logout:hover {
		opacity: 0.8;
	}
</style>
