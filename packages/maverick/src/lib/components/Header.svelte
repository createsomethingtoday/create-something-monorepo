<script lang="ts">
	/**
	 * Header Component - Navigation with logo clip animation
	 * Maverick X Design System
	 *
	 * Logo Animation: On home page, full logo is visible.
	 * On internal pages, it contracts to just the "M" icon portion.
	 * The animation uses width-based clipping for a smooth reveal/hide effect.
	 */

	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';

	interface Props {
		onContactClick?: () => void;
	}

	let { onContactClick }: Props = $props();

	let mobileMenuOpen = $state(false);
	let showFullLogo = $state(true);

	// Check if we're on the home page
	const isHome = $derived($page.url.pathname === '/');

	// Logo dimensions based on SVG viewBox:
	// Full logo: 1875x407, Icon: 404x407
	// At 28px height, icon width = 28 * (404/407) ≈ 28px
	// At 28px height, full logo width = 28 * (1875/407) ≈ 129px
	const logoHeight = 28;
	const iconWidth = Math.round(logoHeight * (404 / 407)); // ~28px
	const fullLogoWidth = Math.round(logoHeight * (1875 / 407)); // ~129px

	// Handle logo animation based on page
	$effect(() => {
		if (!browser) return;

		if (isHome) {
			// Check if coming from internal page
			const wasOnInternal = sessionStorage.getItem('wasOnInternal') === 'true';
			sessionStorage.removeItem('wasOnInternal');
			sessionStorage.setItem('logoExpanded', 'true');

			if (wasOnInternal) {
				// Coming from internal - animate expansion after delay
				const timer = setTimeout(() => {
					showFullLogo = true;
				}, 600);
				return () => clearTimeout(timer);
			} else {
				showFullLogo = true;
			}
		} else {
			// Mark that we're on internal page
			sessionStorage.setItem('wasOnInternal', 'true');

			const wasExpanded = sessionStorage.getItem('logoExpanded') === 'true';

			if (wasExpanded) {
				// Coming from home - delay contraction
				const currentPath = $page.url.pathname;
				const timer = setTimeout(() => {
					if (browser && window.location.pathname === currentPath) {
						sessionStorage.removeItem('logoExpanded');
						showFullLogo = false;
					} else {
						sessionStorage.removeItem('logoExpanded');
					}
				}, 600);
				return () => clearTimeout(timer);
			} else {
				showFullLogo = false;
			}
		}
	});

	// Initialize logo state on mount
	onMount(() => {
		if (isHome) {
			const wasOnInternal = sessionStorage.getItem('wasOnInternal') === 'true';
			showFullLogo = !wasOnInternal;
		} else {
			const fromStorage = sessionStorage.getItem('logoExpanded') === 'true';
			showFullLogo = fromStorage;
		}
	});

	const navLinks = [
		{ href: '/oil-gas', label: 'Oil & Gas', external: false },
		{ href: '/mining', label: 'Mining & Metals', external: false },
		{ href: '/water-treatment', label: 'Water Treatment', external: false },
		{ href: 'https://jobs.lever.co/maverickx', label: 'Careers', external: true },
		{ href: '/news', label: 'News', external: false }
	];

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<header class="header">
	<div class="header-inner">
		<!-- Logo with width-based clip animation (left) -->
		<div
			class="logo-container"
			style="width: {fullLogoWidth}px; height: {logoHeight}px;"
		>
			<a
				href="/"
				class="logo-link"
			>
				<!-- Wrapper that clips - width animates to reveal/hide text -->
				<div
					class="logo-clipper"
					style="width: {showFullLogo ? fullLogoWidth : iconWidth}px; height: {logoHeight}px;"
				>
					<!-- Full logo SVG - always rendered, clipped by parent -->
					<img
						src="/images/full-logo.svg"
						alt="Maverick X"
						class="logo-image"
						style="height: {logoHeight}px; width: {fullLogoWidth}px;"
					/>
				</div>
			</a>
		</div>

		<!-- Desktop Navigation (centered) -->
		<nav class="nav-desktop">
			{#each navLinks as link}
				{#if link.external}
					<a
						href={link.href}
						class="nav-link"
						target="_blank"
						rel="noopener noreferrer"
					>
						{link.label}
					</a>
				{:else}
					<a
						href={link.href}
						class="nav-link"
						class:active={$page.url.pathname === link.href}
					>
						{link.label}
					</a>
				{/if}
			{/each}
		</nav>

		<!-- Contact Button (right) -->
		<div class="header-right">
			<button
				type="button"
				class="nav-contact group"
				onclick={onContactClick}
			>
				<span class="nav-contact-text">Contact</span>
				<span class="nav-contact-arrow">
					<svg class="nav-contact-icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
						<path d="M14.877 18.359l5.657-5.657a1 1 0 0 0 0-1.414l-5.657-5.657a1 1 0 0 0-1.402.012 1 1 0 0 0-.012 1.402l3.95 3.95H4.17a1 1 0 0 0-1 1 1 1 0 0 0 1 1h13.243l-3.95 3.95a1 1 0 0 0-.305.711 1 1 0 0 0 .293.716 1 1 0 0 0 .716.293 1 1 0 0 0 .711-.305z"/>
					</svg>
				</span>
			</button>
		</div>

		<!-- Mobile Menu Button -->
		<button
			type="button"
			class="mobile-menu-btn"
			onclick={toggleMobileMenu}
			aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
			aria-expanded={mobileMenuOpen}
		>
			{#if mobileMenuOpen}
				<Icon name="close" class="w-6 h-6" />
			{:else}
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			{/if}
		</button>
	</div>

	<!-- Mobile Navigation -->
	{#if mobileMenuOpen}
		<nav class="nav-mobile">
			{#each navLinks as link}
				{#if link.external}
					<a
						href={link.href}
						class="nav-mobile-link"
						target="_blank"
						rel="noopener noreferrer"
						onclick={closeMobileMenu}
					>
						{link.label}
					</a>
				{:else}
					<a
						href={link.href}
						class="nav-mobile-link"
						class:active={$page.url.pathname === link.href}
						onclick={closeMobileMenu}
					>
						{link.label}
					</a>
				{/if}
			{/each}
			<button
				type="button"
				class="nav-mobile-link"
				onclick={() => {
					closeMobileMenu();
					onContactClick?.();
				}}
			>
				Contact
			</button>
		</nav>
	{/if}
</header>

<style>
	.header {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		z-index: 50;
		height: 5rem;
	}

	@media (max-width: 767px) {
		.header {
			height: 3.5rem;
		}
	}

	.header-inner {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		max-width: 96rem;
		margin: 0 auto;
		padding: 0 3rem;
		position: relative;
	}

	@media (max-width: 767px) {
		.header-inner {
			padding: 0 1.25rem;
		}
	}

	.logo-container {
		position: absolute;
		left: 3rem;
		flex-shrink: 0;
	}

	@media (max-width: 767px) {
		.logo-container {
			left: 1.25rem;
		}
	}

	.logo-link {
		display: inline-block;
		transition: transform 0.3s ease;
	}

	.logo-link:hover {
		transform: scale(1.05);
	}

	.logo-clipper {
		overflow: hidden;
		transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.logo-image {
		max-width: none;
	}

	.nav-desktop {
		display: flex;
		align-items: center;
		gap: 2.5rem;
	}

	@media (max-width: 1023px) {
		.nav-desktop {
			display: none;
		}
	}

	.nav-link {
		font-size: 1rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.4);
		transition: all 0.3s ease;
	}

	.nav-link:hover {
		color: rgba(255, 255, 255, 0.7);
	}

	.nav-link.active {
		color: #ffffff;
	}

	.nav-link:active {
		transform: scale(0.95);
	}

	.header-right {
		position: absolute;
		right: 3rem;
	}

	@media (max-width: 767px) {
		.header-right {
			right: 1.25rem;
		}
	}

	@media (max-width: 1023px) {
		.header-right {
			display: none;
		}
	}

	.nav-contact {
		position: relative;
		display: inline-flex;
		align-items: center;
		height: 3rem;
		padding: 0 0.5rem 0 1rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: #212121;
		background: #ffffff;
		border: 1px solid #ffffff;
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.nav-contact:hover {
		background: #212121;
		color: #ffffff;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
	}

	.nav-contact-text {
		position: relative;
		z-index: 10;
		margin-right: auto;
	}

	.nav-contact-arrow {
		position: relative;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		margin-left: 1.5rem;
		background: #212121;
		transition: all 0.5s ease;
	}

	:global(.group:hover) .nav-contact-arrow {
		background: #ffffff;
		transform: scale(1.1);
	}

	.nav-contact-icon {
		width: 1.25rem;
		height: 1.25rem;
		fill: #ffffff;
		transition: all 0.5s ease;
	}

	:global(.group:hover) .nav-contact-icon {
		fill: #212121;
		transform: translateX(2px);
	}

	.mobile-menu-btn {
		display: none;
		position: absolute;
		right: 1.25rem;
		padding: 0.5rem;
		color: var(--color-fg-primary);
		background: #ffffff;
		border-radius: 50%;
		width: 2.75rem;
		height: 2.75rem;
		align-items: center;
		justify-content: center;
	}

	@media (max-width: 1023px) {
		.mobile-menu-btn {
			display: flex;
		}
	}

	.mobile-menu-btn :global(svg) {
		color: #212121;
	}

	.nav-mobile {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: #212121;
		padding: 6rem 1.25rem 2rem;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}

	.nav-mobile-link {
		display: flex;
		align-items: center;
		min-height: 2.75rem;
		padding: 0.75rem 0;
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 1.5rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.4);
		text-align: left;
		transition: color 0.2s ease;
	}

	.nav-mobile-link:hover,
	.nav-mobile-link.active {
		color: #ffffff;
	}
</style>
