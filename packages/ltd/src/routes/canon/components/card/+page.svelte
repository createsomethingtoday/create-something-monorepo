<script lang="ts">
	import CodeBlock from '$lib/canon/CodeBlock.svelte';
</script>

<!-- Page Header -->
<header class="page-header">
	<h1 class="page-title">Card</h1>
	<p class="page-description">
		Cards group related content together. Pick an elevation level to show how important each card
		is—from flat surfaces to floating panels.
	</p>
</header>

<!-- Elevation Section -->
<section class="section">
	<h2 class="section-title">Choose Your Depth</h2>
	<p class="section-description">
		More shadow means more visual weight. Use subtle for inline content, medium for most cards,
		and large for modals that need attention.
	</p>

	<!-- Subtle Elevation -->
	<div class="example-group">
		<h3 class="example-title">Subtle</h3>
		<p class="example-description">Almost flat. Good for content that lives within the page.</p>

		<div class="preview">
			<div class="card card-subtle">
				<h4 class="card-title">Subtle Card</h4>
				<p class="card-body">
					Uses <code>--shadow-sm</code> for minimal elevation. Blends with background while
					maintaining subtle separation.
				</p>
			</div>
		</div>

		<CodeBlock
			code={`<div class="card card-subtle">
  <h4>Subtle Card</h4>
  <p>Minimal elevation for inline content.</p>
</div>

<style>
  .card-subtle {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }
</style>`}
			language="svelte"
		/>
	</div>

	<!-- Medium Elevation -->
	<div class="example-group">
		<h3 class="example-title">Medium</h3>
		<p class="example-description">Your go-to choice for most cards and content containers.</p>

		<div class="preview">
			<div class="card card-medium">
				<h4 class="card-title">Medium Card</h4>
				<p class="card-body">
					Uses <code>--shadow-md</code> for standard elevation. Clear separation from background
					while remaining grounded.
				</p>
			</div>
		</div>

		<CodeBlock
			code={`<div class="card card-medium">
  <h4>Medium Card</h4>
  <p>Standard elevation for card components.</p>
</div>

<style>
  .card-medium {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
  }
</style>`}
			language="svelte"
		/>
	</div>

	<!-- Large Elevation -->
	<div class="example-group">
		<h3 class="example-title">Large</h3>
		<p class="example-description">
			Floats above the page. Save this for modals, dialogs, and important overlays.
		</p>

		<div class="preview">
			<div class="card card-large">
				<h4 class="card-title">Large Card</h4>
				<p class="card-body">
					Uses <code>--shadow-lg</code> for prominent elevation. Floats above content, suitable for
					dialogs and popovers.
				</p>
			</div>
		</div>

		<CodeBlock
			code={`<div class="card card-large">
  <h4>Large Card</h4>
  <p>High elevation for modals and overlays.</p>
</div>

<style>
  .card-large {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
  }
</style>`}
			language="svelte"
		/>
	</div>
</section>

<!-- Border Radius Section -->
<section class="section">
	<h2 class="section-title">Rounded Corners</h2>
	<p class="section-description">
		Use <code>--radius-lg</code> (12px) for most cards. Smaller elements like tags can use tighter
		corners.
	</p>

	<div class="radius-demo">
		<div class="radius-example">
			<div class="radius-box radius-sm">
				<span>sm</span>
			</div>
			<code>--radius-sm</code>
			<span>6px</span>
		</div>

		<div class="radius-example">
			<div class="radius-box radius-md">
				<span>md</span>
			</div>
			<code>--radius-md</code>
			<span>8px</span>
		</div>

		<div class="radius-example">
			<div class="radius-box radius-lg">
				<span>lg</span>
			</div>
			<code>--radius-lg</code>
			<span>12px (recommended)</span>
		</div>

		<div class="radius-example">
			<div class="radius-box radius-xl">
				<span>xl</span>
			</div>
			<code>--radius-xl</code>
			<span>16px</span>
		</div>
	</div>

	<CodeBlock
		title="Border radius usage"
		code={`.card {
  /* Use --radius-lg for standard cards */
  border-radius: var(--radius-lg);
}

.card-header {
  /* Inner elements can use smaller radius */
  border-radius: var(--radius-md);
}

.card-tag {
  /* Pills and badges use --radius-full */
  border-radius: var(--radius-full);
}`}
		language="css"
	/>
</section>

