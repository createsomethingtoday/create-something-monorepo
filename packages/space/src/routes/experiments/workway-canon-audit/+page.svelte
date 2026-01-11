<script lang="ts">
	/**
	 * WORKWAY SDK: The Hermeneutic Circle in Practice
	 *
	 * Applying Dieter Rams' 10 Principles to integration SDK development.
	 * Score improved from 41/50 to 48/50 through iterative implementation.
	 *
	 * "The circle closes: implementation reveals what documentation cannot."
	 */

	const workwayRepo = 'https://github.com/WORKWAYCO/WORKWAY';
</script>

<svelte:head>
	<title>WORKWAY Canon Audit | CREATE SOMETHING SPACE</title>
	<meta name="description" content="Applying Dieter Rams' 10 Principles to SDK development. The hermeneutic circle in practice." />
</svelte:head>

<!-- ASCII Art Hero -->
<section class="relative pt-24 pb-8 px-6">
	<div class="max-w-4xl mx-auto">
		<div class="ascii-container overflow-hidden">
			<div class="aspect-[21/9] flex items-center justify-center p-8">
				<pre class="ascii-art leading-[1.3] font-mono select-none">{`
    +-------------------------------------------------+
    |   WORKWAY SDK CANON AUDIT                       |
    |                                                 |
    |   Pre-understanding    Emergent understanding   |
    |   (README)             (Implementation)         |
    |                                                 |
    |        |                      |                 |
    |        v                      v                 |
    |   ActionResult  ──────►  DX Helpers             |
    |   IntegrationError ───►  Error Taxonomy         |
    |   Timeout ────────────►  AbortController        |
    |   Retry ──────────────►  Exponential Backoff    |
    |                                                 |
    |   Score: 41/50 ──────────────────► 48/50        |
    |                                                 |
    |   "The circle closes: implementation            |
    |    reveals what documentation cannot."          |
    +-------------------------------------------------+
`}</pre>
			</div>
		</div>
	</div>
</section>

<!-- Hero -->
<section class="relative pb-12 px-6">
	<div class="max-w-4xl mx-auto text-center space-y-4">
		<h1 class="hero-title">WORKWAY SDK</h1>
		<p class="hero-subtitle italic">The Hermeneutic Circle in Practice</p>
		<p class="hero-description max-w-2xl mx-auto">
			Applying Dieter Rams' 10 Principles to integration SDK development. The canon doesn't exist
			in isolation—it's validated through practice.
		</p>
	</div>
</section>

<!-- Score Summary -->
<section class="px-6 pb-12">
	<div class="max-w-4xl mx-auto">
		<div class="metric-card p-6">
			<div class="grid md:grid-cols-3 gap-6 text-center">
				<div>
					<div class="metric-value-old">41/50</div>
					<div class="metric-label">Initial Score</div>
				</div>
				<div>
					<div class="metric-value-success">48/50</div>
					<div class="metric-label">Final Score</div>
				</div>
				<div>
					<div class="metric-value">+7</div>
					<div class="metric-label">Improvement</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- The Experiment -->
