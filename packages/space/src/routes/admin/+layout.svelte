<script lang="ts">
	import { page } from '$app/stores';

	let { children } = $props();

	const navItems = [
		{ href: '/admin', label: 'Dashboard' },
		{ href: '/admin/analytics', label: 'Analytics' },
	];
</script>

<div class="admin-layout">
	<nav class="admin-nav">
		<div class="nav-container">
			<div class="nav-left">
				<span class="nav-brand">SPACE ADMIN</span>
				<div class="nav-links">
					{#each navItems as item}
						<a
							href={item.href}
							class="nav-link"
							class:active={$page.url.pathname === item.href}
						>
							{item.label}
						</a>
					{/each}
				</div>
			</div>
			<a href="/" class="back-link">← Back to Site</a>
		</div>
	</nav>

	<main id="main-content" class="admin-content" tabindex="-1">
		{@render children()}
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

	.nav-container {
		max-width: 80rem;
		margin: 0 auto;
		padding: var(--space-sm) var(--space-md);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.nav-left {
		display: flex;
		align-items: center;
		gap: var(--space-lg);
	}

	.nav-brand {
		font-weight: 700;
		font-size: var(--text-body-sm);
		letter-spacing: 0.05em;
		color: var(--color-fg-tertiary);
	}

	.nav-links {
		display: flex;
		gap: var(--space-md);
	}

	.nav-link {
		padding: var(--space-xs) 0;
		border-bottom: 2px solid transparent;
		transition: all var(--duration-micro) var(--ease-standard);
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.nav-link:hover {
		color: var(--color-fg-primary);
	}

	.nav-link.active {
		border-bottom-color: var(--color-fg-primary);
		color: var(--color-fg-primary);
	}

	.back-link {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	.admin-content {
		max-width: 80rem;
		margin: 0 auto;
		padding: var(--space-lg) var(--space-md);
	}
</style>
