<script lang="ts">
	/**
	 * PopularContent Component
	 *
	 * Displays popular and trending papers/experiments with engagement metrics.
	 * Fetches from /api/analytics/popular endpoint.
	 *
	 * Usage:
	 *   <PopularContent />
	 *   <PopularContent showTrending={false} />
	 *   <PopularContent period="7d" limit={5} />
	 */

	import { onMount } from 'svelte';

	interface Props {
		/** Show trending section */
		showTrending?: boolean;
		/** Show user history (requires auth) */
		showHistory?: boolean;
		/** Time period for popular content */
		period?: '7d' | '30d' | 'all';
		/** Max items to show */
		limit?: number;
		/** Content type filter */
		type?: 'papers' | 'experiments' | 'all';
	}

	let {
		showTrending = true,
		showHistory = true,
		period = '30d',
		limit = 5,
		type = 'all'
	}: Props = $props();

	interface ContentItem {
		path: string;
		title: string;
		type: 'paper' | 'experiment';
		views: number;
		uniqueSessions: number;
		avgReadTime: number;
		avgScrollDepth: number;
	}

	interface UserHistoryItem {
		path: string;
		title: string;
		type: 'paper' | 'experiment';
		lastViewed: string;
		viewCount: number;
		maxScrollDepth: number;
		totalTimeSpent: number;
	}

	let popular = $state<ContentItem[]>([]);
	let trending = $state<ContentItem[]>([]);
	let userHistory = $state<UserHistoryItem[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const params = new URLSearchParams({
				period,
				limit: String(limit),
				type
			});

			const response = await fetch(`/api/analytics/popular?${params}`);
			if (!response.ok) throw new Error('Failed to fetch');

			const data = await response.json();
			popular = data.popular || [];
			trending = data.trending || [];
			userHistory = data.userHistory || [];
		} catch (e) {
			error = 'Unable to load analytics';
			console.error('PopularContent error:', e);
		} finally {
			loading = false;
		}
	});

	function formatReadTime(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		const mins = Math.floor(seconds / 60);
		return `${mins}m`;
	}

	function formatDate(iso: string): string {
		const date = new Date(iso);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days}d ago`;
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

{#if loading}
	<div class="popular-loading">
		<div class="skeleton"></div>
		<div class="skeleton"></div>
		<div class="skeleton"></div>
	</div>
{:else if error}
	<p class="popular-error">{error}</p>
{:else}
	<div class="popular-content">
		{#if popular.length > 0}
			<section class="popular-section">
				<h3 class="section-title">Popular</h3>
				<ul class="content-list">
					{#each popular as item}
						<li class="content-item">
							<a href={item.path} class="content-link">
								<span class="content-title">{item.title}</span>
								<span class="content-meta">
									<span class="meta-views">{item.views} views</span>
									{#if item.avgReadTime > 0}
										<span class="meta-time">{formatReadTime(item.avgReadTime)} avg</span>
									{/if}
								</span>
							</a>
							<span class="content-badge {item.type}">{item.type}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if showTrending && trending.length > 0}
			<section class="popular-section">
				<h3 class="section-title">Trending</h3>
				<ul class="content-list">
					{#each trending as item}
						<li class="content-item">
							<a href={item.path} class="content-link">
								<span class="content-title">{item.title}</span>
								<span class="content-meta">
									<span class="meta-views">{item.views} this week</span>
								</span>
							</a>
							<span class="content-badge {item.type}">{item.type}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if showHistory && userHistory.length > 0}
			<section class="popular-section">
				<h3 class="section-title">Your Reading</h3>
				<ul class="content-list">
					{#each userHistory as item}
						<li class="content-item">
							<a href={item.path} class="content-link">
								<span class="content-title">{item.title}</span>
								<span class="content-meta">
									<span class="meta-date">{formatDate(item.lastViewed)}</span>
									{#if item.maxScrollDepth > 0}
										<span class="meta-progress">{item.maxScrollDepth}% read</span>
									{/if}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if popular.length === 0 && trending.length === 0}
			<p class="popular-empty">No content analytics available yet.</p>
		{/if}
	</div>
{/if}

<style>
	.popular-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.popular-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.section-title {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}

	.content-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.content-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.content-item:hover {
		background: var(--color-hover);
	}

	.content-link {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		text-decoration: none;
		color: inherit;
	}

	.content-title {
		color: var(--color-fg-primary);
		font-size: var(--text-body);
	}

	.content-meta {
		display: flex;
		gap: var(--space-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.content-badge {
		font-size: var(--text-caption);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		text-transform: lowercase;
	}

	.content-badge.paper {
		background: var(--color-info-muted);
		color: var(--color-info);
	}

	.content-badge.experiment {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.popular-loading {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.skeleton {
		height: 48px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.4;
		}
		50% {
			opacity: 0.7;
		}
	}

	.popular-error,
	.popular-empty {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		text-align: center;
		padding: var(--space-md);
	}
</style>
