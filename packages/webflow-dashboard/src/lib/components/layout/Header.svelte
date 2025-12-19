<script lang="ts">
	import { Button } from '$lib/components/ui';
	import { LogOut, User } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast';

	interface Props {
		userEmail?: string;
	}

	let { userEmail }: Props = $props();

	async function handleLogout() {
		try {
			const response = await fetch('/api/auth/logout', { method: 'POST' });
			if (response.ok) {
				toast.success('Logged out successfully');
				goto('/login');
			} else {
				toast.error('Logout failed');
			}
		} catch {
			toast.error('Network error during logout');
		}
	}
</script>

<header class="header">
	<div class="header-inner">
		<div class="brand">
			<a href="/" class="logo">
				<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="logo-icon">
					<path d="M16.5 8.25V3L21 7.5V18.75L16.5 22.5V17.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					<path d="M7.5 8.25V3L3 7.5V18.75L7.5 22.5V17.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					<path d="M7.5 12H16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
				<span class="logo-text">Asset Dashboard</span>
			</a>
		</div>

		<nav class="nav">
			<a href="/" class="nav-link">Dashboard</a>
			<a href="/assets" class="nav-link">Assets</a>
			<a href="/marketplace" class="nav-link">Marketplace</a>
		</nav>

		<div class="user-section">
			{#if userEmail}
				<span class="user-email">
					<User size={16} />
					{userEmail}
				</span>
			{/if}
			<Button variant="ghost" size="sm" onclick={handleLogout}>
				<LogOut size={16} />
				<span>Logout</span>
			</Button>
		</div>
	</div>
</header>

<style>
	.header {
		position: sticky;
		top: 0;
		z-index: 100;
		background: var(--color-bg-pure);
		border-bottom: 1px solid var(--color-border-default);
	}

	.header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 1400px;
		margin: 0 auto;
		padding: 0.75rem 1.5rem;
	}

	.brand {
		display: flex;
		align-items: center;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-fg-primary);
		text-decoration: none;
	}

	.logo-icon {
		width: 1.75rem;
		height: 1.75rem;
		color: var(--webflow-blue);
	}

	.logo-text {
		font-family: var(--font-sans);
		font-weight: var(--font-semibold);
		font-size: var(--text-body-lg);
	}

	.nav {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.nav-link {
		padding: 0.5rem 0.75rem;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-decoration: none;
		border-radius: var(--radius-lg);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.nav-link:hover {
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	.user-section {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.user-email {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	@media (max-width: 768px) {
		.nav {
			display: none;
		}

		.user-email {
			display: none;
		}
	}
</style>
