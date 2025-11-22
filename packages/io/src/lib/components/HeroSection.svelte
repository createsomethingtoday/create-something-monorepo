<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { PaperCard } from '@create-something/components';
	import type { Paper } from '@create-something/components/types';

	interface Props {
		featuredPapers: Paper[];
	}

	let { featuredPapers }: Props = $props();
</script>

<section class="relative pt-32 pb-24 px-6 overflow-hidden">
	<div class="max-w-7xl mx-auto">
		<!-- Newsletter Signup - Top -->
		<div class="flex justify-center mb-12" in:fly={{ y: -20, duration: 600 }}>
			<a
				href="#newsletter"
				class="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 rounded-full text-white/90 text-sm hover:bg-white/20 hover:border-white/30 transition-all"
			>
				<span>Get weekly updates with our Newsletter</span>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
				</svg>
			</a>
		</div>

		<!-- Featured Cards - Horizontal Layout -->
		{#if featuredPapers.length > 0}
			<div class="mt-11 mb-16 hidden md:flex justify-center items-center gap-6 max-w-6xl mx-auto">
				{#each featuredPapers.slice(0, 3) as paper, index (paper.id)}
					<div class="flex-1 max-w-xs" in:fly={{ y: 20, duration: 600, delay: 200 + index * 100 }}>
						<PaperCard {paper} rotation={0} {index} />
					</div>
				{/each}
			</div>
		{/if}

		<!-- Mobile Featured Cards - Simple Stack -->
		{#if featuredPapers.length > 0}
			<div class="grid grid-cols-1 gap-6 mb-16 md:hidden">
				{#each featuredPapers.slice(0, 2) as paper, index (paper.id)}
					<div in:fly={{ y: 20, duration: 600, delay: 200 + index * 100 }}>
						<PaperCard {paper} rotation={0} {index} />
					</div>
				{/each}
			</div>
		{/if}

		<!-- Hero Text -->
		<div class="text-center space-y-6 mt-16">
			<div class="text-base md:text-lg font-medium text-white/90" in:fly={{ y: 20, duration: 600, delay: 800 }}>
				CREATE SOMETHING
			</div>

			<h1 class="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight" in:fly={{ y: 20, duration: 600, delay: 1000 }}>
				Systems Thinking for AI-Native Development
			</h1>

			<p class="text-lg md:text-xl text-white/60 max-w-3xl mx-auto" in:fly={{ y: 20, duration: 600, delay: 1200 }}>
				Research papers with tracked experiments and rigorous methodology. Each paper documents what was built, measured results, and honest learnings. Interactive versions available on <a href="https://createsomething.space" class="text-white/80 hover:text-white underline">createsomething.space</a>
			</p>

			<!-- Methodology Call-Out -->
			<div class="mt-8" in:fly={{ y: 20, duration: 600, delay: 1400 }}>
				<a
					href="/methodology"
					class="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
					</svg>
					<span class="text-sm md:text-base">See our research methodology</span>
					<svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
					</svg>
				</a>
			</div>
		</div>
	</div>

	<!-- Background Gradient -->
	<div class="absolute inset-0 -z-10 bg-gradient-to-b from-black via-black to-[#0a0a0a]"></div>
</section>
