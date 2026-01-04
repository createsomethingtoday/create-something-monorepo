<script lang="ts">
	/**
	 * Spec-Driven Development: A Meta-Experiment in Agent Orchestration
	 *
	 * Documents the methodology and findings from building NBA Live Analytics
	 * using structured specifications to guide agent-based development.
	 *
	 * "Weniger, aber besser" — Less, but better.
	 */
</script>

<svelte:head>
	<title>Spec-Driven Development: A Meta-Experiment | CREATE SOMETHING.io</title>
	<meta name="description" content="A meta-experiment testing whether structured specifications can effectively guide agent-based development, producing both working software and methodology documentation." />
</svelte:head>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-001</div>
			<h1 class="mb-3 paper-title">Spec-Driven Development</h1>
			<p class="max-w-3xl paper-subtitle">
				A Meta-Experiment in Agent Orchestration: Building NBA Live Analytics as Methodology Validation
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Methodology</span>
				<span>•</span>
				<span>15 min read</span>
				<span>•</span>
				<span>Advanced</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="pl-6 space-y-4 abstract-section">
			<h2 class="section-heading">Abstract</h2>
			<p class="leading-relaxed body-text">
				This paper documents a meta-experiment testing whether <strong>structured specifications</strong>
				can effectively guide agent-based development. The vehicle is an NBA Live Analytics Dashboard
				with three analytical views—Duo Synergy, Defensive Impact, and Shot Network. The hypothesis:
				spec-driven development produces both working software and methodology documentation as
				equally important artifacts. Through three phases of implementation (Infrastructure, Pages, Polish),
				we observe that explicit dependency graphs, complexity annotations, and acceptance criteria
				enable predictable agent execution while surfacing methodology insights that would remain
				hidden in ad-hoc development.
			</p>
		</section>

		<!-- Metrics -->
		<section class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="p-4 metric-card">
				<div class="metric-value">3</div>
				<div class="metric-label">Phases</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">12</div>
				<div class="metric-label">Features Delivered</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value metric-success">0</div>
				<div class="metric-label">Type Errors</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">3</div>
				<div class="metric-label">Visualization Types</div>
			</div>
		</section>

		<!-- The Hypothesis -->
		<section class="space-y-6">
			<h2 class="section-heading">1. The Hypothesis</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					<strong class="text-emphasis">Central Question:</strong> Can spec-driven development be
					managed by agents using harness and Beads abstractions, producing both working software
					and methodology documentation?
				</p>

				<p>
					Traditional development treats documentation as an afterthought—something produced
					after the code works. Spec-driven development inverts this: the specification
					<em>precedes</em> implementation, and the implementation <em>validates</em> the specification.
				</p>

				<div class="p-4 callout-blue">
					<p class="callout-text-blue">
						<strong>The Meta-Experiment:</strong> The dashboard itself is the artifact;
						this methodology paper is the meta-artifact. Both are equally important outputs.
					</p>
				</div>

				<p>
					This follows the hermeneutic circle: pre-understanding (the spec) meets emergent
					understanding (implementation), and the gap between them reveals methodology insights.
				</p>
			</div>
		</section>

		<!-- Architecture -->
		<section class="space-y-6">
			<h2 class="section-heading">2. Architecture</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The NBA Live Analytics Dashboard demonstrates a complete vertical slice:
					data acquisition, processing, visualization, and documentation.
				</p>

				<!-- ASCII Architecture Diagram -->
				<div class="p-4 font-mono code-block">
					<p class="code-comment">// System Architecture</p>
					<pre class="code-primary">
