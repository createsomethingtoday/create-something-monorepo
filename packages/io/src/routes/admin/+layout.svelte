<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	const navItems = [
		{ href: '/admin', label: 'Dashboard', icon: 'chart' },
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

<a href="#main-content" class="skip-link">Skip to main content</a>

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

<style>
	:global(body) {
		background: var(--color-bg-pure);
	}

	.admin-layout {
		min-height: 100vh;
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	.admin-nav {
		border-bottom: 1px solid var(--color-border-default);
		background: var(--color-bg-surface);
	}

	.nav-link {
		padding: var(--space-sm) 0;
		border-bottom: 2px solid transparent;
		transition: all var(--duration-standard) var(--ease-standard);
		color: var(--color-fg-tertiary);
	}

	.nav-link:hover {
		color: var(--color-fg-primary);
	}

	.nav-link.active {
		border-bottom-color: var(--color-fg-primary);
		color: var(--color-fg-primary);
	}

	.utility-link {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		transition: color var(--duration-standard) var(--ease-standard);
		background: transparent;
		border: none;
		cursor: pointer;
	}

	.utility-link:hover {
		color: var(--color-fg-primary);
	}

	.admin-content {
		max-width: 80rem;
		margin: 0 auto;
		padding: var(--space-lg) var(--space-md);
	}
</style>
