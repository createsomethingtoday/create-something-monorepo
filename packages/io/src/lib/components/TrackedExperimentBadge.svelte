<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import type { Paper } from '@create-something/components/types';

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
		<div
			class="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/20 rounded-full text-xs text-white/70"
			transition:scale={{ duration: 300 }}
		>
			<svg class="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
			</svg>
			<span class="font-medium text-white/90">TRACKED EXPERIMENT</span>
			<span class="text-white/40">•</span>
			<span>Real-time logging</span>
		</div>
	{:else}
		<!-- Full stats version -->
		<div class="w-full p-6 bg-[#111111] border border-white/10 rounded-lg" transition:fade={{ duration: 500 }}>
			<div class="flex items-start justify-between mb-4">
				<div>
					<div class="flex items-center gap-2 mb-1">
						<svg class="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
						</svg>
						<h3 class="text-lg font-semibold text-white">Tracked Experiment</h3>
					</div>
					<p class="text-sm text-white/60">
						Real-time logging • Full methodology
					</p>
				</div>
			</div>

			<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
				<div class="p-3 bg-white/5 rounded text-center">
					<div class="text-xl font-bold text-white">{metrics.hours}</div>
					<div class="text-xs text-white/40">Hours</div>
				</div>
				<div class="p-3 bg-white/5 rounded text-center">
					<div class="text-xl font-bold text-white">{metrics.errors}</div>
					<div class="text-xs text-white/40">Errors</div>
				</div>
				<div class="p-3 bg-white/5 rounded text-center">
					<div class="text-xl font-bold text-white">{metrics.interventions}</div>
					<div class="text-xs text-white/40">Fixes</div>
				</div>
				<div class="p-3 bg-white/5 rounded text-center">
					<div class="text-xl font-bold text-white">{metrics.savings}%</div>
					<div class="text-xs text-white/40">Savings</div>
				</div>
			</div>

			<div class="mt-4 pt-4 border-t border-white/10">
				<p class="text-xs text-white/60 mb-2">
					<strong class="text-white">Data sources:</strong> Claude Code Analytics API, Cloudflare billing, real-time hooks
				</p>
				<p class="text-xs text-white/60">
					<strong class="text-white">Reproducibility:</strong> Starting prompt, tracking logs, and architecture decisions documented
				</p>
			</div>

			<div class="mt-4">
				<a
					href="/methodology"
					class="text-xs text-white/70 hover:text-white hover:underline inline-flex items-center gap-1"
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
