<script lang="ts">
	/**
	 * PatternPage Component
	 *
	 * Reusable pattern page layout that encapsulates all design utilities
	 * using CSS Canon tokens. Pattern pages become pure content with no
	 * Tailwind design classes.
	 */

	interface Props {
		name: string;
		tagline: string;
		master?: string;
		children?: import('svelte').Snippet;
	}

	let { name, tagline, master, children }: Props = $props();
</script>

<!-- Header -->
<section class="header">
	<div class="container">
		<a href="/patterns" class="back-link">
			← All Patterns
		</a>
		<p class="meta">Pattern</p>
		<h1 class="title">{name}</h1>
		<p class="tagline">
			{tagline}
		</p>
		{#if master}
			<p class="master-attribution">
				<span class="master-label">Master:</span>
				<span class="master-name">{master}</span>
			</p>
		{/if}
	</div>
</section>

<!-- Content -->
<div class="content">
	{@render children?.()}
</div>

<!-- Footer -->
<section class="footer">
	<div class="container">
		<p class="footer-text">
			Part of the <a href="/patterns" class="footer-link">CREATE SOMETHING Pattern Library</a>
		</p>
	</div>
</section>

<style>
	/* Container */
	.container {
		max-width: 48rem;
		margin-left: auto;
		margin-right: auto;
		padding-left: 1.5rem;
		padding-right: 1.5rem;
	}

	/* Header Section */
	.header {
		padding-top: 6rem;
		padding-bottom: 4rem;
		padding-left: 1.5rem;
		padding-right: 1.5rem;
	}

	.back-link {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		display: inline-block;
		margin-bottom: 2rem;
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.back-link:hover {
		color: var(--color-performance-fg-secondary);
	}

	.meta {
		font-size: var(--text-performance-body-sm);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-performance-fg-tertiary);
		margin-bottom: 1rem;
	}

	.title {
		font-size: var(--text-performance-h1);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin-bottom: 1.5rem;
		line-height: 1.2;
	}

	.tagline {
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-secondary);
		line-height: 1.6;
	}

	.master-attribution {
		margin-top: 2rem;
		padding-top: 1.5rem;
	}

	.master-label {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		margin-right: 0.5rem;
	}

	.master-name {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		font-weight: 500;
	}

	/* Content */
	.content {
		color: var(--color-performance-fg-primary);
	}

	/* Footer Section */
	.footer {
		padding-top: 4rem;
		padding-bottom: 4rem;
		padding-left: 1.5rem;
		padding-right: 1.5rem;
		text-align: center;
	}

	.footer-text {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
	}

	.footer-link {
		text-decoration: underline;
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.footer-link:hover {
		color: var(--color-performance-fg-secondary);
	}

	/* Global content styles - apply to slotted content */
	:global(.content section) {
		padding-top: 4rem;
		padding-bottom: 4rem;
		padding-left: 1.5rem;
		padding-right: 1.5rem;
	}

	:global(.content section:first-child) {
		border-top: none;
	}

	:global(.content h2) {
		font-size: var(--text-performance-h2);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin-bottom: 2rem;
	}

	:global(.content h3) {
		font-size: var(--text-performance-body-lg);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin-bottom: 0.75rem;
	}

	:global(.content h4) {
		font-size: var(--text-performance-body);
		font-weight: 600;
		color: var(--color-performance-fg-secondary);
		margin-bottom: 1rem;
	}

	:global(.content p) {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-secondary);
		line-height: 1.7;
	}

	:global(.content strong) {
		color: var(--color-performance-fg-primary);
		font-weight: 600;
	}

	:global(.content a) {
		color: var(--color-performance-fg-primary);
		text-decoration: underline;
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	:global(.content a:hover) {
		color: var(--color-performance-fg-secondary);
	}

	/* Utility classes for content */
	:global(.content .quote-block) {
		padding: 1.5rem;
		border-radius: var(--radius-performance-scale-md);
	}

	:global(.content .quote-text) {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-secondary);
		font-style: italic;
		line-height: 1.7;
	}

	:global(.content .quote-attribution) {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		margin-top: 0.75rem;
	}

	:global(.content .principle-card) {
		border-radius: var(--radius-performance-scale-md);
		padding: 1.5rem;
	}

	:global(.content .principle-title) {
		font-size: var(--text-performance-body-lg);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin-bottom: 0.75rem;
	}

	:global(.content .principle-description) {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		margin-bottom: 1rem;
		line-height: 1.6;
	}

	:global(.content .principle-examples) {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	:global(.content .code-block) {
		background: var(--color-performance-bg-subtle);
		padding: 1rem;
		border-radius: var(--radius-performance-scale-md);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-tertiary);
		overflow-x: auto;
	}

	:global(.content .card-grid) {
		display: grid;
		gap: 1.5rem;
	}

	@media (min-width: 768px) {
		:global(.content .card-grid) {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	:global(.content .card) {
		border-radius: var(--radius-performance-scale-md);
		padding: 1.5rem;
		transition: border-color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	:global(.content .card:hover) {
		border-color: var(--color-performance-border-emphasis);
	}

	:global(.content .card-title) {
		font-size: var(--text-performance-body-lg);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin-bottom: 0.5rem;
	}

	:global(.content .card-description) {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		line-height: 1.6;
	}

	/* Semantic state styles */
	:global(.content .success-card) {
		background: var(--color-performance-success-muted);
		border-color: var(--color-performance-success-border);
	}

	:global(.content .error-card) {
		background: var(--color-performance-error-muted);
		border-color: var(--color-performance-error-border);
	}

	:global(.content .warning-card) {
		background: var(--color-performance-warning-muted);
		border-color: var(--color-performance-warning-border);
	}

	:global(.content .success-title) {
		color: var(--color-performance-success);
	}

	:global(.content .error-title) {
		color: var(--color-performance-error);
	}

	:global(.content .warning-title) {
		color: var(--color-performance-warning);
	}

	:global(.content .stat-grid) {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	}

	:global(.content .stat-card) {
		padding: 1rem;
		background: var(--color-performance-bg-subtle);
		border-radius: var(--radius-performance-scale-md);
		text-align: center;
	}

	:global(.content .stat-value) {
		font-size: var(--text-performance-h2);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
		margin-bottom: 0.25rem;
	}

	:global(.content .stat-label) {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	:global(.content ul) {
		list-style: none;
		padding: 0;
	}

	:global(.content li) {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		line-height: 1.7;
		padding-left: 1.5rem;
		position: relative;
	}

	:global(.content li::before) {
		content: "•";
		position: absolute;
		left: 0.5rem;
		color: var(--color-performance-fg-muted);
	}
</style>
