<script lang="ts">
	const coreTools = [
		{ name: 'ground_compare', description: 'Compare two files for similarity (0.0-1.0 score)' },
		{ name: 'ground_count_uses', description: 'Count symbol uses; distinguishes runtime vs type-only usages' },
		{ name: 'ground_check_connections', description: 'Check if module is connected (understands Cloudflare Workers)' },
		{ name: 'ground_find_duplicate_functions', description: 'Find duplicates across AND within files; supports monorepos' }
	];

	const claimTools = [
		{ name: 'ground_claim_dead_code', description: 'Claim code is dead — blocked until you\'ve counted uses' },
		{ name: 'ground_claim_orphan', description: 'Claim module is orphaned — blocked until you\'ve checked connections' }
	];

	const discoveryTools = [
		{ name: 'ground_find_orphans', description: 'Find modules nothing imports' },
		{ name: 'ground_find_dead_exports', description: 'Find exports never imported elsewhere' },
		{ name: 'ground_check_environment', description: 'Detect Workers/Node.js API leakage' },
		{ name: 'ground_suggest_fix', description: 'Get suggestions for fixing duplications' }
	];

	const graphTools = [
		{ name: 'ground_build_graph', description: 'Build symbol graph for repo-wide analysis' },
		{ name: 'ground_query_dead', description: 'Query graph for dead exports (filters framework conventions)' }
	];

	const aiTools = [
		{ name: 'ground_analyze', description: 'Batch analysis: duplicates + dead exports + orphans + environment' },
		{ name: 'ground_diff', description: 'Incremental analysis vs git baseline (only NEW issues)' },
		{ name: 'ground_verify_fix', description: 'Verify a fix was applied correctly' }
	];

	const designTools = [
		{ name: 'ground_find_drift', description: 'Find design token violations (hardcoded colors, spacing, etc.)' },
		{ name: 'ground_adoption_ratio', description: 'Calculate token adoption percentage with health thresholds' },
		{ name: 'ground_suggest_pattern', description: 'Suggest tokens to replace hardcoded values' },
		{ name: 'ground_mine_patterns', description: 'Discover implicit patterns that should become tokens' },
		{ name: 'ground_explain', description: 'AI-native traceability — explain why files are excluded' }
	];
</script>

<svelte:head>
	<title>Ground Documentation | CREATE SOMETHING</title>
	<meta name="description" content="Ground MCP server documentation for evidence-first TypeScript, JavaScript, and SvelteKit code analysis." />
	<meta name="keywords" content="Ground, MCP server, TypeScript, JavaScript, SvelteKit, code analysis, duplicate detection, dead code, orphan detection, Claude Code, Cursor, Windsurf, Codex" />
</svelte:head>

