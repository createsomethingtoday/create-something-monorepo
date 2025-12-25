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
		border-bottom: 1px solid var(--color-border-default);
	}

	.back-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		display: inline-block;
		margin-bottom: 2rem;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-secondary);
	}

	.meta {
		font-size: var(--text-body-sm);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-fg-tertiary);
		margin-bottom: 1rem;
	}

	.title {
		font-size: var(--text-h1);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 1.5rem;
		line-height: 1.2;
	}

	.tagline {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.master-attribution {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-border-default);
	}

	.master-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-right: 0.5rem;
	}

	.master-name {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		font-weight: 500;
	}

	/* Content */
	.content {
		color: var(--color-fg-primary);
	}

	/* Footer Section */
	.footer {
		padding-top: 4rem;
		padding-bottom: 4rem;
		padding-left: 1.5rem;
		padding-right: 1.5rem;
		border-top: 1px solid var(--color-border-default);
		text-align: center;
	}

	.footer-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-link {
		text-decoration: underline;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-secondary);
	}

	/* Global content styles - apply to slotted content */
	:global(.content section) {
		padding-top: 4rem;
		padding-bottom: 4rem;
		padding-left: 1.5rem;
		padding-right: 1.5rem;
		border-top: 1px solid var(--color-border-default);
	}

	:global(.content section:first-child) {
		border-top: none;
	}

	:global(.content h2) {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 2rem;
	}

	:global(.content h3) {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 0.75rem;
	}

	:global(.content h4) {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-secondary);
		margin-bottom: 1rem;
	}

	:global(.content p) {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.7;
	}

	:global(.content strong) {
		color: var(--color-fg-primary);
		font-weight: 600;
	}

	:global(.content a) {
		color: var(--color-fg-primary);
		text-decoration: underline;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	:global(.content a:hover) {
		color: var(--color-fg-secondary);
	}

	/* Utility classes for content */
	:global(.content .quote-block) {
		padding: 1.5rem;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		background: var(--color-bg-elevated);
	}

	:global(.content .quote-text) {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		font-style: italic;
		line-height: 1.7;
	}

	:global(.content .quote-attribution) {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-top: 0.75rem;
	}

	:global(.content .principle-card) {
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: 1.5rem;
		background: var(--color-bg-elevated);
	}

	:global(.content .principle-title) {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 0.75rem;
	}

	:global(.content .principle-description) {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: 1rem;
		line-height: 1.6;
	}

	:global(.content .principle-examples) {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	:global(.content .code-block) {
		background: var(--color-bg-subtle);
		padding: 1rem;
		border-radius: var(--radius-md);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
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
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: 1.5rem;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	:global(.content .card:hover) {
		border-color: var(--color-border-emphasis);
	}

	:global(.content .card-title) {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 0.5rem;
	}

	:global(.content .card-description) {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: 1.6;
	}

	/* Semantic state styles */
	:global(.content .success-card) {
		background: var(--color-success-muted);
		border-color: var(--color-success-border);
	}

	:global(.content .error-card) {
		background: var(--color-error-muted);
		border-color: var(--color-error-border);
	}

	:global(.content .warning-card) {
		background: var(--color-warning-muted);
		border-color: var(--color-warning-border);
	}

	:global(.content .success-title) {
		color: var(--color-success);
	}

	:global(.content .error-title) {
		color: var(--color-error);
	}

	:global(.content .warning-title) {
		color: var(--color-warning);
	}

	:global(.content .stat-grid) {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	}

	:global(.content .stat-card) {
		padding: 1rem;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		text-align: center;
	}

	:global(.content .stat-value) {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: 0.25rem;
	}

	:global(.content .stat-label) {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	:global(.content ul) {
		list-style: none;
		padding: 0;
	}

	:global(.content li) {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.7;
		padding-left: 1.5rem;
		position: relative;
	}

	:global(.content li::before) {
		content: "•";
		position: absolute;
		left: 0.5rem;
		color: var(--color-fg-muted);
	}
</style>
