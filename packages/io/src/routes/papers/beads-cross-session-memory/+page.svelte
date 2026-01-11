<script>
    // No script logic needed for a static paper page
</script>

<style>
    /* Canon Design Tokens */
    :root {
        --color-bg-pure: #0A0A0A;
        --color-bg-surface: #1A1A1A;
        --color-fg-primary: #E0E0E0;
        --color-fg-secondary: #A0A0A0;

        --text-h1: normal 700 3rem/1.2 'Inter', sans-serif;
        --text-h2: normal 600 2rem/1.3 'Inter', sans-serif;
        --text-body: normal 400 1rem/1.6 'Inter', sans-serif;

        --space-sm: 0.5rem;
        --space-md: 1rem;
        --space-lg: 2rem;

        --radius-lg: 0.75rem;
    }

    body {
        font-family: 'Inter', sans-serif;
        background-color: var(--color-bg-pure);
        color: var(--color-fg-primary);
        margin: 0;
        padding: var(--space-lg);
        line-height: 1.6;
    }

    .container {
        max-width: 800px;
        margin: 0 auto;
        background-color: var(--color-bg-surface);
        padding: var(--space-lg);
        border-radius: var(--radius-lg);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    h1 {
        font: var(--text-h1);
        color: var(--color-fg-primary);
        margin-bottom: var(--space-sm);
    }

    h2 {
        font: var(--text-h2);
        color: var(--color-fg-primary);
        margin-top: var(--space-lg);
        margin-bottom: var(--space-md);
        padding-bottom: var(--space-sm);
        border-bottom: 1px solid var(--color-fg-secondary);
    }

    h3 {
        font: var(--text-h2); /* Using h2 style for h3 for consistency in paper sections */
        color: var(--color-fg-primary);
        margin-top: var(--space-lg);
        margin-bottom: var(--space-md);
    }

    p {
        font: var(--text-body);
        color: var(--color-fg-primary);
        margin-bottom: var(--space-md);
    }

    .meta-text {
        font: var(--text-body);
        color: var(--color-fg-secondary);
        margin-bottom: var(--space-lg);
    }

    .abstract {
        border-left: 4px solid var(--color-fg-primary);
        padding-left: var(--space-md);
        margin-bottom: var(--space-lg);
        background-color: rgba(255, 255, 255, 0.05);
        padding-top: var(--space-sm);
        padding-bottom: var(--space-sm);
        border-radius: var(--radius-lg);
    }

    .code-block {
        background-color: var(--color-bg-pure);
        color: var(--color-fg-primary);
        padding: var(--space-md);
        border-radius: var(--radius-lg);
        overflow-x: auto;
        margin-top: var(--space-md);
        margin-bottom: var(--space-md);
        font-family: 'Fira Code', monospace;
        font-size: 0.9rem;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: var(--space-md);
        margin-bottom: var(--space-lg);
        background-color: var(--color-bg-pure);
        border-radius: var(--radius-lg);
        overflow: hidden; /* Ensures border-radius applies to children */
    }

    th, td {
        border: 1px solid var(--color-bg-surface);
        padding: var(--space-sm) var(--space-md);
        text-align: left;
        font: var(--text-body);
    }

    th {
        background-color: var(--color-bg-surface);
        color: var(--color-fg-secondary);
        font-weight: 600;
    }

    td {
        color: var(--color-fg-primary);
    }

    .comparison-cards {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-md);
        margin-top: var(--space-lg);
        margin-bottom: var(--space-lg);
    }

    .card {
        background-color: var(--color-bg-pure);
        padding: var(--space-md);
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-bg-surface);
    }

    .card h3 {
        margin-top: 0;
        color: var(--color-fg-primary);
        font: var(--text-h2); /* Using h2 style for card titles */
        font-size: 1.5rem; /* Slightly smaller than main h2 */
        border-bottom: 1px solid var(--color-fg-secondary);
        padding-bottom: var(--space-sm);
        margin-bottom: var(--space-md);
    }

    .card p {
        font: var(--text-body);
        color: var(--color-fg-secondary);
    }

    .references ul {
        list-style: none;
        padding: 0;
    }

    .references li {
        margin-bottom: var(--space-sm);
        font: var(--text-body);
    }

    .references a {
        color: var(--color-fg-primary);
        text-decoration: none;
    }

    .references a:hover {
        text-decoration: underline;
    }

    footer {
        margin-top: var(--space-lg);
        padding-top: var(--space-md);
        border-top: 1px solid var(--color-bg-surface);
        text-align: center;
        font: var(--text-body);
        color: var(--color-fg-secondary);
    }

    footer a {
        color: var(--color-fg-secondary);
        text-decoration: none;
        margin: 0 var(--space-sm);
    }

    footer a:hover {
        text-decoration: underline;
    }
