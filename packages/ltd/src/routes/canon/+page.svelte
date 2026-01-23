<script lang="ts">
	import { canonNavigation } from '$lib/canon/navigation.js';
	import { SEO } from '@create-something/components';

	// Filter to show only main sections for quick access
	const quickLinks = canonNavigation.slice(1, 4); // Foundations, Components, Patterns
</script>

<SEO
	title="Canon"
	description="Everything you need to build interfaces that feel right. Colors, typography, components, and the thinking behind each decision."
	propertyName="ltd"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.ltd' },
		{ name: 'Canon', url: 'https://createsomething.ltd/canon' }
	]}
/>

<!-- Hero Section -->
<header class="hero">
	<p class="eyebrow">Design System</p>
	<h1 class="hero-title">Canon</h1>
	<p class="hero-subtitle">
		Everything you need to build interfaces that feel right. Colors, typography, 
		components, and the thinking behind each decision.
	</p>
</header>

<!-- Philosophy Quote -->
<section class="philosophy-quote">
	<blockquote>
		<p>"Weniger, aber besser"</p>
		<cite>— Dieter Rams (Less, but better)</cite>
	</blockquote>
</section>

<!-- Quick Access Grid -->
<section class="quick-access">
	<h2 class="section-title">Explore the System</h2>

	<div class="card-grid">
		<!-- Foundations -->
		<a href="/canon/foundations/colors" class="feature-card">
			<div class="card-icon">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<circle cx="12" cy="12" r="4" />
				</svg>
			</div>
			<h3>Foundations</h3>
			<p>Start here. Colors, typography, spacing, and motion tokens you can copy directly into your project.</p>
		</a>

		<!-- Components -->
		<a href="/canon/components" class="feature-card">
			<div class="card-icon">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="3" width="7" height="7" rx="1" />
					<rect x="14" y="3" width="7" height="7" rx="1" />
					<rect x="3" y="14" width="7" height="7" rx="1" />
					<rect x="14" y="14" width="7" height="7" rx="1" />
				</svg>
			</div>
			<h3>Components</h3>
			<p>Ready-to-use buttons, cards, navigation, and form elements with code examples.</p>
		</a>

		<!-- Patterns -->
		<a href="/canon/patterns" class="feature-card feature-card-disabled">
			<div class="card-icon">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 2L2 7l10 5 10-5-10-5z" />
					<path d="M2 17l10 5 10-5" />
					<path d="M2 12l10 5 10-5" />
				</svg>
			</div>
			<h3>Patterns</h3>
			<p>How to handle forms, loading states, and navigation across your application.</p>
			<span class="badge">Coming Soon</span>
		</a>

		<!-- Philosophy -->
		<a href="/canon/foundations/philosophy" class="feature-card">
			<div class="card-icon">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
					<path d="M2 12h20" />
				</svg>
			</div>
			<h3>Philosophy</h3>
			<p>Why we made these choices. The principles that guide every design decision.</p>
		</a>
	</div>
</section>

<!-- Principles Section -->
<section class="principles">
	<h2 class="section-title">How We Decide What Stays</h2>
	<p class="section-description">
		Before adding anything to Canon, we ask three questions.
	</p>

	<div class="triad-grid">
		<div class="triad-item">
			<span class="triad-label">First</span>
			<h3>Does it already exist?</h3>
			<p class="triad-question">If we've built something similar, we combine them into one solution.</p>
			<p class="triad-action">→ Unify</p>
		</div>

		<div class="triad-item">
			<span class="triad-label">Second</span>
			<h3>Does it earn its place?</h3>
			<p class="triad-question">Every element needs a clear purpose. Decoration without function gets cut.</p>
			<p class="triad-action">→ Remove</p>
		</div>

		<div class="triad-item">
			<span class="triad-label">Third</span>
			<h3>Does it fit the whole?</h3>
			<p class="triad-question">Each piece should work with everything else. If it doesn't, we rethink it.</p>
			<p class="triad-action">→ Reconnect</p>
		</div>
	</div>
