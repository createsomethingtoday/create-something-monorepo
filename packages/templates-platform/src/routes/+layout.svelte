<script lang="ts">
	import '../app.css';
	import { SkipToContent } from '@create-something/components';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
	let mobileMenuOpen = $state(false);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<svelte:head>
	<title>Templates | CREATE SOMETHING</title>
	<meta name="description" content="Beautiful website templates. Deploy in seconds." />
</svelte:head>

<div class="app">
	<SkipToContent />

	<!-- Canon Navigation -->
	<nav class="nav-container">
		<div class="nav-content">
			<a href="/" class="nav-logo">TEMPLATES</a>

			<!-- Desktop Navigation -->
			<div class="nav-links">
				<a href="/#templates" class="nav-link">Browse</a>
				<a href="/dashboard" class="nav-link">Dashboard</a>
				<a href="/dashboard" class="nav-cta">Get Started</a>
			</div>

			<!-- Mobile Menu Button -->
			<button
				onclick={toggleMobileMenu}
				class="nav-menu-btn"
				aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
				aria-expanded={mobileMenuOpen}
			>
				{#if mobileMenuOpen}
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				{:else}
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				{/if}
			</button>
		</div>

		<!-- Mobile Menu -->
		{#if mobileMenuOpen}
			<div class="nav-mobile animate-slide-down">
				<a href="/#templates" onclick={closeMobileMenu} class="nav-link">Browse</a>
				<a href="/dashboard" onclick={closeMobileMenu} class="nav-link">Dashboard</a>
				<a href="/dashboard" onclick={closeMobileMenu} class="nav-cta">Get Started</a>
			</div>
		{/if}
	</nav>

	<!-- Main Content -->
	<main id="main-content" class="main">
		{@render children()}
	</main>

	<!-- Canon Footer -->
	<footer class="footer">
		<div class="footer-content">
			<div class="footer-brand">
				<span class="footer-logo">TEMPLATES</span>
				<p class="footer-tagline">Beautiful sites. Zero friction.</p>
			</div>

			<div class="footer-links">
				<a href="https://createsomething.ltd" target="_blank" rel="noopener">Philosophy</a>
				<a href="https://createsomething.io" target="_blank" rel="noopener">Research</a>
				<a href="https://createsomething.space" target="_blank" rel="noopener">Practice</a>
				<a href="https://createsomething.agency" target="_blank" rel="noopener">Services</a>
			</div>

			<p class="footer-copyright">CREATE SOMETHING</p>
		</div>
	</footer>
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	/* Canon Navigation */
	.nav-container {
		border-bottom: 1px solid var(--color-border-default);
		background: var(--color-bg-pure);
	}

	.nav-content {
		max-width: 1280px;
		margin: 0 auto;
		padding: 1rem 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.nav-logo {
		font-size: 1.25rem;
		font-weight: var(--font-bold, 700);
		letter-spacing: -0.025em;
		color: var(--color-fg-primary);
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 2rem;
	}

	.nav-link {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium, 500);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.nav-link:hover {
		color: var(--color-fg-primary);
	}

	.nav-cta {
		padding: 0.5rem 1.5rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold, 600);
		border-radius: var(--radius-full);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.nav-cta:hover {
		opacity: 0.9;
	}

	.nav-menu-btn {
		display: none;
		width: 44px;
		height: 44px;
		align-items: center;
		justify-content: center;
		color: var(--color-fg-primary);
		background: transparent;
		border: none;
		cursor: pointer;
	}

	.nav-mobile {
		padding: 1rem 1.5rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		border-top: 1px solid var(--color-border-default);
	}

	.nav-mobile .nav-cta {
		text-align: center;
	}

	/* Main */
	.main {
		flex: 1;
	}

	/* Canon Footer */
	.footer {
		border-top: 1px solid var(--color-border-default);
		padding: var(--space-xl) var(--gutter);
		margin-top: auto;
	}

	.footer-content {
		max-width: 1280px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		text-align: center;
	}

	.footer-brand {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
	}

	.footer-logo {
		font-size: 1.25rem;
		font-weight: var(--font-bold, 700);
		letter-spacing: -0.025em;
		color: var(--color-fg-primary);
	}

	.footer-tagline {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-links {
		display: flex;
		gap: var(--space-md);
		flex-wrap: wrap;
		justify-content: center;
	}

	.footer-links a {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-links a:hover {
		color: var(--color-fg-primary);
	}

	.footer-copyright {
		font-size: var(--text-caption);
		color: var(--color-fg-subtle);
	}

	@media (max-width: 768px) {
		.nav-links {
			display: none;
		}

		.nav-menu-btn {
			display: flex;
		}
	}

	/* Animation */
	.animate-slide-down {
		animation: slideDown 0.2s ease-out forwards;
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

	@media (prefers-reduced-motion: reduce) {
		.animate-slide-down {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
