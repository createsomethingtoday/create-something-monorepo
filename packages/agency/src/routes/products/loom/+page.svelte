<script lang="ts">
	import type { PageData } from './$types';
	import { SEO } from '@create-something/components';

	let { data }: { data: PageData } = $props();
	const { product } = data;

	// Cursor deep link - base64 encoded config for npx @create-something/loom
	const cursorDeepLink = 'cursor://anysphere.cursor-deeplink/mcp/install?name=loom&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJAY3JlYXRlLXNvbWV0aGluZy9sb29tIl19';

	// Copy states
	let copiedNpm = $state(false);
	let copiedClaude = $state(false);
	let copiedWindsurf = $state(false);
	let copiedCodex = $state(false);

	function copyToClipboard(text: string, setter: (v: boolean) => void) {
		navigator.clipboard.writeText(text);
		setter(true);
		setTimeout(() => setter(false), 2000);
	}
</script>

<SEO
	title="Loom MCP | Multi-Agent Coordination"
	description="External memory for AI agents. Route tasks to the right agent, checkpoint progress, recover from crashes. Multi-agent coordination for Claude, Cursor, Codex, and Gemini."
	keywords="MCP, Model Context Protocol, multi-agent, AI coordination, task management, Claude, Cursor, VS Code, Copilot, crash recovery"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<main class="loom-page">
	<!-- Hero Section -->
	<section class="hero">
		<div class="hero-badge">Free & Open Source</div>
		<h1 class="hero-title">Loom</h1>
		<p class="hero-tagline">External memory for AI agents</p>
		<p class="hero-description">
			AI agents forget everything between sessions. They work alone when they should coordinate.
			Loom gives agents <strong>memory, routing, and crash recovery</strong>.
		</p>
	</section>

	<!-- Install Section -->
	<section class="install-section">
		<h2 class="section-title">Install in 2 minutes</h2>
		<p class="section-subtitle">One-click for your AI tool of choice</p>

		<div class="install-grid">
			<!-- Cursor -->
			<div class="install-card cursor">
				<div class="card-header">
					<span class="card-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</span>
					<span class="card-name">Cursor</span>
					<span class="card-badge one-click">One-click</span>
				</div>
				<a href={cursorDeepLink} class="install-button primary">
					Install in Cursor
				</a>
				<p class="card-note">Opens Cursor with install prompt</p>
			</div>

			<!-- Claude Desktop -->
			<div class="install-card claude">
				<div class="card-header">
					<span class="card-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
							<path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</span>
					<span class="card-name">Claude Desktop</span>
				</div>
				<button
					class="install-button secondary"
					onclick={() => copyToClipboard('npx --yes @create-something/loom', (v) => copiedClaude = v)}
				>
					{copiedClaude ? 'Copied!' : 'Copy install command'}
				</button>
				<code class="card-code">npx --yes @create-something/loom</code>
				<p class="card-note">Add to claude_desktop_config.json</p>
			</div>

			<!-- Windsurf -->
			<div class="install-card windsurf">
				<div class="card-header">
					<span class="card-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M4 16L8 12L4 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M12 16L16 12L12 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M20 16V8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
						</svg>
					</span>
					<span class="card-name">Windsurf</span>
				</div>
				<button
					class="install-button secondary"
					onclick={() => copyToClipboard('{"mcpServers":{"loom":{"command":"npx","args":["@create-something/loom"]}}}', (v) => copiedWindsurf = v)}
				>
					{copiedWindsurf ? 'Copied!' : 'Copy config'}
				</button>
				<p class="card-note">Settings → MCP → View raw config</p>
			</div>

			<!-- VS Code + Copilot -->
			<div class="install-card vscode">
				<div class="card-header">
					<span class="card-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M16 3L8 12L16 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M8 3V21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
						</svg>
					</span>
					<span class="card-name">VS Code + Copilot</span>
				</div>
				<a href="vscode:extension/GitHub.copilot" class="install-button secondary">
					Open Extensions
				</a>
				<p class="card-note">Filter by MCP Server → search "loom"</p>
			</div>

			<!-- Codex CLI -->
			<div class="install-card codex">
				<div class="card-header">
					<span class="card-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
							<path d="M7 8L11 12L7 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M13 16H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
						</svg>
					</span>
					<span class="card-name">Codex CLI</span>
				</div>
				<button
					class="install-button secondary"
					onclick={() => copyToClipboard('codex mcp add loom --command "npx @create-something/loom"', (v) => copiedCodex = v)}
				>
					{copiedCodex ? 'Copied!' : 'Copy command'}
				</button>
				<code class="card-code">codex mcp add loom</code>
			</div>

			<!-- npm (fallback) -->
			<div class="install-card npm">
				<div class="card-header">
					<span class="card-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<rect x="2" y="2" width="20" height="20" fill="currentColor"/>
							<path d="M5 19V5H11V17H14V5H19V19H5Z" fill="var(--color-bg-pure)"/>
						</svg>
					</span>
					<span class="card-name">npm (any tool)</span>
				</div>
				<button
					class="install-button secondary"
					onclick={() => copyToClipboard('npm install -g @create-something/loom', (v) => copiedNpm = v)}
				>
					{copiedNpm ? 'Copied!' : 'Copy command'}
				</button>
				<code class="card-code">npm install -g @create-something/loom</code>
			</div>
		</div>
	</section>

	<!-- How It Works -->
	<section class="how-section">
		<h2 class="section-title">How it works</h2>

		<div class="how-grid">
			<div class="how-step">
				<span class="step-number">1</span>
				<h3 class="step-title">Create task</h3>
				<p class="step-description">Run loom_work to create and claim a task atomically</p>
			</div>
			<div class="how-step">
				<span class="step-number">2</span>
				<h3 class="step-title">Route to agent</h3>
				<p class="step-description">Smart routing picks the best, cheapest, or fastest agent</p>
			</div>
			<div class="how-step">
				<span class="step-number">3</span>
				<h3 class="step-title">Checkpoint & complete</h3>
				<p class="step-description">Save progress at any point. Recover from crashes.</p>
			</div>
		</div>

		<div class="code-example">
			<pre><code><span class="comment"># Start working (create + claim in one call)</span>
