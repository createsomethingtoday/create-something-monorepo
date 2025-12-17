<script lang="ts">
	/**
	 * FAQAccordion Component
	 *
	 * FAQ section with expandable items.
	 */

	import FAQItem from './FAQItem.svelte';
	import { inview } from '$lib/actions/inview';

	interface FAQ {
		question: string;
		answer: string;
	}

	interface Props {
		faqs?: FAQ[];
	}

	let {
		faqs = [
			{
				question: 'Do you have OpenPlay?',
				answer:
					'We offer programs for all ages and skill levels, including beginner classes, competitive training, and private lessons.'
			},
			{
				question: 'Do you provide equipment rentals?',
				answer: 'Yes, we offer racket and ball rentals, as well as a pro shop for purchasing gear.'
			},
			{
				question: 'Can I book a court in advance?',
				answer:
					'Absolutely! Courts can be reserved online or via phone up to two weeks in advance.'
			},
			{
				question: 'Are your facilities open year-round?',
				answer:
					'Yes, our indoor and outdoor courts are open year-round, weather permitting for outdoor courts.'
			},
			{
				question: 'Do you offer group lessons or clinics?',
				answer:
					'Yes, we have group lessons and clinics for all levels, ranging from beginner to advanced players.'
			},
			{
				question: 'How do I sign up for membership?',
				answer:
					'You can sign up for membership on our website or visit our front desk for more details.'
			}
		]
	}: Props = $props();
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