┌─────────────────────────────────────────────────────────────┐
│                   packages/space (SvelteKit)                │
├─────────────────────────────────────────────────────────────┤
│  /experiments/nba-live           → Landing + game selector  │
│  /experiments/nba-live/duo-synergy      → Two-man efficiency│
│  /experiments/nba-live/defensive-impact → Matchup analysis  │
│  /experiments/nba-live/shot-network     → D3 force graph    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              packages/space/workers/nba-proxy               │
│  - Rate limiting (10 req/min to NBA.com)                    │
│  - KV caching (30s TTL for live data)                       │
│  - D1 for player baselines                                  │
└─────────────────────────────────────────────────────────────┘</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Design Decisions</h3>
				<p>
					Each architectural decision was documented in the spec before implementation:
				</p>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr class="table-header-row">
								<th class="text-left py-2 table-header">Decision</th>
								<th class="text-left py-2 table-header">Choice</th>
								<th class="text-left py-2 table-header">Rationale</th>
							</tr>
						</thead>
						<tbody class="table-body">
							<tr class="table-row">
								<td class="py-2">Real-time updates</td>
								<td class="py-2 table-cell-emphasis">Polling (30s)</td>
								<td class="py-2">NBA data isn't truly streaming</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Visualization</td>
								<td class="py-2 table-cell-emphasis">Custom + D3</td>
								<td class="py-2">D3 only for force-directed graphs</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Baseline data</td>
								<td class="py-2 table-cell-emphasis">D1 Database</td>
								<td class="py-2">SQL queries cleaner for comparisons</td>
							</tr>
							<tr>
								<td class="py-2">Styling</td>
								<td class="py-2 table-cell-emphasis">Canon tokens</td>
								<td class="py-2">Brand compliance, fast iteration</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- The Spec Structure -->
		<section class="space-y-6">
			<h2 class="section-heading">3. Spec Structure</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The specification uses a YAML format optimized for agent consumption.
					Key elements that enable predictable execution:
				</p>

				<div class="grid md:grid-cols-2 gap-4">
					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">Dependency Graph</h4>
						<ul class="space-y-2 card-list">
							<li>• Explicit <code class="code-inline">depends_on</code> arrays</li>
							<li>• Prevents premature starts</li>
							<li>• Enables parallel execution</li>
							<li>• Validates topological order</li>
						</ul>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">Complexity Annotations</h4>
						<ul class="space-y-2 card-list">
							<li>• <code class="code-inline">trivial</code>: Haiku model</li>
							<li>• <code class="code-inline">simple</code>: Sonnet model</li>
							<li>• <code class="code-inline">standard</code>: Sonnet model</li>
							<li>• <code class="code-inline">complex</code>: Opus model</li>
						</ul>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">Acceptance Criteria</h4>
						<ul class="space-y-2 card-list">
							<li>• Observable, testable conditions</li>
							<li>• Verify commands where applicable</li>
							<li>• No ambiguous language</li>
							<li>• Binary pass/fail</li>
						</ul>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">File Tracking</h4>
						<ul class="space-y-2 card-list">
							<li>• Expected files listed per feature</li>
							<li>• Enables merge conflict detection</li>
							<li>• Validates isolation</li>
							<li>• Supports parallel convoy work</li>
						</ul>
					</div>
				</div>
			</div>
		</section>

		<!-- Phase 1: Infrastructure -->
		<section class="space-y-6">
			<h2 class="section-heading">4. Phase 1: Infrastructure</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="p-4 callout-blue">
					<p class="callout-text-blue"><strong>Execution:</strong> Sequential (dependencies required)</p>
					<p class="callout-meta-blue">Features: Types, D1 Schema, NBA Proxy Worker, API Client, Calculations</p>
				</div>

				<p>
					Infrastructure must be sequential—the API client cannot exist without types,
					calculations cannot exist without the D1 schema. The spec enforces this:
				</p>

				<div class="p-4 font-mono code-block">
					<p class="code-comment"># Dependency chain</p>
					<pre class="code-primary">
