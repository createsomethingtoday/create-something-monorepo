<script lang="ts">
	/**
	 * RequiredFixesCard - ❌Denied app-review exception items for partner apps.
	 *
	 * A structured ledger of findings that were evaluated for an exception and
	 * ruled "fix required". The prose lives in the review feedback the creator
	 * already received; this card is the durable per-item record. Only rendered
	 * for partnership apps after the review round has been released.
	 */
	import type { RequiredFixExceptionItem } from '$lib/server/airtable';
	import { formatLongDate } from '$lib/utils/format';
	import { Card, CardHeader, CardTitle, CardContent } from './ui';
	import { Wrench } from 'lucide-svelte';

	interface Props {
		items: RequiredFixExceptionItem[];
	}

	let { items }: Props = $props();
</script>

<Card>
	<CardHeader>
		<div class="fixes-header">
			<Wrench size={18} />
			<CardTitle>Required Fixes from App Review</CardTitle>
		</div>
	</CardHeader>
	<CardContent>
		<p class="fixes-intro">
			These findings were evaluated for an exception and require changes. The full details are in
			the review feedback you received.
		</p>
		<ul class="fixes-list">
			{#each items as fix (fix.id)}
				<li class="fix-row">
					<span class="fix-name">{fix.item}</span>
					<div class="fix-meta">
						{#if fix.type}
							<span class="fix-badge">{fix.type}</span>
						{/if}
						{#if fix.versionNumber}
							<span class="fix-badge">v{fix.versionNumber}</span>
						{/if}
						{#if fix.decidedAt}
							<span class="fix-date">Decided {formatLongDate(fix.decidedAt)}</span>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	</CardContent>
</Card>

<style>
	.fixes-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--color-warning-ink);
	}

	.fixes-intro {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
		line-height: 1.6;
	}

	.fixes-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.fix-row {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-sm) 0;
		border-top: 1px solid var(--color-border-default);
	}

	.fix-name {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.fix-meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.fix-badge {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		padding: 1px var(--space-xs);
	}

	.fix-date {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}
</style>
