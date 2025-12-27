<script lang="ts">
	/**
	 * Changelog
	 *
	 * Version history and release notes for the Canon Design System.
	 */
</script>

<svelte:head>
	<title>Changelog – Canon Design System</title>
	<meta name="description" content="Version history and release notes for the Canon Design System" />
</svelte:head>

<div class="page">
	<header class="page-header">
		<span class="category">Resources</span>
		<h1>Changelog</h1>
		<p class="lead">
			A record of all notable changes to the Canon Design System.
			Following semantic versioning.
		</p>
	</header>

	<section class="release">
		<div class="release-header">
			<h2>v1.0.0</h2>
			<time datetime="2024-12-27">December 27, 2024</time>
			<span class="badge badge--new">Latest</span>
		</div>

		<p class="release-summary">
			Initial release of the Canon Design System. Foundations, components,
			patterns, and comprehensive documentation.
		</p>

		<h3>Foundations</h3>
		<ul class="change-list">
			<li class="change change--added">
				<span class="change-type">Added</span>
				Color tokens with WCAG AA compliance
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				Typography scale using fluid sizing
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				Spacing system based on golden ratio (φ = 1.618)
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				Motion tokens with reduced-motion support
			</li>
		</ul>

		<h3>Components</h3>
		<ul class="change-list">
			<li class="change change--added">
				<span class="change-type">Added</span>
				Button component with variants (primary, secondary, ghost, danger)
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				Card component with header/footer slots
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				TextField with validation states
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				TextArea with auto-resize option
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				Checkbox and Radio components
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				Select dropdown
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				Toggle switch
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				Toast notifications
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				Badge component
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				Breadcrumb navigation
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				Tabs component
			</li>
		</ul>

		<h3>Patterns</h3>
		<ul class="change-list">
			<li class="change change--added">
				<span class="change-type">Added</span>
				FormLayout for form structure
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				FormValidation with error summary
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				MultiStepForm for wizard flows
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				EmptyState for zero-data scenarios
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				FirstTimeUser onboarding pattern
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				LoadingSkeleton and LoadingOverlay
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				InlineError and ErrorBoundary
			</li>
		</ul>

		<h3>Token Export</h3>
		<ul class="change-list">
			<li class="change change--added">
				<span class="change-type">Added</span>
				CSS custom properties (tokens.css)
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				SCSS variables (tokens.scss)
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				W3C DTCG format (tokens.dtcg.json)
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				Figma/Tokens Studio format (tokens.figma.json)
			</li>
		</ul>

		<h3>Documentation</h3>
		<ul class="change-list">
			<li class="change change--added">
				<span class="change-type">Added</span>
				Interactive documentation site
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				Component API reference pages
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				Accessibility guidelines (WCAG 2.1 AA)
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				Content writing guidelines
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				Responsive design patterns
			</li>
			<li class="change change--added">
				<span class="change-type">Added</span>
				Theming guide
			</li>
		</ul>
	</section>

	<section class="versioning">
		<h2>Versioning</h2>
		<p>
			Canon follows <a href="https://semver.org" target="_blank" rel="noopener">Semantic Versioning</a>.
		</p>

		<table class="spec-table">
			<thead>
				<tr>
					<th>Version</th>
					<th>Meaning</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td><strong>Major</strong> (1.x.x)</td>
					<td>Breaking changes to component APIs or tokens</td>
				</tr>
				<tr>
					<td><strong>Minor</strong> (x.1.x)</td>
					<td>New features, backwards compatible</td>
				</tr>
				<tr>
					<td><strong>Patch</strong> (x.x.1)</td>
					<td>Bug fixes, documentation updates</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section class="legend">
		<h2>Change Types</h2>
		<div class="legend-grid">
			<div class="legend-item">
				<span class="change-type change-type--added">Added</span>
				<span>New features</span>
			</div>
			<div class="legend-item">
				<span class="change-type change-type--changed">Changed</span>
				<span>Updates to existing features</span>
			</div>
			<div class="legend-item">
				<span class="change-type change-type--deprecated">Deprecated</span>
				<span>Features to be removed</span>
			</div>
			<div class="legend-item">
				<span class="change-type change-type--removed">Removed</span>
				<span>Deleted features</span>
			</div>
			<div class="legend-item">
				<span class="change-type change-type--fixed">Fixed</span>
				<span>Bug fixes</span>
			</div>
			<div class="legend-item">
				<span class="change-type change-type--security">Security</span>
				<span>Vulnerability fixes</span>
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

	/* Release */
	.release {
		margin-bottom: var(--space-xl);
		padding-bottom: var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.release-header {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
		flex-wrap: wrap;
	}

	.release-header h2 {
		font-size: var(--text-h2);
		font-weight: 600;
		margin: 0;
		color: var(--color-fg-primary);
	}

	.release-header time {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.badge {
		display: inline-block;
		padding: 2px var(--space-xs);
		font-size: var(--text-caption);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-radius: var(--radius-sm);
	}

	.badge--new {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.release-summary {
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin: 0 0 var(--space-lg);
	}

	h3 {
		font-size: var(--text-h3);
		font-weight: 500;
		margin: var(--space-lg) 0 var(--space-sm);
		color: var(--color-fg-primary);
	}

	/* Change list */
	.change-list {
		margin: 0 0 var(--space-md);
		padding: 0;
		list-style: none;
	}

	.change {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
		padding: var(--space-xs) 0;
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		line-height: 1.5;
	}

	.change-type {
		display: inline-block;
		padding: 2px var(--space-xs);
		font-size: var(--text-caption);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-radius: var(--radius-sm);
		flex-shrink: 0;
	}

	.change--added .change-type,
	.change-type--added {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.change--changed .change-type,
	.change-type--changed {
		background: var(--color-info-muted);
		color: var(--color-info);
	}

	.change--deprecated .change-type,
	.change-type--deprecated {
		background: var(--color-warning-muted);
		color: var(--color-warning);
	}

	.change--removed .change-type,
	.change-type--removed {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	.change--fixed .change-type,
	.change-type--fixed {
		background: var(--color-bg-subtle);
		color: var(--color-fg-secondary);
	}

	.change--security .change-type,
	.change-type--security {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	/* Versioning section */
	.versioning {
		margin-bottom: var(--space-xl);
		padding-bottom: var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.versioning h2 {
		font-size: var(--text-h2);
		font-weight: 500;
		margin: 0 0 var(--space-md);
		color: var(--color-fg-primary);
	}

	.versioning p {
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-md);
	}

	.versioning a {
		color: var(--color-fg-primary);
		text-decoration: underline;
		text-underline-offset: 2px;
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

	.spec-table td strong {
		color: var(--color-fg-primary);
	}

	/* Legend */
	.legend h2 {
		font-size: var(--text-h2);
		font-weight: 500;
		margin: 0 0 var(--space-md);
		color: var(--color-fg-primary);
	}

	.legend-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-sm);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}
</style>
