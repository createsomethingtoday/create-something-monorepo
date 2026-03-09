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
		<div class="header-main">
			<div class="nav-cluster">
				<div class="brand-lockup">
				<a href="/dashboard" class="logo">
					<svg class="webflow-logo" width="38" height="24" viewBox="0 0 1080 674" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path fill-rule="evenodd" clip-rule="evenodd" d="M1080 0L735.386 673.684H411.696L555.916 394.481H549.445C430.464 548.934 252.942 650.61 0 673.684V398.344C0 398.344 161.813 388.787 256.939 288.776H0V0.0053214H288.771V237.515L295.253 237.489L413.255 0.0053214H631.645V236.009L638.126 235.999L760.556 0H1080Z" fill="currentColor"/>
					</svg>
					<span class="logo-text">Asset Dashboard</span>
				</a>
					{#if userEmail}
						<span class="user-chip">{userEmail}</span>
					{/if}
				</div>

				<nav class="nav-links" aria-label="Primary navigation">
				{#each navItems as item}
					<a
						href={item.href}
						class="nav-link"
						class:active={$page.url.pathname === item.href || $page.url.pathname.startsWith(item.href + '/')}
						aria-current={$page.url.pathname === item.href || $page.url.pathname.startsWith(item.href + '/') ? 'page' : undefined}
					>
						{item.label}
					</a>
				{/each}
				</nav>
			</div>

			<div class="utility-cluster">
				{#if showSearch}
					<div class="search-desktop">
						<Search {onSearch} />
					</div>
				{/if}

				<div class="header-right">
					<DarkModeToggle />
					{#if onProfileClick}
						<Button variant="ghost" class="header-action" onclick={onProfileClick}>
							<UserCircle size={18} />
							<span class="profile-text">Profile</span>
						</Button>
					{/if}
					{#if onLogout}
						<Button variant="ghost" class="header-action" onclick={onLogout}>Logout</Button>
					{/if}
				</div>
			</div>
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
		max-width: 82rem;
		margin: 0 auto;
		padding: 0.875rem var(--space-md);
	}

	.header-main {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		min-width: 0;
	}

	.nav-cluster {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		min-width: 0;
	}

	.brand-lockup {
		display: flex;
		align-items: center;
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
		flex-shrink: 0;
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

	.user-chip {
		display: none;
		padding: 0.25rem 0.625rem;
		border-radius: 999px;
		border: 1px solid var(--color-shell-border-default);
		background: var(--color-bg-surface);
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		white-space: nowrap;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem;
		border: 1px solid var(--color-shell-border-default);
		border-radius: 999px;
		background: var(--color-bg-surface);
		overflow-x: auto;
		scrollbar-width: none;
		box-shadow: var(--shadow-sm);
	}

	.nav-links::-webkit-scrollbar {
		display: none;
	}

	.nav-link {
		flex: 0 0 auto;
		padding: 0.625rem 1rem;
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
	}

	.nav-link.active {
		color: #ffffff;
		background: var(--color-info);
		border-color: var(--color-info);
		box-shadow: none;
	}

	.nav-link:focus-visible {
		outline: none;
		box-shadow: 0 0 0 4px var(--color-info-muted);
	}

	.search-desktop {
		display: block;
		width: min(22rem, 100%);
	}

	.search-mobile {
		display: block;
		width: 100%;
		padding: 0 var(--space-md) 0.875rem;
	}

	.utility-cluster {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
		flex: 1;
		min-width: 0;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		justify-content: flex-end;
		flex-shrink: 0;
	}

	.header-right :global(.header-action) {
		height: 2.5rem;
		padding-inline: 0.9rem;
		color: var(--color-fg-secondary);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-shell-border-default);
		box-shadow: none;
	}

	.header-right :global(.header-action:hover:not(:disabled)) {
		background: var(--color-bg-subtle);
		border-color: var(--color-shell-border-strong);
		transform: none;
	}

	.profile-text {
		display: inline;
	}

	@media (min-width: 900px) {
		.user-chip {
			display: inline-flex;
		}
	}

	@media (max-width: 767px) {
		.header-content {
			padding-bottom: var(--space-sm);
		}

		.header-main {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}

		.nav-cluster,
		.utility-cluster {
			flex-direction: column;
			align-items: stretch;
		}

		.brand-lockup,
		.header-right {
			justify-content: space-between;
		}

		.search-desktop {
			display: none;
		}

		.profile-text {
			display: none;
		}

		.header-right :global(.header-action) {
			padding-inline: 0.75rem;
		}
	}

	@media (min-width: 768px) {
		.search-mobile {
			display: none;
		}
	}
</style>
