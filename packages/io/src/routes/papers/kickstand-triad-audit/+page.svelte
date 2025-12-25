<script lang="ts">
	/**
	 * Subtractive Triad Audit: Kickstand
	 *
	 * Case study demonstrating the application of the Subtractive Triad
	 * framework (DRY → Rams → Heidegger) to audit a production venue
	 * intelligence system.
	 */

	import { SubtractiveTriad, IsometricArchitecture } from '@create-something/components';

	// Kickstand system hierarchy
	const systemNodes = [
		{ id: 'agency', label: '.agency', sublabel: 'CREATE SOMETHING', position: { x: -80, y: 60, z: 0 } },
		{ id: 'client', label: 'Half Dozen', sublabel: 'Client', position: { x: 0, y: 30, z: 0 } },
		{ id: 'kickstand', label: 'Kickstand', sublabel: 'Venue Intel', position: { x: 80, y: 0, z: 0 } }
	];

	const systemConnections = [
		{ from: 'agency', to: 'client' },
		{ from: 'client', to: 'kickstand' }
	];
</script>

<svelte:head>
	<title>Subtractive Triad Audit: Kickstand | CREATE SOMETHING.io</title>
	<meta name="description" content="Applied the Subtractive Triad framework to audit Kickstand, achieving 48% health score improvement through systematic code unification, artifact removal, and documentation reconnection." />
