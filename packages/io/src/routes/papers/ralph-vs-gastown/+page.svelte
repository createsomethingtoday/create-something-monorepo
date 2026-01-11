<script lang="ts">
	/**
	 * Ralph vs Gastown: Comparing Agent Orchestration Patterns
	 *
	 * Research paper comparing two approaches to autonomous agent orchestration:
	 * Ralph (fresh context per iteration, sequential) vs Gastown (persistent sessions,
	 * parallel execution). Both achieve nondeterministic idempotence through different
	 * architectural choices.
	 */
</script>

<svelte:head>
	<title>Ralph vs Gastown: Comparing Agent Orchestration Patterns | CREATE SOMETHING.io</title>
	<meta name="description" content="Comparing two approaches to autonomous agent orchestration: Ralph spawns fresh contexts per iteration for sequential work; Gastown coordinates persistent parallel sessions. Decision matrix for choosing between them." />
</svelte:head>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-002</div>
			<h1 class="mb-3 paper-title">Ralph vs Gastown: Comparing Agent Orchestration Patterns</h1>
			<p class="max-w-3xl paper-subtitle">
				Two approaches to autonomous agent orchestration: Ralph spawns fresh contexts per iteration
				for sequential overnight work; Gastown coordinates persistent parallel sessions via tmux.
				Both achieve reliable outcomes through different architectural choices.
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Architecture</span>
				<span>-</span>
				<span>10 min read</span>
				<span>-</span>
				<span>Intermediate</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="abstract-section space-y-4">
			<h2 class="section-heading">Abstract</h2>
			<p class="body-text leading-relaxed">
				Autonomous AI agents require orchestration patterns that survive crashes, context limits,
				and interruptions. This paper compares two production-validated approaches: <strong>Ralph</strong>,
				which spawns fresh Claude Code instances per iteration to work through PRD stories sequentially,
				and <strong>Gastown</strong>, which coordinates multiple persistent sessions via tmux for
				parallel execution. We analyze when each pattern excels, their cost implications, and how
				they complement each other. Key finding: Ralph is the default for autonomous work (simpler,
				cheaper, overnight-friendly); Gastown is reserved for true parallelism needs (3+ independent
				features simultaneously).
			</p>
		</section>

		<!-- Key Metrics -->
		<section class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="p-4 metric-card">
				<div class="metric-value">Sequential</div>
				<div class="metric-label">Ralph execution</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">Parallel</div>
				<div class="metric-label">Gastown execution</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">Fresh</div>
				<div class="metric-label">Ralph context per iteration</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">Persistent</div>
				<div class="metric-label">Gastown sessions</div>
			</div>
		</section>

		<!-- Section 1: The Orchestration Problem -->
		<section class="space-y-6">
			<h2 class="section-heading">1. The Orchestration Problem</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					AI agents face inherent limitations: context windows fill, sessions crash, network
					connections drop. Any orchestration system must answer: <strong>how does work survive
					these failures?</strong>
				</p>

				<p>
					Both Ralph and Gastown solve this through <em>nondeterministic idempotence</em>: the path
					varies, but the destination is certain. Different iterations, same outcome. Crashes
					happen; work still completes.
				</p>

				<p>
					The key question is not "which is better" but "which fits your situation."
				</p>

				<div class="overflow-x-auto mt-6">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Challenge</th>
								<th>Ralph Solution</th>
								<th>Gastown Solution</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Context overflow</td>
								<td>Fresh context per iteration</td>
								<td>Persistent sessions with handoff</td>
							</tr>
							<tr>
								<td>Session crashes</td>
								<td>Restart picks up from next story</td>
								<td>Beads state survives; worker respawns</td>
							</tr>
							<tr>
								<td>Progress tracking</td>
								<td>prd.json + progress.txt</td>
								<td>Beads + hooks + checkpoints</td>
							</tr>
							<tr>
								<td>Human oversight</td>
								<td>Check results in the morning</td>
								<td>Monitor via tmux sessions</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- Section 2: Ralph Architecture -->
		<section class="space-y-6">
			<h2 class="section-heading">2. Ralph: Fresh Context Per Iteration</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Ralph is a bash script that spawns fresh Claude Code instances to work through user
					stories defined in a PRD (Product Requirements Document). Each iteration gets a clean
					context window.
				</p>

				<h3 class="subsection-heading">2.1 Architecture</h3>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{`ralph.sh
├── Read prd.json
├── Find story where passes == false
├── Spawn fresh Claude Code instance
├── Claude implements story, commits, updates prd.json
├── Log to progress.txt
├── If all stories pass → done
└── Repeat`}</pre>
				</div>

				<h3 class="subsection-heading">2.2 Key Insight: Context Pollution Prevention</h3>

				<p>
					When Claude works on story 1, it accumulates implementation details. By story 5, the
					context window is cluttered with irrelevant code from earlier stories. Fresh context
					per iteration means each story gets Claude's full attention.
				</p>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 comparison-success">
						<h4 class="mb-2 comparison-heading comparison-success-heading">What Works</h4>
						<ul class="comparison-list space-y-1">
							<li>Overnight autonomous work</li>
							<li>Sequential story dependencies</li>
							<li>Simple setup (bash script + JSON)</li>
							<li>Predictable costs per story</li>
						</ul>
					</div>

					<div class="p-4 comparison-warning">
						<h4 class="mb-2 comparison-heading comparison-warning-heading">Limitations</h4>
						<ul class="comparison-list space-y-1">
							<li>Sequential only (no parallelism)</li>
							<li>Context lost between iterations</li>
							<li>No live monitoring</li>
							<li>Stories must be self-contained</li>
						</ul>
					</div>
				</div>

				<h3 class="subsection-heading">2.3 PRD Format</h3>

				<p>
					The PRD is Claude's task board. Stories are marked <code>passes: false</code> until
					complete:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{`{
  "title": "User Authentication",
  "stories": [
    {
      "id": "story-1",
      "title": "Add login form",
      "acceptance": [
        "Form renders at /login",
        "Email validation works",
        "Tests pass"
      ],
      "files": ["src/routes/login/+page.svelte"],
      "passes": false
    }
  ]
}`}</pre>
				</div>
			</div>
		</section>

		<!-- Section 3: Gastown Architecture -->
		<section class="space-y-6">
			<h2 class="section-heading">3. Gastown: Persistent Parallel Sessions</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Gastown coordinates multiple Claude Code instances via tmux. Each worker maintains a
					persistent session, enabling true parallel execution with session recovery.
				</p>

				<h3 class="subsection-heading">3.1 Architecture</h3>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{`WezTerm
└── tmux (session persistence)
    ├── gt-coordinator    (you + Claude Code)
    ├── gt-witness-csm    (monitors per rig)
    ├── gt-refinery-csm   (merge queue per rig)
    ├── gt-steward        (background daemon)
    └── gt-worker-N       (ephemeral workers)`}</pre>
				</div>

				<h3 class="subsection-heading">3.2 Key Insight: GUPP (Get Up and Push Protocol)</h3>

				<p>
					Workers check their hook on startup. If work exists, they start immediately. No asking
					permission. This enables autonomous execution while maintaining coordination through
					Beads issue tracking.
				</p>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 comparison-success">
						<h4 class="mb-2 comparison-heading comparison-success-heading">What Works</h4>
						<ul class="comparison-list space-y-1">
							<li>3+ independent features in parallel</li>
							<li>3x speedup for parallelizable work</li>
							<li>Live monitoring via tmux</li>
							<li>Persistent context across restarts</li>
						</ul>
					</div>

					<div class="p-4 comparison-warning">
						<h4 class="mb-2 comparison-heading comparison-warning-heading">Limitations</h4>
						<ul class="comparison-list space-y-1">
							<li>Complex setup (tmux, Beads, multiple sessions)</li>
							<li>Higher cost (parallel API calls)</li>
							<li>Merge conflicts between workers</li>
							<li>Requires monitoring</li>
						</ul>
					</div>
				</div>

				<h3 class="subsection-heading">3.3 Convoy Pattern</h3>

				<p>
					A convoy batches related issues for parallel execution:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{`# Create convoy with three issues
gt convoy create "Auth feature" cs-login cs-session cs-middleware

# Assign to workers (run in parallel)
gt-smart-sling cs-login csm
gt-smart-sling cs-session csm
gt-smart-sling cs-middleware csm

# 90 min sequential → 30 min parallel`}</pre>
				</div>
			</div>
		</section>

		<!-- Section 4: Key Differences -->
		<section class="space-y-6">
			<h2 class="section-heading">4. Key Differences</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="overflow-x-auto mt-4">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Dimension</th>
								<th>Ralph</th>
								<th>Gastown</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td><strong>Execution</strong></td>
								<td>Sequential (one story at a time)</td>
								<td>Parallel (multiple workers)</td>
							</tr>
							<tr>
								<td><strong>Context</strong></td>
								<td>Fresh per iteration</td>
								<td>Persistent per session</td>
							</tr>
							<tr>
								<td><strong>State Storage</strong></td>
								<td>prd.json + progress.txt</td>
								<td>Beads + hooks + molecules</td>
							</tr>
							<tr>
								<td><strong>Setup Complexity</strong></td>
								<td>Low (bash script)</td>
								<td>High (tmux + Beads + roles)</td>
							</tr>
							<tr>
								<td><strong>Monitoring</strong></td>
								<td>Check progress.txt later</td>
								<td>Live via tmux sessions</td>
							</tr>
							<tr>
								<td><strong>Cost Model</strong></td>
								<td>Predictable per story</td>
								<td>Higher (parallel calls)</td>
							</tr>
							<tr>
								<td><strong>Best For</strong></td>
								<td>Overnight autonomous work</td>
								<td>Parallel independent features</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="subsection-heading">4.1 Context Model</h3>

				<p>
					The fundamental difference is how each handles context:
				</p>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Ralph: Stateless Iterations</h4>
						<p class="card-text">
							Each iteration spawns a fresh Claude Code instance. The only state is prd.json
							(which stories are done) and git history. No memory pollution between stories.
						</p>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Gastown: Stateful Sessions</h4>
						<p class="card-text">
							Workers maintain persistent sessions. Context accumulates within a session but
							survives restarts via Beads. Better for complex coordinated work.
						</p>
					</div>
				</div>

				<h3 class="subsection-heading">4.2 Failure Recovery</h3>

				<p>
					Both achieve nondeterministic idempotence through different mechanisms:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>
						<strong>Ralph</strong>: If iteration 5 crashes, restart the script. It reads prd.json,
						finds the next incomplete story, and continues. Previous work persists in git.
					</li>
					<li>
						<strong>Gastown</strong>: If worker-3 crashes, the Steward respawns it. The worker
						checks its hook (Beads), sees the assigned issue, and continues. State persists in
						Beads (Git-synced).
					</li>
				</ul>
			</div>
		</section>

		<!-- Section 5: Cost Comparison -->
		<section class="space-y-6">
			<h2 class="section-heading">5. Cost Comparison</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">5.1 Ralph Cost Model</h3>

				<p>
					Ralph costs are predictable per story:
				</p>

				<div class="overflow-x-auto mt-4">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Iterations</th>
								<th>Estimated Cost</th>
								<th>Use Case</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>5</td>
								<td>~$1.50</td>
								<td>Small feature (3-4 stories)</td>
							</tr>
							<tr>
								<td>10</td>
								<td>~$3.00</td>
								<td>Medium feature (6-8 stories)</td>
							</tr>
							<tr>
								<td>20</td>
								<td>~$6.00</td>
								<td>Large feature (12-15 stories)</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="subsection-heading">5.2 Gastown Cost Model</h3>

				<p>
					Gastown costs depend on parallelism and model routing:
				</p>

				<div class="overflow-x-auto mt-4">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Approach</th>
								<th>Models</th>
								<th>Cost</th>
								<th>Time</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Sequential Sonnet</td>
								<td>4x Sonnet</td>
								<td>$0.04</td>
								<td>120 min</td>
							</tr>
							<tr>
								<td>Parallel Sonnet</td>
								<td>4x Sonnet</td>
								<td>$0.04</td>
								<td>30 min</td>
							</tr>
							<tr>
								<td>Haiku Swarm</td>
								<td>1x Sonnet + 4x Haiku + 1x Opus</td>
								<td>$0.114</td>
								<td>30 min</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="subsection-heading">5.3 When Gastown's Higher Cost is Justified</h3>

				<ul class="list-disc pl-6 space-y-2">
					<li>
						<strong>Time-critical work</strong>: 3x speedup justifies 2-3x cost for deadline-driven work
					</li>
					<li>
						<strong>True parallelism</strong>: 4 independent features done in 30 min vs 120 min
					</li>
					<li>
						<strong>Complex coordination</strong>: Workers can communicate via mail protocol
					</li>
				</ul>

				<p class="mt-4">
					<strong>Rule of thumb</strong>: Ralph is cheaper for sequential work. Gastown costs more
					but delivers faster for parallel work. Choose based on whether time or cost is the constraint.
				</p>
			</div>
		</section>

		<!-- Section 6: Decision Matrix -->
		<section class="space-y-6">
			<h2 class="section-heading">6. Decision Matrix</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Use this matrix to choose the right tool:
				</p>

				<div class="overflow-x-auto mt-4">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Scenario</th>
								<th>Tool</th>
								<th>Why</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Overnight feature development</td>
								<td><strong>Ralph</strong></td>
								<td>Simpler, cheaper, no monitoring needed</td>
							</tr>
							<tr>
								<td>Sequential stories with dependencies</td>
								<td><strong>Ralph</strong></td>
								<td>Fresh context prevents pollution</td>
							</tr>
							<tr>
								<td>Quick test-fix loop (same session)</td>
								<td><strong>Ralph (/ralph-loop)</strong></td>
								<td>Single-session refinement</td>
							</tr>
							<tr>
								<td>3+ independent features simultaneously</td>
								<td><strong>Gastown</strong></td>
								<td>True parallelism, 3x speedup</td>
							</tr>
							<tr>
								<td>Need live progress monitoring</td>
								<td><strong>Gastown</strong></td>
								<td>tmux sessions visible</td>
							</tr>
							<tr>
								<td>Complex multi-step orchestration</td>
								<td><strong>Gastown</strong></td>
								<td>Molecules, convoys, merge queue</td>
							</tr>
							<tr>
								<td>Worker needs to coordinate with others</td>
								<td><strong>Gastown</strong></td>
								<td>Mail protocol between agents</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div class="p-6 mt-6 quote-box">
					<p class="text-center italic quote-text">
						"Default to Ralph. Reserve Gastown for when you explicitly need parallelism."
					</p>
					<p class="mt-2 text-center quote-attribution">- CREATE SOMETHING Orchestration Philosophy</p>
				</div>
			</div>
		</section>

		<!-- Section 7: Complementary Patterns -->
		<section class="space-y-6">
			<h2 class="section-heading">7. How They Complement Each Other</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Ralph and Gastown are not mutually exclusive. They can be combined for sophisticated
					orchestration patterns.
				</p>

				<h3 class="subsection-heading">7.1 Ralph for Worker Self-Rescue</h3>

				<p>
					When a Gastown worker gets stuck, it can use the Ralph pattern (specifically <code>/ralph-loop</code>)
					to iterate on a fix before escalating:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{`# Gastown worker hits an error
# Before sending HELP message, try self-rescue:

/ralph-loop "
  Fix failing tests in auth module.
  Test output: [paste errors]
  Output <promise>TESTS_PASS</promise> when green.
" --max-iterations 10

# If Ralph loop succeeds → continue
# If Ralph loop fails → gt mail send HELP`}</pre>
				</div>

				<h3 class="subsection-heading">7.2 Gastown for Ralph Parallelization</h3>

				<p>
					For very large features, use Gastown to run multiple Ralph instances in parallel:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{`# Split large feature into independent PRDs
# auth-prd.json, dashboard-prd.json, api-prd.json

# Run each in a Gastown worker
gt sling worker-1 "cd /project && ./ralph.sh --prd auth-prd.json"
gt sling worker-2 "cd /project && ./ralph.sh --prd dashboard-prd.json"
gt sling worker-3 "cd /project && ./ralph.sh --prd api-prd.json"

# Refinery merges when all complete`}</pre>
				</div>

				<h3 class="subsection-heading">7.3 Integration with Harness</h3>

				<p>
					Both patterns integrate with the Harness quality gate system:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>
						<strong>Ralph stories</strong> can include acceptance criteria that trigger Harness
						reviews (security, architecture, quality)
					</li>
					<li>
						<strong>Gastown workers</strong> run through Harness baseline checks before starting,
						with Ralph self-rescue if baseline fails
					</li>
				</ul>
			</div>
		</section>

		<!-- Section 8: Practical Recommendations -->
		<section class="space-y-6">
			<h2 class="section-heading">8. Practical Recommendations</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">8.1 Start with Ralph</h3>

				<ol class="list-decimal pl-6 space-y-2">
					<li>Create a PRD using <code>/prd-to-ralph</code> or manually</li>
					<li>Run <code>./ralph.sh --max-iterations 10</code></li>
					<li>Go to sleep or have dinner</li>
					<li>Check <code>progress.txt</code> and <code>git log</code> in the morning</li>
				</ol>

				<h3 class="subsection-heading">8.2 Graduate to Gastown When</h3>

				<ul class="list-disc pl-6 space-y-2">
					<li>You have 3+ truly independent features to implement</li>
					<li>Time pressure justifies the complexity overhead</li>
					<li>You're comfortable with tmux and Beads</li>
					<li>You have budget for parallel API calls</li>
				</ul>

				<h3 class="subsection-heading">8.3 Common Mistakes</h3>

				<div class="overflow-x-auto mt-4">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Mistake</th>
								<th>Why It Hurts</th>
								<th>Fix</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Using Gastown for sequential work</td>
								<td>Complexity without benefit</td>
								<td>Use Ralph</td>
							</tr>
							<tr>
								<td>Ralph stories too big</td>
								<td>Can't complete in one iteration</td>
								<td>Break into atomic stories</td>
							</tr>
							<tr>
								<td>Vague acceptance criteria</td>
								<td>Claude marks done prematurely</td>
								<td>Specific, testable criteria</td>
							</tr>
							<tr>
								<td>Parallel work with dependencies</td>
								<td>Merge conflicts, coordination failures</td>
								<td>Sequential for dependent work</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- Section 9: Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">9. Conclusion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Ralph and Gastown represent two valid approaches to agent orchestration, optimized for
					different scenarios:
				</p>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Ralph: Simple, Sequential, Overnight</h4>
						<p class="card-text">
							Fresh context per iteration prevents pollution. Ideal for overnight autonomous work
							on sequential stories. Lower cost, simpler setup.
						</p>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Gastown: Complex, Parallel, Monitored</h4>
						<p class="card-text">
							Persistent sessions enable parallelism. Ideal for 3+ independent features with
							time pressure. Higher cost, more infrastructure.
						</p>
					</div>
				</div>

				<p class="mt-6">
					Both achieve nondeterministic idempotence: work survives crashes, context limits, and
					interruptions. The difference is in execution model (sequential vs parallel) and context
					model (fresh vs persistent).
				</p>

				<p>
					<strong>Key takeaway</strong>: Default to Ralph for autonomous work. Reserve Gastown for
					when you explicitly need parallelism. Both patterns complement each other and integrate
					with the broader Harness quality system.
				</p>

				<p>
					The infrastructure disappears; only the work remains.
				</p>
			</div>
		</section>

		<!-- How to Apply This -->
		<section class="space-y-6">
			<h2 class="section-heading">How to Apply This</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p><strong>If you're starting with agent orchestration:</strong></p>

				<ol class="list-decimal pl-6 space-y-2">
					<li>Start with Ralph. Create a PRD, run the script, check results later.</li>
					<li>Write specific, testable acceptance criteria for each story.</li>
					<li>Keep stories atomic (one context window each).</li>
					<li>Graduate to Gastown only when you have true parallelism needs.</li>
				</ol>

				<p><strong>If you're building orchestration infrastructure:</strong></p>

				<ol class="list-decimal pl-6 space-y-2">
					<li>Support both patterns. They serve different use cases.</li>
					<li>Fresh context (Ralph) prevents pollution; persistent context (Gastown) enables coordination.</li>
					<li>Build integration points: Ralph self-rescue in Gastown workers.</li>
					<li>Track costs per pattern to inform routing decisions.</li>
				</ol>

				<p><strong>If you're choosing between approaches:</strong></p>

				<ol class="list-decimal pl-6 space-y-2">
					<li>Ask: is this truly parallelizable? If no, use Ralph.</li>
					<li>Ask: do I need live monitoring? If no, use Ralph.</li>
					<li>Ask: is time pressure worth the complexity? Only then consider Gastown.</li>
					<li>When in doubt, default to Ralph.</li>
				</ol>
			</div>
		</section>

		<!-- Related Research -->
		<section class="space-y-4">
			<h2 class="section-heading">Related Research</h2>

			<div class="space-y-2 body-text">
				<p>
					<a href="/papers/autonomous-harness-architecture" class="text-link">The Autonomous Harness</a>
					- Agent orchestration with human agency through progress reports
				</p>
				<p>
					<a href="/papers/haiku-optimization" class="text-link">Haiku Optimization</a>
					- Intelligent model routing for cost-effective orchestration
				</p>
				<p>
					<a href="/papers/norvig-partnership" class="text-link">The Norvig Partnership</a>
					- Human-AI collaboration achieving 20x productivity gains
				</p>
			</div>
		</section>

		<!-- Footer -->
		<div class="pt-6 paper-footer">
			<p class="footer-text">
				Both Ralph and Gastown are production-deployed in the CREATE SOMETHING monorepo.
				See <code class="inline-code">.claude/rules/ralph-patterns.md</code> and
				<code class="inline-code">.claude/rules/gastown-patterns.md</code> for implementation details.
			</p>
			<div class="flex justify-between mt-4">
				<a href="/papers" class="footer-link">All Papers</a>
				<a href="/experiments" class="footer-link">View Experiments</a>
			</div>
		</div>
	</div>