<!-- Interactive States Section -->
<section class="section">
	<h2 class="section-title">Clickable Cards</h2>
	<p class="section-description">
		Make cards interactive when the whole surface should be clickable, like a list of articles or products.
	</p>

	<div class="example-group">
		<h3 class="example-title">Hover Effect</h3>
		<p class="example-description">
			The card lifts on hover so users know it's clickable. Try it below.
		</p>

		<div class="preview">
			<button class="card card-interactive">
				<h4 class="card-title">Interactive Card</h4>
				<p class="card-body">
					Hover to see elevation change and border emphasis. Transform and shadow animate with
					--duration-micro (200ms).
				</p>
			</button>
		</div>

		<CodeBlock
			code={`<button class="card card-interactive">
  <h4>Interactive Card</h4>
  <p>Hover to see elevation change.</p>
</button>

<style>
  .card-interactive {
    transition: all var(--duration-micro) var(--ease-standard);
    cursor: pointer;
  }

  .card-interactive:hover {
    border-color: var(--color-border-emphasis);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  .card-interactive:active {
    transform: translateY(0);
  }
</style>`}
			language="svelte"
		/>
	</div>
</section>

<!-- Token Reference -->
<section class="section">
	<h2 class="section-title">Tokens Used</h2>
	<p class="section-description">These variables power all card styles. Copy them into your project.</p>

	<div class="token-table">
		<div class="token-section">
			<h4>Elevation</h4>
			<div class="token-row">
				<code>--shadow-sm</code>
				<span>Subtle shadow for minimal elevation</span>
			</div>
			<div class="token-row">
				<code>--shadow-md</code>
				<span>Standard shadow for card components</span>
			</div>
			<div class="token-row">
				<code>--shadow-lg</code>
				<span>Large shadow for modals and overlays</span>
			</div>
		</div>

		<div class="token-section">
			<h4>Border Radius</h4>
			<div class="token-row">
				<code>--radius-sm</code>
				<span>6px — Subtle rounding</span>
			</div>
			<div class="token-row">
				<code>--radius-md</code>
				<span>8px — Medium rounding</span>
			</div>
			<div class="token-row">
				<code>--radius-lg</code>
				<span>12px — Recommended for cards</span>
			</div>
			<div class="token-row">
				<code>--radius-xl</code>
				<span>16px — Large rounding</span>
			</div>
		</div>

		<div class="token-section">
			<h4>Colors</h4>
			<div class="token-row">
				<code>--color-bg-surface</code>
				<span>#111111 — Card background</span>
			</div>
			<div class="token-row">
				<code>--color-border-default</code>
				<span>rgba(255,255,255,0.1) — Default border</span>
			</div>
			<div class="token-row">
				<code>--color-border-emphasis</code>
				<span>rgba(255,255,255,0.2) — Hover border</span>
			</div>
		</div>

		<div class="token-section">
			<h4>Motion</h4>
			<div class="token-row">
				<code>--duration-micro</code>
				<span>200ms — Hover transitions</span>
			</div>
			<div class="token-row">
				<code>--ease-standard</code>
				<span>cubic-bezier(0.4, 0.0, 0.2, 1)</span>
			</div>
		</div>
	</div>
</section>

<style>
	/* Page Header */
	.page-header {
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.page-title {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		letter-spacing: var(--tracking-tight);
	}

	.page-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		max-width: 700px;
		margin: 0;
	}

	/* Sections */
	.section {
		margin-bottom: var(--space-2xl);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.section-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
		line-height: var(--leading-relaxed);
	}

	.section-description code {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		background: var(--color-bg-subtle);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	/* Example Groups */
	.example-group {
		margin-bottom: var(--space-xl);
	}

	.example-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.example-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
	}

	/* Preview Area */
	.preview {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: var(--space-2xl);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-md);
		min-height: 200px;
	}

	/* Card Styles */
	.card {
		padding: var(--space-lg);
		max-width: 400px;
		width: 100%;
	}

	.card-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.card-body {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
	}

	.card-body code {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-primary);
		background: var(--color-bg-elevated);
		padding: 2px 4px;
		border-radius: var(--radius-sm);
	}

	.card-subtle {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}

	.card-medium {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
	}

	.card-large {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
	}

	.card-interactive {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
		transition: all var(--duration-micro) var(--ease-standard);
		cursor: pointer;
		text-align: left;
	}

	.card-interactive:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
	}

	.card-interactive:active {
		transform: translateY(0);
	}

	/* Radius Demo */
	.radius-demo {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	.radius-example {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
	}

	.radius-box {
		width: 80px;
		height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
	}

	.radius-box span {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.radius-sm {
		border-radius: var(--radius-sm);
	}
	.radius-md {
		border-radius: var(--radius-md);
	}
	.radius-lg {
		border-radius: var(--radius-lg);
	}
	.radius-xl {
		border-radius: var(--radius-xl);
	}

	.radius-example code {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	.radius-example span {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Token Table */
	.token-table {
		display: grid;
		gap: var(--space-lg);
	}

	.token-section {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.token-section h4 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.token-row {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: var(--space-md);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.token-row:last-child {
		border-bottom: none;
	}

	.token-row code {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	.token-row span {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.card-interactive {
			transition: none;
			transform: none !important;
		}
	}
</style>
