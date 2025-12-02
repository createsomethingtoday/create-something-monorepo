<script lang="ts">
	import { fly } from 'svelte/transition';

	interface Category {
		name: string;
		slug: string;
		count: number;
	}

	interface Props {
		categories: Category[];
	}

	let { categories }: Props = $props();
</script>

<section class="category-section py-24 px-6">
	<div class="max-w-7xl mx-auto">
		<!-- Section Header -->
		<div class="mb-12">
			<h2 class="section-title text-base md:text-lg font-medium">
				Explore Categories
			</h2>
		</div>

		<!-- Category Cards Grid -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{#each categories as category, index (category.slug)}
				<div in:fly={{ y: 20, duration: 500, delay: index * 100 }}>
					<a
						href={`/category/${category.slug}`}
						class="category-card group block relative p-8 overflow-hidden"
					>
						<!-- Category Name -->
						<div class="relative z-10 mb-4">
							<h3 class="category-name text-xl font-medium">
								{category.name}
							</h3>
						</div>

						<!-- Article Count with Sliding Animation -->
						<div class="relative z-10 flex items-center justify-between">
							<div class="relative h-6 overflow-hidden">
								<div class="transition-transform duration-300 group-hover:-translate-y-full">
									<div class="category-count h-6 flex items-center text-base font-medium">
										{String(category.count).padStart(2, '0')}
									</div>
									<div class="category-count-hover h-6 flex items-center text-base font-medium">
										{String(category.count).padStart(2, '0')}
									</div>
								</div>
							</div>

							<!-- Arrow Icon with Slide Animation -->
							<div class="relative w-4 h-4 overflow-hidden">
								<div class="transition-transform duration-300 group-hover:-translate-x-full group-hover:-translate-y-full">
									<div class="absolute top-0 left-0">
										<svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="arrow-icon">
											<path
												d="M10.6696 6.276L4.93156 12.014L3.98889 11.0713L9.72622 5.33333H4.66956V4H12.0029V11.3333H10.6696V6.276Z"
												fill="currentColor"
											/>
										</svg>
									</div>
									<div class="absolute -bottom-full left-full">
										<svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="arrow-icon">
											<path
												d="M10.6696 6.276L4.93156 12.014L3.98889 11.0713L9.72622 5.33333H4.66956V4H12.0029V11.3333H10.6696V6.276Z"
												fill="currentColor"
											/>
										</svg>
									</div>
								</div>
							</div>
						</div>

						<!-- Hover Background Effect -->
						<div class="hover-overlay absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
					</a>
				</div>
			{/each}
		</div>

		<!-- Empty State -->
		{#if categories.length === 0}
			<div class="text-center py-12">
				<p class="empty-text">No categories available yet.</p>
			</div>
		{/if}
	</div>
</section>

<style>
	/* Section */
	.category-section {
		background: var(--color-bg-pure);
	}

	.section-title {
		color: var(--color-fg-secondary);
	}

	/* Card */
	.category-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.category-card:hover {
		border-color: var(--color-border-strong);
	}

	/* Category Name */
	.category-name {
		color: var(--color-fg-primary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.group:hover .category-name {
		color: var(--color-fg-secondary);
	}

	/* Count */
	.category-count {
		color: var(--color-fg-tertiary);
	}

	.category-count-hover {
		color: var(--color-fg-secondary);
	}

	/* Arrow */
	.arrow-icon {
		color: var(--color-fg-primary);
	}

	/* Hover Overlay */
	.hover-overlay {
		background: linear-gradient(to bottom right, var(--color-hover), transparent);
	}

	/* Empty State */
	.empty-text {
		color: var(--color-fg-tertiary);
	}
</style>
