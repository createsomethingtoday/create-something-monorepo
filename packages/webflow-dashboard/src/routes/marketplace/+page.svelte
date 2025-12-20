<script lang="ts">
	import { goto } from '$app/navigation';
	import { Header, Button } from '$lib/components';
	import MarketplaceInsights from '$lib/components/MarketplaceInsights.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let leaderboard = $state<unknown[]>([]);
	let categories = $state<unknown[]>([]);
	let insights = $state<unknown[]>([]);
	let userTemplates = $state<unknown[]>([]);
	let summary = $state({
		totalMarketplaceSales: 0,
		userBestRank: null as number | null,
		lastUpdated: ''
	});

	$effect(() => {
		loadData();
	});

	async function loadData() {
		isLoading = true;
		error = null;

		try {
			const [leaderboardRes, categoriesRes] = await Promise.all([
				fetch('/api/analytics/leaderboard'),
				fetch('/api/analytics/categories')
			]);

			if (!leaderboardRes.ok || !categoriesRes.ok) {
				throw new Error('Failed to load marketplace data');
			}

			const leaderboardData = await leaderboardRes.json();
			const categoriesData = await categoriesRes.json();

			leaderboard = leaderboardData.leaderboard;
			userTemplates = leaderboardData.userTemplates;
			summary = leaderboardData.summary;
			categories = categoriesData.categories;
			insights = categoriesData.insights;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load data';
		} finally {
			isLoading = false;
		}
	}

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}

	function handleBackToDashboard() {
		goto('/dashboard');
	}
</script>

<svelte:head>
	<title>Marketplace Insights | Webflow Asset Dashboard</title>
</svelte:head>

<div class="marketplace-page">
	<Header userEmail={data.user?.email} onLogout={handleLogout} />

	<main class="main-content">
		<div class="content-wrapper">
			<!-- Back Navigation -->
			<Button variant="link" onclick={handleBackToDashboard} class="back-link">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M15 19l-7-7 7-7" />
				</svg>
				Back to Dashboard
			</Button>

			<!-- Header -->
			<div class="page-header">
				<div class="header-content">
					<h1 class="page-title">Marketplace Insights</h1>
					<p class="page-subtitle">
						Weekly marketplace trends, top performers, and opportunities for your next template
					</p>
					<p class="sync-info">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<path d="M12 6v6l4 2" />
						</svg>
						Data synced weekly (Mondays at 4 PM UTC) • Rolling 30-day window
					</p>
				</div>
			</div>

			<!-- Content -->
			{#if isLoading}
				<div class="loading-container">
					<div class="loading-dots">
						<span class="dot"></span>
						<span class="dot"></span>
						<span class="dot"></span>
					</div>
					<p>Loading marketplace insights...</p>
				</div>
			{:else if error}
				<div class="error-container">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<path d="M12 8v4" />
						<path d="M12 16h.01" />
					</svg>
					<div>
						<p class="error-title">Failed to load marketplace insights</p>
						<p class="error-message">{error}</p>
						<Button variant="secondary" onclick={loadData}>Try Again</Button>
					</div>
				</div>
			{:else}
				<MarketplaceInsights
					{leaderboard}
					{categories}
					{insights}
					{userTemplates}
					{summary}
				/>
			{/if}
		</div>
	</main>
</div>

<style>
	.marketplace-page {
		min-height: 100vh;
		background: var(--color-bg-pure);
	}

	.main-content {
		padding: var(--space-lg) var(--space-md);
	}

	.content-wrapper {
		max-width: 80rem;
		margin: 0 auto;
	}

	:global(.back-link) {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-md);
		color: var(--color-info);
	}

	.page-header {
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.page-title {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.page-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-sm);
	}

	.sync-info {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-2xl);
		color: var(--color-fg-secondary);
	}

	.loading-dots {
		display: flex;
		gap: var(--space-xs);
		margin-bottom: var(--space-md);
	}

	.dot {
		width: 8px;
		height: 8px;
		background: var(--color-info);
		border-radius: 50%;
		animation: pulse 1.5s ease-in-out infinite;
	}

	.dot:nth-child(2) {
		animation-delay: 0.2s;
	}

	.dot:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.5;
		}
		50% {
			opacity: 1;
		}
	}

	.error-container {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-lg);
	}

	.error-container svg {
		color: var(--color-error);
		flex-shrink: 0;
		margin-top: 2px;
	}

	.error-title {
		font-weight: var(--font-medium);
		color: var(--color-error);
		margin: 0 0 var(--space-xs);
	}

	.error-message {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-sm);
	}
</style>
