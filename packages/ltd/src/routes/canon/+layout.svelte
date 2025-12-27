<script lang="ts">
	import DocSidebar from '$lib/canon/DocSidebar.svelte';
	import { page } from '$app/stores';

	let { children } = $props();

	let mobileMenuOpen = $state(false);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	// Close mobile menu on route change
	$effect(() => {
		// Access page to trigger effect on route change
		$page.url.pathname;
		mobileMenuOpen = false;
	});
</script>

<svelte:head>
	<title>Canon Design System — CREATE SOMETHING</title>
	<meta
		name="description"
		content="The Canon Design System. A comprehensive, philosophically-grounded design system embodying 'weniger, aber besser' (less, but better)."
	/>
</svelte:head>

<div class="doc-layout">
	<DocSidebar mobileOpen={mobileMenuOpen} onClose={closeMobileMenu} />

	<!-- Mobile header -->
	<header class="mobile-header">
		<button class="menu-toggle" onclick={toggleMobileMenu} aria-label="Toggle navigation menu">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M3 12h18M3 6h18M3 18h18" />
			</svg>
		</button>
		<a href="/canon" class="mobile-logo">Canon</a>
	</header>

	<main class="doc-main">
		<article class="doc-content">
			{@render children()}
		</article>
	</main>
</div>

<style>
	.doc-layout {
		min-height: 100vh;
		background: var(--color-bg-pure);
	}

	/* Mobile header - positioned below main Navigation */
	.mobile-header {
		position: fixed;
		top: var(--header-height);
		left: 0;
		right: 0;
		height: 56px;
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: 0 var(--space-md);
		background: var(--color-bg-elevated);
		border-bottom: 1px solid var(--color-border-default);
		z-index: calc(var(--z-fixed) - 2);
	}

	@media (min-width: 1024px) {
		.mobile-header {
			display: none;
		}
	}

	.menu-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: transparent;
		border: none;
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		cursor: pointer;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.menu-toggle:hover {
		background: var(--color-hover);
	}

	.mobile-logo {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		text-decoration: none;
		letter-spacing: var(--tracking-tight);
	}

	/* Main content area */
	.doc-main {
		min-height: 100vh;
		padding-top: calc(var(--header-height) + 56px); /* Main nav + mobile header */
	}

	@media (min-width: 1024px) {
		.doc-main {
			margin-left: 280px; /* Sidebar width */
			padding-top: var(--header-height); /* Only main nav on desktop */
		}
	}

	.doc-content {
		max-width: 900px;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-md);
	}

	@media (min-width: 768px) {
		.doc-content {
			padding: var(--space-2xl) var(--space-xl);
		}
	}
</style>
