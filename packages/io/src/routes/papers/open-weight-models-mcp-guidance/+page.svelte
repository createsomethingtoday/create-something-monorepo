<script lang="ts">
	/**
	 * Open-Weight Models in Client MCP Work
	 *
	 * Methodology paper: practical guidance for consultancies delivering MCP education and
	 * MCP implementations. Focus: when to use OpenAI open-weight models (gpt-oss, safeguard)
	 * vs hosted frontier models, and how that choice changes what you must own operationally.
	 */
	import { SEO } from '@create-something/canon';
</script>

<SEO
	title="Open-Weight Models in Client MCP Work"
	description="A decision framework for when to use OpenAI gpt-oss (and safeguard) versus hosted frontier models in client education and implementation."
	keywords="MCP, open-weight models, OpenAI, gpt-oss, gpt-oss-safeguard, client implementation, education, safety, deployment"
	ogType="article"
	articleSection="Methodology"
	publishedTime="2026-02-15T00:00:00Z"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Papers', url: 'https://createsomething.io/papers' },
		{ name: 'Open-Weight Models in Client MCP Work', url: 'https://createsomething.io/papers/open-weight-models-mcp-guidance' }
	]}
/>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-009</div>
			<h1 class="mb-3 paper-title">Open-Weight Models in Client MCP Work</h1>
			<p class="max-w-3xl paper-subtitle">
				A decision framework for when to use OpenAI <code>gpt-oss</code> (and <code>gpt-oss-safeguard</code>)
				versus hosted frontier models in client education and implementation.
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Methodology</span>
				<span>&bull;</span>
				<span>16 min read</span>
				<span>&bull;</span>
				<span>Intermediate</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="abstract-section space-y-4">
			<h2 class="section-heading">Abstract</h2>
			<p class="body-text leading-relaxed">
				Client MCP work forces a concrete trade: do you want to <strong>rent capability</strong> (hosted models)
				or <strong>own capability</strong> (open weights)? Open-weight models can unlock local inference,
				customization, and inspectability that makes education and certain deployments dramatically easier.
				They also shift operational responsibility onto you: safety layers, reliability, scaling, and governance.
			</p>
			<p class="body-text leading-relaxed">
				This paper provides a decision matrix and a set of repeatable delivery patterns for consultancies
				building MCP integrations for clients. It covers OpenAI <code>gpt-oss-20b</code> / <code>gpt-oss-120b</code>
				for reasoning + tool use, <code>gpt-oss-safeguard</code> for policy-based labeling, and where hosted frontier
				models remain the correct default for production critical paths.
			</p>
		</section>

		<!-- At a glance -->
		<section class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="p-4 metric-card">
				<div class="metric-value">Default</div>
				<div class="metric-label">
					Hosted frontier models for client-facing, SLA-bound production paths (least ops burden).
				</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">Use gpt-oss</div>
				<div class="metric-label">
					Education, private/edge deployments, and customization where "owning the model" is the point.
				</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">Use Safeguard</div>
				<div class="metric-label">
					Policy-defined labeling and moderation; treat it as a classifier, not as an end-user chat model.
				</div>
			</div>
		</section>

		<!-- Key Insight -->
		<section class="p-6 quote-box">
			<div class="text-center">
				<p class="italic quote-text">
					"Open weights do not remove complexity. They move it. You stop paying an API bill and start paying
					in operations, governance, and safety engineering."
				</p>
				<p class="mt-2 quote-attribution">— CREATE SOMETHING delivery heuristic</p>
			</div>
		</section>

		<!-- I. Decision Context -->
		<section class="space-y-6">
			<h2 class="section-heading">I. Model Choice Becomes Architecture in MCP Work</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					In typical software projects, model choice can look like a vendor decision. In MCP projects,
					it becomes an architectural decision because MCP systems are defined by <em>trust boundaries</em>:
					what the system can access, what actions it can take, and what human oversight exists.
				</p>

				<p>
					This is especially true for client delivery because "education" and "implementation" pull
					in opposite directions:
				</p>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Mode</th>
								<th>Primary objective</th>
								<th>Model pressure</th>
								<th>What failure looks like</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td><strong>Client education</strong></td>
								<td>Teach mental models, make systems legible</td>
								<td>Inspectability and repeatability</td>
								<td>"It works on your machine, but we cannot explain why"</td>
							</tr>
							<tr>
								<td><strong>Client implementation</strong></td>
								<td>Deliver outcomes safely under constraints</td>
								<td>Stability, supportability, compliance</td>
								<td>"It worked yesterday; today it fails and no one owns the fix"</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					The practical outcome: open-weight models are often a <strong>better education tool</strong>
					(because you can run locally, inspect behavior, and iterate without cost friction), while hosted
					models are often a <strong>better production default</strong> (because the vendor supplies system-level
					reliability and safety posture).
				</p>
			</div>
		</section>

		<!-- II. What gpt-oss is -->
		<section class="space-y-6">
			<h2 class="section-heading">II. What OpenAI Open-Weight Models Actually Buy You</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					OpenAI's <code>gpt-oss-20b</code> and <code>gpt-oss-120b</code> are open-weight reasoning models released
					under Apache 2.0, designed for instruction following, agentic tool use, and deployment flexibility
					across local, edge, and cloud environments. The headline value is not that they are "free" &mdash;
					it is that they are <strong>controllable</strong>.
				</p>

				<p>
					In client terms, open weights let you answer "can we run this where our data lives?" with "yes" in
					situations where API-only models make the project impossible.
				</p>

				<h3 class="subsection-heading">II.1 Capabilities (and constraints)</h3>

				<ul class="list-disc pl-6 space-y-2">
					<li><strong>Permissive licensing</strong> for commercial deployment (Apache 2.0).</li>
					<li><strong>Configurable reasoning effort</strong> (<code>low</code>, <code>medium</code>, <code>high</code>) to trade latency/cost vs quality.</li>
					<li><strong>Agentic patterns</strong> (tool use, function calling, structured outputs) aimed at workflow integration.</li>
					<li><strong>Open-weight safety trade</strong>: once weights are released, system-level mitigations cannot be revoked centrally.</li>
				</ul>

				<h3 class="subsection-heading">II.2 Choosing 20b vs 120b</h3>

				<p>
					In practice, the choice is less about benchmarks and more about deployment shape:
				</p>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Model</th>
								<th>Best fit</th>
								<th>Typical deployment</th>
								<th>What to watch</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td><code>gpt-oss-20b</code></td>
								<td>Local + edge + fast iteration</td>
								<td>Workstation / smaller GPU footprint</td>
								<td>Quality ceiling on complex reasoning</td>
							</tr>
							<tr>
								<td><code>gpt-oss-120b</code></td>
								<td>Production reasoning where you still need open weights</td>
								<td>Single high-memory GPU or managed compute</td>
								<td>Ops burden: throughput, cost, and reliability</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					For many client education engagements, <code>20b</code> is enough: it is the "portable lab model."
					For implementation work, <code>120b</code> makes sense primarily when the client has a hard constraint
					against API-only inference (data residency, air-gapped networks, or on-prem mandates).
				</p>
			</div>
		</section>

		<!-- III. Safeguard -->
		<section class="space-y-6">
			<h2 class="section-heading">III. gpt-oss-safeguard: Bring-Your-Own-Policy Labeling</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Most teams reach for "safety" only after something breaks. Client MCP work does not have that luxury:
					MCP tools can touch email, files, calendars, tickets, and operational systems. You need gating and
					classification early, not late.
				</p>

				<p>
					OpenAI's <code>gpt-oss-safeguard</code> models are positioned as open-weight, policy-driven classifiers:
					they reason over a supplied policy at inference time to label content. The primary advantage is
					<strong>policy agility</strong>: you can iterate on a written policy without re-training a traditional
					classifier each time.
				</p>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Problem</th>
								<th>Traditional classifier</th>
								<th><code>gpt-oss-safeguard</code></th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Policy changes weekly</td>
								<td>Retrain / relabel / redeploy</td>
								<td>Edit policy text and re-run</td>
							</tr>
							<tr>
								<td>Low example volume</td>
								<td>Hard to train reliably</td>
								<td>Can generalize from policy</td>
							</tr>
							<tr>
								<td>Need explainability</td>
								<td>Scores, limited rationale</td>
								<td>Reasoning trace (keep internal)</td>
							</tr>
							<tr>
								<td>High-throughput, low-latency</td>
								<td>Excellent</td>
								<td>Often too expensive/slow</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					Clear rule: use Safeguard as a <strong>labeling component</strong> in a pipeline (inputs, outputs,
					and high-risk tool calls). Do not treat it as the conversational model your users talk to.
				</p>
			</div>
		</section>

		<!-- IV. Decision Matrix -->
		<section class="space-y-6">
			<h2 class="section-heading">IV. Decision Matrix: Education vs Implementation</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The right question is not "which model is best?" It is: <strong>what constraint are we satisfying?</strong>
					The table below is intentionally specific to client MCP engagements.
				</p>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Scenario</th>
								<th>Recommended default</th>
								<th>Why</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Workshop: "What is MCP?" with hands-on tool calls</td>
								<td><strong>Open-weight</strong> (<code>gpt-oss-20b</code>)</td>
								<td>Cheap iteration, local demos, inspectable behavior</td>
							</tr>
							<tr>
								<td>Prototype: validate a workflow with real integrations</td>
								<td><strong>Hosted frontier</strong> + narrow open-weight experiments</td>
								<td>Minimize failure modes while exploring constraints</td>
							</tr>
							<tr>
								<td>Production: client-facing agent path with SLA</td>
								<td><strong>Hosted frontier</strong></td>
								<td>Reliability posture and vendor responsibility</td>
							</tr>
							<tr>
								<td>Production: policy labeling (PII, compliance, moderation)</td>
								<td><strong>Safeguard</strong> (or trained classifier at scale)</td>
								<td>Bring-your-own-policy, auditable labels; train dedicated classifiers if throughput requires</td>
							</tr>
							<tr>
								<td>On-prem / air-gapped mandate (no external inference)</td>
								<td><strong>Open-weight</strong> (<code>gpt-oss-120b</code> or <code>20b</code>)</td>
								<td>Hard constraint; accept ops and safety ownership</td>
							</tr>
							<tr>
								<td>"We want open weights, but do not want to run GPUs"</td>
								<td><strong>Managed open-weight</strong> (e.g., Workers AI)</td>
								<td>Keep deployment simplicity while using open-weight models</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="subsection-heading">IV.1 Simple decision tree</h3>
				<ol class="list-decimal pl-6 space-y-2">
					<li>
						<strong>Hard constraint?</strong> If the client requires on-prem or air-gapped inference, use
						<code>gpt-oss</code> and treat the work as an infrastructure project (not "just model selection").
					</li>
					<li>
						<strong>Education?</strong> If the goal is teaching and iteration, prefer <code>gpt-oss-20b</code>
						for local demos; it reduces friction and increases legibility.
					</li>
					<li>
						<strong>Production critical path?</strong> If a failure breaks a business workflow, hosted frontier
						models are the default unless a hard constraint overrides.
					</li>
					<li>
						<strong>Policy labeling?</strong> If you need classification against a written policy, use Safeguard
						first; if you need ultra-low latency at scale, train a dedicated classifier later.
					</li>
				</ol>
			</div>
		</section>

		<!-- V. Patterns -->
		<section class="space-y-6">
			<h2 class="section-heading">V. Delivery Patterns for Client MCP Projects</h2>

			<div class="space-y-6 leading-relaxed body-text">
				<h3 class="subsection-heading">V.1 Education Lab: Local model, fake data, real concepts</h3>

				<p>
					In education, the goal is not maximum accuracy. The goal is to make the system understandable.
					Running a local open-weight model helps because you can slow down, inspect, and repeat without cost
					anxiety.
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-primary">{`Education Lab (recommended default)

  Local gpt-oss:20b  →  MCP tools (mocked)  →  Student learns:
  (laptop/desktop)       (deterministic)       - Resources vs Tools vs Prompts
                                               - trust boundaries
                                               - approval flows`}</pre>
				</div>

				<p>
					Rule: keep the <strong>concepts real</strong> (MCP primitives, permissions, schemas) and keep the
					<strong>data fake</strong> until the client understands the boundary conditions.
				</p>

				<h3 class="subsection-heading">V.2 Hybrid Implementation: Hosted generation, open-weight gating</h3>

				<p>
					A pragmatic production posture is hybrid: use hosted frontier models for generation and planning,
					and use open-weight models for narrow, inspectable components where control matters (classification,
					extraction, or offline fallbacks).
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-primary">{`Hybrid Production (common pattern)

  MCP Tool Call → (Safeguard) policy label → allow/deny/escalate
       │
       └────────→ Hosted model generates response / plan / summary

  Outcome: hosted quality on the critical path, with explicit policy gates you own.`}</pre>
				</div>

				<h3 class="subsection-heading">V.3 Managed open-weight: Workers AI as the "no GPU ops" option</h3>

				<p>
					Clients often want open models for control reasons but do not want to run GPUs. In that case,
					use a managed platform that hosts the open-weight model and supports the same API format you use
					elsewhere.
				</p>

				<p>
					Example (Cloudflare Workers AI) showing explicit reasoning-effort control:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-primary">{`// Cloudflare Workers AI (Responses API-style payload)
