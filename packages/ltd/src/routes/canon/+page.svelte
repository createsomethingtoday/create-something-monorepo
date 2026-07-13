<script lang="ts">
	import { SEO } from '@create-something/canon';
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
		<a href="/canon/patterns" class="feature-card">
			<div class="card-icon">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 2L2 7l10 5 10-5-10-5z" />
					<path d="M2 17l10 5 10-5" />
					<path d="M2 12l10 5 10-5" />
				</svg>
			</div>
			<h3>Patterns</h3>
			<p>How to handle forms, loading states, and navigation across your application.</p>
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
		padding-bottom: var(--space-performance-xl);
		margin-bottom: var(--space-performance-xl);
	}

	.eyebrow {
		font-size: var(--text-performance-caption);
		text-transform: uppercase;
		letter-spacing: var(--tracking-performance-widest);
		color: var(--color-performance-fg-muted);
		margin-bottom: var(--space-performance-sm);
	}

	.hero-title {
		font-size: var(--text-performance-display);
		font-weight: var(--font-performance-bold);
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-md);
		letter-spacing: var(--tracking-performance-tight);
	}

	.hero-subtitle {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-secondary);
		max-width: 600px;
		margin: 0 auto;
		line-height: var(--leading-performance-relaxed);
	}

	/* Philosophy Quote */
	.philosophy-quote {
		padding: var(--space-performance-xl) 0;
		margin-bottom: var(--space-performance-xl);
	}

	.philosophy-quote blockquote {
		text-align: center;
		margin: 0;
	}

	.philosophy-quote p {
		font-size: var(--text-performance-h2);
		font-style: italic;
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-sm);
	}

	.philosophy-quote cite {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		font-style: normal;
	}

	/* Sections */
	.section-title {
		font-size: var(--text-performance-h2);
		font-weight: var(--font-performance-semibold);
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-sm);
	}

	.section-description {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-lg);
	}

	/* Quick Access Grid */
	.quick-access {
		margin-bottom: var(--space-performance-xl);
	}

	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: var(--space-performance-md);
	}

	.feature-card {
		display: block;
		padding: var(--space-performance-lg);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		text-decoration: none;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
		position: relative;
	}

	.feature-card:hover {
		border-color: var(--color-performance-border-emphasis);
		transform: translateY(-2px);
	}

	.card-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-performance-bg-subtle);
		border-radius: var(--radius-performance-scale-md);
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-md);
	}

	.feature-card h3 {
		font-size: var(--text-performance-h3);
		font-weight: var(--font-performance-semibold);
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-xs);
	}

	.feature-card p {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		line-height: var(--leading-performance-relaxed);
		margin: 0;
	}

	/* Principles */
	.principles {
		margin-bottom: var(--space-performance-xl);
		padding: var(--space-performance-xl);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
	}

	.triad-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-performance-md);
	}

	.triad-item {
		padding: var(--space-performance-md);
		border-left: 2px solid var(--color-performance-border-emphasis);
	}

	.triad-label {
		font-size: var(--text-performance-caption);
		text-transform: uppercase;
		letter-spacing: var(--tracking-performance-wider);
		color: var(--color-performance-fg-muted);
	}

	.triad-item h3 {
		font-size: var(--text-performance-h3);
		font-weight: var(--font-performance-semibold);
		color: var(--color-performance-fg-primary);
		margin: var(--space-performance-xs) 0;
	}

	.triad-question {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		font-style: italic;
		margin-bottom: var(--space-performance-xs);
	}

	.triad-action {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		margin: 0;
	}

	/* Token Preview */
	.token-preview {
		margin-bottom: var(--space-performance-xl);
	}

	.token-examples {
		display: grid;
		gap: var(--space-performance-lg);
	}

	.token-group h4 {
		font-size: var(--text-performance-body-sm);
		font-weight: var(--font-performance-semibold);
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-sm);
		text-transform: uppercase;
		letter-spacing: var(--tracking-performance-wide);
	}

	/* Spacing Demo */
	.spacing-demo {
		display: flex;
		align-items: flex-end;
		gap: var(--space-performance-xs);
	}

	.space-box {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-sm);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.space-box span {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		font-family: var(--font-performance-mono);
	}

	.space-xs { width: var(--space-performance-xs); height: var(--space-performance-xs); }
	.space-sm { width: var(--space-performance-sm); height: var(--space-performance-sm); }
	.space-md { width: var(--space-performance-md); height: var(--space-performance-md); }
	.space-lg { width: var(--space-performance-lg); height: var(--space-performance-lg); }
	.space-xl { width: var(--space-performance-xl); height: var(--space-performance-xl); }

	/* Color Demo */
	.color-demo {
		display: flex;
		gap: 2px;
		border-radius: var(--radius-performance-scale-md);
		overflow: hidden;
	}

	.color-swatch {
		flex: 1;
		height: 48px;
	}

	.bg-pure { background: var(--color-performance-bg-pure); }
	.bg-elevated { background: var(--color-performance-bg-elevated); }
	.bg-surface { background: var(--color-performance-bg-surface); }
	.bg-subtle { background: var(--color-performance-bg-subtle); }
</style>
