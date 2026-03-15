<script lang="ts">
	import type { Quote } from '../types/common.js';

	interface Props {
		/** Quote object (legacy) or quote text string */
		quote: Quote | string;
		/** Attribution (when quote is a string) */
		attribution?: string;
		/** Author name (alternative to attribution) */
		author?: string;
		/** Source reference */
		source?: string;
	}

	let { quote, attribution, author, source }: Props = $props();

	// Normalize: support both Quote object and string props
	const quoteText = $derived(typeof quote === 'string' ? quote : quote?.quote_text ?? '');
	const context = $derived(
		typeof quote === 'string'
			? [author, attribution, source].filter(Boolean).join(' — ')
			: quote?.context ?? ''
	);
</script>

{#if quoteText}
	<blockquote class="quote-block py-2">
		<p class="quote-text italic leading-relaxed mb-4">"{quoteText}"</p>

		{#if context}
			<footer class="quote-context">
				{context}
			</footer>
		{/if}
	</blockquote>
{/if}

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