<section class="px-6 pb-12">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- The Hermeneutic Insight -->
		<div class="content-card p-6 space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="section-title">The Hermeneutic Insight</h2>
				<span class="label-text">ALETHEIA</span>
			</div>
			<p class="body-text leading-relaxed">
				The README represented <strong class="emphasis-text">pre-understanding</strong>—how we thought
				the SDK worked. But through building concrete integrations (Gmail, Slack, Stripe, Notion,
				GoogleSheets), a different understanding emerged.
			</p>
			<p class="caption-text">
				This is the hermeneutic circle: the whole (SDK architecture) is understood through the
				parts (individual integrations), and the parts are understood through the whole. Each
				iteration deepens understanding.
			</p>
		</div>

		<!-- What Emerged -->
		<div class="content-card p-6 space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="section-title">What Emerged Through Praxis</h2>
				<span class="label-text">EMERGENT UNDERSTANDING</span>
			</div>

			<div class="space-y-4">
				<div class="insight-card p-4 space-y-2">
					<h3 class="insight-title font-medium">ActionResult.error Structure</h3>
					<p class="caption-text">
						The README didn't capture that <code class="code-text">result.error</code> is an
						object <code class="code-text">{`{ message, code }`}</code>, not a string. Tests
						revealed this gotcha. DX helpers were added.
					</p>
				</div>

				<div class="insight-card p-4 space-y-2">
					<h3 class="insight-title font-medium">Timeout Patterns</h3>
					<p class="caption-text">
						No timeout handling existed. Through implementation, the AbortController pattern emerged
						as the canonical solution.
					</p>
				</div>

				<div class="insight-card p-4 space-y-2">
					<h3 class="insight-title font-medium">Retry Logic</h3>
					<p class="caption-text">
						Critical for production use. Exponential backoff with jitter, rate limit awareness—none
						of this was documented because it only emerged through building real integrations.
					</p>
				</div>

				<div class="insight-card p-4 space-y-2">
					<h3 class="insight-title font-medium">Capabilities Honesty</h3>
					<p class="caption-text">
						Gmail claimed <code class="code-text">canHandleAttachments: true</code> but didn't
						implement it. The Canon (Principle 6: Honest) required correction.
					</p>
				</div>
			</div>
		</div>

		<!-- Principle Scores -->
		<div class="content-card p-6 space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="section-title">Rams' Principles Applied</h2>
				<span class="label-text">CANON</span>
			</div>

			<div class="space-y-3">
				{#each [
					{ n: 1, name: 'Innovative', prev: 5, curr: 5, note: 'Two-layer architecture remains novel' },
					{ n: 2, name: 'Useful', prev: 4, curr: 5, note: 'DX helpers added' },
					{ n: 3, name: 'Aesthetic', prev: 4, curr: 5, note: 'Consistent 80-char dividers' },
					{ n: 4, name: 'Understandable', prev: 4, curr: 5, note: 'DEVELOPERS.md created' },
					{ n: 5, name: 'Unobtrusive', prev: 5, curr: 5, note: 'Tool recedes' },
					{ n: 6, name: 'Honest', prev: 3, curr: 5, note: 'Fixed capabilities overstatement' },
					{ n: 7, name: 'Long-lasting', prev: 4, curr: 5, note: 'Retry + timeout patterns' },
					{ n: 8, name: 'Thorough', prev: 3, curr: 4, note: '42 tests, more needed' },
					{ n: 9, name: 'Env. Friendly', prev: 5, curr: 5, note: 'Edge-native' },
					{ n: 10, name: 'As Little As Possible', prev: 4, curr: 4, note: 'Could simplify further' }
				] as principle}
					<div class="principle-row flex items-center gap-4 p-3">
						<div class="principle-number w-8">{principle.n}.</div>
						<div class="principle-name flex-1">{principle.name}</div>
						<div class="principle-score-old">{principle.prev}/5</div>
						<div class="principle-arrow">→</div>
						<div
							class="principle-score-current"
							class:improved={principle.curr > principle.prev}
						>
							{principle.curr}/5
						</div>
						<div class="principle-note hidden md:block max-w-48 truncate">{principle.note}</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Critical Fixes -->
		<div class="content-card p-6 space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="section-title">Critical Violations Addressed</h2>
				<span class="label-text">REMEDIATION</span>
			</div>

			<!-- Mobile Card Layout -->
			<div class="responsive-table-cards">
				{#each [
					{ violation: 'No retry logic', fix: 'retry.ts with exponential backoff', code: true },
					{ violation: 'Capabilities overstatement', fix: 'Honest declarations in Gmail, Stripe', code: false },
					{ violation: 'No request timeout', fix: 'AbortController in all 5 integrations', code: false },
					{ violation: 'No webhook tests', fix: '42 tests (Stripe + template)', code: false },
					{ violation: 'Type conflicts', fix: 'Removed duplicate definitions', code: false }
				] as item}
					<div class="violation-card">
						<div class="violation-card-header">
							<span class="violation-status">✗</span>
							<span class="violation-title">{item.violation}</span>
						</div>
						<div class="violation-fix">
							<span class="violation-fix-label">Fix:</span>
							{#if item.code}
								<code class="code-text-muted">{item.fix}</code>
							{:else}
								<span>{item.fix}</span>
							{/if}
						</div>
						<div class="violation-resolved">
							<span class="violation-resolved-status">✓</span>
							<span>Resolved</span>
						</div>
					</div>
				{/each}
			</div>

			<!-- Desktop Table Layout -->
			<div class="responsive-table-wrapper">
				<table class="data-table w-full">
					<thead>
						<tr class="table-header">
							<th class="pb-2">Violation</th>
							<th class="pb-2">Fix</th>
							<th class="pb-2">Status</th>
						</tr>
					</thead>
					<tbody class="table-body">
						<tr class="table-row">
							<td class="py-2">No retry logic</td>
							<td class="py-2"><code class="code-text-muted">retry.ts</code> with exponential backoff</td>
							<td class="py-2"><span class="status-resolved">✓ Resolved</span></td>
						</tr>
						<tr class="table-row">
							<td class="py-2">Capabilities overstatement</td>
							<td class="py-2">Honest declarations in Gmail, Stripe</td>
							<td class="py-2"><span class="status-resolved">✓ Resolved</span></td>
						</tr>
						<tr class="table-row">
							<td class="py-2">No request timeout</td>
							<td class="py-2">AbortController in all 5 integrations</td>
							<td class="py-2"><span class="status-resolved">✓ Resolved</span></td>
						</tr>
						<tr class="table-row">
							<td class="py-2">No webhook tests</td>
							<td class="py-2">42 tests (Stripe + template)</td>
							<td class="py-2"><span class="status-resolved">✓ Resolved</span></td>
						</tr>
						<tr class="table-row-last">
							<td class="py-2">Type conflicts</td>
							<td class="py-2">Removed duplicate definitions</td>
							<td class="py-2"><span class="status-resolved">✓ Resolved</span></td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- The Circle Closes -->
		<div class="content-card p-6 space-y-4">
			<h2 class="section-title">The Circle Closes</h2>
			<p class="body-text leading-relaxed">
				Pre-understanding (README) described <em>what</em> the SDK does. Emergent understanding
				(DEVELOPERS.md) describes <em>how to build with it</em>—the practical knowledge that only
				emerges through praxis.
			</p>
			<p class="caption-text">
				This is the hermeneutic circle applied to software: implementation reveals what
				documentation cannot. The canon is not static dogma but living philosophy, validated and
				refined through practice.
			</p>
		</div>

		<!-- Links -->
		<div class="flex flex-wrap gap-4 justify-center">
			<a
				href={workwayRepo}
				target="_blank"
				rel="noopener noreferrer"
				class="cta-button px-6 py-3 font-medium transition-colors"
			>
				View Repository
			</a>
			<a
				href="/experiments"
				class="secondary-button px-6 py-3 font-medium transition-colors"
			>
				All Experiments
			</a>
		</div>
	</div>
</section>

<style>
  .ascii-container {
    background: var(--color-bg-pure);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .ascii-art {
    color: var(--color-fg-secondary);
    font-size: clamp(0.6rem, 1.5vw, 0.875rem);
  }

  .hero-title {
    font-size: var(--text-h1);
    font-weight: 700;
    color: var(--color-fg-primary);
  }

  .hero-subtitle {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
  }

  .hero-description {
    color: var(--color-fg-muted);
  }

  .metric-card {
    background: var(--color-hover);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
  }

  .metric-value-old {
    font-size: var(--text-h1);
    font-weight: 700;
    color: var(--color-fg-muted);
  }

  .metric-value-success {
    font-size: var(--text-h1);
    font-weight: 700;
    color: var(--color-success);
  }

  .metric-value {
    font-size: var(--text-h1);
    font-weight: 700;
    color: var(--color-fg-primary);
  }

  .metric-label {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .content-card {
    background: var(--color-hover);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
  }

  .section-title {
    font-size: var(--text-h3);
    font-weight: 700;
    color: var(--color-fg-primary);
  }

  .label-text {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .body-text {
    color: var(--color-fg-tertiary);
  }

  .caption-text {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .emphasis-text {
    color: var(--color-fg-primary);
  }

  .code-text {
    color: var(--color-fg-tertiary);
  }

  .code-text-muted {
    color: var(--color-fg-muted);
  }

  .insight-card {
    background: var(--color-bg-pure);
    border-radius: var(--radius-md);
  }

  .insight-title {
    color: var(--color-fg-primary);
  }

  .cta-button {
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    border-radius: var(--radius-md);
  }

  .cta-button:hover {
    opacity: 0.9;
  }

  .secondary-button {
    border: 1px solid var(--color-border-emphasis);
    color: var(--color-fg-primary);
    border-radius: var(--radius-md);
  }

  .secondary-button:hover {
    background: var(--color-active);
  }

  .principle-row {
    background: var(--color-bg-pure);
    border-radius: var(--radius-md);
  }

  .principle-number {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .principle-name {
    color: var(--color-fg-primary);
    font-size: var(--text-body-sm);
  }

  .principle-score-old {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .principle-arrow {
    color: var(--color-fg-subtle);
  }

  .principle-score-current {
    font-size: var(--text-body-sm);
    font-weight: 500;
    color: var(--color-fg-primary);
  }

  .principle-score-current.improved {
    color: var(--color-success);
  }

  .principle-note {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
  }

  .data-table {
    font-size: var(--text-body-sm);
  }

  .table-header {
    text-align: left;
    color: var(--color-fg-muted);
    border-bottom: 1px solid var(--color-border-default);
  }

  .table-body {
    color: var(--color-fg-tertiary);
  }

  .table-row {
    border-bottom: 1px solid var(--color-border-default);
  }

  /* Status indicator */
  .status-resolved {
    color: var(--color-success);
    font-size: var(--text-body-sm);
  }

  /* Responsive table pattern */
  .responsive-table-cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .responsive-table-wrapper {
    display: none;
  }

  @media (min-width: 768px) {
    .responsive-table-cards {
      display: none;
    }

    .responsive-table-wrapper {
      display: block;
    }
  }

  /* Violation card styles */
  .violation-card {
    padding: var(--space-md);
    background: var(--color-bg-pure);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
  }

  .violation-card-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-sm);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--color-border-default);
  }

  .violation-status {
    color: var(--color-error);
    font-weight: 600;
    font-size: var(--text-body-lg);
  }

  .violation-title {
    font-weight: 600;
    color: var(--color-fg-primary);
    font-size: var(--text-body);
  }

  .violation-fix {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: var(--space-sm);
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
  }

  .violation-fix-label {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
  }

  .violation-resolved {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding-top: var(--space-sm);
    border-top: 1px solid var(--color-border-default);
    font-size: var(--text-body-sm);
    color: var(--color-success);
  }

  .violation-resolved-status {
    font-weight: 600;
  }
</style>
