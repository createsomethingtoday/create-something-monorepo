<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<svelte:head>
	<title>Dashboard | Webflow Asset Dashboard</title>
</svelte:head>

<main class="container">
	<header class="header">
		<div class="header-content">
			<div class="logo">
				<svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
					<rect width="40" height="40" rx="8" fill="var(--webflow-blue)" />
					<path d="M28 14L20 26L12 14H28Z" fill="white" />
				</svg>
				<span class="logo-text">Asset Dashboard</span>
			</div>
			<div class="header-actions">
				<span class="user-email">{data.user?.email}</span>
				<button class="logout-btn" onclick={handleLogout}>Logout</button>
			</div>
		</div>
	</header>

	<div class="content">
		<h1>Welcome to your Dashboard</h1>
		<p class="subtitle">Your Webflow templates and assets will appear here.</p>

		<div class="placeholder-grid">
			<div class="placeholder-card">
				<div class="placeholder-icon">📊</div>
				<h3>Assets</h3>
				<p>View and manage your templates</p>
			</div>
			<div class="placeholder-card">
				<div class="placeholder-icon">📈</div>
				<h3>Analytics</h3>
				<p>Track performance metrics</p>
			</div>
			<div class="placeholder-card">
				<div class="placeholder-icon">⚙️</div>
				<h3>Settings</h3>
				<p>Manage your profile</p>
			</div>
		</div>
	</div>
</main>

<style>
	.container {
		min-height: 100vh;
		background: var(--color-bg-pure);
	}

	.header {
		border-bottom: 1px solid var(--color-border-default);
		background: var(--color-bg-surface);
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-sm) var(--space-md);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.logo-text {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.user-email {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.logout-btn {
		padding: 0.5rem 1rem;
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.logout-btn:hover {
		color: var(--color-fg-primary);
		border-color: var(--color-border-emphasis);
	}

	.content {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-md);
	}

	h1 {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-xl);
	}

	.placeholder-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-md);
	}

	.placeholder-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-align: center;
	}

	.placeholder-icon {
		font-size: 2.5rem;
		margin-bottom: var(--space-sm);
	}

	.placeholder-card h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.placeholder-card p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
	}
</style>
