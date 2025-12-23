<script lang="ts">
	/**
	 * TasteProfileCard
	 *
	 * Displays a user's taste profile summary for sharing.
	 * Shows exploration score, focus areas, and key stats.
	 *
	 * Philosophy: Taste is cultivated, not consumed.
	 */

	import {
		formatTime,
		type TasteProfile,
		type TasteReadingStats,
	} from '$lib/taste/insights';

	interface Props {
		profile: TasteProfile;
		stats: TasteReadingStats;
		userName?: string;
		variant?: 'default' | 'compact' | 'share';
	}

	let { profile, stats, userName, variant = 'default' }: Props = $props();

	const isCompact = $derived(variant === 'compact');
	const isShare = $derived(variant === 'share');
</script>

<article class="profile-card" class:compact={isCompact} class:share={isShare}>
	<header class="profile-header">
		<div class="score-ring">
			<svg viewBox="0 0 100 100" class="score-svg">
				<circle cx="50" cy="50" r="45" class="score-bg" />
				<circle
					cx="50"
					cy="50"
					r="45"
					class="score-fill"
					style="stroke-dasharray: {profile.explorationScore * 2.83} 283"
				/>
			</svg>
			<span class="score-value">{profile.explorationScore}</span>
		</div>
		<div class="profile-info">
			{#if userName}
				<p class="profile-name">{userName}</p>
			{/if}
			<h3 class="profile-title">Taste Profile</h3>
			<p class="profile-summary">{profile.summary}</p>
		</div>
	</header>

	{#if !isCompact}
		<div class="focus-areas">
			{#each profile.focusAreas as area}
				<span class="focus-tag">{area}</span>
			{/each}
		</div>

		<div class="stats-row">
			<div class="stat">
				<span class="stat-value">{stats.channelsExplored}/{stats.totalChannels}</span>
				<span class="stat-label">channels</span>
			</div>
			<div class="stat">
				<span class="stat-value">{stats.totalStudied}</span>
				<span class="stat-label">studied</span>
			</div>
			<div class="stat">
				<span class="stat-value">{formatTime(stats.totalTimeSeconds)}</span>
				<span class="stat-label">invested</span>
			</div>
		</div>
	{/if}

	{#if isShare}
		<footer class="profile-footer">
			<span class="footer-text">createsomething.ltd/taste</span>
		</footer>
	{/if}
</article>

<style>
	.profile-card {
		padding: var(--space-md);
		border: 1px solid var(--color-border-emphasis);
		background: var(--color-bg-surface);
	}

	.profile-card.compact {
		padding: var(--space-sm);
	}

	.profile-card.share {
		background: linear-gradient(
			135deg,
			var(--color-bg-surface) 0%,
			var(--color-bg-subtle) 100%
		);
	}

	.profile-header {
		display: flex;
		gap: var(--space-md);
		align-items: center;
	}

	.compact .profile-header {
		gap: var(--space-sm);
	}

	.score-ring {
		position: relative;
		width: 80px;
		height: 80px;
		flex-shrink: 0;
	}

	.compact .score-ring {
		width: 48px;
		height: 48px;
	}

	.score-svg {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}

	.score-bg {
		fill: none;
		stroke: var(--color-border-default);
		stroke-width: 8;
	}

	.score-fill {
		fill: none;
		stroke: var(--color-fg-primary);
		stroke-width: 8;
		stroke-linecap: round;
		transition: stroke-dasharray var(--duration-standard) var(--ease-standard);
	}

	.score-value {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-h3);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.compact .score-value {
		font-size: var(--text-body);
	}

	.profile-info {
		flex: 1;
		min-width: 0;
	}

	.profile-name {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: 0.125rem;
	}

	.profile-title {
		font-size: var(--text-caption);
		font-weight: 600;
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-xs);
	}

	.compact .profile-title {
		margin-bottom: 0;
	}

	.profile-summary {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		line-height: 1.4;
	}

	.compact .profile-summary {
		font-size: var(--text-body-sm);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.focus-areas {
		display: flex;
		gap: var(--space-xs);
		flex-wrap: wrap;
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.focus-tag {
		font-size: var(--text-caption);
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-subtle);
		color: var(--color-fg-secondary);
	}

	.stats-row {
		display: flex;
		gap: var(--space-md);
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.stat {
		text-align: center;
		flex: 1;
	}

	.stat-value {
		display: block;
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.stat-label {
		display: block;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.profile-footer {
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
		text-align: center;
	}

	.footer-text {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		letter-spacing: 0.05em;
	}
</style>
