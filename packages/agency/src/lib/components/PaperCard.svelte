<script lang="ts">
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
		class="card animate-reveal group h-full"
		style="transform: rotate({rotation}deg); --delay: {index};"
	>
		<div class="card-inner relative h-full overflow-hidden">
			<!-- Image or ASCII Art -->
			<div class="card-image aspect-[4/3] flex items-center justify-center p-4 relative overflow-hidden">
				{#if paper.ascii_art}
					<pre class="ascii-art">{paper.ascii_art}</pre>
				{:else}
					<div class="placeholder">
						📄
					</div>
				{/if}

				<!-- Hover Arrow Button -->
				<div class="arrow-btn absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
					<div class="arrow-btn-inner">
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
				<div class="metadata flex items-center gap-2">
					{#if formattedDate}
						<span>{formattedDate}</span>
						<span class="dot"></span>
					{/if}
					<span>{paper.reading_time} min read</span>
				</div>

				<!-- Title -->
				<h3 class="card-title line-clamp-2 leading-tight">
					{paper.title}
				</h3>

				<!-- Category Badge with Sliding Animation -->
				<div class="inline-block">
					<div class="category-badge-wrapper relative overflow-hidden">
						<div class="category-badge group-hover:translate-y-[-100%] transition-transform duration-300">
							{categoryDisplayName}
						</div>
						<div class="category-badge absolute inset-0 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300">
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
	.card {
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.card-inner {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.card:hover .card-inner {
		border-color: var(--color-border-emphasis);
		box-shadow: 0 25px 50px -12px var(--color-active);
		transform: translateY(-0.5rem);
	}

	.card-image {
		background: var(--color-bg-pure);
		border-bottom: 1px solid var(--color-border-default);
	}

	.ascii-art {
		color: var(--color-fg-primary);
		font-size: 0.45rem;
		line-height: 1.1;
		font-family: monospace;
		user-select: none;
		opacity: 0.9;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.card:hover .ascii-art {
		opacity: 1;
	}

	.placeholder {
		color: var(--color-fg-subtle);
		font-size: 3.75rem;
	}

	.arrow-btn-inner {
		width: 2.5rem;
		height: 2.5rem;
		background: var(--color-active);
		backdrop-filter: blur(8px);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.arrow-icon {
		color: var(--color-fg-primary);
	}

	.metadata {
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-tertiary);
	}

	.dot {
		width: 0.25rem;
		height: 0.25rem;
		border-radius: var(--radius-full);
		background: var(--color-fg-muted);
	}

	.card-title {
		font-size: var(--text-body-lg);
		font-weight: 500;
		color: var(--color-fg-primary);
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.card:hover .card-title {
		color: var(--color-fg-secondary);
	}

	.category-badge {
		padding: 0.25rem 0.75rem;
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-secondary);
	}

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
			transform: translateY(20px) rotate(var(--rotation, 0deg));
		}
		to {
			opacity: 1;
			transform: translateY(0) rotate(var(--rotation, 0deg));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-reveal {
			animation: none;
			opacity: 1;
		}
	}
</style>
