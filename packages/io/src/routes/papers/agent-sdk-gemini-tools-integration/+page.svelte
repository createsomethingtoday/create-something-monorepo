<script lang="ts">
	/**
	 * Agent SDK Gemini Tools Integration
	 *
	 * Technical paper documenting the integration of bash and file_read tools
	 * into the Agent SDK's Gemini provider. Covers implementation, safety controls,
	 * agentic loop patterns, and the impact on research paper quality.
	 */
</script>

<svelte:head>
	<title>Agent SDK Gemini Tools Integration | CREATE SOMETHING.io</title>
	<meta name="description" content="Documenting the integration of bash and file_read tools within the Agent SDK's Gemini provider, focusing on implementation, safety, and agentic loop patterns." />
</svelte:head>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-001</div>
			<h1 class="mb-3 paper-title">Agent SDK Gemini Tools Integration</h1>
			<p class="max-w-3xl paper-subtitle">
				Documenting the integration of bash and file_read tools within the Agent SDK's Gemini provider,
				focusing on implementation, safety, and agentic loop patterns.
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Technical Paper</span>
				<span>•</span>
				<span>15 min read</span>
				<span>•</span>
				<span>Advanced</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="abstract-section space-y-4">
			<h2 class="section-heading">Abstract</h2>
			<p class="body-text leading-relaxed">
				LLMs generate plausible but often inaccurate content when they can't access the actual codebase.
				This paper documents the integration of <code>bash</code> and <code>file_read</code> tools into
				the Agent SDK's Gemini provider. We cover: how the tools work, the allowlist-based safety controls,
				and the agentic loop that enables iterative tool use. The result: papers that reference real file
				paths, actual line numbers, and verifiable code. Tradeoff: higher token usage. For technical
				documentation, the precision is worth the cost.
			</p>
		</section>

		<!-- Section I -->
		<section class="space-y-6">
			<h2 class="section-heading">I. Introduction: The Unseen Codebase</h2>

			<div class="callout-box">
				<p class="callout-text">
					"How can an AI agent generate research papers that are not only coherent but also factually grounded in a dynamic codebase?"
				</p>
			</div>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					LLMs hallucinate. Without access to your actual code, they generate plausible but unverifiable
					content. They'll describe a feature in general terms but miss the exact file paths, function
					names, or configuration values that define the current implementation. For CREATE SOMETHING's
					technical papers, this is a problem: generic advice isn't useful; we need papers grounded in real code.
				</p>
				<p>
					This paper documents <code>GeminiToolsProvider</code>, an Agent SDK extension that gives Gemini
					controlled access to the monorepo via <code>bash</code> and <code>file_read</code> tools. The
					model can search code with grep, read specific files, and use what it finds in its output.
					The result: papers that cite actual line numbers and file paths.
				</p>
			</div>
		</section>

		<!-- Section II -->
		<section class="space-y-6">
			<h2 class="section-heading">II. Problem & Context: Bridging the Epistemic Gap</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The core problem addressed by the <code>GeminiToolsProvider</code> is the inherent limitation
					of LLMs when tasked with generating content that requires up-to-the-minute, specific details
					from a codebase. Without direct access, an LLM's knowledge is confined to its training data,
					which quickly becomes outdated in a fast-paced development environment.
				</p>
				<p>
					The <code>packages/agent-sdk/experiments/test-gemini-tools.py</code> (line 5) explicitly states
					the expected outcome: "Baseline (no tools) - generic content" versus "Tools (bash, file_read) -
					codebase-grounded content." This highlights the need for tools to move beyond generic descriptions
					to verifiable facts.
				</p>
			</div>

			<!-- Comparison cards -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
				<div class="p-6 comparison-card comparison-card-success">
					<h3 class="subsection-heading mb-4">With Tools: Grounded Research</h3>
					<ul class="list-disc pl-6 space-y-2 body-text">
						<li>Real file paths and line numbers</li>
						<li>Actual metrics from the codebase</li>
						<li>Specific code examples</li>
						<li>Grounded philosophical claims</li>
					</ul>
					<p class="body-text mt-4 text-muted">Source: test-gemini-tools.py:8-11</p>
				</div>
				<div class="p-6 comparison-card comparison-card-warning">
					<h3 class="subsection-heading mb-4">Without Tools: Generic Content</h3>
					<ul class="list-disc pl-6 space-y-2 body-text">
						<li>Vague references and assumptions</li>
						<li>Estimated or absent metrics</li>
						<li>Abstract code patterns</li>
						<li>Theoretical or unverified claims</li>
					</ul>
					<p class="body-text mt-4 text-muted">Source: test-gemini-tools.py:5</p>
				</div>
			</div>

			<div class="space-y-4 leading-relaxed body-text mt-8">
				<h3 class="subsection-heading">What We Did</h3>
				<ul class="list-disc pl-6 space-y-2">
					<li>Identified the core limitation of LLMs in accessing dynamic codebase information.</li>
					<li>Prioritized the development of a tool-augmented provider for Gemini within the Agent SDK.</li>
					<li>Defined clear objectives for "codebase-grounded content" to guide implementation.</li>
				</ul>
				<p>
					The outcome: <code>GeminiToolsProvider</code> with bash and file_read tools. Papers become
					verifiable against the actual codebase.
				</p>
			</div>
		</section>

		<!-- Section III -->
		<section class="space-y-6">
			<h2 class="section-heading">III. Methodology: The GeminiToolsProvider Architecture</h2>

			<div class="callout-box">
				<p class="callout-text">
					"How do we give Gemini shell and file access without breaking the monorepo?"
				</p>
			</div>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The <code>GeminiToolsProvider</code> is implemented in
					<code>packages/agent-sdk/src/create_something_agents/providers/gemini_tools.py</code>
					and serves as a specialized <code>AgentProvider</code> that extends Gemini's capabilities
					with custom tool definitions. Unlike a generic Gemini provider, this implementation directly
					injects <code>bash</code> and <code>file_read</code> as callable functions, allowing the
					model to interact with the monorepo.
				</p>
				<p>
					The provider's <code>_build_tools</code> method (lines 100-109) constructs
					<code>FunctionDeclaration</code> objects for both tools, making them available to the
					Gemini model for function calling. This allows the LLM to dynamically decide when and
					how to use these tools based on the task at hand.
				</p>

				<h3 class="subsection-heading">Tool Schema Definitions</h3>

				<div class="code-block">
					<pre><code># From gemini_tools.py (Lines 14-26)
