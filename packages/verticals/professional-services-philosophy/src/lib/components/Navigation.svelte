<script lang="ts">
	/**
	 * Navigation - Rudolf Template Style
	 *
	 * Layout: Logo left | Links center | CTA button right
	 * Features: Transparent on top, solid on scroll
	 *
	 * Props:
	 *   variant: 'dark' | 'light' - Initial background type
	 *     - 'dark': White text on transparent (for dark hero images)
	 *     - 'light': Dark text on transparent (for light backgrounds)
	 */

	import { page } from '$app/stores';
	import { siteConfig } from '$lib/config/context';
	import { onMount } from 'svelte';

	interface Props {
		variant?: 'dark' | 'light';
	}

	let { variant = 'dark' }: Props = $props();

	let mobileMenuOpen = $state(false);
	let scrolled = $state(false);

	const navLinks = [
		{ href: '/projects', label: 'Projects' },
		{ href: '/services', label: 'Services' },
		{ href: '/studio', label: 'About' },
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

<nav class="nav" class:nav--scrolled={scrolled} class:nav--light={variant === 'light'}>
	<div class="nav-container">
		<!-- Logo -->
		<a href="/" class="logo">
			{$siteConfig.name}
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

		<!-- CTA Button -->
		<a href="/contact" class="nav-cta">
			Let's Talk
		</a>

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
		<div class="mobile-menu">
			{#each navLinks as link}
				<a
					href={link.href}
					class="mobile-nav-link"
					onclick={() => (mobileMenuOpen = false)}
				>
					{link.label}
				</a>
			{/each}
			<a href="/contact" class="mobile-cta" onclick={() => (mobileMenuOpen = false)}>
				Let's Talk
			</a>
		</div>
	{/if}
</nav>

<style>
	.nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		background: transparent;
		transition: background 0.3s ease, box-shadow 0.3s ease;
	}

	.nav--scrolled {
		background: rgba(255, 255, 255, 0.98);
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.1);
	}

	.nav-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1.25rem 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.logo {
		font-size: 1.25rem;
		font-weight: 600;
		color: #000;
		text-decoration: none;
		letter-spacing: -0.01em;
	}

	.nav:not(.nav--scrolled) .logo {
		color: #fff;
	}

	/* Light variant: dark text on transparent for light backgrounds */
	.nav.nav--light:not(.nav--scrolled) .logo {
		color: #000;
	}

	.nav-links {
		display: none;
		gap: 2.5rem;
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
	}

	@media (min-width: 1024px) {
		.nav-links {
			display: flex;
		}
	}

	.nav-link {
		color: #000;
		text-decoration: none;
		font-size: 0.9rem;
		transition: opacity 0.3s;
	}

	.nav:not(.nav--scrolled) .nav-link {
		color: #fff;
	}

	.nav.nav--light:not(.nav--scrolled) .nav-link {
		color: #000;
	}

	.nav-link:hover,
	.nav-link.active {
		opacity: 0.6;
	}

	.nav-cta {
		display: none;
		padding: 0.75rem 1.5rem;
		background: #000;
		color: #fff;
		text-decoration: none;
		font-size: 0.9rem;
		border-radius: 100px;
		transition: all 0.3s ease;
	}

	.nav:not(.nav--scrolled) .nav-cta {
		background: #fff;
		color: #000;
	}

	.nav.nav--light:not(.nav--scrolled) .nav-cta {
		background: #000;
		color: #fff;
	}

	.nav-cta:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	@media (min-width: 768px) {
		.nav-cta {
			display: inline-block;
		}
	}

	/* Mobile menu button */
	.mobile-menu-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		padding: 0.5rem;
		cursor: pointer;
		width: 44px;
		height: 44px;
	}

	@media (min-width: 1024px) {
		.mobile-menu-btn {
			display: none;
		}
	}

	.hamburger {
		display: block;
		width: 22px;
		height: 2px;
		background: #000;
		position: relative;
		transition: background 0.2s;
	}

	.nav:not(.nav--scrolled) .hamburger {
		background: #fff;
	}

	.nav:not(.nav--scrolled) .hamburger::before,
	.nav:not(.nav--scrolled) .hamburger::after {
		background: #fff;
	}

	/* Light variant hamburger */
	.nav.nav--light:not(.nav--scrolled) .hamburger {
		background: #000;
	}

	.nav.nav--light:not(.nav--scrolled) .hamburger::before,
	.nav.nav--light:not(.nav--scrolled) .hamburger::after {
		background: #000;
	}

	.hamburger::before,
	.hamburger::after {
		content: '';
		position: absolute;
		width: 22px;
		height: 2px;
		background: #000;
		transition: transform 0.2s;
	}

	.hamburger::before {
		top: -7px;
	}

	.hamburger::after {
		top: 7px;
	}

	.hamburger.open {
		background: transparent;
	}

	.hamburger.open::before {
		background: #000;
		transform: rotate(45deg) translate(5px, 5px);
	}

	.hamburger.open::after {
		background: #000;
		transform: rotate(-45deg) translate(5px, -5px);
	}

	/* Mobile menu */
	.mobile-menu {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
		background: #fff;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
	}

	@media (min-width: 1024px) {
		.mobile-menu {
			display: none;
		}
	}

	.mobile-nav-link {
		color: #000;
		text-decoration: none;
		font-size: 1.25rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	}

	.mobile-nav-link:hover {
		opacity: 0.6;
	}

	.mobile-cta {
		display: inline-block;
		padding: 1rem 2rem;
		background: #000;
		color: #fff;
		text-decoration: none;
		font-size: 1rem;
		border-radius: 100px;
		text-align: center;
		margin-top: 1.5rem;
	}
</style>
