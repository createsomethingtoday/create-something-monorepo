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
		background: var(--color-bg-pure);
	}

	/* Shared styles available to child pages via :global */

	/* Container */
	:global(.nba-container) {
		max-width: 56rem;
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	/* Breadcrumb navigation */
	:global(.nba-breadcrumb) {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		margin-bottom: var(--space-sm);
	}

	:global(.nba-breadcrumb-link) {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	:global(.nba-breadcrumb-link:hover) {
		color: var(--color-fg-primary);
	}

	:global(.nba-breadcrumb-sep) {
		color: var(--color-fg-subtle);
	}

	:global(.nba-breadcrumb-current) {
		color: var(--color-fg-tertiary);
	}

	/* Page header */
	:global(.nba-header) {
		padding: var(--space-xl) 0 var(--space-lg);
	}

	:global(.nba-title) {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	:global(.nba-subtitle) {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	/* Status bar */
	:global(.nba-status-bar) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		margin-bottom: var(--space-lg);
	}

	:global(.nba-status-indicator) {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	:global(.nba-status-icon) {
		color: var(--color-fg-muted);
	}

	:global(.nba-status-icon--live) {
		color: var(--color-success);
	}

	:global(.nba-status-icon--error) {
		color: var(--color-error);
	}

	:global(.nba-status-label) {
		color: var(--color-fg-tertiary);
	}

	:global(.nba-status-label--live) {
		color: var(--color-success);
	}

	:global(.nba-status-label--error) {
		color: var(--color-error);
	}

	:global(.nba-timestamp) {
		color: var(--color-fg-muted);
		font-variant-numeric: tabular-nums;
	}

	/* Error state */
	:global(.nba-error-state) {
		text-align: center;
		padding: var(--space-xl);
		color: var(--color-fg-muted);
	}

	:global(.nba-error-state svg) {
		color: var(--color-error);
		margin-bottom: var(--space-sm);
	}

	:global(.nba-error-message) {
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	:global(.nba-error-hint) {
		font-size: var(--text-body-sm);
	}

	/* Scheduled game state */
	:global(.nba-scheduled-state) {
		text-align: center;
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	:global(.nba-scheduled-icon) {
		display: block;
		margin: 0 auto var(--space-md);
		color: var(--color-fg-tertiary);
	}

	:global(.nba-scheduled-title) {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	:global(.nba-scheduled-message) {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin-bottom: var(--space-xs);
		max-width: 40rem;
		margin-left: auto;
		margin-right: auto;
	}

	:global(.nba-scheduled-message strong) {
		color: var(--color-fg-primary);
		font-weight: 600;
	}

	:global(.nba-scheduled-hint) {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-md);
	}

	:global(.nba-back-link) {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		margin-top: var(--space-sm);
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	:global(.nba-back-link:hover) {
		color: var(--color-fg-primary);
	}

	/* Section labels (Tufte: minimal, functional) */
	:global(.nba-section-label) {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	/* Content section */
	:global(.nba-section) {
		padding-bottom: var(--space-xl);
	}

	/* Grids */
	:global(.nba-grid-2) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-md);
	}

	:global(.nba-grid-3) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	/* Cards */
	:global(.nba-card) {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-md);
	}

	:global(.nba-card-header) {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	/* Stats table (Tufte: high data-ink ratio) */
	:global(.nba-stats-table) {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-body-sm);
	}

	:global(.nba-stats-table th) {
		text-align: left;
		padding: var(--space-xs) var(--space-sm);
		color: var(--color-fg-muted);
		font-weight: 500;
		border-bottom: 1px solid var(--color-border-default);
	}

	:global(.nba-stats-table th:last-child),
	:global(.nba-stats-table td:last-child) {
		text-align: right;
	}

	:global(.nba-stats-table td) {
		padding: var(--space-xs) var(--space-sm);
		color: var(--color-fg-secondary);
	}

	:global(.nba-stats-table tbody tr) {
		border-bottom: 1px solid var(--color-border-default);
	}

	:global(.nba-stats-table tbody tr:last-child) {
		border-bottom: none;
	}

	/* Stat values with semantic coloring */
	:global(.nba-stat-positive) {
		color: var(--color-success);
		font-weight: 600;
	}

	:global(.nba-stat-negative) {
		color: var(--color-error);
		font-weight: 600;
	}

	:global(.nba-stat-neutral) {
		color: var(--color-fg-secondary);
	}

	/* Methodology note (Tufte: annotations that explain) */
	:global(.nba-methodology) {
		padding: var(--space-md);
		border-left: 2px solid var(--color-border-default);
		margin-top: var(--space-lg);
	}

	:global(.nba-methodology-title) {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	:global(.nba-methodology-text) {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	:global(.nba-methodology-list) {
		list-style: none;
		padding: 0;
		margin: var(--space-sm) 0 0;
	}

	:global(.nba-methodology-list li) {
		padding: var(--space-xs) 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Empty state */
	:global(.nba-empty) {
		text-align: center;
		padding: var(--space-lg);
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}
</style>
