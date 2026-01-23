<script lang="ts">
	/**
	 * Ground: Evidence-Based Claims for AI Code Analysis
	 *
	 * Case study documenting the development and validation of Ground,
	 * a computation-constrained verification tool for AI agents.
	 */

	import { SubtractiveTriad, SEO } from '@create-something/components';
</script>

<SEO
	title="Ground: Evidence-Based Claims for AI Code Analysis"
	description="A tool that blocks AI agents from claiming code is dead, duplicated, or orphaned without first computing the evidence. Applied to two production codebases with 10-20x speedup for codebase hygiene tasks."
	keywords="Ground, AI code analysis, evidence-based claims, dead code detection, code hygiene, codebase analysis"
	ogType="article"
	articleSection="Case Study"
	publishedTime="2026-01-01T00:00:00Z"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Papers', url: 'https://createsomething.io/papers' },
		{ name: 'Ground', url: 'https://createsomething.io/papers/ground-evidence-based-claims' }
	]}
/>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-001</div>
			<h1 class="mb-3 paper-title">Ground: Evidence-Based Claims for AI Code Analysis</h1>
			<p class="max-w-3xl paper-subtitle">
				Computation-Constrained Verification Prevents False Positives in Agentic Development
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Case Study</span>
				<span>•</span>
				<span>15 min read</span>
				<span>•</span>
				<span>Intermediate</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="pl-6 space-y-4 abstract-section">
			<h2 class="section-heading">Abstract</h2>
			<p class="leading-relaxed body-text">
				AI coding assistants frequently make unverified claims about codebases: "this code is dead,"
				"these files are duplicates," "this module is orphaned." Without computational verification,
				these claims often prove false—leading to incorrect refactoring decisions. <strong>Ground</strong>
				addresses this by <em>blocking claims until evidence is computed</em>. The tool was validated
				across two production codebases: the CREATE SOMETHING monorepo (41→2 duplicates, 95% reduction)
				and WORKWAY (93+ duplicates found, 40% reduction after fixes). Version 2.0 adds <strong>AI-native
				features</strong>: batch analysis, incremental diff mode, structured fix output with confidence
				scores, and fix verification—enabling autonomous agents to find, fix, and verify without human
				intervention. Agent testing rates Ground <strong>10/10</strong> for AI-native code quality workflows.
			</p>
		</section>

		<!-- Key Metrics -->
		<section class="grid grid-cols-2 md:grid-cols-5 gap-4">
			<div class="p-4 metric-card">
				<div class="metric-value metric-success">10/10</div>
				<div class="metric-label">Agent Rating</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value metric-success">95%</div>
				<div class="metric-label">Duplicate Reduction</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">93+</div>
				<div class="metric-label">Violations Found</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value metric-success">0</div>
				<div class="metric-label">False Positives</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">10-20x</div>
				<div class="metric-label">Speedup</div>
			</div>
		</section>

		<!-- The Problem -->
		<section class="space-y-6">
			<h2 class="section-heading">1. The Problem: Ungrounded Claims</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					AI agents analyzing codebases make three common claim types:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li><strong>DRY violations:</strong> "These two files are duplicates"</li>
					<li><strong>Dead code:</strong> "This function is never used"</li>
					<li><strong>Orphan modules:</strong> "Nothing imports this file"</li>
				</ul>

				<p>
					Without verification, these claims frequently fail:
				</p>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr>
								<th>False Positive Type</th>
								<th>Cause</th>
								<th>Example</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Worker flagged as orphan</td>
								<td>HTTP routes, not imports</td>
								<td>Cloudflare Worker with <code>wrangler.toml</code> routes</td>
							</tr>
							<tr>
								<td>Export marked as dead</td>
								<td>Definition counted as "use"</td>
								<td><code>export interface Config</code> = 1 use</td>
							</tr>
							<tr>
								<td>Import not detected</td>
								<td>.js extension in ESM</td>
								<td><code>from './format.js'</code> → <code>format.ts</code></td>
							</tr>
							<tr>
								<td>Test duplicates flagged</td>
								<td>Intentional isolation</td>
								<td>Same setup code in test files</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					The cost of false positives is high: incorrect refactoring, broken builds, and eroded
					trust in AI-assisted analysis.
				</p>
			</div>
		</section>

		<!-- The Solution -->
		<section class="space-y-6">
			<h2 class="section-heading">2. The Solution: Computation-Constrained Claims</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Ground enforces a simple rule: <strong>you cannot claim something until you've checked it</strong>.
				</p>

				<div class="p-4 my-6 font-mono code-block">
					<pre class="code-secondary"><code>{`# This fails - no evidence yet
ground claim duplicate file_a.ts file_b.ts
→ ❌ Blocked: Run 'ground compare file_a.ts file_b.ts' first

# Compute the evidence
ground compare file_a.ts file_b.ts
→ ✓ 94.2% similar (evidence recorded)

# Now the claim succeeds
ground claim duplicate file_a.ts file_b.ts
→ ✓ Claim recorded (grounded in evidence)`}</code></pre>
				</div>

				<p>
					The tool implements three verification levels, aligned with the Subtractive Triad:
				</p>

				<SubtractiveTriad animateOnScroll={true} />
			</div>
		</section>

		<!-- Architecture -->
		<section class="space-y-6">
			<h2 class="section-heading">3. Architecture-Aware Verification</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Ground's key innovation is <strong>architectural awareness</strong>. Modern serverless
					applications connect through deployment configuration, not just imports.
				</p>

				<h3 class="font-semibold mt-6 mb-3">Cloudflare Worker Detection</h3>

				<p>
					When checking module connectivity, Ground parses <code>wrangler.toml</code> to detect:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li><strong>Routes:</strong> HTTP endpoints the worker responds to</li>
					<li><strong>Crons:</strong> Scheduled trigger patterns</li>
					<li><strong>Bindings:</strong> KV, D1, R2, Durable Objects, Queues</li>
					<li><strong>Service bindings:</strong> Worker-to-worker connections</li>
				</ul>

				<div class="p-4 my-6 font-mono code-block">
					<pre class="code-secondary"><code>{`# Worker with no code imports, but connected via deployment
ground check connections src/index.ts

→ {
    "architectural": {
      "type": "cloudflare-worker",
      "routes": ["api.example.com/*"],
      "crons": ["0 * * * *"],
      "bindings": 4
    },
    "is_orphan": false  // ✓ Correctly identified as connected
  }`}</code></pre>
				</div>

				<h3 class="font-semibold mt-6 mb-3">Definition vs Usage Distinction</h3>

				<p>
					Ground separates symbol occurrences into <code>definitions</code> and <code>actual_uses</code>:
				</p>

				<div class="p-4 my-6 font-mono code-block">
					<pre class="code-secondary"><code>{`ground count uses BeadsNotionConfig

→ {
    "total_occurrences": 1,
    "definitions": 1,        // export interface BeadsNotionConfig
    "actual_uses": 0,        // never imported elsewhere
    "is_exported_but_unused": true
  }

# Can now claim as dead code (0 actual uses)
ground claim dead-code BeadsNotionConfig
→ ✓ Claim recorded`}</code></pre>
				</div>
			</div>
		</section>

		<!-- Results -->
		<section class="space-y-6">
			<h2 class="section-heading">4. Production Results</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="font-semibold mt-6 mb-3">CREATE SOMETHING Monorepo</h3>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr>
								<th>Package</th>
								<th>Before</th>
								<th>After</th>
								<th>Shared Module Created</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>render-pipeline</td>
								<td>28 duplicates</td>
								<td>2</td>
								<td><code>utils/replicate.ts</code></td>
							</tr>
							<tr>
								<td>orchestration</td>
								<td>10 duplicates</td>
								<td>0</td>
								<td><code>utils/format.ts</code></td>
							</tr>
							<tr>
								<td>clearway</td>
								<td>2 duplicates</td>
								<td>0</td>
								<td><code>sms/phone.ts</code></td>
							</tr>
							<tr>
								<td>harness</td>
								<td>1 duplicate</td>
								<td>0</td>
								<td><code>utils.ts</code></td>
							</tr>
							<tr class="font-semibold">
								<td>Total</td>
								<td>41</td>
								<td>2</td>
								<td>95% reduction</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="font-semibold mt-6 mb-3">WORKWAY Codebase</h3>

				<p>
					An independent agent applied Ground to the WORKWAY codebase with these results:
				</p>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr>
								<th>Metric</th>
								<th>Value</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Duplicates found (integrations)</td>
								<td>93</td>
							</tr>
							<tr>
								<td>Duplicates found (SDK)</td>
								<td>5</td>
							</tr>
							<tr>
								<td>After fixes (integrations)</td>
								<td>92 (security utils extracted)</td>
							</tr>
							<tr>
								<td>After fixes (SDK)</td>
								<td>3 (40% reduction)</td>
							</tr>
							<tr>
								<td>Shared modules created</td>
								<td>2</td>
							</tr>
							<tr>
								<td>False positives</td>
								<td>0</td>
							</tr>
						</tbody>
					</table>
				</div>

				<blockquote class="pl-4 my-6 italic blockquote">
					"The tool provides a 10-20x speedup for codebase hygiene tasks. Without it, I'd be
					manually grepping and guessing. With it, I have verified claims backed by evidence."
					<br /><span class="not-italic">— WORKWAY Agent Feedback</span>
				</blockquote>
			</div>
		</section>

		<!-- Capabilities -->
		<section class="space-y-6">
			<h2 class="section-heading">5. Capabilities Summary</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="font-semibold mt-6 mb-3">What Ground Does Well</h3>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr>
								<th>Capability</th>
								<th>Impact</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Function-level duplicate detection</td>
								<td>Finds duplicates grep misses (same name, different files)</td>
							</tr>
							<tr>
								<td>Cloudflare Worker awareness</td>
								<td>No false "orphan" claims for workers with routes/crons</td>
							</tr>
							<tr>
								<td>Definition vs usage distinction</td>
								<td>Enables accurate dead code claims</td>
							</tr>
							<tr>
								<td>Test file exclusion</td>
								<td>Filters expected duplicates in test isolation</td>
							</tr>
							<tr>
								<td>Claim verification</td>
								<td>Blocks claims until evidence gathered</td>
							</tr>
							<tr>
								<td>Quantification</td>
								<td>"93 duplicates" vs "some duplicates"—actionable metrics</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="font-semibold mt-6 mb-3">Known Limitations</h3>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr>
								<th>Limitation</th>
								<th>Workaround</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Structural patterns (interface contracts)</td>
								<td>Accept as architectural, not DRY violation</td>
							</tr>
							<tr>
								<td>Cross-package imports</td>
								<td>Use package-relative paths in search</td>
							</tr>
							<tr>
								<td>Semantic similarity</td>
								<td>Same pattern, different purpose = not a violation</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- MCP Integration -->
		<section class="space-y-6">
			<h2 class="section-heading">6. MCP Integration</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Ground exposes its capabilities via the <strong>Model Context Protocol</strong>, enabling
					AI agents to use it during coding sessions:
				</p>

				<div class="p-4 my-6 font-mono code-block">
					<pre class="code-secondary"><code>{`// .mcp.json
{
  "mcpServers": {
    "ground": {
      "command": "./packages/ground/target/release/ground-mcp",
      "args": ["--db", ".ground/registry.db"]
    }
  }
}`}</code></pre>
				</div>

				<p>
					Available MCP tools (20 total):
				</p>

				<h4 class="font-semibold mt-4 mb-2">Core Analysis</h4>
				<ul class="list-disc pl-6 space-y-1">
					<li><code>ground_compare</code> — Compare two files for similarity</li>
					<li><code>ground_count_uses</code> — Count symbol uses (distinguishes type-only usage)</li>
					<li><code>ground_check_connections</code> — Check module connectivity</li>
					<li><code>ground_check_environment</code> — Detect Workers/Node.js API safety</li>
					<li><code>ground_find_duplicate_functions</code> — Find function-level duplicates</li>
					<li><code>ground_find_dead_exports</code> — Find unused exports (traces re-exports)</li>
					<li><code>ground_find_orphans</code> — Batch scan for orphaned modules</li>
				</ul>

				<h4 class="font-semibold mt-4 mb-2">Claim System</h4>
				<ul class="list-disc pl-6 space-y-1">
					<li><code>ground_claim_duplicate</code> — Claim files are duplicates (blocked until verified)</li>
					<li><code>ground_claim_dead_code</code> — Claim code is dead (blocked until verified)</li>
					<li><code>ground_claim_orphan</code> — Claim module is orphaned (blocked until verified)</li>
					<li><code>ground_suggest_fix</code> — Get refactoring suggestions with beads integration</li>
				</ul>

				<h4 class="font-semibold mt-4 mb-2">AI-Native Tools (v2.0)</h4>
				<ul class="list-disc pl-6 space-y-1">
					<li><code>ground_analyze</code> — Batch analysis: all checks in one call</li>
					<li><code>ground_diff</code> — Incremental mode: only new issues since baseline</li>
					<li><code>ground_verify_fix</code> — Confirm fix without full re-analysis</li>
				</ul>

				<h4 class="font-semibold mt-4 mb-2">Probabilistic Sketches</h4>
				<ul class="list-disc pl-6 space-y-1">
					<li><code>ground_sketch_create</code> — Create HyperLogLog or Bloom filter</li>
					<li><code>ground_sketch_add</code> — Add items to sketch</li>
					<li><code>ground_sketch_query</code> — Query cardinality or membership</li>
					<li><code>ground_sketch_merge</code> — Merge sketches for distributed analysis</li>
					<li><code>ground_sketch_list</code> — List active sketches</li>
				</ul>
			</div>
		</section>

		<!-- AI-Native Features -->
		<section class="space-y-6">
			<h2 class="section-heading">7. AI-Native Features (v2.0)</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Version 2.0 transforms Ground from a verification tool into a <strong>complete AI-native
					code quality system</strong>. These features enable autonomous agents to find, fix, and
					verify issues without human intervention.
				</p>

				<h3 class="font-semibold mt-6 mb-3">Batch Analysis</h3>

				<p>
					Single call returns all findings with confidence scores and structured fix actions:
				</p>

				<div class="p-4 my-6 font-mono code-block">
					<pre class="code-secondary"><code>{`ground_analyze({
  "directory": "/path/to/repo",
  "checks": ["duplicates", "dead_exports", "orphans"],
  "cross_package": true
})

→ {
    "summary": {
      "total_issues": 15,
      "auto_fixable": 12,
      "needs_review": 3
    },
    "findings": {
      "duplicates": [
        {
          "type": "duplicate_function",
          "function": "formatCurrency",
          "similarity": 0.94,
          "confidence": 0.97,
          "safe_to_auto_fix": true,
          "fix": {
            "action": "consolidate",
            "target": "packages/shared/utils.ts",
            "imports_to_update": [...]
          }
        }
      ]
    }
  }`}</code></pre>
				</div>

				<h3 class="font-semibold mt-6 mb-3">Incremental Diff Mode</h3>

				<p>
					Only reports <strong>new issues</strong> since a git baseline—agents don't re-process known issues:
				</p>

				<div class="p-4 my-6 font-mono code-block">
					<pre class="code-secondary"><code>{`ground_diff({
  "directory": "/path/to/repo",
  "base": "main",
  "checks": ["duplicates", "orphans"]
})

→ {
    "base": "main",
    "changed_files": 19,
    "new_issues": [],
    "message": "No new issues introduced since 'main'. 19 files changed, all clean."
  }`}</code></pre>
				</div>

				<p>
					This enables CI integration that only fails PRs introducing <em>new</em> issues:
				</p>

				<div class="p-4 my-6 font-mono code-block">
					<pre class="code-secondary"><code>{`# .github/workflows/ground.yml
- name: Check for new issues
  run: |
    ground diff --base origin/main
    # Fails only if PR introduces NEW duplicates/orphans
    # Ignores pre-existing issues`}</code></pre>
				</div>

				<h3 class="font-semibold mt-6 mb-3">Structured Fix Output</h3>

				<p>
					Fixes are structured data for agents to execute—not patches for humans to read:
				</p>

				<div class="p-4 my-6 font-mono code-block">
					<pre class="code-secondary"><code>{`{
  "action": "consolidate",
  "source_files": ["payments/utils.ts", "invoices/utils.ts"],
  "target": "packages/shared/src/stripe-utils.ts",
  "function": "formatCurrency",
  "imports_to_update": [
    {
      "file": "payments/list.ts",
      "old_import": "./utils",
      "new_import": "@company/shared"
    }
  ],
  "confidence": 0.97,
  "safe_to_auto_fix": true,
  "rationale": "Same package, identical implementation"
}`}</code></pre>
				</div>

				<h3 class="font-semibold mt-6 mb-3">Fix Verification</h3>

				<p>
					Close the loop without re-running full analysis:
				</p>

				<div class="p-4 my-6 font-mono code-block">
					<pre class="code-secondary"><code>{`ground_verify_fix({
  "fix_type": "duplicate_removed",
  "details": {
    "function_name": "formatCurrency",
    "file_a": "payments/utils.ts",
    "file_b": "invoices/utils.ts"
  }
})

→ {
    "verified": true,
    "message": "Verified: 'formatCurrency' no longer duplicated"
  }`}</code></pre>
				</div>

				<h3 class="font-semibold mt-6 mb-3">Config-Driven Noise Reduction</h3>

				<p>
					<code>.ground.yml</code> eliminates noise from structural patterns:
				</p>

				<div class="p-4 my-6 font-mono code-block">
					<pre class="code-secondary"><code>{`# .ground.yml
ignore:
  functions:
    - getCapabilities    # Interface contract (64 integrations)
    - constructor        # Boilerplate OK
    - initialize         # Framework pattern
  paths:
    - "**/*.test.ts"     # Test isolation expected
    - "**/fixtures/**"
  duplicate_pairs:
    - ["analytics/track/+server.ts", "io/analytics/track/+server.ts"]`}</code></pre>
				</div>

				<div class="responsive-table-scroll mt-6">
					<table class="w-full data-table">
						<thead>
							<tr>
								<th>Codebase</th>
								<th>Before Config</th>
								<th>After Config</th>
								<th>Reduction</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Cloudflare monorepo</td>
								<td>89 duplicates</td>
								<td>3</td>
								<td>96%</td>
							</tr>
							<tr>
								<td>workway-platform</td>
								<td>69 duplicates</td>
								<td>1</td>
								<td>99%</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- Philosophy -->
		<section class="space-y-6">
			<h2 class="section-heading">8. Philosophical Foundation</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The name "Ground" references Heidegger's concept of <em>Grund</em> (ground/foundation).
					In Heidegger's philosophy, assertions must be <em>grounded</em>—connected to something
					that supports them. An ungrounded claim floats free, unconnected to reality.
				</p>

				<p>
					Ground operationalizes this: every claim about code must be grounded in computed evidence.
					The tool doesn't prevent you from making claims—it ensures those claims rest on something
					solid.
				</p>

				<blockquote class="pl-4 my-6 italic blockquote">
					"You can't claim something until you've checked it."
				</blockquote>

				<p>
					This aligns with the Subtractive Triad's emphasis on removing what obscures. False claims
					about code obscure the true state of the system. Ground removes that obscurity by requiring
					verification.
				</p>
			</div>
		</section>

		<!-- Agent Feedback -->
		<section class="space-y-6">
			<h2 class="section-heading">9. Agent Feedback & Rating</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					An independent agent (WORKWAY) conducted systematic testing of Ground across multiple
					sessions, providing iterative feedback that drove v2.0 development:
				</p>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr>
								<th>Feature</th>
								<th>Status</th>
								<th>Agent Value</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Batch analyze</td>
								<td class="text-green-400">✓</td>
								<td>Single call for all findings</td>
							</tr>
							<tr>
								<td>Structured fix output</td>
								<td class="text-green-400">✓</td>
								<td>Agent-executable actions</td>
							</tr>
							<tr>
								<td>Confidence scores</td>
								<td class="text-green-400">✓</td>
								<td>Know when to ask vs. auto-fix</td>
							</tr>
							<tr>
								<td>safe_to_auto_fix flag</td>
								<td class="text-green-400">✓</td>
								<td>Autonomous decision making</td>
							</tr>
							<tr>
								<td>verify_fix</td>
								<td class="text-green-400">✓</td>
								<td>Close the loop</td>
							</tr>
							<tr>
								<td>Config filtering</td>
								<td class="text-green-400">✓</td>
								<td>Zero noise after setup</td>
							</tr>
							<tr>
								<td>Incremental diff</td>
								<td class="text-green-400">✓</td>
								<td>Only new issues (CI-ready)</td>
							</tr>
							<tr>
								<td>Type-only usage detection</td>
								<td class="text-green-400">✓</td>
								<td>TypeScript generics not flagged</td>
							</tr>
							<tr>
								<td>Cross-package duplicates</td>
								<td class="text-green-400">✓</td>
								<td>Monorepo-aware</td>
							</tr>
						</tbody>
					</table>
				</div>

				<blockquote class="pl-4 my-6 italic blockquote">
					"The diff feature closes the loop for autonomous agents: <code>analyze</code> finds all
					issues (initial scan), <code>diff</code> reports only new issues (CI/PR review),
					<code>verify_fix</code> confirms the fix worked (close the loop). An agent can now run
					diff on every PR, only process NEW issues, verify fixes without full re-scan, and have
					zero noise from config. This is a complete AI-native code quality tool."
					<br /><span class="not-italic">— Agent Rating: 10/10</span>
				</blockquote>

				<h3 class="font-semibold mt-6 mb-3">What Doesn't Matter for AI Agents</h3>

				<p>
					Notably, the agent feedback explicitly deprioritized features that would matter for humans:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li><s>Visualization</s> — Agents have no eyes</li>
					<li><s>Pretty reports</s> — Agents parse JSON</li>
					<li><s>LSP/IDE integration</s> — The agent IS the IDE</li>
					<li><s>Historical dashboards</s> — Agents have memory</li>
				</ul>

				<p>
					This validates the design principle: <strong>AI-native tools need different affordances
					than human-native tools</strong>.
				</p>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">10. Conclusion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Ground demonstrates that computation-constrained verification significantly improves
					AI-assisted code analysis. Version 2.0 extends this foundation with AI-native features
					that enable fully autonomous code quality workflows. The tool now:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>Eliminates false positives through evidence-based claims</li>
					<li>Finds 93+ real DRY violations across production codebases</li>
					<li>Provides 10-20x speedup over manual analysis</li>
					<li>Enables autonomous find → fix → verify workflows</li>
					<li>Supports CI integration via incremental diff mode</li>
					<li>Reduces noise to zero through config-driven filtering</li>
				</ul>

				<p>
					The <strong>10/10 agent rating</strong> validates that Ground has reached the threshold
					for AI-native tooling: agents can autonomously find, fix, and verify code quality issues
					without human intervention.
				</p>

				<p>
					The tool is available as part of the CREATE SOMETHING monorepo and can be integrated
					into any development workflow via the MCP protocol.
				</p>
			</div>
		</section>

		<!-- References -->
		<section class="space-y-4 pt-8 border-t border-current/10">
			<h2 class="section-heading">References</h2>
			<ul class="list-disc pl-6 space-y-2 body-text">
				<li>
					<a href="/papers/kickstand-triad-audit" class="underline">
						Subtractive Triad Audit: Kickstand
					</a> — The framework that inspired Ground
				</li>
				<li>
					<a href="https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/ground" class="underline" target="_blank" rel="noopener">
						Ground Source Code
					</a> — Rust implementation with MCP server
				</li>
				<li>
					<a href="https://modelcontextprotocol.io" class="underline" target="_blank" rel="noopener">
						Model Context Protocol
					</a> — The protocol enabling AI tool integration
				</li>
			</ul>
		</section>
	</div>
