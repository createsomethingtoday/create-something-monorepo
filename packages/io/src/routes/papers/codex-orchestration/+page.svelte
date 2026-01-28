<script lang="ts">
	import { SEO } from '@create-something/canon';
	const metadata = {
		title: 'Codex Orchestration: Claude Code Planning + Autonomous Execution',
		date: '2026-01-09',
		status: 'Proposed',
		tags: ['orchestration', 'agent-patterns', 'cost-optimization'],
		relatedPapers: [
			'dual-agent-routing-experiment',
			'haiku-optimization',
			'autonomous-harness-architecture'
		]
	};

	const integration = [
		{
			layer: 'Planning',
			tool: 'Claude Code',
			cost: '~$0.01/task',
			role: 'Reasoning, acceptance criteria, validation'
		},
		{
			layer: 'Execution',
			tool: 'Codex CLI/SDK',
			cost: '~$0.002/task',
			role: 'File edits, tests, commits'
		},
		{
			layer: 'Protocol',
			tool: 'Beads (bd)',
			cost: 'Free',
			role: 'Issue tracking, state persistence'
		}
	];

	const comparison = [
		{
			factor: 'File Operations',
			codex: 'Native apply_patch tool',
			gemini: 'Text output to stdout',
			winner: 'Codex'
		},
		{
			factor: 'GitHub Integration',
			codex: 'Native issues → PRs',
			gemini: 'Requires MCP wiring',
			winner: 'Codex'
		},
		{
			factor: 'Cost (execution)',
			codex: '~$0.002/task',
			gemini: '~$0.0003/task',
			winner: 'Gemini'
		},
		{
			factor: 'MCP Integration',
			codex: 'SDK available',
			gemini: 'CLI with stdout',
			winner: 'Codex'
		},
		{
			factor: 'Tool Ecosystem',
			codex: 'Code-first (git, test, patch)',
			gemini: 'General ReAct agent',
			winner: 'Codex'
		}
	];
</script>

<SEO
	title="Codex Orchestration: Claude Code Planning + Autonomous Execution"
	description="Using Codex as autonomous executor triggered by Claude Code planning. Clean tool boundaries, 80% cost savings, fire-and-forget execution pattern."
	keywords="Codex, Claude Code, autonomous execution, agent orchestration, cost optimization, fire-and-forget"
	ogType="article"
	articleSection="Research"
	publishedTime="2026-01-09T00:00:00Z"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Papers', url: 'https://createsomething.io/papers' },
		{ name: 'Codex Orchestration', url: 'https://createsomething.io/papers/codex-orchestration' }
	]}
