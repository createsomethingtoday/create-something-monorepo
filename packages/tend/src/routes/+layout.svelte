<script lang="ts">
	import '../app.css';
	import { Database, Layers, Settings, Menu, X } from 'lucide-svelte';
	import { page } from '$app/stores';

	let { children, data } = $props();
	
	let sidebarOpen = $state(false);
	
	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}
	
	function closeSidebar() {
		sidebarOpen = false;
	}
</script>

<div class="app-layout">
	<!-- Mobile header with hamburger -->
	<header class="mobile-header">
		<button class="menu-toggle" onclick={toggleSidebar} aria-label="Toggle menu">
			{#if sidebarOpen}
				<X size={24} />
			{:else}
				<Menu size={24} />
			{/if}
		</button>
		<span class="mobile-logo">TEND</span>
	</header>

	<!-- Overlay for mobile -->
	{#if sidebarOpen}
		<button class="sidebar-overlay" onclick={closeSidebar} aria-label="Close menu"></button>
	{/if}

	<!-- Minimal sidebar -->
	<aside class="sidebar" class:open={sidebarOpen}>
		<div class="logo">
		<span class="logo-text">TEND</span>
		<span class="logo-vertical">DENTAL</span>
		</div>

		<nav class="nav">
			<a href="/" class="nav-item" class:active={$page.url.pathname === '/'} onclick={closeSidebar}>
				<Database size={18} />
				<span>Database</span>
			</a>
			<a href="/sources" class="nav-item" class:active={$page.url.pathname === '/sources'} onclick={closeSidebar}>
				<Layers size={18} />
				<span>Sources</span>
			</a>
		</nav>

		<div class="sidebar-footer">
			<a href="/settings" class="nav-item" class:active={$page.url.pathname === '/settings'} onclick={closeSidebar}>
				<Settings size={18} />
				<span>Settings</span>
			</a>
		</div>
	</aside>

	<!-- Main content -->
	<main class="main-content">
		{@render children()}
	</main>
</div>

<style>
	.app-layout {
		display: flex;
		min-height: 100vh;
	}

	.sidebar {
		width: 200px;
		background: var(--color-bg-elevated);
		border-right: 1px solid var(--color-border-default);
		display: flex;
		flex-direction: column;
		padding: var(--space-sm);
	}

	.logo {
		padding: var(--space-sm);
		margin-bottom: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.logo-text {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		letter-spacing: -0.02em;
	}

	.logo-vertical {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.nav {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.nav-item:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
		opacity: 1;
	}

	.nav-item.active {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
	}

	.sidebar-footer {
		margin-top: auto;
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.main-content {
		flex: 1;
		padding: var(--space-lg);
		overflow-y: auto;
	}

	/* Mobile header - hidden on desktop */
	.mobile-header {
		display: none;
	}

	/* Sidebar overlay - hidden on desktop */
	.sidebar-overlay {
		display: none;
	}

	/* Mobile responsive styles */
	@media (max-width: 768px) {
		.app-layout {
			flex-direction: column;
		}

		.mobile-header {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-bg-elevated);
			border-bottom: 1px solid var(--color-border-default);
			position: sticky;
			top: 0;
			z-index: 50;
		}

		.menu-toggle {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 44px;
			height: 44px;
			background: transparent;
			border: none;
			color: var(--color-fg-primary);
			cursor: pointer;
			border-radius: var(--radius-md);
		}

		.menu-toggle:hover {
			background: var(--color-hover);
		}

		.mobile-logo {
			font-size: var(--text-h3);
			font-weight: 600;
			color: var(--color-fg-primary);
			letter-spacing: -0.02em;
		}

		.sidebar-overlay {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 90;
			border: none;
			cursor: pointer;
		}

		.sidebar {
			position: fixed;
			top: 0;
			left: -100%;
			height: 100vh;
			z-index: 100;
			transition: left var(--duration-standard) var(--ease-standard);
		}

		.sidebar.open {
			left: 0;
		}

		.main-content {
			padding: var(--space-md);
		}
	}
</style>
