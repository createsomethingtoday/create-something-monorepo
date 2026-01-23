<script lang="ts">
	/**
	 * The Hermeneutic Triad: How Reviewers, Harness, and Agent Collaborate
	 *
	 * A case study of the DRY violation detection and resolution workflow,
	 * demonstrating how parallel peer review creates a self-correcting system.
	 */
	import { Building2, Shield, Sparkles } from 'lucide-svelte';
	import { SEO } from '@create-something/components';
</script>

<SEO
	title="The Hermeneutic Triad"
	description="How autonomous peer reviewers, the harness orchestrator, and coding agents collaborate to identify and resolve code violations through parallel analysis."
	keywords="hermeneutic triad, peer review, harness, agent collaboration, DRY violations, code quality"
	ogType="article"
	articleSection="Case Study"
	publishedTime="2025-11-01T00:00:00Z"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Papers', url: 'https://createsomething.io/papers' },
		{ name: 'Hermeneutic Triad', url: 'https://createsomething.io/papers/hermeneutic-triad-review' }
	]}
/>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2025-011</div>
			<h1 class="mb-3 paper-title">The Hermeneutic Triad</h1>
			<p class="max-w-3xl paper-subtitle">
				How Reviewers, Harness, and Agent Collaborate—a case study in parallel peer review
				revealing and resolving DRY violations.
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
				This case study covers a live case study from December 2025 where the CREATE SOMETHING harness
				orchestrated parallel peer reviews that identified critical DRY violations in newsletter
				subscription code. Three specialized reviewers—architecture, security, and quality—each
				analyzed the same codebase simultaneously, producing complementary findings. The architecture
				reviewer detected 4 pairs of nearly-identical files across packages; the security reviewer
				identified IDOR vulnerabilities; the quality reviewer noted inconsistent error handling. This
				paper analyzes how this <strong>hermeneutic triad</strong> (a three-part interpretive system where different perspectives—reviewers, harness, agent—work together to reveal understanding that no single perspective could achieve alone)—the interplay between reviewers, harness, and
				agent—creates a self-correcting system that surfaces issues no single perspective would catch.
			</p>
		</section>

		<!-- The Insight -->
		<section class="p-6 quote-box">
			<div class="text-center">
				<p class="italic quote-text">
					"Each reviewer sees through a different lens. The architecture reviewer asks 'Is this
					unified?' The security reviewer asks 'Is this safe?' The quality reviewer asks 'Is
					this clear?' Together, they reveal what none would see alone."
				</p>
				<p class="mt-2 quote-attribution">— Harness Peer Review Philosophy</p>
			</div>
		</section>

		<!-- Section 1: The Incident -->
		<section class="space-y-6">
			<h2 class="section-heading">I. The Incident: Taste Harness Pauses</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					On December 23, 2025, the CREATE SOMETHING harness was running the "Taste Collections &
					LLM Context" spec—a 6-feature project to enable users to curate design references and
					expose them to AI agents. After completing 2 of 6 features, the harness paused with
					an unexpected verdict:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-primary">{`┌─────────────────────────────────────────────────────────────┐
