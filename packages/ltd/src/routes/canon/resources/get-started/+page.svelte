<script lang="ts">
	/**
	 * Get Started Guide
	 *
	 * Quick start guide for using the Canon Design System.
	 */
</script>

<svelte:head>
	<title>Get Started – Canon Design System</title>
	<meta name="description" content="Quick start guide for the Canon Design System" />
</svelte:head>

<div class="page">
	<header class="page-header">
		<span class="category">Resources</span>
		<h1>Get Started</h1>
		<p class="lead">
			Start building with Canon in under 5 minutes. This guide covers installation,
			basic setup, and your first component.
		</p>
	</header>

	<section class="section">
		<h2>Installation</h2>
		<p>Install the Canon components package in your SvelteKit project.</p>

		<div class="code-block">
			<div class="code-header">Terminal</div>
			<pre><code>pnpm add @create-something/components</code></pre>
		</div>

		<div class="note">
			<strong>Requirements:</strong> SvelteKit 2.0+ and Svelte 5.0+
		</div>
	</section>

	<section class="section">
		<h2>Import Tokens</h2>
		<p>
			Import the Canon design tokens in your app's global CSS file.
			Choose the import that matches your needs.
		</p>

		<h3>Option 1: Full Canon (Recommended)</h3>
		<p>Includes tokens, base styles, and utility classes.</p>

		<div class="code-block">
			<div class="code-header">src/app.css</div>
			<pre><code>{`@import '@create-something/components/styles/canon.css';`}</code></pre>
		</div>

		<h3>Option 2: Tokens Only</h3>
		<p>Just the CSS custom properties, for custom theming.</p>

		<div class="code-block">
			<div class="code-header">src/app.css</div>
			<pre><code>{`@import '@create-something/components/styles/tokens.css';`}</code></pre>
		</div>

		<h3>Option 3: With Tailwind</h3>
		<p>For projects using Tailwind CSS alongside Canon.</p>

		<div class="code-block">
			<div class="code-header">src/app.css</div>
			<pre><code>{`@import '@create-something/components/styles/tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;`}</code></pre>
		</div>
	</section>

	<section class="section">
		<h2>Using Components</h2>
		<p>Import and use Canon components in your Svelte files.</p>

		<div class="code-block">
			<div class="code-header">+page.svelte</div>
			<pre><code>{`<script lang="ts">
  import { Button, TextField, Card } from '@create-something/components';

  let email = $state('');
</script>

<Card>
  <TextField
    label="Email"
    type="email"
    bind:value={email}
  />
  <Button>Subscribe</Button>
</Card>`}</code></pre>
		</div>
	</section>

	<section class="section">
		<h2>Using Tokens Directly</h2>
		<p>
			Canon tokens are CSS custom properties. Use them anywhere you write CSS.
		</p>

		<div class="code-block">
			<div class="code-header">Component.svelte</div>
			<pre><code>{`<div class="custom-box">
  Custom styled element
</div>

<style>
  .custom-box {
    padding: var(--space-md);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-lg);
    color: var(--color-fg-primary);
  }
</style>`}</code></pre>
		</div>

		<h3>Common Tokens</h3>
		<table class="spec-table">
			<thead>
				<tr>
					<th>Category</th>
					<th>Token</th>
					<th>Use</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Color</td>
					<td><code>--color-fg-primary</code></td>
					<td>Primary text</td>
				</tr>
				<tr>
					<td>Color</td>
					<td><code>--color-bg-subtle</code></td>
					<td>Card backgrounds</td>
				</tr>
				<tr>
					<td>Spacing</td>
					<td><code>--space-md</code></td>
					<td>Medium spacing (1.618rem)</td>
				</tr>
				<tr>
					<td>Radius</td>
					<td><code>--radius-lg</code></td>
					<td>Large border radius (12px)</td>
				</tr>
				<tr>
					<td>Typography</td>
					<td><code>--text-body</code></td>
					<td>Body text size (1rem)</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section class="section">
		<h2>Project Structure</h2>
		<p>Recommended structure for Canon-based projects.</p>

		<div class="code-block">
			<pre><code>{`src/
├── app.css           # Import canon.css here
├── app.html
├── routes/
│   ├── +layout.svelte
│   └── +page.svelte
└── lib/
    └── components/   # Your custom components`}</code></pre>
		</div>
	</section>

	<section class="section">
		<h2>What's Next?</h2>

		<div class="next-grid">
			<a href="/canon/foundations/colors" class="next-card">
				<h3>Colors</h3>
				<p>Explore the color token system</p>
			</a>
			<a href="/canon/foundations/typography" class="next-card">
				<h3>Typography</h3>
				<p>Learn the type scale</p>
			</a>
			<a href="/canon/components/button" class="next-card">
				<h3>Components</h3>
				<p>Browse all components</p>
			</a>
			<a href="/canon/resources/tokens" class="next-card">
				<h3>Token Reference</h3>
				<p>Complete token list</p>
			</a>
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

	/* Code block */
	.code-block {
		margin: var(--space-md) 0;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.code-header {
		padding: var(--space-xs) var(--space-md);
		background: var(--color-bg-surface);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		border-bottom: 1px solid var(--color-border-default);
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

	/* Note box */
	.note {
		padding: var(--space-md);
		background: var(--color-info-muted);
		border-left: 3px solid var(--color-info);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.note strong {
		color: var(--color-fg-primary);
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

	/* Next grid */
	.next-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: var(--space-md);
	}

	.next-card {
		display: block;
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
		border: 1px solid transparent;
	}

	.next-card:hover {
		background: var(--color-bg-surface);
		border-color: var(--color-border-default);
	}

	.next-card h3 {
		margin: 0 0 var(--space-xs);
		font-size: var(--text-body);
		color: var(--color-fg-primary);
	}

	.next-card p {
		margin: 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}
</style>
