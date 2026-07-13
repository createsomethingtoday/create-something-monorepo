<script lang="ts">
	const taskTools = [
		{ name: 'loom_work', description: 'Quick start: create and claim task atomically' },
		{ name: 'loom_create', description: 'Create task for multi-agent coordination' },
		{ name: 'loom_claim', description: 'Claim a task for an agent' },
		{ name: 'loom_complete', description: 'Mark a task as complete' },
		{ name: 'loom_cancel', description: 'Cancel a task' },
		{ name: 'loom_spawn', description: 'Create sub-tasks' },
		{ name: 'loom_ready', description: 'List tasks ready to work on' },
		{ name: 'loom_mine', description: 'List tasks claimed by agent' },
		{ name: 'loom_blocked', description: 'List blocked tasks' }
	];

	const routingTools = [
		{ name: 'loom_route', description: 'Get agent recommendation (best/cheapest/fastest)' },
		{ name: 'loom_agents', description: 'List all configured agents' },
		{ name: 'loom_analytics', description: 'Execution analytics' }
	];

	const sessionTools = [
		{ name: 'loom_session_start', description: 'Start a work session' },
		{ name: 'loom_session_end', description: 'End current session' },
		{ name: 'loom_checkpoint', description: 'Save progress for crash recovery' },
		{ name: 'loom_recover', description: 'List recoverable sessions' },
		{ name: 'loom_resume', description: 'Resume from any point' },
		{ name: 'loom_get_resume_brief', description: 'Generate context for session continuity' }
	];

	const formulaTools = [
		{ name: 'loom_formulas', description: 'List available workflow templates' },
		{ name: 'loom_formula', description: 'Get formula details' }
	];
</script>

<svelte:head>
	<title>Loom Documentation | CREATE SOMETHING</title>
	<meta name="description" content="Loom MCP server documentation. AI-native coordination layer with multi-agent task routing, checkpointing, and crash recovery. Works with Claude Code, Cursor, Windsurf." />
	<meta name="keywords" content="Loom, MCP server, agent coordination, task routing, crash recovery, checkpointing, session management, Claude Code, Cursor, Windsurf" />
</svelte:head>

<main class="docs-page">
	<nav class="breadcrumb">
		<a href="/docs">Documentation</a> / <span>Loom</span>
	</nav>

	<header class="hero">
		<h1>Loom</h1>
		<p class="tagline">External memory for agents</p>
		<p class="description">
			AI-native coordination layer. Multi-agent task routing, checkpointing, 
			and crash recovery for AI coding assistants.
		</p>
		<code class="npm-package">npm install @createsomething/loom-mcp</code>
	</header>

	<section class="section">
		<h2>The Problem</h2>
		<p>
			AI agents forget everything between sessions. Context windows have limits. 
			Conversations get summarized. Work gets lost.
		</p>
	</section>

	<section class="section">
		<h2>The Solution</h2>
		<p><strong>Loom provides external memory for agents.</strong></p>
		<ul>
			<li><strong>Session checkpointing</strong> — Save progress, resume from any point</li>
			<li><strong>Crash recovery</strong> — Session died? Pick up exactly where you left off</li>
			<li><strong>Smart routing</strong> — Route tasks to the best/cheapest/fastest agent</li>
			<li><strong>Multi-agent coordination</strong> — Multiple agents, one task queue</li>
		</ul>
	</section>

	<section class="section comparison">
		<h2>Why Loom?</h2>
		<table>
			<thead>
				<tr>
					<th>Feature</th>
					<th>Beads</th>
					<th>Gas Town</th>
					<th>Loom</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>Multi-agent</td><td>❌</td><td>❌</td><td>✅</td></tr>
				<tr><td>Smart routing</td><td>❌</td><td>Basic</td><td>✅</td></tr>
				<tr><td>Session memory</td><td>❌</td><td>✅</td><td>✅</td></tr>
				<tr><td>Crash recovery</td><td>❌</td><td>✅</td><td>✅</td></tr>
				<tr><td>Git sync</td><td>✅</td><td>❌</td><td>✅</td></tr>
				<tr><td>Ground integration</td><td>❌</td><td>❌</td><td>✅</td></tr>
				<tr><td>Cost optimization</td><td>❌</td><td>❌</td><td>✅</td></tr>
			</tbody>
		</table>
	</section>

	<section class="section">
		<h2>Installation</h2>
		
		<h3>Claude Code (CLI)</h3>
		<pre><code>npm install @createsomething/loom-mcp
claude mcp add --scope user --transport stdio loom -- npx @createsomething/loom-mcp</code></pre>

		<h3>Cursor (One-Click)</h3>
		<p><a href="cursor://anysphere.cursor-deeplink/mcp/install?name=loom&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJAY3JlYXRlc29tZXRoaW5nL2xvb20tbWNwIl19" class="install-button">Install in Cursor →</a></p>

		<h3>Other Tools</h3>
		<p>Add to your MCP config:</p>
		<pre><code>{`{
  "mcpServers": {
    "loom": {
      "command": "npx",
      "args": ["@createsomething/loom-mcp"]
    }
  }
}`}</code></pre>
	</section>

	<section class="section">
		<h2>Quick Start</h2>
		<pre><code># Initialize Loom in your project
lm init

# Start working on something (create + claim atomically)
lm work "Fix the authentication bug" --agent claude-code

# Checkpoint progress (crash recovery)
lm checkpoint "JWT validation complete"

