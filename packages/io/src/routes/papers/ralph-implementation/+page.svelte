<script lang="ts">
	/**
	 * Ralph Implementation: Overnight Autonomous Development
	 *
	 * Research paper documenting the Ralph pattern for autonomous overnight
	 * development—iterative refinement through fresh Claude Code instances
	 * working through user stories until complete.
	 *
	 * Based on Geoffrey Huntley's Ralph Wiggum technique, adapted for
	 * CREATE SOMETHING's PRD-to-Ralph workflow.
	 */
</script>

<svelte:head>
	<title>Ralph Implementation: Overnight Autonomous Development | CREATE SOMETHING.io</title>
	<meta name="description" content="Research documenting the Ralph pattern—spawning fresh Claude Code instances to work through user stories autonomously overnight. $6 for features that would take 8+ developer hours." />
</svelte:head>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-002</div>
			<h1 class="mb-3 paper-title">Ralph Implementation: Overnight Autonomous Development</h1>
			<p class="max-w-3xl paper-subtitle">
				Fresh Claude Code instances working through user stories while you sleep—achieving
				production-ready features at $6 instead of $800+ in developer time.
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Research</span>
				<span>•</span>
				<span>15 min read</span>
				<span>•</span>
				<span>Intermediate</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="abstract-section space-y-4">
			<h2 class="section-heading">Abstract</h2>
			<p class="body-text leading-relaxed">
				This paper documents the <strong>Ralph pattern</strong> for autonomous overnight development.
				Named after Geoffrey Huntley's Ralph Wiggum technique, Ralph spawns fresh Claude Code instances
				that iterate through user stories until a feature is complete. Each iteration gets a clean
				context window—preventing context pollution across stories. We present the PRD-to-Ralph
				workflow, the <code>ralph.sh</code> implementation, and cost analysis showing
				<strong>$6 for 12-15 story features</strong> compared to 8+ hours of developer time ($800+ at
				$100/hour). Case study validation from the Kickstand project demonstrates
				<strong>155 scripts reduced to 13</strong> through systematic autonomous work. The contribution
				is both practical (a working overnight development system) and philosophical (nondeterministic
				idempotence—different paths, same outcome).
			</p>
		</section>

		<!-- Metrics -->
		<section class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="p-4 metric-card">
				<div class="metric-value">$6</div>
				<div class="metric-label">Cost for 20 iterations</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">155 to 13</div>
				<div class="metric-label">Kickstand script reduction</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">Fresh</div>
				<div class="metric-label">Context per iteration</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">Overnight</div>
				<div class="metric-label">Autonomous execution</div>
			</div>
		</section>

		<!-- Section 1: What is Ralph -->
		<section class="space-y-6">
			<h2 class="section-heading">1. What is Ralph?</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Ralph is an <strong>iterative autonomous development pattern</strong> that spawns fresh
					Claude Code instances to work through user stories. Named after Geoffrey Huntley's
					<em>Ralph Wiggum</em> technique, the pattern exploits a key insight: each iteration
					benefits from a clean context window.
				</p>

				<p>
					Traditional agent loops accumulate context as they work. By story 5, the context window
					is cluttered with implementation details from stories 1-4. Ralph solves this by starting
					fresh each iteration—Claude reads the PRD, picks an incomplete story, implements it,
					commits, and exits. The next iteration starts with full context capacity.
				</p>

				<h3 class="subsection-heading">The Core Loop</h3>

				<div class="p-4 code-block">
					<pre><code>for iteration in 1..MAX_ITERATIONS:
  1. Read prd.json
  2. Find story where passes == false
  3. Spawn fresh Claude Code instance
  4. Claude implements story, commits, updates prd.json
  5. Log to progress.txt
  6. If all stories pass → done
  7. Next iteration</code></pre>
				</div>

				<p>
					The PRD (<em>Product Requirements Document</em>) serves as Claude's task board. Each story
					has acceptance criteria that must be satisfied for <code>passes: true</code>. When all
					stories pass, Ralph exits.
				</p>

				<h3 class="subsection-heading">Key Insight: Context Pollution</h3>

				<p>
					Context pollution is real. When working on a multi-file feature in a single session,
					Claude accumulates tokens about each implementation decision. These tokens are wasted
					when moving to unrelated stories.
				</p>

				<p>
					By spawning fresh instances, Ralph ensures:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>Each story gets Claude's full attention (no irrelevant context)</li>
					<li>No "memory" of implementation details that don't matter</li>
					<li>Cleaner, more focused work per iteration</li>
					<li>Natural parallelization opportunity (though Ralph runs sequentially)</li>
				</ul>
			</div>
		</section>

		<!-- Section 2: PRD-to-Ralph Workflow -->
		<section class="space-y-6">
			<h2 class="section-heading">2. The PRD-to-Ralph Workflow</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The workflow consists of three phases: <strong>PRD creation</strong>,
					<strong>Ralph execution</strong>, and <strong>result verification</strong>.
				</p>

				<h3 class="subsection-heading">2.1 Creating the PRD</h3>

				<p>
					A PRD is a JSON file defining user stories with acceptance criteria:
				</p>

				<div class="p-4 code-block">
					<pre><code>{'{'}
  "title": "Agency Contact Form",
  "description": "Contact form with validation and D1 storage",
  "stories": [
    {'{'}
      "id": "contact-1",
      "title": "Create contact submissions D1 table",
      "acceptance": [
        "Migration file exists at migrations/XXXX_contact_submissions.sql",
        "Table has columns: id, name, email, message, created_at",
        "Migration applies without errors"
      ],
      "files": ["packages/agency/migrations/"],
      "passes": false
    {'}'},
    {'{'}
      "id": "contact-2",
      "title": "Add contact form API endpoint",
      "acceptance": [
        "POST /api/contact returns 200 on valid submission",
        "Returns 400 with errors on invalid email",
        "Stores submission in D1 contact_submissions table"
      ],
      "files": ["packages/agency/src/routes/api/contact/+server.ts"],
      "passes": false
    {'}'}
  ]
{'}'}</code></pre>
				</div>

				<p>
					<strong>Story rules:</strong>
				</p>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Rule</th>
								<th>Why</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>One story = one context window</td>
								<td>Keeps iterations focused</td>
							</tr>
							<tr>
								<td>Max 3-5 files per story</td>
								<td>Prevents scope creep</td>
							</tr>
							<tr>
								<td>Acceptance criteria must be verifiable</td>
								<td>Agent needs to know when done</td>
							</tr>
							<tr>
								<td>Order by dependency</td>
								<td>Foundation, Core, UI, Integration</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="subsection-heading">2.2 The /prd-to-ralph Skill</h3>

				<p>
					Claude Code includes a skill that converts feature descriptions into PRDs:
				</p>

				<div class="p-4 code-block">
					<pre><code># In Claude Code session
