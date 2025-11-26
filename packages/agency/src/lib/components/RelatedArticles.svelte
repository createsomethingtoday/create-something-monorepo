<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { Paper } from '$lib/types/paper';

	interface Props {
		papers: Paper[];
		currentPaperId: string;
	}

	let { papers, currentPaperId }: Props = $props();

	// Filter out current paper and limit to 4
	const relatedPapers = papers
		.filter(p => p.id !== currentPaperId)
		.slice(0, 4);

	// Map category to display name
	const categoryDisplayNames: Record<string, string> = {
		automation: 'Automation',
		webflow: 'Webflow',
		development: 'Development',
		infrastructure: 'Infrastructure',
		analytics: 'Analytics',
		authentication: 'Authentication',
		dashboard: 'Dashboard',
		research: 'Research',
		tutorial: 'Tutorial',
		methodology: 'Methodology',
	};

	const getCategoryDisplayName = (category: string) => {
		return categoryDisplayNames[category] || category;
	};

	// Format date
	const formatDate = (dateString?: string | null) => {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};
</script>

{#if relatedPapers.length > 0}
	<section class="w-full max-w-5xl mx-auto px-6 py-16 border-t border-white/10">
		<div in:fly={{ y: 20, duration: 600 }}>
			<h2 class="text-3xl font-bold text-white mb-8">Related Articles</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				{#each relatedPapers as paper, index (paper.id)}
					<div in:fly={{ y: 20, duration: 500, delay: index * 100 }}>
						<a
							href={`/experiments/${paper.slug}`}
							class="group block h-full"
						>
							<article class="h-full bg-white/[0.07] border border-white/10 rounded-lg overflow-hidden transition-all duration-300 hover:border-white/30 hover:shadow-lg hover:shadow-white/5">
								<!-- ASCII Art Thumbnail -->
								<div class="aspect-[16/9] bg-black border-b border-white/10 flex items-center justify-center p-4">
									{#if paper.ascii_thumbnail || paper.ascii_art}
										<pre class="text-white text-[0.35rem] sm:text-[0.4rem] leading-[1.1] font-mono select-none opacity-80 group-hover:opacity-100 transition-opacity">{paper.ascii_thumbnail || paper.ascii_art}</pre>
									{:else}
										<pre class="text-white/50 text-[0.4rem] leading-tight font-mono select-none">{`
  ╔═════════════╗
  ║   ASCII     ║
  ║ THUMBNAIL   ║
  ╚═════════════╝
`}</pre>
									{/if}
								</div>

								<!-- Content -->
								<div class="p-5 space-y-3">
									<!-- Metadata -->
									<div class="flex items-center gap-2 text-xs text-white/50">
										<span class="capitalize">{getCategoryDisplayName(paper.category)}</span>
										{#if paper.published_at || paper.date}
											<span class="text-white/20">•</span>
											<span>{formatDate(paper.published_at || paper.date)}</span>
										{/if}
										<span class="text-white/20">•</span>
										<span>{paper.reading_time} min</span>
									</div>

									<!-- Title -->
									<h3 class="text-lg font-semibold text-white group-hover:text-white/90 transition-colors line-clamp-2 leading-snug">
										{paper.title}
									</h3>

									<!-- Excerpt -->
									{#if paper.excerpt_short}
										<p class="text-sm text-white/60 line-clamp-2 leading-relaxed">
											{paper.excerpt_short}
										</p>
									{/if}

									<!-- Read More Arrow -->
									<div class="flex items-center gap-2 text-sm text-white/80 group-hover:gap-3 transition-all">
										<span>Read more</span>
										<svg
											class="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</div>
								</div>

								<!-- Hover Overlay -->
								<div class="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
							</article>
						</a>
					</div>
				{/each}
			</div>
		</div>
	</section>
{/if}