</style>

<div class="container">
    <header>
        <p style="font-family: monospace; color: var(--color-fg-secondary);">PAPER-2026-001</p>
        <h1>Beads Cross-Session Memory Patterns: Sustaining AI Context Across Interactions</h1>
        <p class="meta-text">Research • 12 min read • Intermediate</p>
    </header>

    <section class="abstract">
        <p style="font: var(--text-body); color: var(--color-fg-primary);">
            AI development sessions are stateless: when a session ends, context disappears. Developers re-explain problems, re-provide code snippets, re-describe what they already tried. Beads solves this by storing issues in <code>.beads/issues.jsonl</code>, a Git-committed file that persists across sessions. This paper documents how Beads works, its integration with development workflows, and what it enables for multi-session AI work.
        </p>
    </section>

    <section>
        <h2>I. Introduction: Why Cross-Session Memory Matters</h2>
        <p>
            AI agents forget everything when a session ends. Each new conversation starts blank—developers re-explain problems, re-provide context, re-iterate findings. This wastes time and limits AI to simple, single-session tasks.
        </p>
        <p>
            Human developers carry context naturally: yesterday's debugging session informs today's fix. AI needs the same capability. Beads provides it by storing issues in <code>.beads/issues.jsonl</code>, a Git-committed file that any session can read. Work survives restarts, context limits, even crashes.
        </p>
    </section>

    <section>
        <h2>II. The Problem: What Happens When Sessions End</h2>
        <p>
            AI sessions end. Browser tabs close. Context windows fill. Servers timeout. When they do, everything disappears: partial solutions, debugging progress, the thread of investigation you were following.
        </p>
        <p>
            This creates concrete problems:
        </p>
        <ul>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Repetitive Context Setting:</strong> Developers must repeatedly provide the same background information, code snippets, or problem descriptions to the AI.</li>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Fragmented Problem Solving:</strong> Complex issues that require multiple steps or days to resolve become unmanageable, as the AI cannot track progress or remember previous attempts.</li>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Reduced Efficiency:</strong> Time is wasted on re-establishing context rather than advancing the task, leading to slower development cycles.</li>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Lack of Cumulative Learning:</strong> The AI cannot build upon past interactions or learn from previous mistakes within the scope of a larger project.</li>
        </ul>

        <div class="comparison-cards">
            <div class="card">
                <h3>Before Beads: Stateless AI Sessions</h3>
                <p>AI operates in isolated, short-lived sessions. Context is lost upon session termination, leading to repetitive explanations and fragmented work.</p>
                <ul style="font: var(--text-body); color: var(--color-fg-secondary); padding-left: var(--space-md);">
                    <li>Ephemeral memory</li>
                    <li>High cognitive load for user</li>
                    <li>Limited to simple, single-session tasks</li>
                    <li>No long-term project understanding</li>
                </ul>
            </div>
            <div class="card">
                <h3>With Beads: Persistent AI Context</h3>
                <p>AI maintains context across sessions, remembering ongoing issues and progress. This enables continuous, cumulative problem-solving.</p>
                <ul style="font: var(--text-body); color: var(--color-fg-secondary); padding-left: var(--space-md);">
                    <li>Persistent, versioned memory</li>
                    <li>Reduced user overhead</li>
                    <li>Capable of complex, multi-session tasks</li>
                    <li>Builds project-specific intelligence</li>
                </ul>
            </div>
        </div>
    </section>

    <section>
        <h2>III. The Solution: How Beads Works</h2>
        <p>
            Beads stores issues in a local directory (<code>.beads/</code>) using a single file: <code>issues.jsonl</code>. Each line is a JSON object representing one issue. This file is the source of truth for what AI is tracking.
        </p>
        <p>
            The file is Git-committed alongside your code. This gives you:
        </p>
        <ul>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Version Control:</strong> Every change to an issue, every new piece of context, is tracked and auditable through Git history.</li>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Collaboration:</strong> Teams can share AI context and progress by simply pushing and pulling the `.beads` directory.</li>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Durability:</strong> The AI's memory is as persistent as the codebase itself, surviving system reboots, environment changes, and developer handovers.</li>
        </ul>

        <h3>The Beads Workflow:</h3>
        <p>
            The interaction with Beads follows a clear, command-line driven workflow, enabling developers to manage AI's memory explicitly:
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

        <h3>`issues.jsonl` Structure (Simplified Example):</h3>
        <table>
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
    </section>

    <section>
        <h2>IV. Integration Patterns: Context Survival and Work Extraction</h2>
        <p>
            Beads enables two patterns: context that survives sessions, and work extraction during sessions.
        </p>

        <h3>A. Context Survival Across Sessions</h3>
        <p>
            When a developer resumes work, AI loads open issues from <code>issues.jsonl</code>. It knows what it was working on, what problems exist, and what was already tried. This enables:
        </p>
        <ul>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Session handoffs:</strong> AI picks up where it left off, even after days.</li>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Project-specific knowledge:</strong> AI accumulates understanding of your codebase over time.</li>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Less re-explaining:</strong> Developers stop repeating context; AI already knows.</li>
        </ul>

        <h3>B. Work Extraction and Granular Tracking</h3>
        <p>
            AI doesn't just track what you tell it—it discovers work while processing code. It identifies sub-tasks, potential improvements, or refactoring needs. These become new entries in <code>issues.jsonl</code>, building a dynamic backlog.
        </p>
        <p>
            This enables:
        </p>
        <ul>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Automated Issue Identification:</strong> AI can flag code smells, security vulnerabilities, or performance bottlenecks as new issues.</li>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Dependency Mapping:</strong> Tracking how issues relate to specific files or modules.</li>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Progress Monitoring:</strong> Updating issue statuses as code changes resolve them.</li>
        </ul>

        <div class="comparison-cards">
            <div class="card">
                <h3>Fragmented AI Workflow</h3>
                <p>Each AI interaction is a discrete event. No shared memory or understanding of the project's evolving state.</p>
                <ul style="font: var(--text-body); color: var(--color-fg-secondary); padding-left: var(--space-md);">
                    <li>AI acts as a "stateless oracle"</li>
                    <li>Context provided ad-hoc</li>
                    <li>Difficult to track complex tasks</li>
                    <li>No collective intelligence</li>
                </ul>
            </div>
            <div class="card">
                <h3>Cohesive Beads Workflow</h3>
                <p>AI's memory is integrated into the project's version control. It understands ongoing work and contributes proactively.</p>
                <ul style="font: var(--text-body); color: var(--color-fg-secondary); padding-left: var(--space-md);">
                    <li>AI acts as a "persistent collaborator"</li>
                    <li>Context is always available</li>
                    <li>Enables multi-stage problem solving</li>
                    <li>Builds project-specific knowledge base</li>
                </ul>
            </div>
        </div>
    </section>

    <section>
        <h2>V. Results & Discussion: What Works and What Doesn't</h2>
        <p>
            <strong>What works:</strong>
        </p>
        <ul>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>No more re-explaining:</strong> Developers stop repeating context. AI reads <code>issues.jsonl</code> and knows what's happening.</li>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Multi-session tasks become possible:</strong> Problems that span days or weeks can be tracked continuously.</li>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Project-specific knowledge accumulates:</strong> The file becomes a record of what was tried, what worked, what failed.</li>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Team sharing via Git:</strong> Push <code>.beads/</code> to share AI context across developers.</li>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Audit trail:</strong> Every decision is version-controlled.</li>
        </ul>

        <p>
            <strong>What doesn't work yet:</strong>
        </p>
        <ul>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>`issues.jsonl` Bloat:</strong> For very long-running projects with numerous issues, the `issues.jsonl` file could grow large. Strategies for archiving or summarizing closed issues might be necessary.</li>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Granularity Management:</strong> Determining the optimal granularity for issues (e.g., should a minor refactoring be a new issue or an update to an existing one?) requires careful consideration.</li>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>AI Interpretation:</strong> The effectiveness of Beads heavily relies on the AI's ability to correctly parse and interpret the structured information in `issues.jsonl` and integrate it into its reasoning.</li>
            <li style="font: var(--text-body); color: var(--color-fg-primary);"><strong>Automated Context Pruning:</strong> Developing intelligent mechanisms for the AI to automatically prioritize and prune less relevant historical context to optimize prompt length and focus.</li>
        </ul>
        <p>
            <strong>Future work:</strong> Automatic issue creation, intelligent summarization of long histories, and smarter context retrieval to keep prompts focused.
        </p>
    </section>

    <section class="references">
        <h2>References</h2>
        <ul>
            <li><code>.claude/rules/beads-patterns.md</code> — Beads workflow patterns and commands</li>
            <li><code>.beads/issues.jsonl</code> — Git-committed issue storage</li>
            <li><code>packages/harness/src/beads.ts</code> — Harness integration</li>
            <li><code>CLAUDE.md</code> — Task management philosophy</li>
        </ul>
    </section>

    <footer>
        <nav>
            <a href="/papers">← All Papers</a>
            <a href="/papers/agent-sdk-gemini-tools-integration">Gemini Tools Integration →</a>
        </nav>
        <p style="margin-top: var(--space-sm);">CREATE SOMETHING Research • 2026</p>
    </footer>
</div>