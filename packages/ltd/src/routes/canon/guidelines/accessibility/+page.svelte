<script lang="ts">
	/**
	 * Accessibility Guidelines
	 *
	 * WCAG 2.1 AA compliance patterns for the Canon Design System.
	 * Accessibility is not an afterthought—it's foundational.
	 */
</script>

<svelte:head>
	<title>Accessibility – Canon Design System</title>
	<meta name="description" content="WCAG 2.1 AA accessibility guidelines for the Canon Design System" />
</svelte:head>

<div class="page">
	<header class="page-header">
		<span class="category">Guidelines</span>
		<h1>Accessibility</h1>
		<p class="lead">
			Accessibility is not a feature—it's a foundation. Every component in Canon
			is built to WCAG 2.1 AA standards, ensuring all users can interact with
			your interfaces.
		</p>
	</header>

	<section class="section">
		<h2>Color Contrast</h2>
		<p>
			All text in the Canon system meets WCAG AA contrast requirements.
			The minimum ratio is 4.5:1 for normal text and 3:1 for large text.
		</p>

		<div class="contrast-grid">
			<div class="contrast-item">
				<div class="contrast-sample sample-primary">Aa</div>
				<div class="contrast-details">
					<span class="contrast-name">Primary Text</span>
					<span class="contrast-ratio">21:1</span>
					<code>--color-fg-primary</code>
				</div>
			</div>
			<div class="contrast-item">
				<div class="contrast-sample sample-secondary">Aa</div>
				<div class="contrast-details">
					<span class="contrast-name">Secondary Text</span>
					<span class="contrast-ratio">13.7:1</span>
					<code>--color-fg-secondary</code>
				</div>
			</div>
			<div class="contrast-item">
				<div class="contrast-sample sample-muted">Aa</div>
				<div class="contrast-details">
					<span class="contrast-name">Muted Text</span>
					<span class="contrast-ratio">4.56:1</span>
					<code>--color-fg-muted</code>
				</div>
			</div>
		</div>

		<div class="note">
			<strong>Note:</strong> <code>--color-fg-subtle</code> (0.2 opacity) does not meet
			AA contrast and should only be used for decorative elements, never for
			informational content.
		</div>
	</section>

	<section class="section">
		<h2>Focus Management</h2>
		<p>
			All interactive elements must have visible focus indicators. Canon uses
			a consistent focus ring system.
		</p>

		<div class="code-block">
			<pre><code>{`/* Standard focus pattern */
.interactive:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* High contrast mode enhancement */
@media (prefers-contrast: more) {
  .interactive:focus-visible {
    outline: 3px solid var(--color-focus);
    outline-offset: 3px;
  }
}`}</code></pre>
		</div>

		<h3>Focus Order</h3>
		<ul class="guidelines-list">
			<li>Focus order must follow visual reading order</li>
			<li>Never use <code>tabindex</code> greater than 0</li>
			<li>Modal dialogs must trap focus within the modal</li>
			<li>Skip links should be provided for complex layouts</li>
		</ul>
	</section>

	<section class="section">
		<h2>Semantic HTML</h2>
		<p>
			Use the correct HTML elements for their intended purpose.
			Semantic markup provides meaning to assistive technologies.
		</p>

		<div class="do-dont-grid">
			<div class="do-item">
				<span class="label do-label">Do</span>
				<code>&lt;button&gt;Submit&lt;/button&gt;</code>
			</div>
			<div class="dont-item">
				<span class="label dont-label">Don't</span>
				<code>&lt;div onclick="..."&gt;Submit&lt;/div&gt;</code>
			</div>
		</div>

		<div class="do-dont-grid">
			<div class="do-item">
				<span class="label do-label">Do</span>
				<code>&lt;nav aria-label="Main"&gt;</code>
			</div>
			<div class="dont-item">
				<span class="label dont-label">Don't</span>
				<code>&lt;div class="nav"&gt;</code>
			</div>
		</div>

		<h3>Landmark Regions</h3>
		<ul class="guidelines-list">
			<li><code>&lt;header&gt;</code> or <code>role="banner"</code> for page header</li>
			<li><code>&lt;nav&gt;</code> or <code>role="navigation"</code> for navigation</li>
			<li><code>&lt;main&gt;</code> or <code>role="main"</code> for main content</li>
			<li><code>&lt;footer&gt;</code> or <code>role="contentinfo"</code> for page footer</li>
		</ul>
	</section>

	<section class="section">
		<h2>ARIA Patterns</h2>
		<p>
			Use ARIA attributes to enhance accessibility, but remember:
			<strong>no ARIA is better than bad ARIA</strong>.
		</p>

		<h3>Live Regions</h3>
		<p>
			Use live regions to announce dynamic content changes to screen readers.
		</p>

		<div class="code-block">
			<pre><code>{`<!-- For important updates -->
<div role="status" aria-live="polite">
  {statusMessage}
</div>

<!-- For urgent alerts -->
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>`}</code></pre>
		</div>

		<h3>Common ARIA Patterns</h3>
		<table class="spec-table">
			<thead>
				<tr>
					<th>Pattern</th>
					<th>Attributes</th>
					<th>Use Case</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Disclosure</td>
					<td><code>aria-expanded</code>, <code>aria-controls</code></td>
					<td>Accordion, dropdown</td>
				</tr>
				<tr>
					<td>Modal</td>
					<td><code>role="dialog"</code>, <code>aria-modal</code></td>
					<td>Dialog boxes</td>
				</tr>
				<tr>
					<td>Tabs</td>
					<td><code>role="tablist"</code>, <code>aria-selected</code></td>
					<td>Tab interfaces</td>
				</tr>
				<tr>
					<td>Loading</td>
					<td><code>aria-busy</code>, <code>aria-describedby</code></td>
					<td>Loading states</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section class="section">
		<h2>Reduced Motion</h2>
		<p>
			Respect users who prefer reduced motion. All animations in Canon
			include reduced motion alternatives.
		</p>

		<div class="code-block">
			<pre><code>{`@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}`}</code></pre>
		</div>

		<div class="note">
			<strong>Tip:</strong> Use <code>transition</code> instead of <code>animation</code>
			when possible—transitions are easier to disable and more performant.
		</div>
	</section>

	<section class="section">
		<h2>High Contrast Mode</h2>
		<p>
			Canon supports <code>prefers-contrast: more</code> with enhanced
			visibility tokens.
		</p>

		<table class="spec-table">
			<thead>
				<tr>
					<th>Token</th>
					<th>Standard</th>
					<th>High Contrast</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td><code>--color-fg-muted</code></td>
					<td>0.46 opacity</td>
					<td>0.75 opacity</td>
				</tr>
				<tr>
					<td><code>--color-border-default</code></td>
					<td>0.1 opacity</td>
					<td>0.3 opacity</td>
				</tr>
				<tr>
					<td><code>--color-focus</code></td>
					<td>0.5 opacity</td>
					<td>0.9 opacity</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section class="section">
		<h2>Checklist</h2>
		<p>Use this checklist when building with Canon components.</p>

		<div class="checklist">
			<div class="checklist-category">
				<h3>Perceivable</h3>
				<ul>
					<li>All images have descriptive alt text</li>
					<li>Color is not the only way to convey information</li>
					<li>Text contrast meets 4.5:1 minimum</li>
					<li>Content is readable at 200% zoom</li>
				</ul>
			</div>
			<div class="checklist-category">
				<h3>Operable</h3>
				<ul>
					<li>All functionality available via keyboard</li>
					<li>Focus indicators are visible</li>
					<li>No keyboard traps exist</li>
					<li>Users can pause/stop animations</li>
				</ul>
			</div>
			<div class="checklist-category">
				<h3>Understandable</h3>
				<ul>
					<li>Language is declared on the page</li>
					<li>Navigation is consistent</li>
					<li>Error messages are descriptive</li>
					<li>Labels are associated with inputs</li>
				</ul>
			</div>
			<div class="checklist-category">
				<h3>Robust</h3>
				<ul>
					<li>Valid HTML structure</li>
					<li>ARIA attributes used correctly</li>
					<li>Works with assistive technologies</li>
					<li>Tested with screen readers</li>
				</ul>
			</div>
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

	/* Contrast grid */
	.contrast-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
		margin: var(--space-md) 0;
	}

	.contrast-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
	}

	.contrast-sample {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-h3);
		font-weight: 500;
		border-radius: var(--radius-sm);
	}

	.sample-primary {
		color: var(--color-fg-primary);
	}

	.sample-secondary {
		color: var(--color-fg-secondary);
	}

	.sample-muted {
		color: var(--color-fg-muted);
	}

	.contrast-details {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.contrast-name {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
	}

	.contrast-ratio {
		font-size: var(--text-caption);
		color: var(--color-success);
		font-weight: 500;
	}

	.contrast-details code {
		font-size: var(--text-caption);
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

	/* Do/Don't */
	.do-dont-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
		margin: var(--space-md) 0;
	}

	.do-item,
	.dont-item {
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.do-item {
		background: var(--color-success-muted);
	}

	.dont-item {
		background: var(--color-error-muted);
	}

	.label {
		font-size: var(--text-caption);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.do-label {
		color: var(--color-success);
	}

	.dont-label {
		color: var(--color-error);
	}

	.do-item code,
	.dont-item code {
		background: var(--color-bg-surface);
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
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
		margin-top: var(--space-md);
	}

	.checklist-category {
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-lg);
	}

	.checklist-category h3 {
		margin: 0 0 var(--space-sm);
		font-size: var(--text-body);
	}

	.checklist-category ul {
		margin: 0;
		padding-left: var(--space-md);
		list-style: none;
	}

	.checklist-category li {
		position: relative;
		margin-bottom: var(--space-xs);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		line-height: 1.5;
	}

	.checklist-category li::before {
		content: '☐';
		position: absolute;
		left: calc(-1 * var(--space-md));
		color: var(--color-fg-muted);
	}

	@media (max-width: 640px) {
		.do-dont-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
