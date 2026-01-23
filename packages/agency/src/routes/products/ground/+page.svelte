<script lang="ts">
	import type { PageData } from './$types';
	import { SEO } from '@create-something/components';

	let { data }: { data: PageData } = $props();
	const { product } = data;

	// Cursor deep link - base64 encoded config for npx @createsomething/ground-mcp
	const cursorDeepLink = 'cursor://anysphere.cursor-deeplink/mcp/install?name=ground&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJAY3JlYXRlc29tZXRoaW5nL2dyb3VuZC1tY3AiXX0%3D';

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
	title="Ground MCP | Grounded AI Code Analysis"
	description="Stop AI hallucination in code analysis. An MCP server that requires verification before claims. Find duplicates, dead code, and orphans with evidence."
	keywords="MCP, Model Context Protocol, AI code analysis, duplicate detection, dead code, Claude, Cursor, VS Code, Copilot"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<main class="ground-page">
	<!-- Hero Section -->
	<section class="hero">
		<div class="hero-badge">Free & Open Source</div>
		<h1 class="hero-title">Ground</h1>
		<p class="hero-tagline">Code analysis that checks before it claims</p>
		<p class="hero-description">
			AI assistants will tell you files are "95% similar" without actually comparing them.
			Ground fixes this. It requires your AI to <strong>verify before claiming</strong>—no more hallucinated duplicates or false positives.
		</p>
	</section>

	<!-- Install Section -->
	<section class="install-section">
		<h2 class="section-title">Install in 2 minutes</h2>
		<p class="section-subtitle">One-click for your AI tool of choice</p>

		<!-- Featured: One-click install (Tufte: primary action gets visual prominence) -->
		<div class="install-featured">
			<div class="install-card featured">
				<div class="card-header">
					<span class="card-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z" fill="currentColor"/>
						</svg>
					</span>
					<span class="card-name">Cursor</span>
					<span class="card-badge">One-click</span>
				</div>
				<a href={cursorDeepLink} class="install-button primary">
					Install in Cursor
				</a>
				<p class="card-note">Opens Cursor with install prompt</p>
			</div>
		</div>

		<!-- Secondary options: Small multiples with consistent structure -->
		<div class="install-grid">
			<!-- Claude Desktop -->
			<div class="install-card">
				<div class="card-header">
					<span class="card-icon">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M12 3L13.5 8.5L19 7L14.5 11L19 15L13.5 13.5L12 19L10.5 13.5L5 15L9.5 11L5 7L10.5 8.5L12 3Z" fill="currentColor"/>
						</svg>
					</span>
					<span class="card-name">Claude Desktop</span>
				</div>
				<button
					class="install-button secondary"
					onclick={() => copyToClipboard('npx --yes -p @createsomething/ground-mcp ground-mcp', (v) => copiedClaude = v)}
				>
					{copiedClaude ? 'Copied!' : 'Copy command'}
				</button>
				<p class="card-note">Add to claude_desktop_config.json</p>
			</div>

			<!-- Windsurf -->
			<div class="install-card">
				<div class="card-header">
					<span class="card-icon">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M3 12C3 12 5 8 9 8C13 8 12 12 16 12C20 12 21 9 21 9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
							<path d="M3 17C3 17 5 13 9 13C13 13 12 17 16 17C20 17 21 14 21 14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
						</svg>
					</span>
					<span class="card-name">Windsurf</span>
				</div>
				<button
					class="install-button secondary"
					onclick={() => copyToClipboard('{"mcpServers":{"ground":{"command":"npx","args":["@createsomething/ground-mcp"]}}}', (v) => copiedWindsurf = v)}
				>
					{copiedWindsurf ? 'Copied!' : 'Copy config'}
				</button>
				<p class="card-note">Settings → MCP → View raw config</p>
			</div>

			<!-- VS Code + Copilot -->
			<div class="install-card">
				<div class="card-header">
					<span class="card-icon">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M17 2L7 11L17 20L19 18.5V3.5L17 2Z" fill="currentColor"/>
							<path d="M7 11L2 8V14L7 11Z" fill="currentColor" opacity="0.7"/>
							<path d="M17 2L7 11L2 8L17 2Z" fill="currentColor" opacity="0.85"/>
							<path d="M17 20L7 11L2 14L17 20Z" fill="currentColor" opacity="0.85"/>
						</svg>
					</span>
					<span class="card-name">VS Code</span>
				</div>
				<a href="vscode:extension/GitHub.copilot" class="install-button secondary">
					Open Extensions
				</a>
				<p class="card-note">MCP Server → search "ground"</p>
			</div>

			<!-- Codex CLI -->
			<div class="install-card">
				<div class="card-header">
					<span class="card-icon">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<rect x="2" y="4" width="20" height="16" rx="2" fill="currentColor" opacity="0.15"/>
							<rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
							<path d="M6 9L10 12L6 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M12 15H18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
						</svg>
					</span>
					<span class="card-name">Codex CLI</span>
				</div>
				<button
					class="install-button secondary"
					onclick={() => copyToClipboard('codex mcp add ground --command "npx @createsomething/ground-mcp"', (v) => copiedCodex = v)}
				>
					{copiedCodex ? 'Copied!' : 'Copy command'}
				</button>
				<p class="card-note">codex mcp add ground</p>
			</div>

			<!-- npm (fallback) -->
			<div class="install-card">
				<div class="card-header">
					<span class="card-icon">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<rect x="2" y="6" width="20" height="12" rx="1" fill="currentColor"/>
							<path d="M5 15V9H8V14H9.5V9H11V15H5Z" fill="var(--color-bg-surface)"/>
							<path d="M12.5 9V15H15.5V10.5H17V15H19V9H12.5Z" fill="var(--color-bg-surface)"/>
						</svg>
					</span>
					<span class="card-name">npm</span>
				</div>
				<button
					class="install-button secondary"
					onclick={() => copyToClipboard('npm install -g @createsomething/ground-mcp', (v) => copiedNpm = v)}
				>
					{copiedNpm ? 'Copied!' : 'Copy command'}
				</button>
				<p class="card-note">Works with any MCP client</p>
			</div>
		</div>
	</section>

	<!-- How It Works -->
	<section class="how-section">
		<h2 class="section-title">How it works</h2>

		<div class="how-grid">
			<div class="how-step">
				<span class="step-number">1</span>
				<h3 class="step-title">Check first</h3>
				<p class="step-description">Your AI runs a verification command to actually compare files or count uses</p>
			</div>
			<div class="how-step">
				<span class="step-number">2</span>
				<h3 class="step-title">Then claim</h3>
				<p class="step-description">Only after checking can it report something as a duplicate, dead code, or orphan</p>
			</div>
			<div class="how-step">
				<span class="step-number">3</span>
				<h3 class="step-title">Blocked otherwise</h3>
				<p class="step-description">If it tries to claim without checking first, Ground stops it</p>
			</div>
		</div>

		<div class="code-example">
			<pre><code><span class="comment"># First, compare the files</span>
