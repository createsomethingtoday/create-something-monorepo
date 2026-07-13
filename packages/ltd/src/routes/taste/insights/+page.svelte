<script lang="ts">
	import type { PageData } from './$types';
	import { formatTime } from '$lib/taste/insights';
	import { Sparkline } from '@create-something/tufte';
	import type { DataPoint } from '@create-something/tufte';
	import { SEO } from '@create-something/canon';

	let { data }: { data: PageData } = $props();

	// Share state
	let shareState = $state<'idle' | 'copying' | 'copied'>('idle');

	// Format date for display
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	}

	// Format channel slug for display
	function formatChannel(slug: string): string {
		return slug
			.replace(/-/g, ' ')
			.replace(/\b\w/g, c => c.toUpperCase());
	}

	// Calculate bar width percentage
	function getBarWidth(value: number, max: number): number {
		if (max === 0) return 0;
		return Math.round((value / max) * 100);
	}

	// Get max values for scaling
	const maxChannelTime = $derived(
		Math.max(...data.channelBreakdown.map(c => c.timeSeconds), 1)
	);

	// Transform collection growth to sparkline data
	const collectionSparklineData = $derived<DataPoint[]>(
		data.collectionGrowth.map(point => ({ count: point.collectionCount }))
	);

	// Calculate total items across all collections
	const totalCollectionItems = $derived(
		data.collectionGrowth.length > 0
			? data.collectionGrowth[data.collectionGrowth.length - 1].itemCount || 0
			: 0
	);

	// Current collection count
	const currentCollectionCount = $derived(
		data.collectionGrowth.length > 0
			? data.collectionGrowth[data.collectionGrowth.length - 1].collectionCount
			: 0
	);

	// Generate shareable profile text
	function generateShareText(): string {
		const lines: string[] = [];
		lines.push('🎨 My Taste Profile');
		lines.push('');
		lines.push(`Exploration Score: ${data.profile.explorationScore}/100`);
		lines.push(`${data.profile.summary}`);
		lines.push('');
		lines.push(`📊 Stats:`);
		lines.push(`• ${data.stats.channelsExplored}/${data.stats.totalChannels} channels explored`);
		lines.push(`• ${formatTime(data.stats.totalTimeSeconds)} invested`);
		lines.push(`• ${data.stats.totalStudied} references deeply studied`);
		if (data.profile.focusAreas.length > 0) {
			lines.push('');
			lines.push(`Focus: ${data.profile.focusAreas.join(', ')}`);
		}
		lines.push('');
		lines.push('Cultivate your taste at createsomething.ltd/taste');
		return lines.join('\n');
	}

	// Copy profile to clipboard
	async function shareProfile() {
		if (shareState !== 'idle') return;

		shareState = 'copying';
		try {
			const text = generateShareText();

			// Try Web Share API first (mobile/native share sheet)
			if (navigator.share) {
				await navigator.share({
					title: 'My Taste Profile',
					text: text
				});
			} else {
				// Fall back to clipboard
				await navigator.clipboard.writeText(text);
			}
			shareState = 'copied';
			setTimeout(() => { shareState = 'idle'; }, 2000);
		} catch (err) {
			// User cancelled share or error
			shareState = 'idle';
		}
	}
</script>

<SEO
	title="Reading Insights — Taste"
	description="Explore your taste cultivation journey. Track channels explored, time invested, and references studied."
	propertyName="ltd"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.ltd' },
		{ name: 'Taste', url: 'https://createsomething.ltd/taste' },
		{ name: 'Insights', url: 'https://createsomething.ltd/taste/insights' }
	]}
/>

<!-- Header -->
<section class="header-section">
	<div class="max-w-4xl mx-auto px-6">
		<nav class="breadcrumb">
			<a href="/taste">Taste</a>
			<span class="separator">/</span>
			<span>Insights</span>
		</nav>
		<h1>Reading Insights</h1>
		<p class="tagline">
			Your taste cultivation journey, visualized.
		</p>
	</div>
</section>

