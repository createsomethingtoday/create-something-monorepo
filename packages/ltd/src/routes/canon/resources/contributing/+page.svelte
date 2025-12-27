<script lang="ts">
	/**
	 * Contributing Guide
	 *
	 * How to contribute to the Canon Design System.
	 */
</script>

<svelte:head>
	<title>Contributing – Canon Design System</title>
	<meta name="description" content="How to contribute to the Canon Design System" />
</svelte:head>

<div class="page">
	<header class="page-header">
		<span class="category">Resources</span>
		<h1>Contributing</h1>
		<p class="lead">
			Canon is built by CREATE SOMETHING. Contributions follow the Subtractive
			Triad: remove excess, reveal clarity, serve the whole.
		</p>
	</header>

	<section class="section">
		<h2>Philosophy</h2>
		<p>
			Before contributing, understand the principles that guide Canon:
		</p>

		<div class="principle-grid">
			<div class="principle">
				<h3>DRY (Implementation)</h3>
				<p>"Have I built this before?" Unify. No duplicate patterns.</p>
			</div>
			<div class="principle">
				<h3>Rams (Artifact)</h3>
				<p>"Does this earn its existence?" Remove. Less, but better.</p>
			</div>
			<div class="principle">
				<h3>Heidegger (System)</h3>
				<p>"Does this serve the whole?" Reconnect. Parts inform whole.</p>
			</div>
		</div>
	</section>

	<section class="section">
		<h2>Getting Started</h2>

		<h3>1. Clone the Repository</h3>
		<div class="code-block">
			<pre><code>{`git clone https://github.com/createsomethingtoday/create-something-monorepo.git
cd create-something-monorepo
pnpm install`}</code></pre>
		</div>

		<h3>2. Run the Dev Server</h3>
		<div class="code-block">
			<pre><code>pnpm dev --filter=components</code></pre>
		</div>

		<h3>3. Run Type Checks</h3>
		<div class="code-block">
			<pre><code>pnpm --filter=components check</code></pre>
		</div>
	</section>

	<section class="section">
		<h2>Adding a Component</h2>

		<ol class="numbered-list">
			<li>
				<strong>Check if it exists</strong> — Search existing components. Don't duplicate.
			</li>
			<li>
				<strong>Question necessity</strong> — Does this component earn its existence?
				Can a pattern or composition of existing components work instead?
			</li>
			<li>
				<strong>Create the component</strong> — Follow the file structure below.
			</li>
			<li>
				<strong>Document it</strong> — Add a documentation page in <code>/canon/components/</code>.
			</li>
			<li>
				<strong>Export it</strong> — Add to the appropriate index.ts.
			</li>
		</ol>

		<h3>File Structure</h3>
		<div class="code-block">
			<pre><code>{`packages/components/src/lib/components/
├── Button/
│   ├── Button.svelte      # Component file
│   └── index.ts           # Re-export
├── TextField/
│   ├── TextField.svelte
│   └── index.ts
└── index.ts               # Package exports`}</code></pre>
		</div>

		<h3>Component Template</h3>
		<div class="code-block">
			<pre><code>{`<script lang="ts">
  /**
   * ComponentName
   *
   * Brief description of what this component does.
   *
   * Canon Principle: Which principle does this embody?
   */

  interface Props {
    /** Prop description */
    label: string;
    /** Optional prop */
    variant?: 'primary' | 'secondary';
  }

  let {
    label,
    variant = 'primary'
  }: Props = $props();
</script>

<element class="component component--{variant}">
  {label}
</element>

<style>
  .component {
    /* Use Canon tokens */
    padding: var(--space-sm);
    color: var(--color-fg-primary);
  }
</style>`}</code></pre>
		</div>
	</section>

	<section class="section">
		<h2>Modifying Tokens</h2>
		<p>
			Tokens are the foundation. Changes cascade everywhere.
		</p>

		<div class="warning">
			<strong>Warning:</strong> Token changes affect all properties (.io, .space, .agency, .ltd).
			Ensure changes are intentional and documented.
		</div>

		<h3>Token Source</h3>
		<p>Edit tokens in:</p>
		<div class="code-block">
			<pre><code>packages/components/src/lib/styles/tokens.css</code></pre>
		</div>

		<h3>Regenerate Exports</h3>
		<p>After editing tokens, regenerate derived formats:</p>
		<div class="code-block">
			<pre><code>pnpm --filter=components tokens:export</code></pre>
		</div>

		<p>This generates:</p>
		<ul class="guidelines-list">
			<li><code>tokens.scss</code> — SCSS variables</li>
			<li><code>tokens.dtcg.json</code> — W3C Design Token format</li>
			<li><code>tokens.figma.json</code> — Tokens Studio format</li>
			<li><code>canon.json</code> — Structured JSON</li>
		</ul>
	</section>

	<section class="section">
		<h2>Code Standards</h2>

		<h3>TypeScript</h3>
		<ul class="guidelines-list">
			<li>All components use TypeScript</li>
			<li>Define explicit <code>Props</code> interface</li>
			<li>Document props with JSDoc comments</li>
			<li>Use Svelte 5 runes (<code>$props</code>, <code>$state</code>, <code>$derived</code>)</li>
		</ul>

		<h3>CSS</h3>
		<ul class="guidelines-list">
			<li>Use Canon tokens for all values (colors, spacing, typography)</li>
			<li>No hardcoded colors or pixel values</li>
			<li>Tailwind for structure, Canon for aesthetics</li>
			<li>Include <code>:focus-visible</code> styles for interactives</li>
		</ul>

		<h3>Accessibility</h3>
		<ul class="guidelines-list">
			<li>WCAG 2.1 AA compliance required</li>
			<li>Keyboard navigation must work</li>
			<li>Screen reader tested</li>
			<li>Include <code>prefers-reduced-motion</code> support</li>
		</ul>
	</section>

	<section class="section">
		<h2>Commit Messages</h2>
		<p>Follow conventional commits format:</p>

		<div class="code-block">
			<pre><code>{`feat(components): add Tooltip component
fix(tokens): correct spacing token values
docs(canon): add Button documentation
refactor(components): simplify Card props`}</code></pre>
		</div>

		<table class="spec-table">
			<thead>
				<tr>
					<th>Type</th>
					<th>Use</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td><code>feat</code></td>
					<td>New feature</td>
				</tr>
				<tr>
					<td><code>fix</code></td>
					<td>Bug fix</td>
				</tr>
				<tr>
					<td><code>docs</code></td>
					<td>Documentation</td>
				</tr>
				<tr>
					<td><code>refactor</code></td>
					<td>Code restructure</td>
				</tr>
				<tr>
					<td><code>style</code></td>
					<td>Formatting only</td>
				</tr>
				<tr>
					<td><code>test</code></td>
					<td>Tests</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section class="section">
		<h2>Pull Request Process</h2>

		<ol class="numbered-list">
			<li><strong>Create a branch</strong> from <code>main</code></li>
			<li><strong>Make changes</strong> following the guidelines above</li>
			<li><strong>Run checks</strong> — <code>pnpm check</code> and <code>pnpm build</code></li>
			<li><strong>Create PR</strong> with clear description</li>
			<li><strong>Address feedback</strong> from review</li>
		</ol>

		<h3>PR Checklist</h3>
		<div class="checklist">
			<ul>
				<li>Type checks pass</li>
				<li>Build succeeds</li>
				<li>Documentation updated</li>
				<li>Exports added to index.ts</li>
				<li>Accessibility tested</li>
				<li>Canon tokens used (no hardcoded values)</li>
			</ul>
		</div>
	</section>
