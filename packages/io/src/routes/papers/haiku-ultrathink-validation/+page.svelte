<script lang="ts">
	/**
	 * Haiku + Ultrathink Validation
	 *
	 * Testing whether Haiku 4.5 with extended thinking achieves
	 * near-Sonnet performance at 10% of the cost.
	 */
	import { SEO } from '@create-something/canon';
</script>

<SEO
	title="Haiku + Ultrathink Validation"
	description="Empirical validation of Haiku 4.5 + ultrathink achieving near-Sonnet performance at fraction of cost."
	keywords="Haiku 4.5, ultrathink, extended thinking, cost optimization, Claude, Sonnet comparison"
	ogType="article"
	articleSection="Research"
	publishedTime="2026-01-01T00:00:00Z"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Papers', url: 'https://createsomething.io/papers' },
		{ name: 'Haiku + Ultrathink Validation', url: 'https://createsomething.io/papers/haiku-ultrathink-validation' }
	]}
/>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-003</div>
			<h1 class="mb-3 paper-title">Haiku + Ultrathink Validation</h1>
			<p class="max-w-3xl paper-subtitle">
				Can extended thinking mode close the gap between Haiku and Sonnet? An empirical test of
				the community claim that Haiku 4.5 + ultrathink achieves ~90% of Sonnet's performance at
				10% of the cost.
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Experiment</span>
				<span>•</span>
				<span>Proposed</span>
				<span>•</span>
				<span>Technical</span>
			</div>
		</div>

		<!-- Status Notice -->
		<section class="p-6 comparison-warning">
			<h3 class="mb-3 comparison-heading comparison-warning-heading">📋 Experiment Status</h3>
			<p class="leading-relaxed body-text">
				This paper documents a <strong>proposed experiment</strong> to validate community claims about
				Haiku 4.5 + ultrathink performance. Results will be added as the experiment progresses.
			</p>
			<p class="mt-3 body-text">
				<strong>Expected completion</strong>: January 2026
			</p>
		</section>

		<!-- Abstract -->
		<section class="pl-6 space-y-4 abstract-section">
			<h2 class="section-heading">Abstract</h2>
			<p class="leading-relaxed body-text">
				Community reports suggest Haiku 4.5 with extended thinking ("ultrathink") achieves
				approximately 90% of Sonnet 4.5's performance on planning and refactoring tasks while
				maintaining Haiku's 10x cost advantage. If true, this unlocks a powerful middle tier for
				model routing: reserve Sonnet for multi-file coordination and Opus for architecture, but
				use Haiku + ultrathink for the majority of development work. This experiment tests the
				claim empirically across 10 tasks spanning trivial to complex complexity, measuring quality
				match, cost savings, and time overhead. Success criteria: ≥85% quality match, ≥85% cost
				savings, ≤150% time overhead.
			</p>
		</section>

		<!-- The Claim -->
		<section class="p-6 quote-box">
			<div class="text-center">
				<p class="mb-4 font-bold stat-large">The Community Claim</p>
				<p class="body-text">
					Haiku 4.5 + ultrathink achieves ~90% of Sonnet's performance<br />
					At 10% of the cost (Haiku: ~$0.001, Sonnet: ~$0.01)<br />
					4-5x faster execution
				</p>
			</div>
		</section>

		<!-- Section I: The Hypothesis -->
		<section class="space-y-6">
			<h2 class="section-heading">I. The Hypothesis</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Extended thinking mode (ultrathink) fundamentally changes Haiku's capabilities. Where
					standard Haiku excels at pattern matching and simple execution, ultrathink enables:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Multi-step reasoning</li>
					<li>Complex planning</li>
					<li>Debugging loops</li>
					<li>Architecture decisions</li>
				</ul>

				<p class="mt-4">
					If validated, this means most development work can use Haiku + ultrathink, reserving
					Sonnet only for multi-file coordination and Opus for deep architecture review.
				</p>

				<h3 class="mt-6 subsection-heading">Three Hypotheses</h3>

				<div class="grid md:grid-cols-3 gap-4 mt-4">
					<div class="p-4 comparison-success">
						<h4 class="mb-2 comparison-heading comparison-success-heading">H1: Quality</h4>
						<p class="comparison-list">
							Haiku + ultrathink achieves ≥85% quality match vs Sonnet on planning/refactoring tasks
						</p>
					</div>

					<div class="p-4 comparison-success">
						<h4 class="mb-2 comparison-heading comparison-success-heading">H2: Cost</h4>
						<p class="comparison-list">
							Haiku + ultrathink costs ≤15% of Sonnet for equivalent work (≥85% savings)
						</p>
					</div>

					<div class="p-4 comparison-success">
						<h4 class="mb-2 comparison-heading comparison-success-heading">H3: Speed</h4>
						<p class="comparison-list">
							Haiku + ultrathink completes in ≤150% of Sonnet's time (acceptable if quality holds)
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Section II: Test Design -->
		<section class="space-y-6">
			<h2 class="section-heading">II. Test Design</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">Task Selection</h3>

				<p>Ten tasks spanning trivial to complex complexity:</p>

				<div class="overflow-x-auto">
					<table class="w-full mt-4 data-table">
						<thead>
							<tr class="border-b" style="border-color: var(--color-border-default)">
								<th class="p-3 text-left">ID</th>
								<th class="p-3 text-left">Type</th>
								<th class="p-3 text-left">Complexity</th>
								<th class="p-3 text-left">Description</th>
							</tr>
						</thead>
						<tbody>
							<tr class="border-b" style="border-color: var(--color-border-default)">
								<td class="p-3 font-mono">T1</td>
								<td class="p-3">Refactor</td>
								<td class="p-3">Trivial</td>
								<td class="p-3">Extract duplicate validation logic</td>
							</tr>
							<tr class="border-b" style="border-color: var(--color-border-default)">
								<td class="p-3 font-mono">T2</td>
								<td class="p-3">Feature</td>
								<td class="p-3">Simple</td>
								<td class="p-3">Add pagination to existing list</td>
							</tr>
							<tr class="border-b" style="border-color: var(--color-border-default)">
								<td class="p-3 font-mono">T3</td>
								<td class="p-3">Bug fix</td>
								<td class="p-3">Simple</td>
								<td class="p-3">Fix TypeScript type errors</td>
							</tr>
							<tr class="border-b" style="border-color: var(--color-border-default)">
								<td class="p-3 font-mono">T4</td>
								<td class="p-3">Refactor</td>
								<td class="p-3">Standard</td>
								<td class="p-3">Restructure auth module (DRY violations)</td>
							</tr>
							<tr class="border-b" style="border-color: var(--color-border-default)">
								<td class="p-3 font-mono">T5</td>
								<td class="p-3">Feature</td>
								<td class="p-3">Standard</td>
								<td class="p-3">Add caching layer to API</td>
							</tr>
							<tr class="border-b" style="border-color: var(--color-border-default)">
								<td class="p-3 font-mono">T6</td>
								<td class="p-3">Planning</td>
								<td class="p-3">Standard</td>
								<td class="p-3">Design database migration strategy</td>
							</tr>
							<tr class="border-b" style="border-color: var(--color-border-default)">
								<td class="p-3 font-mono">T7</td>
								<td class="p-3">Debug</td>
								<td class="p-3">Standard</td>
								<td class="p-3">Fix intermittent test failures</td>
							</tr>
							<tr class="border-b" style="border-color: var(--color-border-default)">
								<td class="p-3 font-mono">T8</td>
								<td class="p-3">Refactor</td>
								<td class="p-3">Complex</td>
								<td class="p-3">Extract shared business logic (5 files)</td>
							</tr>
							<tr class="border-b" style="border-color: var(--color-border-default)">
								<td class="p-3 font-mono">T9</td>
								<td class="p-3">Feature</td>
								<td class="p-3">Complex</td>
								<td class="p-3">Implement OAuth flow with PKCE</td>
							</tr>
							<tr class="border-b" style="border-color: var(--color-border-default)">
								<td class="p-3 font-mono">T10</td>
								<td class="p-3">Architecture</td>
								<td class="p-3">Complex</td>
								<td class="p-3">Design multi-tenant routing strategy</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="mt-6 subsection-heading">Execution Pattern</h3>

				<p>Each task executed twice following identical workflow:</p>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 comparison-success">
						<h4 class="mb-3 comparison-heading comparison-success-heading">
							Run 1: Haiku + Ultrathink
						</h4>
						<ol class="list-decimal list-inside space-y-2 comparison-list">
							<li><strong>Explore</strong>: Read relevant files</li>
							<li><strong>Plan</strong>: "ultrathink. Propose plan. Don't code yet."</li>
							<li><strong>Review</strong>: Human approves plan</li>
							<li><strong>Code</strong>: "Implement the plan"</li>
							<li><strong>Verify</strong>: Tests pass, acceptance met</li>
						</ol>
					</div>

					<div class="p-4 comparison-warning">
						<h4 class="mb-3 comparison-heading comparison-warning-heading">Run 2: Sonnet Baseline</h4>
						<ol class="list-decimal list-inside space-y-2 comparison-list">
							<li><strong>Explore</strong>: Same files</li>
							<li><strong>Plan</strong>: Same planning (no ultrathink)</li>
							<li><strong>Review</strong>: Same approval</li>
							<li><strong>Code</strong>: Same implementation</li>
							<li><strong>Verify</strong>: Same verification</li>
						</ol>
					</div>
				</div>

				<h3 class="mt-6 subsection-heading">Metrics Tracked</h3>

				<p>For each execution:</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>Quality</strong>: Tests pass, acceptance met, plan quality rating</li>
					<li><strong>Cost</strong>: API cost, tokens used</li>
					<li><strong>Time</strong>: Exploration, planning, coding, total</li>
					<li><strong>Outcome</strong>: Success/failure, revision count, notes</li>
				</ul>
			</div>
		</section>

		<!-- Section III: Success Criteria -->
		<section class="space-y-6">
			<h2 class="section-heading">III. Success Criteria</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>Three validation tiers:</p>

				<div class="grid md:grid-cols-3 gap-4 mt-4">
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Minimum Viable</h4>
						<ul class="space-y-2 card-text">
							<li>7/10 tasks succeed</li>
							<li>≥85% cost savings</li>
							<li>All successes pass tests</li>
						</ul>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Strong Validation</h4>
						<ul class="space-y-2 card-text">
							<li>9/10 tasks succeed</li>
							<li>≥90% cost savings</li>
							<li>Time overhead &lt;120%</li>
						</ul>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Conclusive Proof</h4>
						<ul class="space-y-2 card-text">
							<li>10/10 tasks succeed</li>
							<li>≥90% cost savings</li>
							<li>Time ≤100% (same/faster)</li>
						</ul>
					</div>
				</div>

				<p class="mt-4">
					<strong>Pass threshold</strong>: Minimum viable. Strong validation confirms routing
					strategy. Conclusive proof enables aggressive adoption.
				</p>
			</div>
		</section>

		<!-- Section IV: Expected Impact -->
		<section class="space-y-6">
			<h2 class="section-heading">IV. Expected Impact</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>If hypotheses validate, this unlocks a four-tier model routing strategy:</p>

				<div class="overflow-x-auto">
					<table class="w-full mt-4 data-table">
						<thead>
							<tr class="border-b" style="border-color: var(--color-border-default)">
								<th class="p-3 text-left">Complexity</th>
								<th class="p-3 text-left">Model</th>
								<th class="p-3 text-left">Cost</th>
								<th class="p-3 text-left">Use Case</th>
							</tr>
						</thead>
						<tbody>
							<tr class="border-b" style="border-color: var(--color-border-default)">
								<td class="p-3">Trivial</td>
								<td class="p-3">Haiku</td>
								<td class="p-3">~$0.001</td>
								<td class="p-3">Pattern matching, simple edits</td>
							</tr>
							<tr
								class="border-b"
								style="border-color: var(--color-border-default); background: var(--color-success-muted)"
							>
								<td class="p-3"><strong>Simple-Standard</strong></td>
								<td class="p-3"><strong>Haiku + ultrathink</strong></td>
								<td class="p-3"><strong>~$0.001</strong></td>
								<td class="p-3"><strong>Planning, refactoring, debugging</strong></td>
							</tr>
							<tr class="border-b" style="border-color: var(--color-border-default)">
								<td class="p-3">Standard</td>
								<td class="p-3">Sonnet</td>
								<td class="p-3">~$0.01</td>
								<td class="p-3">Multi-file coordination</td>
							</tr>
							<tr class="border-b" style="border-color: var(--color-border-default)">
								<td class="p-3">Complex</td>
								<td class="p-3">Opus</td>
								<td class="p-3">~$0.10</td>
								<td class="p-3">Architecture, security review</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="mt-6 subsection-heading">Cost Projections</h3>

				<p><strong>Before</strong> (current documented routing):</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>10 trivial → Haiku: $0.01</li>
					<li>70 standard → Sonnet: $0.70</li>
					<li>20 complex → Opus: $2.00</li>
					<li><strong>Total: $2.71/100 tasks</strong></li>
				</ul>

				<p class="mt-4"><strong>After</strong> (with Haiku + ultrathink tier):</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>10 trivial → Haiku: $0.01</li>
					<li><strong>60 simple-standard → Haiku + ultrathink: $0.06</strong></li>
					<li>10 multi-file → Sonnet: $0.10</li>
					<li>20 complex → Opus: $2.00</li>
					<li><strong>Total: $2.17/100 tasks (~20% savings)</strong></li>
				</ul>

				<p class="mt-4">
					More importantly, this enables <strong>faster execution</strong> (4-5x) on 60% of tasks
					while maintaining quality.
				</p>
			</div>
		</section>

		<!-- Section V: Implementation -->
		<section class="space-y-6">
			<h2 class="section-heading">V. Implementation Plan</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">Phase 1: Task Preparation (30 min)</h3>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Create 10 Beads issues</li>
					<li>Label with complexity tiers</li>
					<li>Define acceptance criteria</li>
					<li>Prepare test environments</li>
				</ul>

				<h3 class="mt-6 subsection-heading">Phase 2: Haiku + Ultrathink Execution (3-4 hours)</h3>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Execute all 10 tasks with Haiku + ultrathink</li>
					<li>Track metrics for each</li>
					<li>Document plan quality</li>
					<li>Note failures and issues</li>
				</ul>

				<h3 class="mt-6 subsection-heading">Phase 3: Sonnet Baseline Execution (2-3 hours)</h3>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Reset to pre-task state</li>
					<li>Execute same 10 tasks with Sonnet</li>
					<li>Track same metrics</li>
					<li>Compare outcomes</li>
				</ul>

				<h3 class="mt-6 subsection-heading">Phase 4: Analysis (1 hour)</h3>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Calculate quality match percentage</li>
					<li>Calculate cost savings</li>
					<li>Calculate time overhead</li>
					<li>Identify patterns (where Haiku wins, struggles)</li>
				</ul>
			</div>
		</section>

		<!-- Section VI: Results -->
		<section class="space-y-6">
			<h2 class="section-heading">VI. Results</h2>

			<div class="p-6 comparison-warning">
				<h3 class="mb-3 comparison-heading comparison-warning-heading">⏳ Experiment Pending</h3>
				<p class="leading-relaxed body-text">
					Results will be added here as experiment phases complete. Expected completion: January
					2026.
				</p>
			</div>
		</section>

		<!-- Section VII: What This Means -->
		<section class="space-y-6">
			<h2 class="section-heading">VII. Implications</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">If Validated</h3>

				<p>Haiku + ultrathink becomes the default for most development work:</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>
						<strong>Harness integration</strong>: Add ultrathink flag to task execution routing
					</li>
					<li><strong>Gastown workers</strong>: Default to Haiku + ultrathink for convoy work</li>
					<li>
						<strong>Ralph loops</strong>: Use Haiku + ultrathink for iterative refinement, escalate
						to Sonnet if stuck
					</li>
					<li>
						<strong>Documentation</strong>: Update model-routing-optimization.md with validated tier
					</li>
				</ul>

				<p class="mt-4">
					This changes the economics: 60-70% of tasks move from $0.01 to $0.001, reducing monthly
					costs by ~20% while maintaining quality.
				</p>

				<h3 class="mt-6 subsection-heading">If Not Validated</h3>

				<p>Document where it fails and why:</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Which complexity tiers succeed vs fail</li>
					<li>Whether time overhead is too high</li>
					<li>Whether plan quality is poor despite code working</li>
					<li>Specific failure modes (debugging loops, multi-file reasoning, etc.)</li>
				</ul>

				<p class="mt-4">Update routing recommendations with failure patterns documented.</p>

				<h3 class="mt-6 subsection-heading">The Broader Pattern</h3>

				<p>
					This experiment continues the Subtractive Triad at the meta-level: we're removing cost
					without sacrificing quality. If extended thinking closes the Haiku-Sonnet gap, we've
					found a leverage point (Meadows) for cost optimization.
				</p>

				<p class="mt-4">
					The philosophy recedes; only the work remains. You think about the task, not which model
					to use.
				</p>
			</div>
		</section>

		<!-- Related Papers -->
		<section class="space-y-4">
			<h2 class="section-heading">Related Research</h2>

			<div class="space-y-3">
				<div class="p-4 info-card">
					<a href="/papers/codex-orchestration" class="block hover:opacity-80">
						<h3 class="mb-1 card-heading">Orchestrated Code Generation</h3>
						<p class="card-text">
							Tested Gemini CLI, GPT-4, Codex orchestration. All failed or had issues. Direct
							Claude Code execution won.
						</p>
					</a>
				</div>

				<div class="p-4 info-card">
					<a href="/papers/dual-agent-routing-experiment" class="block hover:opacity-80">
						<h3 class="mb-1 card-heading">Dual-Agent Routing Experiment</h3>
						<p class="card-text">
							Gemini Flash voice audits: 97% cost savings but 12/17 implementation failures due to
							code extraction issues.
						</p>
					</a>
				</div>

				<div class="p-4 info-card">
					<a href="/papers/norvig-partnership" class="block hover:opacity-80">
						<h3 class="mb-1 card-heading">The Norvig Partnership</h3>
						<p class="card-text">
							Peter Norvig's 20x productivity increase through AI partnership. The philosophical
							foundation for our model routing strategy.
						</p>
					</a>
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	/* Paper Container */
	.paper-container {
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	/* Header */
	.paper-header {
		border-bottom: 1px solid var(--color-border-default);
	}

	.paper-id {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		letter-spacing: 0.05em;
	}

	.paper-title {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.paper-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.paper-meta {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		font-family: var(--font-mono);
	}

	/* Abstract */
	.abstract-section {
		border-left: 2px solid var(--color-border-emphasis);
	}

	/* Sections */
	.section-heading {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 1rem;
	}

	.subsection-heading {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-secondary);
	}

	.body-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
	}

	/* Quote Box */
	.quote-box {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.stat-large {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
	}

	/* Comparison Cards */
	.comparison-success {
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-lg);
	}

	.comparison-warning {
		background: var(--color-warning-muted);
		border: 1px solid var(--color-warning-border);
		border-radius: var(--radius-lg);
	}

	.comparison-heading {
		font-size: var(--text-body-lg);
	}

	.comparison-success-heading {
		color: var(--color-success);
	}

	.comparison-warning-heading {
		color: var(--color-warning);
	}

	.comparison-list {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Info Cards */
	.info-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.card-heading {
		font-weight: 600;
		color: var(--color-fg-secondary);
	}

	.card-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Tables */
	table {
		border-collapse: collapse;
		width: 100%;
	}

	.data-table {
		font-size: var(--text-body-sm);
	}

	table th {
		font-weight: 600;
		color: var(--color-fg-secondary);
		text-align: left;
	}

	table td {
		color: var(--color-fg-tertiary);
	}

	/* Links */
	a {
		color: var(--color-fg-primary);
		text-decoration: none;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	a:hover {
		opacity: 0.8;
	}
</style>
