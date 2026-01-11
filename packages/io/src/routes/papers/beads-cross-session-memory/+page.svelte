<script lang="ts">
	/**
	 * Beads Cross-Session Memory Patterns
	 *
	 * Research paper documenting how Beads stores issues in .beads/issues.jsonl,
	 * a Git-committed file that persists AI context across sessions.
	 * Work survives restarts, context limits, even crashes.
	 */
</script>

<svelte:head>
	<title>Beads Cross-Session Memory Patterns | CREATE SOMETHING.io</title>
	<meta name="description" content="How Beads stores issues in Git-committed files to persist AI context across sessions. Work survives restarts, context limits, even crashes." />
</svelte:head>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-001</div>
			<h1 class="mb-3 paper-title">Beads Cross-Session Memory Patterns</h1>
			<p class="max-w-3xl paper-subtitle">
				How Beads stores issues in Git-committed files to persist AI context across sessions.
				Work survives restarts, context limits, even crashes.
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Research</span>
				<span>•</span>
				<span>12 min read</span>
				<span>•</span>
				<span>Intermediate</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="abstract-section space-y-4">
			<h2 class="section-heading">Abstract</h2>
			<p class="body-text leading-relaxed">
				AI development sessions are stateless: when a session ends, context disappears. Developers
				re-explain problems, re-provide code snippets, re-describe what they already tried. Beads
				solves this by storing issues in <code>.beads/issues.jsonl</code>, a Git-committed file
				that persists across sessions. This paper documents how Beads works, its integration with
				development workflows, and what it enables for multi-session AI work.
			</p>
		</section>

		<!-- Section I -->
		<section class="space-y-6">
			<h2 class="section-heading">I. Introduction: Why Cross-Session Memory Matters</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					AI agents forget everything when a session ends. Each new conversation starts blank—developers
					re-explain problems, re-provide context, re-iterate findings. This wastes time and limits
					AI to simple, single-session tasks.
				</p>
				<p>
					Human developers carry context naturally: yesterday's debugging session informs today's fix.
					AI needs the same capability. Beads provides it by storing issues in <code>.beads/issues.jsonl</code>,
					a Git-committed file that any session can read. Work survives restarts, context limits, even crashes.
				</p>
			</div>
		</section>

		<!-- Section II -->
		<section class="space-y-6">
			<h2 class="section-heading">II. The Problem: What Happens When Sessions End</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					AI sessions end. Browser tabs close. Context windows fill. Servers timeout. When they do,
					everything disappears: partial solutions, debugging progress, the thread of investigation
					you were following.
				</p>
				<p>This creates concrete problems:</p>
				<ul class="list-disc pl-6 space-y-2">
					<li><strong>Repetitive Context Setting:</strong> Developers must repeatedly provide the same background information, code snippets, or problem descriptions to the AI.</li>
					<li><strong>Fragmented Problem Solving:</strong> Complex issues that require multiple steps or days to resolve become unmanageable, as the AI cannot track progress or remember previous attempts.</li>
					<li><strong>Reduced Efficiency:</strong> Time is wasted on re-establishing context rather than advancing the task, leading to slower development cycles.</li>
					<li><strong>Lack of Cumulative Learning:</strong> The AI cannot build upon past interactions or learn from previous mistakes within the scope of a larger project.</li>
				</ul>
			</div>

			<!-- Comparison cards -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
				<div class="p-6 comparison-card">
					<h3 class="subsection-heading mb-4">Before Beads: Stateless AI Sessions</h3>
					<p class="body-text mb-4">
						AI operates in isolated, short-lived sessions. Context is lost upon session termination,
						leading to repetitive explanations and fragmented work.
					</p>
					<ul class="list-disc pl-6 space-y-2 body-text">
						<li>Ephemeral memory</li>
						<li>High cognitive load for user</li>
						<li>Limited to simple, single-session tasks</li>
						<li>No long-term project understanding</li>
					</ul>
				</div>
				<div class="p-6 comparison-card">
					<h3 class="subsection-heading mb-4">With Beads: Persistent AI Context</h3>
					<p class="body-text mb-4">
						AI maintains context across sessions, remembering ongoing issues and progress.
						This enables continuous, cumulative problem-solving.
					</p>
					<ul class="list-disc pl-6 space-y-2 body-text">
						<li>Persistent, versioned memory</li>
						<li>Reduced user overhead</li>
						<li>Capable of complex, multi-session tasks</li>
						<li>Builds project-specific intelligence</li>
					</ul>
				</div>
			</div>
		</section>

		<!-- Section III -->
		<section class="space-y-6">
			<h2 class="section-heading">III. The Solution: How Beads Works</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Beads stores issues in a local directory (<code>.beads/</code>) using a single file:
					<code>issues.jsonl</code>. Each line is a JSON object representing one issue. This file
					is the source of truth for what AI is tracking.
				</p>
				<p>The file is Git-committed alongside your code. This gives you:</p>
				<ul class="list-disc pl-6 space-y-2">
					<li><strong>Version Control:</strong> Every change to an issue, every new piece of context, is tracked and auditable through Git history.</li>
					<li><strong>Collaboration:</strong> Teams can share AI context and progress by simply pushing and pulling the <code>.beads</code> directory.</li>
					<li><strong>Durability:</strong> The AI's memory is as persistent as the codebase itself, surviving system reboots, environment changes, and developer handovers.</li>
				</ul>

				<h3 class="subsection-heading">The Beads Workflow</h3>
				<p>
					The interaction with Beads follows a clear, command-line driven workflow, enabling developers
					to manage AI's memory explicitly:
				</p>

				<div class="code-block">
					<pre><code># 1. Initiate a new issue or task
