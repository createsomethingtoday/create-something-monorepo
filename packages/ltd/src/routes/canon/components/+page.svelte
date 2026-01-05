<script lang="ts">
	// Component documentation landing page
</script>

<!-- Hero Section -->
<header class="hero">
	<h1 class="hero-title">Components</h1>
	<p class="hero-subtitle">
		Ready-to-use components you can copy into your project. Each one includes working code and
		design tokens that just work.
	</p>
</header>

<!-- Component Grid -->
<section class="component-grid">
	<a href="/canon/components/button" class="component-card">
		<div class="card-icon">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="3" y="8" width="18" height="8" rx="2" />
			</svg>
		</div>
		<div class="card-content">
			<h2 class="card-title">Button</h2>
			<p class="card-description">
				Prompt users to take action with primary, secondary, and ghost styles.
			</p>
		</div>
		<div class="card-arrow">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M5 12h14M12 5l7 7-7 7" />
			</svg>
		</div>
	</a>

	<a href="/canon/components/card" class="component-card">
		<div class="card-icon">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="3" y="3" width="18" height="18" rx="2" />
			</svg>
		</div>
		<div class="card-content">
			<h2 class="card-title">Card</h2>
			<p class="card-description">
				Group related content together with three depth levels to choose from.
			</p>
		</div>
		<div class="card-arrow">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M5 12h14M12 5l7 7-7 7" />
			</svg>
		</div>
	</a>

	<a href="/canon/components/navigation" class="component-card">
		<div class="card-icon">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
				<polyline points="9 22 9 12 15 12 15 22" />
			</svg>
		</div>
		<div class="card-content">
			<h2 class="card-title">Navigation</h2>
			<p class="card-description">
				Help users find their way with headers, sidebars, breadcrumbs, and tabs.
			</p>
		</div>
		<div class="card-arrow">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M5 12h14M12 5l7 7-7 7" />
			</svg>
		</div>
	</a>
</section>

<!-- Principles Section -->
<section class="principles">
	<h2 class="section-title">How We Build These</h2>
	<p class="section-description">
		We test each component against three questions before shipping it.
	</p>

	<div class="principles-grid">
		<div class="principle-item">
			<h3>One Pattern, One Place</h3>
			<p>If a component already exists, use it. No duplicates.</p>
		</div>

		<div class="principle-item">
			<h3>Earn Your Place</h3>
			<p>Every prop and variant must solve a real problem.</p>
		</div>

		<div class="principle-item">
			<h3>Disappear When Working</h3>
			<p>Good tools get out of the way. You should focus on your work, not ours.</p>
		</div>
	</div>
</section>

<!-- Token Reference -->
<section class="token-reference">
	<h2 class="section-title">Design Tokens</h2>
	<p class="section-description">
		Use these variables for colors, spacing, and motion. They keep your design consistent automatically.
	</p>

	<div class="token-grid">
		<div class="token-category">
			<h3>Colors</h3>
			<code>--color-bg-surface</code>
			<code>--color-fg-primary</code>
			<code>--color-border-default</code>
		</div>

		<div class="token-category">
			<h3>Motion</h3>
			<code>--duration-micro</code>
			<code>--ease-standard</code>
		</div>

		<div class="token-category">
			<h3>Spacing</h3>
			<code>--space-xs</code>
			<code>--space-sm</code>
			<code>--space-md</code>
		</div>

		<div class="token-category">
			<h3>Borders</h3>
			<code>--radius-sm</code>
			<code>--radius-md</code>
			<code>--radius-lg</code>
		</div>
	</div>
</section>

<style>
	/* Hero */
	.hero {
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.hero-title {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		letter-spacing: var(--tracking-tight);
	}

	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		max-width: 600px;
		line-height: var(--leading-relaxed);
		margin: 0;
	}

	/* Component Grid */
	.component-grid {
		display: grid;
		gap: var(--space-md);
		margin-bottom: var(--space-2xl);
	}

	.component-card {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
		position: relative;
	}

	.component-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateX(4px);
	}

	.component-card-disabled {
		opacity: 0.6;
		pointer-events: none;
	}

	.component-card-disabled:hover {
		transform: none;
	}

	.card-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
	}

	.card-content {
		flex: 1;
	}

	.card-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs) 0;
	}

	.card-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
	}

	.card-arrow {
		color: var(--color-fg-muted);
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.component-card:hover .card-arrow {
		transform: translateX(4px);
	}

	.badge {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-subtle);
		padding: 2px 8px;
		border-radius: var(--radius-sm);
	}

	/* Principles Section */
	.principles {
		margin-bottom: var(--space-2xl);
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
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

	.principles-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.principle-item {
		padding: var(--space-md);
		border-left: 2px solid var(--color-border-emphasis);
	}

	.principle-item h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.principle-item p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	/* Token Reference */
	.token-reference {
		margin-bottom: var(--space-xl);
	}

	.token-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.token-category h3 {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.token-category code {
		display: block;
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		background: var(--color-bg-surface);
		padding: var(--space-xs);
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-default);
		margin-bottom: var(--space-xs);
	}
</style>
