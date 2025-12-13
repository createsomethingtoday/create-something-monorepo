<script lang="ts">
	/**
	 * Navigation - Law Firm Header
	 *
	 * Clear navigation for legal services.
	 * Trust signals visible, key pages accessible.
	 *
	 * Links: Practice Areas, Attorneys, Results, Contact
	 */

	import { page } from '$app/stores';
	import { getSiteConfigFromContext } from '$lib/config/context';
	import { onMount } from 'svelte';

	const siteConfig = getSiteConfigFromContext();

	let mobileMenuOpen = $state(false);
	let scrolled = $state(false);

	// Law firm navigation structure
	const navLinks = [
		{ href: '/practice-areas', label: 'Practice Areas' },
		{ href: '/attorneys', label: 'Our Attorneys' },
		{ href: '/results', label: 'Results' },
		{ href: '/about', label: 'About' },
		{ href: '/contact', label: 'Contact' }
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
		</div>
	{/if}
</nav>

<style>
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
		background: rgba(0, 0, 0, 0.9);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}

	.nav-container {
		max-width: var(--width-wide);
		margin: 0 auto;
		padding: var(--space-md) var(--space-lg);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.logo {
		text-decoration: none;
	}

	.logo-text {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-wider);
		text-transform: uppercase;
		opacity: 0.9;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.logo:hover .logo-text {
		opacity: 1;
	}

	.nav-links {
		display: none;
		gap: var(--space-xl);
	}

	@media (min-width: 768px) {
		.nav-links {
			display: flex;
		}
	}

	.nav-link {
		color: var(--color-fg-secondary);
		text-decoration: none;
		font-size: var(--text-caption);
		font-weight: var(--font-normal);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		opacity: 0.7;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.nav-link:hover,
	.nav-link.active {
		opacity: 1;
		color: var(--color-fg-primary);
	}

	/* Mobile menu button */
	.mobile-menu-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		padding: var(--space-xs);
		cursor: pointer;
		width: 44px;
		height: 44px;
	}

	@media (min-width: 768px) {
		.mobile-menu-btn {
			display: none;
		}
	}

	.hamburger {
		display: block;
		width: 20px;
		height: 1px;
		background: var(--color-fg-primary);
		position: relative;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.hamburger::before,
	.hamburger::after {
		content: '';
		position: absolute;
		width: 20px;
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
		padding: var(--space-lg);
		background: rgba(0, 0, 0, 0.95);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
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
		padding: var(--space-sm) 0;
		letter-spacing: var(--tracking-tight);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.mobile-nav-link:hover {
		opacity: 0.7;
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
		.hamburger,
		.hamburger::before,
		.hamburger::after,
		.animate-slide-down,
		.animate-fade-in {
			transition: none;
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
