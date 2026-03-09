<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from './ui';
	import Search from './Search.svelte';
	import DarkModeToggle from './DarkModeToggle.svelte';
	import { UserCircle } from 'lucide-svelte';

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
			<div class="header-brand-row">
				<a href="/dashboard" class="logo">
					<svg class="webflow-logo" width="38" height="24" viewBox="0 0 1080 674" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path fill-rule="evenodd" clip-rule="evenodd" d="M1080 0L735.386 673.684H411.696L555.916 394.481H549.445C430.464 548.934 252.942 650.61 0 673.684V398.344C0 398.344 161.813 388.787 256.939 288.776H0V0.0053214H288.771V237.515L295.253 237.489L413.255 0.0053214H631.645V236.009L638.126 235.999L760.556 0H1080Z" fill="currentColor"/>
					</svg>
					<span class="logo-text">Asset Dashboard</span>
				</a>

				<div class="header-right">
					<DarkModeToggle />
					{#if onProfileClick}
						<Button variant="secondary" onclick={onProfileClick}>
							<UserCircle size={20} />
							<span class="profile-text">Profile</span>
						</Button>
					{/if}
					{#if onLogout}
						<Button variant="secondary" onclick={onLogout}>Logout</Button>
					{/if}
				</div>
			</div>

			<nav class="nav-links" aria-label="Primary navigation">
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
	</div>

	{#if showSearch}
		<div class="search-mobile">
			<Search {onSearch} />
		</div>
	{/if}
</header>

<style>
	.header {
		position: sticky;
		top: 0;
		z-index: 100;
		border-bottom: 1px solid var(--color-shell-border-default);
		background: var(--color-shell-surface);
		box-shadow: var(--color-shell-shadow);
	}

	.header-content {
		max-width: 80rem;
		margin: 0 auto;
		padding: var(--space-sm) var(--space-md);
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	.header-left {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: var(--space-md);
		min-width: 0;
	}

	.header-brand-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: 0.45rem 0.9rem;
		border-radius: 999px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-shell-border-default);
		box-shadow: var(--shadow-sm);
		text-decoration: none;
		color: var(--color-info);
	}

	.webflow-logo {
		flex-shrink: 0;
	}

	.logo-text {
		font-family: var(--font-heading);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		letter-spacing: 0.01em;
		color: var(--color-fg-primary);
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		overflow-x: auto;
		padding-bottom: 0.125rem;
		scrollbar-width: none;
	}

	.nav-links::-webkit-scrollbar {
		display: none;
	}

	.nav-link {
		flex: 0 0 auto;
		padding: 0.5rem 0.9rem;
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		text-decoration: none;
		white-space: nowrap;
		border: 1px solid transparent;
		border-radius: 999px;
		transition:
			color var(--duration-micro) var(--ease-standard),
			background-color var(--duration-micro) var(--ease-standard),
			border-color var(--duration-micro) var(--ease-standard),
			box-shadow var(--duration-micro) var(--ease-standard);
	}

	.nav-link:hover {
		color: var(--color-fg-primary);
		background: var(--color-bg-subtle);
		border-color: var(--color-shell-border-default);
	}

	.nav-link.active {
		color: #ffffff;
		background: var(--color-info);
		border-color: var(--color-info);
		box-shadow: 0 8px 18px rgba(20, 110, 245, 0.16);
	}

	.nav-link:focus-visible {
		outline: none;
		box-shadow: 0 0 0 4px var(--color-info-muted);
	}

	.search-desktop {
		display: none;
		width: 100%;
		max-width: 25rem;
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
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.profile-text {
		display: none;
	}

	@media (min-width: 640px) {
		.profile-text {
			display: inline;
		}
	}

	@media (max-width: 767px) {
		.header-content {
			padding-bottom: var(--space-xs);
		}

		.header-right :global(button) {
			min-height: 2.5rem;
		}
	}

	@media (min-width: 768px) {
		.header-content {
			align-items: center;
		}

		.header-left {
			flex-direction: row;
			align-items: center;
			flex-wrap: wrap;
		}

		.header-brand-row {
			flex-wrap: nowrap;
		}

		.search-desktop {
			display: block;
		}

		.search-mobile {
			display: none;
		}
	}
</style>