BASH_TOOL_SCHEMA = {'{'}
    "name": "bash",
    "description": "Execute a bash command in the monorepo. Use for searching code (grep), listing files, or running simple commands. Do NOT use for destructive operations.",
    "parameters": {'{'}
        "type": "object",
        "properties": {'{'}
            "command": {'{'}
                "type": "string",
                "description": "The bash command to execute."
            {'}'}
        {'}'},
        "required": ["command"]
    {'}'}
{'}'}

# Lines 28-45
FILE_READ_TOOL_SCHEMA = {'{'}
    "name": "file_read",
    "description": "Read the contents of a file. Use to examine source code, configuration files, or documentation.",
    "parameters": {'{'}
        "type": "object",
        "properties": {'{'}
            "path": {'{'}
                "type": "string",
                "description": "Path to the file relative to monorepo root."
            {'}'},
            "start_line": {'{'} "type": "integer" {'}'},
            "end_line": {'{'} "type": "integer" {'}'}
        {'}'},
        "required": ["path"]
    {'}'}
{'}'}</code></pre>
				</div>

				<h3 class="subsection-heading">What We Did</h3>
				<ul class="list-disc pl-6 space-y-2">
					<li>Defined explicit <code>BASH_TOOL_SCHEMA</code> and <code>FILE_READ_TOOL_SCHEMA</code> for Gemini's function calling interface.</li>
					<li>Implemented <code>_execute_bash</code> and <code>_execute_file_read</code> methods within the provider.</li>
					<li>Integrated these tools into the Gemini client via <code>FunctionDeclaration</code> objects.</li>
				</ul>
				<p>
					The tools are integrated into Gemini's reasoning process—the model decides when to search
					and when to read files. The outcome: a provider that generates papers with real file paths
					and line numbers.
				</p>
			</div>
		</section>

		<!-- Section IV -->
		<section class="space-y-6">
			<h2 class="section-heading">IV. Safety Controls: Guarding the Monorepo</h2>

			<div class="callout-box">
				<p class="callout-text">
					"How are potentially destructive operations mitigated when granting an AI agent shell access?"
				</p>
			</div>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Shell access creates security risks. Unrestricted <code>bash</code> commands could delete files,
					modify config, or execute arbitrary code. The <code>GeminiToolsProvider</code> mitigates this
					with an allowlist for bash commands and path validation for file reads.
				</p>
				<p>
					The <code>_is_command_safe</code> method (lines 99-111) is central to <code>bash</code> safety.
					It checks if a command starts with an allowed prefix from <code>ALLOWED_BASH_PREFIXES</code>
					and ensures it does not contain any <code>BLOCKED_PATTERNS</code>. This dual-layer approach
					prevents destructive commands while permitting safe inspection.
				</p>
			</div>

			<div class="overflow-x-auto mt-8">
				<table class="w-full metric-table">
					<thead>
						<tr>
							<th>Safety Mechanism</th>
							<th>Description</th>
							<th>Example</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Bash Allowlist</td>
							<td>Only commands starting with specific prefixes are allowed.</td>
							<td><code>grep</code>, <code>find</code>, <code>ls</code>, <code>cat</code></td>
						</tr>
						<tr>
							<td>Bash Blocklist</td>
							<td>Commands containing destructive patterns are forbidden.</td>
							<td><code>rm</code>, <code>mv</code>, <code>sudo</code>, <code>></code></td>
						</tr>
						<tr>
							<td>Path Validation</td>
							<td>Ensures file paths do not escape the working directory.</td>
							<td>Resolved path must start with monorepo root</td>
						</tr>
						<tr>
							<td>Output Truncation</td>
							<td>Limits output size to prevent context overflow.</td>
							<td>Bash: 10,000 chars; File: 15,000 chars</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="space-y-4 leading-relaxed body-text mt-8">
				<h3 class="subsection-heading">What We Did</h3>
				<ul class="list-disc pl-6 space-y-2">
					<li>Defined <code>ALLOWED_BASH_PREFIXES</code> to restrict shell access to safe, read-only operations.</li>
					<li>Established <code>BLOCKED_PATTERNS</code> to forbid common destructive shell commands.</li>
					<li>Implemented path resolution and validation in <code>_execute_file_read</code> to prevent directory traversal.</li>
					<li>Introduced output truncation for both tools to manage context window usage.</li>
				</ul>
				<p>
					The outcome: the agent can search and read, but can't delete, write, or execute arbitrary commands.
				</p>
			</div>
		</section>

		<!-- Section V -->
		<section class="space-y-6">
			<h2 class="section-heading">V. The Agentic Loop: Iterative Grounding</h2>

			<div class="callout-box">
				<p class="callout-text">
					"How does the agent leverage these tools to iteratively refine its understanding and generate high-quality output?"
				</p>
			</div>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					<code>GeminiToolsProvider</code> implements an agentic loop—a multi-turn pattern where the
					model calls tools, gets results, and uses those results to call more tools. Instead of a
					single prompt/response, the agent iterates: search for a pattern, read a promising file,
					search within that file, synthesize findings.
				</p>
				<p>
					The <code>execute</code> method (lines 190-280) orchestrates this loop. It sends the initial
					task to Gemini, and if the model decides to call a <code>bash</code> or <code>file_read</code>
					tool, the provider intercepts this call, executes the tool, and then feeds the result back
					into the conversation history. This cycle continues for a maximum of <code>max_tool_calls</code>
					(default 20) iterations.
				</p>

				<ol class="list-decimal pl-6 space-y-2">
					<li>Initial <code>bash</code> search (e.g., <code>grep -r "pattern" packages/</code>).</li>
					<li><code>file_read</code> on promising files found in step 1.</li>
					<li>Further <code>grep</code> or <code>cat</code> commands based on file content.</li>
					<li>Synthesizing findings into the final paper.</li>
				</ol>

				<div class="quote-box mt-8">
					<p class="quote-text">
						"Tools recede into transparent use—the hammer disappears when hammering."
					</p>
					<p class="quote-attribution">— CLAUDE.md:171</p>
				</div>

				<h3 class="subsection-heading">What We Did</h3>
				<ul class="list-disc pl-6 space-y-2">
					<li>Implemented a multi-turn <code>execute</code> loop to facilitate iterative tool use and reasoning.</li>
					<li>Configured <code>max_tool_calls</code> to prevent infinite loops and manage execution time.</li>
					<li>Enabled Gemini's <code>thinking_config</code> with a <code>thinking_budget</code> (default 8192) to support complex reasoning.</li>
				</ul>
				<p>
					The outcome: papers cite real file paths and line numbers. The agent found them by searching.
				</p>
			</div>
		</section>

		<!-- Section VI -->
		<section class="space-y-6">
			<h2 class="section-heading">VI. Cost & Quality Tradeoffs</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					With tools, papers include "Real file paths instead of generic references," "Actual metrics
					from the codebase," "Specific code examples," and "Grounded philosophical claims." The
					difference: generic vs. specific, theoretical vs. verifiable.
				</p>
				<p>
					However, this enhanced capability comes with a tradeoff: increased operational cost. Each tool
					call, along with the model's "thinking" process, consumes tokens. The <code>GeminiToolsProvider</code>
					tracks <code>total_input_tokens</code>, <code>total_output_tokens</code>, and
					<code>total_thinking_tokens</code> (lines 196-198) to provide a clear cost breakdown. While
					a baseline model might generate a paper in a single, less expensive turn, a tool-augmented
					agent might engage in multiple tool calls and reasoning steps. For high-fidelity research
					papers, this cost is justified by the improvement in verifiability and accuracy.
				</p>
			</div>
		</section>

		<!-- Section VII -->
		<section class="space-y-6">
			<h2 class="section-heading">VII. Limitations & Future Directions</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">What Doesn't Work Yet</h3>
				<p>
					The bash allowlist restricts complex scenarios—you can grep but not run arbitrary analysis
					scripts. Output truncation (10,000 chars for bash, 15,000 for file_read) loses data on
					large files or broad searches.
				</p>

				<h3 class="subsection-heading">Future Work</h3>
				<p>
					Dynamic tool approval for edge cases, integration with ripgrep for context-aware search,
					and patterns for multi-repository access.
				</p>
			</div>
		</section>

		<!-- References -->
		<section class="space-y-4">
			<h2 class="section-heading">References</h2>

			<div class="space-y-2 body-text">
				<p><code>packages/agent-sdk/src/create_something_agents/providers/gemini_tools.py</code> — GeminiToolsProvider implementation</p>
				<p><code>packages/agent-sdk/experiments/test-gemini-tools.py</code> — Test script and quality validation</p>
				<p><code>CLAUDE.md</code> — CREATE SOMETHING development philosophy</p>
			</div>
		</section>

		<!-- Footer -->
		<footer class="pt-8 border-t border-default">
			<div class="flex justify-between items-center paper-meta">
				<a href="/papers" class="hover:underline">← All Papers</a>
				<span>CREATE SOMETHING Research • 2026</span>
				<a href="/papers/beads-cross-session-memory" class="hover:underline">Beads Memory Patterns →</a>
			</div>
		</footer>
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

	.text-muted {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.callout-box {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.callout-text {
		font-style: italic;
		color: var(--color-fg-tertiary);
		margin: 0;
	}

	.comparison-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.comparison-card .subsection-heading {
		margin-top: 0;
	}

	.comparison-card-success {
		border-left: 4px solid var(--color-success);
	}

	.comparison-card-warning {
		border-left: 4px solid var(--color-warning);
	}

	.code-block {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		overflow-x: auto;
		margin: var(--space-md) 0;
	}

	.code-block pre {
		margin: 0;
	}

	.code-block code {
		font-family: 'Stack Sans', monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.quote-box {
		border-left: 4px solid var(--color-fg-muted);
		padding-left: var(--space-md);
		margin: var(--space-md) 0;
	}

	.quote-text {
		font-style: italic;
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-xs);
	}

	.quote-attribution {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
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

	.border-default {
		border-color: var(--color-border-default);
	}
</style>
