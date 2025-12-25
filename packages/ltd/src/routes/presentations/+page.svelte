<script lang="ts">
	/**
	 * Presentations Index
	 *
	 * A collection of presentations following CREATE SOMETHING principles.
	 * "The presentation itself demonstrates the philosophy."
	 */

	const presentations = [
		{
			slug: 'heidegger-canon',
			title: 'HEIDEGGER: CANON',
			subtitle: 'Philosophy as Foundation',
			description: 'Install the CREATE SOMETHING methodology. Apply the Subtractive Triad. Build systems that disappear.',
			slides: 18,
			duration: '25 min',
			tags: ['Philosophy', 'Methodology']
		},
		{
			slug: 'claude-code-partner',
			title: 'CLAUDE CODE: PARTNER',
			subtitle: 'AI-Native Development',
			description: 'Set up Claude Code as your development partner. Configure CLAUDE.md, rules, MCP servers, and hooks.',
			slides: 16,
			duration: '25 min',
			tags: ['Claude Code', 'AI', 'Setup']
		},
		{
			slug: 'workway',
			title: 'WORKWAY',
			subtitle: 'Workflow Automation for Developers',
			description: 'Build workflows with TypeScript. Deploy to the edge. Monetize in the marketplace.',
			slides: 17,
			duration: '20 min',
			tags: ['Philosophy', 'Product', 'Heidegger', 'Claude Code', 'Cloudflare']
		}
	];
</script>

<svelte:head>
	<title>Presentations | CREATE SOMETHING .ltd</title>
	<meta name="description" content="Philosophy-driven presentations from CREATE SOMETHING." />
</svelte:head>

<article class="presentations-page">
	<header class="header">
		<a href="/" class="back-link">← Home</a>
		<p class="meta">Presentations</p>
		<h1 class="title">Slide Decks</h1>
		<p class="description">
			Philosophy-driven presentations following Heideggerian principles.
			The presentation itself demonstrates "less, but better."
		</p>
	</header>

	<section class="presentations-list">
		{#each presentations as presentation}
			<a href="/presentations/{presentation.slug}" class="presentation-card">
				<div class="card-header">
					<span class="card-slides">{presentation.slides} slides</span>
					<span class="card-duration">{presentation.duration}</span>
				</div>

				<h2 class="card-title">{presentation.title}</h2>
				<p class="card-subtitle">{presentation.subtitle}</p>
				<p class="card-description">{presentation.description}</p>

				<div class="card-tags">
					{#each presentation.tags as tag}
						<span class="tag">{tag}</span>
					{/each}
				</div>

				<span class="card-cta">View presentation →</span>
			</a>
		{/each}
	</section>

	<footer class="footer">
		<p class="footer-text">
			Part of <a href="/ethos">The Canon</a> at CREATE SOMETHING.
		</p>
	</footer>
</article>

<style>
	.presentations-page {
		max-width: 720px;
		margin: 0 auto;
		padding: 2rem;
	}

	/* Header */
	.header {
		margin-bottom: 4rem;
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
		letter-spacing: var(--tracking-widest);
		text-transform: uppercase;
		color: var(--color-fg-tertiary);
		margin-bottom: 1rem;
	}

	.title {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		margin-bottom: 1.5rem;
	}

	.description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* Presentations List */
	.presentations-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-bottom: 4rem;
	}

	.presentation-card {
		display: block;
		padding: 1.5rem;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.presentation-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateX(2px);
	}

	.card-header {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.card-slides,
	.card-duration {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.card-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		margin-bottom: 0.5rem;
	}

	.card-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: 0.75rem;
	}

	.card-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
		margin-bottom: 1rem;
	}

	.card-tags {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.tag {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		padding: 0.25rem 0.5rem;
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
	}

	.card-cta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Footer */
	.footer {
		padding-top: 2rem;
		border-top: 1px solid var(--color-border-default);
		text-align: center;
	}

	.footer-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-text a {
		color: var(--color-fg-secondary);
		text-decoration: underline;
	}

	.footer-text a:hover {
		color: var(--color-fg-primary);
	}
</style>
