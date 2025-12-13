<script lang="ts">
	import type { Quote } from '../types/common.js';

	interface Props {
		quote: Quote;
	}

	let { quote }: Props = $props();
</script>

<blockquote class="quote-block py-2">
	<p class="quote-text italic leading-relaxed mb-4">"{quote.quote_text}"</p>

	{#if quote.context}
		<footer class="quote-context">
			{quote.context}
		</footer>
	{/if}
</blockquote>

<style>
	.quote-block {
		border-left: 2px solid var(--color-fg-primary);
		padding-left: var(--space-md);
	}

	.quote-text {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	@media (min-width: 768px) {
		.quote-text {
			font-size: var(--text-h3);
		}
	}

	.quote-context {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}
</style>
