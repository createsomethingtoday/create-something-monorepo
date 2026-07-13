<script lang="ts">
	/**
	 * The Three-Tier Framework: Database, Rules, Policy
	 *
	 * A structural model for agent systems, realized through
	 * Model Context Protocol.
	 */
	import { SEO } from '@create-something/canon';
</script>

<SEO
	title="The Three-Tier Framework: Database, Rules, Policy"
	description="A structural model for agent systems, realized through Model Context Protocol. Three tiers map to MCP's primitives via control model distinctions."
	keywords="Three-Tier Framework, MCP, Model Context Protocol, Agent Systems, Database, Rules, Policy, Policy as Artifact"
	ogType="article"
	articleSection="Research"
	publishedTime="2026-02-05T00:00:00Z"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Papers', url: 'https://createsomething.io/papers' },
		{ name: 'Three-Tier Framework', url: 'https://createsomething.io/papers/three-tier-framework' }
	]}
/>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-001</div>
			<h1 class="mb-3 paper-title">The Three-Tier Framework</h1>
			<p class="max-w-3xl paper-subtitle">
				A structural model for agent systems, realized through Model Context Protocol
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Research</span>
				<span>·</span>
				<span>25 min read</span>
				<span>·</span>
				<span>Advanced</span>
			</div>
			<div class="flex gap-2 mt-3 paper-meta">
				<span>With contributions from Joey (Senior System Architect, Webflow)</span>
			</div>
		</div>

		<!-- I. Abstract -->
		<section class="space-y-6">
			<h2 class="section-heading">I. Abstract</h2>
			<div class="space-y-4 leading-relaxed body-text abstract-section pl-6">
				<p>
					This framework proposes a hierarchical ontology for understanding and building agent systems. It
					identifies three distinct tiers—<strong>Database</strong>, <strong>Automation</strong>, and
					<strong>Judgment</strong>—connected by typed Artifacts and spanning four cross-cutting concerns:
					Touchpoints, Artifacts, Orchestration, and Insight.
				</p>
				<p>
					The Model Context Protocol (MCP) encapsulates this structure naturally: its three primitives
					(Resources, Tools, Prompts) map directly to the three tiers. More precisely, MCP's
					<strong>control model distinctions</strong>—application-controlled, model-controlled,
					user-controlled—produce the tier separations. The <em>who decides</em> and the
					<em>what kind of work</em> converge.
				</p>
				<p>
					Critically, the framework is not a simple stack. MCP's <strong>sampling</strong> mechanism reveals
					a recursive property: Automation can request Judgment, creating a feedback loop. This mirrors
					embodied cognition—the body doesn't just execute commands; it participates in thinking by
					encountering the world and asking for judgment.
				</p>
				<p>
					The framework's most significant implication: <strong>policy itself is an artifact</strong>.
					System prompts, constraints, and behavioral rules flow through the same tiers as any other
					data—stored in Database, transformed by Automation, evaluated by Judgment. This enables versioned
					constraints, context-driven policy selection, and reflexive self-modification under human
					oversight.
				</p>
			</div>
		</section>

		<!-- II. The Framework -->
		<section class="space-y-6">
			<h2 class="section-heading">II. The Framework</h2>
			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The Three-Tier Framework organizes agent systems into three functional layers, each corresponding
					to a distinct type of work and a distinct locus of control. These tiers are not merely
					organizational—they capture causal dependency. You cannot have judgment without process, cannot
					have process without substrate.
				</p>
				<p>
					Four cross-cutting concerns span all three tiers: <strong>Touchpoints</strong> (where interaction
					happens), <strong>Artifacts</strong> (what flows between layers), <strong>Orchestration</strong>
					(how execution flows), and <strong>Insight</strong> (how the system perceives itself). These are
					not tiers—they don't do work the way tiers do—but they are essential to how the system operates.
				</p>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">Tier</th>
								<th class="table-cell">Question</th>
								<th class="table-cell">MCP Primitive</th>
								<th class="table-cell">Control Model</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell"><strong>Database</strong></td>
								<td class="table-cell">What exists?</td>
								<td class="table-cell">Resources</td>
								<td class="table-cell">Application-controlled</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><strong>Automation</strong></td>
								<td class="table-cell">What happens?</td>
								<td class="table-cell">Tools</td>
								<td class="table-cell">Model-controlled</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><strong>Judgment</strong></td>
								<td class="table-cell">What should happen?</td>
								<td class="table-cell">Prompts</td>
								<td class="table-cell">User-controlled</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- III. Definitions -->
		<section class="space-y-6">
			<h2 class="section-heading">III. Definitions</h2>

			<!-- Three Tiers as comparison cards -->
			<h3 class="subsection-heading">The Three Tiers</h3>

			<div class="grid md:grid-cols-3 gap-4 mt-6">
				<div class="p-4 comparison-success">
					<h4 class="mb-2 comparison-heading comparison-success-heading">Database Layer</h4>
					<ul class="space-y-1 comparison-list">
						<li>· <strong>What exists.</strong> The substrate of state, content, and record</li>
						<li>· Databases, applications, payment systems, websites, files, API endpoints</li>
						<li>· Control: Application-controlled</li>
						<li>· MCP: Resources primitive</li>
					</ul>
				</div>
				<div class="p-4 comparison-success">
					<h4 class="mb-2 comparison-heading comparison-success-heading">Automation Layer</h4>
					<ul class="space-y-1 comparison-list">
						<li>· <strong>What happens.</strong> The agentic layer where LLM-driven functions execute</li>
						<li>· Tools, skills, and the harness that constrains agent behavior</li>
						<li>· Control: Model-controlled</li>
						<li>· MCP: Tools primitive</li>
					</ul>
				</div>
				<div class="p-4 comparison-success">
					<h4 class="mb-2 comparison-heading comparison-success-heading">Judgment Layer</h4>
					<ul class="space-y-1 comparison-list">
						<li>
							· <strong>What should happen.</strong> The policy layer where constraints and human oversight
							determine quality
						</li>
						<li>· Constraints, weights, human oversight, policy definitions</li>
						<li>· Control: User-controlled</li>
						<li>· MCP: Prompts primitive</li>
					</ul>
				</div>
			</div>

			<div class="space-y-4 leading-relaxed body-text mt-6">
				<p>
					The Database layer contains everything that can be touched, queried, or persisted. The client
					application (not the model, not the user) decides when to fetch data and inject it into
					context—this is infrastructure-level decision-making.
				</p>
				<p>
					The Automation layer is specifically <em>model-controlled</em>—the LLM decides when to invoke
					tools during its reasoning process. The "harness" and "ethos" of an agent belong here—not as
					external observation, but as constitutive rules that define what the agent can and cannot do.
					This distinguishes agentic automation from procedural Orchestration.
				</p>
				<p>
					The Judgment layer is where decisions get made about correctness, relevance, and appropriate
					action. Human judgment and algorithmic evaluation occupy the same functional role: given this
					input, what is the right output? Policy defines the boundaries; the Insight concern makes the
					application of that policy legible.
				</p>
			</div>

			<!-- Four Cross-Cutting Concerns as info cards -->
			<h3 class="subsection-heading">Cross-Cutting Concerns</h3>

			<div class="grid md:grid-cols-2 gap-4 mt-4">
				<div class="p-4 info-card">
					<h4 class="mb-2 card-heading">Artifacts</h4>
					<p class="card-text">
						<strong>What flows between layers.</strong> Typed payloads that move through the system: RFI
						objects, submittal payloads, log summaries, decision records. Artifacts are the boundary
						contracts between tiers—they can be versioned, validated at transitions, and observed in
						flight.
					</p>
				</div>
				<div class="p-4 info-card">
					<h4 class="mb-2 card-heading">Touchpoints</h4>
					<p class="card-text">
						<strong>Where interaction happens.</strong> The MCP server surface that spans all tiers. Every
						URI, webhook endpoint, embedded interface, and API surface is a touchpoint. This is not a
						layer but a cross-cutting concern—the membrane through which external systems and humans
						interact with the framework.
					</p>
				</div>
				<div class="p-4 info-card">
					<h4 class="mb-2 card-heading">Orchestration</h4>
					<p class="card-text">
						<strong>How execution flows.</strong> The procedural coordination that connects tiers and
						sequences operations: workflows, triggers, cron jobs, webhook handlers. Orchestration is
						application-controlled (like Database) but distinct in function: Database stores,
						Orchestration sequences. This distinguishes procedural automation (deterministic, testable)
						from agentic automation (probabilistic, model-controlled).
					</p>
				</div>
				<div class="p-4 info-card">
					<h4 class="mb-2 card-heading">Insight</h4>
					<p class="card-text">
						<strong>How the system perceives itself.</strong> The perceptual membrane that makes execution
						legible: observability, human-in-the-loop approval, audit trails, confidence scores,
						reasoning traces. Insight is not a processing tier—it watches work being done. Without
						Insight, policy modification is blind mutation. With Insight, every policy selection is
						traced, every constraint change is logged.
					</p>
				</div>
			</div>
		</section>

		<!-- IV. MCP as Encapsulation -->
		<section class="space-y-6">
			<h2 class="section-heading">IV. MCP as Encapsulation</h2>
			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The Model Context Protocol defines three server primitives, each with a distinct
					<strong>control model</strong>—who decides when the primitive is used:
				</p>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">MCP Primitive</th>
								<th class="table-cell">Control Model</th>
								<th class="table-cell">Description</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell"><strong>Resources</strong></td>
								<td class="table-cell">Application-controlled</td>
								<td class="table-cell"
									>The client application decides when to fetch and inject data into context</td
								>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><strong>Tools</strong></td>
								<td class="table-cell">Model-controlled</td>
								<td class="table-cell"
									>The LLM decides when to invoke functions during reasoning</td
								>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><strong>Prompts</strong></td>
								<td class="table-cell">User-controlled</td>
								<td class="table-cell"
									>The human explicitly selects templates to guide interaction</td
								>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					MCP also defines <strong>Sampling</strong>—a mechanism that allows Tools to request LLM access
					back through the Client. This creates the feedback loop where Automation can invoke Judgment.
				</p>

				<h3 class="subsection-heading">Control Model Convergence</h3>
				<p>
					This control model distinction is the key. MCP's designers separated primitives by
					<em>who decides</em>. The framework separates tiers by <em>what kind of work</em> they do. They
					converge because the <strong>who</strong> and the <strong>what</strong> are correlated:
				</p>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">MCP Primitive</th>
								<th class="table-cell">Control Model</th>
								<th class="table-cell">Framework Tier</th>
								<th class="table-cell">Rationale</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell"><strong>Resources</strong></td>
								<td class="table-cell">Application-controlled</td>
								<td class="table-cell">Database</td>
								<td class="table-cell"
									>Data decisions are infrastructure concerns—what exists and when to surface it</td
								>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><strong>Tools</strong></td>
								<td class="table-cell">Model-controlled</td>
								<td class="table-cell">Automation</td>
								<td class="table-cell"
									>Action decisions are agent reasoning—what happens and when to execute</td
								>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><strong>Prompts</strong></td>
								<td class="table-cell">User-controlled</td>
								<td class="table-cell">Judgment</td>
								<td class="table-cell"
									>Policy and guidance decisions are human oversight—what should happen and why</td
								>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					The mapping is not accidental. When building on MCP, you are instantiating this framework
					directly:
				</p>
				<ul class="space-y-2 ml-6 list-disc body-text">
					<li>Workers exposing <strong>Resources</strong> → Database Layer (application-controlled data)</li>
					<li>Workers exposing <strong>Tools</strong> → Automation Layer (model-controlled actions)</li>
					<li>
						<strong>Prompts</strong> and skill definitions → Judgment Layer (user-controlled guidance)
					</li>
					<li>
						<strong>Sampling</strong> requests → Feedback loop (Automation requesting Judgment)
					</li>
					<li>MCP server endpoints → Touchpoints</li>
					<li>JSON schemas and structured outputs → Artifacts</li>
				</ul>
				<p>
					The framework is not an abstraction imposed on MCP—it is the structure that MCP's control model
					distinctions already assume.
				</p>
			</div>
		</section>

		<!-- V. The Control Model Hierarchy -->
		<section class="space-y-6">
			<h2 class="section-heading">V. The Control Model Hierarchy</h2>
			<div class="space-y-4 leading-relaxed body-text">
				<p>The control models form a hierarchy of decision-making authority:</p>

				<div class="grid md:grid-cols-3 gap-4 mt-6">
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">1. Users Set Boundaries</h4>
						<p class="card-text">
							Through prompt selection, users define the operating constraints. This is the Judgment
							layer: policy, ethics, acceptable outcomes.
						</p>
					</div>
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">2. Models Act Within Boundaries</h4>
						<p class="card-text">
							The agent reasons and selects tools, but only within the space the user has defined.
							This is the Automation layer: execution, skill invocation, agentic work.
						</p>
					</div>
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">3. Applications Provide Substrate</h4>
						<p class="card-text">
							The infrastructure makes data available (or not), independent of what the model wants.
							This is the Database layer: state, records, content that exists.
						</p>
					</div>
				</div>

				<h3 class="subsection-heading">Failure Modes</h3>
				<p>The hierarchy also explains failure modes:</p>

				<div class="grid md:grid-cols-3 gap-4 mt-4">
					<div class="p-4 comparison-warning">
						<h4 class="mb-2 comparison-heading comparison-warning-heading">Judgment Failures</h4>
						<ul class="space-y-1 comparison-list">
							<li>· Wrong prompt selected</li>
							<li>· Poor constraints</li>
							<li>· Misaligned ethos</li>
							<li>· Agent acts correctly but produces wrong outcomes</li>
						</ul>
					</div>
					<div class="p-4 comparison-warning">
						<h4 class="mb-2 comparison-heading comparison-warning-heading">Automation Failures</h4>
						<ul class="space-y-1 comparison-list">
							<li>· Tool errors</li>
							<li>· Skill bugs</li>
							<li>· Agent mistakes</li>
							<li>· Agent has right constraints but execution fails</li>
						</ul>
					</div>
					<div class="p-4 comparison-warning">
						<h4 class="mb-2 comparison-heading comparison-warning-heading">Database Failures</h4>
						<ul class="space-y-1 comparison-list">
							<li>· Missing data</li>
							<li>· Stale state</li>
							<li>· Unavailable resources</li>
							<li>· Agent can't act because substrate is broken</li>
						</ul>
					</div>
				</div>

				<div class="p-4 callout-info mt-6">
					<h3 class="mb-2 callout-heading">Debugging Heuristic</h3>
					<p class="body-text">
						Debugging follows the hierarchy: check <strong>Database</strong> first (is data there?), then
						<strong>Automation</strong> (did execution work?), then <strong>Judgment</strong> (was policy
						correct?). The causality flows upward—you cannot have judgment without process, cannot have
						process without substrate.
					</p>
				</div>
			</div>
		</section>

		<!-- VI. The Recursive Property: Sampling as Feedback Loop -->
		<section class="space-y-6">
			<h2 class="section-heading">VI. The Recursive Property: Sampling as Feedback Loop</h2>
			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The framework is not a simple stack. MCP's <strong>sampling</strong> mechanism reveals that the
					hierarchy is actually a cycle with directional flow.
				</p>

				<h3 class="subsection-heading">What Sampling Does</h3>
				<p>
					Sampling allows a Tool (MCP server) to request LLM access back through the Client. The tool
					says: "I need judgment to complete my work." The client proxies that request up to the LLM and
					returns the result.
				</p>

				<h3 class="subsection-heading">The Flow</h3>
				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">Step</th>
								<th class="table-cell">Actor</th>
								<th class="table-cell">Action</th>
								<th class="table-cell">Layer</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell">1</td>
								<td class="table-cell">User</td>
								<td class="table-cell">Selects prompts, constraints</td>
								<td class="table-cell">Judgment</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">2</td>
								<td class="table-cell">Agent</td>
								<td class="table-cell">Reasons and decides to call a tool</td>
								<td class="table-cell">Automation</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">3</td>
								<td class="table-cell">Tool</td>
								<td class="table-cell">Executes, but needs LLM judgment to complete</td>
								<td class="table-cell">Automation</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">4</td>
								<td class="table-cell">Tool</td>
								<td class="table-cell">Sends sampling request back to client</td>
								<td class="table-cell">Automation → Judgment</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">5</td>
								<td class="table-cell">Client</td>
								<td class="table-cell">Proxies request to LLM</td>
								<td class="table-cell">Judgment</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">6</td>
								<td class="table-cell">LLM</td>
								<td class="table-cell">Returns result to client</td>
								<td class="table-cell">Judgment</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">7</td>
								<td class="table-cell">Client</td>
								<td class="table-cell">Forwards result to tool</td>
								<td class="table-cell">Judgment → Automation</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">8</td>
								<td class="table-cell">Tool</td>
								<td class="table-cell">Completes and returns to agent</td>
								<td class="table-cell">Automation</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					The tool doesn't need its own LLM configuration—it piggybacks on the client's. This is why
					Samuel Colvin (Pydantic) calls it "extremely powerful": you can build MCP servers that perform
					agentic work without each server needing independent LLM access.
				</p>

				<h3 class="subsection-heading">Why This Matters Architecturally</h3>
				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 comparison-warning">
						<h4 class="mb-2 comparison-heading comparison-warning-heading">Without Sampling</h4>
						<ul class="space-y-1 comparison-list">
							<li>· Every tool needing judgment must configure its own LLM access</li>
							<li>· Each server manages its own API keys and rate limits</li>
							<li>· Each server bears its own inference costs</li>
							<li>· Context is duplicated that the main agent already has</li>
						</ul>
					</div>
					<div class="p-4 comparison-success">
						<h4 class="mb-2 comparison-heading comparison-success-heading">With Sampling</h4>
						<ul class="space-y-1 comparison-list">
							<li>· Tool delegates judgment back to the calling system</li>
							<li>· Client becomes a shared resource for reasoning</li>
							<li>· Centralized cost management</li>
							<li>· Context stays lean—specialized context lives in tools</li>
						</ul>
					</div>
				</div>

				<h3 class="subsection-heading">Embodied Cognition Parallel</h3>
				<p>This recursive property mirrors what phenomenologists observed about human cognition:</p>

				<section class="p-6 quote-box mt-4">
					<div class="text-center">
						<p class="italic quote-text">
							"Cognition isn't a separate layer commanding the body—it's enacted through embodied
							action. The body isn't just executing; it's informing cognition through its encounters
							with the world."
						</p>
						<p class="mt-2 quote-attribution">
							— Heidegger, <em>Being and Time</em> (1927); Merleau-Ponty,
							<em>Phenomenology of Perception</em> (1945)
						</p>
					</div>
				</section>

				<p>
					<strong>The parallel</strong>: In the three-tier framework, Automation (the body/tools) doesn't
					just execute commands from Judgment. Through sampling, Automation can request Judgment. The tool
					encounters something in the world (Database) and needs judgment to proceed—so it asks.
				</p>
				<p>
					This is why the intuition that "something is above Judgment" is both right and wrong:
				</p>
				<ul class="space-y-2 ml-6 list-disc body-text">
					<li>
						<strong>Wrong</strong> because there's no fourth layer
					</li>
					<li>
						<strong>Right</strong> because the system is recursive—Judgment sits "above" itself through
						the feedback loop
					</li>
				</ul>

				<h3 class="subsection-heading">Implications for Design</h3>
				<div class="space-y-4 mt-4">
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Context Window Management</h4>
						<p class="card-text">
							Colvin's example shows a research agent that calls a BigQuery tool. The tool has its own
							system prompt with SQL schema details. If that context lived in the main agent, it would
							bloat every request. By isolating it in the tool and using sampling, the main agent stays
							lean.
						</p>
					</div>
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Cost Distribution</h4>
						<p class="card-text">
							The main client bears LLM costs, but tools can contribute specialized context. This is
							more efficient than each tool paying for its own inference.
						</p>
					</div>
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Trust Boundaries</h4>
						<p class="card-text">
							The client controls what sampling requests it honors. A tool can ask for LLM access, but
							the client decides whether to grant it. This maintains the user-controlled property of
							Judgment while allowing Automation to participate.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- VII. Policy as Artifact -->
		<section class="space-y-6">
			<h2 class="section-heading">VII. Policy as Artifact</h2>
			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The framework's most significant implication: <strong>policy is not external to the system—it
					is an artifact that flows through the tiers.</strong>
				</p>

				<h3 class="subsection-heading">The Conventional View vs. The Artifact View</h3>
				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 comparison-warning">
						<h4 class="mb-2 comparison-heading comparison-warning-heading">Conventional View</h4>
						<ul class="space-y-1 comparison-list">
							<li>· Policy (system prompts, constraints) treated as fixed scaffolding</li>
							<li>· Written once, applied always</li>
							<li>· Policy sits outside the system</li>
							<li>· It constrains but does not participate</li>
							<li>· A "harness" is one implementation: fixed rules bounding agent behavior</li>
						</ul>
					</div>
					<div class="p-4 comparison-success">
						<h4 class="mb-2 comparison-heading comparison-success-heading">Artifact View</h4>
						<ul class="space-y-1 comparison-list">
							<li>· Policy is data flowing through tiers like any other artifact</li>
							<li>· Can be versioned, selected contextually, modified reflexively</li>
							<li>· Policy participates in the system</li>
							<li>· Stored in Database, transformed by Automation, evaluated by Judgment</li>
							<li>· Always under human oversight at the Judgment layer</li>
						</ul>
					</div>
				</div>

				<p>The tiers operate on policy just as they operate on any artifact:</p>
				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">Tier</th>
								<th class="table-cell">Policy Operation</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell"><strong>Database</strong></td>
								<td class="table-cell"
									>Stores policy versions (prompts, constraints, ethos as versioned data)</td
								>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><strong>Automation</strong></td>
								<td class="table-cell"
									>Transforms/requests policy (tool asks "give me the strict constraints" via
									sampling)</td
								>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><strong>Judgment</strong></td>
								<td class="table-cell"
									>Evaluates which policy to apply (selects constraints appropriate to context)</td
								>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="subsection-heading">What This Enables</h3>
				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Policy Versioning</h4>
						<p class="card-text">
							Multiple constraint sets coexist as stored artifacts. A financial compliance policy. A
							creative exploration policy. A debugging policy. Version-controlled, auditable,
							selectable at runtime.
						</p>
					</div>
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Context-Driven Selection</h4>
						<p class="card-text">
							A tool encountering sensitive data can request (via sampling) the appropriate policy.
							"I'm about to handle PII—give me the strict constraints." The client evaluates and
							returns the right policy for the moment.
						</p>
					</div>
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Graduated Trust</h4>
						<p class="card-text">
							Different operations invoke different constraint levels. Read operations get permissive
							policy. Write operations get restrictive policy. Delete operations require human approval
							policy. Policy isn't uniform—it's contextual.
						</p>
					</div>
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Self-Modification Through the Loop</h4>
						<p class="card-text">
							The system can observe its own policy, request modifications through sampling, and apply
							new constraints. This isn't unconstrained self-modification—the Judgment layer
							(user-controlled) still decides what modifications to honor.
						</p>
					</div>
				</div>

				<h3 class="subsection-heading">Multi-Agent Coordination</h3>
				<p>
					When multiple agents coordinate (via systems like Beads, Loom, or Agent Mail), they're not just
					passing task artifacts—they're passing policy artifacts.
				</p>
				<div class="p-4 info-card mt-4">
					<h4 class="mb-2 card-heading">Policy Propagation Example</h4>
					<p class="card-text">
						<strong>Agent A</strong> (financial analysis) → passes policy artifact: "PII handling
						required" → <strong>Agent B</strong> (data processing) → applies received constraints,
						processes under financial compliance policy → <strong>Agent C</strong> (reporting)
					</p>
				</div>
				<p>
					The coordination layer isn't a fourth tier above Judgment. It's artifact-passing at the Judgment
					level. Agents share:
				</p>
				<ul class="space-y-2 ml-6 list-disc body-text">
					<li><strong>Task artifacts</strong>: what to do</li>
					<li><strong>Context artifacts</strong>: what's known</li>
					<li><strong>Policy artifacts</strong>: how to behave</li>
				</ul>
				<p>
					This is why coordination systems like Beads (Yegge) work: they give agents shared memory that
					includes behavioral constraints, not just task state. Policy propagates through the agent graph
					as data.
				</p>

				<h3 class="subsection-heading">Insight as Self-Perception</h3>
				<p>
					If policy is an artifact the system can modify, the Insight concern becomes essential—not as an
					MCP primitive, but as the perceptual loop that makes self-modification legible.
				</p>
				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 comparison-warning">
						<h4 class="mb-2 comparison-heading comparison-warning-heading">Without Insight</h4>
						<ul class="space-y-1 comparison-list">
							<li>· Policy changes are blind mutations</li>
							<li>· No audit trail of constraint evolution</li>
							<li>· No ability to diagnose behavioral drift</li>
						</ul>
					</div>
					<div class="p-4 comparison-success">
						<h4 class="mb-2 comparison-heading comparison-success-heading">With Insight</h4>
						<ul class="space-y-1 comparison-list">
							<li>· Every policy selection is traced</li>
							<li>· Constraint changes are logged with context</li>
							<li>· The system perceives itself modifying itself</li>
						</ul>
					</div>
				</div>
				<p>
					This is the reflexive loop that embodied cognition predicts: the body (Automation) doesn't just
					act—it perceives its own acting. The system doesn't just apply constraints—it watches itself
					choosing constraints.
				</p>

				<h3 class="subsection-heading">Risks and Mitigations</h3>
				<p>
					Self-modifying policy introduces risk. A system that can request looser constraints might game
					itself into unsafe behavior. Mitigations:
				</p>
				<ol class="space-y-3 ml-6 list-decimal body-text mt-4">
					<li>
						<strong>User-controlled ceiling.</strong> The Judgment layer (Prompts) remains user-controlled.
						The system can request policy changes, but humans define what's requestable.
					</li>
					<li>
						<strong>Policy immutability tiers.</strong> Some constraints are mutable (formatting
						preferences), some are immutable (safety boundaries). Store them differently in Database.
					</li>
					<li>
						<strong>Insight as governance.</strong> Every policy modification is logged. Anomaly detection
						on constraint drift. The perceptual loop becomes the audit trail.
					</li>
				</ol>
				<p>
					The framework doesn't solve this risk—it names it and provides the vocabulary to reason about
					it.
				</p>
			</div>
		</section>

		<!-- VIII. Properties -->
		<section class="space-y-6">
			<h2 class="section-heading">VIII. Properties</h2>

			<div class="space-y-6">
				<div>
					<h3 class="subsection-heading">Causality</h3>
					<div class="space-y-4 leading-relaxed body-text">
						<p>
							The framework captures dependency: Database feeds Automation feeds Judgment. You cannot
							have judgment without process, cannot have process without substrate. This is not just
							organization—it's a debugging heuristic.
						</p>
						<p>When a system fails, ask:</p>
						<ol class="space-y-2 ml-6 list-decimal body-text">
							<li>Did the Database layer fail to provide data?</li>
							<li>Did Automation execute incorrectly?</li>
							<li>Did Judgment apply wrong policy?</li>
						</ol>
					</div>
				</div>

				<div>
					<h3 class="subsection-heading">Blurriness</h3>
					<div class="space-y-4 leading-relaxed body-text">
						<p>
							The boundaries between tiers are elastic, not rigid. An agent with tools and skills
							running in the background is already making judgments—the policy is embedded in how it
							decides which tool to call. The three tiers are a spectrum, with boundaries getting blurry
							as agents get more capable.
						</p>
						<p>
							This blurriness is a feature, not a bug. It reflects the reality that sophisticated
							automation contains embedded judgment, and that judgment requires automation to act. The
							sampling mechanism makes this explicit: a tool can request judgment, collapsing the
							boundary between Automation and Judgment for that moment.
						</p>
					</div>
				</div>

				<div>
					<h3 class="subsection-heading">Brittleness vs. Variety</h3>
					<div class="space-y-4 leading-relaxed body-text">
						<p>
							A deep, type-safe monorepo where all three tiers share a unified stack (e.g., Cloudflare
							Workers, TypeScript end-to-end) gives speed and correctness guarantees, but creates a
							single point of conceptual failure.
						</p>
						<p>
							A polyglot stack with more variety is more resilient (different failure modes don't
							cascade the same way) but introduces translation costs at every Artifact boundary.
						</p>
						<p>
							The framework does not prescribe which approach to take—it provides the vocabulary to
							reason about the tradeoff.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- IX. Implementation: Cloudflare-First Architecture -->
		<section class="space-y-6">
			<h2 class="section-heading">IX. Implementation: Cloudflare-First Architecture</h2>
			<div class="space-y-4 leading-relaxed body-text">
				<p>For a unified stack approach using Cloudflare:</p>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">Framework Element</th>
								<th class="table-cell">Cloudflare Service</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell"><strong>Database Layer</strong></td>
								<td class="table-cell">D1, KV, R2, Durable Objects</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><strong>Automation Layer</strong></td>
								<td class="table-cell">Workers, Workflows, Queues</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><strong>Judgment Layer</strong></td>
								<td class="table-cell">Workers AI, External LLM APIs</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><strong>Touchpoints</strong></td>
								<td class="table-cell">Worker endpoints, MCP servers</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><strong>Orchestration</strong></td>
								<td class="table-cell">Workers (procedural), Workflows</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><strong>Insight</strong></td>
								<td class="table-cell">Logpush, Analytics, custom tracing</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><strong>Artifacts</strong></td>
								<td class="table-cell">JSON schemas, structured outputs</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					This provides type-safety from Database through Judgment, with MCP servers as the Touchpoint
					surface. The Cloudflare stack exemplifies the "Brittleness" property: a unified platform gives
					speed and correctness guarantees at the cost of platform dependency.
				</p>
			</div>
		</section>

		<!-- X. Applications -->
		<section class="space-y-6">
			<h2 class="section-heading">X. Applications</h2>
			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Two concrete applications demonstrate how the framework applies to real systems:
				</p>

				<div class="grid md:grid-cols-2 gap-4 mt-6">
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">WORKWAY — Workflow Automation for Construction</h4>
						<p class="card-text">
							<strong>Database:</strong> Procore projects, RFIs, daily logs, submittals<br />
							<strong>Automation:</strong> AI skills (draft RFI, summarize logs, review submittals)<br />
							<strong>Judgment:</strong> Policy definitions, human approval gates, trust boundaries<br />
							<strong>Orchestration:</strong> Workflow triggers, webhook handlers, notification dispatchers<br />
							<strong>Insight:</strong> Execution traces, approval audit logs, confidence scores<br />
							<strong>Touchpoints:</strong> MCP server endpoints for Procore, Slack, email<br />
							<strong>Artifacts:</strong> RFI objects, summary reports, compliance flags
						</p>
					</div>
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">CREATE SOMETHING — Custom MCP Development</h4>
						<p class="card-text">
							<strong>Database:</strong> Client systems (Salesforce, HubSpot, internal tools)<br />
							<strong>Automation:</strong> Custom MCP servers connecting systems to agents<br />
							<strong>Judgment:</strong> Agent policy, skill constraints, trust boundaries<br />
							<strong>Orchestration:</strong> Connection flows, OAuth handlers, request routing<br />
							<strong>Insight:</strong> Agent observability, decision traces, HITL surfaces<br />
							<strong>Touchpoints:</strong> MCP server URIs, OAuth surfaces<br />
							<strong>Artifacts:</strong> Integration payloads, structured responses
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- XI. Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">XI. Conclusion</h2>
			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The three-tier framework—Database, Rules, Policy—provides a structural model for
					reasoning about agent systems. MCP encapsulates it naturally through its primitives (Resources,
					Tools, Prompts) and control model distinctions (application-controlled, model-controlled,
					user-controlled).
				</p>
				<p>
					Four cross-cutting concerns span the tiers: Touchpoints (interface surface), Artifacts
					(boundary contracts), Orchestration (procedural flow), and Insight (perceptual membrane). These
					are not tiers—they don't do work the way tiers do—but they are essential to how the system
					operates.
				</p>
				<p>
					The framework is not a simple hierarchy. MCP's sampling mechanism reveals the recursive
					property: Automation can request Judgment, closing the loop. The tool encounters the world and
					asks for judgment. This mirrors embodied cognition—the body doesn't just execute; it
					participates in thinking.
				</p>
				<p>
					The policy-as-artifact insight extends this further: the constraints that govern agent behavior
					are not external scaffolding but data flowing through the tiers. Policy can be versioned,
					selected contextually, and modified reflexively—always under human oversight at the Judgment
					layer. Multi-agent coordination becomes policy-passing: agents share not just tasks but
					behavioral constraints.
				</p>
				<p>
					Artifacts flow between tiers as typed boundary contracts. Touchpoints span all tiers as the
					interaction surface. Orchestration sequences procedural work. Insight makes the system legible
					to itself and to humans. Sampling allows lower tiers to reach back up when they need judgment.
					And policy itself participates in this flow.
				</p>
				<p>
					<strong
						>This is not an abstraction imposed on systems—it is the shape that MCP already assumes.
						The framework names it.</strong
					>
				</p>
			</div>
		</section>

		<!-- References -->
		<section class="space-y-6">
			<h2 class="section-heading">References</h2>
			<ol class="space-y-3 ml-6 list-decimal references-list">
				<li>
					Heidegger, M. <em>Being and Time</em>. Trans. Macquarrie & Robinson. New York: Harper & Row,
					1927.
				</li>
				<li>
					Merleau-Ponty, M. <em>Phenomenology of Perception</em>. Trans. Colin Smith. London: Routledge,
					1945.
				</li>
				<li>
					Anthropic. "Model Context Protocol Specification." 2024.
					<a href="https://modelcontextprotocol.io" class="text-link">modelcontextprotocol.io</a>
				</li>
				<li>
					Colvin, S. "MCP Sampling: How It Works and Why It Matters." 2025.
				</li>
				<li>
					Yegge, S. "Beads: Agent-Native Persistence for Cross-Session Memory." 2025.
				</li>
			</ol>
		</section>

		<!-- Footer -->
		<div class="pt-6 paper-footer">
			<p class="footer-text">
				Version 1.3 — February 2026. With contributions from Joey (Senior System Architect, Webflow).
				WORKWAY · CREATE SOMETHING · Half Dozen Solutions.
			</p>
			<div class="flex justify-between mt-4">
				<a href="/papers" class="footer-link">← All Papers</a>
				<a href="/papers/code-mode-hermeneutic-analysis" class="footer-link">Code Mode Analysis →</a>
			</div>
		</div>
	</div>