Types (1.1)
    │
    ├─── D1 Schema (1.2)
    │         │
    ├─── NBA Proxy Worker (1.3)
    │         │
    └─── Calculations (1.5)
              │
              └─── API Client (1.4)</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Key Deliverables</h3>
				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><code class="code-inline">types.ts</code> — Player, Game, Shot, PlayByPlayAction interfaces</li>
					<li><code class="code-inline">0013_nba_baselines.sql</code> — D1 migration for player metrics</li>
					<li><code class="code-inline">nba-proxy/</code> — Cloudflare Worker with KV caching</li>
					<li><code class="code-inline">api.ts</code> — Type-safe fetch functions with Result pattern</li>
					<li><code class="code-inline">calculations.ts</code> — PPP, defensive impact, shot zone analysis</li>
				</ul>

				<h3 class="mt-6 subsection-heading">Insight: Type Alignment</h3>
				<p>
					The NBA API's field naming diverged from our initial assumptions.
					<code class="code-inline">personId</code> became <code class="code-inline">id</code>,
					<code class="code-inline">assistPersonId</code> became <code class="code-inline">assistPlayerId</code>.
					This gap between spec and reality surfaced during implementation, validating the
					hermeneutic circle principle: understanding emerges through practice.
				</p>
			</div>
		</section>

		<!-- Phase 2: Pages -->
		<section class="space-y-6">
			<h2 class="section-heading">5. Phase 2: Pages</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="p-4 callout-yellow">
					<p class="callout-text-yellow"><strong>Execution:</strong> Parallel convoy (after Infrastructure)</p>
					<p class="callout-meta-yellow">Features: Landing, Duo Synergy, Defensive Impact, Shot Network</p>
				</div>

				<p>
					Once infrastructure exists, pages can be built in parallel. The spec identifies
					file isolation—each page touches distinct routes and components:
				</p>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr class="table-header-row">
								<th class="text-left py-2 table-header">Feature</th>
								<th class="text-left py-2 table-header">Route</th>
								<th class="text-left py-2 table-header">Component</th>
								<th class="text-left py-2 table-header">Complexity</th>
							</tr>
						</thead>
						<tbody class="table-body">
							<tr class="table-row">
								<td class="py-2">Landing</td>
								<td class="py-2"><code class="code-inline">/nba-live/</code></td>
								<td class="py-2">GameSelector</td>
								<td class="py-2">standard</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Duo Synergy</td>
								<td class="py-2"><code class="code-inline">/duo-synergy/</code></td>
								<td class="py-2">DuoChart</td>
								<td class="py-2">standard</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Defensive Impact</td>
								<td class="py-2"><code class="code-inline">/defensive-impact/</code></td>
								<td class="py-2">DefensiveHeatmap</td>
								<td class="py-2">standard</td>
							</tr>
							<tr>
								<td class="py-2">Shot Network</td>
								<td class="py-2"><code class="code-inline">/shot-network/</code></td>
								<td class="py-2">ShotNetwork (D3)</td>
								<td class="py-2 table-cell-emphasis">complex</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="mt-6 subsection-heading">Tufte Principles Applied</h3>
				<p>
					All visualizations follow Edward Tufte's principles—maximizing data-ink ratio,
					avoiding chartjunk, using direct labeling. The Shot Network component demonstrates this:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>Node size</strong> encodes shot creation + attempts (proportional ink)</li>
					<li><strong>Edge thickness</strong> encodes assist frequency</li>
					<li><strong>Direct labels</strong> on nodes (no legend hover)</li>
					<li><strong>Minimal chrome</strong>—no gridlines, no decorative elements</li>
				</ul>
			</div>
		</section>

		<!-- Phase 3: Polish -->
		<section class="space-y-6">
			<h2 class="section-heading">6. Phase 3: Polish</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="p-4 callout-green">
					<p class="callout-text-green"><strong>Execution:</strong> Sequential (after Pages)</p>
					<p class="callout-meta-green">Features: Experiment Registration, Methodology Documentation</p>
				</div>

				<p>
					The final phase integrates the work into the larger system:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>
						<strong>Experiment Registration:</strong> Entry in
						<code class="code-inline">fileBasedExperiments.ts</code> with principle mappings
					</li>
					<li>
						<strong>Methodology Documentation:</strong> This paper—the meta-artifact that
						validates the spec-driven approach
					</li>
				</ul>

				<h3 class="mt-6 subsection-heading">Principle Mappings</h3>
				<p>
					The experiment tests specific Rams and Heidegger principles:
				</p>

				<div class="grid md:grid-cols-2 gap-4">
					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">Rams Principles</h4>
						<ul class="space-y-2 card-list">
							<li>• <strong>Principle 2:</strong> Useful — delivers analytical value</li>
							<li>• <strong>Principle 4:</strong> Understandable — clear methodology</li>
							<li>• <strong>Principle 8:</strong> Thorough — complete coverage</li>
						</ul>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">Heidegger Concepts</h4>
						<ul class="space-y-2 card-list">
							<li>• <strong>Zuhandenheit:</strong> Infrastructure disappears</li>
							<li>• <strong>Hermeneutic Circle:</strong> Spec ↔ Implementation</li>
							<li>• <strong>Dwelling:</strong> Analytics enable understanding</li>
						</ul>
					</div>
				</div>
			</div>
		</section>

		<!-- Observations -->
		<section class="space-y-6">
			<h2 class="section-heading">7. Observations</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">What Worked</h3>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>
						<strong>Dependency graphs prevent premature execution.</strong>
						The API client couldn't start until types existed. This eliminated a class
						of errors where agents guess at interfaces.
					</li>
					<li>
						<strong>Complexity annotations guide model selection.</strong>
						The Shot Network (D3 force-directed) was correctly identified as complex,
						receiving more thorough treatment.
					</li>
					<li>
						<strong>Acceptance criteria enable verification.</strong>
						"Nodes represent players with shots or assists" is testable;
						"visualization should be nice" is not.
					</li>
					<li>
						<strong>File tracking prevents conflicts.</strong>
						Parallel convoy work on isolated routes succeeded without merge conflicts.
					</li>
				</ul>

				<h3 class="mt-6 subsection-heading">What the Spec Didn't Predict</h3>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>
						<strong>API field naming divergence.</strong>
						The NBA API uses <code class="code-inline">personId</code> in some contexts and
						<code class="code-inline">playerId</code> in others. The spec assumed consistency.
					</li>
					<li>
						<strong>D3 integration complexity.</strong>
						Svelte 5 runes (<code class="code-inline">$props()</code>) interact differently
						with D3's mutation-based model than Svelte 4 reactivity.
					</li>
					<li>
						<strong>Shot type enumeration.</strong>
						The spec assumed <code class="code-inline">2pt</code>/<code class="code-inline">3pt</code>
						action types; reality uses <code class="code-inline">shot</code> with <code class="code-inline">shotType</code> property.
					</li>
				</ul>

				<p class="mt-4">
					These gaps validate the hermeneutic principle: the spec is pre-understanding;
					implementation reveals truth. The value isn't in predicting everything—it's in
					making the gaps visible.
				</p>
			</div>
		</section>

		<!-- Spec-Driven vs Ad-Hoc -->
		<section class="space-y-6">
			<h2 class="section-heading">8. Spec-Driven vs Ad-Hoc Development</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr class="table-header-row">
								<th class="text-left py-2 table-header">Dimension</th>
								<th class="text-left py-2 table-header">Spec-Driven</th>
								<th class="text-left py-2 table-header">Ad-Hoc</th>
							</tr>
						</thead>
						<tbody class="table-body">
							<tr class="table-row">
								<td class="py-2">Upfront Cost</td>
								<td class="py-2 table-warning">Higher</td>
								<td class="py-2 table-success">Lower</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Predictability</td>
								<td class="py-2 table-success">High</td>
								<td class="py-2 table-warning">Variable</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Parallel Work</td>
								<td class="py-2 table-success">Enabled</td>
								<td class="py-2 table-error">Risky</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Methodology Capture</td>
								<td class="py-2 table-success">Automatic</td>
								<td class="py-2 table-error">Manual</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Gap Visibility</td>
								<td class="py-2 table-success">Explicit</td>
								<td class="py-2 table-warning">Hidden</td>
							</tr>
							<tr>
								<td class="py-2">Best For</td>
								<td class="py-2">Complex, multi-file features</td>
								<td class="py-2">Quick fixes, exploration</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p class="mt-4">
					<strong>Key insight:</strong> The upfront cost of spec creation is offset by
					reduced rework and automatic methodology capture. For complex features,
					spec-driven development pays for itself.
				</p>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">9. Conclusion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					This meta-experiment validates the hypothesis: spec-driven development produces
					both working software and methodology documentation. The NBA Live Analytics
					Dashboard demonstrates:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Three analytical views with Tufte-compliant visualizations</li>
					<li>Complete infrastructure (Worker, D1, KV caching)</li>
					<li>Zero TypeScript errors at completion</li>
					<li>Methodology documentation as a first-class artifact</li>
				</ul>

				<p>
					The gaps between spec and implementation—field naming, D3 integration,
					enumeration values—are not failures. They are the hermeneutic circle in action:
					pre-understanding meeting reality, with the gap itself producing insight.
				</p>

				<div class="p-6 mt-6 quote-box">
					<p class="text-center card-heading">
						<strong>The Spec-Driven Principle</strong>
					</p>
					<div class="grid md:grid-cols-3 gap-4 mt-4 text-center">
						<div>
							<div class="font-semibold action-blue">Specify</div>
							<div class="card-list">before implementing</div>
						</div>
						<div>
							<div class="font-semibold action-yellow">Implement</div>
							<div class="card-list">to reveal gaps</div>
						</div>
						<div>
							<div class="font-semibold action-green">Document</div>
							<div class="card-list">the understanding</div>
						</div>
					</div>
				</div>

				<p class="mt-6 text-center italic quote-text">
					"The specification becomes the session. The dashboard is the artifact.
					This paper is the meta-artifact. All three serve the whole."
				</p>
			</div>
		</section>

		<!-- Footer -->
		<div class="pt-6 paper-footer">
			<p class="footer-text">
				This methodology paper is part of the CREATE SOMETHING research program exploring
				AI-native development patterns. View the
				<a href="https://createsomething.space/experiments/nba-live" class="footer-link">
					NBA Live Analytics Dashboard
				</a>
				or read more about our
				<a href="/methodology" class="footer-link">methodology</a>.
			</p>
		</div>
	</div>
