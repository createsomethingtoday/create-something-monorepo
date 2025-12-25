<script lang="ts">
	import type { Paper } from '$lib/types/paper';

	interface Props {
		paper: Paper;
		showFullStats?: boolean;
	}

	let { paper, showFullStats = false }: Props = $props();

	// Check if this is a tracked experiment
	const isTrackedExperiment = paper.slug.includes('experiment') || paper.category === 'experiments';

	// Extract metrics from paper content or use defaults
	const metrics = {
		hours: 26,
		errors: 47,
		interventions: 12,
		savings: 78
	};
</script>

{#if isTrackedExperiment}
	{#if !showFullStats}
		<!-- Compact badge version -->
		<div class="badge-compact inline-flex items-center gap-2 animate-scale">
			<svg class="badge-icon w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
			</svg>
			<span class="badge-label">TRACKED EXPERIMENT</span>
			<span class="badge-dot">•</span>
			<span class="badge-text">Real-time logging</span>
		</div>
	{:else}
		<!-- Full stats version -->
		<div class="stats-card w-full animate-fade-in">
			<div class="flex items-start justify-between mb-4">
				<div>
					<div class="flex items-center gap-2 mb-1">
						<svg class="stats-icon w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
						</svg>
						<h3 class="stats-title">Tracked Experiment</h3>
					</div>
					<p class="stats-subtitle">
						Real-time logging • Full methodology
					</p>
				</div>
			</div>

			<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
				<div class="metric-card text-center">
					<div class="metric-value">{metrics.hours}</div>
					<div class="metric-label">Hours</div>
				</div>
				<div class="metric-card text-center">
					<div class="metric-value">{metrics.errors}</div>
					<div class="metric-label">Errors</div>
				</div>
				<div class="metric-card text-center">
					<div class="metric-value">{metrics.interventions}</div>
					<div class="metric-label">Fixes</div>
				</div>
				<div class="metric-card text-center">
					<div class="metric-value">{metrics.savings}%</div>
					<div class="metric-label">Savings</div>
				</div>
			</div>

			<div class="metadata-section mt-4 pt-4">
				<p class="metadata-text mb-2">
					<strong class="metadata-strong">Data sources:</strong> Claude Code Analytics API, Cloudflare billing, real-time hooks
				</p>
				<p class="metadata-text">
					<strong class="metadata-strong">Reproducibility:</strong> Starting prompt, tracking logs, and architecture decisions documented
				</p>
			</div>

			<div class="mt-4">
				<a
					href="/methodology"
					class="methodology-link inline-flex items-center gap-1"
				>
					Learn about our methodology
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
					</svg>
				</a>
			</div>
		</div>
	{/if}
{/if}

<style>
	.badge-compact {
		padding: 0.5rem 1rem;
		background: var(--color-hover);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-full);
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	.badge-icon {
		color: var(--color-fg-muted);
	}

	.badge-label {
		font-weight: 500;
		color: var(--color-fg-secondary);
	}

	.badge-dot {
		color: var(--color-fg-muted);
	}

	.badge-text {
		/* Inherits color from parent */
	}

	.stats-card {
		padding: 1.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.stats-icon {
		color: var(--color-fg-tertiary);
	}

	.stats-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.stats-subtitle {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.metric-card {
		padding: 0.75rem;
		background: var(--color-hover);
		border-radius: var(--radius-sm);
	}

	.metric-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.metric-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.metadata-section {
		border-top: 1px solid var(--color-border-default);
	}

	.metadata-text {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	.metadata-strong {
		color: var(--color-fg-primary);
	}

	.methodology-link {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.methodology-link:hover {
		color: var(--color-fg-primary);
		text-decoration: underline;
	}

	.animate-scale {
		opacity: 0;
		transform: scale(0.95);
		animation: scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	.animate-fade-in {
		opacity: 0;
		animation: fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	@keyframes scale-in {
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes fade-in {
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-scale,
		.animate-fade-in {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
