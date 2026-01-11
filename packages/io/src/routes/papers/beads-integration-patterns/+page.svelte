<svelte:head>
	<title>Beads Integration Patterns | CREATE SOMETHING.io</title>
	<meta name="description" content="How issue tracking systems can be designed to support nondeterministic, context-limited AI agent workflows through Git-committed state and dependency tracking." />
</svelte:head>

<script lang="ts">
	interface BeadsPattern {
		id: string;
		name: string;
		purpose: string;
		example: string;
	}

	interface DiscoverySource {
		source: string;
		description: string;
		example: string;
	}

	const integrationPatterns: BeadsPattern[] = [
		{
			id: 'survive-context',
			name: 'Context Survival',
			purpose: 'Preserve work across session restarts and context limits',
			example: `bd create "Refactor authentication"
bd update cs-123 --status in-progress`
		},
		{
			id: 'work-extraction',
			name: 'Work Extraction',
			purpose: 'Convert review findings into actionable issues',
			example: `createIssueFromFinding({
  severity: 'high',
  title: 'Add input validation',
  description: 'Prevent potential security risks'
})`
		},
		{
			id: 'dependency-tracking',
			name: 'Dependency Tracking',
			purpose: 'Model complex work relationships and blockers',
			example: `bd dep add cs-auth blocks cs-dashboard`
		}
	];

	const discoverySources: DiscoverySource[] = [
		{
			source: 'blocker',
			description: 'Critical findings that immediately halt progress',
			example: 'Critical security vulnerability requiring immediate fix'
		},
		{
			source: 'supervisor',
			description: 'Standard review findings about architecture, quality',
			example: 'Performance optimization suggestion'
		},
		{
			source: 'related',
			description: 'Secondary work items discovered during primary task',
			example: 'Potential refactoring during feature implementation'
		}
	];
</script>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<header class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-002</div>
			<h1 class="mb-3 paper-title">Beads Integration Patterns</h1>
			<p class="mb-4 paper-subtitle">Issue Tracking for AI Agent Workflows</p>
			<div class="paper-meta">Research Paper • 8 min read • Intermediate</div>
		</header>

		<!-- Abstract -->
		<section class="abstract-section space-y-4">
			<h2 class="section-heading">Abstract</h2>
			<p class="body-text">
				How can issue tracking systems be designed to support nondeterministic, context-limited
				AI agent workflows? This paper analyzes Beads integration patterns across the CREATE
				SOMETHING monorepo, documenting patterns for context survival, work extraction, and
				dependency tracking that enable agents to pick up where they left off.
			</p>
		</section>

		<!-- Research Question -->
		<section class="space-y-4">
			<h2 class="section-heading">Research Question</h2>
			<p class="body-text">
				Traditional issue trackers assume human operators with continuous context. AI agents
				face different constraints: context windows fill, sessions restart, and multiple agents
				may work in parallel. How do we design persistence that survives these conditions?
			</p>
		</section>

		<!-- Methodology -->
		<section class="space-y-4">
			<h2 class="section-heading">Methodology</h2>
			<p class="body-text">
				Analyzed Beads implementation across multiple packages:
			</p>
			<ul class="space-y-2 pl-6">
				<li class="body-text"><code class="code-inline">/packages/harness/src/beads.ts</code></li>
				<li class="body-text"><code class="code-inline">/packages/agent-sdk/src/create_something_agents/tools/beads.py</code></li>
				<li class="body-text"><code class="code-inline">/.claude/rules/beads-patterns.md</code></li>
			</ul>
		</section>

		<!-- Integration Patterns -->
		<section class="space-y-6">
			<h2 class="section-heading">Integration Patterns</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each integrationPatterns as pattern}
					<div class="comparison-card p-6">
						<h3 class="subsection-heading mb-2">{pattern.name}</h3>
						<p class="body-text mb-4">{pattern.purpose}</p>
						<div class="code-block">
							<pre><code>{pattern.example}</code></pre>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Work Discovery Taxonomy -->
		<section class="space-y-6">
			<h2 class="section-heading">Work Discovery Taxonomy</h2>
			<p class="body-text mb-4">
				Issues emerge from three sources during agent execution:
			</p>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				{#each discoverySources as source}
					<div class="comparison-card p-6">
						<h3 class="subsection-heading mb-2">{source.source}</h3>
						<p class="body-text mb-4">{source.description}</p>
						<div class="code-block">
							<pre><code>{source.example}</code></pre>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Limitations -->
		<section class="space-y-4">
			<h2 class="section-heading">Limitations</h2>
			<ul class="space-y-2 pl-6">
				<li class="body-text">Relies on CLI tool availability across environments</li>
				<li class="body-text">Potential race conditions in multi-agent environments</li>
				<li class="body-text">Requires consistent tooling across development environments</li>
				<li class="body-text">Git-based persistence adds commit overhead</li>
			</ul>
		</section>

		<!-- Related Papers -->
		<section class="space-y-4 pt-8 border-t border-[var(--color-border-default)]">
			<h2 class="section-heading">Related Papers</h2>
			<ul class="space-y-2 pl-6">
				<li><a href="/papers/beads-cross-session-memory" class="text-link">Beads Cross-Session Memory</a></li>
				<li><a href="/papers/harness-agent-sdk-migration" class="text-link">Harness Agent SDK Migration</a></li>
			</ul>
		</section>
	</div>
</div>

<style>
	.paper-container {
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	.paper-id {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		letter-spacing: 0.1em;
	}

	.paper-title {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		line-height: 1.1;
	}

	.paper-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.paper-meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.section-heading {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.subsection-heading {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.body-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.7;
	}

	.comparison-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.code-block {
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
		overflow-x: auto;
	}

	.code-block code {
		font-family: monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		white-space: pre-wrap;
	}

	.code-inline {
		font-family: monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		background: var(--color-bg-subtle);
		padding: 0.1em 0.3em;
		border-radius: var(--radius-sm);
	}

	.text-link {
		color: var(--color-info);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.text-link:hover {
		color: var(--color-fg-primary);
	}
</style>
