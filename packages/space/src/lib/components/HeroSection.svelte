<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import PaperCard from './PaperCard.svelte';
	import type { Paper } from '$lib/types/paper';

	interface Props {
		featuredPapers: Paper[];
	}

	let { featuredPapers }: Props = $props();
</script>

<section class="relative pt-32 pb-24 px-6 overflow-hidden">
	<div class="max-w-7xl mx-auto">
		<!-- Hero Text - Now First -->
		<div class="text-center space-y-6 mb-16">
			<div class="text-base md:text-lg font-medium text-white/90" in:fly={{ y: 20, duration: 600 }}>
				CREATE SOMETHING SPACE
			</div>

			<h1 class="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight" in:fly={{ y: 20, duration: 600, delay: 200 }}>
				Interactive Tutorials for AI-Native Development
			</h1>

			<p class="text-lg md:text-xl text-white/60 max-w-3xl mx-auto" in:fly={{ y: 20, duration: 600, delay: 400 }}>
				Learn by doing with runnable code examples and hands-on experiments. Fork, modify, and run these tutorials directly in your browser. Research methodology and full papers available on <a href="https://createsomething.io" class="text-white/80 hover:text-white underline">createsomething.io</a>
			</p>

			<!-- CTA to Research -->
			<div class="mt-8" in:fly={{ y: 20, duration: 600, delay: 600 }}>
				<a
					href="https://createsomething.io"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
				>
					<span class="text-sm md:text-base">See the research methodology</span>
					<svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
					</svg>
				</a>
			</div>
		</div>

		<!-- Featured Tutorials Section -->
		{#if featuredPapers.length > 0}
			<div class="text-center mb-8" in:fly={{ y: 20, duration: 600, delay: 800 }}>
				<h2 class="text-2xl md:text-3xl font-bold text-white">Featured Tutorials</h2>
				<p class="text-white/60 mt-2">Start with these hands-on experiments</p>
			</div>

			<!-- Desktop Layout - Horizontal -->
			<div class="hidden md:flex justify-center items-center gap-6 max-w-6xl mx-auto">
				{#each featuredPapers.slice(0, 3) as paper, index (paper.id)}
					<div class="flex-1 max-w-xs" in:fly={{ y: 20, duration: 600, delay: 1000 + index * 100 }}>
						<PaperCard {paper} rotation={0} {index} />
					</div>
				{/each}
			</div>

			<!-- Mobile Layout - Simple Stack -->
			<div class="grid grid-cols-1 gap-6 md:hidden">
				{#each featuredPapers.slice(0, 2) as paper, index (paper.id)}
					<div in:fly={{ y: 20, duration: 600, delay: 1000 + index * 100 }}>
						<PaperCard {paper} rotation={0} {index} />
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Background Gradient -->
	<div class="absolute inset-0 -z-10 bg-gradient-to-b from-black via-black to-[#0a0a0a]"></div>
</section>