│  PEER REVIEW SUMMARY                                        │
├─────────────────────────────────────────────────────────────┤
│  Outcome: ❌ FAIL                                           │
│  Confidence: 90%                                            │
├─────────────────────────────────────────────────────────────┤
│  Findings: 15                                               │
│    🔴 Critical: 3                                           │
│    🟠 High: 2                                               │
│    🟡 Medium: 5                                             │
│    🔵 Low: 2                                                │
│    ⚪ Info: 3                                               │
├─────────────────────────────────────────────────────────────┤
│  Reviewers:                                                 │
│    ⚠️ security        pass_with_findings (5)               │
│    ❌ architecture    fail               (6)                │
│    ⚠️ quality         pass_with_findings (4)               │
├─────────────────────────────────────────────────────────────┤
│  ⏸️  PAUSING FOR REVIEW                                    │
│    • 3 critical finding(s)                                  │
│    • Blocking reviewer failed: architecture                 │
└─────────────────────────────────────────────────────────────┘`}</pre>
				</div>

				<p class="mt-4">
					The harness had been implementing features, creating code, and making commits. But
					when it reached a checkpoint, it invoked three parallel peer reviewers. The
					architecture reviewer's verdict—FAIL—triggered a pause. What had it found?
				</p>
			</div>
		</section>

		<!-- Section 2: The Three Reviewers -->
		<section class="space-y-6">
			<h2 class="section-heading">II. The Three Reviewers: Parallel Perspectives</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The harness employs three specialized reviewers, each analyzing the same codebase
					through a different philosophical lens:
				</p>

				<div class="grid md:grid-cols-3 gap-4 mt-4">
					<div class="p-4 info-card">
						<h4 class="flex items-center gap-2 mb-2 card-heading"><Building2 size={18} /> Architecture</h4>
						<p class="mb-2 card-text">
							Asks: "Does the structure serve the whole?"
						</p>
						<p class="card-text">
							Applies DRY at the system level. Detects duplicate modules, violated
							boundaries, excessive coupling.
						</p>
					</div>

					<div class="p-4 info-card">
						<h4 class="flex items-center gap-2 mb-2 card-heading"><Shield size={18} /> Security</h4>
						<p class="mb-2 card-text">
							Asks: "Can this be exploited?"
						</p>
						<p class="card-text">
							Scans for OWASP vulnerabilities, authentication gaps, authorization flaws,
							injection risks.
						</p>
					</div>

					<div class="p-4 info-card">
						<h4 class="flex items-center gap-2 mb-2 card-heading"><Sparkles size={18} /> Quality</h4>
						<p class="mb-2 card-text">
							Asks: "Is this maintainable?"
						</p>
						<p class="card-text">
							Evaluates error handling, type safety, code clarity, test coverage,
							documentation.
						</p>
					</div>
				</div>

				<p class="mt-4">
					These reviewers run <em>in parallel</em>—each receives the same git diff and file
					context but applies independent analysis. Their prompts are generated from the
					changed files, ensuring review focus matches implementation scope.
				</p>

				<h3 class="mt-6 subsection-heading">Hermeneutic Complementarity</h3>

				<p>
					The three reviewers form a <em>hermeneutic triad</em>—three interpretive lenses that
					together reveal what no single lens would show. This mirrors the Subtractive Triad:
				</p>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">Reviewer</th>
								<th class="table-cell">Triad Level</th>
								<th class="table-cell">Question</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell">Architecture</td>
								<td class="table-cell">DRY (Implementation)</td>
								<td class="table-cell">"Have I built this before?"</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Security</td>
								<td class="table-cell">Rams (Artifact)</td>
								<td class="table-cell">"Does this earn its existence safely?"</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Quality</td>
								<td class="table-cell">Heidegger (System)</td>
								<td class="table-cell">"Does this serve the whole?"</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- Section 3: What They Found -->
		<section class="space-y-6">
			<h2 class="section-heading">III. What They Found: The DRY Violations</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Each reviewer produced findings, but the architecture reviewer's were critical. It
					identified <strong>4 pairs of nearly-identical files</strong> duplicated across packages:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-warning">{`[CRITICAL] Duplicated unsubscribe UI component across 2 packages
  packages/io/src/routes/unsubscribe/+page.svelte
  packages/space/src/routes/unsubscribe/+page.svelte
  → Only differs in propertyName prop ("io" vs "space")
  → Recommend: Extract to @create-something/components

[CRITICAL] Duplicated unsubscribe page server logic across 2 packages
  packages/io/src/routes/unsubscribe/+page.server.ts
  packages/space/src/routes/unsubscribe/+page.server.ts
  → Identical token decoding, database operations
  → Recommend: Extract to shared newsletter module

