<script lang="ts">
	/**
	 * Policy OS Applied to Development Infrastructure
	 *
	 * Research paper demonstrating that Policy OS — CREATE SOMETHING's governed
	 * execution platform — maps structurally onto the development workflow itself,
	 * proving that agent governance is not an add-on but a property that emerges
	 * from the Three-Tier Framework at every scale.
	 */
	import { SEO } from '@create-something/canon';
</script>

<SEO
	title="Policy OS Applied to Development Infrastructure"
	description="Applying the Three-Tier Framework and Policy OS governance to the development workflow via the Pi coding agent harness."
	keywords="Policy OS, Three-Tier Framework, Pi, agent governance, MCP, quality gates, development infrastructure"
	ogType="article"
	articleSection="Research"
	publishedTime="2026-05-11T00:00:00Z"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Papers', url: 'https://createsomething.io/papers' },
		{ name: 'Policy OS Development Infrastructure', url: 'https://createsomething.io/papers/policy-os-development-infrastructure' }
	]}
/>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">

		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-012</div>
			<h1 class="mb-3 paper-title">Policy OS Applied to Development Infrastructure</h1>
			<p class="max-w-3xl paper-subtitle">
				Applying the Three-Tier Framework and Policy OS to the development workflow itself,
				demonstrating that agent governance emerges as a structural property at every scale.
			</p>
			<div class="flex gap-6 mt-6 paper-meta">
				<span>May 2026</span>
				<span>CREATE SOMETHING</span>
				<span>createsomething.io</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="space-y-4">
			<h2 class="section-title">Abstract</h2>
			<p class="body-text">
				Policy OS — CREATE SOMETHING's governed execution platform — was designed for client MCP deployments.
				This paper documents applying the same product to our own development workflow via the Pi coding agent
				harness, demonstrating that agent governance is not an add-on but a structural property that emerges
				from the Three-Tier Framework at every scale.
			</p>
		</section>

		<!-- 1. Introduction -->
		<section class="space-y-4">
			<h2 class="section-title">1. Introduction</h2>
			<p class="body-text">
				Agent coding harnesses — Pi, Claude Code, Codex, Cursor — share a fundamental problem: they are
				general-purpose tools operating in domain-specific environments. An agent writing SvelteKit components
				needs to know about Canon design tokens. An agent deploying MCP servers needs to know about the fleet
				registry. An agent closing a Linear issue needs to know about the evidence contract.
			</p>
			<p class="body-text">
				This knowledge traditionally lives in documentation that agents may or may not read. The Policy OS
				approach makes it structural: quality gates enforce compliance automatically, custom tools make
				verification easy, and domain skills make knowledge loadable on demand.
			</p>
		</section>

		<!-- 2. The Three-Tier Mapping -->
		<section class="space-y-4">
			<h2 class="section-title">2. The Three-Tier Mapping</h2>
			<p class="body-text">
				The development harness maps cleanly to the Three-Tier Framework:
			</p>
			<div class="overflow-x-auto">
				<table class="data-table">
					<thead>
						<tr>
							<th>Tier</th>
							<th>Framework Role</th>
							<th>Development Implementation</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td class="font-semibold">Database</td>
							<td>What exists</td>
							<td>Git state, package exports, fleet registry, Canon tokens</td>
						</tr>
						<tr>
							<td class="font-semibold">Automation</td>
							<td>What happens</td>
							<td>Quality gates, custom tools, interactive commands</td>
						</tr>
						<tr>
							<td class="font-semibold">Judgment</td>
							<td>What should happen</td>
							<td>Bash guard, pre-completion checks, evidence requirements</td>
						</tr>
					</tbody>
				</table>
			</div>

			<h3 class="subsection-title">Control Models Verified</h3>
			<ul class="space-y-2 body-text">
				<li><strong>Application-controlled (Database)</strong>: Session context injected via
					<code>before_agent_start</code> — the extension decides what state the agent sees.</li>
				<li><strong>Model-controlled (Automation)</strong>: Custom tools like <code>context7_query</code>
					are available but the agent decides when to call them.</li>
				<li><strong>User-controlled (Judgment)</strong>: Skills loaded via <code>/skill:name</code> —
					explicit selection of guidance.</li>
			</ul>
		</section>

		<!-- 3. Implementation -->
		<section class="space-y-4">
			<h2 class="section-title">3. Implementation</h2>

			<h3 class="subsection-title">Scale</h3>
			<div class="overflow-x-auto">
				<table class="data-table">
					<thead>
						<tr>
							<th>Component</th>
							<th>Count</th>
							<th>Role</th>
						</tr>
					</thead>
					<tbody>
						<tr><td>Event handlers</td><td>8</td><td>Quality gates, context injection, bash guard, lifecycle</td></tr>
						<tr><td>Custom tools</td><td>3</td><td>Context7 bridge (×2), package export verifier</td></tr>
						<tr><td>Commands</td><td>8</td><td>Linear workflow, testing, fleet ops, Canon audit, pre-commit</td></tr>
						<tr><td>Prompt templates</td><td>8</td><td>Deploy, audit, review, research, experiment, paper, MCP scaffold</td></tr>
						<tr><td>Skills</td><td>21</td><td>3 native + 18 cross-loaded — domain knowledge on demand</td></tr>
						<tr><td>Theme</td><td>51 colors</td><td>Glass Design System alignment</td></tr>
						<tr><td>Total extension</td><td>1,181 lines</td><td>Single coherent extension file</td></tr>
					</tbody>
				</table>
			</div>

			<h3 class="subsection-title">Quality Gate Architecture</h3>
			<pre class="code-block"><code>Write/Edit
    │
    ├─► tool_result handler
    │     ├── Canon token compliance (6 pattern checks)
    │     ├── Import verification (@create-something/* packages)
    │     ├── Paper structure (SEO, container, classes)
    │     └── Experiment structure (SEO, Canon tokens, hex colors)
    │
    └── Violations? → Append to tool result → Agent self-corrects

Bash execution
    │
    └─► tool_call handler
          ├── Block legacy loom commands → redirect to Linear
          └── Enforce [CRE-NNN] in commit messages

Agent completion
    │
    └─► agent_end handler
          ├── TypeScript type check (modified packages)
          ├── ESLint lint check (modified packages)
          ├── Uncommitted changes reminder
          └── Issues? → sendUserMessage(followUp) → Agent fixes</code></pre>
		</section>

		<!-- 4. The Recursive Property -->
		<section class="space-y-4">
			<h2 class="section-title">4. The Recursive Property in Practice</h2>
			<p class="body-text">
				The extension exhibits the Three-Tier Framework's recursive property:
			</p>
			<ol class="space-y-2 body-text list-decimal list-inside">
				<li><code>tool_result</code> (Automation) checks Canon compliance (Judgment) and feeds violations back</li>
				<li>The agent (Automation) reads the violations and self-corrects (more Automation)</li>
				<li><code>agent_end</code> (Automation) runs typecheck (Database verification) and reports</li>
				<li>If issues exist, <code>sendUserMessage</code> re-enters the agent loop — Automation invoking more Automation with embedded Judgment</li>
			</ol>
			<p class="body-text">
				This is the sampling feedback loop described in the framework paper, realized in a development harness.
			</p>
		</section>

		<!-- 5. The Product Insight -->
		<section class="space-y-4">
			<h2 class="section-title">5. The Product Insight</h2>
			<p class="body-text">
				What we built for the development workflow is structurally identical to what we sell as Policy OS:
			</p>
			<div class="overflow-x-auto">
				<table class="data-table">
					<thead>
						<tr>
							<th>Policy OS Deliverable</th>
							<th>Development Implementation</th>
						</tr>
					</thead>
					<tbody>
						<tr><td><code>mcp_contract.yaml</code></td><td><code>.pi/settings.json</code> + cross-loaded skills</td></tr>
						<tr><td><code>agent_contract.yaml</code></td><td>Bash guard rules + quality gate event handlers</td></tr>
						<tr><td><code>outcome_contract.md</code></td><td><code>APPEND_SYSTEM.md</code> + prompt templates</td></tr>
						<tr><td><code>golden_tasks.yaml</code></td><td>Pre-commit checks + typecheck/lint on completion</td></tr>
						<tr><td><code>runbook.md</code></td><td>Interactive commands (<code>/linear</code>, <code>/fleet</code>, <code>/deploy</code>)</td></tr>
					</tbody>
				</table>
			</div>
			<p class="body-text emphasis-text">
				The harness IS the policy. The configuration IS the contract. The development workflow IS the first client.
			</p>
		</section>

		<!-- 6. Distribution as Discovery -->
		<section class="space-y-4">
			<h2 class="section-title">6. Distribution as Discovery</h2>
			<p class="body-text">
				The Pi package ecosystem enables a new funnel:
			</p>
			<pre class="code-block"><code>pi install npm:@create-something/pi-three-tier-framework
    → Developer learns Database/Automation/Judgment
    → Classifies their own systems

pi install npm:@create-something/pi-policy-os
    → Developer runs /policy-check
    → Sees governance score and gaps
    → Contacts createsomething.agency</code></pre>
			<p class="body-text">
				This mirrors the MCP-First Thesis: the entry point is connectivity (installable agent configuration),
				not intelligence (full consulting engagement).
			</p>
		</section>

		<!-- 7. Conclusion -->
		<section class="space-y-4">
			<h2 class="section-title">7. Conclusion</h2>
			<p class="body-text">
				Policy OS is not a product category — it is a consequence of the Three-Tier Framework applied to any
				agent-governed workflow. When you configure quality gates, you are building Database checks. When you
				register custom tools, you are building Automation. When you write domain skills and prompt templates,
				you are building Judgment artifacts.
			</p>
			<p class="body-text emphasis-text">
				The creation moat — understanding what to build, not just how to install it — applies to agent harness
				configuration just as it applies to MCP server creation. Both require domain expertise combined with
				protocol knowledge. Both are hard to commoditize.
			</p>
		</section>

		<!-- Footer -->
		<footer class="pt-8 paper-footer">
			<p class="body-text">
				CREATE SOMETHING builds the connectivity and control layer between tools and AI.
			</p>
			<div class="flex gap-6 mt-4 paper-links">
				<a href="https://createsomething.agency" class="paper-link">createsomething.agency</a>
				<a href="https://createsomething.io/papers" class="paper-link">More papers</a>
				<a href="https://github.com/createsomethingtoday" class="paper-link">GitHub</a>
			</div>
		</footer>

	</div>
</div>

<style>
	.paper-container {
		background: var(--color-bg-pure);
	}
	.paper-header {
		border-bottom: 1px solid var(--color-border-default);
	}
	.paper-id {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}
	.paper-title {
		color: var(--color-fg-primary);
		font-size: var(--text-3xl);
		font-weight: 700;
		line-height: 1.2;
	}
	.paper-subtitle {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
		line-height: 1.6;
	}
	.paper-meta {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		font-family: var(--font-mono);
	}
	.section-title {
		color: var(--color-fg-primary);
		font-size: var(--text-xl);
		font-weight: 600;
	}
	.subsection-title {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
		font-weight: 600;
	}
	.body-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
		line-height: 1.7;
	}
	.emphasis-text {
		color: var(--color-fg-primary);
		font-weight: 500;
	}
	.data-table {
		width: 100%;
		border-collapse: collapse;
	}
	.data-table th {
		text-align: left;
		padding: var(--space-xs) var(--space-sm);
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		font-weight: 500;
		border-bottom: 1px solid var(--color-border-default);
	}
	.data-table td {
		padding: var(--space-xs) var(--space-sm);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		border-bottom: 1px solid var(--color-border-default);
	}
	.data-table code {
		color: var(--color-fg-primary);
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
	}
	.code-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		overflow-x: auto;
	}
	.code-block code {
		color: var(--color-fg-secondary);
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		line-height: 1.6;
		white-space: pre;
	}
	.paper-footer {
		border-top: 1px solid var(--color-border-default);
	}
	.paper-link {
		color: var(--color-brand-primary);
		text-decoration: none;
		font-size: var(--text-body-sm);
	}
	.paper-link:hover {
		text-decoration: underline;
	}
</style>
