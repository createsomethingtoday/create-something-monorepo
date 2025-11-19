<script lang="ts">
	import type { Quote } from '../types/common.js';

	interface Props {
		quote: Quote;
	}

	let { quote }: Props = $props();
</script>

<blockquote class="border-l-2 border-white pl-6 py-2">
	<p class="text-lg md:text-xl italic opacity-90 leading-relaxed mb-4">"{quote.quote_text}"</p>

	{#if quote.context}
		<footer class="text-sm opacity-50">
			{quote.context}
		</footer>
	{/if}
</blockquote>
