<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	const navItems = [
		{ href: '/admin', label: 'Dashboard', icon: 'chart' },
		{ href: '/admin/observability', label: 'Observability', icon: 'pulse' },
		{ href: '/admin/experiments', label: 'Experiments', icon: 'beaker' },
		{ href: '/admin/submissions', label: 'Submissions', icon: 'inbox' },
		{ href: '/admin/subscribers', label: 'Subscribers', icon: 'users' },
		{ href: '/admin/analytics', label: 'Analytics', icon: 'graph' }
	];

	async function logout() {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			goto('/admin/login');
		} catch (error) {
			console.error('Logout error:', error);
		}
	}
</script>

{#if $page.url.pathname === '/admin/login'}
	<slot />
{:else}
	<div class="admin-layout">
		<!-- Admin Navigation -->
		<nav class="admin-nav">
			<div class="max-w-7xl mx-auto px-6">
				<div class="flex items-center justify-between">
					<div class="flex gap-6">
						{#each navItems as item}
							<a
								href={item.href}
								class="nav-link {$page.url.pathname === item.href ? 'active' : ''}"
							>
								{item.label}
							</a>
						{/each}
					</div>
					<div class="flex items-center gap-4">
						<a href="/" class="utility-link">← Back to Site</a>
						<button
							onclick={logout}
							class="utility-link"
						>
							Logout
						</button>
					</div>
				</div>
			</div>
		</nav>

		<!-- Admin Content -->
		<main id="main-content" class="admin-content" tabindex="-1">
			<slot />
		</main>
	</div>
{/if}

<style>
	:global(body) {
		background: var(--color-performance-bg-pure);
	}

	.admin-layout {
		min-height: 100vh;
		background: var(--color-performance-bg-pure);
		color: var(--color-performance-fg-primary);
	}

	.admin-nav {
		background: var(--color-performance-bg-surface);
	}

	.nav-link {
		padding: var(--space-performance-sm) 0;
		border-bottom: 2px solid transparent;
		transition: all var(--duration-performance-standard) var(--ease-performance-standard);
		color: var(--color-performance-fg-tertiary);
	}

	.nav-link:hover {
		color: var(--color-performance-fg-primary);
	}

	.nav-link.active {
		border-bottom-color: var(--color-performance-fg-primary);
		color: var(--color-performance-fg-primary);
	}

	.utility-link {
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-body-sm);
		transition: color var(--duration-performance-standard) var(--ease-performance-standard);
		background: transparent;
		border: none;
		cursor: pointer;
	}

	.utility-link:hover {
		color: var(--color-performance-fg-primary);
	}

	.admin-content {
		max-width: 80rem;
		margin: 0 auto;
		padding: var(--space-performance-lg) var(--space-performance-md);
	}
</style>
