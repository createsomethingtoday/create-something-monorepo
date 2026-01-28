<script lang="ts">
	import { SEO, NewsletterSignup } from '@create-something/canon';
</script>

<SEO
	title="The Canon for Less, But Better"
	description="The philosophical foundation for Create Something. Curated wisdom from masters who embody 'less, but better.' Dieter Rams, Mies van der Rohe, and more."
	keywords="design principles, less but better, Dieter Rams, minimalism, good design, design philosophy, systems thinking"
	ogImage="/og-image.svg"
	propertyName="ltd"
/>

<!-- Hero: Gelassenheit Entrance
     The viewer hasn't arrived yet. We don't demand immediate comprehension.
     Each element fades in with micro-delays, settling into presence rather than arriving.
     This embodies "releasement" — non-willful action that invites contemplation. -->
<section class="hero pt-24 pb-32 px-6">
	<div class="max-w-4xl mx-auto text-center">
		<p class="eyebrow mb-6 hero-entrance" style="--delay: 0">Design Philosophy</p>

		<h1 class="mb-8 hero-entrance" style="--delay: 1">
			Less, But Better
		</h1>

		<p class="hero-text mb-12 max-w-2xl mx-auto leading-relaxed hero-entrance" style="--delay: 2">
			Design principles that help you make better decisions. Learn from Dieter Rams, 
			Mies van der Rohe, and other masters who shaped how we think about quality.
		</p>

		<div class="flex flex-col sm:flex-row gap-4 justify-center hero-entrance" style="--delay: 3">
			<a href="/masters" class="btn-primary">
				Meet the Masters
			</a>
			<a href="/ethos" class="btn-secondary">
				Our Approach
			</a>
		</div>
	</div>
</section>

<!-- Manifesto: Breathing Negative Space
     Typography should demonstrate the principle it articulates.
     Each paragraph breathes with increasing constraint — the "less" becomes more apparent. -->
<section class="manifesto py-24 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8 text-center manifesto-title">Weniger, aber besser</h2>

		<div class="manifesto-body">
			<p>
				<strong>Less, but better.</strong> Not minimalism for its own sake—a way to focus 
				on what matters. When you remove the unnecessary, what remains gets stronger.
			</p>

			<p>
				This is how we work: before adding anything, we ask whether it earns its place. 
				The same question applies to every feature, every word, every decision.
			</p>

			<p>
				Simple isn't easy. It takes more effort to make something clear than to leave it 
				complicated. That effort is worth it.
			</p>

			<p class="attribution pt-6">
				— How we evaluate research, design experiments, and deliver client work.
			</p>
		</div>
	</div>
</section>

<!-- Featured Pattern: Crystallization -->
<section class="crystallization py-24 px-6">
	<div class="max-w-4xl mx-auto">
		<p class="eyebrow mb-4 text-center">Featured Pattern</p>
		<h2 class="mb-8 text-center section-heading">Crystallization</h2>

		<div class="crystal-card">
			<p class="crystal-tagline">Your judgment, crystallized.</p>
			<p class="crystal-description">
				Encode human expertise into configurable constraints that AI agents execute within.
				One expert's taste scales through curated autonomy—not "no humans in the loop,"
				but human judgment that shapes every decision without requiring constant presence.
			</p>
			<div class="crystal-example">
				<code>harness.config.yaml</code> → Model routing, quality gates, review pipelines
			</div>
			<a href="/patterns/crystallization" class="crystal-link">
				Explore the pattern →
			</a>
		</div>
	</div>
</section>

<!-- Featured Masters: Contemplation Over Interaction
     These cards invite dwelling, not clicking. The glow suggests interiority —
     "There's a full philosophy here; you're only seeing the surface."
     Staggered reveal honors the viewer's attention span. -->