<span class="command">loom work</span> <span class="string">"Fix authentication bug"</span> --agent claude-code

<span class="comment"># Save progress (crash recovery point)</span>
<span class="command">loom checkpoint</span> <span class="string">"JWT validation implemented"</span>

<span class="comment"># Get routing recommendation</span>
<span class="command">loom route</span> lm-abc --strategy cheapest
<span class="success">→ Route to: gemini (score: 0.85, cost: $0.001/1k)</span>

<span class="comment"># Complete with evidence</span>
<span class="command">loom complete</span> lm-abc --evidence <span class="string">"commit abc123"</span></code></pre>
		</div>
	</section>

	<!-- Comparison Table -->
	<section class="comparison-section">
		<h2 class="section-title">Why Loom?</h2>
		<p class="section-subtitle">Built for multi-agent workflows</p>

		<div class="comparison-table-wrapper">
			<table class="comparison-table">
				<thead>
					<tr>
						<th>Feature</th>
						<th>Beads</th>
						<th>Gas Town</th>
						<th class="highlight">Loom</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Multi-agent coordination</td>
						<td class="no">No</td>
						<td class="no">No</td>
						<td class="yes">Yes</td>
					</tr>
					<tr>
						<td>Smart routing</td>
						<td class="no">No</td>
						<td class="partial">Basic</td>
						<td class="yes">Yes</td>
					</tr>
					<tr>
						<td>Session memory</td>
						<td class="no">No</td>
						<td class="yes">Yes</td>
						<td class="yes">Yes</td>
					</tr>
					<tr>
						<td>Crash recovery</td>
						<td class="no">No</td>
						<td class="yes">Yes</td>
						<td class="yes">Yes</td>
					</tr>
					<tr>
						<td>Git sync</td>
						<td class="yes">Yes</td>
						<td class="no">No</td>
						<td class="yes">Yes</td>
					</tr>
					<tr>
						<td>Ground integration</td>
						<td class="no">No</td>
						<td class="no">No</td>
						<td class="yes">Yes</td>
					</tr>
					<tr>
						<td>Cost optimization</td>
						<td class="no">No</td>
						<td class="no">No</td>
						<td class="yes">Yes</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<!-- Tools Section -->
	<section class="tools-section">
		<h2 class="section-title">Available tools</h2>
		<p class="section-subtitle">30+ MCP tools for multi-agent coordination</p>

		<div class="tools-grid">
			<div class="tool-category">
				<h3 class="category-title">Task Management</h3>
				<ul class="tool-list">
					<li><code>loom_work</code> — Quick start: create + claim atomically</li>
					<li><code>loom_create</code> — Create task for multi-agent coordination</li>
					<li><code>loom_claim</code>, <code>loom_complete</code>, <code>loom_cancel</code></li>
					<li><code>loom_spawn</code> — Create sub-tasks under a parent</li>
					<li><code>loom_ready</code>, <code>loom_mine</code>, <code>loom_blocked</code></li>
				</ul>
			</div>

			<div class="tool-category">
				<h3 class="category-title">Smart Routing</h3>
				<ul class="tool-list">
					<li><code>loom_route</code> — Get agent recommendation (best/cheapest/fastest)</li>
					<li><code>loom_agents</code> — List all configured agents</li>
					<li><code>loom_analytics</code> — Execution analytics and history</li>
					<li><code>loom_record_execution</code> — Learn from past executions</li>
				</ul>
			</div>

			<div class="tool-category">
				<h3 class="category-title">Sessions & Memory</h3>
				<ul class="tool-list">
					<li><code>loom_session_start</code>, <code>loom_session_end</code></li>
					<li><code>loom_checkpoint</code> — Save progress for crash recovery</li>
					<li><code>loom_recover</code>, <code>loom_resume</code> — Resume from any point</li>
					<li><code>loom_get_resume_brief</code> — Generate context for continuity</li>
					<li><code>loom_update_context</code> — Track files, decisions, test state</li>
				</ul>
			</div>

			<div class="tool-category">
				<h3 class="category-title">Formulas & Planning</h3>
				<ul class="tool-list">
					<li><code>loom_formulas</code> — List available workflow templates</li>
					<li><code>loom_formula</code> — Get formula details</li>
					<li><code>loom_discuss</code> — Capture preferences before planning</li>
					<li><code>loom_verify_plan</code> — Validate plans before execution</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Case Study -->
	<section class="case-study-section">
		<div class="case-study-card">
			<span class="case-study-label">Key Feature</span>
			<h3 class="case-study-title">Arlington Economics</h3>
			<p class="case-study-description">
				Route tasks to the cheapest capable agent. Claude for architecture, Gemini Flash for mechanical tasks.
				Loom tracks capabilities and costs to make intelligent routing decisions automatically.
			</p>
			<div class="case-study-stats">
				<div class="stat">
					<span class="stat-value">5+</span>
					<span class="stat-label">agent backends</span>
				</div>
				<div class="stat">
					<span class="stat-value">3</span>
					<span class="stat-label">routing strategies</span>
				</div>
				<div class="stat">
					<span class="stat-value">30+</span>
					<span class="stat-label">MCP tools</span>
				</div>
			</div>
			<a href="https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/loom" class="case-study-link">
				Read the documentation →
			</a>
		</div>
	</section>

	<!-- Links -->
	<section class="links-section">
		<div class="links-grid">
			<a href="https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/loom" class="link-card">
				<span class="link-icon">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M12 2C6.477 2 2 6.477 2 12C2 16.419 4.865 20.166 8.839 21.489C9.339 21.581 9.521 21.273 9.521 21.007C9.521 20.769 9.513 20.14 9.508 19.305C6.726 19.907 6.139 17.962 6.139 17.962C5.685 16.812 5.029 16.504 5.029 16.504C4.121 15.881 5.098 15.894 5.098 15.894C6.102 15.964 6.629 16.926 6.629 16.926C7.521 18.455 8.97 18.013 9.539 17.756C9.631 17.11 9.889 16.669 10.175 16.42C7.954 16.168 5.62 15.31 5.62 11.477C5.62 10.386 6.01 9.494 6.649 8.794C6.546 8.542 6.203 7.524 6.747 6.148C6.747 6.148 7.587 5.88 9.497 7.173C10.295 6.95 11.15 6.839 12 6.835C12.85 6.839 13.705 6.95 14.505 7.173C16.413 5.88 17.251 6.148 17.251 6.148C17.797 7.524 17.453 8.542 17.351 8.794C17.991 9.494 18.379 10.386 18.379 11.477C18.379 15.32 16.042 16.165 13.813 16.412C14.172 16.72 14.492 17.329 14.492 18.263C14.492 19.6 14.48 20.679 14.48 21.007C14.48 21.275 14.66 21.586 15.168 21.488C19.138 20.163 22 16.418 22 12C22 6.477 17.523 2 12 2Z" fill="currentColor"/>
					</svg>
				</span>
				<span class="link-text">GitHub</span>
			</a>
			<a href="https://www.npmjs.com/package/@create-something/loom" class="link-card">
				<span class="link-icon">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<rect x="2" y="2" width="20" height="20" fill="currentColor"/>
						<path d="M5 19V5H11V17H14V5H19V19H5Z" fill="var(--color-bg-surface)"/>
					</svg>
				</span>
				<span class="link-text">npm</span>
			</a>
			<a href="/products/ground" class="link-card">
				<span class="link-icon">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
						<path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
					</svg>
				</span>
				<span class="link-text">Ground MCP</span>
			</a>
			<a href="/products/triad-audit-template" class="link-card">
				<span class="link-icon">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M9 11L12 14L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</span>
				<span class="link-text">Triad Audit Template</span>
			</a>
		</div>
	</section>