// Model: @cf/openai/gpt-oss-20b or @cf/openai/gpt-oss-120b

const result = await env.AI.run("@cf/openai/gpt-oss-20b", {
  input: [{ role: "user", content: "Draft a client-safe explanation of MCP permissions." }],
  reasoning: { effort: "low" }
});`}</pre>
				</div>
			</div>
		</section>

		<!-- VI. What you must own -->
		<section class="space-y-6">
			<h2 class="section-heading">VI. The Real Cost of Open Weights: What You Must Own</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					This is the part that should be explicit in client delivery: open-weight is not a model selection.
					It is an <strong>ownership decision</strong>. You become responsible for the systems that hosted vendors
					quietly provide.
				</p>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Capability</th>
								<th>Hosted models</th>
								<th>Open-weight models</th>
								<th>How to de-risk</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Reliability (SLA, scaling)</td>
								<td>Vendor-owned</td>
								<td>You own</td>
								<td>Use managed open-weight or keep hosted on critical path</td>
							</tr>
							<tr>
								<td>Safety layers</td>
								<td>System-level defenses</td>
								<td>You assemble</td>
								<td>Use Safeguard + logging + human escalation</td>
							</tr>
							<tr>
								<td>Model updates</td>
								<td>Continuous, vendor-managed</td>
								<td>Explicit pin/upgrade</td>
								<td>Version pin, staging eval, rollback plan</td>
							</tr>
							<tr>
								<td>Cost predictability</td>
								<td>Per-token bill</td>
								<td>Hardware + ops</td>
								<td>Decide which cost center is acceptable</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="subsection-heading">VI.1 Readiness checklist (minimum)</h3>
				<ul class="list-disc pl-6 space-y-2">
					<li><strong>Threat model</strong>: what data is the model allowed to see? what tools can it call?</li>
					<li><strong>Gating</strong>: policy labels on inputs/outputs; block or escalate when uncertain.</li>
					<li><strong>Auditability</strong>: log model version, prompts/policies, tool calls, and outcomes.</li>
					<li><strong>Fallbacks</strong>: route to hosted models for high-stakes requests or failures.</li>
					<li><strong>Upgrade discipline</strong>: pin versions, run evals, and ship upgrades intentionally.</li>
				</ul>
			</div>
		</section>

		<!-- VII. Limitations -->
		<section class="space-y-6">
			<h2 class="section-heading">VII. Limitations and Failure Modes</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The goal is not to "pick open weights." The goal is to pick the right ownership posture for the
					client's constraints.
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>
						<strong>Open-weight safety is a different game.</strong> Once weights are released, they can be
						fine-tuned or modified by adversaries; system-level mitigations cannot be revoked centrally.
					</li>
					<li>
						<strong>Reasoning traces are not UI.</strong> Treat chain-of-thought and policy reasoning as internal-only
						diagnostics; do not expose them to end users.
					</li>
					<li>
						<strong>Classification tradeoffs remain.</strong> A dedicated classifier trained on large labeled datasets
						can outperform policy-reasoning models for specific, high-volume risk areas.
					</li>
					<li>
						<strong>Ops burden surprises teams.</strong> The first production incident will not be "model quality" but
						retries, timeouts, rate limiting, version mismatches, or missing logs.
					</li>
				</ul>
			</div>
		</section>

		<!-- References -->
		<section class="space-y-6">
			<h2 class="section-heading">References</h2>
			<ol class="list-decimal pl-6 space-y-2 body-text">
				<li>
					OpenAI: <a class="underline" href="https://openai.com/index/introducing-gpt-oss/" target="_blank" rel="noreferrer">Introducing gpt-oss</a> (2025-08-05)
				</li>
				<li>
					OpenAI: <a class="underline" href="https://openai.com/index/gpt-oss-model-card/" target="_blank" rel="noreferrer">gpt-oss-120b &amp; gpt-oss-20b model card</a> (2025-08-05)
				</li>
				<li>
					GitHub: <a class="underline" href="https://github.com/openai/gpt-oss" target="_blank" rel="noreferrer">openai/gpt-oss</a> (Apache-2.0; local + Codex notes)
				</li>
				<li>
					OpenAI: <a class="underline" href="https://openai.com/index/introducing-gpt-oss-safeguard/" target="_blank" rel="noreferrer">Introducing gpt-oss-safeguard</a> (2025-10-29)
				</li>
				<li>
					OpenAI: <a class="underline" href="https://openai.com/index/gpt-oss-safeguard-technical-report/" target="_blank" rel="noreferrer">gpt-oss-safeguard technical report</a> (2025-10-29)
				</li>
				<li>
					Cloudflare: <a class="underline" href="https://blog.cloudflare.com/openai-gpt-oss-on-workers-ai/" target="_blank" rel="noreferrer">Partnering with OpenAI to bring gpt-oss onto Workers AI</a> (2025-08-05)
				</li>
				<li>
					Cloudflare docs: <a class="underline" href="https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/" target="_blank" rel="noreferrer">Workers AI model: gpt-oss-120b</a>
				</li>
				<li>
					OpenAI platform docs: <a class="underline" href="https://platform.openai.com/docs/guides/reasoning" target="_blank" rel="noreferrer">Reasoning guide (reasoning.effort)</a>
				</li>
			</ol>
		</section>
	</div>
</div>

<style>
	.paper-container {
		background: var(--color-performance-bg-pure);
		border-radius: 20px;
		box-shadow: var(--shadow-performance-scale-md);
		color: var(--color-performance-fg-primary);
	}

	.paper-header {
		border-bottom: 1px solid rgba(148, 163, 184, 0.2);
	}

	.paper-id {
		color: #93c5fd;
		font-size: 0.85rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.paper-title {
		font-size: clamp(2rem, 3.5vw, 3rem);
		line-height: 1.1;
		font-weight: 700;
		color: #f8fafc;
	}

	.paper-subtitle {
		color: #cbd5e1;
		font-size: 1.1rem;
		line-height: 1.55;
	}

	.paper-meta {
		color: #94a3b8;
		font-size: 0.95rem;
	}

	.abstract-section {
		border: 1px dashed rgba(148, 163, 184, 0.28);
		border-radius: 16px;
		padding: 1.25rem;
		background: rgba(15, 23, 42, 0.45);
	}

	.section-heading {
		font-size: clamp(1.5rem, 2.4vw, 1.85rem);
		margin-bottom: 0.75rem;
		color: #f8fafc;
	}

	.subsection-heading {
		font-size: 1.15rem;
		color: #bfdbfe;
	}

	.body-text {
		color: #d1d5db;
	}

	.metric-card {
		background: linear-gradient(180deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.85));
		border: 1px solid rgba(148, 163, 184, 0.25);
		border-radius: 14px;
	}

	.metric-card:hover {
		border-color: rgba(191, 219, 254, 0.5);
		transform: translateY(-2px);
	}

	.metric-value {
		font-size: 1rem;
		font-weight: 700;
		color: #93c5fd;
		margin-bottom: 0.45rem;
	}

	.metric-label {
		color: #e2e8f0;
		line-height: 1.5;
	}

	.quote-box {
		background: rgba(15, 23, 42, 0.75);
		border-left: 4px solid #38bdf8;
		border-radius: 12px;
	}

	.quote-text {
		color: #f1f5f9;
		font-size: 1.02rem;
		line-height: 1.75;
	}

	.quote-attribution {
		color: #93c5fd;
		font-size: 0.95rem;
	}

	.metric-table {
		border-collapse: collapse;
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		overflow: hidden;
	}

	.metric-table th {
		background: var(--color-performance-bg-subtle);
		padding: var(--space-performance-md);
		text-align: left;
		font-size: var(--text-performance-body-sm);
		font-weight: 600;
		color: var(--color-performance-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid var(--color-performance-border-emphasis);
	}

	.metric-table td {
		padding: var(--space-performance-md);
		color: var(--color-performance-fg-tertiary);
		vertical-align: top;
	}

	.metric-table tr:last-child td {
		border-bottom: none;
	}

	.metric-table code {
		font-family: 'Stack Sans', monospace;
		background: var(--color-performance-bg-subtle);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-performance-scale-sm);
		font-size: 0.9em;
	}

	.code-block {
		background: #020617;
		border-radius: 12px;
		border: 1px solid rgba(56, 189, 248, 0.25);
	}

	.code-primary {
		color: #e2e8f0;
		font-size: 0.95rem;
		line-height: 1.65;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
	}

	.code-primary {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
	}

	@media (max-width: 768px) {
		.paper-container {
			padding: 1rem;
			border-radius: 14px;
		}

		.metric-card {
			margin-bottom: 0.5rem;
		}

		.paper-title {
			font-size: 2rem;
		}
	}

	@media (max-width: 640px) {
		.metric-table th,
		.metric-table td {
			padding: 0.65rem 0.55rem;
		}
	}
</style>
