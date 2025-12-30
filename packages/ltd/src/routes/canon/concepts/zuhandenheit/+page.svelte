<script lang="ts">
	// Zuhandenheit - Canonical Definition
	// Heidegger's concept of ready-to-hand, foundational to Canon design
</script>

<svelte:head>
	<title>Zuhandenheit — Canon Concepts</title>
	<meta
		name="description"
		content="'Ready-to-hand' - Heidegger's concept of tools that recede into transparent use."
	/>
</svelte:head>

<header class="concept-header">
	<span class="concept-label">Concept</span>
	<h1 class="concept-title">Zuhandenheit</h1>
	<p class="concept-pronunciation">/ˈtsuːhandn̩haɪt/</p>
	<p class="concept-translation">German: "Ready-to-hand" (literally: "to-hand-ness")</p>
</header>

<section class="concept-section">
	<h2>Definition</h2>
	<blockquote class="definition-block">
		<p>
			The mode of being in which tools recede into transparent use. When working well,
			the hammer disappears—only the hammering remains. The tool is not noticed; the work
			is accomplished. This is the goal of all Canon design: infrastructure that disappears,
			leaving only the work.
		</p>
	</blockquote>
</section>

<section class="concept-section">
	<h2>Origin</h2>
	<p>
		Martin Heidegger introduced <em>Zuhandenheit</em> in <em>Being and Time</em> (1927) as
		part of his phenomenological analysis of everyday existence. For Heidegger, we don't
		primarily encounter things as objects to be studied (present-at-hand) but as equipment
		to be used (ready-to-hand).
	</p>
	<p>
		The carpenter doesn't think about the hammer—she thinks about the nail. The hammer
		withdraws into the act of hammering. Only when the hammer breaks or proves too heavy
		does it become an object of attention. This withdrawal-into-use is Zuhandenheit.
	</p>
</section>

<section class="concept-section">
	<h2>In Canon</h2>
	<p>
		Zuhandenheit is the design criterion for every Canon decision:
	</p>

	<div class="manifestation-grid">
		<div class="manifestation">
			<h3>Infrastructure</h3>
			<p>
				Cloudflare Workers, D1 databases, KV stores—all should be invisible during normal
				operation. When deployment works, you don't think about deployment.
			</p>
		</div>

		<div class="manifestation">
			<h3>Components</h3>
			<p>
				A button that requires thought about styling has failed. Canon components should
				be used without consulting documentation for basic operations.
			</p>
		</div>

		<div class="manifestation">
			<h3>AI Partnership</h3>
			<p>
				Claude Code at its best is not noticed. The code appears; the commit happens;
				the deployment succeeds. The tool recedes; the work remains.
			</p>
		</div>

		<div class="manifestation">
			<h3>Motion</h3>
			<p>
				Animation that draws attention to itself has failed. Motion should guide attention,
				not demand it. 200ms, one easing curve, purposeful transitions.
			</p>
		</div>
	</div>
</section>

<section class="concept-section">
	<h2>Zuhandenheit vs. Vorhandenheit</h2>
	<p>
		These two modes form a complementary pair:
	</p>

	<div class="comparison-table">
		<div class="mode ready">
			<h3>Zuhandenheit</h3>
			<p class="mode-translation">Ready-to-hand</p>
			<ul>
				<li>Tool withdraws into use</li>
				<li>Engaged, practical involvement</li>
				<li>The work matters, not the tool</li>
				<li>Primordial mode of being</li>
				<li>Success state</li>
			</ul>
		</div>
		<div class="mode present">
			<h3>Vorhandenheit</h3>
			<p class="mode-translation">Present-at-hand</p>
			<ul>
				<li>Tool becomes object of attention</li>
				<li>Detached, theoretical observation</li>
				<li>The tool matters, not the work</li>
				<li>Derived mode (from breakdown)</li>
				<li>Failure state (in design)</li>
			</ul>
		</div>
	</div>

	<p>
		Heidegger argued that Western philosophy overvalued Vorhandenheit—treating everything
		as objects for detached study. But our primary relationship with the world is
		Zuhandenheit: engaged, practical, tool-using. Canon design returns us to this primordial
		mode.
	</p>
</section>

<section class="concept-section">
	<h2>Breakdown and Repair</h2>
	<p>
		Zuhandenheit reveals itself through its absence. When a tool breaks, becomes missing,
		or proves unsuitable, it shifts from ready-to-hand to present-at-hand. We suddenly
		notice what was previously invisible.
	</p>
	<p>
		Canon treats breakdowns as information:
	</p>

	<ul class="breakdown-list">
		<li>
			<strong>Conspicuousness</strong> — The tool breaks. A component throws an error.
			This reveals dependencies we hadn't noticed.
		</li>
		<li>
			<strong>Obtrusiveness</strong> — The tool is missing. A feature we assumed exists
			doesn't. This reveals our assumptions.
		</li>
		<li>
			<strong>Obstinacy</strong> — The tool doesn't fit. The component doesn't match the
			use case. This reveals the gap between design and reality.
		</li>
	</ul>

	<p>
		The goal of repair is not just to fix the tool but to restore Zuhandenheit—to make
		the tool disappear again into transparent use.
	</p>