[CRITICAL] Duplicated newsletter API endpoint across 2 packages
  packages/io/src/routes/api/newsletter/+server.ts
  packages/space/src/routes/api/newsletter/+server.ts
  → Nearly identical (200+ lines each)
  → Only differs in default source property`}</pre>
				</div>

				<p class="mt-4">
					The architecture reviewer had detected what the coding agent hadn't noticed: the agent,
					working feature-by-feature, had created identical implementations for different
					properties rather than extracting shared functionality.
				</p>

				<h3 class="mt-6 subsection-heading">Security Findings (Complementary)</h3>

				<p>
					Meanwhile, the security reviewer flagged a different issue in the same area:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-warning">{`[HIGH] Potential IDOR in taste insights API
  packages/ltd/src/routes/api/taste/insights/+server.ts
  → User ID from query param without validation
  → Could allow access to other users' reading data
  → Recommend: Use authenticated user ID from session`}</pre>
				</div>

				<p class="mt-4">
					The security and architecture reviewers saw different problems in overlapping code.
					Neither finding was wrong; both were necessary.
				</p>
			</div>
		</section>

		<!-- Section 4: The Harness Response -->
		<section class="space-y-6">
			<h2 class="section-heading">IV. The Harness Response: Pause and Surface</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					When the architecture reviewer's verdict was FAIL, the harness entered a decision
					tree. Its configuration specified:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{`peerReview: {
  reviewers: ['security', 'architecture', 'quality'],
  blockingReviewers: ['security', 'architecture'],
  pauseOnCritical: true,
  minConfidence: 0.7
}`}</pre>
				</div>

				<p class="mt-4">
					Because <code class="inline-code">architecture</code> was a blocking reviewer and it
					returned FAIL with critical findings, the harness:
				</p>

				<ol class="list-decimal list-inside space-y-2 pl-4">
					<li>Created Beads issues for each critical finding</li>
					<li>Generated a checkpoint summarizing the review</li>
					<li>Paused execution for human review</li>
					<li>Left the agent context intact for resumption</li>
				</ol>

				<h3 class="mt-6 subsection-heading">The Pause as Clearing</h3>

				<p>
					Heidegger's concept of the <em>clearing</em> (Lichtung) is relevant here. The pause
					creates a space where what was hidden becomes visible. The agent was working—hammering
					away—and the code was ready-to-hand. The reviewer's FAIL verdict made the duplication
					<em>present-at-hand</em>: visible as a problem rather than invisible as tool-use.
				</p>

				<div class="p-4 mt-4 quote-box">
					<p class="italic quote-text text-center">
						"The clearing is not a bounded space but the opening in which beings can show
						themselves."
					</p>
					<p class="mt-2 quote-attribution text-center">— Adapted from Heidegger</p>
				</div>
			</div>
		</section>

		<!-- Section 5: The Resolution -->
		<section class="space-y-6">
			<h2 class="section-heading">V. The Resolution: Agent as Healer</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					With the findings surfaced, the agent (Claude Code) could address them. The resolution
					followed a pattern:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-success">{`# 1. Create shared module
packages/components/src/lib/newsletter/
├── index.ts          # Exports
├── types.ts          # Shared types
├── unsubscribe.ts    # processUnsubscribe()
├── subscribe.ts      # processSubscription()
└── UnsubscribePage.svelte  # Shared component

# 2. Update consumers (io, space, agency)
packages/io/src/routes/api/newsletter/+server.ts
  - import { processSubscription } from '@create-something/components/newsletter';
  - Now 25 lines instead of 227

