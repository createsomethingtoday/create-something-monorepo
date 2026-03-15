<script lang="ts">
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
			<h2 class="section-title font-medium">
				Explore Categories
			</h2>
		</div>

		<!-- Category Cards Grid -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{#each categories as category, index (category.slug)}
				<a
					href={`/category/${category.slug}`}
					class="category-card animate-reveal group block relative p-8 overflow-hidden"
					style="--delay: {index}"
				>
					<!-- Category Name -->
					<div class="relative z-10 mb-4">
						<h3 class="category-name font-medium">
							{category.name}
						</h3>
					</div>

					<!-- Article Count with Sliding Animation -->
					<div class="relative z-10 flex items-center justify-between">
						<div class="relative h-6 overflow-hidden">
							<div class="transition-transform duration-300 group-hover:-translate-y-full">
								<div class="category-count h-6 flex items-center font-medium">
									{String(category.count).padStart(2, '0')}
								</div>
								<div class="category-count-hover h-6 flex items-center font-medium">
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
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	@media (min-width: 768px) {
		.section-title {
			font-size: var(--text-h3);
		}
	}

	/* Card - Glass Design System "The Automation Layer" */
	.category-card {
		background-color: var(--glass-bg-light);
		backdrop-filter: blur(var(--glass-blur-md)) var(--glass-saturate-md);
		-webkit-backdrop-filter: blur(var(--glass-blur-md)) var(--glass-saturate-md);
		border: 1px solid var(--glass-border-light);
		border-radius: var(--radius-lg);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.category-card:hover {
		background-color: var(--glass-bg-medium);
		border-color: var(--glass-border-medium);
		box-shadow: var(--glass-shadow-sm);
	}

	/* Category Name */
	.category-name {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.group:hover .category-name {
		color: var(--color-fg-secondary);
	}

	/* Count */
	.category-count {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
	}

	.category-count-hover {
		font-size: var(--text-body);
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

	/* Staggered reveal animation - CSS only */
	.animate-reveal {
		opacity: 0;
		transform: translateY(20px);
		animation: reveal 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		animation-delay: calc(var(--delay, 0) * 100ms);
	}

	@keyframes reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-reveal {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