<main class="docs-page">
	<nav class="breadcrumb">
		<a href="/docs">Documentation</a> / <span>Ground</span>
	</nav>

	<header class="hero">
		<h1>Ground</h1>
		<p class="tagline">Grounded claims for code</p>
		<p class="description">
			An MCP server that requires code analysis before an agent can record a claim.
			Ground focuses its public support contract on TypeScript, JavaScript, and SvelteKit.
		</p>
		<code class="npm-package">npm install @createsomething/ground-mcp</code>
	</header>

	<section class="section">
		<h2>The Problem</h2>
		<p>
			AI agents are confident. Too confident. They'll tell you two files are "95% similar" 
			without ever comparing them. They'll declare code "dead" without checking who uses it.
		</p>
		<p>This is hallucination dressed up as analysis.</p>
	</section>

	<section class="section">
		<h2>The Solution</h2>
		<p><strong>You can't claim something until you've checked it.</strong></p>
		<ul>
			<li><strong>Duplicates</strong> → You have to compare the files first</li>
			<li><strong>Dead code</strong> → You have to count the uses first</li>
			<li><strong>Orphans</strong> → You have to check the connections first</li>
		</ul>
		<p>This makes the checked inputs and the finding inspectable before synthesis.</p>
	</section>

	<section class="section">
		<h2>Installation</h2>
		
		<h3>Claude Code (CLI)</h3>
		<pre><code>claude mcp add --scope user --transport stdio ground -- npx --yes -p @createsomething/ground-mcp ground-mcp</code></pre>

		<h3>Codex CLI</h3>
		<pre><code>codex mcp add ground -- npx --yes -p @createsomething/ground-mcp ground-mcp</code></pre>

		<h3>Cursor, Windsurf, and JSON-based clients</h3>
		<p>Add this server to the client MCP configuration:</p>
		<pre><code>{`{
  "mcpServers": {
    "ground": {
      "command": "npx",
      "args": ["--yes", "-p", "@createsomething/ground-mcp", "ground-mcp"]
    }
  }
}`}</code></pre>
	</section>

	<section class="section">
		<h2>Supported code</h2>
		<ul>
			<li><strong>TypeScript and JavaScript:</strong> duplicate functions, imports, uses, dead exports, entry points, orphans, environment boundaries, and git diffs.</li>
			<li><strong>Svelte and SvelteKit:</strong> component-script duplicates, module-context dead exports, route conventions, <code>$lib</code> imports, actions, stores, hooks, and reachability. Instance-script exports such as legacy <code>export let</code> props are component API and are excluded from dead-export findings.</li>
			<li><strong>Other languages:</strong> some direct checks can parse them, but they are outside the public agent-quality support contract.</li>
		</ul>
		<p>Only <code>PASS</code> means a requested check completed cleanly. Ground returns <code>FAIL</code> for findings or incomplete requested checks, <code>UNSUPPORTED</code> when relevant source is outside that analyzer, <code>NOT_APPLICABLE</code> when no requested check applies, and <code>TIMEOUT</code> when duplicate analysis reaches its deadline.</p>
	</section>

	<section class="section">
		<h2>Calibration</h2>
		<p>Ground remains advisory until the checked-in calibration policy passes. Promotion requires at least 10 independently adjudicated findings, 90% precision, no more than a 10% false-positive rate, stable exclusion accounting, and no execution failures in the representative sample.</p>
		<p>Each finding stays classified as confirmed, false positive, or out of scope. Out-of-scope observations never inflate detector accuracy.</p>
		<p>The current release calibration combines 10 controlled positive fixtures with one preserved real-repository false positive. That qualifies the declared advisory release gate; it is not a population-wide accuracy estimate.</p>
	</section>

	<section class="section">
		<h2>Available Tools</h2>

		<h3>Core Analysis</h3>
		<div class="tools-table">
			{#each coreTools as tool}
				<div class="tool-row">
					<code class="tool-name">{tool.name}</code>
					<span class="tool-desc">{tool.description}</span>
				</div>
			{/each}
		</div>

		<h3>Verified Claims (Audit Trail)</h3>
		<div class="tools-table">
			{#each claimTools as tool}
				<div class="tool-row">
					<code class="tool-name">{tool.name}</code>
					<span class="tool-desc">{tool.description}</span>
				</div>
			{/each}
		</div>

		<h3>Discovery Tools</h3>
		<div class="tools-table">
			{#each discoveryTools as tool}
				<div class="tool-row">
					<code class="tool-name">{tool.name}</code>
					<span class="tool-desc">{tool.description}</span>
				</div>
			{/each}
		</div>

		<h3>Graph-Based Analysis</h3>
		<div class="tools-table">
			{#each graphTools as tool}
				<div class="tool-row">
					<code class="tool-name">{tool.name}</code>
					<span class="tool-desc">{tool.description}</span>
				</div>
			{/each}
		</div>

		<h3>AI-Native Tools</h3>
		<div class="tools-table">
			{#each aiTools as tool}
				<div class="tool-row">
					<code class="tool-name">{tool.name}</code>
					<span class="tool-desc">{tool.description}</span>
				</div>
			{/each}
		</div>

		<h3>Design System Analysis</h3>
		<div class="tools-table">
			{#each designTools as tool}
				<div class="tool-row">
					<code class="tool-name">{tool.name}</code>
					<span class="tool-desc">{tool.description}</span>
				</div>
			{/each}
		</div>
	</section>

	<section class="section">
		<h2>Usage Examples</h2>
		<p>Ask your AI assistant:</p>
		<pre><code>Find duplicate functions in src/ with at least 10 lines</code></pre>
		<pre><code>Check if the old-utils module is still connected to anything</code></pre>
		<pre><code>Run ground_analyze on packages/sdk to find dead code</code></pre>
		<pre><code>What's the CSS token adoption ratio in packages/components?</code></pre>
	</section>

	<section class="section">
		<h2>Configuration</h2>
		<p>Ground loads <code>.ground.yml</code> from your project root for:</p>
		<ul>
			<li>Ignore patterns (functions, files, directories)</li>
			<li>Known drift exceptions with documented reasons</li>
			<li>Context declarations for intentional exclusions</li>
			<li>Similarity thresholds</li>
		</ul>
		<p>The MCP server stores its registry at <code>.ground/registry.db</code> by default and writes its desire-path log beside that database.</p>
		<p>For a disposable evaluation, pass an explicit database outside the repository:</p>
		<pre><code>ground-mcp --db /tmp/ground-eval/registry.db --workspace /absolute/path/to/project</code></pre>
	</section>

	<section class="section links">
		<h2>Links</h2>
		<ul>
			<li><a href="https://www.npmjs.com/package/@createsomething/ground-mcp">npm Package</a></li>
			<li><a href="https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/ground">GitHub Repository</a></li>
			<li><a href="/papers/ground-evidence-based-claims">Research Paper: Evidence-Based Claims</a></li>
			<li><a href="https://github.com/createsomethingtoday/create-something-monorepo/blob/main/AGENTS.md">Coordination policy: Linear-first tracked work</a></li>
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

	.tools-table {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
		margin-bottom: var(--space-performance-md);
	}

	.tool-row {
		display: grid;
		grid-template-columns: 280px 1fr;
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
