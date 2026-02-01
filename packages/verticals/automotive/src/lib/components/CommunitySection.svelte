<script lang="ts">
	/**
	 * CommunitySection Component
	 *
	 * Call-to-action section for community/app download
	 */

	interface Props {
		headline: string;
		description: string;
		ctaText: string;
		ctaHref: string;
	}

	let { headline, description, ctaText, ctaHref }: Props = $props();
</script>

<section class="py-24 bg-white border-t border-gray-100">
	<div class="max-w-4xl mx-auto text-center px-4">
		<h2 class="text-4xl md:text-5xl font-bold mb-6">{headline}</h2>
		<p class="text-gray-600 mb-8 max-w-xl mx-auto">{description}</p>
		<div class="flex justify-center gap-4">
			<a href={ctaHref} class="btn-outline">
				{ctaText}
			</a>
		</div>
	</div>
</section>