</main>

<style>
	.loom-page {
		max-width: 900px;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-lg);
	}

	/* Hero */
	.hero {
		text-align: center;
		padding: var(--space-2xl) 0;
	}

	.hero-badge {
		display: inline-block;
		padding: 0.25rem 1rem;
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-success);
		background: var(--color-success-muted);
		border-radius: var(--radius-full);
		margin-bottom: var(--space-md);
	}

	.hero-title {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.hero-tagline {
		font-size: var(--text-h3);
		color: var(--color-fg-muted);
		font-style: italic;
		margin-bottom: var(--space-lg);
	}

	.hero-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		line-height: 1.7;
		max-width: 600px;
		margin: 0 auto;
	}

	.hero-description strong {
		color: var(--color-fg-secondary);
	}

	/* Section Styles */
	.section-title {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		text-align: center;
		margin-bottom: var(--space-xs);
	}

	.section-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		text-align: center;
		margin-bottom: var(--space-lg);
	}

	/* Install Section */
	.install-section {
		padding: var(--space-2xl) 0;
		border-top: 1px solid var(--color-border-default);
	}

	.install-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: var(--space-md);
	}

	.install-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.install-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.card-icon {
		color: var(--color-fg-muted);
	}

	.card-name {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		flex-grow: 1;
	}

	.card-badge {
		font-size: var(--text-caption);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-full);
	}

	.card-badge.one-click {
		color: var(--color-success);
		background: var(--color-success-muted);
	}

	.install-button {
		display: block;
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		text-align: center;
		border-radius: var(--radius-md);
		border: none;
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.install-button:hover {
		opacity: 0.9;
	}

	.install-button.primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.install-button.secondary {
		background: var(--color-bg-subtle);
		color: var(--color-fg-secondary);
	}

	.card-code {
		font-family: monospace;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-subtle);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		overflow-x: auto;
	}

	.card-note {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* How Section */
	.how-section {
		padding: var(--space-2xl) 0;
		border-top: 1px solid var(--color-border-default);
	}

	.how-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.how-step {
		text-align: center;
	}

	.step-number {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		font-size: var(--text-body);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		margin-bottom: var(--space-sm);
	}

	.step-title {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.step-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.code-example {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		overflow-x: auto;
	}

	.code-example pre {
		margin: 0;
		font-family: monospace;
		font-size: var(--text-body-sm);
		line-height: 1.6;
	}

	.code-example .comment {
		color: var(--color-fg-muted);
	}

	.code-example .command {
		color: var(--color-success);
		font-weight: var(--font-semibold);
	}

	.code-example .string {
		color: var(--color-warning);
	}

	.code-example .success {
		color: var(--color-success);
	}

	/* Comparison Section */
	.comparison-section {
		padding: var(--space-2xl) 0;
		border-top: 1px solid var(--color-border-default);
	}

	.comparison-table-wrapper {
		overflow-x: auto;
	}

	.comparison-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-body-sm);
	}

	.comparison-table th,
	.comparison-table td {
		padding: var(--space-sm) var(--space-md);
		text-align: left;
		border-bottom: 1px solid var(--color-border-default);
	}

	.comparison-table th {
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		background: var(--color-bg-subtle);
	}

	.comparison-table th.highlight {
		color: var(--color-success);
		background: var(--color-success-muted);
	}

	.comparison-table td {
		color: var(--color-fg-tertiary);
	}

	.comparison-table td.yes {
		color: var(--color-success);
		font-weight: var(--font-semibold);
	}

	.comparison-table td.no {
		color: var(--color-fg-muted);
	}

	.comparison-table td.partial {
		color: var(--color-warning);
	}

	/* Tools Section */
	.tools-section {
		padding: var(--space-2xl) 0;
		border-top: 1px solid var(--color-border-default);
	}

	.tools-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-lg);
	}

	.tool-category {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.category-title {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.tool-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.tool-list li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.tool-list code {
		font-family: monospace;
		color: var(--color-fg-secondary);
		background: var(--color-bg-subtle);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
	}

	/* Case Study */
	.case-study-section {
		padding: var(--space-2xl) 0;
		border-top: 1px solid var(--color-border-default);
	}

	.case-study-card {
		text-align: center;
		padding: var(--space-xl);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.case-study-label {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-fg-muted);
	}

	.case-study-title {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin: var(--space-sm) 0;
	}

	.case-study-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		max-width: 600px;
		margin: 0 auto var(--space-lg);
	}

	.case-study-stats {
		display: flex;
		justify-content: center;
		gap: var(--space-xl);
		margin-bottom: var(--space-lg);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat-value {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	.stat-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.case-study-link {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.case-study-link:hover {
		color: var(--color-fg-primary);
	}

	/* Links Section */
	.links-section {
		padding: var(--space-xl) 0;
		border-top: 1px solid var(--color-border-default);
	}

	.links-grid {
		display: flex;
		justify-content: center;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.link-card {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.link-card:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.link-icon {
		display: flex;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero-title {
			font-size: var(--text-h1);
		}

		.how-grid {
			grid-template-columns: 1fr;
		}

		.tools-grid {
			grid-template-columns: 1fr;
		}

		.case-study-stats {
			flex-direction: column;
			gap: var(--space-md);
		}

		.comparison-table {
			font-size: var(--text-caption);
		}

		.comparison-table th,
		.comparison-table td {
			padding: var(--space-xs) var(--space-sm);
		}
	}
</style>
