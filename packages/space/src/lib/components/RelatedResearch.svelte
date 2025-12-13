<script lang="ts">
	/**
	 * Related Research Section
	 *
	 * Cross-property links from .space (Practice) to .io (Research).
	 * Closes the Hermeneutic Circle: experiments demonstrate what papers describe.
	 *
	 * Canon: "Parts → Whole → Parts"
	 */

	interface ResearchPaper {
		slug: string;
		title: string;
		excerpt: string;
		readingTime: number;
		category: string;
	}

	// Curated selection of papers most relevant to .space experiments
	const featuredPapers: ResearchPaper[] = [
		{
			slug: 'code-mode-hermeneutic-analysis',
			title: 'Code-Mediated Tool Use',
			excerpt:
				'Why Code Mode achieves Zuhandenheit where traditional tool calling forces Vorhandenheit.',
			readingTime: 45,
			category: 'research'
		},
		{
			slug: 'hermeneutic-debugging',
			title: 'Hermeneutic Debugging',
			excerpt:
				'Applying the hermeneutic circle to software debugging—each failed fix reveals hidden assumptions.',
			readingTime: 12,
			category: 'methodology'
		},
		{
			slug: 'understanding-graphs',
			title: 'Understanding Graphs',
			excerpt:
				'Minimal dependency documentation embodying "Weniger, aber besser" (Less, but better).',
			readingTime: 15,
			category: 'research'
		}
	];
</script>

<section class="research-section relative py-24 px-6">
	<div class="max-w-7xl mx-auto">
		<div class="text-center mb-12">
			<div class="eyebrow">FROM CREATESOMETHING.IO</div>
			<h2 class="section-title mt-4">Research Papers</h2>
			<p class="section-description mt-2">
				The theoretical grounding behind these experiments
			</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
			{#each featuredPapers as paper}
				<a
					href="https://createsomething.io/papers/{paper.slug}"
					target="_blank"
					rel="noopener noreferrer"
					class="paper-card group"
				>
					<div class="category">{paper.category}</div>
					<h3 class="paper-title">{paper.title}</h3>
					<p class="paper-excerpt">{paper.excerpt}</p>
					<div class="paper-meta">
						<span>{paper.readingTime} min read</span>
						<span class="arrow">→</span>
					</div>
				</a>
			{/each}
		</div>

		<div class="text-center mt-12">
			<a
				href="https://createsomething.io/papers"
				target="_blank"
				rel="noopener noreferrer"
				class="view-all-link"
			>
				View all research papers
				<svg
					class="inline-block w-4 h-4 ml-1 transition-transform group-hover:translate-x-1"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					stroke-width="2"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
				</svg>
			</a>
		</div>
	</div>
</section>

<style>
	.research-section {
		background: var(--color-bg-elevated);
	}

	.eyebrow {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-muted);
		letter-spacing: 0.05em;
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.section-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
	}

	.paper-card {
		display: flex;
		flex-direction: column;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition:
			border-color var(--duration-standard) var(--ease-standard),
			transform var(--duration-standard) var(--ease-standard);
	}

	.paper-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-2px);
	}

	.category {
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-sm);
	}

	.paper-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
		line-height: 1.3;
	}

	.paper-excerpt {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: 1.6;
		flex-grow: 1;
	}

	.paper-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: var(--space-md);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.arrow {
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.paper-card:hover .arrow {
		transform: translateX(4px);
	}

	.view-all-link {
		display: inline-flex;
		align-items: center;
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.view-all-link:hover {
		color: var(--color-fg-primary);
	}
</style>