</div>

<style>
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
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.paper-title {
		font-size: var(--text-h1);
		font-weight: 700;
		line-height: 1.2;
	}

	.paper-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.paper-meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.abstract-section {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.section-heading {
		font-size: var(--text-h2);
		font-weight: 700;
		margin-bottom: var(--space-md);
	}

	.subsection-heading {
		font-size: var(--text-h3);
		font-weight: 600;
		margin: var(--space-lg) 0 var(--space-md) 0;
		color: var(--color-fg-secondary);
	}

	.body-text {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		line-height: 1.7;
	}

	.body-text code {
		font-family: 'Stack Sans', monospace;
		background: var(--color-bg-subtle);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		font-size: 0.9em;
	}

	.body-text a {
		color: var(--color-data-1);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.body-text a:hover {
		color: var(--color-fg-primary);
	}

	.metric-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.metric-card:hover {
		border-color: var(--color-border-emphasis);
		transform: scale(var(--scale-micro));
	}

	.metric-value {
		font-size: var(--text-h3);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.metric-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.metric-table {
		border-collapse: collapse;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.metric-table th {
		background: var(--color-bg-subtle);
		padding: var(--space-md);
		text-align: left;
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid var(--color-border-emphasis);
	}

	.metric-table td {
		padding: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
		color: var(--color-fg-tertiary);
	}

	.metric-table tr:last-child td {
		border-bottom: none;
	}

	.metric-table code {
		font-family: 'Stack Sans', monospace;
		background: var(--color-bg-subtle);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		font-size: 0.9em;
	}

	.quote-box {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.quote-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.quote-attribution {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.code-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
		overflow-x: auto;
	}

	.code-secondary {
		color: var(--color-fg-secondary);
	}

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
		font-weight: 600;
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

	.text-link {
		text-decoration: underline;
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.text-link:hover {
		color: var(--color-fg-primary);
	}

	.paper-footer {
		border-top: 1px solid var(--color-border-default);
	}

	.footer-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}

	.inline-code {
		background: var(--color-bg-surface);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
		font-family: monospace;
	}
</style>
