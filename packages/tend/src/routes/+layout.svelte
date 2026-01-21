<script lang="ts">
	import '../app.css';
	import { Database, Layers, Settings, Activity } from 'lucide-svelte';
	import { page } from '$app/stores';

	let { children, data } = $props();
</script>

<div class="app-layout">
	<!-- Minimal sidebar -->
	<aside class="sidebar">
		<div class="logo">
		<span class="logo-text">TEND</span>
		<span class="logo-vertical">DENTAL</span>
		</div>

		<nav class="nav">
			<a href="/" class="nav-item" class:active={$page.url.pathname === '/'}>
				<Database size={18} />
				<span>Database</span>
			</a>
			<a href="/sources" class="nav-item" class:active={$page.url.pathname === '/sources'}>
				<Layers size={18} />
				<span>Sources</span>
			</a>
		</nav>

		<div class="sidebar-footer">
			<a href="/settings" class="nav-item" class:active={$page.url.pathname === '/settings'}>
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
</style>
