<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { ExternalLink, Bot, Home } from 'lucide-svelte';

	let { data, children } = $props();

	const navItems = [
		{ href: '/', label: 'Home', icon: Home },
		{ href: '/dashboard', label: 'Agents', icon: Bot },
	];

	// Tufte: Remove navigation chrome on landing page
	$effect(() => {
		// Reactive check for current path
	});
</script>

<div class="app-shell" class:full-width={$page.url.pathname === '/'}>
	{#if $page.url.pathname !== '/'}
	<nav class="sidebar">
		<div class="sidebar-header">
			<div class="logo">
				<Bot size={24} />
				<span class="logo-text">Notion Agent</span>
			</div>
		</div>

		<div class="nav-items">
			{#each navItems as item}
				{@const Icon = item.icon}
				<a href={item.href} class="nav-item">
					<Icon size={18} />
					<span>{item.label}</span>
				</a>
			{/each}
		</div>

		<div class="sidebar-footer">
			{#if data.user}
				<div class="user-info">
					<span class="workspace-name">{data.user.notionWorkspaceId}</span>
				</div>
			{/if}
		<a href="https://createsomething.agency" target="_blank" rel="noopener" class="powered-by">
			<span>Powered by CREATE SOMETHING</span>
			<ExternalLink size={12} />
		</a>
	</div>
</nav>
	{/if}

	<main class="main-content">
		{@render children()}
	</main>
</div>

<style>
	.app-shell {
		display: flex;
		min-height: 100vh;
		background: var(--color-bg-base);
	}

	/* Tufte: Full-width for landing page - no navigation chrome */
	.app-shell.full-width {
		display: block;
	}

	.app-shell.full-width .main-content {
		max-width: none;
	}

	.sidebar {
		width: 240px;
		background: var(--color-bg-elevated);
		border-right: 1px solid var(--color-border-default);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
	}

	.sidebar-header {
		padding: var(--space-md);
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--color-fg-primary);
	}

	.logo-text {
		font-size: var(--text-body);
		font-weight: 600;
	}

	.nav-items {
		flex: 1;
		padding: var(--space-sm);
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		color: var(--color-fg-secondary);
		text-decoration: none;
		border-radius: var(--radius-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.nav-item:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.sidebar-footer {
		padding: var(--space-md);
		border-top: 1px solid var(--color-border-subtle);
	}

	.user-info {
		margin-bottom: var(--space-sm);
	}

	.workspace-name {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.powered-by {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.powered-by:hover {
		color: var(--color-fg-secondary);
	}

	.main-content {
		flex: 1;
		overflow: auto;
	}

	@media (max-width: 768px) {
		.sidebar {
			display: none;
		}
	}
</style>
