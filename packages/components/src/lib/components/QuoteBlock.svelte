<script lang="ts">
	import type { Quote } from '../types/common.js';

	interface Props {
		quote: Quote;
	}

	let { quote }: Props = $props();
</script>

<blockquote class="quote-block py-2">
	<p class="quote-text text-lg md:text-xl italic leading-relaxed mb-4">"{quote.quote_text}"</p>

	{#if quote.context}
		<footer class="quote-context text-sm">
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
		color: var(--color-fg-secondary);
	}

	.quote-context {
		color: var(--color-fg-muted);
	}
</style>
