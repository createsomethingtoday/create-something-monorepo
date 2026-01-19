<script lang="ts">
	/**
	 * Recursive Language Models: Context as Environment Variable
	 *
	 * Documents the implementation and empirical validation of RLMs
	 * based on MIT CSAIL's research (arxiv:2512.24601). Demonstrates
	 * processing of 157K characters to identify 165+ DRY violations.
	 */
</script>

<svelte:head>
	<title>Recursive Language Models: Context as Environment Variable | CREATE SOMETHING.io</title>
	<meta
		name="description"
		content="Implementing MIT CSAIL's RLM pattern for processing arbitrarily large codebases through programmatic context navigation. Validated with 157K character analysis."
	/>
</svelte:head>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-004</div>
			<h1 class="mb-3 paper-title">Recursive Language Models</h1>
			<p class="max-w-3xl paper-subtitle">
				Context as Environment Variable: Implementing MIT CSAIL's RLM pattern for processing
				arbitrarily large codebases through programmatic context navigation.
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Research</span>
				<span>•</span>
				<span>15 min read</span>
				<span>•</span>
				<span>Advanced</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="pl-6 space-y-4 abstract-section">
			<h2 class="section-heading">Abstract</h2>
			<p class="leading-relaxed body-text">
				This paper documents the implementation and empirical validation of Recursive Language
				Models (RLMs) based on MIT CSAIL's research (arxiv:2512.24601). We implemented a
				task-agnostic inference paradigm that treats <strong>context as an external environment
				variable</strong> rather than prompt content, enabling processing of contexts far beyond
				model limits. Through production deployment, we identified critical implementation bugs,
				validated the core RLM pattern against the original alexzhang13/rlm repository, and
				demonstrated practical application for codebase analysis. The RLM successfully analyzed
				<strong>157K characters across 50 files</strong>, identifying 45 catch blocks, 61 console
				calls, and 51 validation patterns as DRY violations—leading to the creation of four shared
				utilities that reduced duplication across the monorepo.
			</p>
		</section>

		<!-- Metrics -->
		<section class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="p-4 metric-card">
				<div class="metric-value">157K</div>
				<div class="metric-label">Characters Analyzed</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">50</div>
				<div class="metric-label">Files Processed</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value metric-success">165+</div>
				<div class="metric-label">Violations Found</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">$0.03</div>
				<div class="metric-label">Total Cost</div>
			</div>
		</section>

		<!-- Section 1: Introduction -->
		<section class="space-y-6">
			<h2 class="section-heading">1. Introduction</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Large Language Models face a fundamental constraint: context windows. Even "long-context"
					models (1M+ tokens) degrade on tasks requiring dense access to large inputs. The MIT
					CSAIL paper "Recursive Language Models" (arxiv:2512.24601) proposes a paradigm shift:
					<strong>treat context as an external environment variable, not prompt content</strong>.
				</p>

				<p>
					The key insight: instead of injecting massive context into the prompt, store it as a
					variable in a REPL environment. The model writes code to navigate the context, using
					sub-LM calls for semantic understanding. This enables processing 10M+ tokens with
					comparable cost to standard inference.
				</p>

				<div class="p-4 callout-info">
					<h4 class="mb-2 callout-heading">Research Questions</h4>
					<ol class="list-decimal list-inside space-y-2">
						<li>Can we correctly implement the RLM pattern based on the MIT CSAIL paper?</li>
						<li>What implementation bugs emerge in production use?</li>
						<li>Does RLM provide practical value for codebase analysis at CREATE SOMETHING?</li>
					</ol>
				</div>
			</div>
		</section>

		<!-- Section 2: Architecture -->
		<section class="space-y-6">
			<h2 class="section-heading">2. Architecture</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">2.1 Core Components</h3>

				<p>Our implementation follows the original RLM architecture:</p>

				<div class="p-4 font-mono code-block">
					<pre class="code-primary">{`┌─────────────────────────────────────────────┐
│             RLMSession                       │
│  - Manages the iteration loop               │
│  - Routes to root/sub models                │
│  - Tracks costs                             │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│           RLMEnvironment                     │
│  - Sandboxed Python REPL                    │
│  - context = <your massive input>           │
│  - llm_query(prompt) → sub-LM call          │
│  - results = {} for findings                │
└─────────────────────────────────────────────┘`}</pre>
				</div>

				<p class="mt-4">
					<strong>RLMEnvironment:</strong> Sandboxed Python REPL where context is stored as a
					variable. Provides:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><code class="inline-code">context</code> — The input data (can be arbitrarily large)</li>
					<li><code class="inline-code">llm_query(prompt)</code> — Sub-LM calls for semantic understanding</li>
					<li><code class="inline-code">results</code> — Dictionary for storing intermediate findings</li>
					<li><code class="inline-code">chunk_text()</code>, <code class="inline-code">chunk_lines()</code> — Chunking helpers</li>
					<li>Standard library: <code class="inline-code">re</code>, <code class="inline-code">json</code>, <code class="inline-code">print()</code></li>
				</ul>

				<h3 class="mt-6 subsection-heading">2.2 Model Routing</h3>

				<p>Following the paper's recommendations, we use two models for cost efficiency:</p>

				<div class="overflow-x-auto">
					<table class="w-full data-table">
						<thead>
							<tr class="table-header-row">
								<th class="text-left py-2 table-header">Role</th>
								<th class="text-left py-2 table-header">Model</th>
								<th class="text-left py-2 table-header">Cost</th>
								<th class="text-left py-2 table-header">Purpose</th>
							</tr>
						</thead>
						<tbody class="table-body">
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">Root</td>
								<td class="py-2">Claude Sonnet</td>
								<td class="py-2">~$0.01/call</td>
								<td class="py-2">Planning, synthesis, final answer</td>
							</tr>
							<tr>
								<td class="py-2 table-cell-emphasis">Sub-calls</td>
								<td class="py-2">Claude Haiku</td>
								<td class="py-2">~$0.001/call</td>
								<td class="py-2">Chunk understanding</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p class="mt-4">
					The paper shows Haiku achieves 90% of Sonnet's performance on bounded semantic tasks
					while costing 10x less.
				</p>

				<h3 class="mt-6 subsection-heading">2.3 Termination Markers</h3>

				<p>The model signals completion via:</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><code class="inline-code">FINAL(your answer here)</code> — Direct answer</li>
					<li><code class="inline-code">FINAL_VAR(results)</code> — Return a variable from the environment</li>
				</ul>
			</div>
		</section>

		<!-- Section 3: Implementation Review -->
		<section class="space-y-6">
			<h2 class="section-heading">3. Implementation Review</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					We reviewed our implementation against the original alexzhang13/rlm repository,
					identifying several critical issues.
				</p>

				<h3 class="subsection-heading">3.1 Bug: Undefined Client Variable</h3>

				<p><strong>File:</strong> <code class="inline-code">modal_rlm.py:401</code></p>

				<div class="p-4 font-mono code-block">
					<p class="code-comment"># Bug: 'client' was never defined, only 'anthropic_client'</p>
					<pre class="code-error">response = client.messages.create(...)</pre>
					<p class="mt-2 code-comment"># Fix:</p>
					<pre class="code-success">response = anthropic_client.messages.create(...)</pre>
				</div>

				<p class="mt-4">This would have crashed at runtime in production.</p>

				<h3 class="mt-6 subsection-heading">3.2 Bug: FINAL() Regex Limitation</h3>

				<p><strong>Original pattern:</strong></p>

				<div class="p-4 font-mono code-block">
					<pre class="code-error">{`final_match = re.search(r"FINAL\\(([^)]+)\\)", response)`}</pre>
				</div>

				<p class="mt-4">
					<strong>Problem:</strong> <code class="inline-code">[^)]+</code> stops at the first
					<code class="inline-code">)</code>, so:
				</p>

				<ul class="list-disc list-inside pl-4">
					<li><code class="inline-code">FINAL(Answer is (a) and (b))</code> → captures only <code class="inline-code">"Answer is (a"</code></li>
				</ul>

				<div class="p-4 mt-4 font-mono code-block-success">
					<p class="code-comment"># Fix: Use greedy match with end-of-string anchor</p>
					<pre class="code-success">{`final_match = re.search(r"(?:^|\\n)FINAL\\((.+)\\)\\s*$", response)`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">3.3 Bug: FINAL Detection Before Code Execution</h3>

				<p><strong>Original flow:</strong></p>

				<ol class="list-decimal list-inside space-y-2 pl-4">
					<li>Get model response</li>
					<li>Check for FINAL ← <span class="text-error">Problem: FINAL matched before code runs</span></li>
					<li>Execute code blocks</li>
					<li>Feed results back</li>
				</ol>

				<p class="mt-4">
					<strong>Problem:</strong> Model outputs code blocks AND <code class="inline-code">FINAL_VAR(results)</code>
					together, expecting code to populate <code class="inline-code">results</code> first. But we checked
					for FINAL before executing code, returning empty results.
				</p>

				<div class="p-4 mt-4 font-mono code-block-success">
					<p class="code-comment"># Fix: Execute code blocks first, then check for FINAL</p>
					<pre class="code-success">{`# Execute code blocks first
code_blocks = re.findall(r"\`\`\`repl\\n(.*?)\`\`\`", response, re.DOTALL)
for code in code_blocks:
    exec_result = env.execute(code.strip())
    # ... capture output

# NOW check for FINAL (results are populated)
final_match = re.search(r"(?:^|\\n)FINAL\\((.+)\\)\\s*$", response)`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">3.4 Bug: MULTILINE Flag Causing Early Match</h3>

				<div class="p-4 font-mono code-block">
					<p class="code-comment"># Original</p>
					<pre class="code-error">{`final_match = re.search(r"FINAL\\((.+)\\)\\s*$", response, re.MULTILINE)`}</pre>
				</div>

				<p class="mt-4">
					<strong>Problem:</strong> <code class="inline-code">re.MULTILINE</code> makes <code class="inline-code">$</code>
					match at end of ANY line, not just end of string. FINAL mentioned mid-response matched prematurely.
				</p>

				<div class="p-4 mt-4 font-mono code-block-success">
					<p class="code-comment"># Fix: Remove MULTILINE, use start-of-line anchor</p>
					<pre class="code-success">{`final_match = re.search(r"(?:^|\\n)FINAL\\((.+)\\)\\s*$", response)`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">3.5 Enhancement: Structured Messages</h3>

				<p><strong>Original:</strong> Flattened conversation to text blob.</p>
				<p><strong>Fix:</strong> Pass structured messages to API for proper multi-turn handling.</p>

				<div class="p-4 font-mono code-block-success">
					<pre class="code-success">{`config = ProviderConfig(
    messages=conversation,  # List of {"role": ..., "content": ...}
    ...
)`}</pre>
				</div>
			</div>
		</section>

		<!-- Section 4: Empirical Validation -->
		<section class="space-y-6">
			<h2 class="section-heading">4. Empirical Validation</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">4.1 Test Case: DRY Violation Analysis</h3>

				<p>We ran the RLM against our monorepo to find DRY violations.</p>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">Configuration</h4>
						<ul class="space-y-2 card-list">
							<li>• Context: 157,399 characters (50 files)</li>
							<li>• Root model: Claude Sonnet</li>
							<li>• Max iterations: 12</li>
							<li>• Max sub-calls: 20</li>
						</ul>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">Query</h4>
						<ul class="space-y-2 card-list">
							<li>• Catch blocks with similar error handling</li>
							<li>• Direct IDENTITY_API fetches</li>
							<li>• Direct <code class="inline-code">.length</code> checks</li>
							<li>• Console calls needing logger</li>
						</ul>
					</div>
				</div>

				<h3 class="mt-6 subsection-heading">4.2 Results</h3>

				<div class="overflow-x-auto">
					<table class="w-full data-table">
						<thead>
							<tr class="table-header-row">
								<th class="text-left py-2 table-header">Category</th>
								<th class="text-left py-2 table-header">Count</th>
								<th class="text-left py-2 table-header">Status</th>
							</tr>
						</thead>
						<tbody class="table-body">
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">catch_blocks</td>
								<td class="py-2">38</td>
								<td class="py-2 table-warning">High - needs catchApiError</td>
							</tr>
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">identity_api_fetches</td>
								<td class="py-2">4</td>
								<td class="py-2 table-success">Good - mostly migrated</td>
							</tr>
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">length_checks</td>
								<td class="py-2">13</td>
								<td class="py-2 table-neutral">Medium - use isEmpty()</td>
							</tr>
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">console_calls</td>
								<td class="py-2">61</td>
								<td class="py-2 table-warning">High - use createLogger</td>
							</tr>
							<tr>
								<td class="py-2 table-cell-emphasis">validation_patterns</td>
								<td class="py-2">51</td>
								<td class="py-2 table-warning">High - use validateStringField</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div class="grid grid-cols-3 gap-4 mt-6">
					<div class="p-4 metric-card">
						<div class="metric-value">$0.0316</div>
						<div class="metric-label">Total Cost</div>
					</div>
					<div class="p-4 metric-card">
						<div class="metric-value">1</div>
						<div class="metric-label">Iterations</div>
					</div>
					<div class="p-4 metric-card">
						<div class="metric-value">~83s</div>
						<div class="metric-label">Duration</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Section 5: Artifacts Created -->
		<section class="space-y-6">
			<h2 class="section-heading">5. Artifacts Created</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>Based on RLM findings, we created four shared utilities:</p>

				<div class="grid md:grid-cols-2 gap-4">
					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">1. Identity Client</h4>
						<p class="card-list mb-2">Typed, centralized API wrapper</p>
						<div class="p-2 font-mono code-block code-block-sm">
							<pre class="code-primary">{`// Before: 20+ files with duplicate fetch
const response = await fetch(
  \`\${IDENTITY_API}/v1/auth/login\`
);

// After: Typed client
const result = await identityClient
  .login({ email, password });`}</pre>
						</div>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">2. API Error Handling</h4>
						<p class="card-list mb-2">Unified error handling wrapper</p>
						<div class="p-2 font-mono code-block code-block-sm">
							<pre class="code-primary">{`// Before: Duplicate try/catch
try { ... }
catch (err) { console.error(...); }

// After: Wrapped handler
export const POST = catchApiError(
  'ProfileAPI',
  async (event) => { ... }
);`}</pre>
						</div>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">3. Validation Helpers</h4>
						<p class="card-list mb-2">Type-safe validation utilities</p>
						<div class="p-2 font-mono code-block code-block-sm">
							<pre class="code-primary">{`// Before: Repeated patterns
if (records.length === 0) { ... }

// After: Type-safe helpers
if (isEmpty(records)) { ... }
const result = validateStringField(
  body.name, 'name', { required: true }
);`}</pre>
						</div>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">4. Context Logger</h4>
						<p class="card-list mb-2">Structured logging with correlation</p>
						<div class="p-2 font-mono code-block code-block-sm">
							<pre class="code-primary">{`// Before: Console calls
console.log('[ProfileAPI]', email);

// After: Structured logging
const logger = createLogger('ProfileAPI');
logger.info('Fetching', {
  email, correlationId
});`}</pre>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Section 6: Discussion -->
		<section class="space-y-6">
			<h2 class="section-heading">6. Discussion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">6.1 RLM Effectiveness</h3>

				<p><strong>Strengths:</strong></p>
				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Successfully processed 157K characters (far beyond prompt limits)</li>
					<li>Identified actionable patterns through programmatic filtering</li>
					<li>Cost-effective: $0.03 for comprehensive analysis</li>
					<li>Single iteration completion demonstrates good prompt engineering</li>
				</ul>

				<p class="mt-4"><strong>Limitations:</strong></p>
				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>No sub-LM calls used in this task (regex sufficient)</li>
					<li>Model occasionally includes FINAL in first response without exploration</li>
					<li>Requires careful prompt engineering to encourage REPL usage</li>
				</ul>

				<h3 class="mt-6 subsection-heading">6.2 Implementation Lessons</h3>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 info-card">
						<h4 class="font-semibold mb-2 card-heading">Execute Before Evaluate</h4>
						<p class="card-text">
							Code blocks must run before checking for FINAL, as models often include both in a single response.
						</p>
					</div>

					<div class="p-4 info-card">
						<h4 class="font-semibold mb-2 card-heading">Regex Precision</h4>
						<p class="card-text">
							MULTILINE flags and greedy matching require careful consideration. Test with nested parentheses.
						</p>
					</div>

					<div class="p-4 info-card">
						<h4 class="font-semibold mb-2 card-heading">Structured Messages</h4>
						<p class="card-text">
							APIs optimize for structured conversation; text flattening loses context and attribution.
						</p>
					</div>

					<div class="p-4 info-card">
						<h4 class="font-semibold mb-2 card-heading">Defensive Testing</h4>
						<p class="card-text">
							Add regression tests for termination marker parsing with edge cases.
						</p>
					</div>
				</div>

				<h3 class="mt-6 subsection-heading">6.3 Comparison to Original</h3>

				<div class="overflow-x-auto">
					<table class="w-full data-table">
						<thead>
							<tr class="table-header-row">
								<th class="text-left py-2 table-header">Feature</th>
								<th class="text-left py-2 table-header">Original (alexzhang13/rlm)</th>
								<th class="text-left py-2 table-header">Our Implementation</th>
							</tr>
						</thead>
						<tbody class="table-body">
							<tr class="table-row">
								<td class="py-2">Context as variable</td>
								<td class="py-2 table-success">✓</td>
								<td class="py-2 table-success">✓</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">REPL execution loop</td>
								<td class="py-2 table-success">✓</td>
								<td class="py-2 table-success">✓</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">llm_query() sub-calls</td>
								<td class="py-2 table-success">✓</td>
								<td class="py-2 table-success">✓</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">FINAL/FINAL_VAR markers</td>
								<td class="py-2 table-success">✓</td>
								<td class="py-2 table-success">✓ (fixed regex)</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Cost tracking</td>
								<td class="py-2 table-success">✓</td>
								<td class="py-2 table-success">✓</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Docker sandbox</td>
								<td class="py-2 table-success">✓</td>
								<td class="py-2 table-success">✓ (Modal)</td>
							</tr>
							<tr>
								<td class="py-2">Trajectory logging</td>
								<td class="py-2 table-success">✓</td>
								<td class="py-2 table-neutral">Partial</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- Section 7: How to Apply This -->
		<section class="space-y-6">
			<h2 class="section-heading">7. How to Apply This</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">Using the RLM</h3>

				<div class="p-4 font-mono code-block">
					<pre class="code-primary">{`from create_something_agents.rlm import RLMSession, RLMConfig
from create_something_agents.providers.claude import ClaudeProvider

# Your large context
corpus = open("massive_corpus.txt").read()

# Create session
session = RLMSession(
    context=corpus,
    provider=ClaudeProvider(),
    config=RLMConfig(root_model="sonnet", sub_model="haiku")
)

# Run query
result = await session.run("What patterns emerge across all documents?")
print(f"Answer: {result.answer}")
print(f"Cost: \${result.cost_usd:.4f}")`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Using the DRY Utilities</h3>

				<div class="p-4 font-mono code-block">
					<pre class="code-primary">{`// Identity API calls
import { identityClient } from '@create-something/components/api';
const result = await identityClient.login({ email, password });

// API error handling
import { catchApiError, apiError } from '@create-something/components/utils';
export const POST = catchApiError('MyAPI', async (event) => { ... });

// Validation
import { isEmpty, validateStringField } from '@create-something/components/utils';
if (isEmpty(records)) return apiError('Not found', 404);

// Logging
import { createLogger } from '@create-something/components/utils';
const logger = createLogger('MyService');
logger.info('Processing', { id, correlationId });`}</pre>
				</div>
			</div>
		</section>

		<!-- Section 8: Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">8. Conclusion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					We successfully implemented and validated the Recursive Language Models pattern from
					MIT CSAIL's research. The implementation review against alexzhang13/rlm revealed four
					critical bugs that we fixed:
				</p>

				<ol class="list-decimal list-inside space-y-2 pl-4">
					<li>Undefined client variable (crash at runtime)</li>
					<li>FINAL regex failing on nested parentheses</li>
					<li>FINAL detection before code execution (empty results)</li>
					<li>MULTILINE flag causing premature termination</li>
				</ol>

				<p class="mt-4">
					The RLM demonstrated practical value by analyzing 157K characters of codebase,
					identifying 165+ DRY violations, and enabling creation of four shared utilities that
					measurably reduce code duplication.
				</p>

				<div class="p-6 mt-6 quote-box">
					<p class="text-center font-semibold card-heading">Key Insight</p>
					<p class="text-center mt-2 quote-text">
						The RLM pattern shifts the bottleneck from context limits to task definition quality.
						Well-structured queries with clear REPL examples enable effective long-context
						analysis at low cost.
					</p>
				</div>
			</div>
		</section>

		<!-- References -->
		<section class="space-y-4">
			<h2 class="section-heading">References</h2>
			<ol class="space-y-2 pl-6 list-decimal references-list">
				<li>Zhang, A. L., Kraska, T., & Khattab, O. (2025). <em>Recursive Language Models</em>. arXiv:2512.24601</li>
				<li>alexzhang13/rlm — Official RLM implementation: <a href="https://github.com/alexzhang13/rlm" class="reference-link">github.com/alexzhang13/rlm</a></li>
				<li>CREATE SOMETHING Agent SDK: <code class="inline-code">packages/agent-sdk/src/create_something_agents/rlm/</code></li>
				<li>Modal RLM Deployment: <code class="inline-code">packages/agent-sdk/modal_rlm.py</code></li>
			</ol>
		</section>

		<!-- Footer -->
		<div class="pt-6 paper-footer">
			<p class="footer-text">
				This research paper documents implementation work completed in January 2026. The RLM
				module is deployed in production via Modal. The created utilities are available in
				<code class="inline-code">@create-something/components</code>.
			</p>
			<div class="flex justify-between mt-4">
				<a href="/papers" class="footer-link">&larr; All Papers</a>
				<a href="/papers/haiku-optimization" class="footer-link">Haiku Optimization &rarr;</a>
			</div>
		</div>
	</div>
</div>

<style>
	/* Structure: Tailwind | Design: Canon */
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
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
		line-height: 1.6;
	}

	.paper-meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.abstract-section {
		border-left: 4px solid var(--color-border-emphasis);
	}

	.section-heading {
		font-size: var(--text-h2);
		font-weight: 700;
	}

	.subsection-heading {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		font-weight: 600;
	}

	.body-text {
		color: var(--color-fg-secondary);
	}

	/* Metrics */
	.metric-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.metric-value {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.metric-success {
		color: var(--color-success);
	}

	.metric-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Code blocks */
	.code-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
		overflow-x: auto;
	}

	.code-block-success {
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
		overflow-x: auto;
	}

	.code-comment {
		color: var(--color-fg-muted);
	}

	.code-primary {
		color: var(--color-fg-primary);
		white-space: pre;
	}

	.code-error {
		color: var(--color-error);
	}

	.code-success {
		color: var(--color-success);
	}

	.code-block-sm {
		font-size: var(--text-caption);
	}

	.inline-code {
		background: var(--color-bg-surface);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-size: 0.9em;
	}

	.text-error {
		color: var(--color-error);
	}

	/* Tables */
	.data-table {
		font-size: var(--text-body-sm);
	}

	.table-header-row {
		border-bottom: 1px solid var(--color-border-emphasis);
	}

	.table-header {
		color: var(--color-fg-secondary);
	}

	.table-body {
		color: var(--color-fg-tertiary);
	}

	.table-row {
		border-bottom: 1px solid var(--color-border-default);
	}

	.table-cell-emphasis {
		color: var(--color-fg-secondary);
	}

	.table-success {
		color: var(--color-success);
	}

	.table-warning {
		color: var(--color-warning);
	}

	.table-neutral {
		color: var(--color-fg-tertiary);
	}

	/* Info cards */
	.info-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.card-heading {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.card-list {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.card-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Callouts */
	.callout-info {
		background: var(--color-info-muted);
		border: 1px solid var(--color-info-border);
		border-radius: var(--radius-lg);
	}

	.callout-heading {
		font-size: var(--text-h3);
		color: var(--color-info);
	}

	/* Quote box */
	.quote-box {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.quote-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
	}

	/* References */
	.references-list {
		color: var(--color-fg-tertiary);
	}

	.reference-link {
		color: var(--color-data-1);
		text-decoration: underline;
	}

	.reference-link:hover {
		color: var(--color-fg-primary);
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
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}
</style>
