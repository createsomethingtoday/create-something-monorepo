<script lang="ts">
	/**
	 * Research Paper Detail View
	 *
	 * Renders a formal academic paper with:
	 * - ASCII art header
	 * - Abstract
	 * - Table of contents
	 * - Full markdown content
	 * - Related experiments
	 * - Principles validated
	 *
	 * Papers represent Vorhandenheit (present-at-hand):
	 * theoretical analysis that DESCRIBES the hermeneutic circle.
	 */

	import { marked } from 'marked';

	let { data } = $props();

	// Configure marked for academic rendering
	marked.setOptions({
		gfm: true,
		breaks: false
	});

	// Render markdown content
	const htmlContent = data.paper.content ? marked.parse(data.paper.content) : '';
</script>

<svelte:head>
	<title>{data.paper.title} | CREATE SOMETHING .io</title>
	<meta name="description" content={data.paper.abstract} />
	<meta name="keywords" content={data.paper.keywords?.join(', ')} />
</svelte:head>

<article class="paper">
	<header class="paper-header">
		{#if data.paper.ascii_art}
			<pre class="ascii-header">{data.paper.ascii_art}</pre>
		{/if}

		<div class="paper-meta-top">
			<span class="category">{data.paper.category}</span>
			<span class="reading-time">{data.paper.reading_time} min read</span>
			<span class="difficulty">{data.paper.difficulty_level}</span>
		</div>

		<h1 class="paper-title">{data.paper.title}</h1>

		{#if data.paper.subtitle}
			<p class="paper-subtitle">{data.paper.subtitle}</p>
		{/if}

		<div class="paper-authors">
			{#each data.paper.authors as author, i}
				<span class="author">{author}</span>{#if i < data.paper.authors.length - 1}, {/if}
			{/each}
		</div>

		<div class="paper-date">
			Published: {new Date(data.paper.created_at).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})}
		</div>
	</header>

	<section class="abstract">
		<h2>Abstract</h2>
		<p>{data.paper.abstract}</p>

		<div class="keywords">
			<strong>Keywords:</strong>
			{#each data.paper.keywords as keyword, i}
				<span class="keyword">{keyword}</span>{#if i < data.paper.keywords.length - 1}, {/if}
			{/each}
		</div>
	</section>

	{#if data.paper.sections && data.paper.sections.length > 0}
		<nav class="table-of-contents">
			<h2>Contents</h2>
			<ol>
				{#each data.paper.sections.filter((s) => s.level <= 2) as section}
					<li class="toc-item level-{section.level}">
						<a href="#{section.id}">{section.title}</a>
					</li>
				{/each}
			</ol>
		</nav>
	{/if}

	{#if htmlContent}
		<div class="paper-content">
			{@html htmlContent}
		</div>
	{:else}
		<div class="paper-placeholder">
			<p>Full paper content available in source:</p>
			<code>{data.paper.source_path}</code>
			<p class="excerpt">{data.paper.excerpt_long}</p>
		</div>
	{/if}

	<footer class="paper-footer">
		{#if data.paper.tests_principles && data.paper.tests_principles.length > 0}
			<section class="principles-validated">
				<h3>Principles Validated</h3>
				<p class="principles-intro">
					This paper contributes evidence to the hermeneutic circle by validating:
				</p>
				<ul class="principles-list">
					{#each data.paper.tests_principles as principle}
						<li class="principle">{principle}</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.paper.related_experiments && data.paper.related_experiments.length > 0}
			<section class="related-experiments">
				<h3>Related Experiments</h3>
				<p class="experiments-intro">
					These experiments DEMONSTRATE what this paper DESCRIBES:
				</p>
				<ul class="experiments-list">
					{#each data.paper.related_experiments as exp}
						<li>
							<a href="/experiments/{exp}">{exp}</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<div class="paper-nav">
			<a href="/papers" class="back-link">← All Papers</a>
			<a href="/experiments" class="experiments-link">View Experiments →</a>
		</div>
	</footer>
</article>

<style>
	.paper {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		font-family:
			'Inter',
			-apple-system,
			BlinkMacSystemFont,
			sans-serif;
		color: rgba(255, 255, 255, 0.9);
	}

	/* Header */
	.paper-header {
		text-align: center;
		margin-bottom: 3rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.ascii-header {
		font-family: 'JetBrains Mono', 'IBM Plex Mono', monospace;
		font-size: 0.55rem;
		line-height: 1.15;
		color: rgba(255, 255, 255, 0.5);
		margin: 0 auto 2rem;
		text-align: left;
		display: inline-block;
		background: rgba(0, 0, 0, 0.3);
		padding: 1rem;
		border-radius: 8px;
	}

	.paper-meta-top {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-bottom: 1rem;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.4);
	}

	.paper-title {
		font-size: 2rem;
		font-weight: 700;
		margin: 0 0 0.75rem 0;
		line-height: 1.2;
		letter-spacing: -0.02em;
	}

	.paper-subtitle {
		font-size: 1.125rem;
		color: rgba(255, 255, 255, 0.6);
		font-style: italic;
		margin: 0 0 1.5rem 0;
	}

	.paper-authors {
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 0.5rem;
	}

	.paper-date {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.4);
	}

	/* Abstract */
	.abstract {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.abstract h2 {
		font-size: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.5);
		margin: 0 0 1rem 0;
	}

	.abstract p {
		line-height: 1.7;
		margin: 0 0 1rem 0;
	}

	.keywords {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.keyword {
		font-style: italic;
	}

	/* Table of Contents */
	.table-of-contents {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.table-of-contents h2 {
		font-size: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.5);
		margin: 0 0 1rem 0;
	}

	.table-of-contents ol {
		margin: 0;
		padding-left: 1.5rem;
	}

	.toc-item {
		margin: 0.5rem 0;
	}

	.toc-item.level-2 {
		margin-left: 1rem;
		font-size: 0.9rem;
	}

	.toc-item a {
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;
	}

	.toc-item a:hover {
		color: rgba(255, 255, 255, 1);
	}

	/* Content */
	.paper-content {
		line-height: 1.8;
	}

	.paper-content :global(h1),
	.paper-content :global(h2),
	.paper-content :global(h3) {
		margin-top: 2.5rem;
		margin-bottom: 1rem;
		font-weight: 600;
	}

	.paper-content :global(h2) {
		font-size: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.paper-content :global(h3) {
		font-size: 1.25rem;
	}

	.paper-content :global(p) {
		margin: 1rem 0;
	}

	.paper-content :global(blockquote) {
		border-left: 3px solid rgba(255, 255, 255, 0.3);
		margin: 1.5rem 0;
		padding: 0.5rem 1.5rem;
		font-style: italic;
		color: rgba(255, 255, 255, 0.7);
	}

	.paper-content :global(pre) {
		background: rgba(0, 0, 0, 0.4);
		padding: 1rem;
		border-radius: 8px;
		overflow-x: auto;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.875rem;
	}

	.paper-content :global(code) {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.9em;
		background: rgba(255, 255, 255, 0.1);
		padding: 0.15rem 0.3rem;
		border-radius: 3px;
	}

	.paper-content :global(pre code) {
		background: none;
		padding: 0;
	}

	.paper-content :global(a) {
		color: rgba(255, 255, 255, 0.8);
		text-decoration: underline;
	}

	.paper-content :global(hr) {
		border: none;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		margin: 2rem 0;
	}

	/* Placeholder */
	.paper-placeholder {
		text-align: center;
		padding: 3rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 8px;
	}

	.paper-placeholder code {
		display: block;
		margin: 1rem 0;
		font-family: 'JetBrains Mono', monospace;
		color: rgba(255, 255, 255, 0.5);
	}

	.paper-placeholder .excerpt {
		max-width: 600px;
		margin: 1rem auto 0;
		color: rgba(255, 255, 255, 0.6);
		line-height: 1.6;
	}

	/* Footer */
	.paper-footer {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.principles-validated,
	.related-experiments {
		margin-bottom: 2rem;
	}

	.paper-footer h3 {
		font-size: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.5);
		margin: 0 0 0.5rem 0;
	}

	.principles-intro,
	.experiments-intro {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0 0 0.75rem 0;
	}

	.principles-list,
	.experiments-list {
		margin: 0;
		padding-left: 1.5rem;
	}

	.principles-list li,
	.experiments-list li {
		margin: 0.25rem 0;
		color: rgba(255, 255, 255, 0.7);
	}

	.experiments-list a {
		color: rgba(255, 255, 255, 0.8);
	}

	.paper-nav {
		display: flex;
		justify-content: space-between;
		padding-top: 1rem;
	}

	.back-link,
	.experiments-link {
		color: rgba(255, 255, 255, 0.6);
		text-decoration: none;
		font-size: 0.875rem;
	}

	.back-link:hover,
	.experiments-link:hover {
		color: rgba(255, 255, 255, 1);
	}
</style>