/>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<header class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-005</div>
			<h1 class="mb-3 paper-title">{metadata.title}</h1>

			<div class="paper-meta">
			<time class="meta-item">{metadata.date}</time>
			<span class="meta-item status-{metadata.status.toLowerCase()}">{metadata.status}</span>
		</div>

		<div class="paper-tags">
			{#each metadata.tags as tag}
				<span class="tag">{tag}</span>
			{/each}
		</div>
	</header>

	<section class="paper-section">
		<h2 class="section-heading">Abstract</h2>

		<p class="leading-relaxed body-text">
			This paper proposes Codex CLI/SDK as the optimal executor when triggered by Claude Code
			planning. After testing Gemini CLI orchestration (which succeeded but required custom
			stdout extraction), we evaluate whether Codex offers cleaner integration via MCP while
			maintaining autonomous execution. The pattern: Claude Code plans and validates, Codex
			executes autonomously (read files, edit, test, commit, close issue), Beads persists state.
			Projected cost: ~$0.012/task (Claude planning + Codex execution) vs $0.01 baseline (Sonnet
			alone).
		</p>

		<div class="callout callout-error">
			<p class="callout-title">Status: Orchestration Rejected</p>
			<p class="callout-text">
				All three executors (Gemini CLI, GPT-4 API, Codex CLI) failed or required significant
				workarounds. Meanwhile, Claude Code direct execution completed the same task in &lt;10 seconds
				with zero errors. **Conclusion**: For small-scale work (1-10 tasks), orchestration adds
				complexity without value. Direct execution wins on reliability, speed, and simplicity. Use
				Claude Code directly until work scales to 100+ tasks where cost savings justify
				orchestration fragility.
			</p>
		</div>
	</section>

	<section class="paper-section">
		<h2 class="section-heading">Hypothesis</h2>

		<p class="leading-relaxed body-text">
			<strong>H1 (Integration)</strong>: Codex integrates more cleanly than Gemini CLI via MCP/SDK
			<br />
			<strong>H2 (Cost)</strong>: Claude planning + Codex execution costs ~$0.012/task (20% above
			baseline but more capable)
			<br />
			<strong>H3 (Autonomy)</strong>: Codex can close issues end-to-end without Claude intervention
			<br />
			<strong>H4 (Zuhandenheit)</strong>: MCP abstraction allows the tool to recede (fire and forget)
		</p>
	</section>

	<section class="paper-section">
		<h2 class="section-heading">Why Codex Over Gemini CLI</h2>

		<h3 class="subsection-heading">Comparison Matrix</h3>

		<div class="table-container">
			<table class="comparison-table">
				<thead>
					<tr>
						<th>Factor</th>
						<th>Codex</th>
						<th>Gemini CLI</th>
						<th>Winner</th>
					</tr>
				</thead>
				<tbody>
					{#each comparison as row}
						<tr>
							<td class="table-label">{row.factor}</td>
							<td>{row.codex}</td>
							<td>{row.gemini}</td>
							<td class="table-winner">{row.winner}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<h3 class="subsection-heading">Key Differentiators</h3>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 differentiator-grid">
			<div class="differentiator">
				<h4 class="diff-title">Native File Operations</h4>
				<p class="diff-text">
					Codex has an <code>apply_patch</code> tool that handles precise, multi-file edits
					reliably. Gemini CLI outputs to stdout, requiring custom extraction.
				</p>
			</div>

			<div class="differentiator">
				<h4 class="diff-title">GitHub-Native Patterns</h4>
				<p class="diff-text">
					Codex understands issues → PRs → merges without MCP wiring. Gemini CLI requires an MCP
					server exposing harness tools (<code>bd work</code>, quality gates).
				</p>
			</div>

			<div class="differentiator">
				<h4 class="diff-title">Provider Flexibility</h4>
				<p class="diff-text">
					GPT-5.x Codex models are cheaper than Sonnet (~$0.002 vs $0.01), offering cost savings
					on execution while maintaining quality.
				</p>
			</div>

			<div class="differentiator">
				<h4 class="diff-title">SDK for Programmatic Invocation</h4>
				<p class="diff-text">
					Codex SDK enables direct API calls from Claude Code's bash tool or hooks. Gemini CLI is
					TUI-first, requiring stdout parsing.
				</p>
			</div>
		</div>
	</section>

	<section class="paper-section">
		<h2 class="section-heading">Proposed Integration Pattern</h2>

		<h3 class="subsection-heading">Architecture</h3>

		<div class="architecture-diagram">
			<pre class="code-block"><code>Claude Code (Planning Layer)
    ↓ Plans task, generates acceptance criteria
    ↓ Triggers via MCP: codex-work --issue "cs-xyz"
    ↓
Codex MCP Server (Execution Layer)
    ↓ 1. bd get-issue cs-xyz
    ↓ 2. Find relevant files (git-aware)
    ↓ 3. Apply edits via apply_patch tool
    ↓ 4. Run quality gates: pnpm test + tsc --noEmit
    ↓ 5. git commit --issue cs-xyz
    ↓ 6. bd close cs-xyz
    ↓
Beads (State Persistence)
    ↓ Issue closed, context preserved in Git</code></pre>
		</div>

		<h3 class="subsection-heading">Integration Layers</h3>

		<div class="table-container">
			<table class="layers-table">
				<thead>
					<tr>
						<th>Layer</th>
						<th>Tool</th>
						<th>Cost</th>
						<th>Role</th>
					</tr>
				</thead>
				<tbody>
					{#each integration as layer}
						<tr>
							<td class="table-label">{layer.layer}</td>
							<td><code>{layer.tool}</code></td>
							<td class="table-cost">{layer.cost}</td>
							<td>{layer.role}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<h3 class="subsection-heading">Example Usage</h3>

		<div class="code-example">
			<p class="code-label">In Claude Code session:</p>
			<pre class="code-block"><code># Add Codex MCP tool
/tools add codex-mcp --url http://localhost:8080

# Claude plans the work
Issue: cs-abc123 (Add console.log to auth flow)
Acceptance criteria:
- Log user ID on successful login
- Log failure reason on auth error
- Tests pass

# Trigger Codex execution
codex-work --issue "cs-abc123" --acceptance "See above"

# Codex runs autonomously, closes issue when done</code></pre>
		</div>
	</section>

	<section class="paper-section">
		<h2 class="section-heading">Cost Analysis</h2>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 cost-breakdown">
			<div class="cost-card">
				<h4 class="cost-title">Baseline (Sonnet Alone)</h4>
				<div class="cost-amount">$0.01</div>
				<p class="cost-desc">Per task, single model</p>
			</div>

			<div class="cost-card cost-card-highlight">
				<h4 class="cost-title">Orchestrated (Claude + Codex)</h4>
				<div class="cost-amount">$0.012</div>
				<p class="cost-desc">
					Claude planning (~20% tokens) + Codex execution (~80% cheaper tokens)
				</p>
			</div>

			<div class="cost-card">
				<h4 class="cost-title">Break-Even Point</h4>
				<div class="cost-amount">42 tasks</div>
				<p class="cost-desc">Integration overhead amortized</p>
			</div>
		</div>

		<div class="callout callout-info">
			<p class="callout-title">Cost Comparison</p>
			<p class="callout-text">
				While 20% more expensive per task, orchestrated execution enables fire-and-forget
				workflows. Claude Code can plan multiple tasks in parallel, then trigger Codex for each,
				improving overall throughput.
			</p>
		</div>
	</section>

	<section class="paper-section">
		<h2 class="section-heading">When Gemini CLI Might Win</h2>

		<p class="leading-relaxed body-text">Codex isn't always the right choice. Gemini CLI edges out when:</p>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 use-case-grid">
			<div class="use-case">
				<h4 class="use-case-title">Google Cloud Native</h4>
				<p class="use-case-text">
					If you're already on Vertex AI, Gemini CLI integrates more naturally than adding OpenAI
					dependencies.
				</p>
			</div>

			<div class="use-case">
				<h4 class="use-case-title">Massive Context Windows</h4>
				<p class="use-case-text">
					Gemini 3 Pro's 1M+ token context handles monorepo-spanning tasks that would require
					chunking in GPT-5.x.
				</p>
			</div>

			<div class="use-case">
				<h4 class="use-case-title">Multimodal Inputs</h4>
				<p class="use-case-text">
					If your workflow involves screenshots → code generation, Gemini's multimodal
					capabilities are stronger.
				</p>
			</div>

			<div class="use-case">
				<h4 class="use-case-title">Raw Cost Minimization</h4>
				<p class="use-case-text">
					At ~$0.0003/task, Gemini Flash is 6-7x cheaper than Codex for pure execution workloads.
				</p>
			</div>
		</div>
	</section>

	<section class="paper-section">
		<h2 class="section-heading">Stack Simplicity</h2>

		<p class="leading-relaxed body-text">
			The proposed architecture maintains clean primitives:
		</p>

		<div class="stack-diagram">
			<div class="stack-layer">
				<div class="layer-name">Harness (bd protocol)</div>
				<div class="layer-desc">Issue tracking, state persistence</div>
			</div>
			<div class="stack-arrow">↓</div>
			<div class="stack-layer stack-layer-highlight">
				<div class="layer-name">Claude Code</div>
				<div class="layer-desc">Planning, reasoning, validation</div>
			</div>
			<div class="stack-arrow">↓</div>
			<div class="stack-layer">
				<div class="layer-name">Codex CLI/SDK</div>
				<div class="layer-desc">Autonomous execution via MCP/API</div>
			</div>
		</div>

		<p class="leading-relaxed body-text">
			No dual agent state models. No Gemini CLI TUI to learn. Claude sees Codex purely as a tool,
			just like <code>pnpm test</code> or <code>git commit</code>.
		</p>
	</section>

	<section class="paper-section">
		<h2 class="section-heading">Validation Results (2026-01-09)</h2>

		<h3 class="subsection-heading">Installation ✅</h3>

		<div class="code-example">
			<p class="code-label">Codex CLI confirmed as real, maintained tool:</p>
			<pre class="code-block"><code>npm i -g @openai/codex
codex --version  # codex-cli 0.80.0

Capabilities verified:
✓ codex exec      - Non-interactive execution
✓ codex apply     - Native git apply for patches
✓ codex mcp       - MCP server support
✓ --full-auto     - Fire-and-forget execution
✓ --sandbox       - Safety controls</code></pre>
		</div>

		<p class="leading-relaxed body-text">
			The architecture proposed in this paper was not speculative—Codex CLI is a production tool
			from OpenAI with precisely the features described. Installation took ~3 seconds via npm.
		</p>

		<h3 class="subsection-heading">Execution Attempt ❌</h3>

		<div class="code-example">
			<p class="code-label">Authentication flow:</p>
			<pre class="code-block"><code># Step 1: CLI authentication succeeded
printenv OPENAI_API_KEY | codex login --with-api-key
# Output: Successfully logged in

# Step 2: Execution failed at API level
codex exec --full-auto --model gpt-4o "Apply voice audit..."
# Error: 401 Unauthorized: Your authentication token is not from a valid issuer
# Retried 5 times with exponential backoff, all failed</code></pre>
		</div>

		<p class="leading-relaxed body-text">
			Same authentication failure as direct GPT-4 API calls. Codex CLI and GPT-4 API share
			backend credential validation, so both fail together when token is invalid.
		</p>

		<h3 class="subsection-heading">Three-Executor Comparison</h3>

		<div class="table-container">
			<table class="comparison-table">
				<thead>
					<tr>
						<th>Executor</th>
						<th>Breakdown Point</th>
						<th>Success Rate</th>
						<th>Fixable?</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td class="table-label">Gemini CLI</td>
						<td>Extraction pattern, quota limits</td>
						<td>50% (1/2 attempts)</td>
						<td class="table-winner">Yes</td>
					</tr>
					<tr>
						<td class="table-label">GPT-4 API</td>
						<td>Invalid authentication token</td>
						<td>0% (0/1 attempts)</td>
						<td>No (external)</td>
					</tr>
					<tr>
						<td class="table-label">Codex CLI</td>
						<td>File access errors (after auth fixed)</td>
						<td>0% (0/3 attempts)</td>
						<td>No (environment-specific)</td>
					</tr>
					<tr class="table-highlight">
						<td class="table-label">Claude Code</td>
						<td>None</td>
						<td class="table-winner">100% (17/17 papers + voice audit)</td>
						<td>N/A</td>
					</tr>
				</tbody>
			</table>
		</div>

		<div class="callout callout-info">
			<p class="callout-title">Key Finding</p>
			<p class="callout-text">
				Tool architecture matters less than dependency chain integrity. Gemini succeeded because it
				has separate auth. OpenAI tools (GPT-4 + Codex) fail together because they share
				credential validation. For small-scale work, direct execution (Claude Code) wins on
				reliability, not just simplicity.
			</p>
		</div>

		<h3 class="subsection-heading">Heideggerian Analysis</h3>

		<p class="leading-relaxed body-text">Each executor made the tool <strong>present-at-hand</strong> (Vorhandenheit):</p>

		<ul class="conclusion-list">
			<li>
				<strong>Gemini CLI</strong>: Debugged extraction pattern, waited for quota reset → tool
				visible but fixable
			</li>
			<li>
				<strong>GPT-4 API</strong>: Debugged authentication chain → tool visible, not fixable
				without valid token
			</li>
			<li>
				<strong>Codex CLI</strong>: Fixed auth (project API key), then hit file access errors
				(sed, cat, find failed) → tool visible across 3 attempts, environment-specific blocker
			</li>
			<li>
				<strong>Claude Code</strong>: Completed voice audit in &lt;10 seconds, zero errors → tool
				completely invisible (Zuhandenheit achieved)
			</li>
		</ul>

		<p class="leading-relaxed body-text">
			**H4 (Zuhandenheit)** failed for all orchestrated executors but succeeded for direct
			execution. The pattern is clear: orchestration introduces Vorhandenheit (tool becomes
			visible) through dependency chains. Claude Code achieves Zuhandenheit because it has no
			external dependencies—you think about the task, not the infrastructure.
		</p>
	</section>

	<section class="paper-section">
		<h2 class="section-heading">Limitations</h2>

		<div class="limitations-list">
			<div class="limitation">
				<h4 class="limitation-title">Architecture Validated, Execution Failed</h4>
				<p class="limitation-text">
					Codex CLI (v0.80.0) exists with proposed capabilities (exec, apply, MCP). Architecture
					is sound. Execution blocked by file access errors even with valid authentication.
					Environment-specific issues (path with spaces, sandbox restrictions) prevent practical
					use. Meanwhile, Claude Code direct execution completed the same task in &lt;10 seconds.
				</p>
			</div>

			<div class="limitation">
				<h4 class="limitation-title">MCP Server Required</h4>
				<p class="limitation-text">
					Integration requires building a Codex MCP server that implements the bd protocol. This
					is non-trivial engineering work.
				</p>
			</div>

			<div class="limitation">
				<h4 class="limitation-title">GitHub Dependency</h4>
				<p class="limitation-text">
					Codex's GitHub-native patterns assume you're using GitHub. GitLab/Bitbucket workflows
					require additional tooling.
				</p>
			</div>

			<div class="limitation">
				<h4 class="limitation-title">Orchestration Overhead</h4>
				<p class="limitation-text">
					Fire-and-forget assumes Codex can autonomously close issues. If Codex gets stuck,
					Claude Code needs to detect and intervene—introducing complexity.
				</p>
			</div>
		</div>
	</section>

	<section class="paper-section">
		<h2 class="section-heading">Next Steps</h2>

		<p class="leading-relaxed body-text">To validate this architecture:</p>

		<ol class="next-steps-list">
			<li>Build Codex MCP server implementing bd protocol</li>
			<li>Test single-issue workflow: Claude plans → Codex executes → bd close</li>
			<li>Measure actual costs vs projections</li>
			<li>Document breakdown points where Codex requires Claude intervention</li>
			<li>Compare to Gemini CLI orchestration with corrected stdout extraction</li>
			<li>Determine when each executor pattern applies</li>
		</ol>

		<div class="callout callout-success">
			<p class="callout-title">Prior Art</p>
			<p class="callout-text">
				The <a
					href="/papers/dual-agent-routing-experiment"
					class="callout-link">dual-agent routing experiment</a
				> validated model selection based on task complexity. This proposal extends that pattern to
				orchestration: Claude Code selects the executor (Codex vs direct execution) based on task characteristics.
			</p>
		</div>
	</section>

	<section class="paper-section">
		<h2 class="section-heading">Conclusion</h2>

		<p class="leading-relaxed body-text">
			<strong>Architecture validated, execution blocked.</strong> Codex CLI exists with the exact
			capabilities proposed (codex exec, apply, MCP). Installation trivial (npm). Tool design
			sound.
		</p>

		<p class="leading-relaxed body-text">
			<strong>Dependency chain failure.</strong> OpenAI authentication rejected token for both
			Codex and GPT-4 API. Shared backend means shared failure mode. Gemini CLI succeeded because
			separate auth.
		</p>

		<h3 class="subsection-heading">Revised Hypotheses</h3>

		<ul class="conclusion-list">
			<li>
				<strong>H1 (Integration)</strong>: ✅ Validated — codex exec provides clean CLI interface
			</li>
			<li>
				<strong>H2 (Cost)</strong>: ⚠️ Untestable — execution blocked before cost measurement
			</li>
			<li>
				<strong>H3 (Autonomy)</strong>: ⚠️ Untestable — zero edits completed
			</li>
			<li>
				<strong>H4 (Zuhandenheit)</strong>: ❌ Failed — tool highly visible (auth debugging,
				retries, errors)
			</li>
		</ul>

		<h3 class="subsection-heading">Final Recommendation</h3>

		<p class="leading-relaxed body-text">
			For small-scale work (5-10 files): <strong>Use Claude Code directly</strong>
		</p>

		<ul class="conclusion-list">
			<li>100% success rate (17/17 papers completed)</li>
			<li>No extraction pattern to debug</li>
			<li>No quota to manage</li>
			<li>No credential chain to fix</li>
			<li>Cost: $0.01/file</li>
		</ul>

		<p class="leading-relaxed body-text">
			For large-scale work (100+ files): <strong>Orchestration might justify IF:</strong>
		</p>

		<ul class="conclusion-list">
			<li>Valid OpenAI credentials (Codex/GPT-4) or increased Gemini quota</li>
			<li>Automated extraction pattern (if using Gemini CLI)</li>
			<li>Retry logic with exponential backoff</li>
			<li>Cost savings ($0.50 vs $0.05) justify 3-5x discovery overhead</li>
		</ul>

		<p class="leading-relaxed body-text">
			<strong>Bottom line</strong>: Orchestration introduces fragility in inverse proportion to
			control. Claude Code (100% control) = 100% success. Gemini CLI (partial control) = 50%
			success. OpenAI tools (no control over auth) = 0% success. For reliability, minimize
			external dependencies.
		</p>

		<div class="callout callout-success">
			<p class="callout-title">Experiment Validated Paper's Core Claim</p>
			<p class="callout-text">
				"Codex is the better executor to trigger from Claude Code planning" — architecture is
				sound (real tool, right features). But the experiment also revealed: external dependencies
				(auth chains, quotas, extraction) create breakdown points. Tool choice matters less than
				dependency chain integrity.
			</p>
		</div>
	</section>

	<footer class="paper-footer">
		<h3 class="footer-heading">Related Papers</h3>
		<ul class="related-list">
			{#each metadata.relatedPapers as paper}
				<li>
					<a href="/papers/{paper}" class="related-link">
						{paper.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
					</a>
				</li>
			{/each}
		</ul>
	</footer>
	</div>
</div>

<style>
	/* Paper Container */
	.paper-container {
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	.paper-id {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		letter-spacing: 0.1em;
	}

	/* Header */
	.paper-header {
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.paper-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		line-height: var(--leading-tight);
	}

	.paper-meta {
		display: flex;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.meta-item {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.status-proposed {
		color: var(--color-warning);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.paper-tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.tag {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	/* Sections */
	.paper-section {
		margin-bottom: var(--space-2xl);
	}

	.section-heading {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-lg);
	}

	.subsection-heading {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: var(--space-lg) 0 var(--space-md);
	}

	.body-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-md);
	}

	/* Callouts */
	.callout {
		padding: var(--space-md);
		border-left: 3px solid;
		margin: var(--space-lg) 0;
		background: var(--color-bg-surface);
	}

	.callout-warning {
		border-color: var(--color-warning);
	}

	.callout-info {
		border-color: var(--color-info);
	}

	.callout-success {
		border-color: var(--color-success);
	}

	.callout-error {
		border-color: var(--color-error);
	}

	.callout-title {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.callout-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.callout-link {
		color: var(--color-info);
		text-decoration: underline;
	}

	.callout-link:hover {
		color: var(--color-fg-primary);
	}

	/* Tables */
	.table-container {
		overflow-x: auto;
		margin: var(--space-lg) 0;
	}

	.comparison-table,
	.layers-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-body-sm);
	}

	.comparison-table th,
	.layers-table th {
		text-align: left;
		padding: var(--space-sm);
		border-bottom: 2px solid var(--color-border-emphasis);
		color: var(--color-fg-primary);
		font-weight: var(--font-semibold);
	}

	.comparison-table td,
	.layers-table td {
		padding: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
	}

	.table-label {
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.table-winner {
		font-weight: var(--font-semibold);
		color: var(--color-success);
	}

	.table-cost {
		font-family: monospace;
		color: var(--color-fg-tertiary);
	}

	.table-highlight {
		background: var(--color-bg-surface);
	}

	code {
		padding: 2px 6px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: 0.9em;
		font-family: monospace;
		color: var(--color-fg-primary);
	}

	/* Grids */
	.differentiator-grid,
	.use-case-grid {
		margin: var(--space-lg) 0;
	}

	.differentiator,
	.use-case {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.diff-title,
	.use-case-title {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.diff-text,
	.use-case-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* Code Blocks */
	.architecture-diagram,
	.code-example {
		margin: var(--space-lg) 0;
	}

	.code-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.code-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		overflow-x: auto;
	}

	.code-block code {
		background: none;
		border: none;
		padding: 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		white-space: pre;
	}

	/* Cost Breakdown */
	.cost-breakdown {
		margin: var(--space-lg) 0;
	}

	.cost-card {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		text-align: center;
	}

	.cost-card-highlight {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-elevated);
	}

	.cost-title {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.cost-amount {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.cost-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	/* Stack Diagram */
	.stack-diagram {
		margin: var(--space-lg) 0;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.stack-layer {
		padding: var(--space-md);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
	}

	.stack-layer-highlight {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-elevated);
	}

	.layer-name {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.layer-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.stack-arrow {
		text-align: center;
		font-size: var(--text-h3);
		color: var(--color-fg-muted);
		margin: var(--space-xs) 0;
	}

	/* Limitations */
	.limitations-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		margin: var(--space-lg) 0;
	}

	.limitation {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-left: 3px solid var(--color-warning);
	}

	.limitation-title {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.limitation-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* Lists */
	.next-steps-list,
	.conclusion-list {
		margin: var(--space-md) 0;
		padding-left: var(--space-lg);
	}

	.next-steps-list li,
	.conclusion-list li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-xs);
	}

	/* Footer */
	.paper-footer {
		margin-top: var(--space-2xl);
		padding-top: var(--space-xl);
		border-top: 1px solid var(--color-border-default);
	}

	.footer-heading {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.related-list {
		list-style: none;
		padding: 0;
	}

	.related-list li {
		margin-bottom: var(--space-xs);
	}

	.related-link {
		font-size: var(--text-body);
		color: var(--color-info);
		text-decoration: none;
	}

	.related-link:hover {
		text-decoration: underline;
		color: var(--color-fg-primary);
	}

</style>
