<script lang="ts">
	/**
	 * Admin Layout - Maverick X CMS
	 *
	 * Philosophy: Zuhandenheit (ready-to-hand)
	 * The interface recedes. Only the content remains.
	 *
	 * No login required - direct access to CMS.
	 */

	import { page } from '$app/stores';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let sidebarOpen = $state(false);

	// Check if embedded mode (via query param)
	const isEmbedded = $derived($page.url.searchParams.get('embed') === 'true');
	const embedToken = $derived($page.url.searchParams.get('token'));

	// Navigation items
	const navigation = [{ name: 'Edit Pages', href: '/admin/content', icon: 'file-text' }];

	// Get current page name for breadcrumb
	const currentPage = $derived(
		navigation.find((item) => $page.url.pathname === item.href)?.name || 'Admin'
	);

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	function closeSidebar() {
		sidebarOpen = false;
	}
</script>

<a href="#main-content" class="skip-link">Skip to main content</a>

{#if isEmbedded}
	<!-- Embedded mode - No sidebar, just content -->
	<div class="admin-embed">
		<main id="main-content" class="admin-embed-main-full" tabindex="-1">
			{@render children()}
		</main>
	</div>
{:else}
	<!-- Normal mode - Full sidebar -->
	<div class="admin-shell">
		<!-- Mobile backdrop -->
		{#if sidebarOpen}
			<div class="admin-backdrop" onclick={closeSidebar} aria-hidden="true"></div>
		{/if}

		<!-- Sidebar -->
		<aside class="admin-sidebar" class:open={sidebarOpen}>
			<div class="admin-sidebar-inner">
				<!-- Logo -->
				<div class="admin-sidebar-header">
					<a href="/admin" class="admin-logo">
						<span class="admin-logo-text">Maverick X</span>
					</a>
					<button onclick={closeSidebar} class="admin-sidebar-close" aria-label="Close sidebar">
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<!-- Navigation -->
				<nav class="admin-nav">
					{#each navigation as item}
						{@const isActive = $page.url.pathname === item.href}
						<a
							href={item.href}
							class="admin-nav-link"
							class:active={isActive}
							onclick={closeSidebar}
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
							<span>{item.name}</span>
						</a>
					{/each}
				</nav>

				<!-- Back to site link -->
				<div class="admin-user">
					<a href="/" class="admin-btn-ghost w-full justify-start">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 19l-7-7m0 0l7-7m-7 7h18"
							/>
						</svg>
						Back to Site
					</a>
				</div>
			</div>
		</aside>

		<!-- Main content area -->
		<div class="admin-main">
			<!-- Top bar -->
			<header class="admin-header">
				<button onclick={toggleSidebar} class="admin-menu-btn" aria-label="Open menu">
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				</button>

				<!-- Breadcrumb -->
				<div class="admin-breadcrumb">
					<span class="admin-breadcrumb-root">Admin</span>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
					<span class="admin-breadcrumb-current">{currentPage}</span>
				</div>

				<div class="flex-1"></div>

				<a href="/" target="_blank" class="admin-view-site"> View Site → </a>
			</header>

			<!-- Page content -->
			<main id="main-content" class="admin-content" tabindex="-1">
				{@render children()}
			</main>
		</div>
	</div>
{/if}

<style>
	/* Admin Shell */
	.admin-shell {
		min-height: 100vh;
		background: var(--color-bg-pure, #000);
	}

	.admin-loading {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-pure, #000);
	}

	.admin-spinner {
		width: 2rem;
		height: 2rem;
		border: 2px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-top-color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Sidebar */
	.admin-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(4px);
	}

	@media (min-width: 1024px) {
		.admin-backdrop {
			display: none;
		}
	}

	.admin-sidebar {
		position: fixed;
		top: 0;
		left: 0;
		z-index: 50;
		height: 100%;
		width: 16rem;
		background: var(--color-bg-elevated, #0a0a0a);
		border-right: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		transform: translateX(-100%);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.admin-sidebar.open {
		transform: translateX(0);
	}

	@media (min-width: 1024px) {
		.admin-sidebar {
			transform: translateX(0);
		}
	}

	.admin-sidebar-inner {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.admin-sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 4rem;
		padding: 0 1rem;
		border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.admin-sidebar-close {
		padding: 0.5rem;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		transition: color 0.2s ease;
	}

	.admin-sidebar-close:hover {
		color: var(--color-fg-primary, #fff);
	}

	@media (min-width: 1024px) {
		.admin-sidebar-close {
			display: none;
		}
	}

	/* Logo */
	.admin-logo {
		display: flex;
		align-items: center;
	}

	.admin-logo-text {
		font-weight: 600;
		font-size: 1rem;
		color: var(--color-fg-primary, #fff);
		letter-spacing: -0.01em;
	}

	/* Navigation */
	.admin-nav {
		flex: 1;
		padding: 1rem;
		overflow-y: auto;
	}

	.admin-nav-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		transition: all 0.2s ease;
	}

	.admin-nav-link:hover {
		color: var(--color-fg-primary, #fff);
		background: var(--color-hover, rgba(255, 255, 255, 0.05));
	}

	.admin-nav-link.active {
		color: var(--color-fg-primary, #fff);
		background: var(--color-active, rgba(255, 255, 255, 0.1));
	}

	/* User section */
	.admin-user {
		padding: 1rem;
		border-top: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.admin-btn-ghost {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		width: 100%;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		transition: all 0.2s ease;
	}

	.admin-btn-ghost:hover {
		color: var(--color-fg-primary, #fff);
	}

	/* Main content area */
	.admin-main {
		min-height: 100vh;
	}

	@media (min-width: 1024px) {
		.admin-main {
			padding-left: 16rem;
		}
	}

	.admin-header {
		position: sticky;
		top: 0;
		z-index: 30;
		display: flex;
		align-items: center;
		height: 4rem;
		padding: 0 1rem;
		background: var(--color-bg-pure, #000);
		border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	@media (min-width: 1024px) {
		.admin-header {
			padding: 0 2.618rem;
		}
	}

	.admin-menu-btn {
		padding: 0.5rem;
		margin-right: 1rem;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		transition: color 0.2s ease;
	}

	.admin-menu-btn:hover {
		color: var(--color-fg-primary, #fff);
	}

	@media (min-width: 1024px) {
		.admin-menu-btn {
			display: none;
		}
	}

	.admin-breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.admin-breadcrumb-root {
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
	}

	.admin-breadcrumb svg {
		color: var(--color-fg-subtle, rgba(255, 255, 255, 0.2));
	}

	.admin-breadcrumb-current {
		color: var(--color-fg-primary, #fff);
		font-weight: 500;
	}

	.admin-view-site {
		font-size: 0.875rem;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		transition: color 0.2s ease;
	}

	.admin-view-site:hover {
		color: var(--color-fg-primary, #fff);
	}

	.admin-content {
		padding: 1rem;
	}

	@media (min-width: 1024px) {
		.admin-content {
			padding: 2.618rem;
		}
	}

	/* Embedded mode styles */
	.admin-embed {
		min-height: 100vh;
		background: var(--color-bg-pure, #000);
	}

	.admin-embed-main-full {
		padding: 1.618rem;
		overflow-y: auto;
	}
</style>
