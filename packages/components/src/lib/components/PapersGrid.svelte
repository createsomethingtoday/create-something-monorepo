<script lang="ts">
	import { fade } from 'svelte/transition';
	import PaperCard from './PaperCard.svelte';
	import type { Paper } from '@create-something/components/types';

	interface Props {
		papers: Paper[];
		title?: string;
		subtitle?: string;
	}

	let { papers, title = 'Latest Articles', subtitle }: Props = $props();

	// Define rotation patterns for cards (subtle tilted effect)
	const rotations = [-1, 1, -0.5, 0.5, -1.5, 1.5, -1, 1];
</script>

<section class="papers-section py-16 px-6">
	<div class="max-w-7xl mx-auto">
		<!-- Section Header -->
		<div class="mb-12">
			<h2 class="section-title text-3xl md:text-4xl font-bold mb-2">
				{title}
			</h2>
			{#if subtitle}
				<p class="section-subtitle text-lg">{subtitle}</p>
			{/if}
		</div>

		<!-- Responsive Grid - Matches Webflow inspiration -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			{#each papers as paper, index (paper.id)}
				<PaperCard
					{paper}
					rotation={rotations[index % rotations.length]}
					{index}
				/>
			{/each}
		</div>

		<!-- Empty State -->
		{#if papers.length === 0}
			<div class="text-center py-24" transition:fade>
				<div class="text-6xl mb-6">📄</div>
				<h3 class="empty-title text-2xl font-semibold mb-3">No papers yet</h3>
				<p class="empty-text">
					Check back soon for technical content and case studies.
				</p>
			</div>
		{/if}
	</div>
</section>

<style>
	.papers-section {
		background: var(--color-bg-pure);
	}

	.section-title {
		color: var(--color-fg-primary);
	}

	.section-subtitle {
		color: var(--color-fg-tertiary);
	}

	.empty-title {
		color: var(--color-fg-primary);
	}

	.empty-text {
		color: var(--color-fg-tertiary);
	}
</style>
