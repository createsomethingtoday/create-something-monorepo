<script lang="ts">
	/**
	 * Research Papers Index
	 *
	 * Displays formal research papers that provide theoretical grounding
	 * for CREATE SOMETHING's methodology.
	 *
	 * Papers = Vorhandenheit (present-at-hand)
	 *   → Detached analysis, reader as observer
	 *
	 * Experiments = Zuhandenheit (ready-to-hand)
	 *   → Engaged practice, reader as participant
	 */

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.meta.title} | CREATE SOMETHING .io</title>
	<meta name="description" content={data.meta.description} />
</svelte:head>

<main class="papers-page">
	<header class="page-header">
		<pre class="ascii-header">{`
╔═══════════════════════════════════════════════════════════════╗
║   RESEARCH PAPERS                                             ║
║                                                               ║
║   Theoretical Grounding for AI-Native Development             ║
║                                                               ║
║   "We understand parts through the whole,                     ║
║    and the whole through its parts."                          ║
║                              — Gadamer                        ║
╚═══════════════════════════════════════════════════════════════╝
`}</pre>

		<p class="page-description">
			Formal research applying phenomenology, hermeneutics, and design philosophy to understand how
			AI systems should be built. These papers DESCRIBE the hermeneutic circle; our
			<a href="/experiments">experiments</a> DEMONSTRATE it.
		</p>
	</header>

	<section class="papers-grid">
		{#each data.papers as paper}
			<article class="paper-card">
				{#if paper.ascii_art}
					<pre class="paper-ascii">{paper.ascii_art}</pre>
				{/if}

				<div class="paper-content">
					<div class="paper-meta">
						<span class="paper-category">{paper.category}</span>
						<span class="paper-reading-time">{paper.reading_time} min read</span>
						<span class="paper-difficulty">{paper.difficulty_level}</span>
					</div>

					<h2 class="paper-title">
						<a href="/papers/{paper.slug}">{paper.title}</a>
					</h2>

					{#if paper.subtitle}
						<p class="paper-subtitle">{paper.subtitle}</p>
					{/if}

					<p class="paper-excerpt">{paper.excerpt_long}</p>

					<div class="paper-keywords">
						{#each paper.tags || [] as tag}
							<span class="keyword">{tag.name}</span>
						{/each}
					</div>

					<footer class="paper-footer">
						<a href="/papers/{paper.slug}" class="read-link">Read Paper →</a>
					</footer>
				</div>
			</article>
		{/each}
	</section>

	{#if data.papers.length === 0}
		<p class="no-papers">Research papers coming soon. Check our <a href="/experiments">experiments</a> for practical demonstrations.</p>
	{/if}
</main>

<style>
	.papers-page {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem;
	}

	.page-header {
		margin-bottom: 3rem;
		text-align: center;
	}

	.ascii-header {
		font-family: 'JetBrains Mono', 'IBM Plex Mono', monospace;
		font-size: 0.7rem;
		line-height: 1.2;
		color: rgba(255, 255, 255, 0.7);
		margin: 0 auto 1.5rem;
		text-align: left;
		display: inline-block;
	}

	.page-description {
		max-width: 600px;
		margin: 0 auto;
		color: rgba(255, 255, 255, 0.6);
		line-height: 1.6;
	}

	.page-description a {
		color: rgba(255, 255, 255, 0.8);
		text-decoration: underline;
	}

	.papers-grid {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.paper-card {
		background: rgba(10, 10, 10, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		overflow: hidden;
	}

	.paper-ascii {
		font-family: 'JetBrains Mono', 'IBM Plex Mono', monospace;
		font-size: 0.55rem;
		line-height: 1.15;
		color: rgba(255, 255, 255, 0.5);
		padding: 1rem;
		background: rgba(0, 0, 0, 0.3);
		margin: 0;
		overflow-x: auto;
	}

	.paper-content {
		padding: 1.5rem;
	}

	.paper-meta {
		display: flex;
		gap: 1rem;
		margin-bottom: 0.75rem;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
	}

	.paper-category {
		color: rgba(255, 255, 255, 0.6);
	}

	.paper-title {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
		line-height: 1.3;
	}

	.paper-title a {
		color: inherit;
		text-decoration: none;
	}

	.paper-title a:hover {
		color: rgba(255, 255, 255, 0.8);
	}

	.paper-subtitle {
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.6);
		font-style: italic;
		margin: 0 0 1rem 0;
	}

	.paper-excerpt {
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.6;
		margin: 0 0 1rem 0;
	}

	.paper-keywords {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.keyword {
		padding: 0.25rem 0.5rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.paper-footer {
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.read-link {
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;
		font-size: 0.875rem;
	}

	.read-link:hover {
		color: rgba(255, 255, 255, 1);
	}

	.no-papers {
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
		padding: 3rem;
	}

	.no-papers a {
		color: rgba(255, 255, 255, 0.7);
	}
</style>