<section class="masters-section py-24 px-6">
	<div class="max-w-7xl mx-auto">
		<h3 class="mb-12 text-center section-heading">Featured Masters</h3>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-8 highlight-grid">
			{#each [ { name: 'Dieter Rams', discipline: 'Industrial Design', tagline: '10 Principles of Good Design', slug: 'dieter-rams' }, { name: 'Ludwig Mies van der Rohe', discipline: 'Architecture', tagline: 'Less is more', slug: 'mies-van-der-rohe' } ] as master, i}
				<a href="/masters/{master.slug}" class="master-card highlight-item block p-8" style="--card-delay: {i * 150}ms; --index: {i}">
					<p class="discipline mb-4">{master.discipline}</p>
					<h4 class="master-name mb-2">{master.name}</h4>
					<p class="tagline">{master.tagline}</p>
				</a>
			{/each}
		</div>

		<div class="mt-12 text-center">
			<a href="/masters" class="view-all">
				View All Masters →
			</a>
		</div>
	</div>
</section>

<!-- Ecosystem Integration -->
<section class="ecosystem py-24 px-6">
	<div class="max-w-5xl mx-auto">
		<h3 class="mb-12 text-center">The Automation Layer Across Properties</h3>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-12 highlight-grid">
			<div class="highlight-item" style="--index: 0">
				<div class="mb-4">
					<span class="property-label">.io</span>
					<h4 class="property-title mt-1">Research</h4>
				</div>
				<p class="property-description leading-relaxed">
					We research automation infrastructure patterns. Each paper answers a specific 
					question with measurable results—feeding directly into 
					<a href="https://workway.co" class="ecosystem-link">WORKWAY</a>.
				</p>
			</div>

			<div class="highlight-item" style="--index: 1">
				<div class="mb-4">
					<span class="property-label">.space</span>
					<h4 class="property-title mt-1">Practice</h4>
				</div>
				<p class="property-description leading-relaxed">
					We teach how to build the automation layer. Experiments, exercises, 
					and patterns for infrastructure that recedes into transparent use.
				</p>
			</div>

			<div class="highlight-item" style="--index: 2">
				<div class="mb-4">
					<span class="property-label">.agency</span>
					<h4 class="property-title mt-1">Services</h4>
				</div>
				<p class="property-description leading-relaxed">
					We deliver automation infrastructure to clients. Systems that work 
					while you sleep—built on the same platform as WORKWAY.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Newsletter CTA -->
<NewsletterSignup
	headline="Canon updates and new masters"
	description="The design philosophy newsletter."
	source="ltd-homepage"
/>

<style>
	/* ==========================================================================
	   GELASSENHEIT ENTRANCE
	   "Releasement" — non-willful action that invites contemplation.
	   Elements settle into presence rather than arrive with urgency.
	   Uses decelerate easing (0, 0, 0.2, 1) so motion settles, not snaps.
	   ========================================================================== */

	.hero-entrance {
		animation: fadeInSettle var(--duration-complex) cubic-bezier(0, 0, 0.2, 1);
		animation-delay: calc(var(--delay) * var(--cascade-group));
		animation-fill-mode: both;
	}

	@keyframes fadeInSettle {
		from {
			opacity: 0;
			transform: translateY(8px); /* Minimal, not dramatic */
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-entrance {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}

	/* ==========================================================================
	   TYPOGRAPHY: Commanding presence for the philosophical foundation
	   ========================================================================== */

	h1 {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		letter-spacing: -0.02em;
		line-height: 1.1;
		color: var(--color-fg-primary);
	}

	.eyebrow {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-tertiary);
	}

	.hero-text {
		font-size: var(--text-h2);
		color: var(--color-fg-secondary);
	}

	.btn-primary {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-weight: var(--font-medium);
		transition: background var(--duration-standard) var(--ease-standard);
	}

	.btn-primary:hover {
		background: var(--color-fg-secondary);
	}

	.btn-secondary {
		padding: var(--space-sm) var(--space-md);
		border: 1px solid var(--color-border-default);
		transition: border-color var(--duration-standard) var(--ease-standard);
	}

	.btn-secondary:hover {
		border-color: var(--color-fg-primary);
	}

	/* ==========================================================================
	   MANIFESTO: Breathing Negative Space
	   Typography demonstrates the principle — constraint increases with depth.
	   Gap grows with viewport, allowing the text to breathe.
	   ========================================================================== */

	.manifesto {
		border-top: 1px solid var(--color-border-default);
	}

	.manifesto-title {
		font-size: var(--text-h2);
		font-weight: var(--font-light);
		letter-spacing: 0.05em;
		color: var(--color-fg-primary);
	}

	.manifesto-body {
		display: flex;
		flex-direction: column;
		gap: clamp(1.5rem, 5vh, 2.618rem); /* Grows with viewport — breathing */
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.manifesto-body p {
		margin: 0;
	}

	.manifesto-body strong {
		color: var(--color-fg-primary);
		font-weight: var(--font-semibold);
	}

	.attribution {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		font-style: italic;
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
		margin-top: var(--space-sm);
	}

	/* ==========================================================================
	   MASTER CARDS: Contemplation Over Interaction
	   Cards invite dwelling, not clicking. Interior glow suggests depth —
	   "There's a full philosophy here; you're only seeing the surface."
	   ========================================================================== */

	.masters-section {
		border-top: 1px solid var(--color-border-default);
	}

	.section-heading {
		font-size: var(--text-h3);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.master-card {
		/* Glass Design System - "The Automation Layer" */
		background-color: var(--glass-bg-light);
		backdrop-filter: blur(var(--glass-blur-md)) var(--glass-saturate-md);
		-webkit-backdrop-filter: blur(var(--glass-blur-md)) var(--glass-saturate-md);
		border: 1px solid var(--glass-border-light);
		box-shadow: none;
		transition:
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			background var(--duration-standard) var(--ease-standard);
		animation: cardReveal var(--duration-complex) cubic-bezier(0, 0, 0.2, 1);
		animation-delay: calc(var(--card-delay) + 600ms); /* After hero settles */
		animation-fill-mode: both;
	}

	@keyframes cardReveal {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.master-card:hover {
		transform: scale(var(--scale-micro));
		background-color: var(--glass-bg-medium);
		border-color: var(--glass-border-medium);
		box-shadow: var(--glass-shadow-sm);
	}

	.master-card:active {
		transform: scale(var(--scale-subtle));
	}

	.master-name {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.master-card:hover .master-name {
		color: var(--color-fg-secondary);
	}

	.discipline {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
	}

	.tagline {
		font-size: var(--text-body-sm);
		font-style: italic;
		color: var(--color-fg-tertiary);
	}

	@media (prefers-reduced-motion: reduce) {
		.master-card {
			animation: none;
			opacity: 1;
		}
	}

	.view-all {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-tertiary);
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.view-all:hover {
		color: var(--color-fg-primary);
	}

	.ecosystem {
		border-top: 1px solid var(--color-border-default);
	}

	.property-label {
		font-size: var(--text-caption);
		font-family: monospace;
		color: var(--color-fg-muted);
	}

	.property-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
	}

	.property-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.ecosystem-link {
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.ecosystem-link:hover {
		color: var(--color-fg-primary);
	}

	/* ==========================================================================
	   CRYSTALLIZATION: Featured Pattern
	   ========================================================================== */

	.crystallization {
		border-top: 1px solid var(--color-border-default);
	}

	.crystal-card {
		padding: var(--space-xl);
		/* Glass Design System - "The Automation Layer" */
		background-color: var(--glass-bg-light);
		backdrop-filter: blur(var(--glass-blur-lg)) var(--glass-saturate-lg);
		-webkit-backdrop-filter: blur(var(--glass-blur-lg)) var(--glass-saturate-lg);
		border: 1px solid var(--glass-border-light);
		text-align: center;
	}

	.crystal-tagline {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.crystal-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		max-width: 600px;
		margin: 0 auto var(--space-lg);
	}

	.crystal-example {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-lg);
	}

	.crystal-example code {
		font-family: monospace;
		color: var(--color-fg-tertiary);
		background: var(--color-bg-elevated);
		padding: 0.25em 0.5em;
		border-radius: var(--radius-sm);
	}

	.crystal-link {
		display: inline-block;
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		padding: var(--space-sm) var(--space-md);
		border: 1px solid var(--color-border-default);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.crystal-link:hover {
		transform: scale(var(--scale-micro));
		border-color: var(--color-fg-primary);
		background: var(--color-bg-elevated);
	}

	.crystal-link:active {
		transform: scale(var(--scale-subtle));
	}
</style>
