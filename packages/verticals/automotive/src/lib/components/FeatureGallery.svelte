<script lang="ts">
	/**
	 * FeatureGallery Component
	 *
	 * Smart cockpit / AI features showcase
	 * Large main feature with smaller sub-features and description
	 */

	import type { FeatureShowcase } from '$lib/config/site';

	interface Props {
		badge: string;
		headline: string;
		mainFeature: FeatureShowcase;
		subFeatures: FeatureShowcase[];
		description: {
			title: string;
			content: string;
			link?: { text: string; href: string };
		};
	}

	let { badge, headline, mainFeature, subFeatures, description }: Props = $props();
</script>

<section class="py-24 bg-black text-white">
	<div class="max-w-7xl mx-auto px-4 md:px-12 lg:px-20">
		<!-- Section Header -->
		<div class="text-center mb-16">
			<span class="text-blue-400 font-semibold tracking-wider text-sm uppercase">{badge}</span>
			<h2 class="text-3xl md:text-5xl font-bold mt-3">{headline}</h2>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<!-- Left Column: Large HUD -->
			<div class="h-full min-h-[400px] lg:min-h-[600px] relative rounded-3xl overflow-hidden group">
				<img
					src={mainFeature.image}
					alt={mainFeature.title}
					class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
				/>
				<div class="absolute bottom-0 left-0 p-8 bg-gradient-to-t from-black to-transparent w-full">
					<p class="font-semibold text-xl">{mainFeature.title}</p>
					<p class="text-gray-400 text-sm">{mainFeature.subtitle}</p>
				</div>
			</div>

			<!-- Right Column: Split Content -->
			<div class="flex flex-col gap-8">
				<!-- Top Row Images -->
				<div class="grid grid-cols-2 gap-4 h-64">
					{#each subFeatures as feature}
						<div class="relative rounded-2xl overflow-hidden group">
							<img
								src={feature.image}
								alt={feature.title}
								class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
							/>
							<div
								class="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"
							></div>
						</div>
					{/each}
				</div>

				<!-- Bottom Text Block -->
				<div
					class="flex-grow bg-white/5 rounded-3xl p-8 md:p-12 border border-white/10 flex flex-col justify-center"
				>
					<h3 class="text-2xl font-bold mb-4">{description.title}</h3>
					<p class="text-gray-400 leading-relaxed">
						{description.content}
					</p>
					{#if description.link}
						<a
							href={description.link.href}
							class="inline-flex items-center gap-2 text-white mt-6 hover:text-blue-400 transition-colors"
						>
							{description.link.text}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
								class="w-4 h-4"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
							</svg>
						</a>
					{/if}
				</div>
			</div>
		</div>
	</div>
</section>
