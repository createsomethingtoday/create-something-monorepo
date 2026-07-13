<script lang="ts">
	const tools = [
		{
			name: 'Ground',
			tagline: 'Grounded claims for code',
			description: 'MCP server that prevents AI hallucination in code analysis. Verification-first patterns for duplicate detection, dead code, and orphan analysis.',
			href: '/docs/ground',
			npm: '@createsomething/ground-mcp',
			features: ['Duplicate detection', 'Dead code analysis', 'Orphan detection', 'Design drift analysis']
		},
		{
			name: 'Loom',
			tagline: 'External memory for agents',
			description: 'AI-native coordination layer. Multi-agent task routing, checkpointing, and crash recovery for AI coding assistants.',
			href: '/docs/loom',
			npm: '@createsomething/loom-mcp',
			features: ['Task coordination', 'Crash recovery', 'Smart routing', 'Session checkpointing']
		}
	];
</script>

<svelte:head>
	<title>Documentation | CREATE SOMETHING</title>
	<meta name="description" content="Documentation for CREATE SOMETHING tools: Ground (code analysis), Loom (agent coordination). MCP servers for Claude, Cursor, Windsurf, and other AI coding assistants." />
	<meta name="keywords" content="MCP, Model Context Protocol, AI coding, Claude Code, Cursor, Windsurf, code analysis, agent coordination, documentation" />
</svelte:head>

<main class="docs-index">
	<header class="hero">
		<h1>Documentation</h1>
		<p class="tagline">Tools for AI-native development</p>
		<p class="description">
			MCP servers and CLI tools that extend Claude Code, Cursor, Windsurf, VS Code Copilot, and other AI coding assistants.
		</p>
	</header>

	<section class="tools-grid">
		{#each tools as tool}
			<a href={tool.href} class="tool-card">
				<h2>{tool.name}</h2>
				<p class="tool-tagline">{tool.tagline}</p>
				<p class="tool-description">{tool.description}</p>
				<code class="npm-package">{tool.npm}</code>
				<ul class="features">
					{#each tool.features as feature}
						<li>{feature}</li>
					{/each}
				</ul>
			</a>
		{/each}
	</section>

	<section class="quick-install">
		<h2>Quick Install</h2>
		<div class="install-grid">
			<div class="install-option">
				<h3>Ground</h3>
				<pre><code>npx @createsomething/ground-mcp</code></pre>
			</div>
			<div class="install-option">
				<h3>Loom</h3>
				<pre><code>npx @createsomething/loom-mcp</code></pre>
			</div>
		</div>
	</section>

	<section class="supported-tools">
		<h2>Supported Tools</h2>
		<p>Works with any MCP-compatible AI coding assistant:</p>
		<ul class="tool-list">
			<li>Claude Code (CLI)</li>
			<li>Claude Desktop</li>
			<li>Cursor</li>
			<li>Windsurf</li>
			<li>VS Code + Copilot</li>
			<li>Codex CLI</li>
			<li>Gemini</li>
		</ul>
	</section>
</main>

<style>
	.docs-index {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-performance-lg);
	}

	.hero {
		text-align: center;
		margin-bottom: var(--space-performance-xl);
	}

	.hero h1 {
		font-size: var(--text-performance-display);
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-sm);
	}

	.tagline {
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-sm);
	}

	.description {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-tertiary);
		max-width: 600px;
		margin: 0 auto;
	}

	.tools-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-performance-lg);
		margin-bottom: var(--space-performance-xl);
	}

	.tool-card {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-lg);
		text-decoration: none;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.tool-card:hover {
		border-color: var(--color-border-hover);
		transform: translateY(-2px);
	}

	.tool-card h2 {
		font-size: var(--text-performance-h2);
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-xs);
	}

	.tool-tagline {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-sm);
	}

	.tool-description {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-tertiary);
		margin-bottom: var(--space-performance-md);
	}

	.npm-package {
		display: inline-block;
		background: var(--color-performance-bg-subtle);
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-md);
	}

	.features {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.features li {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		padding-left: var(--space-performance-md);
		position: relative;
		margin-bottom: var(--space-performance-xs);
	}

	.features li::before {
		content: '→';
		position: absolute;
		left: 0;
		color: var(--color-performance-fg-muted);
	}

	.quick-install {
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-lg);
		margin-bottom: var(--space-performance-xl);
	}

	.quick-install h2 {
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-md);
	}

	.install-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-performance-md);
	}

	.install-option h3 {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-xs);
	}

	.install-option pre {
		background: var(--color-performance-bg-pure);
		padding: var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-sm);
		overflow-x: auto;
	}

	.install-option code {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-primary);
	}

	.supported-tools h2 {
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-sm);
	}

	.supported-tools p {
		color: var(--color-performance-fg-tertiary);
		margin-bottom: var(--space-performance-md);
	}

	.tool-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-performance-sm);
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.tool-list li {
		background: var(--color-performance-bg-subtle);
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
	}
</style>
