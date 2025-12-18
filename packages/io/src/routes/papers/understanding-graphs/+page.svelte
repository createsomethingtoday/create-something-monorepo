<script lang="ts">
	/**
	 * Understanding Graphs Paper
	 *
	 * Research paper demonstrating "Less, but better" codebase navigation
	 * through minimal, human-readable dependency documentation that captures
	 * only understanding-critical relationships.
	 *
	 * Applies Heidegger's hermeneutic circle to the problem of codebase comprehension.
	 */
</script>

<svelte:head>
	<title>Understanding Graphs: Less, But Better Codebase Navigation | CREATE SOMETHING.io</title>
	<meta name="description" content="Research paper applying Heidegger's hermeneutic circle to develop minimal dependency documentation that captures only understanding-critical relationships." />
</svelte:head>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2024-003</div>
			<h1 class="mb-3 paper-title">Understanding Graphs: "Less, But Better" Codebase Navigation</h1>
			<p class="max-w-3xl paper-subtitle">
				Applying Heidegger's hermeneutic circle to develop minimal dependency documentation
				that captures only understanding-critical relationships—replacing exhaustive tooling
				with human-readable insight.
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Research</span>
				<span>•</span>
				<span>15 min read</span>
				<span>•</span>
				<span>Advanced</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="abstract-section space-y-4">
			<h2 class="section-heading">Abstract</h2>
			<p class="body-text leading-relaxed">
				This paper presents <em>Understanding Graphs</em>: a minimal, human-readable approach to
				documenting codebase relationships that embodies Dieter Rams' principle "Weniger, aber besser"
				(less, but better). Through hermeneutic analysis, we identified that traditional dependency
				graphs fail the minimalism test—they capture <em>all</em> relationships when only
				<em>understanding-critical</em> ones matter. We developed a canonical format (UNDERSTANDING.md)
				that captures bidirectional semantic relationships, entry points for comprehension, and
				key concepts—all in plain markdown without tooling. Implementation across six packages
				in the CREATE SOMETHING monorepo validated the approach: developers can navigate the
				codebase through human-readable documents that Claude Code can also parse for context
				management. The contribution is both practical (a working system) and theoretical (a
				hermeneutic methodology for "sufficient" documentation).
			</p>
		</section>

		<!-- Metrics -->
		<section class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="p-4 metric-card">
				<div class="metric-value">6</div>
				<div class="metric-label">Packages documented</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">1</div>
				<div class="metric-label">New Skill created</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">0</div>
				<div class="metric-label">External tools required</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">~2hr</div>
				<div class="metric-label">Development time</div>
			</div>
		</section>

		<!-- Introduction -->
		<section class="space-y-6">
			<h2 class="section-heading">1. Introduction</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The question arose during a discussion of agent reasoning in large codebases: would
					Markov Chains improve context management? This led to a deeper inquiry: what do agents
					(and humans) actually need to <em>understand</em> code?
				</p>

				<p>
					Traditional dependency graphs answer the wrong question. They show <strong>all</strong>
					relationships—every import, every type reference, every function call. But comprehension
					doesn't require exhaustive mapping; it requires <strong>sufficient</strong> mapping.
					The hermeneutic question became: <em>What is sufficient for understanding?</em>
				</p>

				<p>
					This research asks: <strong>Can dependency documentation embody "Less, but better"?</strong>
				</p>

				<p>
					We propose "Understanding Graphs"—minimal documents that capture only what's needed
					to comprehend a package in context. These documents:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Are human-readable (plain markdown, no visualization required)</li>
					<li>Are machine-parseable (Claude Code can use them for context)</li>
					<li>Capture bidirectional relationships (depends on + enables understanding of)</li>
					<li>Include semantic meaning (why, not just what)</li>
					<li>Require no tooling (no LSP, no graph database, no build step)</li>
				</ul>

				<p class="emphasis-text">
					<strong>Contributions:</strong> (1) A hermeneutic methodology for "sufficient" documentation,
					(2) The UNDERSTANDING.md canonical format, (3) Implementation across CREATE SOMETHING monorepo,
					(4) A Claude Code Skill for maintaining understanding graphs.
				</p>
			</div>
		</section>

		<!-- Methodology -->
		<section class="space-y-6">
			<h2 class="section-heading">2. Methodology: Hermeneutic Analysis</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					We applied Heidegger's <em>hermeneutic circle</em>—the interpretive method where
					understanding emerges through movement between whole and parts. The "whole" was the
					CREATE SOMETHING methodology; the "part" was dependency documentation.
				</p>

				<h3 class="mt-6 subsection-heading">2.1 First Movement: Whole → Part</h3>
				<p>
					We began by examining what traditional dependency graphs provide:
				</p>

				<div class="p-4 font-mono code-block">
					<p class="code-comment">// Traditional approach: exhaustive</p>
					<p class="code-primary">FileA.ts imports → types.ts, utils.ts, config.ts, ...</p>
					<p class="code-primary">FileA.ts calls → functionX(), functionY(), functionZ(), ...</p>
					<p class="code-primary">FileA.ts references → TypeA, TypeB, InterfaceC, ...</p>
				</div>

				<p class="mt-4">
					This violates Rams' principles: it's not <em>useful</em> (overwhelming), not
					<em>unobtrusive</em> (requires tooling), and certainly not "as little as possible."
				</p>

				<h3 class="mt-6 subsection-heading">2.2 Second Movement: Part → Whole</h3>
				<p>
					We then asked: what would <em>sufficient</em> documentation look like? The hermeneutic
					insight emerged: understanding is not about knowing all connections but about knowing
					<strong>where to start</strong> and <strong>what relates to what semantically</strong>.
				</p>

				<p>
					A developer doesn't need to know every import. They need to know:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>Purpose</strong>: What does this package do? (one sentence)</li>
					<li><strong>Position</strong>: How does it fit in the larger system?</li>
					<li><strong>Entry points</strong>: What 3-5 files should I read first?</li>
					<li><strong>Key concepts</strong>: What terms might confuse me?</li>
					<li><strong>Relationships</strong>: What does this depend on? What depends on this?</li>
				</ul>

				<h3 class="mt-6 subsection-heading">2.3 The Hermeneutic Insight</h3>
				<p>
					The critical realization: dependency graphs are <em>unidirectional</em> (A depends on B),
					but understanding flows <em>bidirectionally</em>. Understanding A helps me understand B,
					and vice versa. The documentation format must capture this circular flow—exactly what
					the hermeneutic circle describes.
				</p>

				<div class="p-4 mt-4 callout-box">
					<p class="text-center callout-text">
						<strong>Key Insight</strong>: We don't need dependency graphs.<br/>
						We need <em>understanding</em> graphs.
					</p>
				</div>
			</div>
		</section>

		<!-- Implementation -->
		<section class="space-y-6">
			<h2 class="section-heading">3. Implementation</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">3.1 The UNDERSTANDING.md Format</h3>
				<p>
					We developed a canonical format that balances human readability with machine parseability:
				</p>

				<div class="p-4 font-mono overflow-x-auto code-block">
					<pre class="code-primary">{`# Understanding: [Package Name]

> **[One-sentence purpose]**

## Ontological Position
**Mode of Being**: [Role in system]
[2-3 sentences on relationship to whole]

## Depends On (Understanding-Critical)
| Dependency | Why It Matters |
|------------|----------------|
| \`pkg\`    | [What this enables] |

## Enables Understanding Of
| Consumer | What This Clarifies |
|----------|---------------------|
| \`pkg\`  | [How this helps] |

## To Understand This Package, Read
1. **[file]** — [Why this is entry point]
2. **[file]** — [What concept this explains]

## Key Concepts
| Concept | Definition | Where |
|---------|------------|-------|
| [Term]  | [Brief]    | [File]|`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">3.2 What Makes It "Less, But Better"</h3>

				<div class="grid md:grid-cols-2 gap-6">
					<div class="p-6 info-card">
						<h4 class="mb-3 card-heading">Less</h4>
						<ul class="space-y-2 card-list">
							<li>• No external tooling</li>
							<li>• No graph databases</li>
							<li>• No visualization requirements</li>
							<li>• No LSP dependency</li>
							<li>• No build step</li>
							<li>• Only understanding-critical relationships</li>
						</ul>
					</div>

					<div class="p-6 info-card">
						<h4 class="mb-3 card-heading">Better</h4>
						<ul class="space-y-2 card-list">
							<li>• Human-readable (developers can read it)</li>
							<li>• Machine-parseable (Claude can use it)</li>
							<li>• Captures semantic relationships</li>
							<li>• Includes "what to read" guidance</li>
							<li>• Bidirectional (depends on + enables)</li>
							<li>• Self-contained (no external lookups)</li>
						</ul>
					</div>
				</div>

				<h3 class="mt-6 subsection-heading">3.3 Monorepo Implementation</h3>
				<p>
					We created UNDERSTANDING.md files for all six packages in the CREATE SOMETHING monorepo:
				</p>

				<div class="p-4 font-mono code-block">
					<pre class="code-primary">{`packages/
├── components/UNDERSTANDING.md  → Foundation (Vorverständnis)
├── tufte/UNDERSTANDING.md       → Visualization foundation
├── ltd/UNDERSTANDING.md         → Being-as-Canon
├── io/UNDERSTANDING.md          → Being-as-Document
├── space/UNDERSTANDING.md       → Being-as-Experience
└── agency/UNDERSTANDING.md      → Being-as-Service`}</pre>
				</div>

				<p class="mt-4">
					Each file follows the canonical format, capturing only what's needed to understand
					that package in the context of the hermeneutic workflow.
				</p>

				<h3 class="mt-6 subsection-heading">3.4 Claude Code Skill</h3>
				<p>
					To maintain understanding graphs over time, we created the <code class="inline-code">understanding-graphs</code> Skill.
					This Skill provides:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Guidelines for creating new UNDERSTANDING.md files</li>
					<li>Validation checklist (one-sentence purpose, 3-5 entry points, etc.)</li>
					<li>Update criteria (when to update vs. leave alone)</li>
					<li>Integration with other CREATE SOMETHING Skills</li>
				</ul>
			</div>
		</section>

		<!-- Results -->
		<section class="space-y-6">
			<h2 class="section-heading">4. Results</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">4.1 Comparison: Traditional vs. Understanding Graphs</h3>

				<div class="overflow-x-auto">
					<table class="w-full comparison-table">
						<thead>
							<tr>
								<th>Aspect</th>
								<th>Traditional</th>
								<th>Understanding Graphs</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Relationships captured</td>
								<td>All imports, calls, types</td>
								<td>Only understanding-critical</td>
							</tr>
							<tr>
								<td>Tooling required</td>
								<td>LSP, visualizers, graph DB</td>
								<td>None (plain markdown)</td>
							</tr>
							<tr>
								<td>Direction</td>
								<td>Unidirectional (A → B)</td>
								<td>Bidirectional (A ↔ B)</td>
							</tr>
							<tr>
								<td>Content</td>
								<td>What (structural)</td>
								<td>Why (semantic)</td>
							</tr>
							<tr>
								<td>Human-readable</td>
								<td>Requires visualization</td>
								<td>Native markdown</td>
							</tr>
							<tr>
								<td>Machine-parseable</td>
								<td>Yes (but complex)</td>
								<td>Yes (simple text)</td>
							</tr>
							<tr>
								<td>Maintenance</td>
								<td>Automatic but noisy</td>
								<td>Manual but minimal</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="mt-6 subsection-heading">4.2 Hermeneutic Circle Validation</h3>
				<p>
					The implementation completed the hermeneutic circle:
				</p>

				<div class="p-4 validation-box">
					<div class="space-y-2 validation-list">
						<p><strong class="validation-label">.ltd (Canon)</strong>: Does it embody Rams' principles? ✅ Minimal, honest, unobtrusive</p>
						<p><strong class="validation-label">.io (Research)</strong>: Is there theoretical grounding? ✅ Hermeneutic methodology documented</p>
						<p><strong class="validation-label">.space (Practice)</strong>: Does it work hands-on? ✅ 6 packages successfully documented</p>
						<p><strong class="validation-label">.agency (Service)</strong>: Commercial validation? 🔄 Pending client application</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Discussion -->
		<section class="space-y-6">
			<h2 class="section-heading">5. Discussion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">5.1 Why Markov Chains Were the Wrong Question</h3>
				<p>
					The original question—whether Markov Chains could improve agent reasoning—assumed the
					problem was <em>state compression</em>. But the hermeneutic analysis revealed the actual
					problem is <em>semantic navigation</em>. Markov Chains are memoryless; understanding
					requires accumulated context. The hermeneutic circle works precisely because we carry
					prior understanding into each new encounter.
				</p>

				<p>
					Understanding Graphs enable this accumulation: each UNDERSTANDING.md provides the
					pre-understanding (Vorverständnis) needed to engage with a package. Claude Code can
					read these documents to build context without loading entire codebases.
				</p>

				<h3 class="mt-6 subsection-heading">5.2 Implications for AI-Native Development</h3>
				<p>
					This research suggests a pattern for AI-human collaboration in codebase navigation:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>Human-authored understanding</strong>: Developers write UNDERSTANDING.md with semantic insight</li>
					<li><strong>AI-consumed context</strong>: Claude Code uses these for efficient navigation</li>
					<li><strong>AI-assisted maintenance</strong>: The understanding-graphs Skill guides updates</li>
					<li><strong>Bidirectional benefit</strong>: Both humans and AI navigate the same documentation</li>
				</ul>

				<h3 class="mt-6 subsection-heading">5.3 Limitations</h3>
				<p>
					Understanding Graphs require human judgment to identify "understanding-critical" relationships.
					This is both a strength (captures semantic meaning machines miss) and limitation (requires
					maintenance). We mitigate this through:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Clear validation checklist (one-sentence purpose, 3-5 entry points)</li>
					<li>Staleness tracking ("Last validated" date)</li>
					<li>Update criteria (only on structural changes, not bug fixes)</li>
				</ul>

				<h3 class="mt-6 subsection-heading">5.4 Future Work</h3>
				<p>
					Potential extensions include:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Automated staleness detection (compare UNDERSTANDING.md to recent commits)</li>
					<li>Graph visualization from markdown (optional, generated on demand)</li>
					<li>Cross-repository understanding graphs (for microservices)</li>
					<li>Integration with IDE navigation (jump to entry points)</li>
				</ul>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">6. Conclusion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					This research demonstrates that dependency documentation can embody "Less, but better."
					Traditional dependency graphs violate Rams' principles—they're exhaustive when sufficiency
					is needed, require tooling when plain text suffices, and capture structure when meaning matters.
				</p>

				<p>
					Understanding Graphs invert these assumptions. By applying Heidegger's hermeneutic circle,
					we identified that codebase comprehension requires <em>semantic navigation</em>, not
					<em>exhaustive mapping</em>. The UNDERSTANDING.md format captures only what's needed:
					purpose, position, entry points, concepts, and bidirectional relationships.
				</p>

				<p>
					Implementation across the CREATE SOMETHING monorepo validated the approach. Six packages
					now have human-readable, machine-parseable understanding graphs that require no tooling
					and embody the minimalist philosophy that guides the entire methodology.
				</p>

				<p class="mt-6 conclusion-insight">
					<strong>The hermeneutic insight</strong>: To understand a codebase, you don't need all
					relationships—just the right ones.
				</p>
			</div>
		</section>

		<!-- References -->
		<section class="references-section space-y-4">
			<h2 class="section-heading">References</h2>

			<div class="space-y-3 references-list">
				<div class="pl-6 -indent-6">
					[1] Heidegger, Martin (1962). <em>Being and Time</em> (J. Macquarrie & E. Robinson, Trans.).
					Harper & Row. (Original work published 1927)
				</div>

				<div class="pl-6 -indent-6">
					[2] Gadamer, Hans-Georg (1975). <em>Truth and Method</em> (G. Barden & J. Cumming, Trans.).
					Seabury Press. (Original work published 1960)
				</div>

				<div class="pl-6 -indent-6">
					[3] Rams, Dieter (1995). <em>Less and More: The Design Ethos of Dieter Rams</em>.
					Gestalten Verlag.
				</div>

				<div class="pl-6 -indent-6">
					[4] CREATE SOMETHING methodology.
					<a href="https://createsomething.io/methodology" class="reference-link">
						https://createsomething.io/methodology
					</a>
				</div>

				<div class="pl-6 -indent-6">
					[5] CREATE SOMETHING Skills documentation.
					<a href="https://github.com/createsomethingtoday/create-something-monorepo/blob/main/SKILLS.md" class="reference-link">
						SKILLS.md
					</a>
				</div>
			</div>
		</section>

		<!-- Footer -->
		<div class="paper-footer">
			<p class="footer-text">
				This paper is part of the CREATE SOMETHING research program exploring AI-native
				development patterns. View the
				<a href="https://github.com/createsomethingtoday/create-something-monorepo" class="footer-link">
					source repository
				</a>
				or read more about our
				<a href="/methodology" class="footer-link">methodology</a>.
			</p>
		</div>
	</div>
</div>

<style>
	/* Paper Container */
	.paper-container {
		background-color: var(--color-bg-pure);
	}

	/* Header Styles */
	.paper-header {
		border-bottom: 1px solid var(--color-border-default);
	}

	.paper-id {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.paper-title {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.paper-subtitle {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-lg);
	}

	.paper-meta {
		color: var(--color-fg-subtle);
		font-size: var(--text-body-sm);
	}

	/* Section Styles */
	.section-heading {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.subsection-heading {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-secondary);
	}

	.body-text {
		color: var(--color-fg-tertiary);
	}

	.emphasis-text {
		color: var(--color-fg-secondary);
	}

	/* Abstract Section */
	.abstract-section {
		border-left: 4px solid var(--color-border-emphasis);
		padding-left: var(--space-md);
	}

	/* Metric Cards */
	.metric-card {
		background-color: var(--color-bg-subtle);
		border-radius: var(--radius-lg);
	}

	.metric-value {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.metric-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Code Blocks */
	.code-block {
		background-color: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow-x: auto;
	}

	.code-comment {
		color: var(--color-fg-muted);
	}

	.code-primary {
		color: var(--color-fg-secondary);
	}

	.inline-code {
		background-color: var(--color-bg-subtle);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Info Cards */
	.info-card {
		background-color: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.card-heading {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.card-list {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	/* Callout Box */
	.callout-box {
		background-color: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.callout-text {
		color: var(--color-fg-secondary);
	}

	/* Table Styles */
	.comparison-table {
		font-size: var(--text-body-sm);
	}

	.comparison-table th {
		color: var(--color-fg-secondary);
		border-bottom: 1px solid var(--color-border-emphasis);
		padding: 0.5rem 0;
		text-align: left;
	}

	.comparison-table tbody tr {
		border-bottom: 1px solid var(--color-border-default);
	}

	.comparison-table td {
		color: var(--color-fg-tertiary);
		padding: 0.5rem 0;
	}

	/* Validation Box */
	.validation-box {
		background-color: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.validation-list {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.validation-label {
		color: var(--color-fg-secondary);
	}

	/* Conclusion */
	.conclusion-insight {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	/* References */
	.references-section {
		border-top: 1px solid var(--color-border-default);
		padding-top: var(--space-lg);
	}

	.references-list {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.reference-link {
		color: var(--color-fg-secondary);
		text-decoration: underline;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.reference-link:hover {
		color: var(--color-fg-primary);
	}

	/* Footer */
	.paper-footer {
		border-top: 1px solid var(--color-border-default);
		padding-top: var(--space-md);
	}

	.footer-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-link {
		text-decoration: underline;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-tertiary);
	}
</style>
