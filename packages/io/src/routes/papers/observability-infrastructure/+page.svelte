<script lang="ts">
	/**
	 * Observability Infrastructure Paper
	 *
	 * Documents CREATE SOMETHING's three-layer observability architecture:
	 * Cloudflare Automatic Tracing → Langfuse LLM Tracing → Loom Agent Coordination.
	 * 
	 * Demonstrates how observability tools should recede into transparent use
	 * while providing comprehensive visibility into AI agent operations.
	 */
	import { SEO } from '@create-something/canon';
</script>

<SEO
	title="Observability Infrastructure: Making AI Operations Visible"
	description="A three-layer observability architecture for AI-native systems: infrastructure tracing, LLM generation tracking, and agent coordination—all unified through the AI Interaction Atlas vocabulary."
	keywords="observability, Langfuse, Cloudflare Workers, MCP, AI agents, tracing, Atlas, monitoring"
	ogType="article"
	articleSection="Infrastructure"
	publishedTime="2026-02-04T00:00:00Z"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Papers', url: 'https://createsomething.io/papers' },
		{ name: 'Observability Infrastructure', url: 'https://createsomething.io/papers/observability-infrastructure' }
	]}
/>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-002</div>
			<h1 class="mb-3 paper-title">Observability Infrastructure: Making AI Operations Visible</h1>
			<p class="max-w-3xl paper-subtitle">
				A three-layer observability architecture for AI-native systems: infrastructure tracing,
				LLM generation tracking, and agent coordination—unified through the AI Interaction Atlas vocabulary.
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Infrastructure</span>
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
				As AI agents become central to software development workflows, observability becomes critical.
				We present CREATE SOMETHING's three-layer observability architecture that provides comprehensive
				visibility into agent operations without impeding the work itself. The architecture combines
				<strong>Cloudflare Workers Automatic Tracing</strong> for infrastructure,
				<strong>Langfuse</strong> for LLM generation tracking, and <strong>Loom</strong> for agent
				coordination. All layers share a common vocabulary—the <strong>AI Interaction Atlas</strong>—enabling
				consistent analysis across touchpoints. The key insight: observability tools should exhibit
				<em>Zuhandenheit</em> (ready-to-hand)—providing visibility when needed while remaining invisible
				during normal operation. This paper documents the architecture, implementation, and the data
				captured at each layer.
			</p>
		</section>

		<!-- Architecture Overview -->
		<section class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="p-4 metric-card">
			<div class="metric-value">Layer 1</div>
			<div class="metric-label">Cloudflare Infrastructure</div>
			<p class="mt-2 metric-description">Workers, D1, KV, R2 operations</p>
		</div>
		<div class="p-4 metric-card">
			<div class="metric-value">Layer 2</div>
			<div class="metric-label">Langfuse LLM Tracing</div>
			<p class="mt-2 metric-description">Generations, tokens, costs</p>
		</div>
		<div class="p-4 metric-card">
			<div class="metric-value">Layer 3</div>
			<div class="metric-label">Loom Coordination</div>
			<p class="mt-2 metric-description">Sessions, issues, routing</p>
		</div>
		</section>

		<!-- The Problem -->
		<section class="space-y-6">
			<h2 class="section-heading">1. The Problem</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					AI agents operate across multiple systems: they read files, call APIs, query databases,
					invoke LLMs, and coordinate with other agents. Traditional observability—designed for
					request-response web applications—fails to capture the unique characteristics of agent
					operations:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li><strong>Long-running sessions:</strong> Agents may work for minutes or hours, not milliseconds</li>
					<li><strong>Multi-step workflows:</strong> A single task may involve dozens of LLM calls and tool invocations</li>
					<li><strong>Cost sensitivity:</strong> LLM tokens cost money; visibility into spend is critical</li>
					<li><strong>Non-determinism:</strong> The same input may produce different outputs; reproducibility requires capturing context</li>
					<li><strong>Human oversight:</strong> Some operations require approval; the observability system must track where humans intervened</li>
				</ul>

				<p>
					The hermeneutic question: <em>How do we make agent operations visible without making
					visibility itself the work?</em> The tool must recede. You should think about the task,
					not the tracing.
				</p>
			</div>
		</section>

		<!-- Philosophy -->
		<section class="space-y-6">
			<h2 class="section-heading">2. Philosophy: Zuhandenheit</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Heidegger distinguished between <em>Zuhandenheit</em> (ready-to-hand) and <em>Vorhandenheit</em>
					(present-at-hand). A hammer is ready-to-hand when you're hammering—you don't think about
					the hammer, you think about the nail. The hammer becomes present-at-hand when it breaks:
					suddenly you're aware of the tool itself.
				</p>

				<p>
					<strong>Observability should be ready-to-hand.</strong> During normal operation, you shouldn't
					think about tracing—you should think about the work. But when something breaks, or when you
					need to understand costs, or when you're debugging an agent failure—then the observability
					system should provide rich, structured data exactly where you need it.
				</p>

				<p>
					This philosophy drives several design decisions:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li><strong>Automatic instrumentation:</strong> Tracing happens without explicit code in hot paths</li>
					<li><strong>Sampling:</strong> Not every request needs tracing; 10% sampling captures patterns without overhead</li>
					<li><strong>Unified vocabulary:</strong> The same terms (Atlas dimensions) work across all layers</li>
					<li><strong>Dashboards over logs:</strong> Aggregated views show patterns; raw logs available when needed</li>
				</ul>
			</div>
		</section>

		<!-- Architecture -->
		<section class="space-y-6">
			<h2 class="section-heading">3. Architecture</h2>

			<div class="space-y-6 leading-relaxed body-text">
				<h3 class="subsection-heading">3.1 Layer 1: Cloudflare Automatic Tracing</h3>

				<p>
					Cloudflare Workers provide built-in tracing for infrastructure operations. When enabled,
					every Worker invocation captures:
				</p>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Operation</th>
								<th>Data Captured</th>
								<th>Use Case</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Fetch calls</td>
								<td>URL, method, status, latency</td>
								<td>External API dependencies</td>
							</tr>
							<tr>
								<td>D1 queries</td>
								<td>SQL, rows affected, duration</td>
								<td>Database performance</td>
							</tr>
							<tr>
								<td>KV operations</td>
								<td>Key, operation, size</td>
								<td>Cache behavior</td>
							</tr>
							<tr>
								<td>R2 access</td>
								<td>Bucket, object, bytes</td>
								<td>Storage patterns</td>
							</tr>
							<tr>
								<td>Durable Objects</td>
								<td>Class, method, duration</td>
								<td>Stateful coordination</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					Configuration is minimal—add to <code>wrangler.jsonc</code>:
				</p>

				<pre class="code-block"><code>{`"observability": {
  "enabled": true,
  "traces": {
    "enabled": true,
    "head_sampling_rate": 0.1
  }
}`}</code></pre>

				<h3 class="subsection-heading">3.2 Layer 2: Langfuse LLM Tracing</h3>

				<p>
					Langfuse provides purpose-built observability for LLM applications. It captures:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li><strong>Traces:</strong> Top-level operations (an MCP tool call, an agent session)</li>
					<li><strong>Spans:</strong> Sub-operations within a trace (a database query, a file read)</li>
					<li><strong>Generations:</strong> LLM API calls with full input/output and token counts</li>
					<li><strong>Scores:</strong> Quality metrics attached to traces (success, latency, user feedback)</li>
				</ul>

				<p>
					The <code>@create-something/observability</code> package wraps Langfuse with Atlas metadata:
				</p>

				<pre class="code-block"><code>{`import { createTrace, createGeneration } from '@create-something/observability';
import { mcpToolMetadata } from '@create-something/observability/atlas';

// Create trace with Atlas dimensions
const trace = createTrace({
  name: 'harness-mcp:get_priority',
  metadata: mcpToolMetadata('harness-mcp', 'get_priority', 'orchestrate')
});

// Track LLM generation
const gen = createGeneration(trace, {
  name: 'claude-completion',
  model: 'claude-sonnet-4-20250514',
  input: messages
});

// ... make LLM call ...

gen.end(response, { input: 150, output: 500 });`}</code></pre>

				<h3 class="subsection-heading">3.3 Layer 3: Loom Agent Coordination</h3>

				<p>
					Loom (<code>lm</code>) provides agent-native task management with built-in observability:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li><strong>Sessions:</strong> Agent work sessions with start/end times and cost tracking</li>
					<li><strong>Issues:</strong> Task state (pending, in-progress, completed, blocked)</li>
					<li><strong>Routing:</strong> Model selection decisions with confidence scores</li>
					<li><strong>Cost:</strong> Token usage and dollar amounts per session</li>
				</ul>

				<p>
					Loom stores data in SQLite (<code>.loom/loom.db</code>), enabling offline analysis and
					crash recovery. The data syncs with Langfuse for unified dashboards.
				</p>
			</div>
		</section>

		<!-- Atlas Vocabulary -->
		<section class="space-y-6">
			<h2 class="section-heading">4. The AI Interaction Atlas</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					All three layers share a common vocabulary: the <strong>AI Interaction Atlas</strong> from
					<a href="https://github.com/quietloudlab/ai-interaction-atlas" class="text-blue-400 hover:underline">quietloudlab</a>.
					The Atlas defines six dimensions for categorizing AI interactions:
				</p>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Dimension</th>
								<th>Description</th>
								<th>Examples</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td><strong>AI Tasks</strong></td>
								<td>What capabilities AI provides</td>
								<td><code>generate</code>, <code>classify</code>, <code>orchestrate</code></td>
							</tr>
							<tr>
								<td><strong>Human Tasks</strong></td>
								<td>What people do in the loop</td>
								<td><code>review</code>, <code>approve</code>, <code>edit</code></td>
							</tr>
							<tr>
								<td><strong>System Tasks</strong></td>
								<td>What infrastructure handles</td>
								<td><code>routing</code>, <code>logging</code>, <code>validation</code></td>
							</tr>
							<tr>
								<td><strong>Data Artifacts</strong></td>
								<td>What information flows</td>
								<td><code>prompt</code>, <code>completion</code>, <code>context</code></td>
							</tr>
							<tr>
								<td><strong>Constraints</strong></td>
								<td>What boundaries apply</td>
								<td><code>latency</code>, <code>cost</code>, <code>privacy</code></td>
							</tr>
							<tr>
								<td><strong>Touchpoints</strong></td>
								<td>Where interactions happen</td>
								<td><code>mcp_server</code>, <code>api</code>, <code>worker</code></td>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					By annotating all traces with Atlas metadata, we can query across layers. For example:
					"Show all operations where <code>ai_task.type = 'generate'</code> and
					<code>constraint.budget_usd > 1.00</code>."
				</p>
			</div>
		</section>

		<!-- What Gets Captured -->
		<section class="space-y-6">
			<h2 class="section-heading">5. What Data Gets Captured</h2>

			<div class="space-y-6 leading-relaxed body-text">
				<h3 class="subsection-heading">5.1 MCP Server Tool Calls</h3>

				<p>
					Every MCP tool invocation creates a trace with:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>Server name and tool name</li>
					<li>Input parameters (sanitized)</li>
					<li>Output/error response</li>
					<li>Duration and timestamp</li>
					<li>Atlas metadata (touchpoint, AI task type)</li>
				</ul>

				<h3 class="subsection-heading">5.2 LLM Generations</h3>

				<p>
					Each Claude API call captures:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>Model identifier (<code>claude-sonnet-4-20250514</code>)</li>
					<li>Input messages (or summary for privacy)</li>
					<li>Output completion</li>
					<li>Token usage: input, output, total</li>
					<li>Cost calculation</li>
					<li>Parent trace/span for correlation</li>
				</ul>

				<h3 class="subsection-heading">5.3 Agent Sessions</h3>

				<p>
					The agentic-executor tracks:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>Session ID and issue ID</li>
					<li>Budget allocation and consumption</li>
					<li>Iteration count and costs per iteration</li>
					<li>Files modified</li>
					<li>Status (running, paused, complete, error)</li>
					<li>Termination reason</li>
				</ul>

				<h3 class="subsection-heading">5.4 Infrastructure Operations</h3>

				<p>
					Cloudflare automatic tracing captures:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>Worker cold starts and execution time</li>
					<li>Subrequest chains (fetch → fetch → fetch)</li>
					<li>Database query plans and timing</li>
					<li>Cache hit/miss ratios</li>
					<li>Memory and CPU usage</li>
				</ul>
			</div>
		</section>

		<!-- Implementation -->
		<section class="space-y-6">
			<h2 class="section-heading">6. Implementation</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The observability stack is deployed across CREATE SOMETHING properties:
				</p>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Component</th>
								<th>Location</th>
								<th>Purpose</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td><code>@create-something/observability</code></td>
								<td><code>packages/observability/</code></td>
								<td>Shared Langfuse wrapper with Atlas types</td>
							</tr>
							<tr>
								<td>MCP instrumentation</td>
								<td><code>packages/*-mcp/</code></td>
								<td>Tool call tracing for all MCP servers</td>
							</tr>
							<tr>
								<td>Agentic executor</td>
								<td><code>packages/space/workers/agentic-executor/</code></td>
								<td>LLM generation tracing for agent sessions</td>
							</tr>
							<tr>
								<td>Observability dashboard</td>
								<td><code>packages/io/src/routes/admin/observability/</code></td>
								<td>Unified view of all metrics</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					<strong>Configuration:</strong>
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>Langfuse project: <code>CREATE SOMETHING</code> (US cloud region)</li>
					<li>Cloudflare tracing: 10% sampling rate</li>
					<li>Secrets managed via <code>wrangler pages secret</code></li>
				</ul>
			</div>
		</section>

		<!-- Viewing the Data -->
		<section class="space-y-6">
			<h2 class="section-heading">7. Viewing the Data</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					<strong>Langfuse Dashboard:</strong>
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>Traces by time: <a href="https://us.cloud.langfuse.com" class="text-blue-400 hover:underline">us.cloud.langfuse.com</a></li>
					<li>Cost by model: Token usage and spend breakdown</li>
					<li>Generation latency: P50, P90, P99 percentiles</li>
					<li>Scores: Success rates, user feedback</li>
				</ul>

				<p>
					<strong>Cloudflare Dashboard:</strong>
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>Workers → Analytics → Traces</li>
					<li>Flame graphs for request timing</li>
					<li>Subrequest waterfall charts</li>
					<li>Error rate trends</li>
				</ul>

				<p>
					<strong>Internal Dashboard:</strong>
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li><a href="https://createsomething.io/admin/observability" class="text-blue-400 hover:underline">createsomething.io/admin/observability</a></li>
					<li>Unified view aggregating all three layers</li>
					<li>Task summary with Atlas dimension breakdown</li>
					<li>Cost trends over time</li>
				</ul>
			</div>
		</section>

		<!-- Lessons Learned -->
		<section class="space-y-6">
			<h2 class="section-heading">8. Lessons Learned</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					<strong>1. Automatic > Manual</strong>
				</p>

				<p>
					Manual instrumentation creates friction. Developers skip it when rushed. Automatic
					tracing (Cloudflare) and wrapper functions (observability package) ensure coverage
					without cognitive overhead.
				</p>

				<p>
					<strong>2. Sampling Is Essential</strong>
				</p>

				<p>
					100% tracing creates data overload and performance overhead. 10% sampling captures
					patterns while keeping costs manageable. Increase sampling when debugging specific issues.
				</p>

				<p>
					<strong>3. Shared Vocabulary Enables Analysis</strong>
				</p>

				<p>
					The Atlas vocabulary lets us ask questions like "What's the cost of all <code>generate</code>
					tasks?" across MCP servers, Workers, and LLM calls. Without shared terminology, each
					layer is an island.
				</p>

				<p>
					<strong>4. Dashboards Over Logs</strong>
				</p>

				<p>
					Raw logs are necessary but insufficient. Aggregated dashboards show patterns—cost spikes,
					latency regressions, error clusters. Start with dashboards; drill into logs when needed.
				</p>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">9. Conclusion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					AI-native systems require observability designed for their unique characteristics:
					long-running sessions, multi-step workflows, cost sensitivity, and human oversight.
					The three-layer architecture—Cloudflare for infrastructure, Langfuse for LLM tracing,
					Loom for coordination—provides comprehensive visibility while adhering to the principle
					of <em>Zuhandenheit</em>: the tools recede into transparent use.
				</p>

				<p>
					The AI Interaction Atlas vocabulary unifies analysis across layers, enabling queries
					that span from database operations to LLM generations to human approvals. This is the
					foundation for understanding, optimizing, and debugging AI agent operations at scale.
				</p>

				<p>
					<strong>Status:</strong> ✅ Production deployed across all CREATE SOMETHING properties.
				</p>
			</div>
		</section>

		<!-- Related Research -->
		<section class="space-y-4">
			<h2 class="section-heading">Related Research</h2>

			<div class="space-y-2 body-text">
				<p>
					<a href="/papers/haiku-optimization" class="text-blue-400 hover:underline">Haiku Optimization</a>
					— Intelligent model routing with cost tracking
				</p>
				<p>
					<a href="https://github.com/quietloudlab/ai-interaction-atlas" class="text-blue-400 hover:underline">AI Interaction Atlas</a>
					— Shared vocabulary for AI interaction design
				</p>
				<p>
					<a href="https://langfuse.com/docs" class="text-blue-400 hover:underline">Langfuse Documentation</a>
					— Open-source LLM observability platform
				</p>
			</div>
		</section>
	</div>
</div>

<style>
	.paper-container {
		background: var(--color-performance-bg-pure);
		color: var(--color-performance-fg-primary);
	}


	.paper-id {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.paper-title {
		font-size: var(--text-performance-h1);
		font-weight: 700;
		line-height: 1.2;
	}

	.paper-subtitle {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-secondary);
		line-height: 1.6;
	}

	.paper-meta {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
	}

	.abstract-section {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-lg);
	}

	.section-heading {
		font-size: var(--text-performance-h2);
		font-weight: 700;
		margin-bottom: var(--space-performance-md);
	}

	.subsection-heading {
		font-size: var(--text-performance-h3);
		font-weight: 600;
		margin: var(--space-performance-lg) 0 var(--space-performance-md) 0;
		color: var(--color-performance-fg-secondary);
	}

	.body-text {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-tertiary);
		line-height: 1.7;
	}

	.body-text code {
		font-family: 'Stack Sans', monospace;
		background: var(--color-performance-bg-subtle);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-performance-scale-sm);
		font-size: 0.9em;
	}

	.body-text a {
		color: var(--color-performance-data-1);
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.body-text a:hover {
		color: var(--color-performance-fg-primary);
	}

	.metric-card {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.metric-card:hover {
		border-color: var(--color-performance-border-emphasis);
		transform: scale(var(--scale-performance-micro));
	}

	.metric-value {
		font-size: var(--text-performance-h2);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-xs);
	}

	.metric-label {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.metric-description {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
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
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-md);
		overflow-x: auto;
		font-family: 'Stack Sans', monospace;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		line-height: 1.5;
	}
</style>