</section>

<section class="concept-section">
	<h2>The Zuhandenheit Test</h2>
	<p>
		When evaluating any design decision, ask:
	</p>

	<blockquote class="test-block">
		<p>"Does this recede into use, or demand attention?"</p>
	</blockquote>

	<p>
		If users notice the design, the tool, the infrastructure—something has failed.
		Success is invisibility. The work gets done; the means are forgotten.
	</p>
</section>

<section class="concept-section">
	<h2>Anti-Patterns</h2>
	<p>
		What prevents Zuhandenheit:
	</p>

	<ul class="antipattern-list">
		<li>
			<strong>Decorative complexity</strong> — Animation that seeks attention. UI flourishes
			that have no function. Every ornament is a small breakdown.
		</li>
		<li>
			<strong>Cognitive load</strong> — Documentation required for basic use. Options that
			demand decisions. Every question is a moment of presence-at-hand.
		</li>
		<li>
			<strong>Inconsistency</strong> — Different patterns in different places. The user
			must think about which pattern applies here.
		</li>
		<li>
			<strong>Unreliability</strong> — Tools that sometimes work. Intermittent failure
			creates perpetual anxiety—the tool never fully recedes.
		</li>
	</ul>
</section>

<section class="concept-section references">
	<h2>References</h2>
	<ul class="reference-list">
		<li>
			Heidegger, Martin. <em>Being and Time</em>. Trans. Macquarrie & Robinson. New York: Harper & Row, 1962. §15-18.
		</li>
		<li>
			Dreyfus, Hubert. <em>Being-in-the-World: A Commentary on Heidegger's Being and Time, Division I</em>. MIT Press, 1991.
		</li>
		<li>
			<a href="/canon/concepts/vorhandenheit">Canon Concept: Vorhandenheit</a>
		</li>
		<li>
			<a href="/canon/foundations/philosophy">Canon Foundations: Philosophy</a>
		</li>
		<li>
			<a href="/patterns/breakdown-and-repair">Pattern: Breakdown and Repair</a>
		</li>
	</ul>
</section>

<style>
	/* Header */
	.concept-header {
		margin-bottom: var(--space-xl);
		padding-bottom: var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.concept-label {
		display: inline-block;
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
		margin-bottom: var(--space-xs);
	}

	.concept-title {
		font-size: var(--text-display);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-tight);
		margin-bottom: var(--space-xs);
		font-style: italic;
	}

	.concept-pronunciation {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-xs);
	}

	.concept-translation {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	/* Sections */
	.concept-section {
		margin-bottom: var(--space-xl);
	}

	.concept-section h2 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		letter-spacing: var(--tracking-tight);
	}

	.concept-section h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.concept-section p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-md);
	}

	.concept-section p:last-child {
		margin-bottom: 0;
	}

	/* Definition block */
	.definition-block {
		padding: var(--space-lg);
		background: var(--color-bg-subtle);
		border-left: 3px solid var(--color-fg-primary);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		margin: 0;
	}

	.definition-block p {
		font-size: var(--text-body-lg);
		color: var(--color-fg-primary);
		margin: 0;
	}

	/* Manifestation grid */
	.manifestation-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-md);
		margin-top: var(--space-md);
	}

	.manifestation {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.manifestation p {
		font-size: var(--text-body-sm);
		margin: 0;
	}

	/* Comparison table */
	.comparison-table {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
		margin: var(--space-md) 0;
	}

	@media (max-width: 600px) {
		.comparison-table {
			grid-template-columns: 1fr;
		}
	}

	.mode {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.mode.ready {
		border-top: 3px solid var(--color-success);
	}

	.mode.present {
		border-top: 3px solid var(--color-warning);
	}

	.mode-translation {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-style: italic;
		margin-bottom: var(--space-sm);
	}

	.mode ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.mode li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.mode li:last-child {
		border-bottom: none;
	}

	/* Breakdown list */
	.breakdown-list {
		list-style: none;
		padding: 0;
	}

	.breakdown-list li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
		padding-left: var(--space-md);
		border-left: 2px solid var(--color-warning);
	}

	/* Antipattern list */
	.antipattern-list {
		list-style: none;
		padding: 0;
	}

	.antipattern-list li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
		padding-left: var(--space-md);
		border-left: 2px solid var(--color-border-emphasis);
	}

	/* Test block */
	.test-block {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-align: center;
		margin: var(--space-md) 0;
	}

	.test-block p {
		font-size: var(--text-h3);
		font-style: italic;
		color: var(--color-fg-primary);
		margin: 0;
	}

	/* References */
	.references {
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.reference-list {
		list-style: none;
		padding: 0;
	}

	.reference-list li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-sm);
	}

	.reference-list a {
		color: var(--color-fg-secondary);
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.reference-list a:hover {
		color: var(--color-fg-primary);
	}
</style>
