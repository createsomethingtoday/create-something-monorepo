<script lang="ts">
	/**
	 * FAQItem Component
	 *
	 * Single FAQ item with expand/collapse animation.
	 */

	import { slide } from 'svelte/transition';

	interface Props {
		question: string;
		answer: string;
	}

	let { question, answer }: Props = $props();

	let isOpen = $state(false);

	function toggle() {
		isOpen = !isOpen;
	}
</script>

<li class="faqs_item" class:is-open={isOpen}>
	<button class="faqs_head" onclick={toggle} aria-expanded={isOpen}>
		<p class="text-size-medium text-weight-medium">{question}</p>
		<img
			src="/icons/faq-arrow.svg"
			loading="lazy"
			alt=""
			class="icon-24 faq-arrow"
			class:rotated={isOpen}
		/>
	</button>
	{#if isOpen}
		<div class="faqs_body" transition:slide={{ duration: 300 }}>
			<div class="margin-top-8">
				<div class="text-color-lightgrey">
					<div class="text-rich-text">
						<p>{answer}</p>
					</div>
				</div>
			</div>
		</div>
	{/if}
</li>

<style>
	.faqs_item {
		border-bottom: 1px solid rgba(255, 255, 255, 0.2);
		padding-bottom: 0.75rem;
		transition: color var(--duration-bg) var(--ease-stack);
	}

	.faqs_item:hover {
		color: var(--green);
	}

	.faqs_head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 2rem;
		padding-top: 0.75rem;
		width: 100%;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		color: inherit;
		font-family: inherit;
	}

	.faq-arrow {
		flex-shrink: 0;
		transition: transform 0.3s var(--ease-stack);
	}

	.faq-arrow.rotated {
		transform: rotate(180deg);
	}

	.faqs_body {
		overflow: hidden;
	}

	.text-rich-text {
		font-size: 1.125rem;
		line-height: 1.6;
	}
</style>
