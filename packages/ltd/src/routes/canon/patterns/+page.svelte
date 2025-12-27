<script lang="ts">
	// Patterns overview landing page
</script>

<!-- Hero Section -->
<header class="hero">
	<h1 class="hero-title">Patterns</h1>
	<p class="hero-subtitle">
		Patterns are composed solutions to common interface challenges. They combine Canon components
		and tokens into reusable recipes that solve real problems.
	</p>
</header>

<!-- Pattern Philosophy -->
<section class="philosophy">
	<h2 class="section-title">Components vs Patterns</h2>
	<p class="section-description">
		Components are atomic building blocks. Patterns are molecular compositions that solve
		specific user problems.
	</p>

	<div class="comparison-grid">
		<div class="comparison-item">
			<h3>Components</h3>
			<ul>
				<li>Single responsibility</li>
				<li>Stateless or minimal state</li>
				<li>Context-agnostic</li>
				<li>Building blocks</li>
			</ul>
			<p class="comparison-example">Button, TextField, Card, Spinner</p>
		</div>

		<div class="comparison-item">
			<h3>Patterns</h3>
			<ul>
				<li>Composed solutions</li>
				<li>Handle user flows</li>
				<li>Context-aware</li>
				<li>Complete experiences</li>
			</ul>
			<p class="comparison-example">FormLayout, LoadingSkeleton, ErrorBoundary</p>
		</div>
	</div>
</section>

<!-- Pattern Grid -->
<section class="pattern-grid-section">
	<h2 class="section-title">Available Patterns</h2>
	<p class="section-description">
		Each pattern documents the problem it solves, shows implementation examples, and explains
		when to use it.
	</p>

	<div class="pattern-grid">
		<a href="/canon/patterns/forms" class="pattern-card">
			<div class="card-icon">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="3" width="18" height="18" rx="2" />
					<path d="M9 9h6M9 13h6M9 17h4" />
				</svg>
			</div>
			<div class="card-content">
				<h3 class="card-title">Forms</h3>
				<p class="card-description">
					Input layouts, validation feedback, multi-step flows, and error states. Accessible
					form patterns that guide users through data entry.
				</p>
			</div>
			<div class="card-arrow">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M5 12h14M12 5l7 7-7 7" />
				</svg>
			</div>
		</a>

		<a href="/canon/patterns/loading" class="pattern-card">
			<div class="card-icon">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<path d="M12 6v6l4 2" />
				</svg>
			</div>
			<div class="card-content">
				<h3 class="card-title">Loading</h3>
				<p class="card-description">
					Skeleton screens, spinners, progress indicators, and content placeholders.
					Patterns that communicate system status during async operations.
				</p>
			</div>
			<div class="card-arrow">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M5 12h14M12 5l7 7-7 7" />
				</svg>
			</div>
		</a>

		<!-- Planned Patterns -->
		<div class="pattern-card pattern-card-planned">
			<div class="card-icon">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
					<line x1="12" y1="9" x2="12" y2="13" />
					<line x1="12" y1="17" x2="12.01" y2="17" />
				</svg>
			</div>
			<div class="card-content">
				<h3 class="card-title">Error Handling</h3>
				<p class="card-description">
					Error boundaries, inline errors, toast notifications, and recovery flows.
					Graceful degradation when things go wrong.
				</p>
			</div>
			<span class="badge">Planned</span>
		</div>

		<div class="pattern-card pattern-card-planned">
			<div class="card-icon">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="3" width="18" height="18" rx="2" />
					<circle cx="12" cy="12" r="3" />
					<path d="M3 3l18 18" />
				</svg>
			</div>
			<div class="card-content">
				<h3 class="card-title">Empty States</h3>
				<p class="card-description">
					Zero-data views, first-time user experiences, and call-to-action placeholders.
					Making "nothing" helpful.
				</p>
			</div>
			<span class="badge">Planned</span>
		</div>
	</div>
</section>

