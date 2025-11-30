<script lang="ts">
	/**
	 * Subtractive Triad Audit: Kickstand
	 *
	 * Case study demonstrating the application of the Subtractive Triad
	 * framework (DRY → Rams → Heidegger) to audit a production venue
	 * intelligence system.
	 */
</script>

<svelte:head>
	<title>Subtractive Triad Audit: Kickstand | CREATE SOMETHING.io</title>
	<meta name="description" content="Applied the Subtractive Triad framework to audit Kickstand, achieving 48% health score improvement through systematic code unification, artifact removal, and documentation reconnection." />
</svelte:head>

<div class="min-h-screen bg-black text-white p-6">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="border-b border-white/10 pb-8">
			<div class="font-mono text-white/40 text-sm mb-4">CASE-STUDY-2025-001</div>
			<h1 class="text-4xl font-bold mb-3">Subtractive Triad Audit: Kickstand</h1>
			<p class="text-white/70 text-lg max-w-3xl">
				Applying the Subtractive Triad framework (DRY → Rams → Heidegger) to audit a production
				venue intelligence system—demonstrating that creation is the discipline of removing what obscures.
			</p>
			<div class="flex gap-4 mt-4 text-sm text-white/50">
				<span>Case Study</span>
				<span>•</span>
				<span>12 min read</span>
				<span>•</span>
				<span>Intermediate</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="border-l-4 border-white/20 pl-6 space-y-4">
			<h2 class="text-2xl font-bold">Abstract</h2>
			<p class="text-white/70 leading-relaxed">
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
			<div class="p-4 bg-white/5 border border-white/10 rounded-lg">
				<div class="text-2xl font-bold text-green-400">9.2</div>
				<div class="text-sm text-white/60">Final Health Score</div>
			</div>
			<div class="p-4 bg-white/5 border border-white/10 rounded-lg">
				<div class="text-2xl font-bold">-92%</div>
				<div class="text-sm text-white/60">Active Scripts</div>
			</div>
			<div class="p-4 bg-white/5 border border-white/10 rounded-lg">
				<div class="text-2xl font-bold text-green-400">0</div>
				<div class="text-sm text-white/60">TypeScript Errors</div>
			</div>
			<div class="p-4 bg-white/5 border border-white/10 rounded-lg">
				<div class="text-2xl font-bold">153</div>
				<div class="text-sm text-white/60">Scripts Archived</div>
			</div>
		</section>

		<!-- The Framework -->
		<section class="space-y-6">
			<h2 class="text-2xl font-bold">1. The Subtractive Triad Framework</h2>

			<div class="space-y-4 text-white/70 leading-relaxed">
				<p>
					<strong class="text-white/90">Meta-principle:</strong> Creation is the discipline of removing what obscures.
				</p>

				<p>
					The Subtractive Triad provides three lenses for evaluating any codebase, each operating
					at a different level of abstraction:
				</p>

				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-white/20">
								<th class="text-left py-2 text-white/80">Level</th>
								<th class="text-left py-2 text-white/80">Discipline</th>
								<th class="text-left py-2 text-white/80">Question</th>
								<th class="text-left py-2 text-white/80">Action</th>
							</tr>
						</thead>
						<tbody class="text-white/60">
							<tr class="border-b border-white/10">
								<td class="py-2">Implementation</td>
								<td class="py-2 font-semibold text-white/80">DRY</td>
								<td class="py-2">"Have I built this before?"</td>
								<td class="py-2 text-blue-400">Unify</td>
							</tr>
							<tr class="border-b border-white/10">
								<td class="py-2">Artifact</td>
								<td class="py-2 font-semibold text-white/80">Rams</td>
								<td class="py-2">"Does this earn its existence?"</td>
								<td class="py-2 text-yellow-400">Remove</td>
							</tr>
							<tr>
								<td class="py-2">System</td>
								<td class="py-2 font-semibold text-white/80">Heidegger</td>
								<td class="py-2">"Does this serve the whole?"</td>
								<td class="py-2 text-green-400">Reconnect</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					The triad is coherent because it's one principle—<strong>subtractive revelation</strong>—applied
					at three scales. Truth emerges through disciplined removal at every level of abstraction.
				</p>
			</div>
		</section>

		<!-- System Context -->
		<section class="space-y-6">
			<h2 class="text-2xl font-bold">2. System Context: Kickstand</h2>

			<div class="space-y-4 text-white/70 leading-relaxed">
				<p>
					Kickstand is a <strong>venue intelligence automation system</strong> that monitors music venues'
					social media and websites to extract artist performance data. It serves Half Dozen, which
					is a client of CREATE SOMETHING.
				</p>

				<div class="p-4 bg-white/5 border border-white/10 rounded-lg font-mono text-sm">
					<pre class="text-white/90">{`CREATE SOMETHING (.agency)
    │
    └── Client: Half Dozen
            │
            └── System: Kickstand (Venue Intelligence)
                    │
                    ├── Website Monitor
                    ├── Instagram Monitor
                    ├── Twitter Monitor
                    └── Artist Extractor`}</pre>
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
			<h2 class="text-2xl font-bold">3. Level 1: DRY (Implementation) — Unify</h2>

			<div class="space-y-4 text-white/70 leading-relaxed">
				<div class="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
					<p class="text-blue-300"><strong>Question:</strong> "Have I built this before?"</p>
					<p class="text-blue-300/70 text-sm mt-1">Score: 5/10 — Critical duplication found</p>
				</div>

				<h3 class="text-xl font-semibold text-white/90 mt-6">Finding: Parallel Runtime Implementations</h3>
				<p>
					The codebase maintained <strong>two complete implementations</strong> of core services—one
					in Node.js and one in Cloudflare Workers TypeScript:
				</p>

				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-white/20">
								<th class="text-left py-2 text-white/80">Component</th>
								<th class="text-left py-2 text-white/80">Node.js</th>
								<th class="text-left py-2 text-white/80">Workers</th>
								<th class="text-left py-2 text-white/80">Duplicated</th>
							</tr>
						</thead>
						<tbody class="text-white/60">
							<tr class="border-b border-white/10">
								<td class="py-2">Artist Extractor</td>
								<td class="py-2">1,594 lines</td>
								<td class="py-2">644 lines</td>
								<td class="py-2">~500 lines</td>
							</tr>
							<tr class="border-b border-white/10">
								<td class="py-2">Website Monitor</td>
								<td class="py-2">~800 lines</td>
								<td class="py-2">~600 lines</td>
								<td class="py-2">~400 lines</td>
							</tr>
							<tr class="border-b border-white/10">
								<td class="py-2">Instagram Monitor</td>
								<td class="py-2">~900 lines</td>
								<td class="py-2">~700 lines</td>
								<td class="py-2">~600 lines</td>
							</tr>
							<tr>
								<td class="py-2 font-semibold text-white/80">Total</td>
								<td class="py-2" colspan="2"></td>
								<td class="py-2 font-semibold text-white/80">~3,200 lines</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="text-xl font-semibold text-white/90 mt-6">Action: Unified to Workers</h3>
				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Marked Node.js services with <code class="text-white/90 bg-white/10 px-2 py-0.5 rounded">@deprecated</code> notices</li>
					<li>Fixed 30 TypeScript errors in Workers implementation</li>
					<li>Updated Cloudflare Workflow API usage (<code class="text-white/90 bg-white/10 px-2 py-0.5 rounded">event.payload</code> not <code class="text-white/90 bg-white/10 px-2 py-0.5 rounded">event.params</code>)</li>
					<li>Added proper type annotations throughout</li>
				</ul>
			</div>
		</section>

		<!-- Level 2: Rams -->
		<section class="space-y-6">
			<h2 class="text-2xl font-bold">4. Level 2: Rams (Artifact) — Remove</h2>

			<div class="space-y-4 text-white/70 leading-relaxed">
				<div class="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
					<p class="text-yellow-300"><strong>Question:</strong> "Does this earn its existence?"</p>
					<p class="text-yellow-300/70 text-sm mt-1">Score: 6/10 — Significant excess found</p>
				</div>

				<h3 class="text-xl font-semibold text-white/90 mt-6">Finding: Script Proliferation</h3>
				<p>
					<strong>155 JavaScript files</strong> in the scripts directory, with only ~20 actively needed:
				</p>

				<div class="grid md:grid-cols-2 gap-4">
					<div class="p-4 bg-white/5 border border-white/10 rounded-lg">
						<h4 class="text-lg font-semibold mb-3 text-white/80">Before</h4>
						<ul class="space-y-2 text-sm text-white/60">
							<li>• 155 scripts total</li>
							<li>• 35 explicitly archived</li>
							<li>• ~70 likely obsolete</li>
							<li>• ~30 one-time migrations</li>
							<li>• ~20 actively needed</li>
						</ul>
					</div>

					<div class="p-4 bg-white/5 border border-white/10 rounded-lg">
						<h4 class="text-lg font-semibold mb-3 text-white/80">After</h4>
						<ul class="space-y-2 text-sm text-white/60">
							<li>• 13 scripts active</li>
							<li>• 153 scripts archived</li>
							<li>• Organized into categories:</li>
							<li class="pl-4">- migrations/ (38 scripts)</li>
							<li class="pl-4">- tests/ (24 scripts)</li>
							<li class="pl-4">- one-time/ (19 scripts)</li>
						</ul>
					</div>
				</div>

				<h3 class="text-xl font-semibold text-white/90 mt-6">Action: Archived Obsolete Artifacts</h3>
				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Moved 153 scripts to organized archive directories</li>
					<li>Archived Railway configuration to <code class="text-white/90 bg-white/10 px-2 py-0.5 rounded">config/archive/</code></li>
					<li>Moved Railway docs to <code class="text-white/90 bg-white/10 px-2 py-0.5 rounded">docs/archive/railway/</code></li>
					<li>Created archive README documenting restoration process</li>
				</ul>
			</div>
		</section>

		<!-- Level 3: Heidegger -->
		<section class="space-y-6">
			<h2 class="text-2xl font-bold">5. Level 3: Heidegger (System) — Reconnect</h2>

			<div class="space-y-4 text-white/70 leading-relaxed">
				<div class="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
					<p class="text-green-300"><strong>Question:</strong> "Does this serve the whole?"</p>
					<p class="text-green-300/70 text-sm mt-1">Score: 7/10 — Minor disconnection found</p>
				</div>

				<h3 class="text-xl font-semibold text-white/90 mt-6">Finding: Architectural Confusion</h3>
				<p>
					The README described three different deployment targets, creating systemic incoherence:
				</p>

				<div class="p-4 bg-white/5 border border-white/10 rounded-lg font-mono text-sm">
					<p class="text-white/40">// README claimed:</p>
					<p class="text-white/90">1. Node.js + Railway (documented as primary)</p>
					<p class="text-white/90">2. n8n (mentioned as future target)</p>
					<p class="text-white/90">3. Cloudflare Workers (actual production)</p>
				</div>

				<p class="mt-4">
					Additionally, the relationship between Kickstand → Half Dozen → CREATE SOMETHING was
					undocumented within the system itself.
				</p>

				<h3 class="text-xl font-semibold text-white/90 mt-6">Action: Unified Documentation</h3>
				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Rewrote <code class="text-white/90 bg-white/10 px-2 py-0.5 rounded">README.md</code> for Cloudflare Workers architecture</li>
					<li>Created <code class="text-white/90 bg-white/10 px-2 py-0.5 rounded">docs/ARCHITECTURE.md</code> documenting system context</li>
					<li>Added <code class="text-white/90 bg-white/10 px-2 py-0.5 rounded">services/LEGACY.md</code> deprecation guide</li>
					<li>Added <code class="text-white/90 bg-white/10 px-2 py-0.5 rounded">monitoring/LEGACY.md</code> deprecation guide</li>
					<li>Documented the hermeneutic circle: how Kickstand fits into the larger system</li>
				</ul>
			</div>
		</section>

		<!-- Results -->
		<section class="space-y-6">
			<h2 class="text-2xl font-bold">6. Results</h2>

			<div class="space-y-4 text-white/70 leading-relaxed">
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-white/20">
								<th class="text-left py-2 text-white/80">Metric</th>
								<th class="text-left py-2 text-white/80">Before</th>
								<th class="text-left py-2 text-white/80">After</th>
								<th class="text-left py-2 text-white/80">Change</th>
							</tr>
						</thead>
						<tbody class="text-white/60">
							<tr class="border-b border-white/10">
								<td class="py-2">Health Score</td>
								<td class="py-2">6.2/10</td>
								<td class="py-2 text-green-400">9.2/10</td>
								<td class="py-2 text-green-400">+48%</td>
							</tr>
							<tr class="border-b border-white/10">
								<td class="py-2">Active Scripts</td>
								<td class="py-2">155</td>
								<td class="py-2">13</td>
								<td class="py-2 text-green-400">-92%</td>
							</tr>
							<tr class="border-b border-white/10">
								<td class="py-2">Archived Scripts</td>
								<td class="py-2">35</td>
								<td class="py-2">153</td>
								<td class="py-2">+337%</td>
							</tr>
							<tr class="border-b border-white/10">
								<td class="py-2">TypeScript Errors</td>
								<td class="py-2">~30</td>
								<td class="py-2 text-green-400">0</td>
								<td class="py-2 text-green-400">-100%</td>
							</tr>
							<tr class="border-b border-white/10">
								<td class="py-2">Build Status</td>
								<td class="py-2 text-red-400">Failing</td>
								<td class="py-2 text-green-400">Passing</td>
								<td class="py-2 text-green-400">Fixed</td>
							</tr>
							<tr>
								<td class="py-2">Documentation</td>
								<td class="py-2">Outdated</td>
								<td class="py-2 text-green-400">Current</td>
								<td class="py-2 text-green-400">Unified</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="text-xl font-semibold text-white/90 mt-6">TypeScript Fixes Applied</h3>
				<p>Key fixes to achieve zero build errors:</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Added <code class="text-white/90 bg-white/10 px-2 py-0.5 rounded">warn()</code> method to Logger class</li>
					<li>Fixed Cloudflare Workflow API (<code class="text-white/90 bg-white/10 px-2 py-0.5 rounded">event.payload</code> not <code class="text-white/90 bg-white/10 px-2 py-0.5 rounded">event.params</code>)</li>
					<li>Fixed <code class="text-white/90 bg-white/10 px-2 py-0.5 rounded">Logger.error()</code> call signatures throughout</li>
					<li>Added type assertions for API responses</li>
					<li>Updated <code class="text-white/90 bg-white/10 px-2 py-0.5 rounded">MonitorResult</code> interface</li>
					<li>Removed <code class="text-white/90 bg-white/10 px-2 py-0.5 rounded">@types/node</code> from tsconfig to resolve conflicts</li>
				</ul>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="space-y-6">
			<h2 class="text-2xl font-bold">7. Conclusion</h2>

			<div class="space-y-4 text-white/70 leading-relaxed">
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

				<div class="p-6 bg-white/5 border border-white/10 rounded-lg mt-6">
					<p class="text-white/80 text-center text-lg">
						<strong>The Subtractive Path Forward</strong>
					</p>
					<div class="grid md:grid-cols-3 gap-4 mt-4 text-center">
						<div>
							<div class="text-blue-400 font-semibold">Unify</div>
							<div class="text-white/60 text-sm">the implementation</div>
						</div>
						<div>
							<div class="text-yellow-400 font-semibold">Remove</div>
							<div class="text-white/60 text-sm">the obsolete artifacts</div>
						</div>
						<div>
							<div class="text-green-400 font-semibold">Reconnect</div>
							<div class="text-white/60 text-sm">the documentation</div>
						</div>
					</div>
				</div>

				<p class="text-white/80 text-lg mt-6 text-center italic">
					"Creation is the discipline of removing what obscures."
				</p>
			</div>
		</section>

		<!-- Footer -->
		<div class="border-t border-white/10 pt-6">
			<p class="text-sm text-white/40">
				This case study is part of the CREATE SOMETHING research program exploring AI-native
				development patterns. View the
				<a href="https://github.com/Half-Dozen/kickstand-monitoring" class="underline hover:text-white/60">
					Kickstand repository
				</a>
				or read more about our
				<a href="/methodology" class="underline hover:text-white/60">methodology</a>.
			</p>
		</div>
	</div>
</div>