</div>

<style>
	.page {
		max-width: 800px;
	}

	.page-header {
		margin-bottom: var(--space-xl);
	}

	.category {
		display: inline-block;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-xs);
	}

	h1 {
		font-size: var(--text-display);
		font-weight: 300;
		margin: 0 0 var(--space-md);
		color: var(--color-fg-primary);
	}

	.lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0;
	}

	.section {
		margin-bottom: var(--space-xl);
		padding-bottom: var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.section:last-child {
		border-bottom: none;
	}

	h2 {
		font-size: var(--text-h2);
		font-weight: 500;
		margin: 0 0 var(--space-md);
		color: var(--color-fg-primary);
	}

	h3 {
		font-size: var(--text-h3);
		font-weight: 500;
		margin: var(--space-lg) 0 var(--space-sm);
		color: var(--color-fg-primary);
	}

	p {
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin: 0 0 var(--space-md);
	}

	code {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.875em;
		background: var(--color-bg-subtle);
		padding: 0.125em 0.375em;
		border-radius: var(--radius-sm);
		color: var(--color-fg-primary);
	}

	/* Principle grid */
	.principle-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
		margin: var(--space-md) 0;
	}

	.principle {
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-lg);
	}

	.principle h3 {
		margin: 0 0 var(--space-xs);
		font-size: var(--text-body);
	}

	.principle p {
		margin: 0;
		font-size: var(--text-body-sm);
	}

	/* Code block */
	.code-block {
		margin: var(--space-md) 0;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.code-block pre {
		margin: 0;
		padding: var(--space-md);
		overflow-x: auto;
	}

	.code-block code {
		background: none;
		padding: 0;
		font-size: var(--text-body-sm);
		line-height: 1.6;
		color: var(--color-fg-secondary);
	}

	/* Warning box */
	.warning {
		padding: var(--space-md);
		background: var(--color-warning-muted);
		border-left: 3px solid var(--color-warning);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		margin: var(--space-md) 0;
	}

	.warning strong {
		color: var(--color-fg-primary);
	}

	/* Numbered list */
	.numbered-list {
		margin: var(--space-md) 0;
		padding-left: var(--space-lg);
	}

	.numbered-list li {
		margin-bottom: var(--space-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.numbered-list strong {
		color: var(--color-fg-primary);
	}

	/* Guidelines list */
	.guidelines-list {
		margin: var(--space-sm) 0;
		padding-left: var(--space-lg);
	}

	.guidelines-list li {
		margin-bottom: var(--space-xs);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	/* Spec table */
	.spec-table {
		width: 100%;
		border-collapse: collapse;
		margin: var(--space-md) 0;
		font-size: var(--text-body-sm);
	}

	.spec-table th,
	.spec-table td {
		padding: var(--space-sm);
		text-align: left;
		border-bottom: 1px solid var(--color-border-default);
	}

	.spec-table th {
		color: var(--color-fg-muted);
		font-weight: 500;
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.spec-table td {
		color: var(--color-fg-secondary);
	}

	/* Checklist */
	.checklist {
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-lg);
	}

	.checklist ul {
		margin: 0;
		padding-left: var(--space-md);
		list-style: none;
	}

	.checklist li {
		position: relative;
		margin-bottom: var(--space-xs);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		line-height: 1.5;
	}

	.checklist li::before {
		content: '☐';
		position: absolute;
		left: calc(-1 * var(--space-md));
		color: var(--color-fg-muted);
	}
</style>