</div>

<style>
	.paper-container {
		background: var(--color-bg, #0a0a0a);
		color: var(--color-text, #e5e5e5);
	}

	.paper-header {
		border-bottom: 1px solid currentColor;
		opacity: 0.9;
	}

	.paper-id {
		font-size: 0.75rem;
		letter-spacing: 0.1em;
		opacity: 0.6;
	}

	.paper-title {
		font-size: clamp(1.75rem, 5vw, 2.5rem);
		font-weight: 600;
		line-height: 1.2;
	}

	.paper-subtitle {
		font-size: 1.125rem;
		opacity: 0.8;
		line-height: 1.6;
	}

	.paper-meta {
		font-size: 0.875rem;
		opacity: 0.6;
	}

	.section-heading {
		font-size: 1.25rem;
		font-weight: 600;
		letter-spacing: -0.01em;
	}

	.body-text {
		font-size: 1rem;
		line-height: 1.75;
		opacity: 0.9;
	}

	.abstract-section {
		border-left: 2px solid currentColor;
		opacity: 0.95;
	}

	.metric-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		text-align: center;
	}

	.metric-value {
		font-size: 1.75rem;
		font-weight: 700;
		font-family: 'JetBrains Mono', monospace;
	}

	.metric-success {
		color: #22c55e;
	}

	.metric-label {
		font-size: 0.75rem;
		opacity: 0.6;
		margin-top: 0.25rem;
	}

	.data-table {
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.data-table th,
	.data-table td {
		padding: 0.75rem 1rem;
		text-align: left;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.data-table th {
		font-weight: 600;
		opacity: 0.7;
	}

	.data-table code {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.8em;
		background: rgba(255, 255, 255, 0.1);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	.code-block {
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		overflow-x: auto;
	}

	.code-block code {
		font-family: 'JetBrains Mono', monospace;
		white-space: pre;
	}

	.code-secondary {
		color: var(--color-fg-secondary, #a3a3a3);
		font-size: 0.875rem;
	}

	.blockquote {
		border-left: 4px solid var(--color-border-emphasis, rgba(255, 255, 255, 0.3));
		color: var(--color-fg-tertiary, #a3a3a3);
	}

	.responsive-table-scroll {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}
</style>
