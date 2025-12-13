<script lang="ts">
	import type { Paper } from '@create-something/components/types';

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
		class="group animate-reveal h-full"
		style="transform: rotate({rotation}deg); --delay: {index};"
	>
		<div class="paper-card relative h-full overflow-hidden">
			<!-- Image or ASCII Art -->
			<div class="paper-image aspect-[4/3] flex items-center justify-center p-4 relative overflow-hidden">
				{#if paper.ascii_art}
					<pre class="ascii-art text-[0.45rem] leading-[1.1] font-mono select-none">{paper.ascii_art}</pre>
				{:else}
					<div class="paper-placeholder text-6xl">
						📄
					</div>
				{/if}

				<!-- Hover Arrow Button -->
				<div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
					<div class="arrow-button w-10 h-10 flex items-center justify-center">
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							class="arrow-icon"
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
				<div class="paper-meta flex items-center gap-2 font-medium">
					{#if formattedDate}
						<span>{formattedDate}</span>
						<span class="meta-dot w-1 h-1"></span>
					{/if}
					<span>{paper.reading_time} min read</span>
				</div>

				<!-- Title -->
				<h3 class="paper-title font-medium line-clamp-2 leading-tight">
					{paper.title}
				</h3>

				<!-- Category Badge with Sliding Animation -->
				<div class="inline-block">
					<div class="relative overflow-hidden">
						<div class="category-badge px-3 py-1 font-medium group-hover:translate-y-[-100%] transition-transform duration-300">
							{categoryDisplayName}
						</div>
						<div class="category-badge absolute inset-0 px-3 py-1 font-medium translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300">
							{categoryDisplayName}
						</div>
					</div>
				</div>
			</div>

			<!-- Hover Overlay Effect -->
			<div class="hover-overlay absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
		</div>
	</article>
</a>

<style>
	/* Card Container */
	.paper-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.paper-card:hover {
		border-color: var(--color-border-strong);
		box-shadow: var(--shadow-xl), 0 0 30px var(--color-hover);
		transform: translateY(-8px);
	}

	/* Image Section */
	.paper-image {
		background: var(--color-bg-pure);
		border-bottom: 1px solid var(--color-border-default);
	}

	/* ASCII Art */
	.ascii-art {
		color: var(--color-fg-primary);
		opacity: 0.9;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.group:hover .ascii-art {
		opacity: 1;
	}

	/* Placeholder */
	.paper-placeholder {
		color: var(--color-fg-subtle);
	}

	/* Arrow Button */
	.arrow-button {
		background: var(--color-active);
		backdrop-filter: blur(8px);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-full);
	}

	.arrow-icon {
		color: var(--color-fg-primary);
	}

	/* Metadata */
	.paper-meta {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	.meta-dot {
		background: var(--color-fg-muted);
		border-radius: var(--radius-full);
	}

	/* Title */
	.paper-title {
		font-size: var(--text-body-lg);
		color: var(--color-fg-primary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.group:hover .paper-title {
		color: var(--color-fg-secondary);
	}

	/* Category Badge */
	.category-badge {
		font-size: var(--text-caption);
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
	}

	/* Hover Overlay */
	.hover-overlay {
		background: linear-gradient(to top, var(--color-hover), transparent);
	}

	/* Staggered reveal animation - CSS only */
	.animate-reveal {
		opacity: 0;
		animation: reveal 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		animation-delay: calc(var(--delay, 0) * 100ms);
	}

	@keyframes reveal {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-reveal {
			animation: none;
			opacity: 1;
		}
	}
</style>