# 3. Type-check verification
$ pnpm --filter=io exec tsc --noEmit  # ✓
$ pnpm --filter=space exec tsc --noEmit  # ✓`}</pre>
				</div>

				<p class="mt-4">
					The resolution reduced ~900 lines of duplicated code to ~200 lines of shared code
					with property-specific configuration. Each consumer now imports from the shared
					module and passes its property identifier.
				</p>

				<h3 class="mt-6 subsection-heading">Closing the Findings</h3>

				<p>
					With the fix committed, the agent closed the finding issues:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{`$ bd close csm-cisd csm-fmcw csm-bf8h \\
    --reason "Fixed: Consolidated to @create-something/components/newsletter"

✓ Closed csm-cisd: [CRITICAL] Duplicated unsubscribe UI component
✓ Closed csm-fmcw: [CRITICAL] Duplicated unsubscribe page server logic
✓ Closed csm-bf8h: [CRITICAL] Duplicated newsletter API endpoint`}</pre>
				</div>
			</div>
		</section>

		<!-- Section 6: Analysis -->
		<section class="space-y-6">
			<h2 class="section-heading">VI. Analysis: Why This Works</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					This case study reveals several properties of the hermeneutic triad approach:
				</p>

				<h3 class="subsection-heading">1. Parallel Analysis Prevents Tunnel Vision</h3>

				<p>
					The coding agent, focused on completing features, naturally creates local solutions.
					It wasn't "wrong" to create similar code in different packages—each implementation
					worked correctly. Only the architectural lens, examining cross-package structure,
					could see the duplication.
				</p>

				<h3 class="mt-4 subsection-heading">2. Blocking Reviewers Create Natural Checkpoints</h3>

				<p>
					By configuring architecture as a blocking reviewer, the harness ensured DRY violations
					couldn't accumulate silently. The pause forced attention to a structural issue that
					would otherwise compound.
				</p>

				<h3 class="mt-4 subsection-heading">3. Findings as Issues Enable Tracking</h3>

				<p>
					Each finding became a Beads issue. This means:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Findings can be prioritized alongside regular work</li>
					<li>Related findings can be grouped (same root cause)</li>
					<li>Resolution is tracked with commit references</li>
					<li>Similar findings from other harnesses can be closed together</li>
				</ul>

				<h3 class="mt-4 subsection-heading">4. Agent as Both Creator and Resolver</h3>

				<p>
					The same agent that created the duplication could resolve it. This isn't a flaw—it's
					the system working as designed. The agent operates in two modes:
				</p>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Zuhandenheit (Creating)</h4>
						<p class="card-text">
							Working within the codebase, implementing features, tool-use is transparent.
							Duplication is invisible because each file works.
						</p>
					</div>

					<div class="p-4 comparison-success">
						<h4 class="mb-2 comparison-heading comparison-success-heading">Vorhandenheit (Resolving)</h4>
						<p class="comparison-list">
							Examining the codebase as object, seeing structure rather than function.
							Duplication is visible because we're analyzing, not using.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Section 7: The Broader Pattern -->
		<section class="space-y-6">
			<h2 class="section-heading">VII. The Broader Pattern: Self-Correcting Systems</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The triad of harness, reviewers, and agent forms a <em>self-correcting system</em>—a
					hermeneutic circle at the scale of software development:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-primary">{`┌─────────────────────────────────────────────────────────────┐
│                  THE HERMENEUTIC CIRCLE                     │
│                                                             │
│        Agent                      Reviewers                 │
│          │                            │                     │
│     creates code ──────────► reveals issues                 │
│          │                            │                     │
│          ▼                            ▼                     │
│        Harness ◄────────────────── Harness                  │
│    (orchestrates)                (pauses)                   │
│          │                            │                     │
│          ▼                            ▼                     │
│     Agent fixes ──────────► Reviewers verify                │
│          │                            │                     │
│          └────────► Harness resumes ◄─┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘`}</pre>
				</div>

				<p class="mt-4">
					This is not a waterfall but a circle. Each iteration improves understanding:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Agent understands codebase better through fixing revealed issues</li>
					<li>Reviewers calibrate detection based on what agent creates</li>
					<li>Harness learns pause thresholds from human overrides</li>
				</ul>

				<h3 class="mt-6 subsection-heading">Canon Alignment in Practice</h3>

				<p>
					The Subtractive Triad manifests at multiple levels:
				</p>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">Level</th>
								<th class="table-cell">DRY</th>
								<th class="table-cell">Rams</th>
								<th class="table-cell">Heidegger</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell">Code</td>
								<td class="table-cell">Unify duplicates</td>
								<td class="table-cell">Each file earns existence</td>
								<td class="table-cell">Modules serve system</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Review</td>
								<td class="table-cell">Three lenses, one analysis</td>
								<td class="table-cell">Only actionable findings</td>
								<td class="table-cell">Reviews serve quality</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Process</td>
								<td class="table-cell">Beads is single source</td>
								<td class="table-cell">Minimal ceremony</td>
								<td class="table-cell">Harness serves work</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- Section 8: Implications -->
		<section class="space-y-6">
			<h2 class="section-heading">VIII. Implications: Reviewer Design</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					This case study suggests principles for designing effective review triads:
				</p>

				<h3 class="subsection-heading">1. Orthogonal Perspectives</h3>

				<p>
					Reviewers should cover different concerns. Our triad—architecture, security, quality—
					has minimal overlap. Each can fail independently, and each provides unique signal.
				</p>

				<h3 class="mt-4 subsection-heading">2. Graduated Blocking</h3>

				<p>
					Not all reviewers should block. In our configuration:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>Architecture</strong>: Blocks (structural issues compound)</li>
					<li><strong>Security</strong>: Blocks (vulnerabilities are critical)</li>
					<li><strong>Quality</strong>: Advisory (minor issues can queue)</li>
				</ul>

				<h3 class="mt-4 subsection-heading">3. Parallel Execution</h3>

				<p>
					Running reviewers in parallel (not sequence) is essential. Total review time equals
					longest single reviewer, not sum of all. For large diffs, this saves significant
					time.
				</p>

				<h3 class="mt-4 subsection-heading">4. Issue Integration</h3>

				<p>
					Findings become issues in the same tracker as features. This means:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Humans can reprioritize findings relative to features</li>
					<li>Multiple runs can reference the same underlying issue</li>
					<li>Resolution ties to commits in the same workflow</li>
				</ul>
			</div>
		</section>

		<!-- Section 9: How to Apply This -->
		<section class="space-y-6">
			<h2 class="section-heading">IX. How to Apply This</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					This section shows how to configure parallel peer review in your own autonomous
					development workflows. The pattern works for any harness system that supports
					checkpoints and issue creation.
				</p>

				<h3 class="subsection-heading">Step-by-Step Process</h3>

				<div class="p-4 font-mono code-block-success">
					<pre class="code-primary">{`Step 1: Configure Reviewers (Human)
