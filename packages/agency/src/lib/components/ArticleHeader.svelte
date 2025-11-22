<script lang="ts">
	import { fly } from 'svelte/transition';
	import TrackedExperimentBadge from './TrackedExperimentBadge.svelte';
	import type { Paper } from '$lib/types/paper';

	interface Props {
		paper: Paper;
	}

	let { paper }: Props = $props();

	const categoryDisplayNames: Record<string, string> = {
		automation: 'Automation',
		webflow: 'Webflow',
		development: 'Development',
	};

	const categoryDisplayName = categoryDisplayNames[paper.category] || paper.category;

	const difficultyColors: Record<string, string> = {
		Beginner: 'text-green-400 bg-green-400',
		Intermediate: 'text-yellow-400 bg-yellow-400',
		Advanced: 'text-red-400 bg-red-400',
	};

	const difficultyColor = difficultyColors[paper.difficulty_level || ''] || 'text-white bg-white';

	const formatDate = (dateString?: string) => {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};
</script>

<header class="w-full max-w-5xl mx-auto px-6 py-12" in:fly={{ y: 20, duration: 600 }}>
	<!-- ASCII Art Hero -->
	<div class="mb-8 bg-black border border-white/10 rounded-lg overflow-hidden">
		<div class="aspect-[21/9] flex items-center justify-center p-8">
			{#if paper.ascii_art}
				<pre class="text-terminal-green text-[0.7rem] sm:text-[0.9rem] leading-[1.2] font-mono select-none opacity-90">{paper.ascii_art}</pre>
			{:else}
				<pre class="text-white/70 text-[0.8rem] leading-tight font-mono select-none">{`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║                     [ASCII ART HERO]                      ║
  ║                      PLACEHOLDER                          ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
`}</pre>
			{/if}
		</div>
	</div>

	<!-- Category Tag -->
	<div class="mb-6" in:fly={{ x: -20, duration: 500, delay: 200 }}>
		<span class="inline-block px-4 py-2 bg-white/5 border border-white/10 rounded text-sm font-medium text-white/80 uppercase tracking-wider">
			{categoryDisplayName}
		</span>
	</div>

	<!-- Title -->
	<h1 class="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight" in:fly={{ y: 20, duration: 500, delay: 300 }}>
		{paper.title}
	</h1>

	<!-- Excerpt -->
	{#if paper.excerpt_long}
		<p class="text-lg sm:text-xl text-white/70 mb-8 leading-relaxed max-w-3xl" in:fly={{ y: 20, duration: 500, delay: 400 }}>
			{paper.excerpt_long}
		</p>
	{/if}

	<!-- Metadata Row -->
	<div class="flex flex-wrap items-center gap-6 text-sm text-white/60 border-t border-white/10 pt-6" in:fly={{ y: 20, duration: 500, delay: 500 }}>
		<!-- Published Date -->
		{#if paper.published_at || paper.date}
			<div class="flex items-center gap-2">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
				</svg>
				<span>{formatDate(paper.published_at || paper.date)}</span>
			</div>
		{/if}

		<!-- Reading Time -->
		<div class="flex items-center gap-2">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span>{paper.reading_time} min read</span>
		</div>

		<!-- Difficulty -->
		{#if paper.difficulty_level}
			<div class="flex items-center gap-2">
				<div class={`w-2 h-2 rounded-full ${difficultyColor.split(' ')[1]}`}></div>
				<span class={difficultyColor.split(' ')[0]}>
					{paper.difficulty_level}
				</span>
			</div>
		{/if}

		<!-- Technical Focus Tags -->
		{#if paper.technical_focus}
			<div class="flex items-center gap-2">
				<span class="text-white/40">Tags:</span>
				<div class="flex gap-2">
					{#each paper.technical_focus.split(',').slice(0, 3) as tech}
						<span class="px-2 py-1 text-xs bg-white/5 border border-white/10 rounded text-white/60">
							{tech.trim()}
						</span>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Tracked Experiment Badge -->
	<div class="mt-8" in:fly={{ y: 20, duration: 500, delay: 600 }}>
		<TrackedExperimentBadge {paper} showFullStats={true} />
	</div>
</header>
