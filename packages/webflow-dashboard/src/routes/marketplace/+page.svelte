<script lang="ts">
	import { goto } from '$app/navigation';
	import { Header, Button } from '$lib/components';
	import MarketplaceInsights from '$lib/components/MarketplaceInsights.svelte';
	import { Clock, ChevronLeft, AlertCircle, BarChart3 } from 'lucide-svelte';
	import type { PageData } from './$types';

	interface LeaderboardEntry {
		templateName: string;
		category: string;
		totalSales30d: number;
		totalRevenue30d?: number;
		salesRank: number;
		revenueRank: number;
		isUserTemplate: boolean;
	}

	interface CategoryEntry {
		category: string;
		subcategory: string;
		templatesInSubcategory: number;
		totalSales30d: number;
		avgRevenuePerTemplate: number;
		revenueRank: number;
	}

	interface Insight {
		type: 'opportunity' | 'trend' | 'warning';
		message: string;
	}

	interface LeaderboardResponse {
		leaderboard: LeaderboardEntry[];
		userTemplates: LeaderboardEntry[];
		summary: {
			totalMarketplaceSales: number;
			userBestRank: number | null;
			lastUpdated: string;
			nextUpdateDate?: string;
		};
	}

	interface CategoriesResponse {
		categories: CategoryEntry[];
		insights: Insight[];
	}

	let { data }: { data: PageData } = $props();

	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let leaderboard = $state<LeaderboardEntry[]>([]);
	let categories = $state<CategoryEntry[]>([]);
	let insights = $state<Insight[]>([]);
	let userTemplates = $state<LeaderboardEntry[]>([]);
	let summary = $state({
		totalMarketplaceSales: 0,
		userBestRank: null as number | null,
		lastUpdated: '',
		nextUpdateDate: undefined as string | undefined
	});
	
	/**
	 * Format the last updated timestamp
	 */
	function formatLastUpdated(isoDate: string): string {
		const date = new Date(isoDate);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		
		if (diffDays === 0) return 'today';
		if (diffDays === 1) return 'yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;
		
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
	
	/**
	 * Format the next update date
	 */
	function formatNextUpdate(isoDate: string): string {
		const date = new Date(isoDate);
		const now = new Date();
		const diffMs = date.getTime() - now.getTime();
		const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
		
		if (diffDays === 0) return 'today';
		if (diffDays === 1) return 'tomorrow';
		if (diffDays < 7) return `in ${diffDays} days`;
		
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

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

			const leaderboardData = (await leaderboardRes.json()) as LeaderboardResponse;
			const categoriesData = (await categoriesRes.json()) as CategoriesResponse;

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
				<ChevronLeft size={16} />
				Back to Dashboard
			</Button>

			<!-- Header -->
			<div class="page-header">
				<div class="header-content">
					<h1 class="page-title">Marketplace Insights</h1>
					<p class="page-subtitle">
						Weekly marketplace snapshot with 30-day performance data
					</p>
					{#if summary.lastUpdated}
						<div class="sync-info-container">
							<p class="sync-info">
								<Clock size={14} />
								<span class="sync-text">
									Last updated: <strong>{formatLastUpdated(summary.lastUpdated)}</strong>
									{#if summary.nextUpdateDate}
										<span class="next-update">• Next update: {formatNextUpdate(summary.nextUpdateDate)}</span>
									{/if}
								</span>
							</p>
							<p class="sync-note">
								<BarChart3 size={12} />
								Data refreshes weekly on Mondays at 4 PM UTC with a rolling 30-day sales window
							</p>
						</div>
					{/if}
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
					<AlertCircle size={20} />
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
		color: var(--color-fg-muted);
		font-weight: var(--font-normal);
	}

	:global(.back-link:hover) {
		color: var(--color-fg-primary);
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

	.sync-info-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		margin-top: var(--space-sm);
	}

	.sync-info {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.sync-info svg {
		flex-shrink: 0;
		color: var(--color-info);
	}

	.sync-text {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		flex-wrap: wrap;
	}

	.sync-text strong {
		color: var(--color-fg-primary);
		font-weight: var(--font-semibold);
	}

	.next-update {
		color: var(--color-fg-muted);
	}

	.sync-note {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
		padding-left: 22px; /* Align with text above (icon width + gap) */
		font-style: italic;
	}

	.sync-note :global(svg) {
		flex-shrink: 0;
		color: var(--color-info);
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
