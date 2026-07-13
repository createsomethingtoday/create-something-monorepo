<script lang="ts">
	/**
	 * Learning Paths Section
	 *
	 * Cross-property links from .space (Practice) to .lms (Learning).
	 * Closes the Hermeneutic Circle: practice leads to structured learning.
	 *
	 * Canon: "Parts → Whole → Parts"
	 */

	interface LearningPath {
		id: string;
		title: string;
		subtitle: string;
		description: string;
		lessonCount: number;
		category: string;
	}

	// Curated selection of paths most relevant to .space practitioners
	const featuredPaths: LearningPath[] = [
		{
			id: 'partnership',
			title: 'Claude Code Partnership',
			subtitle: 'Terminal + Claude Code',
			description:
				'Human-agent complementarity—what each does best. The craftsman uses the hammer; the hammer does not use him.',
			lessonCount: 5,
			category: 'partnership'
		},
		{
			id: 'agents',
			title: 'Tool Configuration',
			subtitle: 'Coordination + Claude Code',
			description:
				'Multi-agent systems that reason together. MCP servers, skills, hooks, and slash commands.',
			lessonCount: 5,
			category: 'agents'
		},
		{
			id: 'foundations',
			title: 'System Philosophy',
			subtitle: 'The Subtractive Triad',
			description:
				'The philosophical core of CREATE SOMETHING. Learn the three-level discipline of subtractive revelation.',
			lessonCount: 5,
			category: 'foundations'
		}
	];
</script>

<section class="learning-section relative py-24 px-6">
	<div class="max-w-7xl mx-auto">
		<div class="text-center mb-12">
			<div class="eyebrow">FROM CREATESOMETHING.LMS</div>
			<h2 class="section-title mt-4">Learning Paths</h2>
			<p class="section-description mt-2">
				Structured learning for AI-native development
			</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
			{#each featuredPaths as path}
				<a
					href="https://learn.createsomething.space/paths/{path.id}"
					target="_blank"
					rel="noopener noreferrer"
					class="path-card group"
				>
					<div class="category">{path.category}</div>
					<h3 class="path-title">{path.title}</h3>
					<p class="path-subtitle">{path.subtitle}</p>
					<p class="path-description">{path.description}</p>
					<div class="path-meta">
						<span>{path.lessonCount} lessons</span>
						<span class="arrow">→</span>
					</div>
				</a>
			{/each}
		</div>

		<div class="text-center mt-12">
			<a
				href="https://learn.createsomething.space/paths"
				target="_blank"
				rel="noopener noreferrer"
				class="view-all-link"
			>
				View all learning paths
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
	.learning-section {
		background: var(--color-performance-bg-pure);
	}

	.eyebrow {
		font-size: var(--text-performance-body-sm);
		font-weight: 500;
		color: var(--color-performance-fg-muted);
		letter-spacing: 0.05em;
	}

	.section-title {
		font-size: var(--text-performance-h2);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
	}

	.section-description {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-tertiary);
	}

	.path-card {
		display: flex;
		flex-direction: column;
		padding: var(--space-performance-lg);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		text-decoration: none;
		transition:
			border-color var(--duration-performance-standard) var(--ease-performance-standard),
			transform var(--duration-performance-standard) var(--ease-performance-standard);
	}

	.path-card:hover {
		border-color: var(--color-performance-border-emphasis);
		transform: translateY(-2px);
	}

	.category {
		font-size: var(--text-performance-caption);
		font-weight: 500;
		color: var(--color-performance-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-performance-sm);
	}

	.path-title {
		font-size: var(--text-performance-h3);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-xs);
		line-height: 1.3;
	}

	.path-subtitle {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		margin-bottom: var(--space-performance-sm);
	}

	.path-description {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		line-height: 1.6;
		flex-grow: 1;
	}

	.path-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: var(--space-performance-md);
		padding-top: var(--space-performance-sm);
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.arrow {
		transition: transform var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.path-card:hover .arrow {
		transform: translateX(4px);
	}

	.view-all-link {
		display: inline-flex;
		align-items: center;
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-secondary);
		text-decoration: none;
		transition: color var(--duration-performance-standard) var(--ease-performance-standard);
	}

	.view-all-link:hover {
		color: var(--color-performance-fg-primary);
	}
</style>
