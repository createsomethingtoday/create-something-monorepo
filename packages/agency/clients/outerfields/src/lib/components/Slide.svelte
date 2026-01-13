<script lang="ts">
	/**
	 * Slide Component - OUTERFIELDS
	 *
	 * A single slide within a Presentation.
	 * Types: title, content, quote, stat, split, image
	 */

	interface Props {
		type?: 'title' | 'content' | 'quote' | 'stat' | 'split' | 'image';
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
		max-width: 1000px;
		min-height: 60vh;
		text-align: center;
		gap: var(--space-xl, 2rem);
	}

	/* Title Slide */
	.slide-title {
		gap: var(--space-lg, 1.5rem);
	}

	:global(.slide-title .logo) {
		font-size: 3rem;
		margin-bottom: var(--space-md, 1rem);
	}

	:global(.slide-title h1) {
		font-size: clamp(3rem, 8vw, 5rem);
		font-weight: 800;
		letter-spacing: -0.03em;
		line-height: 1;
		margin: 0;
		background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	:global(.slide-title .subtitle) {
		font-size: clamp(1.25rem, 3vw, 1.75rem);
		color: var(--color-fg-secondary);
		font-weight: 400;
		margin: 0;
	}

	:global(.slide-title .tagline) {
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-muted);
		margin-top: var(--space-lg, 1.5rem);
	}

	/* Content Slide */
	.slide-content {
		text-align: left;
		align-items: flex-start;
		gap: var(--space-lg, 1.5rem);
	}

	:global(.slide-content h2) {
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 700;
		letter-spacing: -0.02em;
		margin: 0;
		width: 100%;
	}

	:global(.slide-content p) {
		font-size: clamp(1.125rem, 2.5vw, 1.5rem);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0;
		max-width: 60ch;
	}

	:global(.slide-content .highlight) {
		color: var(--color-brand, #7c2bee);
		font-weight: 600;
	}

	:global(.slide-content ul) {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-md, 1rem);
	}

	:global(.slide-content li) {
		font-size: clamp(1rem, 2vw, 1.25rem);
		color: var(--color-fg-secondary);
		padding-left: var(--space-lg, 1.5rem);
		position: relative;
	}

	:global(.slide-content li::before) {
		content: '→';
		position: absolute;
		left: 0;
		color: var(--color-brand, #7c2bee);
	}

	/* Quote Slide */
	.slide-quote {
		gap: var(--space-xl, 2rem);
	}

	:global(.slide-quote blockquote) {
		font-size: clamp(1.5rem, 4vw, 2.5rem);
		font-style: italic;
		color: var(--color-fg-secondary);
		line-height: 1.5;
		max-width: 45ch;
		margin: 0;
		padding: 0 var(--space-xl, 2rem);
		border-left: 3px solid var(--color-brand, #7c2bee);
		text-align: left;
	}

	:global(.slide-quote cite) {
		font-size: var(--text-body, 1rem);
		font-style: normal;
		color: var(--color-fg-muted);
	}

	/* Stat Slide - for big numbers */
	.slide-stat {
		gap: var(--space-lg, 1.5rem);
	}

	:global(.slide-stat .stat-value) {
		font-size: clamp(4rem, 15vw, 10rem);
		font-weight: 800;
		letter-spacing: -0.04em;
		line-height: 1;
		background: linear-gradient(135deg, var(--color-brand, #7c2bee) 0%, #a855f7 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	:global(.slide-stat .stat-label) {
		font-size: clamp(1.25rem, 3vw, 2rem);
		color: var(--color-fg-secondary);
		font-weight: 500;
	}

	:global(.slide-stat .stat-context) {
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-muted);
		max-width: 50ch;
	}

	/* Split Slide */
	.slide-split {
		flex-direction: row;
		gap: var(--space-2xl, 3rem);
		align-items: stretch;
		text-align: left;
	}

	:global(.slide-split .left),
	:global(.slide-split .right) {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: var(--space-md, 1rem);
	}

	:global(.slide-split h2) {
		font-size: clamp(1.5rem, 3vw, 2rem);
		font-weight: 600;
		margin: 0;
	}

	:global(.slide-split p) {
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0;
	}

	:global(.slide-split .divider) {
		width: 1px;
		background: var(--color-border-default);
	}

	@media (max-width: 768px) {
		.slide-split {
			flex-direction: column;
			gap: var(--space-xl, 2rem);
		}

		:global(.slide-split .divider) {
			width: 100%;
			height: 1px;
		}
	}

	/* Image Slide */
	.slide-image {
		gap: var(--space-lg, 1.5rem);
	}

	:global(.slide-image img) {
		max-width: 100%;
		max-height: 50vh;
		border-radius: var(--radius-lg, 1rem);
		border: 1px solid var(--color-border-default);
	}

	:global(.slide-image .caption) {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-muted);
	}

	/* Number markers */
	:global(.slide .number) {
		font-family: var(--font-mono);
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-brand, #7c2bee);
		letter-spacing: 0.1em;
		opacity: 0.7;
	}

	/* Emphasis text */
	:global(.slide .em) {
		color: var(--color-fg-primary);
		font-weight: 600;
	}

	/* Muted text */
	:global(.slide .muted) {
		color: var(--color-fg-muted);
	}

	/* Brand color */
	:global(.slide .brand) {
		color: var(--color-brand, #7c2bee);
	}
</style>
