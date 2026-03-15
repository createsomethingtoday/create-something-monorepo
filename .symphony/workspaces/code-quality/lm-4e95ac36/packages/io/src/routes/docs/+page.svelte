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
		padding: var(--space-lg);
	}

	.hero {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.hero h1 {
		font-size: var(--text-display);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.tagline {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		max-width: 600px;
		margin: 0 auto;
	}

	.tools-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.tool-card {
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.tool-card:hover {
		border-color: var(--color-border-hover);
		transform: translateY(-2px);
	}

	.tool-card h2 {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.tool-tagline {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.tool-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-md);
	}

	.npm-package {
		display: inline-block;
		background: var(--color-bg-subtle);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
	}

	.features {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.features li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		padding-left: var(--space-md);
		position: relative;
		margin-bottom: var(--space-xs);
	}

	.features li::before {
		content: '→';
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
	}

	.quick-install {
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.quick-install h2 {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.install-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.install-option h3 {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.install-option pre {
		background: var(--color-bg-pure);
		padding: var(--space-sm);
		border-radius: var(--radius-sm);
		overflow-x: auto;
	}

	.install-option code {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
	}

	.supported-tools h2 {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.supported-tools p {
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-md);
	}

	.tool-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.tool-list li {
		background: var(--color-bg-subtle);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}
</style>
