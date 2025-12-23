<!--
  ReadingProgress Component

  Displays the user's taste exploration progress across channels.
  Shows visual indicators for channel coverage and study depth.

  Philosophy: Taste is cultivated through reflection on what we've explored.
  Canon: "Tailwind for structure, Canon for aesthetics."
-->
<script lang="ts">
	import { formatTime, type TasteReadingStats, type ChannelStats, type TasteProfile } from '$lib/taste/insights';

	interface Props {
		stats: TasteReadingStats;
		channelBreakdown: ChannelStats[];
		profile: TasteProfile;
		compact?: boolean;
	}

	let {
		stats,
		channelBreakdown,
		profile,
		compact = false
	}: Props = $props();

	// Calculate percentages for the progress bar
	const explorationPercent = $derived(Math.round((stats.channelsExplored / stats.totalChannels) * 100));
	const studyRatio = $derived(stats.totalViewed > 0 ? Math.round((stats.totalStudied / stats.totalViewed) * 100) : 0);

	// Get top 3 channels for quick display
	const topChannels = $derived(
		[...channelBreakdown]
			.sort((a, b) => b.timeSeconds - a.timeSeconds)
			.slice(0, 3)
	);

	// Format channel name for display
	function formatChannelName(slug: string): string {
		return slug
			.split('-')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	// Get a color for a channel (using data visualization palette)
	function getChannelColor(index: number): string {
		const colors = [
			'var(--color-data-1)',
			'var(--color-data-2)',
			'var(--color-data-3)',
			'var(--color-data-4)',
			'var(--color-data-5)',
			'var(--color-data-6)',
		];
		return colors[index % colors.length];
	}
</script>

{#if compact}
	<!-- Compact view for sidebar or cards -->
	<div class="progress-compact">
		<div class="compact-header">
			<span class="compact-label">Taste Exploration</span>
			<span class="compact-score">{profile.explorationScore}%</span>
		</div>

		<div class="compact-bar">
			<div
				class="compact-fill"
				style="width: {profile.explorationScore}%"
			></div>
		</div>

		<div class="compact-stats">
			<span class="stat-item">
				<span class="stat-value">{stats.totalViewed}</span>
				<span class="stat-label">viewed</span>
			</span>
			<span class="stat-divider">·</span>
			<span class="stat-item">
				<span class="stat-value">{stats.totalStudied}</span>
				<span class="stat-label">studied</span>
			</span>
			<span class="stat-divider">·</span>
			<span class="stat-item">
				<span class="stat-value">{formatTime(stats.totalTimeSeconds)}</span>
				<span class="stat-label">spent</span>
			</span>
		</div>
	</div>
{:else}
	<!-- Full progress view -->
	<div class="progress-full">
		<!-- Summary card -->
		<div class="summary-card">
			<div class="summary-header">
				<h3 class="summary-title">Your Taste Profile</h3>
				<span class="exploration-badge">{profile.explorationScore}% explored</span>
			</div>

			<p class="summary-text">{profile.summary}</p>

			{#if profile.focusAreas.length > 0}
				<div class="focus-areas">
					{#each profile.focusAreas as area}
						<span class="focus-tag">{area}</span>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Stats grid -->
		<div class="stats-grid">
			<div class="stat-card">
				<span class="stat-icon">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
						<circle cx="12" cy="12" r="3" />
					</svg>
				</span>
				<div class="stat-content">
					<span class="stat-number">{stats.totalViewed}</span>
					<span class="stat-description">References Viewed</span>
				</div>
			</div>

			<div class="stat-card">
				<span class="stat-icon accent">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
						<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
					</svg>
				</span>
				<div class="stat-content">
					<span class="stat-number">{stats.totalStudied}</span>
					<span class="stat-description">Deeply Studied</span>
				</div>
			</div>

			<div class="stat-card">
				<span class="stat-icon">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<polyline points="12 6 12 12 16 14" />
					</svg>
				</span>
				<div class="stat-content">
					<span class="stat-number">{formatTime(stats.totalTimeSeconds)}</span>
					<span class="stat-description">Time Invested</span>
				</div>
			</div>

			<div class="stat-card">
				<span class="stat-icon">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
						<line x1="3" y1="9" x2="21" y2="9" />
						<line x1="9" y1="21" x2="9" y2="9" />
					</svg>
				</span>
				<div class="stat-content">
					<span class="stat-number">{stats.channelsExplored}/{stats.totalChannels}</span>
					<span class="stat-description">Channels Explored</span>
				</div>
			</div>
		</div>

		<!-- Channel exploration -->
		<div class="channels-section">
			<h4 class="section-title">Channel Breakdown</h4>

			<div class="channels-progress">
				<div class="progress-track">
					{#each channelBreakdown as channel, index}
						{@const maxTime = Math.max(...channelBreakdown.map(c => c.timeSeconds))}
						{@const width = maxTime > 0 ? (channel.timeSeconds / maxTime) * 100 : 0}
						<div
							class="channel-bar"
							style="width: {width}%; background-color: {getChannelColor(index)};"
							title="{formatChannelName(channel.channel)}: {formatTime(channel.timeSeconds)}"
						></div>
					{/each}
				</div>
			</div>

			<div class="channels-list">
				{#each topChannels as channel, index}
					<div class="channel-item">
						<span class="channel-dot" style="background-color: {getChannelColor(index)}"></span>
						<span class="channel-name">{formatChannelName(channel.channel)}</span>
						<div class="channel-stats">
							<span class="channel-count">{channel.viewCount} views</span>
							<span class="channel-time">{formatTime(channel.timeSeconds)}</span>
						</div>
					</div>
				{/each}

				{#if channelBreakdown.length > 3}
					<p class="more-channels">
						+{channelBreakdown.length - 3} more channels explored
					</p>
				{/if}
			</div>
		</div>

		<!-- Depth indicator -->
		<div class="depth-section">
			<div class="depth-header">
				<h4 class="section-title">Study Depth</h4>
				<span class="depth-ratio">{studyRatio}% studied deeply</span>
			</div>

			<div class="depth-bar">
				<div class="depth-segment viewed" style="width: 100%">
					<div class="depth-segment studied" style="width: {studyRatio}%"></div>
				</div>
			</div>

			<div class="depth-legend">
				<span class="legend-item">
					<span class="legend-color viewed"></span>
					<span class="legend-label">Viewed ({stats.totalViewed})</span>
				</span>
				<span class="legend-item">
					<span class="legend-color studied"></span>
					<span class="legend-label">Studied ({stats.totalStudied})</span>
				</span>
			</div>
		</div>
	</div>
{/if}

<style>
	/* ========================= */
	/* Compact View */
	/* ========================= */

	.progress-compact {
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.compact-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-xs);
	}

	.compact-label {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-secondary);
	}

	.compact-score {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.compact-bar {
		height: 4px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		overflow: hidden;
		margin-bottom: var(--space-xs);
	}

	.compact-fill {
		height: 100%;
		background: var(--color-success);
		border-radius: var(--radius-full);
		transition: width var(--duration-standard) var(--ease-standard);
	}

	.compact-stats {
		display: flex;
		gap: var(--space-xs);
		align-items: center;
		font-size: var(--text-caption);
	}

	.stat-item {
		display: flex;
		gap: 0.25rem;
		align-items: baseline;
	}

	.stat-value {
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.stat-label {
		color: var(--color-fg-muted);
	}

	.stat-divider {
		color: var(--color-fg-subtle);
	}

	/* ========================= */
	/* Full View */
	/* ========================= */

	.progress-full {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	/* Summary card */
	.summary-card {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.summary-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-sm);
	}

	.summary-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.exploration-badge {
		font-size: var(--text-caption);
		font-weight: 500;
		padding: 0.25rem 0.5rem;
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-full);
		color: var(--color-success);
	}

	.summary-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.focus-areas {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.focus-tag {
		font-size: var(--text-caption);
		padding: 0.25rem 0.5rem;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-tertiary);
	}

	/* Stats grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-sm);
	}

	@media (min-width: 768px) {
		.stats-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.stat-card {
		display: flex;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.stat-icon {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-fg-muted);
		flex-shrink: 0;
	}

	.stat-icon.accent {
		color: var(--color-data-3);
	}

	.stat-content {
		display: flex;
		flex-direction: column;
	}

	.stat-number {
		font-size: var(--text-h3);
		font-weight: 700;
		color: var(--color-fg-primary);
		line-height: 1.2;
	}

	.stat-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Channels section */
	.channels-section {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.section-title {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-sm) 0;
	}

	.channels-progress {
		margin-bottom: var(--space-sm);
	}

	.progress-track {
		height: 8px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		overflow: hidden;
		display: flex;
	}

	.channel-bar {
		height: 100%;
		min-width: 4px;
		transition: width var(--duration-standard) var(--ease-standard);
	}

	.channel-bar:first-child {
		border-radius: var(--radius-full) 0 0 var(--radius-full);
	}

	.channel-bar:last-child {
		border-radius: 0 var(--radius-full) var(--radius-full) 0;
	}

	.channel-bar:only-child {
		border-radius: var(--radius-full);
	}

	.channels-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.channel-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.channel-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.channel-name {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		flex: 1;
	}

	.channel-stats {
		display: flex;
		gap: var(--space-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.more-channels {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: 0.25rem;
	}

	/* Depth section */
	.depth-section {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.depth-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-sm);
	}

	.depth-ratio {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.depth-bar {
		height: 12px;
		margin-bottom: var(--space-sm);
	}

	.depth-segment {
		height: 100%;
		border-radius: var(--radius-full);
		position: relative;
	}

	.depth-segment.viewed {
		background: var(--color-bg-subtle);
	}

	.depth-segment.studied {
		position: absolute;
		top: 0;
		left: 0;
		background: var(--color-data-3);
	}

	.depth-legend {
		display: flex;
		gap: var(--space-md);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: var(--text-caption);
	}

	.legend-color {
		width: 8px;
		height: 8px;
		border-radius: 2px;
	}

	.legend-color.viewed {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
	}

	.legend-color.studied {
		background: var(--color-data-3);
	}

	.legend-label {
		color: var(--color-fg-muted);
	}
</style>
