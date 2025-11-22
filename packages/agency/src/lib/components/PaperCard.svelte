<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import type { Paper } from '$lib/types/paper';

	interface Props {
		paper: Paper;
		rotation?: number;
		index?: number;
	}

	let { paper, rotation = 0, index = 0 }: Props = $props();

	// Map category to display name
	const categoryDisplayNames: Record<string, string> = {
		automation: 'Automation',
		webflow: 'Webflow',
		development: 'Development',
	};

	const categoryDisplayName = categoryDisplayNames[paper.category] || paper.category;

	// Format date
	const formattedDate = paper.published_at
		? new Date(paper.published_at).toLocaleDateString('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric',
			})
		: null;
</script>

<a href={`/experiments/${paper.slug}`} class="block h-full">
	<article
		class="group h-full"
		style="transform: rotate({rotation}deg);"
		in:fly={{ y: 20, duration: 500, delay: index * 100 }}
	>
		<div class="relative h-full bg-white/[0.07] border border-white/10 rounded-none overflow-hidden transition-all duration-300 hover:border-white/30 hover:shadow-2xl hover:shadow-white/10 hover:-translate-y-2">
			<!-- Image or ASCII Art -->
			<div class="aspect-[4/3] bg-black border-b border-white/10 flex items-center justify-center p-4 relative overflow-hidden">
				{#if paper.ascii_art}
					<pre class="text-white text-[0.45rem] leading-[1.1] font-mono select-none opacity-90 group-hover:opacity-100 transition-opacity">{paper.ascii_art}</pre>
				{:else}
					<div class="text-white/20 text-6xl">
						📄
					</div>
				{/if}

				<!-- Hover Arrow Button -->
				<div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
					<div class="w-10 h-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center">
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							class="text-white"
						>
							<path
								d="M10.6696 6.276L4.93156 12.014L3.98889 11.0713L9.72622 5.33333H4.66956V4H12.0029V11.3333H10.6696V6.276Z"
								fill="currentColor"
							/>
						</svg>
					</div>
				</div>
			</div>

			<!-- Card Content -->
			<div class="p-2 pb-4 space-y-3">
				<!-- Metadata -->
				<div class="flex items-center gap-2 text-xs font-medium text-white/60">
					{#if formattedDate}
						<span>{formattedDate}</span>
						<span class="w-1 h-1 rounded-full bg-white/40"></span>
					{/if}
					<span>{paper.reading_time} min read</span>
				</div>

				<!-- Title -->
				<h3 class="text-lg font-medium text-white group-hover:text-white/90 transition-colors line-clamp-2 leading-tight">
					{paper.title}
				</h3>

				<!-- Category Badge with Sliding Animation -->
				<div class="inline-block">
					<div class="relative overflow-hidden">
						<div class="px-3 py-1 bg-white/5 border border-white/10 rounded text-xs font-medium text-white/90 group-hover:translate-y-[-100%] transition-transform duration-300">
							{categoryDisplayName}
						</div>
						<div class="absolute inset-0 px-3 py-1 bg-white/5 border border-white/10 rounded text-xs font-medium text-white/90 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300">
							{categoryDisplayName}
						</div>
					</div>
				</div>
			</div>

			<!-- Hover Overlay Effect -->
			<div class="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
		</div>
	</article>
</a>
