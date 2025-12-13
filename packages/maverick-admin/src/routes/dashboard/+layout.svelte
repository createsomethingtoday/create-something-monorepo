<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const navItems = [
		{ href: '/dashboard', label: 'Overview', icon: 'home' },
		{ href: '/dashboard/solutions', label: 'Solutions', icon: 'beaker' },
		{ href: '/dashboard/news', label: 'News', icon: 'newspaper' },
		{ href: '/dashboard/testimonials', label: 'Testimonials', icon: 'quote' },
		{ href: '/dashboard/contacts', label: 'Contacts', icon: 'users' },
		{ href: '/dashboard/media', label: 'Media', icon: 'image' },
		{ href: '/dashboard/settings', label: 'Settings', icon: 'cog' },
	];

	function isActive(href: string, pathname: string): boolean {
		if (href === '/dashboard') return pathname === '/dashboard';
		return pathname.startsWith(href);
	}
</script>

<div class="dashboard-layout">
	<!-- Sidebar -->
	<aside class="sidebar">
		<!-- Logo -->
		<div class="sidebar-header">
			<a href="/dashboard" class="logo-text">MAVERICK X</a>
			<p class="logo-subtitle">Admin Portal</p>
		</div>

		<!-- Navigation -->
		<nav class="sidebar-nav">
			<ul class="nav-list">
				{#each navItems as item}
					{@const active = isActive(item.href, $page.url.pathname)}
					<li>
						<a
							href={item.href}
							class="nav-link"
							class:active
						>
							<span class="nav-label">{item.label}</span>
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<!-- User -->
		<div class="sidebar-footer">
			<div class="user-section">
				<span class="user-label">Admin</span>
				<a href="/api/auth/logout" class="logout-link">Logout</a>
			</div>
		</div>
	</aside>

	<!-- Main content -->
	<main class="main-content">
		{@render children()}
	</main>
</div>

<style>
	.dashboard-layout {
		min-height: 100vh;
		display: flex;
	}

	.sidebar {
		width: 16rem;
		display: flex;
		flex-direction: column;
		background: var(--color-bg-elevated);
		border-right: 1px solid var(--color-border-default);
	}

	.sidebar-header {
		padding: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.logo-text {
		font-size: var(--text-body-lg, 1.125rem);
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.logo-subtitle {
		font-size: var(--text-caption, 0.75rem);
		margin-top: 0.25rem;
		color: var(--color-fg-muted);
	}

	.sidebar-nav {
		flex: 1;
		padding: var(--space-sm);
	}

	.nav-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-xs);
		border-radius: var(--radius-lg);
		color: var(--color-fg-secondary);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.nav-link:hover {
		background: var(--color-hover);
	}

	.nav-link.active {
		background: var(--color-active);
		color: var(--color-fg-primary);
	}

	.nav-label {
		font-size: var(--text-body-sm, 0.875rem);
	}

	.sidebar-footer {
		padding: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.user-section {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.user-label {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-secondary);
	}

	.logout-link {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-muted);
	}

	.logout-link:hover {
		text-decoration: underline;
	}

	.main-content {
		flex: 1;
		overflow: auto;
	}
</style>