{#if data.error}
	<!-- Error State -->
	<section class="error-section">
		<div class="max-w-4xl mx-auto px-6">
			<div class="error-card">
				<p class="error-message">{data.error}</p>
				{#if !data.userId}
					<p class="error-hint">
						Sign in to track your taste exploration and build your profile.
					</p>
				{/if}
			</div>
		</div>
	</section>
{:else}
	<!-- Taste Profile Summary -->
	<section class="profile-section">
		<div class="max-w-4xl mx-auto px-6">
			<div class="profile-card">
				<div class="profile-header">
					<div class="score-ring">
						<svg viewBox="0 0 100 100" class="score-svg">
							<circle
								cx="50"
								cy="50"
								r="45"
								class="score-bg"
							/>
							<circle
								cx="50"
								cy="50"
								r="45"
								class="score-fill"
								style="stroke-dasharray: {data.profile.explorationScore * 2.83} 283"
							/>
						</svg>
						<span class="score-value">{data.profile.explorationScore}</span>
					</div>
					<div class="profile-info">
						<h2 class="profile-title">Taste Profile</h2>
						<p class="profile-summary">{data.profile.summary}</p>
						<div class="focus-areas">
							{#each data.profile.focusAreas as area}
								<span class="focus-tag">{area}</span>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Stats Overview -->
	<section class="stats-section">
		<div class="max-w-4xl mx-auto px-6">
			<div class="stats-grid">
				<div class="stat-card">
					<span class="stat-value">{data.stats.channelsExplored}</span>
					<span class="stat-label">
						of {data.stats.totalChannels} channels
					</span>
					<span class="stat-name">Explored</span>
				</div>
				<div class="stat-card">
					<span class="stat-value">{formatTime(data.stats.totalTimeSeconds)}</span>
					<span class="stat-label">invested</span>
					<span class="stat-name">Time Spent</span>
				</div>
				<div class="stat-card">
					<span class="stat-value">{data.stats.totalStudied}</span>
					<span class="stat-label">deeply reviewed</span>
					<span class="stat-name">Studied</span>
				</div>
				<div class="stat-card">
					<span class="stat-value">{data.stats.totalViewed}</span>
					<span class="stat-label">total</span>
					<span class="stat-name">References</span>
				</div>
			</div>
		</div>
	</section>

	<!-- Channel Breakdown -->
	{#if data.channelBreakdown.length > 0}
		<section class="channels-section">
			<div class="max-w-4xl mx-auto px-6">
				<h2 class="section-title">Time per Channel</h2>
				<div class="channel-bars">
					{#each data.channelBreakdown as channel}
						<div class="channel-row">
							<span class="channel-name">{formatChannel(channel.channel)}</span>
							<div class="channel-bar-container">
								<div
									class="channel-bar"
									style="width: {getBarWidth(channel.timeSeconds, maxChannelTime)}%"
								></div>
							</div>
							<span class="channel-time">{formatTime(channel.timeSeconds)}</span>
							<span class="channel-studied">{channel.studiedCount} studied</span>
						</div>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- Most Studied References -->
	{#if data.mostStudied.length > 0}
		<section class="studied-section">
			<div class="max-w-4xl mx-auto px-6">
				<h2 class="section-title">Most-Studied References</h2>
				<div class="studied-grid">
					{#each data.mostStudied as ref}
						<div class="studied-card">
							{#if ref.imageUrl}
								<img
									src={ref.imageUrl}
									alt={ref.title}
									class="studied-img"
									loading="lazy"
								/>
							{:else}
								<div class="studied-placeholder">
									<span>{ref.type === 'example' ? 'IMG' : 'RES'}</span>
								</div>
							{/if}
							<div class="studied-info">
								<h3 class="studied-title">{ref.title}</h3>
								<div class="studied-meta">
									<span class="studied-channel">{formatChannel(ref.channel)}</span>
									<span class="studied-time">{formatTime(ref.timeSeconds)}</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- Daily Activity -->
	{#if data.dailyActivity.length > 0}
		<section class="activity-section">
			<div class="max-w-4xl mx-auto px-6">
				<h2 class="section-title">Activity (Last 30 Days)</h2>
				<div class="activity-grid">
					{#each data.dailyActivity as day}
						<div
							class="activity-cell"
							class:active={day.views > 0}
							class:studied={day.studied > 0}
							title="{formatDate(day.date)}: {day.views} views, {day.studied} studied"
						></div>
					{/each}
				</div>
				<div class="activity-legend">
					<span class="legend-item">
						<span class="legend-box empty"></span>
						No activity
					</span>
					<span class="legend-item">
						<span class="legend-box active"></span>
						Viewed
					</span>
					<span class="legend-item">
						<span class="legend-box studied"></span>
						Studied
					</span>
				</div>
			</div>
		</section>
	{/if}

	<!-- Collection Growth -->
	<section class="growth-section">
		<div class="max-w-4xl mx-auto px-6">
			<h2 class="section-title">Collection Growth</h2>
			{#if data.collectionGrowth.length > 1}
				<div class="growth-card">
					<div class="growth-stats">
						<div class="growth-stat">
							<span class="growth-value">{currentCollectionCount}</span>
							<span class="growth-label">Collections</span>
						</div>
						{#if totalCollectionItems > 0}
							<div class="growth-stat">
								<span class="growth-value">{totalCollectionItems}</span>
								<span class="growth-label">Total Items</span>
							</div>
						{/if}
					</div>
					<div class="growth-sparkline">
						<Sparkline
							data={collectionSparklineData}
							width={200}
							height={40}
							showFill={true}
							showReferenceLine={false}
						/>
					</div>
					<div class="growth-range">
						<span>{formatDate(data.collectionGrowth[0].date)}</span>
						<span>{formatDate(data.collectionGrowth[data.collectionGrowth.length - 1].date)}</span>
					</div>
				</div>
			{:else if data.collectionGrowth.length === 1}
				<div class="growth-empty">
					<p class="growth-single">{currentCollectionCount} collection created on {formatDate(data.collectionGrowth[0].date)}</p>
				</div>
			{:else}
				<div class="growth-empty">
					<p>No collections yet. Start curating your taste.</p>
					<a href="/taste" class="growth-cta">Explore Channels</a>
				</div>
			{/if}
		</div>
	</section>

	<!-- Share Profile -->
	<section class="share-section">
		<div class="max-w-4xl mx-auto px-6 text-center">
			<p class="share-text">
				Taste is cultivated, not consumed. Share your exploration journey.
			</p>
			<button
				class="share-button"
				class:copying={shareState === 'copying'}
				class:copied={shareState === 'copied'}
				onclick={shareProfile}
				disabled={shareState === 'copying'}
			>
				{#if shareState === 'copied'}
					Copied to Clipboard
				{:else if shareState === 'copying'}
					Sharing...
				{:else}
					Share Profile
				{/if}
			</button>
		</div>
	</section>
{/if}

<style>
	/* Header */
	.header-section {
		padding: var(--space-performance-lg) 0 var(--space-performance-md);
	}

	.breadcrumb {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		margin-bottom: var(--space-performance-sm);
	}

	.breadcrumb a {
		color: var(--color-performance-fg-tertiary);
		text-decoration: none;
	}

	.breadcrumb a:hover {
		color: var(--color-performance-fg-primary);
	}

	.separator {
		margin: 0 0.5rem;
	}

	.tagline {
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-secondary);
		margin-top: var(--space-performance-xs);
	}

	/* Error State */
	.error-section {
		padding: var(--space-performance-xl) 0;
	}

	.error-card {
		padding: var(--space-performance-lg);
		background: var(--color-performance-bg-surface);
		text-align: center;
	}

	.error-message {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-sm);
	}

	.error-hint {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
	}

	/* Profile Section */
	.profile-section {
		padding: var(--space-performance-lg) 0;
	}

	.profile-card {
		padding: var(--space-performance-md);
		border: 1px solid var(--color-performance-border-emphasis);
		background: var(--color-performance-bg-surface);
	}

	.profile-header {
		display: flex;
		gap: var(--space-performance-md);
		align-items: center;
	}

	.score-ring {
		position: relative;
		width: 80px;
		height: 80px;
		flex-shrink: 0;
	}

	.score-svg {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}

	.score-bg {
		fill: none;
		stroke: var(--color-performance-border-default);
		stroke-width: 8;
	}

	.score-fill {
		fill: none;
		stroke: var(--color-performance-fg-primary);
		stroke-width: 8;
		stroke-linecap: round;
		transition: stroke-dasharray var(--duration-performance-standard) var(--ease-performance-standard);
	}

	.score-value {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-performance-h3);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
	}

	.profile-info {
		flex: 1;
	}

	.profile-title {
		font-size: var(--text-performance-body);
		font-weight: 600;
		color: var(--color-performance-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-performance-xs);
	}

	.profile-summary {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-sm);
	}

	.focus-areas {
		display: flex;
		gap: var(--space-performance-xs);
		flex-wrap: wrap;
	}

	.focus-tag {
		font-size: var(--text-performance-caption);
		padding: 0.25rem 0.5rem;
		background: var(--color-performance-bg-subtle);
		color: var(--color-performance-fg-secondary);
	}

	/* Stats Section */
	.stats-section {
		padding: var(--space-performance-lg) 0;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-performance-sm);
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.stat-card {
		padding: var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
		text-align: center;
	}

	.stat-value {
		display: block;
		font-size: var(--text-performance-h2);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
	}

	.stat-label {
		display: block;
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.stat-name {
		display: block;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		margin-top: var(--space-performance-xs);
	}

	/* Channels Section */
	.channels-section {
		padding: var(--space-performance-lg) 0;
	}

	.section-title {
		font-size: var(--text-performance-h3);
		font-weight: 600;
		margin-bottom: var(--space-performance-md);
	}

	.channel-bars {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-sm);
	}

	.channel-row {
		display: grid;
		grid-template-columns: 140px 1fr 60px 80px;
		gap: var(--space-performance-sm);
		align-items: center;
	}

	@media (max-width: 640px) {
		.channel-row {
			grid-template-columns: 1fr;
			gap: 0.25rem;
		}

		.channel-bar-container {
			order: -1;
		}
	}

	.channel-name {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.channel-bar-container {
		height: 8px;
		background: var(--color-performance-bg-subtle);
		border-radius: 4px;
		overflow: hidden;
	}

	.channel-bar {
		height: 100%;
		background: var(--color-performance-fg-primary);
		border-radius: 4px;
		transition: width var(--duration-performance-standard) var(--ease-performance-standard);
	}

	.channel-time {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		text-align: right;
	}

	.channel-studied {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		text-align: right;
	}

	/* Most Studied Section */
	.studied-section {
		padding: var(--space-performance-lg) 0;
	}

	.studied-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-performance-sm);
	}

	@media (max-width: 640px) {
		.studied-grid {
			grid-template-columns: 1fr;
		}
	}

	.studied-card {
		display: flex;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
	}

	.studied-img {
		width: 60px;
		height: 60px;
		object-fit: cover;
		flex-shrink: 0;
	}

	.studied-placeholder {
		width: 60px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-performance-bg-subtle);
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-caption);
		flex-shrink: 0;
	}

	.studied-info {
		flex: 1;
		min-width: 0;
	}

	.studied-title {
		font-size: var(--text-performance-body-sm);
		font-weight: 500;
		color: var(--color-performance-fg-primary);
		margin-bottom: 0.25rem;
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.studied-meta {
		display: flex;
		gap: var(--space-performance-sm);
		font-size: var(--text-performance-caption);
	}

	.studied-channel {
		color: var(--color-performance-fg-tertiary);
	}

	.studied-time {
		color: var(--color-performance-fg-muted);
	}

	/* Activity Section */
	.activity-section {
		padding: var(--space-performance-lg) 0;
	}

	.activity-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, 14px);
		gap: 3px;
		margin-bottom: var(--space-performance-sm);
	}

	.activity-cell {
		width: 14px;
		height: 14px;
		background: var(--color-performance-bg-subtle);
		border-radius: 2px;
	}

	.activity-cell.active {
		background: var(--color-performance-fg-muted);
	}

	.activity-cell.studied {
		background: var(--color-performance-fg-primary);
	}

	.activity-legend {
		display: flex;
		gap: var(--space-performance-md);
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.legend-box {
		width: 12px;
		height: 12px;
		border-radius: 2px;
	}

	.legend-box.empty {
		background: var(--color-performance-bg-subtle);
	}

	.legend-box.active {
		background: var(--color-performance-fg-muted);
	}

	.legend-box.studied {
		background: var(--color-performance-fg-primary);
	}

	/* Growth Section */
	.growth-section {
		padding: var(--space-performance-lg) 0;
	}

	.growth-card {
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-surface);
	}

	.growth-stats {
		display: flex;
		gap: var(--space-performance-lg);
		margin-bottom: var(--space-performance-sm);
	}

	.growth-stat {
		display: flex;
		flex-direction: column;
	}

	.growth-value {
		font-size: var(--text-performance-h2);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
	}

	.growth-label {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.growth-sparkline {
		height: 40px;
		margin-bottom: var(--space-performance-xs);
	}

	.growth-range {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.growth-empty {
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		text-align: center;
		color: var(--color-performance-fg-tertiary);
	}

	.growth-single {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-secondary);
	}

	.growth-cta {
		display: inline-block;
		margin-top: var(--space-performance-sm);
		padding: var(--space-performance-xs) var(--space-performance-sm);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-primary);
		text-decoration: none;
		border: 1px solid var(--color-performance-border-emphasis);
		transition: border-color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.growth-cta:hover {
		border-color: var(--color-performance-fg-primary);
	}

	/* Share Section */
	.share-section {
		padding: var(--space-performance-xl) 0;
	}

	.share-text {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-md);
	}

	.share-button {
		font-size: var(--text-performance-body);
		font-weight: 500;
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		color: var(--color-performance-fg-primary);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.share-button:hover:not(:disabled) {
		border-color: var(--color-performance-border-emphasis);
		background: var(--color-performance-hover);
	}

	.share-button:disabled {
		cursor: wait;
	}

	.share-button.copied {
		border-color: var(--color-performance-success);
		color: var(--color-performance-success);
	}

	@media (max-width: 640px) {
		.profile-header {
			flex-direction: column;
			text-align: center;
		}

		.focus-areas {
			justify-content: center;
		}
	}
</style>