bd create "Implement user authentication via OAuth2"

# This creates a new entry in .beads/issues.jsonl
# The AI can now be prompted with context related to this issue.</code></pre>
				</div>

				<div class="code-block">
					<pre><code># 2. Update an existing issue with new information or progress
bd update &lt;issue_id&gt; "Discovered a dependency conflict with 'passport-oauth2'. Investigating alternatives."

# The AI processes this update, adding it to the issue's history and context.
# This can be done across multiple sessions.</code></pre>
				</div>

				<div class="code-block">
					<pre><code># 3. Close an issue once it's resolved
bd close &lt;issue_id&gt; "OAuth2 authentication successfully implemented and tested."

# Marks the issue as complete, but retains its history for future reference.</code></pre>
				</div>

				<div class="code-block">
					<pre><code># 4. Synchronize the AI's memory with the team via Git
bd sync

# This command typically stages and commits changes to .beads/issues.jsonl
# and pushes them to the remote repository, making AI context shareable.</code></pre>
				</div>

				<h3 class="subsection-heading">issues.jsonl Structure</h3>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Field</th>
								<th>Description</th>
								<th>Example Value</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td><code>id</code></td>
								<td>Unique identifier for the issue.</td>
								<td><code>auth-001</code></td>
							</tr>
							<tr>
								<td><code>status</code></td>
								<td>Current state of the issue (open, closed, pending).</td>
								<td><code>open</code></td>
							</tr>
							<tr>
								<td><code>title</code></td>
								<td>Brief description of the issue.</td>
								<td><code>Implement user authentication</code></td>
							</tr>
							<tr>
								<td><code>history</code></td>
								<td>Array of chronological updates/notes.</td>
								<td><code>[{`{"timestamp": "...", "content": "..."}`}]</code></td>
							</tr>
							<tr>
								<td><code>context_files</code></td>
								<td>Relevant files for AI to consider.</td>
								<td><code>["src/auth.js", "package.json"]</code></td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- Section IV -->
		<section class="space-y-6">
			<h2 class="section-heading">IV. Integration Patterns</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Beads enables two patterns: context that survives sessions, and work extraction during sessions.
				</p>

				<h3 class="subsection-heading">A. Context Survival Across Sessions</h3>
				<p>
					When a developer resumes work, AI loads open issues from <code>issues.jsonl</code>. It knows
					what it was working on, what problems exist, and what was already tried. This enables:
				</p>
				<ul class="list-disc pl-6 space-y-2">
					<li><strong>Session handoffs:</strong> AI picks up where it left off, even after days.</li>
					<li><strong>Project-specific knowledge:</strong> AI accumulates understanding of your codebase over time.</li>
					<li><strong>Less re-explaining:</strong> Developers stop repeating context; AI already knows.</li>
				</ul>

				<h3 class="subsection-heading">B. Work Extraction and Granular Tracking</h3>
				<p>
					AI doesn't just track what you tell it—it discovers work while processing code. It identifies
					sub-tasks, potential improvements, or refactoring needs. These become new entries in
					<code>issues.jsonl</code>, building a dynamic backlog.
				</p>
				<p>This enables:</p>
				<ul class="list-disc pl-6 space-y-2">
					<li><strong>Automated Issue Identification:</strong> AI can flag code smells, security vulnerabilities, or performance bottlenecks as new issues.</li>
					<li><strong>Dependency Mapping:</strong> Tracking how issues relate to specific files or modules.</li>
					<li><strong>Progress Monitoring:</strong> Updating issue statuses as code changes resolve them.</li>
				</ul>
			</div>

			<!-- Comparison cards -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
				<div class="p-6 comparison-card">
					<h3 class="subsection-heading mb-4">Fragmented AI Workflow</h3>
					<p class="body-text mb-4">
						Each AI interaction is a discrete event. No shared memory or understanding of the
						project's evolving state.
					</p>
					<ul class="list-disc pl-6 space-y-2 body-text">
						<li>AI acts as a "stateless oracle"</li>
						<li>Context provided ad-hoc</li>
						<li>Difficult to track complex tasks</li>
						<li>No collective intelligence</li>
					</ul>
				</div>
				<div class="p-6 comparison-card">
					<h3 class="subsection-heading mb-4">Cohesive Beads Workflow</h3>
					<p class="body-text mb-4">
						AI's memory is integrated into the project's version control. It understands ongoing
						work and contributes proactively.
					</p>
					<ul class="list-disc pl-6 space-y-2 body-text">
						<li>AI acts as a "persistent collaborator"</li>
						<li>Context is always available</li>
						<li>Enables multi-stage problem solving</li>
						<li>Builds project-specific knowledge base</li>
					</ul>
				</div>
			</div>
		</section>

		<!-- Section V -->
		<section class="space-y-6">
			<h2 class="section-heading">V. Results: What Works and What Doesn't</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">What Works</h3>
				<ul class="list-disc pl-6 space-y-2">
					<li><strong>No more re-explaining:</strong> Developers stop repeating context. AI reads <code>issues.jsonl</code> and knows what's happening.</li>
					<li><strong>Multi-session tasks become possible:</strong> Problems that span days or weeks can be tracked continuously.</li>
					<li><strong>Project-specific knowledge accumulates:</strong> The file becomes a record of what was tried, what worked, what failed.</li>
					<li><strong>Team sharing via Git:</strong> Push <code>.beads/</code> to share AI context across developers.</li>
					<li><strong>Audit trail:</strong> Every decision is version-controlled.</li>
				</ul>

				<h3 class="subsection-heading">What Doesn't Work Yet</h3>
				<ul class="list-disc pl-6 space-y-2">
					<li><strong>issues.jsonl Bloat:</strong> For very long-running projects with numerous issues, the <code>issues.jsonl</code> file could grow large. Strategies for archiving or summarizing closed issues might be necessary.</li>
					<li><strong>Granularity Management:</strong> Determining the optimal granularity for issues (e.g., should a minor refactoring be a new issue or an update to an existing one?) requires careful consideration.</li>
					<li><strong>AI Interpretation:</strong> The effectiveness of Beads heavily relies on the AI's ability to correctly parse and interpret the structured information in <code>issues.jsonl</code> and integrate it into its reasoning.</li>
					<li><strong>Automated Context Pruning:</strong> Developing intelligent mechanisms for the AI to automatically prioritize and prune less relevant historical context to optimize prompt length and focus.</li>
				</ul>

				<h3 class="subsection-heading">Future Work</h3>
				<p>
					Automatic issue creation, intelligent summarization of long histories, and smarter context
					retrieval to keep prompts focused.
				</p>
			</div>
		</section>

		<!-- References -->
		<section class="space-y-4">
			<h2 class="section-heading">References</h2>

			<div class="space-y-2 body-text">
				<p><code>.claude/rules/beads-patterns.md</code> — Beads workflow patterns and commands</p>
				<p><code>.beads/issues.jsonl</code> — Git-committed issue storage</p>
				<p><code>packages/harness/src/beads.ts</code> — Harness integration</p>
				<p><code>CLAUDE.md</code> — Task management philosophy</p>
			</div>
		</section>

		<!-- Footer -->
		<footer class="pt-8 border-t border-default">
			<div class="flex justify-between items-center paper-meta">
				<a href="/papers" class="hover:underline">← All Papers</a>
				<span>CREATE SOMETHING Research • 2026</span>
				<a href="/papers/agent-sdk-gemini-tools-integration" class="hover:underline">Gemini Tools Integration →</a>
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

	.comparison-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.comparison-card .subsection-heading {
		margin-top: 0;
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
