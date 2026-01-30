<script lang="ts">
	/**
	 * Navigation - Personal Injury Header
	 *
	 * Clear navigation for PI services.
	 * Trust signals visible, key pages accessible.
	 *
	 * Links: Case Types, Attorneys, Results, About, Free Case Review
	 */

	import { page } from '$app/stores';
	import { getSiteConfigFromContext } from '$lib/config/context';
	import { onMount } from 'svelte';

	const siteConfig = getSiteConfigFromContext();

	let mobileMenuOpen = $state(false);
	let scrolled = $state(false);

	// PI navigation structure
	const navLinks = [
		{ href: '/accident-types', label: 'Case Types' },
		{ href: '/attorneys', label: 'Our Attorneys' },
		{ href: '/results', label: 'Results' },
		{ href: '/about', label: 'About' }
	];

	onMount(() => {
		function handleScroll() {
			scrolled = window.scrollY > 50;
		}

		window.addEventListener('scroll', handleScroll, { passive: true });
		handleScroll();

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});
</script>

<nav class="nav" class:nav--scrolled={scrolled}>
	<div class="nav-container">
		<a href="/" class="logo">
			<span class="logo-text">{siteConfig.name}</span>
		</a>

		<!-- Desktop Navigation -->
		<div class="nav-links">
			{#each navLinks as link}
				<a
					href={link.href}
					class="nav-link"
					class:active={$page.url.pathname === link.href ||
						$page.url.pathname.startsWith(link.href + '/')}
				>
					{link.label}
				</a>
			{/each}
			<a href="/free-case-review" class="nav-cta">Free Case Review</a>
		</div>

		<!-- Mobile Menu Button -->
		<button
			class="mobile-menu-btn"
			onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
			aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
			aria-expanded={mobileMenuOpen}
		>
			<span class="hamburger" class:open={mobileMenuOpen}></span>
		</button>
	</div>

	<!-- Mobile Menu -->
	{#if mobileMenuOpen}
		<div class="mobile-menu animate-slide-down">
			{#each navLinks as link, index}
				<a
					href={link.href}
					class="mobile-nav-link animate-fade-in"
					onclick={() => (mobileMenuOpen = false)}
					style="--delay: {index}"
				>
					{link.label}
				</a>
			{/each}
			<a
				href="/free-case-review"
				class="mobile-nav-cta animate-fade-in"
				onclick={() => (mobileMenuOpen = false)}
				style="--delay: {navLinks.length}"
			>
				Free Case Review
			</a>
		</div>
	{/if}
</nav>

<style>
	/*
	 * Navigation - Golden Ratio Applied
	 *
	 * φ-based spacing tokens:
	 * --space-xs: 0.5rem (8px)
	 * --space-sm: 1rem (16px)
	 * --space-md: 1.618rem (26px)
	 * --space-lg: 2.618rem (42px)
	 * --space-xl: 4.236rem (68px)
	 */

	.nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: var(--z-sticky);
		background: transparent;
		transition: background var(--duration-standard) var(--ease-standard);
	}

	.nav--scrolled {
		background: var(--color-bg-elevated);
		backdrop-filter: blur(10px);
	}

	.nav-container {
		width: 100%;
		max-width: var(--container-xl);
		margin: 0 auto;
		padding: var(--space-sm) var(--space-lg);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.logo {
		display: flex;
		align-items: center;
		text-decoration: none;
	}

	.logo-text {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-wider);
		text-transform: uppercase;
		text-align: center;
		opacity: 0.9;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.logo:hover .logo-text {
		opacity: 1;
	}

	.nav-links {
		display: none;
		align-items: center;
		gap: var(--space-lg);
	}

	@media (min-width: 768px) {
		.nav-links {
			display: flex;
		}
	}

	.nav-link {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-fg-secondary);
		text-decoration: none;
		font-size: var(--text-body-sm);
		font-weight: var(--font-normal);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		text-align: center;
		opacity: 0.7;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.nav-link:hover,
	.nav-link.active {
		opacity: 1;
		color: var(--color-fg-primary);
	}

	.nav-cta {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px var(--space-sm);
		margin-left: var(--space-sm);
		background: var(--color-success);
		color: var(--color-bg-pure);
		text-decoration: none;
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		text-align: center;
		border-radius: var(--radius-sm);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.nav-cta:hover {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	/* Mobile menu button - 44px min touch target */
	.mobile-menu-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		padding: var(--space-xs);
		cursor: pointer;
		width: var(--space-lg);
		height: var(--space-lg);
	}

	@media (min-width: 768px) {
		.mobile-menu-btn {
			display: none;
		}
	}

	.hamburger {
		display: block;
		width: var(--space-sm);
		height: 1px;
		background: var(--color-fg-primary);
		position: relative;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.hamburger::before,
	.hamburger::after {
		content: '';
		position: absolute;
		width: var(--space-sm);
		height: 1px;
		background: var(--color-fg-primary);
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.hamburger::before {
		top: -6px;
	}

	.hamburger::after {
		top: 6px;
	}

	.hamburger.open {
		background: transparent;
	}

	.hamburger.open::before {
		transform: rotate(45deg) translate(4px, 4px);
	}

	.hamburger.open::after {
		transform: rotate(-45deg) translate(4px, -4px);
	}

	/* Mobile menu */
	.mobile-menu {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		padding: var(--space-md) var(--space-md) var(--space-lg);
		background: var(--color-bg-elevated);
		backdrop-filter: blur(20px);
	}

	@media (min-width: 768px) {
		.mobile-menu {
			display: none;
		}
	}

	.mobile-nav-link {
		color: var(--color-fg-primary);
		text-decoration: none;
		font-size: var(--text-h3);
		font-weight: var(--font-light);
		padding: var(--space-xs) 0;
		letter-spacing: var(--tracking-tight);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.mobile-nav-link:hover {
		opacity: 0.7;
	}

	.mobile-nav-cta {
		display: block;
		margin-top: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-success);
		color: var(--color-bg-pure);
		text-decoration: none;
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		text-align: center;
		border-radius: var(--radius-sm);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.mobile-nav-cta:hover {
		background: var(--color-fg-primary);
	}

	/* Animations */
	.animate-slide-down {
		animation: slideDown 0.2s ease-out forwards;
	}

	.animate-fade-in {
		opacity: 0;
		animation: fadeIn 0.15s ease-out forwards;
		animation-delay: calc(var(--delay, 0) * 50ms);
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes fadeIn {
		to {
			opacity: 1;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.nav,
		.logo-text,
		.nav-link,
		.nav-cta,
		.hamburger,
		.hamburger::before,
		.hamburger::after,
		.mobile-nav-cta,
		.animate-slide-down,
		.animate-fade-in {
			transition: none;
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
