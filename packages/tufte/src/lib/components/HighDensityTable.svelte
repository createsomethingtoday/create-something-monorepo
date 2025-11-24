<script lang="ts" generics="T extends Record<string, any>">
	/**
	 * HighDensityTable Component
	 *
	 * Agentic component that implements Tufte's principle:
	 * "High data density - maximize information per unit area"
	 *
	 * This component is agentic because it:
	 * - Automatically formats numbers with proper alignment
	 * - Handles ranking, counts, and percentages intelligently
	 * - Enforces compact spacing (minimize whitespace)
	 * - Applies subtle visual hierarchy (not heavy borders)
	 */

	import { formatNumber, getPercentage } from '$lib/utils/formatters.js';

	// Props
	export let items: T[];
	export let limit: number = 10;
	export let showRank: boolean = true;
	export let showPercentage: boolean = true;
	export let totalForPercentage: number | undefined = undefined;
	export let emptyMessage: string = 'No data yet';

	// Column configuration (agentic: sensible defaults)
	export let labelKey: keyof T = 'label' as keyof T;
	export let countKey: keyof T = 'count' as keyof T;
	export let badgeKey: keyof T | undefined = undefined;

	// Agentic: slice to limit
	$: displayItems = items.slice(0, limit);
	$: total = totalForPercentage ?? items.reduce((sum, item) => sum + (item[countKey] as number), 0);
</script>

<!--
	Tufte Principles Applied:
	1. High data density (10 items in compact space)
	2. Maximize data-ink ratio (subtle borders, no heavy decoration)
	3. Tabular numbers (monospace font, right-aligned)
	4. Clear visual hierarchy (opacity variations)
-->
<div class="space-y-1">
	{#if displayItems.length === 0}
		<p class="text-white/40 text-xs py-2">{emptyMessage}</p>
	{:else}
		{#each displayItems as item, i}
			<div
				class="flex items-center gap-2 text-xs font-mono py-1.5 border-b border-white/5 last:border-0"
			>
				<!-- Rank number (Tufte: muted, right-aligned) -->
				{#if showRank}
					<span class="text-white/30 w-4 text-right">{i + 1}</span>
				{/if}

				<!-- Optional badge (e.g., property tag) -->
				{#if badgeKey && item[badgeKey]}
					<span class="text-white/40 px-1.5 py-0.5 bg-white/5 rounded text-[10px]">
						{item[badgeKey]}
					</span>
				{/if}

				<!-- Label (Tufte: main data, truncate if needed) -->
				<span class="flex-1 truncate text-white/80">{item[labelKey]}</span>

				<!-- Count (Tufte: tabular numbers, right-aligned) -->
				<span class="text-white/60 tabular-nums w-12 text-right">
					{formatNumber(item[countKey] as number)}
				</span>

				<!-- Percentage of total (Tufte: subtle context) -->
				{#if showPercentage}
					<span class="text-white/30 w-10 text-right">
						{getPercentage(item[countKey] as number, total)}%
					</span>
				{/if}
			</div>
		{/each}
	{/if}
</div>