Define three specialized reviewers in harness config:
- architecture: DRY violations, coupling, module boundaries
- security: OWASP Top 10, auth gaps, injection risks
- quality: Error handling, test coverage, maintainability
Ensure orthogonal perspectives (minimal overlap).

Step 2: Set Blocking Rules (Human)
Decide which reviewers can pause execution:
- architecture: blocking (structural issues compound)
- security: blocking (vulnerabilities are critical)
- quality: advisory (minor issues can queue)
Configure pauseOnCritical: true for blocking reviewers.

Step 3: Enable Parallel Execution (Agent)
Run reviewers simultaneously, not sequentially:
- Each receives same git diff and file context
- Total review time = longest single reviewer
- Results merge into unified findings list
Use Promise.all() or equivalent concurrency primitive.

Step 4: Create Finding Issues (Agent)
When reviewer returns critical findings:
- Create Beads issue for each finding
- Label with reviewer name and severity
- Link to checkpoint for context
- Add dependencies if findings are related

Step 5: Pause and Surface (Harness)
When blocking reviewer fails:
- Halt execution immediately
- Generate checkpoint summary
- Preserve agent context for resumption
- Alert human for review decision

Step 6: Resolve and Resume (Agent + Human)
Human reviews findings, agent implements fixes:
- Close findings with commit references
- Update harness context with resolution
- Re-run reviewers if needed
- Resume execution when clear`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Real-World Example: API Endpoint Duplication</h3>

				<p>
					Let's say your agent builds three similar API routes across different packages:
				</p>

				<div class="p-4 font-mono code-block">
					<pre class="code-primary">{`// packages/shop/src/routes/api/subscribe/+server.ts
export async function POST({ request }) {
  const { email } = await request.json();
  const token = generateToken(email);
  await db.insert(subscribers).values({ email, token });
  await sendConfirmationEmail(email, token);
  return json({ success: true });
}

// packages/blog/src/routes/api/subscribe/+server.ts
export async function POST({ request }) {
  const { email } = await request.json();
  const token = generateToken(email);
  await db.insert(blogSubscribers).values({ email, token });
  await sendConfirmationEmail(email, token);
  return json({ success: true });
}

// packages/newsletter/src/routes/api/subscribe/+server.ts
export async function POST({ request }) {
  const { email } = await request.json();
  const token = generateToken(email);
  await db.insert(newsletterSubscribers).values({ email, token });
  await sendConfirmationEmail(email, token);
  return json({ success: true });
}`}</pre>
				</div>

				<p class="mt-4">
					The architecture reviewer detects:
				</p>

				<div class="p-4 font-mono code-block">
					<pre class="code-warning">{`[CRITICAL] Duplicated subscription logic across 3 packages
→ packages/shop/src/routes/api/subscribe/+server.ts
→ packages/blog/src/routes/api/subscribe/+server.ts
→ packages/newsletter/src/routes/api/subscribe/+server.ts
→ Only differs in table name
→ Recommend: Extract to @myapp/subscriptions package`}</pre>
				</div>

				<p class="mt-4">
					Meanwhile, the security reviewer flags:
				</p>

				<div class="p-4 font-mono code-block">
					<pre class="code-warning">{`[HIGH] Missing rate limiting on subscription endpoints
