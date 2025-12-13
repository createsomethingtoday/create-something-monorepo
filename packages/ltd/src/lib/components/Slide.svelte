<script lang="ts">
	/**
	 * Slide Component
	 *
	 * A single slide within a Presentation.
	 * Types: title, content, code, quote, ascii
	 */

	interface Props {
		type?: 'title' | 'content' | 'code' | 'quote' | 'ascii' | 'split';
		children?: import('svelte').Snippet;
	}

	let { type = 'content', children }: Props = $props();
</script>

<div data-slide class="slide slide-{type}">
	{@render children?.()}
</div>

<style>
	.slide {
		display: none;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		max-width: 960px;
		min-height: 60vh;
		text-align: center;
		gap: var(--space-xl); /* Golden ratio: 4.236rem */
	}

	/* Title Slide */
	.slide-title {
		gap: var(--space-lg); /* Golden ratio: 2.618rem */
	}

	:global(.slide-title h1) {
		font-size: var(--text-display-xl);
		font-weight: var(--font-bold);
		letter-spacing: var(--tracking-tighter);
		line-height: 1;
		margin: 0;
	}

	:global(.slide-title .subtitle) {
		font-size: var(--text-h2);
		color: var(--color-fg-secondary);
		font-weight: var(--font-regular);
		margin: 0;
	}

	:global(.slide-title .tagline) {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		margin-top: var(--space-lg);
	}

	/* Content Slide */
	.slide-content {
		text-align: left;
		align-items: flex-start;
		gap: var(--space-lg); /* Golden ratio: 2.618rem */
	}

	:global(.slide-content h2) {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		letter-spacing: var(--tracking-tight);
		margin: 0;
		width: 100%;
	}

	:global(.slide-content p) {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
		max-width: 60ch;
	}

	:global(.slide-content .highlight) {
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	:global(.slide-content ul) {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-md); /* Golden ratio: 1.618rem */
	}

	:global(.slide-content li) {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
		padding-left: var(--space-lg);
		position: relative;
	}

	:global(.slide-content li::before) {
		content: '—';
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
	}

	/* Code Slide */
	.slide-code {
		gap: var(--space-lg); /* Golden ratio: 2.618rem */
		align-items: flex-start;
		text-align: left;
	}

	:global(.slide-code h2) {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		margin: 0;
		width: 100%;
	}

	:global(.slide-code pre) {
		width: 100%;
		padding: var(--space-lg);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow-x: auto;
		margin: 0;
	}

	:global(.slide-code code) {
		font-family: var(--font-mono);
		font-size: var(--text-body);
		line-height: var(--leading-relaxed);
		color: var(--color-fg-secondary);
	}

	:global(.slide-code .annotation) {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		margin-top: var(--space-md);
	}

	/* Quote Slide */
	.slide-quote {
		gap: var(--space-xl); /* Golden ratio: 4.236rem */
	}

	:global(.slide-quote blockquote) {
		font-size: var(--text-h2);
		font-style: italic;
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		max-width: 45ch;
		margin: 0;
		padding: 0 var(--space-xl);
		border-left: 2px solid var(--color-border-emphasis);
		text-align: left;
	}

	:global(.slide-quote cite) {
		font-size: var(--text-body-lg);
		font-style: normal;
		color: var(--color-fg-muted);
	}

	/* ASCII Slide */
	.slide-ascii {
		gap: var(--space-lg); /* Golden ratio: 2.618rem */
	}

	:global(.slide-ascii pre) {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		line-height: 1.4;
		color: var(--color-fg-tertiary);
		white-space: pre;
		margin: 0;
		padding: var(--space-lg);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow-x: auto;
		max-width: 100%;
	}

	@media (min-width: 768px) {
		:global(.slide-ascii pre) {
			font-size: 0.9rem;
		}
	}

	:global(.slide-ascii .caption) {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		margin: 0;
	}

	/* Split Slide */
	.slide-split {
		flex-direction: row;
		gap: var(--space-2xl); /* Golden ratio: 6.854rem */
		align-items: stretch;
		text-align: left;
	}

	:global(.slide-split .left),
	:global(.slide-split .right) {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: var(--space-md); /* Golden ratio: 1.618rem */
	}

	:global(.slide-split h2) {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		margin: 0;
	}

	:global(.slide-split p) {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
	}

	@media (max-width: 768px) {
		.slide-split {
			flex-direction: column;
			gap: var(--space-xl);
		}
	}

	/* Number markers for conceptual slides */
	:global(.slide .number) {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		letter-spacing: var(--tracking-widest);
	}

	/* Emphasis text */
	:global(.slide .em) {
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	/* Muted text */
	:global(.slide .muted) {
		color: var(--color-fg-muted);
	}
</style>
