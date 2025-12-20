<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from './ui';
	import Search from './Search.svelte';
	import DarkModeToggle from './DarkModeToggle.svelte';

	interface Props {
		userEmail?: string;
		onLogout?: () => void;
		onProfileClick?: () => void;
		onSearch?: (term: string) => void;
		showSearch?: boolean;
	}

	let {
		userEmail,
		onLogout,
		onProfileClick,
		onSearch,
		showSearch = true
	}: Props = $props();

	const navItems = [
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/marketplace', label: 'Marketplace' },
		{ href: '/validation', label: 'Validation' }
	];
</script>

<header class="header">
	<div class="header-content">
		<div class="header-left">
			<a href="/dashboard" class="logo">
				<svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
					<rect width="40" height="40" rx="8" fill="var(--color-fg-primary)" />
					<path d="M28 14L20 26L12 14H28Z" fill="var(--color-bg-pure)" />
				</svg>
				<span class="logo-text">Asset Dashboard</span>
			</a>

			<nav class="nav-links">
				{#each navItems as item}
					<a
						href={item.href}
						class="nav-link"
						class:active={$page.url.pathname === item.href || $page.url.pathname.startsWith(item.href + '/')}
					>
						{item.label}
					</a>
				{/each}
			</nav>

			{#if showSearch}
				<div class="search-desktop">
					<Search {onSearch} />
				</div>
			{/if}
		</div>

		<div class="header-right">
			<DarkModeToggle />
			{#if onProfileClick}
				<Button variant="secondary" onclick={onProfileClick}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<circle cx="12" cy="10" r="3" />
						<path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
					</svg>
					<span class="profile-text">Profile</span>
				</Button>
			{/if}
			{#if onLogout}
				<Button variant="secondary" onclick={onLogout}>Logout</Button>
			{/if}
		</div>
	</div>

	{#if showSearch}
		<div class="search-mobile">
			<Search {onSearch} />
		</div>
	{/if}
</header>

<style>
	.header {
		border-bottom: 1px solid var(--color-border-default);
		background: var(--color-bg-surface);
	}

	.header-content {
		max-width: 80rem;
		margin: 0 auto;
		padding: var(--space-sm) var(--space-md);
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		text-decoration: none;
	}

	.logo-text {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.nav-links {
		display: none;
		align-items: center;
		gap: var(--space-xs);
	}

	@media (min-width: 768px) {
		.nav-links {
			display: flex;
		}
	}

	.nav-link {
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.nav-link:hover {
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	.nav-link.active {
		color: var(--color-fg-primary);
		background: var(--color-active);
	}

	.search-desktop {
		display: none;
		width: 18rem;
	}

	.search-mobile {
		display: block;
		width: 100%;
		padding: 0 var(--space-md) var(--space-sm);
	}

	@media (min-width: 768px) {
		.search-desktop {
			display: block;
		}
		.search-mobile {
			display: none;
		}
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.profile-text {
		display: none;
	}

	@media (min-width: 640px) {
		.profile-text {
			display: inline;
		}
	}
</style>
