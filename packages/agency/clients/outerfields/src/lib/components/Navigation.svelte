<script lang="ts">
	/**
	 * OUTERFIELDS Navigation
	 *
	 * Fixed navigation with logo, links, and auth buttons
	 */
	import { Infinity, LogOut, User } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { NAV_LINKS } from '$lib/constants/navigation';

	interface Props {
		user?: {
			id: string;
			email: string;
			name: string;
			membership: boolean;
			createdAt: string;
		} | null;
	}

	let { user = null }: Props = $props();

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/';
	}
</script>

<header class="nav-header">
	<div class="nav-container">
		<div class="nav-left">
			<!-- Logo -->
			<a href="/" class="logo-link">
				<div class="logo-icon">
					<Infinity size={32} />
				</div>
				<span class="logo-text">OUTERFIELDS</span>
			</a>

			<!-- Desktop Nav Links -->
			<nav class="nav-links">
				{#each NAV_LINKS as link}
					<a
						href={link.href}
						class="nav-link"
						class:active={$page.url.pathname === link.href}
					>
						{link.label}
					</a>
				{/each}
			</nav>
		</div>

		<div class="nav-right">
			{#if user}
				<span class="user-info">
					<User size={16} />
					<span class="user-name">{user.name || user.email}</span>
					{#if user.membership}
						<span class="role-badge">Member</span>
					{/if}
				</span>
				<button class="btn-logout" onclick={handleLogout}>
					<LogOut size={16} />
					<span>Log Out</span>
				</button>
			{:else}
				<a href="/login" class="nav-link">Log In</a>
				<a href="/login" class="btn-primary">Get Started</a>
			{/if}
		</div>
	</div>
</header>

<style>
	.nav-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 50;
		padding: 1rem 1.5rem;
		background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), transparent);
		transition: background var(--duration-standard) var(--ease-standard);
	}

	.nav-container {
		max-width: 80rem;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.nav-left {
		display: flex;
		align-items: center;
		gap: 3rem;
	}

	.logo-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
		color: var(--color-fg-primary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.logo-link:hover {
		color: var(--color-primary);
	}

	.logo-icon {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-primary);
	}

	.logo-text {
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 2rem;
	}

	.nav-link {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.nav-link:hover,
	.nav-link.active {
		color: var(--color-fg-primary);
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
	}

	.user-info :global(svg) {
		opacity: 0.7;
	}

	.user-name {
		max-width: 150px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.role-badge {
		padding: 0.125rem 0.5rem;
		background: var(--color-primary);
		border-radius: 9999px;
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.btn-logout {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-logout:hover {
		background: var(--color-bg-surface);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	@media (max-width: 768px) {
		.nav-links {
			display: none;
		}

		.nav-right .nav-link {
			display: none;
		}

		.user-info .user-name {
			display: none;
		}

		.btn-logout span {
			display: none;
		}
	}
</style>