<!-- Pattern Structure -->
<section class="structure-section">
	<h2 class="section-title">Pattern Documentation Structure</h2>
	<p class="section-description">
		Each pattern follows a consistent documentation format.
	</p>

	<div class="structure-grid">
		<div class="structure-item">
			<h3>Problem</h3>
			<p>What user need does this pattern address? When should you reach for it?</p>
		</div>

		<div class="structure-item">
			<h3>Solution</h3>
			<p>Visual examples and interactive demos showing the pattern in action.</p>
		</div>

		<div class="structure-item">
			<h3>Implementation</h3>
			<p>Code examples using Canon components and tokens. Copy-paste ready.</p>
		</div>

		<div class="structure-item">
			<h3>Accessibility</h3>
			<p>Keyboard navigation, screen reader considerations, and reduced motion support.</p>
		</div>

		<div class="structure-item">
			<h3>Variants</h3>
			<p>Alternative approaches for different contexts or requirements.</p>
		</div>

		<div class="structure-item">
			<h3>Anti-patterns</h3>
			<p>Common mistakes to avoid and why they cause problems.</p>
		</div>
	</div>
</section>

<!-- Subtractive Triad -->
<section class="triad-section">
	<h2 class="section-title">Pattern Philosophy</h2>
	<p class="section-description">
		Every Canon pattern follows the Subtractive Triad.
	</p>

	<div class="triad-grid">
		<div class="triad-item">
			<h3>DRY (Implementation)</h3>
			<p>
				Patterns unify repeated solutions. If you find yourself composing the same components
				the same way, it becomes a pattern.
			</p>
		</div>

		<div class="triad-item">
			<h3>Rams (Artifact)</h3>
			<p>
				Every pattern must earn its existence. If a pattern doesn't solve a real,
				recurring problem, it doesn't belong.
			</p>
		</div>

		<div class="triad-item">
			<h3>Heidegger (System)</h3>
			<p>
				Patterns serve the whole. They should feel invisible when used correctly, the
				infrastructure receding into the experience.
			</p>
		</div>
	</div>
</section>

<!-- Canon Principle -->
<section class="canon-section">
	<blockquote class="canon-quote">
		<p>"Weniger, aber besser."</p>
		<cite>Less, but better. - Dieter Rams</cite>
	</blockquote>
	<p class="canon-explanation">
		Patterns reduce cognitive load by providing proven solutions. A well-designed pattern is
		one you never think about because it simply works.
	</p>
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

	/* Philosophy Section */
	.philosophy {
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

	.comparison-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-md);
	}

	.comparison-item {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.comparison-item h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.comparison-item ul {
		margin: 0 0 var(--space-md) 0;
		padding-left: var(--space-md);
	}

	.comparison-item li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.comparison-example {
		font-size: var(--text-body-sm);
		font-family: var(--font-mono);
		color: var(--color-fg-muted);
		background: var(--color-bg-subtle);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		margin: 0;
	}

	/* Pattern Grid Section */
	.pattern-grid-section {
		margin-bottom: var(--space-2xl);
	}

	.pattern-grid {
		display: grid;
		gap: var(--space-md);
	}

	.pattern-card {
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

	.pattern-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateX(4px);
	}

	.pattern-card-planned {
		opacity: 0.6;
		pointer-events: none;
	}

	.pattern-card-planned:hover {
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

	.pattern-card:hover .card-arrow {
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

	/* Structure Section */
	.structure-section {
		margin-bottom: var(--space-2xl);
	}

	.structure-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.structure-item {
		padding: var(--space-md);
		border-left: 2px solid var(--color-border-emphasis);
	}

	.structure-item h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.structure-item p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
		line-height: var(--leading-relaxed);
	}

	/* Triad Section */
	.triad-section {
		margin-bottom: var(--space-2xl);
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.triad-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-lg);
	}

	.triad-item h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.triad-item p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
	}

	/* Canon Section */
	.canon-section {
		margin-bottom: var(--space-xl);
		text-align: center;
	}

	.canon-quote {
		margin: 0 0 var(--space-md) 0;
		padding: var(--space-lg);
		border-left: none;
	}

	.canon-quote p {
		font-size: var(--text-h2);
		font-weight: var(--font-light);
		font-style: italic;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm) 0;
	}

	.canon-quote cite {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-style: normal;
	}

	.canon-explanation {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		max-width: 600px;
		margin: 0 auto;
		line-height: var(--leading-relaxed);
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.pattern-card {
			transition: none;
		}

		.card-arrow {
			transition: none;
		}
	}
</style>
