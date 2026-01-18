<script lang="ts">
	/**
	 * FAQAccordion Component
	 *
	 * FAQ section with expandable items.
	 * FAQs imported from centralized pricing data for DRY maintenance.
	 */

	import FAQItem from './FAQItem.svelte';
	import { inview } from '$lib/actions/inview';
	import { FAQS as PRICING_FAQS } from '$lib/data/pricing';

	interface FAQ {
		question: string;
		answer: string;
	}

	interface Props {
		faqs?: FAQ[];
	}

	// Use pricing FAQs as default, but allow override via props
	let { faqs = [...PRICING_FAQS] }: Props = $props();
</script>

<section class="section background-color-black">
	<div class="container-large">
		<div class="faqs_wrap" use:inview>
			<!-- Left Column -->
			<div class="faq-header max-width-440">
				<div class="margin-bottom-16">
					<h2 class="is-word is-1">FaQs</h2>
				</div>
				<div class="text-color-lightgrey">
					<p class="text-size-medium reveal-element">
						Can't find the answer you're looking for? Please write us an email at
						<a href="mailto:ernie.thestack@gmail.com" class="text-style-link">
							ernie.thestack@gmail.com
						</a>
					</p>
				</div>
			</div>

			<!-- Right Column - FAQ List -->
			<ul class="faqs_list reveal-element">
				{#each faqs as faq}
					<FAQItem question={faq.question} answer={faq.answer} />
				{/each}
			</ul>
		</div>
	</div>
</section>

<style>
	.faqs_wrap {
		display: flex;
		gap: 4.75rem;
	}

	.faq-header {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.faqs_list {
		flex: 1;
		list-style: none;
	}

	@media (max-width: 991px) {
		.faqs_wrap {
			flex-direction: column;
			gap: 2rem;
		}
	}
</style>
