<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	const navItems = [
		{ href: '/admin', label: 'Dashboard' },
		{ href: '/admin/agent-drafts', label: 'Drafts' },
		{ href: '/admin/submissions', label: 'Submissions' },
		{ href: '/admin/subscribers', label: 'Subscribers' },
		{ href: '/admin/experiments', label: 'Experiments' },
		{ href: '/admin/analytics', label: 'Analytics' },
		{ href: '/admin/tufte-dashboard', label: 'Analysis' },
		{ href: '/admin/observability', label: 'Observability' }
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
		<nav class="admin-nav" aria-label="Admin tools">
			<div class="nav-shell">
				<div class="nav-scroll">
						{#each navItems as item}
							<a
								href={item.href}
								class="nav-link {$page.url.pathname === item.href ? 'active' : ''}"
							>
								{item.label}
							</a>
						{/each}
				</div>
				<div class="nav-utilities">
						<a href="/" class="utility-link">← Back to Site</a>
						<button
							onclick={logout}
							class="utility-link"
						>
							Logout
						</button>
				</div>
			</div>
		</nav>

		<noscript>
			<p class="no-script-notice">
				Published repository records remain readable; live data and record actions need JavaScript.
			</p>
		</noscript>

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

	.nav-shell {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-performance-md);
		max-width: 80rem;
		margin: 0 auto;
		padding: 0 var(--space-performance-md);
	}

	.nav-scroll {
		display: flex;
		gap: var(--space-performance-lg);
		overflow-x: auto;
		overscroll-behavior-inline: contain;
		scrollbar-width: thin;
	}

	.nav-utilities {
		display: flex;
		align-items: center;
		gap: var(--space-performance-md);
		flex: 0 0 auto;
	}

	.nav-link {
		padding: var(--space-performance-sm) 0;
		white-space: nowrap;
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

	.no-script-notice {
		max-width: 80rem;
		margin: var(--space-performance-md) auto 0;
		padding: 0 var(--space-performance-md);
		color: var(--color-performance-warning);
		font-size: var(--text-performance-body-sm);
	}

	@media (max-width: 48rem) {
		.nav-shell {
			align-items: stretch;
			flex-direction: column-reverse;
			gap: 0;
		}

		.nav-utilities {
			justify-content: space-between;
			padding-top: var(--space-performance-sm);
		}
	}
</style>