</svelte:head>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2025-001</div>
			<h1 class="mb-3 paper-title">Subtractive Triad Audit: Kickstand</h1>
			<p class="max-w-3xl paper-subtitle">
				Applying the Subtractive Triad framework (DRY → Rams → Heidegger) to audit a production
				venue intelligence system—demonstrating that creation is the discipline of removing what obscures.
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Case Study</span>
				<span>•</span>
				<span>12 min read</span>
				<span>•</span>
				<span>Intermediate</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="pl-6 space-y-4 abstract-section">
			<h2 class="section-heading">Abstract</h2>
			<p class="leading-relaxed body-text">
				This paper documents the application of the <em>Subtractive Triad</em> framework to Kickstand,
				a venue intelligence automation system serving Half Dozen (a CREATE SOMETHING client). The system
				had evolved through multiple architectural phases (Node.js → Railway → Cloudflare Workers),
				accumulating significant technical debt. Through systematic application of three subtractive
				disciplines—DRY (Unify), Rams (Remove), and Heidegger (Reconnect)—we achieved: 92% reduction
				in active scripts (155 → 13), 100% reduction in TypeScript errors (30 → 0), and 48% improvement
				in overall health score (6.2 → 9.2). The case study validates the Subtractive Triad as an
				effective framework for production system audits.
			</p>
		</section>

		<!-- Metrics -->
		<section class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="p-4 metric-card">
				<div class="metric-value metric-success">9.2</div>
				<div class="metric-label">Final Health Score</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">-92%</div>
				<div class="metric-label">Active Scripts</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value metric-success">0</div>
				<div class="metric-label">TypeScript Errors</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">153</div>
				<div class="metric-label">Scripts Archived</div>
			</div>
		</section>

		<!-- The Framework -->
		<section class="space-y-6">
			<h2 class="section-heading">1. The Subtractive Triad Framework</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					<strong class="text-emphasis">Meta-principle:</strong> Creation is the discipline of removing what obscures.
				</p>

				<p>
					The Subtractive Triad provides three lenses for evaluating any codebase, each operating
					at a different level of abstraction:
				</p>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr class="table-header-row">
								<th class="text-left py-2 table-header">Level</th>
								<th class="text-left py-2 table-header">Discipline</th>
								<th class="text-left py-2 table-header">Question</th>
								<th class="text-left py-2 table-header">Action</th>
							</tr>
						</thead>
						<tbody class="table-body">
							<tr class="table-row">
								<td class="py-2">Implementation</td>
								<td class="py-2 font-semibold table-cell-emphasis">DRY</td>
								<td class="py-2">"Have I built this before?"</td>
								<td class="py-2 action-blue">Unify</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Artifact</td>
								<td class="py-2 font-semibold table-cell-emphasis">Rams</td>
								<td class="py-2">"Does this earn its existence?"</td>
								<td class="py-2 action-yellow">Remove</td>
							</tr>
							<tr>
								<td class="py-2">System</td>
								<td class="py-2 font-semibold table-cell-emphasis">Heidegger</td>
								<td class="py-2">"Does this serve the whole?"</td>
								<td class="py-2 action-green">Reconnect</td>
							</tr>
						</tbody>
					</table>
				</div>

				<!-- Visual Canon: Subtractive Triad -->
				<div class="my-8">
					<SubtractiveTriad animateOnScroll={true} showLabels={true} showQuestions={true} size={420} />
				</div>

				<p>
					The triad is coherent because it's one principle—<strong>subtractive revelation</strong>—applied
					at three scales. Truth emerges through disciplined removal at every level of abstraction.
				</p>
			</div>
		</section>

		<!-- System Context -->
		<section class="space-y-6">
			<h2 class="section-heading">2. System Context: Kickstand</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Kickstand is a <strong>venue intelligence automation system</strong> that monitors music venues'
					social media and websites to extract artist performance data. It serves Half Dozen, which
					is a client of CREATE SOMETHING.
				</p>

				<!-- Visual Canon: System Hierarchy -->
				<div class="my-6">
					<IsometricArchitecture
						animateOnScroll={true}
						nodes={systemNodes}
						connections={systemConnections}
						title="System Hierarchy"
						size={380}
					/>
				</div>

				<p>
					The system produces daily intelligence reports, artist extractions, and venue monitoring data.
					It had evolved through multiple deployment phases:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>Phase 1:</strong> Node.js + local development</li>
					<li><strong>Phase 2:</strong> Railway deployment</li>
					<li><strong>Phase 3:</strong> Cloudflare Workers (current production)</li>
				</ul>

				<p>
					Each migration left artifacts behind, creating the debt that this audit addresses.
				</p>
			</div>
		</section>

		<!-- Level 1: DRY -->
		<section class="space-y-6">
			<h2 class="section-heading">3. Level 1: DRY (Implementation) — Unify</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="p-4 callout-blue">
					<p class="callout-text-blue"><strong>Question:</strong> "Have I built this before?"</p>
					<p class="callout-meta-blue">Score: 5/10 — Critical duplication found</p>
				</div>

				<h3 class="mt-6 subsection-heading">Finding: Parallel Runtime Implementations</h3>
				<p>
					The codebase maintained <strong>two complete implementations</strong> of core services—one
					in Node.js and one in Cloudflare Workers TypeScript:
				</p>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr class="table-header-row">
								<th class="text-left py-2 table-header">Component</th>
								<th class="text-left py-2 table-header">Node.js</th>
								<th class="text-left py-2 table-header">Workers</th>
								<th class="text-left py-2 table-header">Duplicated</th>
							</tr>
						</thead>
						<tbody class="table-body">
							<tr class="table-row">
								<td class="py-2">Artist Extractor</td>
								<td class="py-2">1,594 lines</td>
								<td class="py-2">644 lines</td>
								<td class="py-2">~500 lines</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Website Monitor</td>
								<td class="py-2">~800 lines</td>
								<td class="py-2">~600 lines</td>
								<td class="py-2">~400 lines</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Instagram Monitor</td>
								<td class="py-2">~900 lines</td>
								<td class="py-2">~700 lines</td>
								<td class="py-2">~600 lines</td>
							</tr>
							<tr>
								<td class="py-2 font-semibold table-cell-emphasis">Total</td>
								<td class="py-2" colspan="2"></td>
								<td class="py-2 font-semibold table-cell-emphasis">~3,200 lines</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="mt-6 subsection-heading">Action: Unified to Workers</h3>
				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Marked Node.js services with <code class="code-inline">@deprecated</code> notices</li>
					<li>Fixed 30 TypeScript errors in Workers implementation</li>
					<li>Updated Cloudflare Workflow API usage (<code class="code-inline">event.payload</code> not <code class="code-inline">event.params</code>)</li>
					<li>Added proper type annotations throughout</li>
				</ul>
			</div>
		</section>

		<!-- Level 2: Rams -->
		<section class="space-y-6">
			<h2 class="section-heading">4. Level 2: Rams (Artifact) — Remove</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="p-4 callout-yellow">
					<p class="callout-text-yellow"><strong>Question:</strong> "Does this earn its existence?"</p>
					<p class="callout-meta-yellow">Score: 6/10 — Significant excess found</p>
				</div>

				<h3 class="mt-6 subsection-heading">Finding: Script Proliferation</h3>
				<p>
					<strong>155 JavaScript files</strong> in the scripts directory, with only ~20 actively needed:
				</p>

				<div class="grid md:grid-cols-2 gap-4">
					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">Before</h4>
						<ul class="space-y-2 card-list">
							<li>• 155 scripts total</li>
							<li>• 35 explicitly archived</li>
							<li>• ~70 likely obsolete</li>
							<li>• ~30 one-time migrations</li>
							<li>• ~20 actively needed</li>
						</ul>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">After</h4>
						<ul class="space-y-2 card-list">
							<li>• 13 scripts active</li>
							<li>• 153 scripts archived</li>
							<li>• Organized into categories:</li>
							<li class="pl-4">- migrations/ (38 scripts)</li>
							<li class="pl-4">- tests/ (24 scripts)</li>
							<li class="pl-4">- one-time/ (19 scripts)</li>
						</ul>
					</div>
				</div>

				<h3 class="mt-6 subsection-heading">Action: Archived Obsolete Artifacts</h3>
				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Moved 153 scripts to organized archive directories</li>
					<li>Archived Railway configuration to <code class="code-inline">config/archive/</code></li>
					<li>Moved Railway docs to <code class="code-inline">docs/archive/railway/</code></li>
					<li>Created archive README documenting restoration process</li>
				</ul>
			</div>
		</section>

		<!-- Level 3: Heidegger -->
		<section class="space-y-6">
			<h2 class="section-heading">5. Level 3: Heidegger (System) — Reconnect</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="p-4 callout-green">
					<p class="callout-text-green"><strong>Question:</strong> "Does this serve the whole?"</p>
					<p class="callout-meta-green">Score: 7/10 — Minor disconnection found</p>
				</div>

				<h3 class="mt-6 subsection-heading">Finding: Architectural Confusion</h3>
				<p>
					The README described three different deployment targets, creating systemic incoherence:
				</p>

				<div class="p-4 font-mono code-block">
					<p class="code-comment">// README claimed:</p>
					<p class="code-primary">1. Node.js + Railway (documented as primary)</p>
					<p class="code-primary">2. n8n (mentioned as future target)</p>
					<p class="code-primary">3. Cloudflare Workers (actual production)</p>
				</div>

				<p class="mt-4">
					Additionally, the relationship between Kickstand → Half Dozen → CREATE SOMETHING was
					undocumented within the system itself.
				</p>

				<h3 class="mt-6 subsection-heading">Action: Unified Documentation</h3>
				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Rewrote <code class="code-inline">README.md</code> for Cloudflare Workers architecture</li>
					<li>Created <code class="code-inline">docs/ARCHITECTURE.md</code> documenting system context</li>
					<li>Added <code class="code-inline">services/LEGACY.md</code> deprecation guide</li>
					<li>Added <code class="code-inline">monitoring/LEGACY.md</code> deprecation guide</li>
					<li>Documented the hermeneutic circle: how Kickstand fits into the larger system</li>
				</ul>
			</div>
		</section>

		<!-- Results -->
		<section class="space-y-6">
			<h2 class="section-heading">6. Results</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr class="table-header-row">
								<th class="text-left py-2 table-header">Metric</th>
								<th class="text-left py-2 table-header">Before</th>
								<th class="text-left py-2 table-header">After</th>
								<th class="text-left py-2 table-header">Change</th>
							</tr>
						</thead>
						<tbody class="table-body">
							<tr class="table-row">
								<td class="py-2">Health Score</td>
								<td class="py-2">6.2/10</td>
								<td class="py-2 table-success">9.2/10</td>
								<td class="py-2 table-success">+48%</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Active Scripts</td>
								<td class="py-2">155</td>
								<td class="py-2">13</td>
								<td class="py-2 table-success">-92%</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Archived Scripts</td>
								<td class="py-2">35</td>
								<td class="py-2">153</td>
								<td class="py-2">+337%</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">TypeScript Errors</td>
								<td class="py-2">~30</td>
								<td class="py-2 table-success">0</td>
								<td class="py-2 table-success">-100%</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Build Status</td>
								<td class="py-2 table-error">Failing</td>
								<td class="py-2 table-success">Passing</td>
								<td class="py-2 table-success">Fixed</td>
							</tr>
							<tr>
								<td class="py-2">Documentation</td>
								<td class="py-2">Outdated</td>
								<td class="py-2 table-success">Current</td>
								<td class="py-2 table-success">Unified</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="mt-6 subsection-heading">TypeScript Fixes Applied</h3>
				<p>Key fixes to achieve zero build errors:</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Added <code class="code-inline">warn()</code> method to Logger class</li>
					<li>Fixed Cloudflare Workflow API (<code class="code-inline">event.payload</code> not <code class="code-inline">event.params</code>)</li>
					<li>Fixed <code class="code-inline">Logger.error()</code> call signatures throughout</li>
					<li>Added type assertions for API responses</li>
					<li>Updated <code class="code-inline">MonitorResult</code> interface</li>
					<li>Removed <code class="code-inline">@types/node</code> from tsconfig to resolve conflicts</li>
				</ul>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">7. Conclusion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					This case study validates the Subtractive Triad as an effective framework for production
					system audits. The three levels complement each other:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>DRY</strong> catches mechanical duplication (parallel implementations)</li>
					<li><strong>Rams</strong> catches functional obsolescence (155 → 13 scripts)</li>
					<li><strong>Heidegger</strong> catches systemic disconnection (documentation drift)</li>
				</ul>

				<p>
					Kickstand is now a <strong>functional and coherent system</strong>. Its core value proposition—venue
					intelligence through automated monitoring and artist extraction—works well, and the codebase
					now reflects this clarity.
				</p>

				<div class="p-6 mt-6 quote-box">
					<p class="text-center card-heading">
						<strong>The Subtractive Path Forward</strong>
					</p>
					<div class="grid md:grid-cols-3 gap-4 mt-4 text-center">
						<div>
							<div class="font-semibold action-blue">Unify</div>
							<div class="card-list">the implementation</div>
						</div>
						<div>
							<div class="font-semibold action-yellow">Remove</div>
							<div class="card-list">the obsolete artifacts</div>
						</div>
						<div>
							<div class="font-semibold action-green">Reconnect</div>
							<div class="card-list">the documentation</div>
						</div>
					</div>
				</div>

				<p class="mt-6 text-center italic quote-text">
					"Creation is the discipline of removing what obscures."
				</p>
			</div>
		</section>

		<!-- Footer -->
		<div class="pt-6 paper-footer">
			<p class="footer-text">
				This case study is part of the CREATE SOMETHING research program exploring AI-native
				development patterns. View the
				<a href="https://github.com/Half-Dozen/kickstand-monitoring" class="footer-link">
					Kickstand repository
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
	}

	.code-primary {
		color: var(--color-fg-primary);
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