"Use /prd-to-ralph to create a user authentication feature
 with login, signup, and password reset"</code></pre>
				</div>

				<p>
					The skill asks clarifying questions, breaks the feature into atomic stories, writes
					testable acceptance criteria, and outputs <code>prd.json</code>.
				</p>

				<h3 class="subsection-heading">2.3 Running Ralph</h3>

				<div class="p-4 code-block">
					<pre><code># Basic usage
./packages/agent-sdk/scripts/ralph.sh

# Custom iterations (for larger features)
./packages/agent-sdk/scripts/ralph.sh --max-iterations 20

# Custom PRD file
./packages/agent-sdk/scripts/ralph.sh --prd-file features/auth-prd.json</code></pre>
				</div>

				<p>
					Ralph outputs progress to <code>progress.txt</code> and archives thread logs to
					<code>.ralph-archive/</code>. When all stories pass, it archives the completed PRD.
				</p>
			</div>
		</section>

		<!-- Section 3: How ralph.sh Works -->
		<section class="space-y-6">
			<h2 class="section-heading">3. How ralph.sh Works</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The script is a bash loop that orchestrates Claude Code instances. Here's the
					implementation architecture:
				</p>

				<h3 class="subsection-heading">3.1 Architecture</h3>

				<div class="p-4 code-block">
					<pre><code>ralph.sh
    |
    +-- reads prd.json (finds incomplete story)
    |
    +-- spawns claude --print --dangerously-skip-permissions
    |       |
    |       +-- Claude reads prd.json
    |       +-- Claude implements story
    |       +-- Claude commits changes
    |       +-- Claude updates prd.json (passes: true)
    |       +-- Claude logs to progress.txt
    |       +-- Claude exits
    |
    +-- checks if all stories complete
    |       |
    |       +-- if yes: exit loop
    |       +-- if no: next iteration
    |
    +-- archives thread log
    |
    +-- next iteration (fresh Claude instance)</code></pre>
				</div>

				<h3 class="subsection-heading">3.2 System Prompt</h3>

				<p>
					Each Claude instance receives a consistent system prompt:
				</p>

				<div class="p-4 code-block">
					<pre><code>You are an autonomous coding agent working on this project.