</section>

<!-- Token Preview -->
<section class="token-preview">
	<h2 class="section-title">Spacing That Feels Natural</h2>
	<p class="section-description">
		We use the golden ratio (1.618) for spacing. It creates visual rhythm that feels 
		balanced without you having to think about why.
	</p>

	<div class="token-examples">
		<div class="token-group">
			<h4>Spacing Scale</h4>
			<div class="spacing-demo">
				<div class="space-box space-xs"><span>xs</span></div>
				<div class="space-box space-sm"><span>sm</span></div>
				<div class="space-box space-md"><span>md</span></div>
				<div class="space-box space-lg"><span>lg</span></div>
				<div class="space-box space-xl"><span>xl</span></div>
			</div>
		</div>

		<div class="token-group">
			<h4>Color Hierarchy</h4>
			<div class="color-demo">
				<div class="color-swatch bg-pure"></div>
				<div class="color-swatch bg-elevated"></div>
				<div class="color-swatch bg-surface"></div>
				<div class="color-swatch bg-subtle"></div>
			</div>
		</div>
	</div>
</section>

<style>
	/* Hero */
	.hero {
		text-align: center;
		padding-bottom: var(--space-2xl);
		border-bottom: 1px solid var(--color-border-default);
		margin-bottom: var(--space-2xl);
	}

	.eyebrow {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
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
		margin: 0 auto;
		line-height: var(--leading-relaxed);
	}

	/* Philosophy Quote */
	.philosophy-quote {
		padding: var(--space-xl) 0;
		margin-bottom: var(--space-2xl);
	}

	.philosophy-quote blockquote {
		text-align: center;
		margin: 0;
	}

	.philosophy-quote p {
		font-size: var(--text-h2);
		font-style: italic;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.philosophy-quote cite {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-style: normal;
	}

	/* Sections */
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
	}

	/* Quick Access Grid */
	.quick-access {
		margin-bottom: var(--space-2xl);
	}

	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: var(--space-md);
	}

	.feature-card {
		display: block;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
		position: relative;
	}

	.feature-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-2px);
	}

	.feature-card-disabled {
		opacity: 0.6;
		pointer-events: none;
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
		margin-bottom: var(--space-md);
	}

	.feature-card h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.feature-card p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
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

	/* Principles */
	.principles {
		margin-bottom: var(--space-2xl);
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.triad-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.triad-item {
		padding: var(--space-md);
		border-left: 2px solid var(--color-border-emphasis);
	}

	.triad-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
		color: var(--color-fg-muted);
	}

	.triad-item h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: var(--space-xs) 0;
	}

	.triad-question {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		font-style: italic;
		margin-bottom: var(--space-xs);
	}

	.triad-action {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
	}

	/* Token Preview */
	.token-preview {
		margin-bottom: var(--space-xl);
	}

	.token-examples {
		display: grid;
		gap: var(--space-lg);
	}

	.token-group h4 {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	/* Spacing Demo */
	.spacing-demo {
		display: flex;
		align-items: flex-end;
		gap: var(--space-xs);
	}

	.space-box {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.space-box span {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
	}

	.space-xs { width: var(--space-xs); height: var(--space-xs); }
	.space-sm { width: var(--space-sm); height: var(--space-sm); }
	.space-md { width: var(--space-md); height: var(--space-md); }
	.space-lg { width: var(--space-lg); height: var(--space-lg); }
	.space-xl { width: var(--space-xl); height: var(--space-xl); }

	/* Color Demo */
	.color-demo {
		display: flex;
		gap: 2px;
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.color-swatch {
		flex: 1;
		height: 48px;
	}

	.bg-pure { background: var(--color-bg-pure); }
	.bg-elevated { background: var(--color-bg-elevated); }
	.bg-surface { background: var(--color-bg-surface); }
	.bg-subtle { background: var(--color-bg-subtle); }
</style>