# Get routing recommendation
lm route lm-abc --strategy cheapest

# Complete with evidence
lm done lm-abc --evidence "commit-abc123"</code></pre>
	</section>

	<section class="section">
		<h2>Available Tools</h2>

		<h3>Task Management</h3>
		<div class="tools-table">
			{#each taskTools as tool}
				<div class="tool-row">
					<code class="tool-name">{tool.name}</code>
					<span class="tool-desc">{tool.description}</span>
				</div>
			{/each}
		</div>

		<h3>Smart Routing</h3>
		<div class="tools-table">
			{#each routingTools as tool}
				<div class="tool-row">
					<code class="tool-name">{tool.name}</code>
					<span class="tool-desc">{tool.description}</span>
				</div>
			{/each}
		</div>

		<h3>Sessions & Memory</h3>
		<div class="tools-table">
			{#each sessionTools as tool}
				<div class="tool-row">
					<code class="tool-name">{tool.name}</code>
					<span class="tool-desc">{tool.description}</span>
				</div>
			{/each}
		</div>

		<h3>Formulas</h3>
		<div class="tools-table">
			{#each formulaTools as tool}
				<div class="tool-row">
					<code class="tool-name">{tool.name}</code>
					<span class="tool-desc">{tool.description}</span>
				</div>
			{/each}
		</div>
	</section>

	<section class="section">
		<h2>MCP Apps (Interactive UIs)</h2>
		<p>
			Loom supports the MCP Apps extension for interactive task visualization. 
			When you call task visibility tools, supported clients render an interactive 
			Kanban-style task board:
		</p>
		<ul>
			<li>Drag-and-drop between columns</li>
			<li>One-click claim, complete, or release tasks</li>
			<li>Real-time status updates</li>
			<li>Filter by status, label, or agent</li>
		</ul>
		<p><strong>Supported Clients:</strong> Claude.ai, VS Code (Insiders), ChatGPT, Goose</p>
	</section>

	<section class="section links">
		<h2>Links</h2>
		<ul>
			<li><a href="https://www.npmjs.com/package/@createsomething/loom-mcp">npm Package</a></li>
			<li><a href="https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/loom">GitHub Repository</a></li>
			<li><a href="/docs/ground">Related: Ground (Code Analysis)</a></li>
		</ul>
	</section>
</main>

<style>
	.docs-page {
		max-width: 800px;
		margin: 0 auto;
		padding: var(--space-performance-lg);
	}

	.breadcrumb {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		margin-bottom: var(--space-performance-lg);
	}

	.breadcrumb a {
		color: var(--color-performance-fg-tertiary);
		text-decoration: none;
	}

	.breadcrumb a:hover {
		color: var(--color-performance-fg-secondary);
	}

	.hero {
		margin-bottom: var(--space-performance-xl);
	}

	.hero h1 {
		font-size: var(--text-performance-display);
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-xs);
	}

	.tagline {
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-sm);
	}

	.description {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-tertiary);
		margin-bottom: var(--space-performance-md);
	}

	.npm-package {
		display: inline-block;
		background: var(--color-performance-bg-subtle);
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-secondary);
	}

	.section {
		margin-bottom: var(--space-performance-xl);
	}

	.section h2 {
		font-size: var(--text-performance-h2);
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-md);
		padding-bottom: var(--space-performance-sm);
	}

	.section h3 {
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-secondary);
		margin-top: var(--space-performance-lg);
		margin-bottom: var(--space-performance-sm);
	}

	.section p {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-tertiary);
		margin-bottom: var(--space-performance-sm);
		line-height: 1.6;
	}

	.section ul {
		padding-left: var(--space-performance-lg);
		margin-bottom: var(--space-performance-md);
	}

	.section li {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-tertiary);
		margin-bottom: var(--space-performance-xs);
	}

	pre {
		padding: var(--space-performance-md);
		border-radius: var(--radius-performance-scale-md);
		overflow-x: auto;
		margin-bottom: var(--space-performance-md);
	}

	pre code {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-primary);
	}

	.install-button {
		display: inline-block;
		background: var(--color-performance-bg-surface);
		padding: var(--space-performance-sm) var(--space-performance-md);
		border-radius: var(--radius-performance-scale-md);
		color: var(--color-performance-fg-primary);
		text-decoration: none;
		font-size: var(--text-performance-body);
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.install-button:hover {
		border-color: var(--color-border-hover);
		background: var(--color-performance-bg-subtle);
	}

	.comparison table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: var(--space-performance-md);
	}

	.comparison th,
	.comparison td {
		padding: var(--space-performance-sm);
		text-align: left;
	}

	.comparison th {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		font-weight: 600;
	}

	.comparison td {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
	}

	.tools-table {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
		margin-bottom: var(--space-performance-md);
	}

	.tool-row {
		display: grid;
		grid-template-columns: 220px 1fr;
		gap: var(--space-performance-md);
		padding: var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-sm);
	}

	.tool-name {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-primary);
	}

	.tool-desc {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
	}

	.links ul {
		list-style: none;
		padding: 0;
	}

	.links li {
		margin-bottom: var(--space-performance-sm);
	}

	.links a {
		color: var(--color-performance-fg-secondary);
		text-decoration: none;
	}

	.links a:hover {
		color: var(--color-performance-fg-primary);
		text-decoration: underline;
	}

	@media (max-width: 600px) {
		.tool-row {
			grid-template-columns: 1fr;
		}
	}
</style>
