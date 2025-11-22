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

<section class="py-24 px-6 bg-black">
	<div class="max-w-7xl mx-auto">
		<!-- Section Header -->
		<div class="mb-12">
			<h2 class="text-base md:text-lg font-medium text-white/90">
				Explore Categories
			</h2>
		</div>

		<!-- Category Cards Grid -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{#each categories as category, index (category.slug)}
				<div in:fly={{ y: 20, duration: 500, delay: index * 100 }}>
					<a
						href={`/category/${category.slug}`}
						class="group block relative p-8 bg-white/[0.07] border border-white/10 rounded-lg hover:border-white/30 transition-all overflow-hidden"
					>
						<!-- Category Name -->
						<div class="relative z-10 mb-4">
							<h3 class="text-xl font-medium text-white group-hover:text-white/90 transition-colors">
								{category.name}
							</h3>
						</div>

						<!-- Article Count with Sliding Animation -->
						<div class="relative z-10 flex items-center justify-between">
							<div class="relative h-6 overflow-hidden">
								<div class="transition-transform duration-300 group-hover:-translate-y-full">
									<div class="text-base font-medium text-white/60 h-6 flex items-center">
										{String(category.count).padStart(2, '0')}
									</div>
									<div class="text-base font-medium text-white/80 h-6 flex items-center">
										{String(category.count).padStart(2, '0')}
									</div>
								</div>
							</div>

							<!-- Arrow Icon with Slide Animation -->
							<div class="relative w-4 h-4 overflow-hidden">
								<div class="transition-transform duration-300 group-hover:-translate-x-full group-hover:-translate-y-full">
									<div class="absolute top-0 left-0">
										<svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="text-white">
											<path
												d="M10.6696 6.276L4.93156 12.014L3.98889 11.0713L9.72622 5.33333H4.66956V4H12.0029V11.3333H10.6696V6.276Z"
												fill="currentColor"
											/>
										</svg>
									</div>
									<div class="absolute -bottom-full left-full">
										<svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="text-white">
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
						<div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
					</a>
				</div>
			{/each}
		</div>

		<!-- Empty State -->
		{#if categories.length === 0}
			<div class="text-center py-12">
				<p class="text-white/60">No categories available yet.</p>
			</div>
		{/if}
	</div>
</section>