<span class="command">ground compare</span> utils.ts helpers.ts

<span class="comment"># Then, make a claim (only works if you've compared)</span>
<span class="command">ground claim duplicate</span> utils.ts helpers.ts <span class="string">"same validation logic"</span>

<span class="comment"># Try to claim without checking? Blocked.</span>
<span class="error">✗ Claim blocked</span>
<span class="error-detail">  You need to compare these files first:</span>
<span class="error-detail">  ground compare utils.ts helpers.ts</span></code></pre>
		</div>
	</section>

	<!-- Tools Section -->
	<section class="tools-section">
		<h2 class="section-title">What you can do</h2>
		<p class="section-subtitle">20+ tools for finding real problems in your code</p>

		<div class="tools-grid">
			<div class="tool-category">
				<h3 class="category-title">Verify</h3>
				<ul class="tool-list">
					<li><code>ground_compare</code> — See how similar two files actually are</li>
					<li><code>ground_count_uses</code> — Find if a function is actually used anywhere</li>
					<li><code>ground_check_connections</code> — See if a module is connected to your app</li>
					<li><code>ground_check_environment</code> — Catch Node.js APIs leaking into Workers</li>
				</ul>
			</div>

			<div class="tool-category">
				<h3 class="category-title">Find problems</h3>
				<ul class="tool-list">
					<li><code>ground_find_duplicate_functions</code> — Find copy-pasted code</li>
					<li><code>ground_find_orphans</code> — Find files nothing imports</li>
					<li><code>ground_find_dead_exports</code> — Find exports nobody uses</li>
					<li><code>ground_find_drift</code> — Find where code drifted from your design system</li>
				</ul>
			</div>

			<div class="tool-category">
				<h3 class="category-title">Understand patterns</h3>
				<ul class="tool-list">
					<li><code>ground_adoption_ratio</code> — See how consistently you use your tokens</li>
					<li><code>ground_suggest_pattern</code> — Get suggestions based on your existing code</li>
					<li><code>ground_mine_patterns</code> — Discover patterns you're already using</li>
				</ul>
			</div>

			<div class="tool-category">
				<h3 class="category-title">Report findings</h3>
				<ul class="tool-list">
					<li><code>ground_claim_duplicate</code> — Report a duplicate (requires verification first)</li>
					<li><code>ground_claim_dead_code</code> — Report dead code (requires verification first)</li>
					<li><code>ground_claim_orphan</code> — Report an orphan (requires verification first)</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Case Study -->
	<section class="case-study-section">
		<div class="case-study-card">
			<span class="case-study-label">Case Study</span>
			<h3 class="case-study-title">Kickstand: 155 scripts became 13</h3>
			<p class="case-study-description">
				We used Ground to find and consolidate duplicate code in a production codebase.
				Because every finding was verified, we had zero false positives—every deletion was safe.
			</p>
			<div class="case-study-stats">
				<div class="stat">
					<span class="stat-value">92%</span>
					<span class="stat-label">code reduction</span>
				</div>
				<div class="stat">
					<span class="stat-value">0</span>
					<span class="stat-label">false positives</span>
				</div>
				<div class="stat">
					<span class="stat-value">155→13</span>
					<span class="stat-label">scripts</span>
				</div>
			</div>
			<a href="https://createsomething.io/papers/kickstand-triad-audit" class="case-study-link">
				Read the full case study →
			</a>
		</div>
	</section>

	<!-- Links -->
	<section class="links-section">
		<div class="links-grid">
			<a href="https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/ground" class="link-card">
				<span class="link-icon">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M12 2C6.477 2 2 6.477 2 12C2 16.419 4.865 20.166 8.839 21.489C9.339 21.581 9.521 21.273 9.521 21.007C9.521 20.769 9.513 20.14 9.508 19.305C6.726 19.907 6.139 17.962 6.139 17.962C5.685 16.812 5.029 16.504 5.029 16.504C4.121 15.881 5.098 15.894 5.098 15.894C6.102 15.964 6.629 16.926 6.629 16.926C7.521 18.455 8.97 18.013 9.539 17.756C9.631 17.11 9.889 16.669 10.175 16.42C7.954 16.168 5.62 15.31 5.62 11.477C5.62 10.386 6.01 9.494 6.649 8.794C6.546 8.542 6.203 7.524 6.747 6.148C6.747 6.148 7.587 5.88 9.497 7.173C10.295 6.95 11.15 6.839 12 6.835C12.85 6.839 13.705 6.95 14.505 7.173C16.413 5.88 17.251 6.148 17.251 6.148C17.797 7.524 17.453 8.542 17.351 8.794C17.991 9.494 18.379 10.386 18.379 11.477C18.379 15.32 16.042 16.165 13.813 16.412C14.172 16.72 14.492 17.329 14.492 18.263C14.492 19.6 14.48 20.679 14.48 21.007C14.48 21.275 14.66 21.586 15.168 21.488C19.138 20.163 22 16.418 22 12C22 6.477 17.523 2 12 2Z" fill="currentColor"/>
					</svg>
				</span>
				<span class="link-text">GitHub</span>
			</a>
			<a href="https://www.npmjs.com/package/@createsomething/ground-mcp" class="link-card">
				<span class="link-icon">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<rect x="2" y="2" width="20" height="20" fill="currentColor"/>
						<path d="M5 19V5H11V17H14V5H19V19H5Z" fill="var(--color-bg-surface)"/>
					</svg>
				</span>
				<span class="link-text">npm</span>
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
	.ground-page {
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

	/* Install Section - Tufte: Clear hierarchy, Golden Ratio proportions */
	.install-section {
		padding: var(--space-2xl) 0;
		border-top: 1px solid var(--color-border-default);
	}

	/* Featured card container - Golden Ratio: ~61.8% width centered */
	.install-featured {
		max-width: 380px; /* ~61.8% of 615px (typical card grid width) */
		margin: 0 auto var(--space-lg);
	}

	/* Featured card - elevated prominence for one-click action */
	.install-card.featured {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-lg);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.install-card.featured:hover {
		border-color: var(--color-border-strong);
	}

	.install-card.featured .card-badge {
		color: var(--color-success);
		background: var(--color-success-muted);
	}

	/* Secondary cards grid - Tufte small multiples: consistent structure */
	.install-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: var(--space-sm);
	}

	/* Secondary cards - uniform structure, reduced visual weight */
	.install-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.install-card:hover {
		border-color: var(--color-border-emphasis);
	}

	/* Card header - tighter spacing for secondary cards */
	.card-header {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-xs);
	}

	.card-icon {
		color: var(--color-fg-muted);
		flex-shrink: 0;
	}

	.card-name {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		flex-grow: 1;
		white-space: nowrap;
	}

	/* Featured card uses larger name */
	.install-card.featured .card-name {
		font-size: var(--text-body);
	}

	.card-badge {
		font-size: var(--text-caption);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-full);
	}

	/* Buttons - consistent across all cards */
	.install-button {
		display: block;
		width: 100%;
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-align: center;
		border-radius: var(--radius-sm);
		border: none;
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.install-card.featured .install-button {
		padding: var(--space-sm) var(--space-md);
		font-size: var(--text-body-sm);
		border-radius: var(--radius-md);
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

	/* Card note - Tufte: minimal ink, maximum information */
	.card-note {
		font-size: 0.6875rem; /* 11px - smaller for secondary info */
		color: var(--color-fg-muted);
		line-height: 1.3;
	}

	.install-card.featured .card-note {
		font-size: var(--text-caption);
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

	.code-example .error {
		color: var(--color-error);
	}

	.code-example .error-detail {
		color: var(--color-fg-muted);
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
	@media (max-width: 900px) {
		/* 5 cards → 3+2 layout */
		.install-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (max-width: 768px) {
		.hero-title {
			font-size: var(--text-h1);
		}

		/* 5 cards → 2+2+1 layout */
		.install-grid {
			grid-template-columns: repeat(2, 1fr);
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
	}

	@media (max-width: 480px) {
		/* Stack all cards on small screens */
		.install-grid {
			grid-template-columns: 1fr;
		}

		.install-featured {
			max-width: 100%;
		}
	}
</style>
