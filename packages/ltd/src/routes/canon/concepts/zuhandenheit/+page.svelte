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
	<p class="concept-translation">German: "Ready-to-hand" — when tools disappear into use</p>
</header>

<section class="concept-section">
	<h2>The Test</h2>
	<blockquote class="test-block">
		<p>"Does this get out of the way, or demand attention?"</p>
	</blockquote>
	<p>
		If people notice the design, something's wrong. Success means the work gets done and the tool is forgotten.
	</p>
</section>

<section class="concept-section">
	<h2>What It Means</h2>
	<p>
		Think about using a hammer. When it works well, you don't think about the hammer—you think about the nail. The tool disappears from your awareness.
	</p>
	<p>
		Only when the hammer breaks or feels too heavy do you suddenly notice it. That shift from invisible to visible is what we're trying to prevent. Good design means infrastructure that disappears, leaving only the work.
	</p>
</section>

<section class="concept-section">
	<h2>Where You'll See This</h2>
	<p>
		This guides every Canon design decision:
	</p>

	<div class="manifestation-grid">
		<div class="manifestation">
			<h3>Infrastructure</h3>
			<p>
				When deployment works, you don't think about deployment. Cloudflare Workers, databases, storage—all invisible during normal use.
			</p>
		</div>

		<div class="manifestation">
			<h3>Components</h3>
			<p>
				If a button makes you think about styling, it's failed. Canon components work without checking documentation.
			</p>
		</div>

		<div class="manifestation">
			<h3>AI Partnership</h3>
			<p>
				At its best, you don't notice Claude Code. The code appears, the commit happens, the deployment succeeds. Just the work remains.
			</p>
		</div>

		<div class="manifestation">
			<h3>Motion</h3>
			<p>
				Animation that draws attention has failed. Motion should guide your eye, not demand your focus.
			</p>
		</div>
	</div>
</section>

<section class="concept-section">
	<h2>Working vs. Broken</h2>
	<p>
		Two states. One is success, one signals failure:
	</p>

	<div class="comparison-table">
		<div class="mode ready">
			<h3>Zuhandenheit</h3>
			<p class="mode-translation">Ready-to-hand (working)</p>
			<ul>
				<li>Tool fades into background</li>
				<li>You focus on the work</li>
				<li>The tool is invisible</li>
				<li>This is the goal</li>
			</ul>
		</div>
		<div class="mode present">
			<h3>Vorhandenheit</h3>
			<p class="mode-translation">Present-at-hand (broken)</p>
			<ul>
				<li>Tool demands attention</li>
				<li>You focus on the tool</li>
				<li>Something went wrong</li>
				<li>Failure reveals hidden assumptions</li>
			</ul>
		</div>
	</div>

	<p>
		When you notice the tool, you've shifted from ready-to-hand to present-at-hand. The breakdown shows you what was hidden.
	</p>
</section>

<section class="concept-section">
	<h2>Three Ways Tools Break Down</h2>
	<p>
		Breakdowns are useful—they reveal what you couldn't see before:
	</p>

	<ul class="breakdown-list">
		<li>
			<strong>It breaks</strong> — A component throws an error. Now you see the dependencies you forgot about.
		</li>
		<li>
			<strong>It's missing</strong> — You reach for a feature that doesn't exist. Now you see your assumptions.
		</li>
		<li>
			<strong>It doesn't fit</strong> — The component exists but doesn't match your needs. Now you see the gap between design and reality.
		</li>
	</ul>

	<p>
		The goal: fix it so the tool disappears again. See <a href="/patterns/breakdown-and-repair">Breakdown and Repair</a> for more.
	</p>
</section>

<section class="concept-section">
	<h2>What Gets in the Way</h2>
	<p>
		These patterns break transparent use:
	</p>

	<ul class="antipattern-list">
		<li>
			<strong>Decorative complexity</strong> — Animations that show off. UI flourishes with no purpose. Every ornament is a tiny breakdown.
		</li>
		<li>
			<strong>Cognitive load</strong> — Needing documentation for basic tasks. Too many options demanding decisions.
		</li>
		<li>
			<strong>Inconsistency</strong> — Different patterns in different places. You have to stop and think: which one applies here?
		</li>
		<li>
			<strong>Unreliability</strong> — Tools that sometimes work. When you can't trust it, you're always watching it.
		</li>
	</ul>
</section>

<section class="concept-section references">
	<h2>The Philosophy</h2>
	<p>
		Martin Heidegger introduced <em>Zuhandenheit</em> (ready-to-hand) in <em>Being and Time</em> (1927). His insight: we don't first encounter things as objects to study—we encounter them as equipment to use. The theoretical view comes later, usually after something breaks.
	</p>
	<h3>Further Reading</h3>
	<ul class="reference-list">
		<li>
			Heidegger, Martin. <em>Being and Time</em>. Trans. Macquarrie & Robinson. Harper & Row, 1962. §15-18.
		</li>
		<li>
			Dreyfus, Hubert. <em>Being-in-the-World</em>. MIT Press, 1991.
		</li>
		<li>
			<a href="/canon/concepts/vorhandenheit">Canon Concept: Vorhandenheit</a>
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