</div>

<style>
	/* Structure: Tailwind | Design: Canon */

	/* Container */
	.paper-container {
		background: var(--color-performance-bg-pure);
		color: var(--color-performance-fg-primary);
	}

	/* Header */

	.paper-id {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-body-sm);
	}

	.paper-title {
		font-size: var(--text-performance-h1);
	}

	.paper-subtitle {
		color: var(--color-performance-fg-secondary);
		font-size: var(--text-performance-body-lg);
	}

	.paper-meta {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
	}

	/* Abstract */
	.abstract-section {
		border-left: 4px solid var(--color-performance-border-emphasis);
	}

	/* Typography */
	.section-heading {
		font-size: var(--text-performance-h2);
	}

	.subsection-heading {
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-primary);
	}

	.body-text {
		color: var(--color-performance-fg-secondary);
	}

	/* Quote Box */
	.quote-box {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
	}

	.quote-text {
		color: var(--color-performance-fg-secondary);
		font-size: var(--text-performance-body-lg);
	}

	.quote-attribution {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
	}

	/* Blockquote */
	:global(.blockquote) {
		border-left: 4px solid var(--color-performance-border-emphasis);
		color: var(--color-performance-fg-tertiary);
	}

	/* Code Blocks */
	:global(.code-block) {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		font-size: var(--text-performance-body-sm);
	}

	:global(.code-block-success) {
		background: var(--color-performance-success-muted);
		border: 1px solid var(--color-performance-success-border);
		border-radius: var(--radius-performance-scale-lg);
		font-size: var(--text-performance-body-sm);
	}

	:global(.code-block-warning) {
		background: var(--color-performance-warning-muted);
		border: 1px solid var(--color-performance-warning-border);
		border-radius: var(--radius-performance-scale-lg);
		font-size: var(--text-performance-body-sm);
	}

	:global(.code-primary) {
		color: var(--color-performance-fg-primary);
	}

	:global(.code-secondary) {
		color: var(--color-performance-fg-secondary);
	}

	:global(.code-success) {
		color: var(--color-performance-success);
	}

	:global(.code-success-heading) {
		color: var(--color-performance-success);
	}

	:global(.code-warning-heading) {
		color: var(--color-performance-warning);
	}

	:global(.inline-code) {
		background: var(--color-performance-bg-surface);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-performance-scale-sm);
	}

	/* Comparison Cards */
	.comparison-success {
		background: var(--color-performance-success-muted);
		border: 1px solid var(--color-performance-success-border);
		border-radius: var(--radius-performance-scale-lg);
	}

	.comparison-warning {
		background: var(--color-performance-warning-muted);
		border: 1px solid var(--color-performance-warning-border);
		border-radius: var(--radius-performance-scale-lg);
	}

	.comparison-heading {
		font-size: var(--text-performance-body-lg);
	}

	.comparison-success-heading {
		color: var(--color-performance-success);
	}

	.comparison-warning-heading {
		color: var(--color-performance-warning);
	}

	.comparison-list {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
	}

	/* Info Cards */
	.info-card {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
	}

	.card-heading {
		font-weight: 600;
		color: var(--color-performance-fg-secondary);
	}

	.card-text {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
	}

	/* Callout */
	.callout-info {
		background: var(--color-performance-info-muted);
		border: 1px solid var(--color-performance-info-border);
		border-radius: var(--radius-performance-scale-lg);
	}

	.callout-heading {
		font-size: var(--text-performance-h3);
		color: var(--color-performance-info);
	}

	/* Table */
	.responsive-table-scroll {
		overflow-x: auto;
	}

	.table-header {
		border-bottom: 2px solid var(--color-performance-border-default);
	}


	.table-cell {
		padding: 0.75rem 1rem;
		text-align: left;
		font-size: var(--text-performance-body-sm);
	}

	/* References */
	.references-list {
		color: var(--color-performance-fg-tertiary);
	}
	.footer-text {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
	}

	.footer-link {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.footer-link:hover {
		color: var(--color-performance-fg-primary);
	}

	/* Links */
	.text-link {
		text-decoration: underline;
		color: var(--color-performance-fg-secondary);
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.text-link:hover {
		color: var(--color-performance-fg-primary);
	}
</style>