</div>

<style>
	/* Structure: Tailwind | Design: Canon */
	.paper-container {
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	.paper-header {
		border-bottom: 1px solid var(--color-border-default);
	}

	.paper-id {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.paper-title {
		font-size: var(--text-h1);
	}

	.paper-subtitle {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.paper-meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.abstract-section {
		border-left: 4px solid var(--color-border-emphasis);
	}

	.section-heading {
		font-size: var(--text-h2);
	}

	.subsection-heading {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
	}

	.body-text {
		color: var(--color-fg-secondary);
	}

	.text-emphasis {
		color: var(--color-fg-primary);
	}

	/* Metric Cards */
	.metric-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.metric-value {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
	}

	.metric-success {
		color: var(--color-success);
	}

	.metric-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Data Tables */
	.data-table {
		font-size: var(--text-body-sm);
	}

	.table-header-row {
		border-bottom: 1px solid var(--color-border-emphasis);
	}

	.table-header {
		color: var(--color-fg-secondary);
	}

	.table-body {
		color: var(--color-fg-tertiary);
	}

	.table-row {
		border-bottom: 1px solid var(--color-border-default);
	}

	.table-cell-emphasis {
		color: var(--color-fg-secondary);
	}

	.table-success {
		color: var(--color-success);
	}

	.table-warning {
		color: var(--color-warning);
	}

	.table-error {
		color: var(--color-error);
	}

	/* Action Colors */
	.action-blue {
		color: var(--color-data-1);
	}

	.action-yellow {
		color: var(--color-data-4);
	}

	.action-green {
		color: var(--color-data-2);
	}

	/* Callouts */
	.callout-blue {
		background: var(--color-data-1-muted);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-lg);
	}

	.callout-text-blue {
		color: var(--color-data-1);
	}

	.callout-meta-blue {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		margin-top: 0.25rem;
	}

	.callout-yellow {
		background: var(--color-warning-muted);
		border: 1px solid var(--color-warning-border);
		border-radius: var(--radius-lg);
	}

	.callout-text-yellow {
		color: var(--color-data-4);
	}

	.callout-meta-yellow {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		margin-top: 0.25rem;
	}

	.callout-green {
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-lg);
	}

	.callout-text-green {
		color: var(--color-data-2);
	}

	.callout-meta-green {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		margin-top: 0.25rem;
	}

	/* Info Cards */
	.info-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.card-heading {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.card-list {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Code */
	.code-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
		overflow-x: auto;
	}

	.code-primary {
		color: var(--color-fg-primary);
		white-space: pre;
	}

	.code-comment {
		color: var(--color-fg-muted);
	}

	.code-inline {
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
	}

	/* Quote Box */
	.quote-box {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.quote-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	/* Responsive Tables */
	.responsive-table-scroll {
		overflow-x: auto;
	}

	/* Footer */
	.paper-footer {
		border-top: 1px solid var(--color-border-default);
	}

	.footer-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-link {
		text-decoration: underline;
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-secondary);
	}
</style>
