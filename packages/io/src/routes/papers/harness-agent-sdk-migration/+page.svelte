<script lang="ts">
	/**
	 * Harness Agent SDK Migration: Empirical Analysis
	 *
	 * Case study documenting the migration from --dangerously-skip-permissions
	 * to --allowedTools in autonomous Claude Code orchestration.
	 */
</script>

<svelte:head>
	<title>Harness Agent SDK Migration | CREATE SOMETHING.io</title>
	<meta name="description" content="Empirical analysis of migrating from --dangerously-skip-permissions to --allowedTools in autonomous Claude Code orchestration. Security, reliability, and cost improvements through explicit tool permissions." />
</svelte:head>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2025-002</div>
			<h1 class="mb-3 paper-title">Harness Agent SDK Migration: Empirical Analysis</h1>
			<p class="max-w-3xl paper-subtitle">
				Security, Reliability, and Cost Improvements Through Explicit Tool Permissions
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Case Study</span>
				<span>-</span>
				<span>12 min read</span>
				<span>-</span>
				<span>Intermediate</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="pl-6 space-y-4 abstract-section">
			<h2 class="section-heading">Abstract</h2>
			<p class="leading-relaxed body-text">
				This paper documents the migration of the CREATE Something Harness from legacy headless mode
				patterns to Agent SDK best practices. We analyze the trade-offs between security, reliability,
				and operational efficiency, drawing from empirical observation of a live Canon Redesign project
				(21 features across 19 files). The migration replaces <code>--dangerously-skip-permissions</code>
				with explicit <code>--allowedTools</code>, adds runaway prevention via <code>--max-turns</code>,
				and enables cost tracking through structured JSON output parsing.
			</p>
		</section>

		<!-- Metrics -->
		<section class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="p-4 metric-card">
				<div class="metric-value metric-success">21/21</div>
				<div class="metric-label">Features Complete</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">100</div>
				<div class="metric-label">Max Turns Limit</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value metric-success">0</div>
				<div class="metric-label">Blocked Operations</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">~$0.50</div>
				<div class="metric-label">Total Cost</div>
			</div>
		</section>

		<!-- Introduction -->
		<section class="space-y-6">
			<h2 class="section-heading">1. Introduction</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The CREATE Something Harness orchestrates autonomous Claude Code sessions for large-scale
					refactoring and feature implementation. Prior to this migration, the harness used
					<code>--dangerously-skip-permissions</code> for tool access—a pattern that prioritized
					convenience over security.
				</p>

				<p>
					The Agent SDK documentation recommends explicit tool allowlists via <code>--allowedTools</code>.
					This migration implements that recommendation alongside additional optimizations.
				</p>
			</div>

			<h3 class="subsection-heading">1.1 Heideggerian Framing</h3>
			<p class="leading-relaxed body-text">
				Per the CREATE Something philosophy, infrastructure should exhibit <strong><em>Zuhandenheit</em></strong>
				(ready-to-hand: when a tool disappears into transparent use, like a hammer during skilled carpentry)—receding into transparent use. The harness should be invisible when working
				correctly; failures should surface clearly with actionable context.
			</p>

			<h3 class="subsection-heading">1.2 The Canon Redesign Project</h3>
			<p class="leading-relaxed body-text">
				The test project: removing <code>--webflow-blue</code> (#4353ff) from the Webflow Dashboard.
				This brand color polluted focus states, buttons, links, nav, and logos—43 violations across 19 files.
			</p>

			<div class="responsive-table-scroll">
				<table class="w-full data-table">
					<thead>
						<tr>
							<th>Before</th>
							<th>After</th>
							<th>Semantic Purpose</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><code>--webflow-blue</code> (focus)</td>
							<td><code>--color-border-emphasis</code></td>
							<td>Functional feedback</td>
						</tr>
						<tr>
							<td><code>--webflow-blue</code> (active)</td>
							<td><code>--color-active</code></td>
							<td>State indication</td>
						</tr>
						<tr>
							<td><code>--webflow-blue</code> (button)</td>
							<td><code>--color-fg-primary</code></td>
							<td>High contrast</td>
						</tr>
						<tr>
							<td><code>--webflow-blue</code> (link)</td>
							<td><code>--color-fg-secondary</code></td>
							<td>Receding hierarchy</td>
						</tr>
						<tr>
							<td><code>--webflow-blue</code> (logo)</td>
							<td><code>--color-fg-primary</code></td>
							<td>System branding</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<!-- Architecture -->
		<section class="space-y-6">
			<h2 class="section-heading">2. Architecture</h2>

			<h3 class="subsection-heading">2.1 Harness Flow</h3>
			<pre class="code-block"><code>{`┌─────────────────────────────────────────────────────────┐
│                    HARNESS RUNNER                        │
│                                                          │
│  Spec Parser ──► Issue Creation ──► Session Loop         │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Session 1 ──► Session 2 ──► Session 3 ──► ...  │    │
│  │      │             │             │               │    │
│  │      ▼             ▼             ▼               │    │
│  │  Checkpoint    Checkpoint    Checkpoint          │    │
│  │      │             │             │               │    │
│  │      ▼             ▼             ▼               │    │
│  │  Peer Review   Peer Review   Peer Review         │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              BEADS (Human Interface)                     │
│                                                          │
│  bd progress - Review checkpoints                        │
│  bd update   - Redirect priorities                       │
│  bd create   - Inject work                               │
└─────────────────────────────────────────────────────────┘`}</code></pre>

			<h3 class="subsection-heading">2.2 Session Spawning</h3>
			<p class="leading-relaxed body-text">
				Each session spawns Claude Code in headless mode with explicit configuration:
			</p>
			<pre class="code-block"><code>{`// packages/harness/src/session.ts
export async function runSession(
  issueId: string,
  prompt: string,
  options: SessionOptions = {}
): Promise<SessionResult> {
  const args = [
    '-p',
    '--allowedTools', HARNESS_ALLOWED_TOOLS,
    '--max-turns', options.maxTurns?.toString() ?? '100',
    '--output-format', 'json',
  ];

  if (options.model) {
    args.push('--model', options.model);
  }

  // Spawn claude process with captured stdout/stderr
  const result = await spawnClaude(args, prompt);

  // Parse structured JSON output
  const metrics = parseJsonOutput(result.stdout);

  return {
    issueId,
    outcome: determineOutcome(result),
    sessionId: metrics.sessionId,
    costUsd: metrics.costUsd,
    numTurns: metrics.numTurns,
  };
}`}</code></pre>
		</section>

		<!-- Migration Changes -->
		<section class="space-y-6">
			<h2 class="section-heading">3. Migration Changes</h2>

			<h3 class="subsection-heading">3.1 Before: Legacy Pattern</h3>
			<pre class="code-block"><code>{`const args = [
  '-p',
  '--dangerously-skip-permissions',
  '--output-format', 'json',
];`}</code></pre>

			<div class="space-y-2 body-text">
				<p><strong>Characteristics:</strong></p>
				<ul class="list-disc list-inside ml-4 space-y-1">
					<li>All tools available without restriction</li>
					<li>No runaway prevention</li>
					<li>No cost tracking</li>
					<li>No model selection</li>
					<li>Security relies entirely on session isolation</li>
				</ul>
			</div>

			<h3 class="subsection-heading">3.2 After: Agent SDK Pattern</h3>
			<pre class="code-block"><code>{`const args = [
  '-p',
  '--allowedTools', HARNESS_ALLOWED_TOOLS,
  '--max-turns', '100',
  '--output-format', 'json',
  '--model', options.model,
];`}</code></pre>

			<div class="space-y-2 body-text">
				<p><strong>Characteristics:</strong></p>
				<ul class="list-disc list-inside ml-4 space-y-1">
					<li>Explicit tool allowlist (defense in depth)</li>
					<li>Turn limit prevents infinite loops</li>
					<li>JSON output enables metrics parsing</li>
					<li>Model selection for cost optimization</li>
				</ul>
			</div>

			<h3 class="subsection-heading">3.3 Tool Categories</h3>
			<div class="responsive-table-scroll">
				<table class="w-full data-table">
					<thead>
						<tr>
							<th>Category</th>
							<th>Tools</th>
							<th>Purpose</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><strong>Core</strong></td>
							<td>Read, Write, Edit, Glob, Grep, NotebookEdit</td>
							<td>File operations</td>
						</tr>
						<tr>
							<td><strong>Bash Patterns</strong></td>
							<td>git:*, pnpm:*, npm:*, wrangler:*, bd:*, bv:*</td>
							<td>Scoped shell access</td>
						</tr>
						<tr>
							<td><strong>Orchestration</strong></td>
							<td>Task, TodoWrite, WebFetch, WebSearch</td>
							<td>Agent coordination</td>
						</tr>
						<tr>
							<td><strong>CREATE Something</strong></td>
							<td>Skill</td>
							<td>Canon, deploy, audit skills</td>
						</tr>
						<tr>
							<td><strong>Infrastructure</strong></td>
							<td>mcp__cloudflare__* (14 tools)</td>
							<td>KV, D1, R2, Workers</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<!-- Peer Review Pipeline -->
		<section class="space-y-6">
			<h2 class="section-heading">4. Peer Review Pipeline</h2>

			<p class="leading-relaxed body-text">
				The harness runs three peer reviewers at checkpoint boundaries:
			</p>

			<pre class="code-block"><code>{`const REVIEWERS: ReviewerConfig[] = [
  {
    name: 'security',
    prompt: 'Review the code changes for security vulnerabilities...',
    model: 'haiku',
    timeout: 30000,
  },
  {
    name: 'architecture',
    prompt: 'Review the code changes for architectural concerns...',
    model: 'haiku',
    timeout: 30000,
  },
  {
    name: 'quality',
    prompt: 'Review the code changes for quality issues...',
    model: 'haiku',
    timeout: 30000,
  },
];`}</code></pre>

			<h3 class="subsection-heading">4.1 Observed Review Outcomes</h3>
			<div class="responsive-table-scroll">
				<table class="w-full data-table">
					<thead>
						<tr>
							<th>Reviewer</th>
							<th>Pass</th>
							<th>Pass w/Findings</th>
							<th>Fail</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Security</td>
							<td class="text-success">100%</td>
							<td>0%</td>
							<td>0%</td>
						</tr>
						<tr>
							<td>Architecture</td>
							<td>40%</td>
							<td class="text-warning">60%</td>
							<td>0%</td>
						</tr>
						<tr>
							<td>Quality</td>
							<td class="text-success">100%</td>
							<td>0%</td>
							<td>0%</td>
						</tr>
					</tbody>
				</table>
			</div>

			<p class="leading-relaxed body-text">
				<strong>Finding:</strong> Architecture reviewer surfaces legitimate concerns (token consistency,
				pattern adherence) without blocking progress. This matches the intended "first-pass analysis" philosophy.
			</p>
		</section>

		<!-- Empirical Observations -->
		<section class="space-y-6">
			<h2 class="section-heading">5. Empirical Observations</h2>

			<h3 class="subsection-heading">5.1 Security Improvements</h3>
			<div class="responsive-table-scroll">
				<table class="w-full data-table">
					<thead>
						<tr>
							<th>Scenario</th>
							<th>Before</th>
							<th>After</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Arbitrary Bash</td>
							<td class="text-error">Allowed</td>
							<td class="text-success">Blocked unless pattern-matched</td>
						</tr>
						<tr>
							<td>File deletion</td>
							<td class="text-error">Unrestricted</td>
							<td class="text-success">Bash(rm:*) required</td>
						</tr>
						<tr>
							<td>Network access</td>
							<td class="text-error">Unrestricted</td>
							<td class="text-success">WebFetch/WebSearch only</td>
						</tr>
						<tr>
							<td>MCP tools</td>
							<td class="text-error">All available</td>
							<td class="text-success">Explicit allowlist</td>
						</tr>
					</tbody>
				</table>
			</div>

			<p class="leading-relaxed body-text">
				<strong>Finding:</strong> No legitimate harness operations were blocked by the new restrictions.
				The allowlist is sufficient for all observed work patterns.
			</p>

			<h3 class="subsection-heading">5.2 Runaway Prevention</h3>
			<p class="leading-relaxed body-text">
				<code>--max-turns 100</code> prevents infinite loops. Observed session turn counts:
			</p>
			<div class="responsive-table-scroll">
				<table class="w-full data-table">
					<thead>
						<tr>
							<th>Task Type</th>
							<th>Avg Turns</th>
							<th>Max Observed</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Simple CSS fix</td>
							<td>8-15</td>
							<td>22</td>
						</tr>
						<tr>
							<td>Component refactor</td>
							<td>15-30</td>
							<td>45</td>
						</tr>
						<tr>
							<td>Multi-file update</td>
							<td>25-50</td>
							<td>72</td>
						</tr>
					</tbody>
				</table>
			</div>

			<h3 class="subsection-heading">5.3 Cost Visibility</h3>
			<div class="responsive-table-scroll">
				<table class="w-full data-table">
					<thead>
						<tr>
							<th>Phase</th>
							<th>Description</th>
							<th>Est. Cost</th>
						</tr>
					</thead>
					<tbody>
						<tr><td>Phase 21</td><td>Verification</td><td>~$0.01</td></tr>
						<tr><td>Phase 20</td><td>GsapValidationModal</td><td>~$0.02</td></tr>
						<tr><td>Phase 19</td><td>SubmissionTracker</td><td>~$0.02</td></tr>
						<tr><td>Phase 18</td><td>ApiKeysManager</td><td>~$0.03</td></tr>
						<tr><td>...</td><td>...</td><td>...</td></tr>
					</tbody>
				</table>
			</div>

			<h3 class="subsection-heading">5.4 Model Selection Impact</h3>
			<div class="responsive-table-scroll">
				<table class="w-full data-table">
					<thead>
						<tr>
							<th>Model</th>
							<th>Use Case</th>
							<th>Cost Ratio</th>
							<th>Quality</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Opus</td>
							<td>Complex architectural changes</td>
							<td>1x (baseline)</td>
							<td>Highest</td>
						</tr>
						<tr>
							<td>Sonnet</td>
							<td>Standard implementation</td>
							<td>~0.2x</td>
							<td>High</td>
						</tr>
						<tr>
							<td>Haiku</td>
							<td>Simple CSS fixes, reviews</td>
							<td>~0.05x</td>
							<td>Sufficient</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<!-- Trade-offs -->
		<section class="space-y-6">
			<h2 class="section-heading">6. Trade-offs Analysis</h2>

			<h3 class="subsection-heading">6.1 Pros</h3>
			<div class="responsive-table-scroll">
				<table class="w-full data-table">
					<thead>
						<tr>
							<th>Benefit</th>
							<th>Impact</th>
							<th>Evidence</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><strong>Explicit Security</strong></td>
							<td class="text-success">High</td>
							<td>No unauthorized tool access possible</td>
						</tr>
						<tr>
							<td><strong>Runaway Prevention</strong></td>
							<td>Medium</td>
							<td>100-turn limit prevents infinite loops</td>
						</tr>
						<tr>
							<td><strong>Cost Visibility</strong></td>
							<td>Medium</td>
							<td>Per-session cost tracking enabled</td>
						</tr>
						<tr>
							<td><strong>Model Selection</strong></td>
							<td>Medium</td>
							<td>10-20x cost reduction with Haiku</td>
						</tr>
						<tr>
							<td><strong>CREATE Something Integration</strong></td>
							<td class="text-success">High</td>
							<td>Skill, Beads, Cloudflare MCP included</td>
						</tr>
					</tbody>
				</table>
			</div>

			<h3 class="subsection-heading">6.2 Cons</h3>
			<div class="responsive-table-scroll">
				<table class="w-full data-table">
					<thead>
						<tr>
							<th>Drawback</th>
							<th>Impact</th>
							<th>Mitigation</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Allowlist Maintenance</td>
							<td>Low</td>
							<td>Stable tool set; rare updates needed</td>
						</tr>
						<tr>
							<td>Bash Pattern Complexity</td>
							<td>Medium</td>
							<td>Document patterns; provide examples</td>
						</tr>
						<tr>
							<td>New Tool Discovery Friction</td>
							<td>Low</td>
							<td>Add to allowlist when needed</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<!-- Recommendations -->
		<section class="space-y-6">
			<h2 class="section-heading">7. Recommendations</h2>

			<h3 class="subsection-heading">7.1 Immediate Adoption</h3>
			<ol class="list-decimal list-inside space-y-2 body-text">
				<li><strong>Replace <code>--dangerously-skip-permissions</code> with <code>--allowedTools</code></strong>: The security improvement has no operational cost.</li>
				<li><strong>Set <code>--max-turns 100</code></strong>: Provides headroom without enabling runaways.</li>
				<li><strong>Parse JSON output for metrics</strong>: Even if not displayed, capture for future analysis.</li>
				<li><strong>Use Haiku for peer reviews</strong>: 95% cost reduction with equivalent quality.</li>
			</ol>

			<h3 class="subsection-heading">7.2 Future Work</h3>
			<ol class="list-decimal list-inside space-y-2 body-text">
				<li><strong>Implement <code>--resume</code></strong>: Use captured session_id for task continuity within epics.</li>
				<li><strong>Model auto-selection</strong>: Use task complexity to choose Haiku/Sonnet/Opus.</li>
				<li><strong>Cost budgets</strong>: Set per-harness-run cost limits with automatic pause.</li>
				<li><strong>Streaming output</strong>: Use <code>--output-format stream-json</code> for real-time progress.</li>
			</ol>
		</section>

		<!-- Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">8. Conclusion</h2>

			<p class="leading-relaxed body-text">
				The Agent SDK migration improves the CREATE Something Harness without degrading operational
				capability. The explicit tool allowlist provides defense-in-depth security, while
				<code>--max-turns</code> prevents runaway sessions.
			</p>

			<p class="leading-relaxed body-text">
				The key insight: <strong>restrictive defaults with explicit exceptions</strong> is more
				maintainable than <strong>permissive defaults with implicit risks</strong>.
			</p>

			<div class="p-6 callout-box">
				<p class="body-text">
					This aligns with the <strong>Subtractive Triad</strong>:
				</p>
				<ul class="list-disc list-inside mt-2 space-y-1 body-text">
					<li><strong>DRY:</strong> One allowlist, not per-session permission decisions</li>
					<li><strong>Rams:</strong> Only necessary tools; each earns its place</li>
					<li><strong>Heidegger:</strong> Infrastructure recedes; security becomes invisible when correct</li>
				</ul>
			</div>
		</section>

		<!-- Appendix A -->
		<section class="space-y-6">
			<h2 class="section-heading">Appendix A: Full Tool Allowlist</h2>
			<pre class="code-block"><code>{`const HARNESS_ALLOWED_TOOLS = [
  // Core file operations
  'Read', 'Write', 'Edit', 'Glob', 'Grep', 'NotebookEdit',

  // Bash with granular patterns
  'Bash(git:*)', 'Bash(pnpm:*)', 'Bash(npm:*)', 'Bash(npx:*)',
  'Bash(node:*)', 'Bash(tsc:*)', 'Bash(wrangler:*)',
  'Bash(bd:*)', 'Bash(bv:*)',  // Beads CLI
  'Bash(grep:*)', 'Bash(find:*)', 'Bash(ls:*)', 'Bash(cat:*)',
  'Bash(mkdir:*)', 'Bash(rm:*)', 'Bash(cp:*)', 'Bash(mv:*)',
  'Bash(echo:*)', 'Bash(test:*)',

  // Orchestration
  'Task', 'TodoWrite', 'WebFetch', 'WebSearch',

  // CREATE Something
  'Skill',

  // MCP Cloudflare
  'mcp__cloudflare__kv_get', 'mcp__cloudflare__kv_put',
  'mcp__cloudflare__kv_list', 'mcp__cloudflare__d1_query',
  'mcp__cloudflare__d1_list_databases',
  'mcp__cloudflare__r2_list_objects', 'mcp__cloudflare__r2_get_object',
  'mcp__cloudflare__r2_put_object', 'mcp__cloudflare__worker_list',
  'mcp__cloudflare__worker_get', 'mcp__cloudflare__worker_deploy',
].join(',');`}</code></pre>
		</section>

		<!-- References -->
		<section class="space-y-6">
			<h2 class="section-heading">References</h2>
			<ul class="list-disc list-inside space-y-2 body-text">
				<li><a href="https://docs.anthropic.com/claude-code" class="text-link">Claude Code Agent SDK Documentation</a></li>
				<li><a href="https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/harness" class="text-link">CREATE Something Harness Package</a></li>
				<li><a href="https://github.com/createsomethingtoday/create-something-monorepo/blob/main/.claude/rules/beads-patterns.md" class="text-link">Beads Patterns Documentation</a></li>
			</ul>
		</section>

		<!-- Footer -->
		<footer class="pt-8 mt-12 paper-footer">
			<p class="italic text-muted">
				"The harness recedes into transparent operation. Review progress. Redirect when needed."
			</p>
		</footer>
	</div>
</div>

<style>
	.paper-container {
		background: var(--color-bg-pure);
	}

	.paper-id {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		letter-spacing: 0.1em;
	}

	.paper-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		line-height: 1.2;
	}

	.paper-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.paper-meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.section-heading {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.subsection-heading {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-top: var(--space-md);
	}

	.abstract-section {
		border-left: 3px solid var(--color-border-emphasis);
	}

	.body-text {
		color: var(--color-fg-secondary);
	}

	.text-emphasis {
		color: var(--color-fg-primary);
	}

	.text-success {
		color: var(--color-success);
	}

	.text-warning {
		color: var(--color-warning);
	}

	.text-error {
		color: var(--color-error);
	}

	.text-muted {
		color: var(--color-fg-muted);
	}

	.text-link {
		color: var(--color-info);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.text-link:hover {
		opacity: 0.8;
	}

	.metric-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-align: center;
	}

	.metric-value {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	.metric-label {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		margin-top: var(--space-xs);
	}

	.metric-success {
		color: var(--color-success);
	}

	.data-table {
		border-collapse: collapse;
		font-size: var(--text-body-sm);
	}

	.data-table th,
	.data-table td {
		padding: var(--space-sm);
		text-align: left;
		border-bottom: 1px solid var(--color-border-default);
	}

	.data-table th {
		color: var(--color-fg-tertiary);
		font-weight: var(--font-medium);
		background: var(--color-bg-subtle);
	}

	.data-table td {
		color: var(--color-fg-secondary);
	}

	.code-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		overflow-x: auto;
		font-family: ui-monospace, monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		white-space: pre;
	}

	code {
		font-family: ui-monospace, monospace;
		background: var(--color-bg-subtle);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		font-size: 0.9em;
	}

	.callout-box {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		border-left: 3px solid var(--color-info);
	}

	.paper-footer {
		border-top: 1px solid var(--color-border-default);
	}
</style>
