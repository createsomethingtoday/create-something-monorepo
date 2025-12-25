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
			<h2 class="section-header">
				Explore Categories
			</h2>
		</div>

		<!-- Category Cards Grid -->
		<ul class="category-list grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="list">
			{#each categories as category, index (category.slug)}
				<li>
					<a
						href={`/category/${category.slug}`}
						class="category-card animate-reveal group block relative p-8 overflow-hidden"
						style="--delay: {index}"
					>
					<!-- Category Name -->
					<div class="relative z-10 mb-4">
						<h3 class="category-name">
							{category.name}
						</h3>
					</div>

					<!-- Article Count with Sliding Animation -->
					<div class="relative z-10 flex items-center justify-between">
						<div class="count-wrapper relative h-6 overflow-hidden">
							<div class="count-slide">
								<div class="count count-normal h-6 flex items-center">
									{String(category.count).padStart(2, '0')}
								</div>
								<div class="count count-hover h-6 flex items-center">
									{String(category.count).padStart(2, '0')}
								</div>
							</div>
						</div>

						<!-- Arrow Icon with Slide Animation -->
						<div class="arrow-wrapper relative w-4 h-4 overflow-hidden">
							<div class="arrow-slide">
								<div class="absolute top-0 left-0">
									<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
										<path
											d="M10.6696 6.276L4.93156 12.014L3.98889 11.0713L9.72622 5.33333H4.66956V4H12.0029V11.3333H10.6696V6.276Z"
											fill="currentColor"
										/>
									</svg>
								</div>
								<div class="absolute -bottom-full left-full">
									<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
						<div class="hover-bg absolute inset-0"></div>
					</a>
				</li>
			{/each}
		</ul>

		<!-- Empty State -->
		{#if categories.length === 0}
			<div class="text-center py-12">
				<p class="empty-state">No categories available yet.</p>
			</div>
		{/if}
	</div>
</section>

<style>
	.category-section {
		background: var(--color-bg-pure);
	}

	.category-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.section-header {
		font-size: var(--text-body);
		font-weight: 500;
		color: var(--color-fg-secondary);
	}

	@media (min-width: 768px) {
		.section-header {
			font-size: var(--text-body-lg);
		}
	}

	.category-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: border-color var(--duration-standard) var(--ease-standard);
	}

	.category-card:hover {
		border-color: var(--color-border-strong);
	}

	.category-name {
		font-size: 1.25rem;
		font-weight: 500;
		color: var(--color-fg-primary);
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.category-card:hover .category-name {
		color: var(--color-fg-secondary);
	}

	.count-slide {
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.category-card:hover .count-slide {
		transform: translateY(-100%);
	}

	.count {
		font-size: var(--text-body);
		font-weight: 500;
	}

	.count-normal {
		color: var(--color-fg-tertiary);
	}

	.count-hover {
		color: var(--color-fg-secondary);
	}

	.arrow-wrapper {
		color: var(--color-fg-primary);
	}

	.arrow-slide {
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.category-card:hover .arrow-slide {
		transform: translate(-100%, -100%);
	}

	.hover-bg {
		background: linear-gradient(135deg, var(--color-hover), transparent);
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.category-card:hover .hover-bg {
		opacity: 1;
	}

	.empty-state {
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
