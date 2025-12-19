<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { AssetStatus } from '$lib/types';
	import { STATUS_CONFIG } from '$lib/types';
	import Card from '$lib/components/ui/card.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import { ChevronRight } from 'lucide-svelte';

	interface Props {
		status: AssetStatus;
		count: number;
		icon: Snippet;
		onclick?: () => void;
	}

	let { status, count, icon, onclick }: Props = $props();

	const config = $derived(STATUS_CONFIG[status]);
	const badgeVariant = $derived(
		status === 'Published'
			? 'success'
			: status === 'Rejected'
				? 'error'
				: status === 'Delisted'
					? 'warning'
					: status === 'Scheduled'
						? 'info'
						: 'default'
	);
</script>

<Card class="overview-card" {onclick} role={onclick ? 'button' : undefined} tabindex={onclick ? 0 : undefined}>
	<div class="card-header">
		<div class="icon-wrapper" style="background-color: {config.darkColor}20;">
			{@render icon()}
		</div>
		<Badge variant={badgeVariant}>{status}</Badge>
	</div>

	<div class="card-body">
		<div class="count">{count}</div>
		<div class="label">{status} Templates</div>
	</div>

	{#if onclick}
		<div class="card-footer">
			<span class="footer-link">View all {status.toLowerCase()} templates</span>
			<ChevronRight size={16} />
		</div>
	{/if}
</Card>

<style>
	/* ==========================================================================
	   OverviewCard - Status summary with golden ratio proportions
	   φ-based spacing: header → body → footer
	   ========================================================================== */

	:global(.overview-card) {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-md);
		width: 240px;
		min-height: 180px;
		flex-shrink: 0;
		cursor: pointer;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	:global(.overview-card:hover) {
		transform: translateY(-4px);
		box-shadow: var(--shadow-lg);
		border-color: var(--color-border-emphasis);
	}

	/* Header - Icon + Status badge */
	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	.icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
		flex-shrink: 0;
	}

	/* Body - Large count + label */
	.card-body {
		display: flex;
		flex-direction: column;
		gap: calc(var(--space-xs) / 1.618);
		flex: 1;
	}

	.count {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		line-height: 1;
	}

	.label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Footer - Link to view all */
	.card-footer {
		display: flex;
		align-items: center;
		gap: calc(var(--space-xs) / 2);
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	:global(.overview-card:hover) .card-footer {
		color: var(--webflow-blue);
	}

	.footer-link {
		transition: color var(--duration-micro) var(--ease-standard);
	}
</style>