→ All three endpoints accept unlimited POST requests
→ Vulnerable to subscription bombing
→ Recommend: Add rate limiting middleware`}</pre>
				</div>

				<p class="mt-4">
					Harness creates issues for both findings, pauses, and alerts human. Agent then:
				</p>

				<ol class="list-decimal list-inside space-y-2 pl-4">
					<li>Creates <code class="inline-code">@myapp/subscriptions</code> package</li>
					<li>Extracts shared logic to <code class="inline-code">processSubscription(table, email)</code></li>
					<li>Adds rate limiting middleware to all endpoints</li>
					<li>Updates consumers to import shared function</li>
					<li>Closes findings with commit references</li>
				</ol>

				<h3 class="mt-6 subsection-heading">When to Use Parallel Peer Review</h3>

				<p>
					Use this pattern when:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>Autonomous work:</strong> Agent-driven development with harness orchestration</li>
					<li><strong>Multi-file changes:</strong> Checkpoints cover significant scope (3+ files)</li>
					<li><strong>Quality gates matter:</strong> Structural or security issues can't accumulate silently</li>
					<li><strong>Hermeneutic continuity:</strong> Work spans multiple sessions, understanding must persist</li>
				</ul>

				<p class="mt-4">
					Don't use for:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Single-file changes or trivial fixes</li>
					<li>Exploratory prototyping (no established patterns yet)</li>
					<li>Emergency hotfixes (review adds latency)</li>
					<li>Human-driven development (peer review happens via PR)</li>
				</ul>

				<h3 class="mt-6 subsection-heading">Calibrating Reviewer Sensitivity</h3>

				<p>
					Over time, tune your reviewers based on false positive rates:
				</p>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">Symptom</th>
								<th class="table-cell">Adjustment</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell">Too many trivial findings</td>
								<td class="table-cell">Increase severity threshold for pause</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Missing critical issues</td>
								<td class="table-cell">Add specific patterns to reviewer prompts</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Reviews taking too long</td>
								<td class="table-cell">Reduce context window or use faster model</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Human overriding frequently</td>
								<td class="table-cell">Demote reviewer to advisory (non-blocking)</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p class="mt-4 text-emphasis">
					The goal is a self-correcting system, not a gate-keeping system. Reviewers should
					catch real issues while allowing good work to proceed. Calibrate continuously based
					on outcomes.
				</p>
			</div>
		</section>

		<!-- Section 10: Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">X. Conclusion: Collaboration, Not Control</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The hermeneutic triad—reviewers, harness, and agent—demonstrates a form of AI
					collaboration that isn't about control but about complementary perspectives. Each
					element sees what others cannot:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>The agent sees how to implement; it cannot see duplication it creates</li>
					<li>The reviewers see patterns across files; they cannot implement fixes</li>
					<li>The harness sees workflow; it cannot analyze or create</li>
				</ul>

				<p class="mt-4">
					Together, they form a system that is more capable than any element alone. The 3
					critical DRY violations were not bugs—the code worked—but architectural debt that
					would compound. The parallel review caught them before they spread further.
				</p>

				<div class="p-6 mt-6 quote-box">
					<p class="text-center italic quote-text">
						"The hermeneutic circle is not a vicious circle but a virtuous one.
						Understanding advances through the interplay of parts and whole."
					</p>
				</div>

				<p class="mt-6">
					The duplication was resolved in a single commit. The harness resumed. The remaining
					features continue to be implemented—now with a shared newsletter module that prevents
					future duplication. The system learned, not through explicit training, but through
					architectural enforcement.
				</p>

				<p>
					This is the promise of the hermeneutic triad: not AI that never errs, but AI that
					catches its own errors through structured self-reflection.
				</p>
			</div>
		</section>

		<!-- Appendix: Timeline -->
		<section class="space-y-6">
			<h2 class="section-heading">Appendix: Incident Timeline</h2>

			<div class="space-y-2 leading-relaxed body-text font-mono">
				<p class="code-secondary">2025-12-23T03:34 — Harness started from taste-collections-llm.md</p>
				<p class="code-secondary">2025-12-23T03:35 — Session #1: Reading Insights Dashboard (complete)</p>
				<p class="code-secondary">2025-12-23T03:40 — Session #2: Agent Context API (complete)</p>
				<p class="code-secondary">2025-12-23T03:45 — Checkpoint triggered, peer review started</p>
				<p class="code-secondary">2025-12-23T03:46 — Parallel reviews: security, architecture, quality</p>
				<p class="code-warning">2025-12-23T03:46 — Architecture: FAIL (6 findings, 3 critical)</p>
				<p class="code-secondary">2025-12-23T03:46 — Harness paused, findings created as issues</p>
				<p class="code-secondary">2025-12-23T03:52 — Agent addresses DRY violations</p>
				<p class="code-secondary">2025-12-23T03:55 — Creates @create-something/components/newsletter</p>
				<p class="code-secondary">2025-12-23T03:57 — Updates io, space, agency to use shared module</p>
				<p class="code-secondary">2025-12-23T03:58 — Type-check passes, commit created</p>
				<p class="code-success">2025-12-23T03:59 — Findings closed, harness resumed</p>
			</div>
		</section>

		<!-- References -->
		<section class="space-y-4">
			<h2 class="section-heading">References</h2>
			<ol class="space-y-2 pl-6 list-decimal references-list">
				<li>Heidegger, M. (1927). <em>Being and Time</em>. Trans. Macquarrie & Robinson.</li>
				<li>CREATE SOMETHING. (2025). "The Autonomous Harness." <a href="/papers/autonomous-harness-architecture" class="text-link">createsomething.io/papers/autonomous-harness-architecture</a></li>
				<li>CREATE SOMETHING. (2025). "Harness Patterns." <code class="inline-code">.claude/rules/harness-patterns.md</code></li>
				<li>CREATE SOMETHING. (2025). "The Subtractive Triad." <a href="https://createsomething.ltd/principles" class="text-link">createsomething.ltd/principles</a></li>
				<li>Anthropic. (2025). "Effective Harnesses for Long-Running Agents."</li>
			</ol>
		</section>

		<!-- Footer -->
		<div class="pt-6 paper-footer">
			<p class="footer-text">
				This paper documents a live incident from the CREATE SOMETHING harness, December 2025.
				The newsletter module is available at <code class="inline-code">@create-something/components/newsletter</code>.
			</p>
			<div class="flex justify-between mt-4">
				<a href="/papers" class="footer-link">&larr; All Papers</a>
				<a href="/papers/autonomous-harness-architecture" class="footer-link">Autonomous Harness &rarr;</a>
			</div>
		</div>
	</div>
</div>

<style>
	/* Structure: Tailwind | Design: Canon */

	/* Container */
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

	/* Abstract */
	.abstract-section {
		border-left: 4px solid var(--color-border-emphasis);
	}

	/* Typography */
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

	.quote-attribution {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Code Blocks */
	.code-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
		overflow-x: auto;
	}

	.code-primary {
		color: var(--color-fg-primary);
	}

	.code-secondary {
		color: var(--color-fg-secondary);
	}

	.code-warning {
		color: var(--color-warning);
	}

	.code-success {
		color: var(--color-data-2);
	}

	.inline-code {
		background: var(--color-bg-surface);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
		font-family: monospace;
	}

	.code-block-success {
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
		overflow-x: auto;
	}

	.text-emphasis {
		color: var(--color-fg-primary);
		font-weight: 500;
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

	/* Comparison Cards */
	.comparison-success {
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-lg);
	}

	.comparison-heading {
		font-size: var(--text-body-lg);
	}

	.comparison-success-heading {
		color: var(--color-success);
	}

	.comparison-list {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Tables */
	.responsive-table-scroll {
		overflow-x: auto;
	}

	.table-header {
		border-bottom: 1px solid var(--color-border-default);
	}

	.table-cell {
		padding: 0.75rem 1rem;
		text-align: left;
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.table-row {
		border-bottom: 1px solid var(--color-border-default);
	}

	/* References */
	.references-list {
		color: var(--color-fg-tertiary);
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
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}

	/* Links */
	.text-link {
		text-decoration: underline;
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.text-link:hover {
		color: var(--color-fg-primary);
	}
</style>
