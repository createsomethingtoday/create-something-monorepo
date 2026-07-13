<script lang="ts">
	/**
	 * NBA Live Analytics Layout
	 *
	 * Shared layout for all NBA Live experiment pages.
	 * Provides common container, typography, and status patterns.
	 */

	import { ArrowLeft } from 'lucide-svelte';

	let { children } = $props();
</script>

<div class="nba-layout">
	{@render children()}
</div>

<style>
	.nba-layout {
		min-height: 100vh;
		background: var(--color-performance-bg-pure);
	}

	/* Shared styles available to child pages via :global */

	/* Container */
	:global(.nba-container) {
		max-width: 56rem;
		margin: 0 auto;
		padding: 0 var(--space-performance-md);
	}

	/* Breadcrumb navigation */
	:global(.nba-breadcrumb) {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
		font-size: var(--text-performance-body-sm);
		margin-bottom: var(--space-performance-sm);
	}

	:global(.nba-breadcrumb-link) {
		display: inline-flex;
		align-items: center;
		gap: var(--space-performance-xs);
		color: var(--color-performance-fg-muted);
		text-decoration: none;
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	:global(.nba-breadcrumb-link:hover) {
		color: var(--color-performance-fg-primary);
	}

	:global(.nba-breadcrumb-sep) {
		color: var(--color-performance-fg-subtle);
	}

	:global(.nba-breadcrumb-current) {
		color: var(--color-performance-fg-tertiary);
	}

	/* Page header */
	:global(.nba-header) {
		padding: var(--space-performance-xl) 0 var(--space-performance-lg);
	}

	:global(.nba-title) {
		font-size: var(--text-performance-h1);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
		margin: 0 0 var(--space-performance-xs);
	}

	:global(.nba-subtitle) {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-secondary);
		line-height: 1.6;
	}

	/* Status bar */
	:global(.nba-status-bar) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-performance-xs) var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-body-sm);
		margin-bottom: var(--space-performance-lg);
	}

	:global(.nba-status-indicator) {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
	}

	:global(.nba-status-icon) {
		color: var(--color-performance-fg-muted);
	}

	:global(.nba-status-icon--live) {
		color: var(--color-performance-success);
	}

	:global(.nba-status-icon--error) {
		color: var(--color-performance-error);
	}

	:global(.nba-status-label) {
		color: var(--color-performance-fg-tertiary);
	}

	:global(.nba-status-label--live) {
		color: var(--color-performance-success);
	}

	:global(.nba-status-label--error) {
		color: var(--color-performance-error);
	}

	:global(.nba-timestamp) {
		color: var(--color-performance-fg-muted);
		font-variant-numeric: tabular-nums;
	}

	/* Error state */
	:global(.nba-error-state) {
		text-align: center;
		padding: var(--space-performance-xl);
		color: var(--color-performance-fg-muted);
	}

	:global(.nba-error-state svg) {
		color: var(--color-performance-error);
		margin-bottom: var(--space-performance-sm);
	}

	:global(.nba-error-message) {
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-xs);
	}

	:global(.nba-error-hint) {
		font-size: var(--text-performance-body-sm);
	}

	/* Scheduled game state */
	:global(.nba-scheduled-state) {
		text-align: center;
		padding: var(--space-performance-xl);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
	}

	:global(.nba-scheduled-icon) {
		display: block;
		margin: 0 auto var(--space-performance-md);
		color: var(--color-performance-fg-tertiary);
	}

	:global(.nba-scheduled-title) {
		font-size: var(--text-performance-h2);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-sm);
	}

	:global(.nba-scheduled-message) {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-secondary);
		line-height: 1.6;
		margin-bottom: var(--space-performance-xs);
		max-width: 40rem;
		margin-left: auto;
		margin-right: auto;
	}

	:global(.nba-scheduled-message strong) {
		color: var(--color-performance-fg-primary);
		font-weight: 600;
	}

	:global(.nba-scheduled-hint) {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		margin-bottom: var(--space-performance-md);
	}

	:global(.nba-back-link) {
		display: inline-flex;
		align-items: center;
		gap: var(--space-performance-xs);
		margin-top: var(--space-performance-sm);
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-body-sm);
		text-decoration: none;
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	:global(.nba-back-link:hover) {
		color: var(--color-performance-fg-primary);
	}

	/* Section labels (Tufte: minimal, functional) */
	:global(.nba-section-label) {
		font-size: var(--text-performance-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-performance-fg-muted);
		margin-bottom: var(--space-performance-sm);
	}

	/* Content section */
	:global(.nba-section) {
		padding-bottom: var(--space-performance-xl);
	}

	/* Grids */
	:global(.nba-grid-2) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-performance-md);
	}

	:global(.nba-grid-3) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-performance-md);
	}

	/* Cards */
	:global(.nba-card) {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
		padding: var(--space-performance-md);
	}

	:global(.nba-card-header) {
		font-size: var(--text-performance-body);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-sm);
		padding-bottom: var(--space-performance-sm);
	}

	/* Stats table (Tufte: high data-ink ratio) */
	:global(.nba-stats-table) {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-performance-body-sm);
	}

	:global(.nba-stats-table th) {
		text-align: left;
		padding: var(--space-performance-xs) var(--space-performance-sm);
		color: var(--color-performance-fg-muted);
		font-weight: 500;
	}

	:global(.nba-stats-table th:last-child),
	:global(.nba-stats-table td:last-child) {
		text-align: right;
	}

	:global(.nba-stats-table td) {
		padding: var(--space-performance-xs) var(--space-performance-sm);
		color: var(--color-performance-fg-secondary);
	}

	:global(.nba-stats-table tbody tr:last-child) {
		border-bottom: none;
	}

	/* Stat values with semantic coloring */
	:global(.nba-stat-positive) {
		color: var(--color-performance-success);
		font-weight: 600;
	}

	:global(.nba-stat-negative) {
		color: var(--color-performance-error);
		font-weight: 600;
	}

	:global(.nba-stat-neutral) {
		color: var(--color-performance-fg-secondary);
	}

	/* Methodology note (Tufte: annotations that explain) */
	:global(.nba-methodology) {
		padding: var(--space-performance-md);
		border-left: 2px solid var(--color-performance-border-default);
		margin-top: var(--space-performance-lg);
	}

	:global(.nba-methodology-title) {
		font-size: var(--text-performance-body);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-xs);
	}

	:global(.nba-methodology-text) {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		line-height: 1.6;
	}

	:global(.nba-methodology-list) {
		list-style: none;
		padding: 0;
		margin: var(--space-performance-sm) 0 0;
	}

	:global(.nba-methodology-list li) {
		padding: var(--space-performance-xs) 0;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
	}

	/* Empty state */
	:global(.nba-empty) {
		text-align: center;
		padding: var(--space-performance-lg);
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-body-sm);
	}
</style>
