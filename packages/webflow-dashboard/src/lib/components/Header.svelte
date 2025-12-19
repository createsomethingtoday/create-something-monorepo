<script lang="ts">
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
</script>

<header class="header">
	<div class="header-content">
		<div class="header-left">
			<a href="/dashboard" class="logo">
				<svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
					<rect width="40" height="40" rx="8" fill="var(--webflow-blue)" />
					<path d="M28 14L20 26L12 14H28Z" fill="white" />
				</svg>
				<span class="logo-text">Asset Dashboard</span>
			</a>
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
				<Button variant="webflow" onclick={onLogout}>Logout</Button>
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
