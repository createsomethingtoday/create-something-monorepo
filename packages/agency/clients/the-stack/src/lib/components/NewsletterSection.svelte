<script lang="ts">
	/**
	 * NewsletterSection Component
	 *
	 * Black background section with newsletter signup.
	 */

	import NewsletterForm from './NewsletterForm.svelte';
	import { inview } from '$lib/actions/inview';

	interface Props {
		title?: string;
		description?: string;
	}

	let {
		title = 'sign up for our video newsletter and earn a chance to win one month membership',
		description = 'Stay up to date with our events and exclusive offers.'
	}: Props = $props();
</script>

<section class="section background-color-black">
	<div class="container-large">
		<div class="wrap_flex is-align-top" use:inview>
			<div class="max-width-440">
				<h2 class="heading-style-h2">{title}</h2>
			</div>
			<div class="max-width-440 is-full-responsive">
				<div class="margin-bottom-8">
					<div class="text-color-darkgrey">
						<p class="text-size-medium reveal-element">{description}</p>
					</div>
				</div>
				<NewsletterForm variant="green" />
			</div>
		</div>
	</div>
</section>

<style>
	.is-full-responsive {
		flex: 1;
		max-width: 31.875rem;
	}

	@media (max-width: 767px) {
		.is-full-responsive {
			max-width: 100%;
			width: 100%;
		}
	}
</style>