## Your Task
1. Read the PRD file (prd.json) and find a user story where "passes": false
2. Pick ONE story to implement (usually the first incomplete one)
3. Implement it according to the acceptance criteria
4. Run any relevant tests to verify your implementation
5. Commit your changes with a clear message: "feat: {'<'}story title{'>'}"
6. Update prd.json - set "passes": true for the completed story
7. Append to progress.txt

## Important Rules
- Complete ONE story per iteration, then stop
- Each story must be atomic and independently verifiable
- If all stories pass, output: ALL_STORIES_COMPLETE</code></pre>
				</div>

				<h3 class="subsection-heading">3.3 Key Implementation Details</h3>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Detail</th>
								<th>Implementation</th>
								<th>Purpose</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Fresh context</td>
								<td>New <code>claude</code> process each iteration</td>
								<td>Prevents context pollution</td>
							</tr>
							<tr>
								<td>Autonomous mode</td>
								<td><code>--dangerously-skip-permissions</code></td>
								<td>No human confirmation needed</td>
							</tr>
							<tr>
								<td>Output capture</td>
								<td><code>--print</code> flag + <code>tee</code></td>
								<td>Archives for debugging</td>
							</tr>
							<tr>
								<td>Story selection</td>
								<td><code>jq</code> filters <code>passes == false</code></td>
								<td>Deterministic story ordering</td>
							</tr>
							<tr>
								<td>Completion signal</td>
								<td><code>ALL_STORIES_COMPLETE</code> in output</td>
								<td>Early exit when done</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="subsection-heading">3.4 Output Files</h3>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>File</th>
								<th>Purpose</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td><code>prd.json</code></td>
								<td>User stories (updated as stories complete)</td>
							</tr>
							<tr>
								<td><code>progress.txt</code></td>
								<td>Short-term memory, iteration logs</td>
							</tr>
							<tr>
								<td><code>.ralph-archive/</code></td>
								<td>Thread logs, archived PRDs</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- Section 4: Cost Analysis -->
		<section class="space-y-6">
			<h2 class="section-heading">4. Cost Analysis</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Ralph's economics are compelling: <strong>$6 for overnight feature development</strong>
					compared to 8+ hours of developer time.
				</p>

				<h3 class="subsection-heading">4.1 Ralph Cost Estimation</h3>

				<div class="overflow-x-auto">
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

				<h3 class="subsection-heading">4.2 Comparison to Developer Time</h3>

				<p>
					For a 12-story feature requiring 8 hours of developer time at $100/hour:
				</p>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Approach</th>
								<th>Cost</th>
								<th>Time</th>
								<th>Availability</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Developer</td>
								<td>$800</td>
								<td>8 hours</td>
								<td>Business hours</td>
							</tr>
							<tr>
								<td>Ralph</td>
								<td><strong>$6</strong></td>
								<td>Overnight</td>
								<td>24/7</td>
							</tr>
							<tr>
								<td>Savings</td>
								<td><strong>$794 (99.25%)</strong></td>
								<td>—</td>
								<td>—</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					<strong>Key insight:</strong> Ralph runs overnight. You describe the feature before
					leaving work, run Ralph, and find completed code in the morning.
				</p>

				<h3 class="subsection-heading">4.3 When Ralph Makes Sense</h3>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Scenario</th>
								<th>Recommendation</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Well-defined feature with clear stories</td>
								<td>Use Ralph</td>
							</tr>
							<tr>
								<td>Overnight autonomous work</td>
								<td>Use Ralph</td>
							</tr>
							<tr>
								<td>Sequential dependent stories</td>
								<td>Use Ralph</td>
							</tr>
							<tr>
								<td>3+ independent features simultaneously</td>
								<td>Consider Gastown (parallel)</td>
							</tr>
							<tr>
								<td>Quick test-fix loop (same session)</td>
								<td>/ralph-loop (legacy)</td>
							</tr>
							<tr>
								<td>Exploratory work, unclear requirements</td>
								<td>Manual Claude Code session</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- Section 5: Case Study Validation -->
		<section class="space-y-6">
			<h2 class="section-heading">5. Case Study: Kickstand</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The <a href="/papers/kickstand-triad-audit" class="text-link">Kickstand project</a>
					demonstrates Ralph's effectiveness at scale. Kickstand is a venue intelligence
					automation system that had accumulated significant technical debt across multiple
					architectural phases.
				</p>

				<h3 class="subsection-heading">5.1 Results</h3>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Metric</th>
								<th>Before</th>
								<th>After</th>
								<th>Change</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Active scripts</td>
								<td>155</td>
								<td>13</td>
								<td><strong>-92%</strong></td>
							</tr>
							<tr>
								<td>TypeScript errors</td>
								<td>30</td>
								<td>0</td>
								<td><strong>-100%</strong></td>
							</tr>
							<tr>
								<td>Health score</td>
								<td>6.2</td>
								<td>9.2</td>
								<td><strong>+48%</strong></td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="subsection-heading">5.2 How Ralph Contributed</h3>

				<p>
					The systematic reduction from 155 to 13 scripts was achieved through Ralph-style
					autonomous work:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li><strong>DRY pass:</strong> Unified duplicate implementations (Node.js + Workers)</li>
					<li><strong>Rams pass:</strong> Archived 153 orphan scripts that no longer served production</li>
					<li><strong>Heidegger pass:</strong> Reconnected documentation to actual system state</li>
				</ul>

				<p>
					Each pass was decomposed into stories with clear acceptance criteria. Ralph iterated
					through them autonomously, with human review at story completion.
				</p>

				<h3 class="subsection-heading">5.3 Economic Impact</h3>

				<p>
					Traditional approach: A senior developer auditing 155 scripts, consolidating to 13,
					fixing 30 TypeScript errors, and updating documentation would require
					<strong>40+ hours at $150/hour = $6,000+</strong>.
				</p>

				<p>
					Ralph approach: PRD creation (2 hours human time) + Ralph execution ($50-100 in API
					costs) = <strong>under $500 total</strong>.
				</p>

				<p>
					<strong>Savings: $5,500+ (90%+ reduction)</strong>
				</p>
			</div>
		</section>

		<!-- Section 6: Philosophical Grounding -->
		<section class="space-y-6">
			<h2 class="section-heading">6. Philosophical Grounding</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">6.1 Nondeterministic Idempotence</h3>

				<p>
					Ralph embodies <strong>nondeterministic idempotence</strong>: different paths, same
					outcome. Ralph might complete in 8 iterations or 12. Stories might complete in different
					orders. But the end result is the same: a working feature with all acceptance criteria
					satisfied.
				</p>

				<p>
					This is why work survives crashes. If Ralph stops at iteration 5, you restart and it
					picks up from story 6. The PRD is the source of truth, persisted to disk.
				</p>

				<h3 class="subsection-heading">6.2 Fresh Context as Zuhandenheit</h3>

				<p>
					In Heideggerian terms, context pollution causes the tool to become
					<em>present-at-hand</em> (Vorhandenheit)—you notice the cluttered context, the
					irrelevant tokens, the sluggish responses. Fresh context per iteration keeps the tool
					<em>ready-to-hand</em> (Zuhandenheit)—transparent, receding into use.
				</p>

				<p>
					When Ralph works correctly, you don't think about it. You define the feature, run the
					script, and find working code. The infrastructure disappears; only the work remains.
				</p>

				<h3 class="subsection-heading">6.3 The PRD as Task Board</h3>

				<p>
					The PRD is Claude's kanban board. Just like humans grab sticky notes from a board,
					Claude grabs stories from the PRD. The format is simple because it needs to be:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li><strong>Machine-readable:</strong> Claude parses it with jq patterns</li>
					<li><strong>Human-readable:</strong> You write it without special tooling</li>
					<li><strong>Versionable:</strong> Git tracks changes, enabling bisection</li>
				</ul>
			</div>
		</section>

		<!-- Section 7: Troubleshooting -->
		<section class="space-y-6">
			<h2 class="section-heading">7. Troubleshooting</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">Ralph Stops Early</h3>

				<p>
					<strong>Symptom:</strong> All stories show <code>passes: true</code> but feature isn't
					complete.
				</p>

				<p>
					<strong>Cause:</strong> Acceptance criteria too vague. Claude marked them done when they
					weren't.
				</p>

				<p>
					<strong>Fix:</strong> Write more specific acceptance criteria. "Form works" is bad.
					"Form renders at /login route" is good.
				</p>

				<h3 class="subsection-heading">Same Error Repeating</h3>

				<p>
					<strong>Symptom:</strong> Multiple iterations hit the same error.
				</p>

				<p>
					<strong>Cause:</strong> Missing context in CLAUDE.md or agents.md.
				</p>

				<p>
					<strong>Fix:</strong> Add the learning to CLAUDE.md so future iterations know about it.
					Ralph reads CLAUDE.md at the start of each iteration.
				</p>

				<h3 class="subsection-heading">Story Too Big</h3>

				<p>
					<strong>Symptom:</strong> Claude can't complete a story in one iteration.
				</p>

				<p>
					<strong>Cause:</strong> Story scope exceeds context window capacity.
				</p>

				<p>
					<strong>Fix:</strong> Break the story into smaller atomic pieces. If a story needs more
					than 5 files, split it.
				</p>
			</div>
		</section>

		<!-- Section 8: Implementation -->
		<section class="space-y-6">
			<h2 class="section-heading">8. Implementation</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Ralph is production-deployed in the CREATE SOMETHING monorepo:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li><strong>Script:</strong> <code>packages/agent-sdk/scripts/ralph.sh</code></li>
					<li><strong>PRD skill:</strong> <code>.claude/skills/prd-to-ralph.md</code></li>
					<li><strong>Template:</strong> <code>packages/agent-sdk/templates/prd-template.json</code></li>
					<li><strong>Documentation:</strong> <code>.claude/rules/ralph-patterns.md</code></li>
				</ul>

				<p>
					Prerequisites:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>Claude Code CLI installed (<code>npm install -g @anthropic-ai/claude-code</code>)</li>
					<li>Git repository initialized</li>
					<li>CLAUDE.md file in project root (project context)</li>
					<li>jq installed for JSON parsing</li>
				</ul>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">9. Conclusion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Ralph transforms overnight development from aspiration to practice. By spawning fresh
					Claude Code instances per story, the pattern prevents context pollution while maintaining
					systematic progress through feature requirements.
				</p>

				<p>
					The economics are decisive: <strong>$6 for features that would cost $800+ in developer
					time</strong>. The Kickstand case study validates this at production scale—155 scripts
					reduced to 13 through systematic autonomous work.
				</p>

				<p>
					<strong>Key takeaways:</strong>
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>Fresh context per iteration prevents pollution—each story gets full attention</li>
					<li>PRD as task board enables deterministic story selection and progress tracking</li>
					<li>Nondeterministic idempotence ensures work survives crashes</li>
					<li>Specific acceptance criteria are the bottleneck—invest in PRD quality</li>
				</ul>

				<p>
					<strong>Status:</strong> Production-deployed, actively used for CREATE SOMETHING
					development.
				</p>
			</div>
		</section>

		<!-- How to Apply This -->
		<section class="space-y-6">
			<h2 class="section-heading">How to Apply This</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<ol class="list-decimal pl-6 space-y-2">
					<li>Define your feature with clear boundaries</li>
					<li>Use <code>/prd-to-ralph</code> or write prd.json manually</li>
					<li>Ensure each story has specific, testable acceptance criteria</li>
					<li>Run <code>./ralph.sh --max-iterations 10</code></li>
					<li>Go to sleep (or dinner)</li>
					<li>Check <code>progress.txt</code> and <code>git log</code> in the morning</li>
				</ol>

				<p>
					<strong>Rule of thumb:</strong> Spend 30 minutes on PRD quality. It saves 3 hours of
					failed iterations.
				</p>
			</div>
		</section>

		<!-- Related Research -->
		<section class="space-y-4">
			<h2 class="section-heading">Related Research</h2>

			<div class="space-y-2 body-text">
				<p>
					<a href="/papers/kickstand-triad-audit" class="text-link">Subtractive Triad Audit: Kickstand</a>
					— Case study of systematic codebase reduction using autonomous work
				</p>
				<p>
					<a href="/papers/norvig-partnership" class="text-link">The Norvig Partnership</a>
					— Empirical validation of AI-human collaboration achieving 20x productivity gains
				</p>
				<p>
					<a href="/papers/haiku-optimization" class="text-link">Haiku Optimization</a>
					— Intelligent model routing for cost-effective autonomous development
				</p>
			</div>
		</section>

		<!-- Attribution -->
		<section class="space-y-4">
			<h2 class="section-heading">Attribution</h2>

			<div class="space-y-2 body-text">
				<p>
					The Ralph pattern is based on Geoffrey Huntley's
					<a href="https://ghuntley.com/ralph" class="text-link">Ralph Wiggum technique</a>,
					adapted for CREATE SOMETHING's PRD-to-Ralph workflow.
				</p>
			</div>
		</section>
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

	.body-text a,
	.text-link {
		color: var(--color-data-1);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.body-text a:hover,
	.text-link:hover {
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
		font-size: var(--text-h2);
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

	.code-block {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow-x: auto;
	}

	.code-block pre {
		margin: 0;
		font-family: 'Stack Sans', monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.code-block code {
		background: transparent;
		padding: 0;
	}
</style>
